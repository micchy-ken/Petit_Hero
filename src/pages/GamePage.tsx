import React, { useState, useEffect } from 'react';
import { PhaserGameContainer } from '../components/PhaserGameContainer';
import { Gamepad2, Layers, Cpu, ShieldCheck, Loader2 } from 'lucide-react';
import { MapData } from '../types/MapData';
import { fetchMapsFromFirestore, fetchEnemyAssetsFromFirestore } from '../lib/dbService';
import { allMaps as importedMaps } from '../data/maps';

export default function GamePage() {
  const [currentMapId, setCurrentMapId] = useState('map_beginning');
  const [allMaps, setAllMaps] = useState<MapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGameData() {
      try {
        // Load enemy assets from Firestore first, so they are available in Phaser
        await fetchEnemyAssetsFromFirestore();

        // Load maps from Firestore
        let loadedMaps = await fetchMapsFromFirestore();
        const hasBeginning = loadedMaps.some((m: MapData) => m.id === 'map_beginning');
        if (!hasBeginning) {
          const beginningMap = importedMaps.find((m: MapData) => m.id === 'map_beginning') || importedMaps[0];
          loadedMaps = [beginningMap, ...loadedMaps];
        }
        setAllMaps(loadedMaps);
        
        // Ensure starting map is selected
        if (loadedMaps.some((m: MapData) => m.id === 'map_beginning')) {
          setCurrentMapId('map_beginning');
        } else if (loadedMaps.length > 0) {
          setCurrentMapId(loadedMaps[0].id);
        }
      } catch (e: any) {
        console.warn("Using bundled static maps for game due to load error:", e.message);
        setAllMaps(importedMaps);
        const defaultId = importedMaps.some((m: MapData) => m.id === 'map_beginning') ? 'map_beginning' : (importedMaps[0]?.id || '');
        setCurrentMapId(defaultId);
      } finally {
        setIsLoading(false);
      }
    }

    loadGameData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      {/* トップヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm hidden">
        {/* Header removed */}
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex items-center justify-center py-8">
        <PhaserGameContainer 
          isTestPlay={true} 
          maps={allMaps} 
          initialMapId={currentMapId} 
          onTeleport={(targetMapId) => setCurrentMapId(targetMapId)} 
        />
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Built on HTML5 Canvas API & Phaser.js Base Architecture</span>
          </div>
          <div className="font-mono text-slate-400">
            Spritesheet: 256x256px (exact 64x64px slices)
          </div>
        </div>
      </footer>
    </div>
  );
}
