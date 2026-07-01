import React, { useState } from 'react';
import { ArrowLeft, Box, Gem, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MapEditorPage() {
  const navigate = useNavigate();
  
  const [bgMode, setBgMode] = useState<'text-black' | 'simple' | 'grass'>('text-black');
  const [placeMode, setPlaceMode] = useState<'obstacle' | 'item' | 'event'>('obstacle');

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
        <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded shadow-inner border border-slate-800">
          STATUS: ONLINE
        </div>
      </header>

      {/* エディターメイン画面 */}
      <div className="flex-1 w-full max-w-6xl p-6 flex flex-col md:flex-row gap-6">
        
        {/* 左側メニュー：鋼製パネル風 */}
        <aside className="w-full md:w-64 bg-slate-700 rounded-lg border border-slate-600 shadow-xl p-4 flex flex-col gap-6" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)' }}>
          
          {/* 背景モード設定 */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-600 pb-1">
              Background Mode
            </h2>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="bgMode" 
                  value="text-black" 
                  checked={bgMode === 'text-black'}
                  onChange={() => setBgMode('text-black')}
                  className="accent-slate-400"
                />
                <span className="text-sm">テキスト黒背景</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="bgMode" 
                  value="simple" 
                  checked={bgMode === 'simple'}
                  onChange={() => setBgMode('simple')}
                  className="accent-slate-400"
                />
                <span className="text-sm">シンプル (単色)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="bgMode" 
                  value="grass" 
                  checked={bgMode === 'grass'}
                  onChange={() => setBgMode('grass')}
                  className="accent-slate-400"
                />
                <span className="text-sm">GrassBG</span>
              </label>
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
        </aside>

        {/* 右側：マッププレビュー領域（仮） */}
        <main className="flex-1 bg-slate-900 rounded-lg border-2 border-slate-700 p-2 flex items-center justify-center relative overflow-hidden shadow-inner">
          <div className={`w-full max-w-[448px] aspect-square rounded ${
            bgMode === 'text-black' ? 'bg-black' : 
            bgMode === 'simple' ? 'bg-[#ecfdf5]' : 
            'bg-[#4ade80]' /* 仮のGrassBGカラー */
          } flex items-center justify-center transition-colors relative`}>
            
            {/* Grid Preview (Mock) */}
            <div className="absolute inset-0 grid grid-cols-[repeat(7,minmax(0,1fr))] grid-rows-[repeat(7,minmax(0,1fr))] opacity-20 pointer-events-none">
              {Array.from({ length: 49 }).map((_, i) => (
                <div key={i} className="border border-slate-500" />
              ))}
            </div>

            <div className="text-center font-mono text-sm opacity-50 select-none">
              <p className={bgMode === 'simple' || bgMode === 'grass' ? 'text-slate-800' : 'text-slate-400'}>
                [ Map Editor Canvas ]
              </p>
              <p className={`mt-2 ${bgMode === 'simple' || bgMode === 'grass' ? 'text-slate-800' : 'text-slate-400'}`}>
                Mode: {placeMode.toUpperCase()}
              </p>
            </div>
          </div>
        </main>
      </div>

    </div>
  );
}
