import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { MapData } from '../types/MapData';
import { allMaps as staticMaps } from '../data/maps';
import { EnemyAssets as staticEnemyAssets, BossAssets as staticBossAssets, setDynamicAssets } from '../data/EnemyAssets';

/**
 * Fetch all maps from Firestore.
 * If Firestore is empty, seed it with initial default static maps and return them.
 */
export async function fetchMapsFromFirestore(): Promise<MapData[]> {
  try {
    const mapsCol = collection(db, 'maps');
    const snapshot = await getDocs(mapsCol);
    
    if (snapshot.empty) {
      console.log('Firestore maps collection is empty. Seeding with default static maps...');
      const seededMaps: MapData[] = [];
      for (const map of staticMaps) {
        const docRef = doc(db, 'maps', map.id);
        await setDoc(docRef, map);
        seededMaps.push(map);
      }
      return seededMaps;
    }

    const maps: MapData[] = [];
    snapshot.forEach((doc) => {
      maps.push(doc.data() as MapData);
    });

    // Sort maps to ensure 'map_beginning' comes first, or order by ID to keep consistency
    maps.sort((a, b) => {
      if (a.id === 'map_beginning') return -1;
      if (b.id === 'map_beginning') return 1;
      return a.id.localeCompare(b.id);
    });

    console.log(`Loaded ${maps.length} maps from Firestore`);
    return maps;
  } catch (error) {
    console.error('Error fetching maps from Firestore:', error);
    // Fallback to static maps if Firestore fails or network is offline
    return staticMaps;
  }
}

/**
 * Save a single map data to Firestore.
 */
export async function saveMapToFirestore(mapData: MapData): Promise<void> {
  if (!mapData || !mapData.id) {
    throw new Error('Invalid map data or ID');
  }
  const docRef = doc(db, 'maps', mapData.id);
  await setDoc(docRef, mapData);
  console.log(`Saved map ${mapData.id} to Firestore`);
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
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const enemyAssets = data.enemyAssets || staticEnemyAssets;
      const bossAssets = data.bossAssets || staticBossAssets;
      setDynamicAssets(enemyAssets, bossAssets);
      console.log('Loaded custom enemy/boss assets from Firestore');
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
