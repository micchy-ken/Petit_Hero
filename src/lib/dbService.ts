import { db, auth } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { MapData } from '../types/MapData';
import { allMaps as staticMaps } from '../data/maps';
import { EnemyAssets as staticEnemyAssets, BossAssets as staticBossAssets, setDynamicAssets } from '../data/EnemyAssets';
import { CustomEvent } from '../types/CustomEvent';
import { HeroStatus } from '../types/HeroStatus';
import { DefaultHeroStatus, setDynamicHeroStatus } from '../data/HeroStatusAssets';
import { CustomItem } from '../types/CustomItem';
import { Scenario } from '../types/Scenario';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively removes all undefined properties from an object/array so Firestore doesn't complain.
 */
export function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanUndefined(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Fetch all maps from Firestore for a specific scenario.
 * If Firestore is empty, seed it with initial default static maps and return them for the 'scenario_test' scenario.
 */
export async function fetchMapsFromFirestore(scenarioId: string = 'scenario_test'): Promise<MapData[]> {
  try {
    const mapsCol = collection(db, 'maps');
    const snapshot = await getDocs(mapsCol);
    
    if (snapshot.empty) {
      console.log('Firestore maps collection is empty. Seeding with default static maps...');
      const seededMaps: MapData[] = [];
      for (const map of staticMaps) {
        const seededMap = { ...map, scenarioId: 'scenario_test' };
        const docRef = doc(db, 'maps', map.id);
        await setDoc(docRef, cleanUndefined(seededMap));
        seededMaps.push(seededMap);
      }
      return seededMaps.filter(m => m.scenarioId === scenarioId);
    }

    let maps: MapData[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as MapData;
      // Add default scenarioId if missing
      if (!data.scenarioId) {
        data.scenarioId = 'scenario_test';
      }
      maps.push(data);
    });

    // Filter maps by target scenarioId
    let filteredMaps = maps.filter((m) => m.scenarioId === scenarioId);

    // If a scenario has NO maps (e.g. newly created scenario), seed it with a copy of 'map_beginning'
    if (filteredMaps.length === 0) {
      console.log(`Scenario ${scenarioId} has no maps. Seeding a starting map...`);
      const originalBeginning = staticMaps.find(m => m.id === 'map_beginning') || staticMaps[0];
      const newMapId = `map_beginning_${scenarioId}`;
      const newBeginningMap: MapData = {
        ...originalBeginning,
        id: newMapId,
        name: '始まり',
        scenarioId: scenarioId,
        events: originalBeginning.events.map(ev => {
          // If there is a teleport event, make sure it points to correct maps or adjust
          return { ...ev };
        })
      };
      
      const docRef = doc(db, 'maps', newMapId);
      await setDoc(docRef, cleanUndefined(newBeginningMap));
      filteredMaps = [newBeginningMap];
    }

    // Sort maps to ensure starting map comes first
    filteredMaps.sort((a, b) => {
      const isBeginningA = a.id === 'map_beginning' || a.id.startsWith('map_beginning_');
      const isBeginningB = b.id === 'map_beginning' || b.id.startsWith('map_beginning_');
      if (isBeginningA) return -1;
      if (isBeginningB) return 1;
      return a.id.localeCompare(b.id);
    });

    console.log(`Loaded ${filteredMaps.length} maps for scenario ${scenarioId} from Firestore`);
    return filteredMaps;
  } catch (error) {
    console.error('Error fetching maps from Firestore:', error);
    // Fallback to static maps (filtered to starting map for others)
    if (scenarioId === 'scenario_test') {
      return staticMaps.map(m => ({ ...m, scenarioId: 'scenario_test' }));
    } else {
      const originalBeginning = staticMaps.find(m => m.id === 'map_beginning') || staticMaps[0];
      return [{ ...originalBeginning, id: `map_beginning_${scenarioId}`, scenarioId }];
    }
  }
}

