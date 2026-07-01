import React, { useState, useEffect } from 'react';
import { ArrowLeft, Box, Gem, Zap, Plus, Map as MapIcon, Save, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapData } from '../types/MapData';

const mapModules = import.meta.glob('../data/maps/*.ts', { eager: true });
const initialMaps: MapData[] = [];
for (const path in mapModules) {
  const mod: any = mapModules[path];
  for (const key in mod) {
    if (mod[key] && mod[key].id) {
      initialMaps.push(mod[key]);
    }
  }
}
// fallback if empty
if (initialMaps.length === 0) {
  initialMaps.push({
    id: 'map_beginning',
    name: '始まり',
    width: 16,
    height: 16,
    bgMode: 'text-black',
    events: [],
    items: [],
    enemies: ['敵']
  });
}

export default function MapEditorPage() {
  const navigate = useNavigate();
  
  const [maps, setMaps] = useState<MapData[]>(initialMaps);
  const [currentMapId, setCurrentMapId] = useState<string>(initialMaps[0].id);
  
  const currentMap = maps.find(m => m.id === currentMapId) || maps[0];

  const [bgMode, setBgMode] = useState<MapData['bgMode']>(currentMap.bgMode);
  const [placeMode, setPlaceMode] = useState<'obstacle' | 'item' | 'event'>('obstacle');
  
  // イベント配置用の状態
  const [eventType, setEventType] = useState<'start_point' | 'teleport'>('start_point');
  const [startPointFromMap, setStartPointFromMap] = useState<string>('');
  const [teleportTargetMap, setTeleportTargetMap] = useState<string>('');

  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapWidth, setNewMapWidth] = useState(16);
  const [newMapHeight, setNewMapHeight] = useState(16);

  useEffect(() => {
    if (currentMap) {
      setBgMode(currentMap.bgMode);
    }
  }, [currentMapId, currentMap]);

  useEffect(() => {
    if (!teleportTargetMap && maps.length > 0) {
      setTeleportTargetMap(maps[0].id);
    }
  }, [maps, teleportTargetMap]);

  const handleGridClick = (x: number, y: number) => {
    if (placeMode === 'event') {
      const existingIndex = currentMap.events.findIndex(e => e.x === x && e.y === y);
      const newEvents = [...currentMap.events];
      
      if (existingIndex >= 0) {
        newEvents.splice(existingIndex, 1);
      } else {
        let data: any = {};
        if (eventType === 'start_point') {
          data = { fromMap: startPointFromMap || null };
        } else if (eventType === 'teleport') {
          if (!teleportTargetMap) return;
          data = { targetMap: teleportTargetMap };
        }
        newEvents.push({ x, y, type: eventType, data });
      }
      
      handleUpdateCurrentMap({ events: newEvents });
    }
  };

  const handleCreateNewMap = () => {
    if (!newMapName) return;
    const newId = `map_${Date.now()}`;
    const newMap: MapData = {
      id: newId,
      name: newMapName,
      width: newMapWidth,
      height: newMapHeight,
      bgMode: 'text-black',
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

  const handleUpdateCurrentMap = (updates: Partial<MapData>) => {
    setMaps(maps.map(m => m.id === currentMapId ? { ...m, ...updates } : m));
    if (updates.bgMode) {
      setBgMode(updates.bgMode);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/save-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentMap)
      });
      if (response.ok) {
        alert('保存しました (Reflected to JS file)');
      } else {
        alert('保存に失敗しました');
      }
    } catch (e) {
      console.error(e);
      alert('保存エラー: サーバーが起動していない可能性があります');
    }
  };

  return (
    <div className="min-h-screen bg-slate-800 text-slate-200 font-sans flex flex-col items-center">
      
      {/* 鋼製風ヘッダー */}
      <header className="w-full bg-gradient-to-b from-slate-600 to-slate-700 border-b border-slate-500 shadow-lg px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 bg-slate-800 hover:bg-slate-900 rounded border border-slate-600 transition-colors shadow-inner flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <h1 className="text-xl font-bold tracking-widest text-slate-100 uppercase" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            Map & Event Editor
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold shadow transition-colors"
          >
            <Save className="w-4 h-4" /> 反映 (Save)
          </button>
          <span className="text-sm text-slate-300">
            {currentMap.name} ({currentMap.width}x{currentMap.height})
          </span>
          <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded shadow-inner border border-slate-800">
            STATUS: ONLINE
          </div>
        </div>
      </header>

      {/* エディターメイン画面 */}
      <div className="flex-1 w-full max-w-7xl p-6 flex flex-col md:flex-row gap-6">
        
        {/* 左側メニュー：鋼製パネル風 */}
        <aside className="w-full md:w-72 bg-slate-700 rounded-lg border border-slate-600 shadow-xl p-4 flex flex-col gap-6" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)' }}>
          
          {/* マップ選択 / 新規作成 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-600 pb-1 flex items-center gap-2">
              <MapIcon className="w-4 h-4" /> Select Map
            </h2>
            <div className="flex flex-col gap-2">
              <select 
                value={currentMapId}
                onChange={(e) => setCurrentMapId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 outline-none focus:border-slate-400"
              >
                {maps.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.width}x{m.height})</option>
                ))}
              </select>
              
              <button 
                onClick={() => setShowNewMapModal(true)}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-emerald-700 hover:bg-emerald-600 rounded text-sm transition-colors border border-emerald-500 shadow-inner"
              >
                <Plus className="w-4 h-4" /> 新規マップ作成
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
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                  >
                    <option value="start_point">初期値 (Start Point)</option>
                    <option value="teleport">マップ移動 (Teleport)</option>
                  </select>
                </div>

                {eventType === 'start_point' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">元マップ指定</label>
                    <select 
                      value={startPointFromMap}
                      onChange={(e) => setStartPointFromMap(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                    >
                      <option value="">設定なし (デフォルト開始位置)</option>
                      {maps.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {eventType === 'teleport' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-400 font-bold uppercase">移動先マップ</label>
                    <select 
                      value={teleportTargetMap}
                      onChange={(e) => setTeleportTargetMap(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                    >
                      <option value="" disabled>選択してください</option>
                      {maps.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* 右側：マッププレビュー領域 */}
        <main className="flex-1 bg-slate-900 rounded-lg border-2 border-slate-700 p-2 flex items-center justify-center relative overflow-auto shadow-inner">
          <div className={`w-full max-w-[600px] aspect-square rounded ${
            bgMode === 'text-black' ? 'bg-black' : 
            bgMode === 'stone-gray' ? 'bg-slate-400' : 
            bgMode === 'grass-green' ? 'bg-[#4ade80]' :
            bgMode === 'image' ? 'bg-black' : ''
          } flex items-center justify-center transition-colors relative`}
          style={{ 
            width: `${currentMap.width * 32}px`, 
            height: `${currentMap.height * 32}px`,
            backgroundImage: bgMode === 'image' && currentMap.bgImage ? `url(/${currentMap.bgImage})` : 'none',
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
                const hasEvent = currentMap.events.find(e => e.x === x && e.y === y);
                return (
                  <div 
                    key={i} 
                    className="border border-slate-500/30 hover:bg-slate-400/30 cursor-pointer flex items-center justify-center transition-colors"
                    onClick={() => handleGridClick(x, y)}
                  >
                     {hasEvent && hasEvent.type === 'start_point' && (
                        <div className="w-full h-full bg-yellow-500/50 flex items-center justify-center text-xs font-bold text-yellow-100" title={`初期値 ${hasEvent.data?.fromMap ? `(from: ${hasEvent.data.fromMap})` : ''}`}>
                          S
                        </div>
                     )}
                     {hasEvent && hasEvent.type === 'teleport' && (
                        <div className="w-full h-full bg-blue-500/50 flex items-center justify-center text-xs font-bold text-blue-100" title={`移動 (to: ${hasEvent.data?.targetMap})`}>
                          T
                        </div>
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

    </div>
  );
}

