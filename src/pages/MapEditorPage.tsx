import React, { useState, useEffect } from 'react';
import { ArrowLeft, Box, Gem, Zap, Plus, Map as MapIcon, Save, Settings, Play, Loader2, RefreshCw, Check, AlertCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapData } from '../types/MapData';
import { getAvailableEnemies, getAvailableBosses } from '../data/EnemyAssets';
import { PhaserGameContainer } from '../components/PhaserGameContainer';
import { allMaps } from '../data/maps';
import { fetchMapsFromFirestore, saveMapToFirestore, deleteMapFromFirestore, fetchEnemyAssetsFromFirestore, fetchCustomEventsFromFirestore, fetchCustomItemsFromFirestore } from '../lib/dbService';
import { CustomEvent } from '../types/CustomEvent';
import { CustomItem } from '../types/CustomItem';
// @ts-ignore
import grassBgUrl from '../../public/grass_bg_1782776475818.jpg';

export default function MapEditorPage() {
  const navigate = useNavigate();
  
  const [maps, setMaps] = useState<MapData[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string>('');
  const [isTestPlay, setIsTestPlay] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const [initialMaps, setInitialMaps] = useState<MapData[]>([]);
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [pendingTransition, setPendingTransition] = useState<{
    type: 'switch_map' | 'go_back';
    targetMapId?: string;
  } | null>(null);

  const loadMapsFromFirestoreDB = async (isInitial = false) => {
    try {
      // Load custom enemy assets first to override local assets
      await fetchEnemyAssetsFromFirestore();
      
      // Load custom events
      const loadedCustomEvents = await fetchCustomEventsFromFirestore();
      setCustomEvents(loadedCustomEvents);

      // Load custom items
      const loadedCustomItems = await fetchCustomItemsFromFirestore();
      setCustomItems(loadedCustomItems);
      if (loadedCustomItems.length > 0 && isInitial) {
        setNewItemParams(prev => ({ ...prev, itemId: loadedCustomItems[0].id }));
      }

      // Load maps
      let loadedMaps = await fetchMapsFromFirestore();
      
      // Ensure map_beginning is always present in the selection list to preserve consistency
      const hasBeginning = loadedMaps.some((m: MapData) => m.id === 'map_beginning');
      if (!hasBeginning) {
        const beginningMap = allMaps.find((m: MapData) => m.id === 'map_beginning') || allMaps[0];
        loadedMaps = [beginningMap, ...loadedMaps];
      }
      setMaps(loadedMaps);
      setInitialMaps(JSON.parse(JSON.stringify(loadedMaps)));
      
      if (isInitial) {
        // Select 'map_beginning' as the default current map if it is available
        const defaultId = loadedMaps.some((m: MapData) => m.id === 'map_beginning')
          ? 'map_beginning'
          : (loadedMaps[0]?.id || '');
        setCurrentMapId(defaultId);
      } else {
        // Keep current selection if it still exists
        if (currentMapId && !loadedMaps.some((m: MapData) => m.id === currentMapId)) {
          const defaultId = loadedMaps.some((m: MapData) => m.id === 'map_beginning')
            ? 'map_beginning'
            : (loadedMaps[0]?.id || '');
          setCurrentMapId(defaultId);
        }
      }
    } catch (e: any) {
      console.warn("Fallback to bundled static maps:", e.message);
      setMaps(allMaps);
      setInitialMaps(JSON.parse(JSON.stringify(allMaps)));
      if (isInitial) {
        const defaultId = allMaps.some((m: MapData) => m.id === 'map_beginning')
          ? 'map_beginning'
          : (allMaps[0]?.id || '');
        setCurrentMapId(defaultId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMapsFromFirestoreDB(true);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const anyDirty = maps.some(m => {
        const original = initialMaps.find(o => o.id === m.id);
        return !original ? true : JSON.stringify(m) !== JSON.stringify(original);
      });
      if (anyDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [maps, initialMaps]);

  const isMapDirty = (mapId: string) => {
    const current = maps.find(m => m.id === mapId);
    const original = initialMaps.find(m => m.id === mapId);
    if (!current) return false;
    if (!original) return true;
    return JSON.stringify(current) !== JSON.stringify(original);
  };

  const handleMapChange = (targetMapId: string) => {
    if (isMapDirty(currentMapId)) {
      setPendingTransition({
        type: 'switch_map',
        targetMapId
      });
    } else {
      setCurrentMapId(targetMapId);
    }
  };

  const handleBack = () => {
    if (isMapDirty(currentMapId)) {
      setPendingTransition({
        type: 'go_back'
      });
    } else {
      navigate('/?settings=true');
    }
  };

  const currentMap = maps.find(m => m.id === currentMapId) || maps[0];

  const [bgMode, setBgMode] = useState<MapData['bgMode']>(currentMap?.bgMode || 'text-black');
  const [placeMode, setPlaceMode] = useState<'obstacle' | 'item' | 'event'>('obstacle');
  
  // イベント配置用の状態（オブジェクト化）
  const [newEventParams, setNewEventParams] = useState({
    type: 'start_point' as 'start_point' | 'teleport' | 'monologue' | 'custom_event',
    startPointFromMap: '',
    teleportTargetMap: '',
    eventCondExpRate: null as number | null,
    eventCondSearchRate: null as number | null,
    eventCondDefeatRate: null as number | null,
    monologueText: '',
    customEventId: '',
    playMode: 'always' as 'always' | 'once_per_map' | 'once_global',
  });
  
  // アイテム配置用の状態（オブジェクト化）
  const [newItemParams, setNewItemParams] = useState({
    itemId: 'treasure_text',
  });
  // 障害配置用の状態
  const [obstacleType, setObstacleType] = useState<'transparent' | 'pillar' | 'rock' | 'peg' | 'wall'>('transparent');
  const [mobileTab, setMobileTab] = useState<'map' | 'canvas' | 'tools'>('canvas');

  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapWidth, setNewMapWidth] = useState(16);
  const [newMapHeight, setNewMapHeight] = useState(16);

  // イベント個別編集状態
  const [editingEvent, setEditingEvent] = useState<{
    index: number;
    x: number;
    y: number;
    type: 'start_point' | 'teleport' | 'monologue' | 'custom_event';
    fromMap: string;
    targetMap: string;
    text: string;
    eventId: string;
    requiredExplorationRate: number | null;
    requiredSearchRate: number | null;
    requiredDefeatRate: number | null;
    playMode: 'always' | 'once_per_map' | 'once_global';
  } | null>(null);

  // アイテム個別編集状態
  const [editingItem, setEditingItem] = useState<{
    index: number;
    x: number;
    y: number;
    itemId: string;
  } | null>(null);

  // ドラッグ＆ドロップ再配置用の状態
  const [draggingSource, setDraggingSource] = useState<{
    x: number;
    y: number;
    type: 'obstacle' | 'item' | 'event';
  } | null>(null);

  const handleGridDragStart = (e: React.DragEvent, x: number, y: number, type: 'obstacle' | 'item' | 'event') => {
    setDraggingSource({ x, y, type });
    e.dataTransfer.setData('text/plain', JSON.stringify({ x, y, type }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleGridDragEnd = () => {
    setDraggingSource(null);
  };

  const handleGridDrop = (e: React.DragEvent, targetX: number, targetY: number) => {
    e.preventDefault();
    let source = draggingSource;
    if (!source) {
      try {
        const rawData = e.dataTransfer.getData('text/plain');
        if (rawData) {
          source = JSON.parse(rawData);
        }
      } catch (err) {
        // ignore
      }
    }
    if (!source) return;

    const { x: srcX, y: srcY, type } = source;
    if (srcX === targetX && srcY === targetY) return;

    if (type === 'obstacle' && placeMode === 'obstacle') {
      const oldObstacles = currentMap.obstacles || [];
      const srcObs = oldObstacles.find(obs => obs.x === srcX && obs.y === srcY);
      if (!srcObs) return;

      const newObstacles = oldObstacles.filter(obs => !(obs.x === srcX && obs.y === srcY) && !(obs.x === targetX && obs.y === targetY));
      newObstacles.push({ x: targetX, y: targetY, type: srcObs.type });
      handleUpdateCurrentMap({ obstacles: newObstacles });
    } else if (type === 'item' && placeMode === 'item') {
      const oldItems = currentMap.items || [];
      const srcItem = oldItems.find(it => it.x === srcX && it.y === srcY);
      if (!srcItem) return;

      const newItems = oldItems.filter(it => !(it.x === srcX && it.y === srcY) && !(it.x === targetX && it.y === targetY));
      newItems.push({ x: targetX, y: targetY, itemId: srcItem.itemId });
      handleUpdateCurrentMap({ items: newItems });
    } else if (type === 'event' && placeMode === 'event') {
      const oldEvents = currentMap.events || [];
      const srcEvent = oldEvents.find(ev => ev.x === srcX && ev.y === srcY);
      if (!srcEvent) return;

      const newEvents = oldEvents.filter(ev => !(ev.x === srcX && ev.y === srcY) && !(ev.x === targetX && ev.y === targetY));
      newEvents.push({ x: targetX, y: targetY, type: srcEvent.type, data: srcEvent.data });
      handleUpdateCurrentMap({ events: newEvents });
    }

    setDraggingSource(null);
  };

  useEffect(() => {
    if (currentMap) {
      setBgMode(currentMap.bgMode);
    }
  }, [currentMapId, currentMap]);

  useEffect(() => {
    if (!newEventParams.teleportTargetMap && maps.length > 0) {
      setNewEventParams(prev => ({ ...prev, teleportTargetMap: maps[0].id }));
    }
  }, [maps, newEventParams.teleportTargetMap]);

  const handleGridClick = (x: number, y: number) => {
    if (placeMode === 'event') {
      const existingIndex = currentMap.events.findIndex(e => e.x === x && e.y === y);
      const newEvents = [...currentMap.events];
      
      if (existingIndex >= 0) {
        const ev = currentMap.events[existingIndex];
        setEditingEvent({
          index: existingIndex,
          x: ev.x,
          y: ev.y,
          type: ev.type as 'start_point' | 'teleport' | 'monologue' | 'custom_event',
          fromMap: ev.data?.fromMap || '',
          targetMap: ev.data?.targetMap || '',
          text: ev.data?.text || '',
          eventId: ev.data?.eventId || '',
          requiredExplorationRate: ev.data?.requiredExplorationRate ?? null,
          requiredSearchRate: ev.data?.requiredSearchRate ?? null,
          requiredDefeatRate: ev.data?.requiredDefeatRate ?? null,
          playMode: ev.data?.playMode || 'always',
        });
      } else {
        let data: any = {};
        if (newEventParams.type === 'start_point') {
          const targetFromMap = newEventParams.startPointFromMap || null;
          // 元マップ(fromMap)ごとに初期値は1つしか置けないようにする
          const sameFromMapIndex = newEvents.findIndex(
            e => e.type === 'start_point' && (e.data?.fromMap || null) === targetFromMap
          );
          if (sameFromMapIndex >= 0) {
            newEvents.splice(sameFromMapIndex, 1);
          }
          data = { fromMap: targetFromMap, eventId: newEventParams.customEventId || undefined };
        } else if (newEventParams.type === 'teleport') {
          if (!newEventParams.teleportTargetMap) return;
          data = { targetMap: newEventParams.teleportTargetMap, eventId: newEventParams.customEventId || undefined };
        } else if (newEventParams.type === 'monologue') {
          data = { text: newEventParams.monologueText };
        } else if (newEventParams.type === 'custom_event') {
          data = { eventId: newEventParams.customEventId };
        }
        
        if (newEventParams.eventCondExpRate !== null) data.requiredExplorationRate = newEventParams.eventCondExpRate;
        if (newEventParams.eventCondSearchRate !== null) data.requiredSearchRate = newEventParams.eventCondSearchRate;
        if (newEventParams.eventCondDefeatRate !== null) data.requiredDefeatRate = newEventParams.eventCondDefeatRate;
        data.playMode = newEventParams.playMode;
        
        newEvents.push({ x, y, type: newEventParams.type, data });
        handleUpdateCurrentMap({ events: newEvents });
      }
    } else if (placeMode === 'item') {
      const existingIndex = currentMap.items.findIndex(i => i.x === x && i.y === y);
      const newItems = [...currentMap.items];
      
      if (existingIndex >= 0) {
        const item = currentMap.items[existingIndex];
        setEditingItem({
          index: existingIndex,
          x: item.x,
          y: item.y,
          itemId: item.itemId,
        });
      } else {
        newItems.push({ x, y, itemId: newItemParams.itemId });
        handleUpdateCurrentMap({ items: newItems });
      }
    } else if (placeMode === 'obstacle') {
      const existingIndex = (currentMap.obstacles || []).findIndex(obs => obs.x === x && obs.y === y);
      const newObstacles = [...(currentMap.obstacles || [])];
      
      if (existingIndex >= 0) {
        const existingObs = newObstacles[existingIndex];
        if (existingObs.type === obstacleType) {
          newObstacles.splice(existingIndex, 1);
        } else {
          newObstacles[existingIndex] = { x, y, type: obstacleType };
        }
      } else {
        newObstacles.push({ x, y, type: obstacleType });
      }
      
      handleUpdateCurrentMap({ obstacles: newObstacles });
    }
  };

  const handleUpdateEvent = () => {
    if (!editingEvent) return;
    const newEvents = [...currentMap.events];
    
    // 他のイベントとスタート地点(fromMap)の重複チェック（start_point の場合）
    if (editingEvent.type === 'start_point') {
      const targetFromMap = editingEvent.fromMap || null;
      const duplicateIndex = newEvents.findIndex(
        (e, idx) => idx !== editingEvent.index && e.type === 'start_point' && (e.data?.fromMap || null) === targetFromMap
      );
      if (duplicateIndex >= 0) {
        newEvents.splice(duplicateIndex, 1);
      }
    }

    let data: any = {};
    if (editingEvent.type === 'start_point') {
      data.fromMap = editingEvent.fromMap || null;
      data.eventId = editingEvent.eventId || undefined;
    } else if (editingEvent.type === 'teleport') {
      if (!editingEvent.targetMap) {
        alert('移動先マップを選択してください');
        return;
      }
      data.targetMap = editingEvent.targetMap;
      data.eventId = editingEvent.eventId || undefined;
    } else if (editingEvent.type === 'monologue') {
      data.text = editingEvent.text || '';
    } else if (editingEvent.type === 'custom_event') {
      data.eventId = editingEvent.eventId || '';
    }
    data.playMode = editingEvent.playMode || 'always';

    if (editingEvent.requiredExplorationRate !== null) {
      data.requiredExplorationRate = editingEvent.requiredExplorationRate;
    }
    if (editingEvent.requiredSearchRate !== null) {
      data.requiredSearchRate = editingEvent.requiredSearchRate;
    }
    if (editingEvent.requiredDefeatRate !== null) {
      data.requiredDefeatRate = editingEvent.requiredDefeatRate;
    }

    const targetIdx = newEvents.findIndex(e => e.x === editingEvent.x && e.y === editingEvent.y);
    if (targetIdx >= 0) {
      newEvents[targetIdx] = {
        x: editingEvent.x,
        y: editingEvent.y,
        type: editingEvent.type,
        data
      };
    } else {
      newEvents.push({
        x: editingEvent.x,
        y: editingEvent.y,
        type: editingEvent.type,
        data
      });
    }

    handleUpdateCurrentMap({ events: newEvents });
    setEditingEvent(null);
  };

  const handleDeleteEvent = () => {
    if (!editingEvent) return;
    const newEvents = currentMap.events.filter((_, idx) => idx !== editingEvent.index);
    handleUpdateCurrentMap({ events: newEvents });
    setEditingEvent(null);
  };

  const handleCancelEditEvent = () => {
    setEditingEvent(null);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    const newItems = [...currentMap.items];
    const targetIdx = newItems.findIndex(i => i.x === editingItem.x && i.y === editingItem.y);
    if (targetIdx >= 0) {
      newItems[targetIdx] = {
        x: editingItem.x,
        y: editingItem.y,
        itemId: editingItem.itemId,
      };
    } else {
      newItems.push({
        x: editingItem.x,
        y: editingItem.y,
        itemId: editingItem.itemId,
      });
    }
    handleUpdateCurrentMap({ items: newItems });
    setEditingItem(null);
  };

  const handleDeleteItem = () => {
    if (!editingItem) return;
    const newItems = currentMap.items.filter((_, idx) => idx !== editingItem.index);
    handleUpdateCurrentMap({ items: newItems });
    setEditingItem(null);
  };

  const handleCancelEditItem = () => {
    setEditingItem(null);
  };

  const handleCreateNewMap = () => {
    if (!newMapName) return;
    const newId = `map_${Date.now()}`;
    const newMap: MapData = {
      id: newId,
      name: newMapName,
      width: newMapWidth,
      height: newMapHeight,
      bgMode: 'image',
      bgImage: 'grass_bg_1782776475818.jpg',
      events: [],
      items: [],
      enemies: []
    };
    setMaps([...maps, newMap]);
    setCurrentMapId(newId);
    setShowNewMapModal(false);
    setNewMapName('');
    setNewMapWidth(16);
    setNewMapHeight(16);
  };

  const handleDeleteMap = async () => {
    if (!currentMap) return;
    
    if (currentMapId === 'map_beginning') {
      alert('始まりのマップは削除できません。');
      return;
    }
    
    if (!window.confirm(`本当にマップ「${currentMap.name}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteMapFromFirestore(currentMapId);
      
      const newMaps = maps.filter(m => m.id !== currentMapId);
      setMaps(newMaps);
      setInitialMaps(newMaps);
      
      const defaultId = newMaps.some((m: MapData) => m.id === 'map_beginning')
        ? 'map_beginning'
        : (newMaps[0]?.id || '');
      setCurrentMapId(defaultId);
      alert('マップを削除しました。');
    } catch (err: any) {
      console.error('Error deleting map:', err);
      alert('削除エラー: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCurrentMap = (updates: Partial<MapData>) => {
    console.log("Updating map with:", updates);
    let finalUpdates = { ...updates };
    if (updates.bgMode) {
      setBgMode(updates.bgMode);
      const currentEnemies = currentMap.enemies || [];
      if (updates.bgMode === 'text-black') {
        const hasTextEnemy = currentEnemies.some(id => id.startsWith('text_'));
        if (!hasTextEnemy) {
          finalUpdates.enemies = ['text_teki'];
          finalUpdates.boss = undefined;
        }
      } else if (updates.bgMode === 'stone-gray') {
        const hasGrayEnemy = currentEnemies.some(id => id.startsWith('gray_'));
        if (!hasGrayEnemy) {
          finalUpdates.enemies = ['gray_slime'];
          finalUpdates.boss = undefined;
        }
      } else {
        // If changing to color, check if we have any color enemies
        const hasColorEnemy = currentEnemies.some(id => id.startsWith('color_'));
        if (!hasColorEnemy) {
          finalUpdates.enemies = ['color_slime_green'];
          finalUpdates.boss = undefined;
        }
      }
    }

    const targetMap = maps.find(m => m.id === currentMapId) || currentMap;
    const nextWidth = updates.width !== undefined ? updates.width : targetMap.width;
    const nextHeight = updates.height !== undefined ? updates.height : targetMap.height;

    if (updates.width !== undefined || updates.height !== undefined) {
      finalUpdates.events = targetMap.events.filter(e => e.x < nextWidth && e.y < nextHeight);
      finalUpdates.items = targetMap.items.filter(item => item.x < nextWidth && item.y < nextHeight);
      finalUpdates.obstacles = (targetMap.obstacles || []).filter(obs => obs.x < nextWidth && obs.y < nextHeight);
    }

    setMaps(maps.map(m => m.id === currentMapId ? { ...m, ...finalUpdates } : m));
  };

  const handleSave = async (silent = false): Promise<boolean> => {
    console.log("Attempting to save map to Firestore:", currentMap);
    if (!silent) {
      setSaveStatus('saving');
    }
    try {
      await saveMapToFirestore(currentMap);
      if (!silent) {
        setSaveStatus('success');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
      setInitialMaps(prev => {
        const exists = prev.some(m => m.id === currentMapId);
        if (!exists) {
          return [...prev, JSON.parse(JSON.stringify(currentMap))];
        }
        return prev.map(m => m.id === currentMapId ? JSON.parse(JSON.stringify(currentMap)) : m);
      });
      return true;
    } catch (e: any) {
      console.error("Save error:", e);
      if (!silent) {
        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3500);
      }
      alert('保存エラー: ' + e.message);
      return false;
    }
  };

  const handleConfirmTransitionYes = async () => {
    if (!pendingTransition) return;
    const success = await handleSave(true);
    if (success) {
      if (pendingTransition.type === 'switch_map') {
        setCurrentMapId(pendingTransition.targetMapId!);
      } else if (pendingTransition.type === 'go_back') {
        navigate('/?settings=true');
      }
      setPendingTransition(null);
    }
  };

  const handleConfirmTransitionNo = () => {
    if (!pendingTransition) return;
    if (pendingTransition.type === 'switch_map') {
      const originalMap = initialMaps.find(m => m.id === currentMapId);
      if (originalMap) {
        setMaps(prev => prev.map(m => m.id === currentMapId ? JSON.parse(JSON.stringify(originalMap)) : m));
      } else {
        setMaps(prev => prev.filter(m => m.id !== currentMapId));
      }
      setCurrentMapId(pendingTransition.targetMapId!);
    } else if (pendingTransition.type === 'go_back') {
      navigate('/?settings=true');
    }
    setPendingTransition(null);
  };

  const handleConfirmTransitionCancel = () => {
    setPendingTransition(null);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  if (isTestPlay) {
    return (
      <div className="min-h-screen bg-black flex flex-col relative items-center justify-center">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white font-bold px-4 py-2 rounded-full border-2 border-red-400 shadow-[0_0_10px_rgba(255,0,0,0.5)] flex items-center gap-2 animate-pulse">
          <Zap className="w-5 h-5" />
          TEST PLAY
        </div>
        <button
          onClick={() => setIsTestPlay(false)}
          className="absolute top-4 right-4 z-50 bg-slate-800 text-white font-bold px-4 py-2 rounded hover:bg-slate-700 transition-colors border border-slate-600 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          エディターに戻る
        </button>
        
        <PhaserGameContainer 
          isTestPlay={true}
          maps={maps}
          initialMapId={currentMapId}
          onTestPlayClear={() => setShowClearModal(true)}
        />

        {showClearModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-emerald-500 rounded-lg p-6 max-w-sm w-full text-center shadow-2xl">
              <h2 className="text-xl font-bold text-emerald-400 mb-4">テストプレイ 完了！</h2>
              <p className="text-slate-300 mb-6">イベント条件を満たし、目標地点に到達しました。</p>
              <button
                onClick={() => {
                  setShowClearModal(false);
                  setIsTestPlay(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded transition-colors w-full"
              >
                確認 (エディターに戻る)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 text-slate-200 font-sans flex flex-col items-center">
      
      {/* 鋼製風ヘッダー */}
      <header className="w-full bg-gradient-to-b from-slate-600 to-slate-700 border-b border-slate-500 shadow-lg px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleBack}
            className="p-2 bg-slate-800 hover:bg-slate-900 rounded border border-slate-600 transition-colors shadow-inner flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-xl font-bold tracking-widest text-slate-100 uppercase" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            Map & Event Editor
          </h1>
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-3 flex-wrap">
          <button 
            onClick={() => setIsTestPlay(true)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold shadow transition-colors"
          >
            <Play className="w-4 h-4" /> テストプレイ
          </button>
          {saveStatus === 'success' && (
            <span className="text-sm font-bold text-teal-300 bg-teal-900/50 px-3 py-1.5 rounded-full border border-teal-500/30">
              保存しました
            </span>
          )}
          <button 
            onClick={() => handleSave(false)}
            disabled={saveStatus !== 'idle'}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded font-bold shadow transition-all duration-300 ${
              saveStatus === 'idle' ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95' :
              saveStatus === 'saving' ? 'bg-amber-600 cursor-not-allowed opacity-85 animate-pulse' :
              saveStatus === 'success' ? 'bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.6)]' :
              'bg-red-600'
            }`}
          >
            {saveStatus === 'idle' && (
              <>
                <Save className="w-4 h-4" />
                <span>反映 (Save)</span>
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>反映中...</span>
              </>
            )}
            {saveStatus === 'success' && (
              <>
                <Check className="w-4 h-4 text-teal-100 animate-bounce" />
                <span>反映完了！</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 text-red-100" />
                <span>保存失敗</span>
              </>
            )}
          </button>
          <span className="hidden md:inline text-sm text-slate-300">
            {currentMap.name} ({currentMap.width}x{currentMap.height})
          </span>
          <div className="hidden md:block text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded shadow-inner border border-slate-800">
            STATUS: ONLINE
          </div>
        </div>
      </header>
      
      {/* Mobile Tabs */}
      <div className="flex md:hidden w-full bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <button 
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'map' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          マップ選択
        </button>
        <button 
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'canvas' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          キャンバス
        </button>
        <button 
          onClick={() => setMobileTab('tools')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'tools' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`}
        >
          ツール設定
        </button>
      </div>

      {/* エディターメイン画面 */}
      <div className="flex-1 w-full max-w-7xl p-2 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6">
        
        {/* 左側メニュー：鋼製パネル風 */}
        <aside className={`${mobileTab === 'map' ? 'flex' : 'hidden'} md:flex w-full md:w-72 bg-slate-700 rounded-lg border border-slate-600 shadow-xl p-4 flex-col gap-6 shrink-0`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)' }}>
          
          {/* マップ選択 / 新規作成 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-600 pb-1 flex items-center gap-2">
              <MapIcon className="w-4 h-4" /> Select Map
            </h2>
            <div className="flex flex-col gap-2">
              <select 
                value={currentMapId}
                onChange={(e) => handleMapChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-slate-400"
              >
                {maps.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.width}x{m.height})</option>
                ))}
              </select>
              
              <button 
                onClick={async () => {
                  const anyDirty = maps.some(m => {
                    const original = initialMaps.find(o => o.id === m.id);
                    return !original ? true : JSON.stringify(m) !== JSON.stringify(original);
                  });
                  if (anyDirty) {
                    if (!confirm('未保存の変更があります。変更を破棄してFirestoreの最新データと同期しますか？')) {
                      return;
                    }
                  }
                  setIsLoading(true);
                  try {
                    await loadMapsFromFirestoreDB(false);
                    alert('Firestoreの最新状態を同期しました。🔄');
                  } catch (err: any) {
                    alert('同期エラー: ' + err.message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded text-sm transition-colors border border-blue-500 shadow-inner"
                title="Firestoreのマップデータを再読込して同期します"
              >
                <RefreshCw className="w-4 h-4" /> Firestore同期 (更新)
              </button>
              
              <button 
                onClick={() => setShowNewMapModal(true)}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded text-sm transition-colors border border-emerald-500 shadow-inner"
              >
                <Plus className="w-4 h-4" /> 新規マップ作成
              </button>

              <button 
                onClick={handleDeleteMap}
                disabled={currentMapId === 'map_beginning'}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm transition-colors border border-red-500 shadow-inner"
              >
                <Trash2 className="w-4 h-4" /> マップ削除
              </button>
            </div>
          </div>

          {/* 背景モード設定 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-600 pb-1 flex items-center gap-2">
              <Settings className="w-4 h-4" /> Background Mode
            </h2>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="bgMode" 
                  value="text-black" 
                  checked={bgMode === 'text-black'}
                  onChange={() => handleUpdateCurrentMap({ bgMode: 'text-black', bgImage: undefined })}
                  className="accent-slate-400"
                />
                <span className="text-sm">テキスト黒背景</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="bgMode" 
                  value="stone-gray" 
                  checked={bgMode === 'stone-gray'}
                  onChange={() => handleUpdateCurrentMap({ bgMode: 'stone-gray', bgImage: undefined })}
                  className="accent-slate-400"
                />
                <span className="text-sm">シンプル (グレイ石ころ)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="bgMode" 
                  value="grass-green" 
                  checked={bgMode === 'grass-green'}
                  onChange={() => handleUpdateCurrentMap({ bgMode: 'grass-green', bgImage: undefined })}
                  className="accent-slate-400"
                />
                <span className="text-sm">シンプル (緑草原)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="bgMode" 
                  value="image" 
                  checked={bgMode === 'image'}
                  onChange={() => handleUpdateCurrentMap({ bgMode: 'image', bgImage: 'grass_bg_1782776475818.jpg' })}
                  className="accent-slate-400"
                />
                <span className="text-sm">画像背景 (GrassBG等)</span>
              </label>
              
              {bgMode === 'image' && (
                <div className="pl-6 pt-1">
                  <select
                    value={currentMap.bgImage || 'grass_bg_1782776475818.jpg'}
                    onChange={(e) => handleUpdateCurrentMap({ bgImage: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-slate-400"
                  >
                    <option value="grass_bg_1782776475818.jpg">grass_bg_1782776475818.jpg</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 配置モード設定 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-600 pb-1">
              Placement Mode
            </h2>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setPlaceMode('obstacle')}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all ${
                  placeMode === 'obstacle' ? 'bg-slate-600 border border-slate-500 shadow-inner text-white' : 'hover:bg-slate-600/50 text-slate-300'
                }`}
              >
                <Box className="w-4 h-4" />
                障害配置
              </button>
              <button 
                onClick={() => setPlaceMode('item')}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all ${
                  placeMode === 'item' ? 'bg-slate-600 border border-slate-500 shadow-inner text-white' : 'hover:bg-slate-600/50 text-slate-300'
                }`}
              >
                <Gem className="w-4 h-4" />
                アイテム配置
              </button>
              <button 
                onClick={() => setPlaceMode('event')}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded text-sm transition-all ${
                  placeMode === 'event' ? 'bg-slate-600 border border-slate-500 shadow-inner text-white' : 'hover:bg-slate-600/50 text-slate-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                イベント配置
              </button>
            </div>
          </div>

          {/* アイテム設定詳細 */}
          {placeMode === 'item' && (
            <div className="flex flex-col gap-3 mt-2 border-t border-slate-600 pt-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider pb-1">
                Item Properties
              </h2>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">アイテムタイプ</label>
                  <select 
                    value={newItemParams.itemId}
                    onChange={(e) => setNewItemParams({ ...newItemParams, itemId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                  >
                    {bgMode === 'text-black' && <option value="treasure_text">宝 (Text)</option>}
                    {customItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.chestGraphic || '📦'} {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 障害設定詳細 */}
          {placeMode === 'obstacle' && (
            <div className="flex flex-col gap-3 mt-2 border-t border-slate-600 pt-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider pb-1">
                Obstacle Properties
              </h2>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-bold uppercase mb-1">障害物の種類</label>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'transparent', name: '透明の障害 (🫥)', desc: '視覚的には透明。エディタのみ表示。' },
                      { id: 'pillar', name: '柱 (🏛️)', desc: '64x64の高精細なピクセルアート。' },
                      { id: 'rock', name: '岩 (🪨)', desc: '64x64の高精細なピクセルアート。' },
                      { id: 'peg', name: '杭 (🪵)', desc: '64x64の高精細なピクセルアート。' },
                      { id: 'wall', name: '壁 (🧱)', desc: '64x64の高精細なピクセルアート。' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setObstacleType(type.id as any)}
                        className={`flex flex-col items-start w-full px-3 py-2 rounded text-left transition-all border ${
                          obstacleType === type.id 
                            ? 'bg-slate-700/80 border-slate-400 text-white shadow' 
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <span className="font-bold text-xs">{type.name}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* イベント設定詳細 */}
          {placeMode === 'event' && (
            <div className="flex flex-col gap-3 mt-2 border-t border-slate-600 pt-4">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider pb-1">
                Event Properties
              </h2>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">イベントタイプ</label>
                  <select 
                    value={newEventParams.type}
                    onChange={(e) => setNewEventParams({ ...newEventParams, type: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                  >
                    <option value="start_point">初期値 (Start Point)</option>
                    <option value="teleport">マップ移動 (Teleport)</option>
                    <option value="monologue">モノローグ (Monologue)</option>
                    <option value="custom_event">カスタムイベント (Custom Event)</option>
                  </select>
                </div>

                {(newEventParams.type === 'custom_event' || newEventParams.type === 'start_point' || newEventParams.type === 'teleport') && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">連動イベント (任意)</label>
                    <select 
                      value={newEventParams.customEventId}
                      onChange={(e) => setNewEventParams({ ...newEventParams, customEventId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                    >
                      <option value="">設定なし</option>
                      {customEvents.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newEventParams.type === 'start_point' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">元マップ指定</label>
                    <select 
                      value={newEventParams.startPointFromMap}
                      onChange={(e) => setNewEventParams({ ...newEventParams, startPointFromMap: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                    >
                      <option value="">設定なし (デフォルト開始位置)</option>
                      {maps.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newEventParams.type === 'teleport' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">移動先マップ</label>
                    <select 
                      value={newEventParams.teleportTargetMap}
                      onChange={(e) => setNewEventParams({ ...newEventParams, teleportTargetMap: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                    >
                      <option value="" disabled>選択してください</option>
                      {maps.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {newEventParams.type === 'monologue' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">モノローグテキスト</label>
                    <textarea 
                      value={newEventParams.monologueText}
                      onChange={(e) => setNewEventParams({ ...newEventParams, monologueText: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                      rows={3}
                      placeholder="表示するテキストを入力"
                    />
                  </div>
                )}

                {(newEventParams.type === 'custom_event' || newEventParams.type === 'start_point' || newEventParams.type === 'teleport' || newEventParams.type === 'monologue') && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-xs text-slate-400 font-bold uppercase">再生頻度設定</label>
                    <select 
                      value={newEventParams.playMode}
                      onChange={(e) => setNewEventParams({ ...newEventParams, playMode: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                    >
                      <option value="always">何度でも表示する (Always)</option>
                      <option value="once_per_map">一回だけ表示 (マップ出入りでリセット)</option>
                      <option value="once_global">ゲーム中一回だけしか表示しない</option>
                    </select>
                  </div>
                )}
                
                <div className="flex flex-col gap-1 mt-2 border-t border-slate-600 pt-2">
                  <label className="text-xs text-slate-400 font-bold uppercase">固有条件 (踏破率)</label>
                  <select 
                    value={newEventParams.eventCondExpRate === null ? 'null' : String(newEventParams.eventCondExpRate)}
                    onChange={(e) => setNewEventParams({ ...newEventParams, eventCondExpRate: e.target.value === 'null' ? null : Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                  >
                    <option value="null">なし (条件なし)</option>
                    <option value="50">50%</option>
                    <option value="80">80%</option>
                    <option value="100">100%</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400 font-bold uppercase">固有条件 (捜索率)</label>
                  <select 
                    value={newEventParams.eventCondSearchRate === null ? 'null' : String(newEventParams.eventCondSearchRate)}
                    onChange={(e) => setNewEventParams({ ...newEventParams, eventCondSearchRate: e.target.value === 'null' ? null : Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                  >
                    <option value="null">なし (条件なし)</option>
                    <option value="50">50%</option>
                    <option value="80">80%</option>
                    <option value="100">100%</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 mt-2 border-t border-slate-600 pt-2">
                  <label className="text-xs text-slate-400 font-bold uppercase">固有条件 (撃破率)</label>
                  <select 
                    value={newEventParams.eventCondDefeatRate === null ? 'null' : String(newEventParams.eventCondDefeatRate)}
                    onChange={(e) => setNewEventParams({ ...newEventParams, eventCondDefeatRate: e.target.value === 'null' ? null : Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                  >
                    <option value="null">なし (条件なし)</option>
                    <option value="50">50%</option>
                    <option value="80">80%</option>
                    <option value="100">100%</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* 中央：マッププレビュー領域 */}
        <main className={`${mobileTab === 'canvas' ? 'flex' : 'hidden'} md:flex flex-1 bg-slate-900 rounded-lg border-2 border-slate-700 p-2 flex-col items-center justify-center relative overflow-auto shadow-inner min-h-[50vh]`}>
          <div className={`w-full max-w-[600px] aspect-square rounded ${
            bgMode === 'text-black' ? 'bg-black' : 
            bgMode === 'stone-gray' ? 'bg-slate-400' : 
            bgMode === 'grass-green' ? 'bg-[#4ade80]' :
            bgMode === 'image' ? 'bg-black' : ''
          } flex items-center justify-center transition-colors relative`}
          style={{ 
            width: `${currentMap.width * 32}px`, 
            height: `${currentMap.height * 32}px`,
            backgroundImage: bgMode === 'image' && currentMap.bgImage ? (currentMap.bgImage.includes('grass_bg') ? `url(${grassBgUrl})` : `url(/${currentMap.bgImage})`) : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            ...(bgMode === 'stone-gray' ? { backgroundImage: 'radial-gradient(circle, #cbd5e1 2px, transparent 2px), radial-gradient(circle, #cbd5e1 2px, transparent 2px)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' } : {})
          }}
          >
            
            {/* Grid Preview (Mock) */}
            <div 
              className="absolute inset-0 grid pointer-events-auto z-10"
              style={{
                gridTemplateColumns: `repeat(${currentMap.width}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${currentMap.height}, minmax(0, 1fr))`
              }}
            >
              {Array.from({ length: currentMap.width * currentMap.height }).map((_, i) => {
                const x = i % currentMap.width;
                const y = Math.floor(i / currentMap.width);
                const hasObstacle = (currentMap.obstacles || []).find(obs => obs.x === x && obs.y === y);
                const hasEvent = currentMap.events.find(e => e.x === x && e.y === y);
                const hasItem = currentMap.items.find(i => i.x === x && i.y === y);
                return (
                  <div 
                    key={i} 
                    className="border border-slate-500/30 hover:bg-slate-400/30 cursor-pointer flex items-center justify-center transition-colors"
                    onClick={() => handleGridClick(x, y)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleGridDrop(e, x, y)}
                  >
                     {hasObstacle ? (
                        <div 
                          draggable={placeMode === 'obstacle'}
                          onDragStart={(e) => handleGridDragStart(e, x, y, 'obstacle')}
                          onDragEnd={handleGridDragEnd}
                          className={`w-full h-full flex items-center justify-center text-xs font-bold ${
                            placeMode === 'obstacle' ? 'cursor-grab hover:opacity-80 active:cursor-grabbing' : ''
                          } ${
                            hasObstacle.type === 'transparent' ? 'bg-red-500/15 border border-dashed border-red-500 text-red-500' :
                            hasObstacle.type === 'pillar' ? 'bg-slate-300/60 border border-slate-500 text-slate-800' :
                            hasObstacle.type === 'rock' ? 'bg-slate-400/60 border border-slate-600 text-slate-800' :
                            hasObstacle.type === 'peg' ? 'bg-amber-600/30 border border-amber-800 text-amber-900' :
                            'bg-red-800/40 border border-red-900 text-red-100'
                          }`}
                          title={`障害: ${
                            hasObstacle.type === 'transparent' ? '透明の障害' :
                            hasObstacle.type === 'pillar' ? '柱' :
                            hasObstacle.type === 'rock' ? '岩' :
                            hasObstacle.type === 'peg' ? '杭' : '壁'
                          }`}
                        >
                          {hasObstacle.type === 'transparent' ? '🫥' :
                           hasObstacle.type === 'pillar' ? '🏛️' :
                           hasObstacle.type === 'rock' ? '🪨' :
                           hasObstacle.type === 'peg' ? '🪵' : '🧱'}
                        </div>
                     ) : (
                        <>
                          {hasEvent && hasEvent.type === 'start_point' && (
                              <div 
                                draggable={placeMode === 'event'}
                                onDragStart={(e) => handleGridDragStart(e, x, y, 'event')}
                                onDragEnd={handleGridDragEnd}
                                className={`w-full h-full bg-yellow-500/50 flex items-center justify-center text-xs font-bold text-yellow-100 ${
                                  placeMode === 'event' ? 'cursor-grab hover:opacity-80 active:cursor-grabbing' : ''
                                }`}
                                title={`初期値 ${hasEvent.data?.fromMap ? `(from: ${hasEvent.data.fromMap})` : ''}`}
                              >
                                S
                              </div>
                           )}
                          {hasEvent && hasEvent.type === 'teleport' && (
                              <div 
                                draggable={placeMode === 'event'}
                                onDragStart={(e) => handleGridDragStart(e, x, y, 'event')}
                                onDragEnd={handleGridDragEnd}
                                className={`w-full h-full bg-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-100 ${
                                  placeMode === 'event' ? 'cursor-grab hover:opacity-80 active:cursor-grabbing' : ''
                                }`}
                                title={`移動 (to: ${hasEvent.data?.targetMap})`}
                              >
                                T
                              </div>
                           )}
                          {hasEvent && hasEvent.type === 'monologue' && (
                              <div 
                                draggable={placeMode === 'event'}
                                onDragStart={(e) => handleGridDragStart(e, x, y, 'event')}
                                onDragEnd={handleGridDragEnd}
                                className={`w-full h-full bg-emerald-500/50 flex items-center justify-center text-xs font-bold text-emerald-100 ${
                                  placeMode === 'event' ? 'cursor-grab hover:opacity-80 active:cursor-grabbing' : ''
                                }`}
                                title={`モノローグ\n${hasEvent.data?.text || ''}`}
                              >
                                M
                              </div>
                           )}
                          {hasEvent && hasEvent.type === 'custom_event' && (
                              <div 
                                draggable={placeMode === 'event'}
                                onDragStart={(e) => handleGridDragStart(e, x, y, 'event')}
                                onDragEnd={handleGridDragEnd}
                                className={`w-full h-full bg-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-100 ${
                                  placeMode === 'event' ? 'cursor-grab hover:opacity-80 active:cursor-grabbing' : ''
                                }`}
                                title={`カスタムイベント: ${hasEvent.data?.eventId || ''}`}
                              >
                                C
                              </div>
                           )}
                          {hasItem && (
                              <div 
                                draggable={placeMode === 'item'}
                                onDragStart={(e) => handleGridDragStart(e, x, y, 'item')}
                                onDragEnd={handleGridDragEnd}
                                className={`w-full h-full bg-amber-500/50 flex items-center justify-center text-xs font-bold text-amber-100 ${
                                  placeMode === 'item' ? 'cursor-grab hover:opacity-80 active:cursor-grabbing' : ''
                                }`}
                                title={`アイテム: ${hasItem.itemId}`}
                              >
                                {hasItem.itemId === 'treasure_text' ? '宝' : (customItems.find(it => it.id === hasItem.itemId)?.chestGraphic || '🎁')}
                              </div>
                           )}
                        </>
                     )}
                  </div>
                );
              })}
            </div>

            <div className="text-center font-mono text-sm opacity-50 select-none pointer-events-none">
              <p className={bgMode === 'simple' || bgMode === 'grass' ? 'text-slate-800' : 'text-slate-400'}>
                [ Map Editor Canvas ]
              </p>
              <p className={`mt-2 ${bgMode === 'simple' || bgMode === 'grass' ? 'text-slate-800' : 'text-slate-400'}`}>
                Grid: {currentMap.width}x{currentMap.height}
              </p>
            </div>
          </div>
        </main>

        {/* 右側：マップ設定領域 */}
        <aside className={`${mobileTab === 'tools' ? 'flex' : 'hidden'} md:flex w-full md:w-80 bg-slate-700 rounded-lg border border-slate-600 shadow-xl p-4 flex-col gap-6 overflow-y-auto shrink-0`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)' }}>
          {/* マップ固有設定 */}
          <div className="flex flex-col gap-3 border-b border-slate-600 pb-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider pb-1">
              Map Config
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-bold uppercase">マップ表示名</label>
                <input 
                  type="text"
                  value={currentMap.name}
                  onChange={(e) => handleUpdateCurrentMap({ name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 w-1/2">
                  <label className="text-xs text-slate-400 font-bold uppercase">幅 (Width)</label>
                  <input 
                    type="number"
                    value={currentMap.width}
                    onChange={(e) => handleUpdateCurrentMap({ width: Math.max(1, Number(e.target.value)) })}
                    min={4}
                    max={64}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-1 w-1/2">
                  <label className="text-xs text-slate-400 font-bold uppercase">高さ (Height)</label>
                  <input 
                    type="number"
                    value={currentMap.height}
                    onChange={(e) => handleUpdateCurrentMap({ height: Math.max(1, Number(e.target.value)) })}
                    min={4}
                    max={64}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2.5 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 敵とボスの設定 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-600 pb-1">
              Enemies & Boss
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-bold uppercase">通常敵 (最大3種)</label>
                {[0, 1, 2].map((index) => (
                  <select
                    key={index}
                    value={(currentMap.enemies || [])[index] || ''}
                    onChange={(e) => {
                      const newEnemies = [...(currentMap.enemies || [])];
                      newEnemies[index] = e.target.value;
                      handleUpdateCurrentMap({ enemies: newEnemies.filter(v => v !== undefined && v !== '') });
                    }}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                  >
                    <option value="">なし</option>
                    {getAvailableEnemies(bgMode).map(enemy => (
                      <option key={enemy.id} value={enemy.id}>{enemy.name}</option>
                    ))}
                  </select>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-400 font-bold uppercase">ボス (1種)</label>
                <select
                  value={currentMap.boss || ''}
                  onChange={(e) => handleUpdateCurrentMap({ boss: e.target.value || undefined })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="">なし</option>
                  {getAvailableBosses(bgMode).map(boss => (
                    <option key={boss.id} value={boss.id}>{boss.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 mt-2 border-t border-slate-600 pt-2">
                <label className="text-xs text-slate-400 font-bold uppercase">敵の出現数 (Max Enemies)</label>
                <select
                  value={currentMap.maxEnemies === undefined || currentMap.maxEnemies === 'infinite' ? 'infinite' : currentMap.maxEnemies === 0 ? 'none' : String(currentMap.maxEnemies)}
                  onChange={(e) => {
                    let val: 'infinite' | number = 'infinite';
                    if (e.target.value === 'infinite') val = 'infinite';
                    else if (e.target.value === 'none') val = 0;
                    else val = Number(e.target.value);
                    handleUpdateCurrentMap({ maxEnemies: val });
                  }}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                >
                  <option value="none">なし (None)</option>
                  <option value="infinite">無限 (Infinite)</option>
                  <option value="5">5体</option>
                  <option value="10">10体</option>
                  <option value="20">20体</option>
                  <option value="30">30体</option>
                  <option value="50">50体</option>
                </select>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* 新規マップ作成モーダル */}
      {showNewMapModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-700 rounded-xl border border-slate-500 shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" /> 新規マップ作成
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300 font-bold uppercase">マップ名 (表示名)</label>
              <input 
                type="text"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                placeholder="例: はじまりの村"
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1 w-1/2">
                <label className="text-xs text-slate-300 font-bold uppercase">幅 (Width)</label>
                <input 
                  type="number"
                  value={newMapWidth}
                  onChange={(e) => setNewMapWidth(Number(e.target.value))}
                  min={1}
                  max={64}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1 w-1/2">
                <label className="text-xs text-slate-300 font-bold uppercase">高さ (Height)</label>
                <input 
                  type="number"
                  value={newMapHeight}
                  onChange={(e) => setNewMapHeight(Number(e.target.value))}
                  min={1}
                  max={64}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="text-xs text-slate-400 mt-1">
              ファイル名は自動生成されます。
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setShowNewMapModal(false)}
                className="px-4 py-2 rounded text-sm text-slate-300 hover:bg-slate-600 transition-colors"
              >
                キャンセル
              </button>
              <button 
                onClick={handleCreateNewMap}
                disabled={!newMapName}
                className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* イベント編集モーダル */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-700 rounded-xl border border-slate-500 shadow-2xl p-6 w-full max-w-md flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-600 pb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              イベント編集 ({editingEvent.x}, {editingEvent.y})
            </h3>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300 font-bold uppercase">イベントタイプ</label>
                <select 
                  value={editingEvent.type}
                  onChange={(e) => setEditingEvent({ 
                    ...editingEvent, 
                    type: e.target.value as 'start_point' | 'teleport' | 'monologue' | 'custom_event'
                  })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="start_point">初期値 (Start Point)</option>
                  <option value="teleport">マップ移動 (Teleport)</option>
                  <option value="monologue">モノローグ (Monologue)</option>
                  <option value="custom_event">カスタムイベント (Custom Event)</option>
                </select>
              </div>

              {(editingEvent.type === 'custom_event' || editingEvent.type === 'start_point' || editingEvent.type === 'teleport') && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300 font-bold uppercase">連動イベント (任意)</label>
                  <select 
                    value={editingEvent.eventId}
                    onChange={(e) => setEditingEvent({ ...editingEvent, eventId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="">設定なし</option>
                    {customEvents.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingEvent.type === 'start_point' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300 font-bold uppercase">元マップ指定</label>
                  <select 
                    value={editingEvent.fromMap}
                    onChange={(e) => setEditingEvent({ ...editingEvent, fromMap: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="">設定なし (デフォルト開始位置)</option>
                    {maps.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingEvent.type === 'teleport' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300 font-bold uppercase">移動先マップ</label>
                  <select 
                    value={editingEvent.targetMap}
                    onChange={(e) => setEditingEvent({ ...editingEvent, targetMap: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>選択してください</option>
                    {maps.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingEvent.type === 'monologue' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300 font-bold uppercase">モノローグテキスト</label>
                  <textarea 
                    value={editingEvent.text}
                    onChange={(e) => setEditingEvent({ ...editingEvent, text: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    rows={4}
                  />
                </div>
              )}

              <div className="flex flex-col gap-1 mt-2 border-t border-slate-600 pt-2">
                <label className="text-xs text-slate-300 font-bold uppercase">固有条件 (踏破率)</label>
                <select 
                  value={editingEvent.requiredExplorationRate === null ? 'null' : String(editingEvent.requiredExplorationRate)}
                  onChange={(e) => setEditingEvent({ 
                    ...editingEvent, 
                    requiredExplorationRate: e.target.value === 'null' ? null : Number(e.target.value) 
                  })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="null">なし (条件なし)</option>
                  <option value="50">50%</option>
                  <option value="80">80%</option>
                  <option value="100">100%</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300 font-bold uppercase">固有条件 (捜索率)</label>
                <select 
                  value={editingEvent.requiredSearchRate === null ? 'null' : String(editingEvent.requiredSearchRate)}
                  onChange={(e) => setEditingEvent({ 
                    ...editingEvent, 
                    requiredSearchRate: e.target.value === 'null' ? null : Number(e.target.value) 
                  })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="null">なし (条件なし)</option>
                  <option value="50">50%</option>
                  <option value="80">80%</option>
                  <option value="100">100%</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300 font-bold uppercase">固有条件 (撃破率)</label>
                <select 
                  value={editingEvent.requiredDefeatRate === null ? 'null' : String(editingEvent.requiredDefeatRate)}
                  onChange={(e) => setEditingEvent({ 
                    ...editingEvent, 
                    requiredDefeatRate: e.target.value === 'null' ? null : Number(e.target.value) 
                  })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  <option value="null">なし (条件なし)</option>
                  <option value="50">50%</option>
                  <option value="80">80%</option>
                  <option value="100">100%</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-600 gap-2">
              <button 
                onClick={handleDeleteEvent}
                className="px-4 py-2 rounded text-sm bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow"
              >
                削除
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleCancelEditEvent}
                  className="px-4 py-2 rounded text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={handleUpdateEvent}
                  className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-inner"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* アイテム編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-700 rounded-xl border border-slate-500 shadow-2xl p-6 w-full max-w-md flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-600 pb-2">
              <Gem className="w-5 h-5 text-amber-400" />
              アイテム編集 ({editingItem.x}, {editingItem.y})
            </h3>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300 font-bold uppercase">アイテムタイプ</label>
                <select 
                  value={editingItem.itemId}
                  onChange={(e) => setEditingItem({ 
                    ...editingItem, 
                    itemId: e.target.value
                  })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500"
                >
                  {bgMode === 'text-black' && <option value="treasure_text">宝 (Text)</option>}
                  {customItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.chestGraphic || '📦'} {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-600 gap-2">
              <button 
                onClick={handleDeleteItem}
                className="px-4 py-2 rounded text-sm bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow"
              >
                削除
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleCancelEditItem}
                  className="px-4 py-2 rounded text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={handleUpdateItem}
                  className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors shadow-inner"
                >
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 未保存変更確認モーダル */}
      {pendingTransition && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div 
            className="bg-slate-800 border-2 border-slate-500 rounded-xl p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 10px 25px rgba(0,0,0,0.6)',
              background: 'linear-gradient(135deg, #1e293b, #0f172a)'
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-yellow-500" />
              <h3 className="text-lg font-bold text-slate-100 tracking-wider">未保存の変更があります</h3>
            </div>
            
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              マップ「<span className="text-emerald-400 font-semibold">{currentMap.name}</span>」の編集内容が保存（反映）されていません。<br />
              移動する前に変更内容を反映しますか？
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={handleConfirmTransitionYes}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> はい (反映する)
              </button>
              <button
                onClick={handleConfirmTransitionNo}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded shadow transition-colors text-sm flex items-center justify-center gap-2"
              >
                いいえ (破棄する)
              </button>
              <button
                onClick={handleConfirmTransitionCancel}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded shadow transition-colors text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}