/**
 * Save a single map data to Firestore.
 */
export async function saveMapToFirestore(mapData: MapData): Promise<void> {
  if (!mapData || !mapData.id) {
    throw new Error('Invalid map data or ID');
  }
  // Ensure a scenarioId exists
  if (!mapData.scenarioId) {
    mapData.scenarioId = 'scenario_test';
  }
  const docRef = doc(db, 'maps', mapData.id);
  await setDoc(docRef, cleanUndefined(mapData));
  console.log(`Saved map ${mapData.id} (scenario: ${mapData.scenarioId}) to Firestore`);
}

/**
 * Delete a map from Firestore.
 */
export async function deleteMapFromFirestore(mapId: string): Promise<void> {
  if (!mapId) return;
  const docRef = doc(db, 'maps', mapId);
  await deleteDoc(docRef);
  console.log(`Deleted map ${mapId} from Firestore`);
}

/**
 * Fetch custom enemy and boss assets from Firestore.
 * If not present, seed with static initial assets.
 */
export async function fetchEnemyAssetsFromFirestore() {
  try {
    const docRef = doc(db, 'config', 'custom_assets');
    const docSnap = await getDoc(docRef);
    
    const mergeAssets = (loaded: Record<string, any[]>, fallback: Record<string, any[]>) => {
      const merged = { ...loaded };
      for (const mode of Object.keys(fallback)) {
        if (!merged[mode]) {
          merged[mode] = [...fallback[mode]];
        } else {
          const existingIds = new Set(merged[mode].map(item => item.id));
          for (const item of fallback[mode]) {
            if (!existingIds.has(item.id)) {
              merged[mode].push({ ...item });
            }
          }
        }
      }
      return merged;
    };

    if (docSnap.exists()) {
      const data = docSnap.data();
      const rawEnemyAssets = data.enemyAssets || {};
      const rawBossAssets = data.bossAssets || {};
      
      const enemyAssets = mergeAssets(rawEnemyAssets, staticEnemyAssets);
      const bossAssets = mergeAssets(rawBossAssets, staticBossAssets);
      
      // もしマージによって要素数等が変わった（新モンスターが追加された）場合は、Firestoreに保存しておく
      let needsSave = false;
      for (const mode of Object.keys(staticEnemyAssets)) {
        if ((rawEnemyAssets[mode] || []).length !== (enemyAssets[mode] || []).length) {
          needsSave = true;
          break;
        }
      }
      for (const mode of Object.keys(staticBossAssets)) {
        if ((rawBossAssets[mode] || []).length !== (bossAssets[mode] || []).length) {
          needsSave = true;
          break;
        }
      }
      
      if (needsSave) {
        console.log('Detected missing standard assets in Firestore. Auto-updating config...');
        await setDoc(docRef, { enemyAssets, bossAssets });
      }

      setDynamicAssets(enemyAssets, bossAssets);
      console.log('Loaded custom enemy/boss assets from Firestore (and merged missing defaults)');
      return { enemyAssets, bossAssets };
    } else {
      console.log('No custom enemy assets found in Firestore. Seeding with defaults...');
      await setDoc(docRef, {
        enemyAssets: staticEnemyAssets,
        bossAssets: staticBossAssets
      });
      setDynamicAssets(staticEnemyAssets, staticBossAssets);
      return { enemyAssets: staticEnemyAssets, bossAssets: staticBossAssets };
    }
  } catch (error) {
    console.error('Error fetching enemy assets from Firestore:', error);
    // Fallback
    setDynamicAssets(staticEnemyAssets, staticBossAssets);
    return { enemyAssets: staticEnemyAssets, bossAssets: staticBossAssets };
  }
}

/**
 * Save custom enemy and boss assets to Firestore.
 */
export async function saveEnemyAssetsToFirestore(enemyAssets: any, bossAssets: any): Promise<void> {
  const docRef = doc(db, 'config', 'custom_assets');
  await setDoc(docRef, { enemyAssets, bossAssets });
  setDynamicAssets(enemyAssets, bossAssets);
  console.log('Saved custom enemy/boss assets to Firestore');
}

