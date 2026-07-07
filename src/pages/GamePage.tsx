import React, { useState, useEffect } from 'react';
import { PhaserGameContainer } from '../components/PhaserGameContainer';
import { Gamepad2, Layers, Cpu, ShieldCheck, Loader2, Play, RotateCcw, Plus, ArrowLeft, Settings, Trash2, Heart, Sword, Star } from 'lucide-react';
import { MapData } from '../types/MapData';
import { 
  fetchMapsFromFirestore, 
  fetchEnemyAssetsFromFirestore, 
  fetchHeroStatusFromFirestore,
  fetchScenariosFromFirestore,
  fetchLastPlayedScenarioId,
  loadScenarioProgress,
  saveScenariosToFirestore
} from '../lib/dbService';
import { Scenario } from '../types/Scenario';
import { useNavigate } from 'react-router-dom';

export default function GamePage() {
  const navigate = useNavigate();
  const [currentMapId, setCurrentMapId] = useState('map_beginning');
  const [allMaps, setAllMaps] = useState<MapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scenario & Save States
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [lastPlayedScenarioId, setLastPlayedScenarioId] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, any>>({});
  
  // Game Play State
  const [viewState, setViewState] = useState<'title' | 'scenarios' | 'scenario_options' | 'playing'>('title');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [loadedHeroState, setLoadedHeroState] = useState<any | null>(null);
  const [loadedPosition, setLoadedPosition] = useState<any | null>(null);

  // New Scenario Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioMode, setNewScenarioMode] = useState<'individual' | 'shared'>('individual');

  const loadAllConfig = async () => {
    setIsLoading(true);
    try {
      // Pre-load common assets
      await fetchEnemyAssetsFromFirestore();
      await fetchHeroStatusFromFirestore();

      // Fetch scenarios
      const loadedScenarios = await fetchScenariosFromFirestore();
      setScenarios(loadedScenarios);

      // Fetch last played metadata
      const lastId = await fetchLastPlayedScenarioId();
      setLastPlayedScenarioId(lastId);

      // Load save progress for all scenarios in background
      const checks: Record<string, any> = {};
      for (const sc of loadedScenarios) {
        const progress = await loadScenarioProgress(sc.id, sc.statusMode);
        checks[sc.id] = progress;
      }
      setSaveStates(checks);

    } catch (e) {
      console.error("Error loading configs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (viewState !== 'playing') {
      loadAllConfig();
    }
  }, [viewState]);

  const launchGame = async (scenario: Scenario, continueGame: boolean) => {
    setIsLoading(true);
    try {
      // Fetch maps specifically for this scenario
      const scenarioMaps = await fetchMapsFromFirestore(scenario.id);
      setAllMaps(scenarioMaps);

      const save = saveStates[scenario.id];
      if (continueGame && save && save.position) {
        setLoadedPosition(save.position);
        setLoadedHeroState(save.heroState || null);
        
        // Ensure starting map exists
        const mapExists = scenarioMaps.some(m => m.id === save.position.mapId);
        setCurrentMapId(mapExists ? save.position.mapId : (scenarioMaps[0]?.id || ''));
      } else {
        setLoadedPosition(null);
        setLoadedHeroState(null);
        
        const beginningMap = scenarioMaps.find(m => m.id === 'map_beginning' || m.id.startsWith('map_beginning_')) || scenarioMaps[0];
        setCurrentMapId(beginningMap?.id || '');
      }

      setActiveScenario(scenario);
      setViewState('playing');
    } catch (e) {
      console.error("Error launching game:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;

    const newId = `scenario_${Date.now()}`;
    const newScenario: Scenario = {
      id: newId,
      name: newScenarioName.trim(),
      statusMode: newScenarioMode,
      createdAt: Date.now()
    };

    const updated = [...scenarios, newScenario];
    setScenarios(updated);
    await saveScenariosToFirestore(updated);

    // Auto-select and launch options for this new scenario
    setSelectedScenario(newScenario);
    setNewScenarioName('');
    setShowCreateModal(false);
    setViewState('scenario_options');
    
    // Seed saveStates with empty check for new scenario
    setSaveStates(prev => ({
      ...prev,
      [newId]: { position: null, heroState: null }
    }));
  };

  const handleDeleteScenario = async (scenarioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scenarioId === 'scenario_test') {
      alert('デフォルトのテストシナリオは削除できません。');
      return;
    }
    if (!confirm('このシナリオを削除しますか？（マップデータや進行状況は復元できません）')) {
      return;
    }

    const updated = scenarios.filter(s => s.id !== scenarioId);
    setScenarios(updated);
    await saveScenariosToFirestore(updated);
    if (lastPlayedScenarioId === scenarioId) {
      setLastPlayedScenarioId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-sm font-medium tracking-widest text-slate-400">Loading Adventure Data...</p>
      </div>
    );
  }

  // --- PLAYING STATE ---
  if (viewState === 'playing' && activeScenario) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100 font-sans">
        <header className="bg-slate-950 border-b border-slate-800 py-3 px-6 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
              シナリオ: {activeScenario.name}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              ステータス: {activeScenario.statusMode === 'individual' ? '個別管理' : '共通共有'}
            </span>
          </div>
          <button 
            onClick={() => setViewState('title')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold transition-all border border-slate-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            タイトルに戻る
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <PhaserGameContainer 
            isTestPlay={false} 
            maps={allMaps} 
            initialMapId={currentMapId} 
            scenarioId={activeScenario.id}
            scenarioStatusMode={activeScenario.statusMode}
            initialHeroState={loadedHeroState}
            initialPosition={loadedPosition}
            onTeleport={(targetMapId) => setCurrentMapId(targetMapId)} 
          />
        </main>
      </div>
    );
  }

  // --- TITLE MENU / SELECTIONS ---
  const hasLastPlayed = lastPlayedScenarioId && scenarios.some(s => s.id === lastPlayedScenarioId) && saveStates[lastPlayedScenarioId]?.position;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Decorative Starry Background Effect */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
      
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col gap-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
        
        {/* LOGO AREA */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 mb-2">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-wider text-white font-sans uppercase">
            HD-2D RPG Adventure
          </h1>
          <p className="text-xs text-slate-500 font-mono">MULTI-SCENARIO CORE SYSTEM</p>
        </div>

        {/* --- VIEW: MAIN TITLE --- */}
        {viewState === 'title' && (
          <div className="flex flex-col gap-3.5">
            <button
              onClick={() => {
                if (lastPlayedScenarioId) {
                  const sc = scenarios.find(s => s.id === lastPlayedScenarioId);
                  if (sc) launchGame(sc, true);
                }
              }}
              disabled={!hasLastPlayed}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-between border shadow-md ${
                hasLastPlayed
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 hover:scale-[1.01] active:scale-[0.99]'
                  : 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <Play className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-bold">前回のゲームの続き</div>
                  {hasLastPlayed && (
                    <div className="text-[10px] text-emerald-200/80 font-normal">
                      シナリオ: {scenarios.find(s => s.id === lastPlayedScenarioId)?.name} (Lv.{saveStates[lastPlayedScenarioId]?.heroState?.level || 1})
                    </div>
                  )}
                </div>
              </div>
              {hasLastPlayed && <span className="text-xs font-mono px-2 py-0.5 bg-emerald-700/60 rounded border border-emerald-500/30">CONTINUE</span>}
            </button>

            <button
              onClick={() => setViewState('scenarios')}
              className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between shadow-md"
            >
              <span className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-emerald-400" />
                シナリオ選択
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">SCENARIOS</span>
            </button>

            <button
              onClick={() => navigate('/editor/map')}
              className="w-full py-4 px-6 bg-slate-800/40 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-2xl font-bold text-sm transition-all hover:text-slate-200 flex items-center gap-3 justify-center mt-4 border-dashed"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              マップエディターへ移動
            </button>
          </div>
        )}

        {/* --- VIEW: SCENARIO SELECTION --- */}
        {viewState === 'scenarios' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">シナリオ一覧</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                新規作成
              </button>
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {scenarios.map((sc) => {
                const save = saveStates[sc.id];
                const hasSave = save && save.position;
                return (
                  <div
                    key={sc.id}
                    onClick={() => {
                      setSelectedScenario(sc);
                      setViewState('scenario_options');
                    }}
                    className="p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 cursor-pointer transition-all flex justify-between items-center"
                  >
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        {sc.name}
                        {sc.statusMode === 'shared' && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">共通</span>
                        )}
                        {sc.statusMode === 'individual' && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">個別</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {hasSave 
                          ? `Lv.${save.heroState?.level || 1} - 進行中 (${save.position.mapId})` 
                          : '進行データなし (未開始)'}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDeleteScenario(sc.id, e)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-md hover:bg-slate-800 transition-all ml-2"
                      title="シナリオ削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setViewState('title')}
              className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 justify-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              タイトルメニューに戻る
            </button>
          </div>
        )}

        {/* --- VIEW: SCENARIO OPTIONS (NEW GAME vs CONTINUE) --- */}
        {viewState === 'scenario_options' && selectedScenario && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-800/20 border border-slate-800 p-4 rounded-2xl text-center">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase font-mono">選択中</span>
              <h3 className="font-bold text-white text-base mt-1">{selectedScenario.name}</h3>
              <p className="text-[11px] text-slate-400 mt-1.5">
                ステータス保持: {selectedScenario.statusMode === 'individual' ? '個別管理（独立）' : '共通共有（共通同士で共有）'}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => launchGame(selectedScenario, true)}
                disabled={!saveStates[selectedScenario.id]?.position}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border shadow-sm ${
                  saveStates[selectedScenario.id]?.position
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 hover:scale-[1.01] active:scale-[0.99]'
                    : 'bg-slate-800/40 text-slate-500 border-slate-800/50 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4" />
                続きから（ロード）
              </button>

              <button
                onClick={() => {
                  if (saveStates[selectedScenario.id]?.position && !confirm('進行中のセーブデータが上書きされます。よろしいですか？')) {
                    return;
                  }
                  launchGame(selectedScenario, false);
                }}
                className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-md"
              >
                <RotateCcw className="w-4 h-4 text-emerald-400" />
                最初から（新規開始）
              </button>
            </div>

            <button
              onClick={() => setViewState('scenarios')}
              className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 justify-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              シナリオ選択に戻る
            </button>
          </div>
        )}

      </div>

      {/* --- CREATE SCENARIO MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
            <h3 className="text-base font-bold text-white tracking-wide">新規シナリオの作成</h3>
            
            <form onSubmit={handleCreateScenario} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">シナリオ名</label>
                <input
                  type="text"
                  required
                  placeholder="例: 村の平和を取り戻せ"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-emerald-500/50 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  主人公のレベルステータス保持
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewScenarioMode('individual')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      newScenarioMode === 'individual'
                        ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                        : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm">個別</span>
                    <span className="text-[9px] font-normal opacity-80">このシナリオのみ管理</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewScenarioMode('shared')}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      newScenarioMode === 'shared'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm">共通</span>
                    <span className="text-[9px] font-normal opacity-80">共通シナリオ間で共有</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full py-3 bg-slate-800/50 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all border border-emerald-500 shadow-md shadow-emerald-950/20"
                >
                  作成して進む
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="absolute bottom-6 text-[10px] text-slate-600 font-mono tracking-wider">
        ACTIVE PERSISTENCE ENGINE v1.1 • FIRESTORE CONNECTED
      </footer>
    </div>
  );
}