/**
 * Fetch hero status from Firestore.
 */
export async function fetchHeroStatusFromFirestore(): Promise<HeroStatus[]> {
  try {
    const docRef = doc(db, 'config', 'hero_status');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const statusList = data.statusList || DefaultHeroStatus;
      setDynamicHeroStatus(statusList);
      console.log('Loaded hero status from Firestore');
      return statusList;
    } else {
      console.log('No hero status found in Firestore. Seeding with defaults...');
      await setDoc(docRef, { statusList: DefaultHeroStatus });
      setDynamicHeroStatus(DefaultHeroStatus);
      return DefaultHeroStatus;
    }
  } catch (error) {
    console.error('Error fetching hero status from Firestore:', error);
    setDynamicHeroStatus(DefaultHeroStatus);
    return DefaultHeroStatus;
  }
}

/**
 * Save hero status to Firestore.
 */
export async function saveHeroStatusToFirestore(statusList: HeroStatus[]): Promise<void> {
  const docRef = doc(db, 'config', 'hero_status');
  await setDoc(docRef, { statusList });
  setDynamicHeroStatus(statusList);
  console.log('Saved hero status to Firestore');
}



export async function fetchCustomEventsFromFirestore(): Promise<CustomEvent[]> {
  try {
    const docRef = doc(db, 'config', 'custom_events');
    const docSnap = await getDoc(docRef);
    
    const defaultEvents: CustomEvent[] = [
      {
        id: 'ev_beginning',
        name: '始まり',
        type: 'conversation',
        mapId: 'map_beginning',
        nodes: [
          { id: 'node_b1', speakerName: '主人公', portraitId: 'hero', message: 'ここは…？どうやら始まりの場所のようだ。' }
        ]
      },
      {
        id: 'ev_villager',
        name: '村人',
        type: 'conversation',
        mapId: 'map_1782951234203',
        nodes: [
          { id: 'node_v1', speakerName: '村人', portraitId: 'villager', message: 'ようこそ！ここはHD-2Dの世界だよ。美しいグラフィックを楽しんでね。' }
        ]
      }
    ];

    if (docSnap.exists()) {
      const data = docSnap.data();
      let events = data.events || [];
      if (events.length === 0) {
        console.log('Custom events empty. Seeding defaults...');
        await setDoc(docRef, { events: defaultEvents });
        return defaultEvents;
      }
      
      // mapId補正
      events = events.map((ev: any) => {
        if (!ev.mapId) {
          if (ev.id === 'ev_beginning') return { ...ev, mapId: 'map_beginning' };
          if (ev.id === 'ev_villager') return { ...ev, mapId: 'map_1782951234203' };
          return { ...ev, mapId: 'map_beginning' };
        }
        return ev;
      });

      console.log('Loaded custom events from Firestore');
      return events;
    } else {
      console.log('No custom events found in Firestore. Seeding defaults...');
      await setDoc(docRef, { events: defaultEvents });
      return defaultEvents;
    }
  } catch (error) {
    console.error('Error fetching custom events from Firestore:', error);
    return [
      {
        id: 'ev_beginning',
        name: '始まり',
        type: 'conversation',
        mapId: 'map_beginning',
        nodes: [
          { id: 'node_b1', speakerName: '主人公', portraitId: 'hero', message: 'ここは…？どうやら始まりの場所のようだ。' }
        ]
      },
      {
        id: 'ev_villager',
        name: '村人',
        type: 'conversation',
        mapId: 'map_1782951234203',
        nodes: [
          { id: 'node_v1', speakerName: '村人', portraitId: 'villager', message: 'ようこそ！ここはHD-2Dの世界だよ。美しいグラフィックを楽しんでね。' }
        ]
      }
    ];
  }
}

export async function saveCustomEventsToFirestore(events: CustomEvent[]): Promise<void> {
  const docRef = doc(db, 'config', 'custom_events');
  await setDoc(docRef, { events });
  console.log('Saved custom events to Firestore');
}

export async function fetchCustomItemsFromFirestore(): Promise<CustomItem[]> {
  try {
    const docRef = doc(db, 'config', 'custom_items');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const items = data.items || [];
      console.log('Loaded custom items from Firestore');
      return items;
    } else {
      console.log('No custom items found in Firestore. Seeding with empty array...');
      await setDoc(docRef, { items: [] });
      return [];
    }
  } catch (error) {
    console.error('Error fetching custom items from Firestore:', error);
    return [];
  }
}

export async function saveCustomItemsToFirestore(items: CustomItem[]): Promise<void> {
  const docRef = doc(db, 'config', 'custom_items');
  await setDoc(docRef, { items });
  console.log('Saved custom items to Firestore');
}

import { MagicData } from '../types/MagicData';

export async function fetchMagicDataFromFirestore(): Promise<MagicData[]> {
  try {
    const docRef = doc(db, 'config', 'custom_magics');
    const docSnap = await getDoc(docRef);
    
    const defaultMagics: MagicData[] = [
      { id: 'magic_fire', name: 'ファイアボルト', attribute: 'fire', power: 12, interval: 3, acquisitionType: 'item', acquisitionValue: 'item_fire_scroll' },
      { id: 'magic_ice', name: 'アイスブラスト', attribute: 'ice', power: 12, interval: 3, acquisitionType: 'item', acquisitionValue: 'item_ice_scroll' },
      { id: 'magic_wind', name: 'ウインドトルネード', attribute: 'wind', power: 6, interval: 2, acquisitionType: 'item', acquisitionValue: 'item_wind_scroll' },
      { id: 'magic_earth', name: 'グランドアース', attribute: 'earth', power: 20, interval: 5, acquisitionType: 'item', acquisitionValue: 'item_earth_scroll' }
    ];

    if (docSnap.exists()) {
      const data = docSnap.data();
      const magics = data.magics || [];
      console.log('Loaded custom magics from Firestore');
      
      // Auto-merge new magics if they don't exist
      let changed = false;
      defaultMagics.forEach(defMagic => {
        if (!magics.some((m: any) => m.id === defMagic.id)) {
          magics.push(defMagic);
          changed = true;
        }
      });
      
      if (changed) {
        await setDoc(docRef, { magics });
        console.log('Automatically added wind and earth magics to Firestore config');
      }
      return magics;
    } else {
      console.log('No custom magics found in Firestore. Seeding with default magics...');
      await setDoc(docRef, { magics: defaultMagics });
      return defaultMagics;
    }
  } catch (error) {
    console.error('Error fetching custom magics from Firestore:', error);
    return [];
  }
}

export async function saveMagicDataToFirestore(magics: MagicData[]): Promise<void> {
  const docRef = doc(db, 'config', 'custom_magics');
  await setDoc(docRef, { magics });
  console.log('Saved custom magics to Firestore');
}

/**
 * Fetch scenarios from Firestore.
 * If empty/missing, seed with the default 'scenario_test' (テスト) scenario.
 */
export async function fetchScenariosFromFirestore(): Promise<Scenario[]> {
  try {
    const docRef = doc(db, 'config', 'scenarios');
    const docSnap = await getDoc(docRef);
    
    const defaultScenarios: Scenario[] = [
      {
        id: 'scenario_test',
        name: 'テスト',
        statusMode: 'individual',
        createdAt: 1712345678000
      }
    ];

    if (docSnap.exists()) {
      const data = docSnap.data();
      const scenarios = data.scenarios || [];
      if (scenarios.length === 0) {
        await setDoc(docRef, { scenarios: defaultScenarios });
        return defaultScenarios;
      }
      return scenarios;
    } else {
      await setDoc(docRef, { scenarios: defaultScenarios });
      return defaultScenarios;
    }
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return [
      {
        id: 'scenario_test',
        name: 'テスト',
        statusMode: 'individual',
        createdAt: 1712345678000
      }
    ];
  }
}

/**
 * Save scenarios list to Firestore.
 */
export async function saveScenariosToFirestore(scenarios: Scenario[]): Promise<void> {
  const docRef = doc(db, 'config', 'scenarios');
  await setDoc(docRef, { scenarios });
  console.log('Saved scenarios list to Firestore');
}

/**
 * Save game progress (level, hp, maps, position, items) for a given scenario locally.
 */
export async function saveScenarioProgress(
  scenarioId: string,
  statusMode: 'individual' | 'shared',
  progress: {
    position: {
      mapId: string;
      gridX: number;
      gridY: number;
      camGridX: number;
      camGridY: number;
    };
    heroState: {
      hp: number;
      maxHp: number;
      attack: number;
      defense: number;
      level: number;
      exp: number;
      requiredExp: number;
      acquiredItems: string[];
      equippedWeaponId: string | null;
      equippedArmorId: string | null;
      equippedAccessoryId: string | null;
      baseAttack: number;
      baseDefense: number;
    };
  }
): Promise<void> {
  try {
    const saveData = {
      position: progress.position,
      heroState: statusMode === 'individual' ? progress.heroState : undefined,
      timestamp: Date.now()
    };
    localStorage.setItem(`save_${scenarioId}`, JSON.stringify(saveData));

    if (statusMode === 'shared') {
      const sharedData = {
        heroState: progress.heroState,
        timestamp: Date.now()
      };
      localStorage.setItem('save_shared_status', JSON.stringify(sharedData));
    }

    const metaData = {
      lastPlayedScenarioId: scenarioId,
      timestamp: Date.now()
    };
    localStorage.setItem('save_metadata', JSON.stringify(metaData));
    
    console.log(`Saved scenario progress (local) for ${scenarioId} (${statusMode})`);
  } catch (error) {
    console.error('Error saving scenario progress locally:', error);
  }
}

/**
 * Load game progress for a given scenario locally.
 */
export async function loadScenarioProgress(
  scenarioId: string,
  statusMode: 'individual' | 'shared'
): Promise<{
  position: {
    mapId: string;
    gridX: number;
    gridY: number;
    camGridX: number;
    camGridY: number;
  } | null;
  heroState: {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    level: number;
    exp: number;
    requiredExp: number;
    acquiredItems: string[];
    equippedWeaponId: string | null;
    equippedArmorId: string | null;
    equippedAccessoryId: string | null;
    baseAttack: number;
    baseDefense: number;
  } | null;
}> {
  try {
    const localSaveStr = localStorage.getItem(`save_${scenarioId}`);
    let position = null;
    let heroState = null;

    if (localSaveStr) {
      const data = JSON.parse(localSaveStr);
      position = data.position || null;
      if (statusMode === 'individual') {
        heroState = data.heroState || null;
      }
    }

    if (statusMode === 'shared') {
      const sharedSaveStr = localStorage.getItem('save_shared_status');
      if (sharedSaveStr) {
        const data = JSON.parse(sharedSaveStr);
        heroState = data.heroState || null;
      }
    }

    return { position, heroState };
  } catch (error) {
    console.error('Error loading scenario progress locally:', error);
    return { position: null, heroState: null };
  }
}

/**
 * Fetch the last played scenario ID from LocalStorage metadata.
 */
export async function fetchLastPlayedScenarioId(): Promise<string | null> {
  try {
    const metaStr = localStorage.getItem('save_metadata');
    if (metaStr) {
      const data = JSON.parse(metaStr);
      return data.lastPlayedScenarioId || null;
    }
  } catch (e) {
    console.error('Error fetching last played scenario ID locally:', e);
  }
  return null;
}



