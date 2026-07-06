import React, { useEffect, useRef, useState, useMemo } from 'react';
import Phaser from 'phaser';
import { GridMovementScene, HeroState, Direction, ActionLog } from '../phaser/GridMovementScene';
import { Play, Pause, RotateCcw, Eye, EyeOff, Sparkles, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Gauge, Grid, Image as ImageIcon, Heart, Sword, Star, Settings, X, Move, Flame, Zap, Map, Menu, User, Brain, Shield, Ghost, MessageSquare, Package, Scroll, Download } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

import { MapData } from '../types/MapData';
import { CustomEvent, ConversationNode } from '../types/CustomEvent';
import { fetchCustomEventsFromFirestore, fetchCustomItemsFromFirestore, fetchMagicDataFromFirestore } from '../lib/dbService';
import { CustomItem } from '../types/CustomItem';
import { PORTRAITS } from '../data/portraits';

export interface PhaserGameContainerProps {
  isTestPlay?: boolean;
  maps?: MapData[];
  initialMapId?: string;
  onTestPlayClear?: () => void;
  onTeleport?: (targetMapId: string) => void;
}

const HeroGraphic = ({ scene, displayMode }: { scene: any, displayMode?: string }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!scene || !scene.textures || !displayMode) return;
    const textureKey = displayMode === 'text' ? 'hero_spritesheet_text' 
      : displayMode === 'grayscale' ? 'hero_spritesheet_gray' 
      : 'hero_spritesheet';
    
    // Some delay to ensure texture is generated
    const timer = setTimeout(() => {
      if (!scene || !scene.textures) return;
      const tex = scene.textures.get(textureKey);
      if (tex && tex.getSourceImage) {
        const img = tex.getSourceImage();
        if (img instanceof HTMLCanvasElement) {
          setDataUrl(img.toDataURL());
        } else if (img instanceof HTMLImageElement) {
          setDataUrl(img.src);
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [scene, displayMode]);

  if (!dataUrl) return <div className="w-[64px] h-[64px] bg-slate-200 rounded animate-pulse" />;

  return (
    <div 
      className="w-[64px] h-[64px] overflow-hidden rounded bg-white shadow-sm flex-shrink-0"
      style={{
        backgroundImage: `url(${dataUrl})`,
        backgroundSize: '256px 256px',
        animation: 'hero-walk-front 1s steps(4) infinite',
      }}
    >
      <style>{`
        @keyframes hero-walk-front {
          from { background-position: 0px 0px; }
          to { background-position: -256px 0px; }
        }
      `}</style>
    </div>
  );
};

export const PhaserGameContainer: React.FC<PhaserGameContainerProps> = ({ isTestPlay, maps, initialMapId, onTestPlayClear, onTeleport }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<GridMovementScene | null>(null);
  const lastLevelRef = useRef<number>(1);
  const navigate = useNavigate();
  const location = useLocation();

  const showSettingsOnInit = location.search.includes('settings=true') || location.hash.includes('settings=true');

  // カスタムイベント再生ステータス
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const customEventsRef = useRef<CustomEvent[]>([]);
  const handleNextConversationNode = () => {
    if (!activeEvent) return;
    if (activeNodeIndex < activeEvent.nodes.length - 1) {
      setActiveNodeIndex(activeNodeIndex + 1);
    } else {
      setActiveEvent(null);
      const currentCallback = onEventComplete;
      setOnEventComplete(null);
      if (currentCallback) {
        currentCallback();
      }
      
      // ゲーム画面（キャンバス）にフォーカスを強制的に戻してキーボード入力を即再開させる
      setTimeout(() => {
        if (gameContainerRef.current) {
          const canvas = gameContainerRef.current.querySelector('canvas');
          if (canvas) {
            canvas.focus();
            if (sceneRef.current && sceneRef.current.input && sceneRef.current.input.keyboard) {
              sceneRef.current.input.keyboard.resetKeys();
            }
          }
        }
      }, 50);
    }
  };


  useEffect(() => {
    customEventsRef.current = customEvents;
  }, [customEvents]);

  const [activeMessageType, setActiveMessageType] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CustomEvent | null>(null);
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const [onEventComplete, setOnEventComplete] = useState<(() => void) | null>(null);

  const [isEventsLoaded, setIsEventsLoaded] = useState(false);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const customItemsRef = useRef<CustomItem[]>([]);
  const magicsRef = useRef<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchCustomEventsFromFirestore(),
      fetchCustomItemsFromFirestore(),
      fetchMagicDataFromFirestore()
    ]).then(([eventsData, itemsData, magicsData]) => {
      setCustomEvents(eventsData);
      customEventsRef.current = eventsData;
      setCustomItems(itemsData);
      customItemsRef.current = itemsData;
      magicsRef.current = magicsData;
      setIsEventsLoaded(true);

      if (sceneRef.current) {
        sceneRef.current.customItems = itemsData;
        sceneRef.current.magics = magicsData;
      }
    });
  }, []);

  // UIステータス
  const [showSettings, setShowSettings] = useState(showSettingsOnInit);
  const [isTurbo, setIsTurbo] = useState(false);
  const [heroState, setHeroState] = useState<HeroState>({
    gridX: 7,
    gridY: 7,
    camGridX: 4,
    camGridY: 4,
    direction: 'idle',
    isMoving: false,
    isScrolling: false,
    speedMs: 450,
    hp: 20,
    maxHp: 20,
    attack: 5,
    defense: 0,
    level: 1,
    exp: 0,
    requiredExp: 10,
    acquiredItems: [],
    equippedWeaponId: null,
    equippedArmorId: null,
    equippedAccessoryId: null,
    baseAttack: 5,
    baseDefense: 0,
    displayMode: 'normal'
  });

  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [cumulativeLogs, setCumulativeLogs] = useState<{ id: string; timestamp: string; type: string; message: string }[]>(() => {
    try {
      const saved = localStorage.getItem('cumulativeGameLogs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const cumulativeLogsContainerRef = useRef<HTMLDivElement>(null);

  // オートスクロール：最新ログが一番下なので、追加時や設定タブを開いた時に最下部までスクロールする
  useEffect(() => {
    if (cumulativeLogsContainerRef.current) {
      // 少し遅らせることで、レンダリングが完了した後に確実に最下部へスクロールさせます
      setTimeout(() => {
        if (cumulativeLogsContainerRef.current) {
          cumulativeLogsContainerRef.current.scrollTop = cumulativeLogsContainerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [cumulativeLogs, showSettings]);

  const clearCumulativeLogs = () => {
    setCumulativeLogs([]);
    try {
      localStorage.removeItem('cumulativeGameLogs');
    } catch (e) {
      console.error(e);
    }
  };

  const exportCumulativeLogs = () => {
    try {
      const jsonStr = JSON.stringify(cumulativeLogs, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `game_adventure_logs_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeEvent && activeEvent.nodes && activeEvent.nodes[activeNodeIndex]) {
      const node = activeEvent.nodes[activeNodeIndex];
      const speaker = node.speakerName || 'システム';
      const msg = node.message || '';
      
      const logMsg = `【会話】${speaker}: 「${msg}」`;
      const logId = `dial-${activeEvent.id}-${activeNodeIndex}`;
      
      setCumulativeLogs(prev => {
        if (prev.some(l => l.id === logId)) return prev;
        const updated = [...prev, {
          id: logId,
          timestamp: new Date().toLocaleTimeString(),
          type: 'event',
          message: logMsg
        }];
        try {
          localStorage.setItem('cumulativeGameLogs', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }
  }, [activeEvent, activeNodeIndex]);

  const [autoMode, setAutoMode] = useState<'none' | 'random' | 'seek'>('seek');

  const [explorationRate, setExplorationRate] = useState(0);
  const [searchRate, setSearchRate] = useState(0);
  const [defeatRate, setDefeatRate] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isHd2d, setIsHd2d] = useState<boolean>(false);
  const [useGrassBg, setUseGrassBg] = useState<boolean>(true);
  const [allow8Way, setAllow8Way] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<'normal' | 'text' | 'grayscale'>('text');
  const [speed, setSpeed] = useState<number>(1000);
  const [showSpritesheetModal, setShowSpritesheetModal] = useState<boolean>(false);
  const [spritesheetUrl, setSpritesheetUrl] = useState<string>('');
  
  const [activeMenuTab, setActiveMenuTab] = useState<'settings' | 'status' | 'behavior'>('settings');
  const [movementBehavior, setMovementBehavior] = useState<string>('unvisited');
  const [combatBehavior, setCombatBehavior] = useState<string>('closest_enemy');
  const [goalBehavior, setGoalBehavior] = useState<string>('seek_visible');
  const [messageWaitMode, setMessageWaitMode] = useState<string>('none');
  const [messageAutoAdvanceSeconds, setMessageAutoAdvanceSeconds] = useState<number>(3);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (activeEvent) {
      let waitClick = false;
      if (messageWaitMode === 'item_and_event' && (activeMessageType === 'item' || activeMessageType === 'event')) waitClick = true;
      else if (messageWaitMode === 'event_only' && activeMessageType === 'event') waitClick = true;
      else if (messageWaitMode === 'none') waitClick = false;

      if (!waitClick) {
        timerId = setTimeout(() => {
          handleNextConversationNode();
        }, messageAutoAdvanceSeconds * 1000);
      }
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [activeEvent, activeNodeIndex, messageWaitMode, messageAutoAdvanceSeconds, activeMessageType]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tracerColor, setTracerColor] = useState<'green' | 'blue' | 'red' | 'gray' | 'none'>('green');

  const availableMovementBehaviors = [
    { id: 'unvisited', label: '未踏破エリアを目指す', description: '非戦闘時にまだ歩いていない場所を目指し、踏破率100%を目指します。' },
  ];

  const availableCombatBehaviors = [
    { id: 'closest_enemy', label: '画面に写った敵に近づいて倒す', description: '画面内の敵を最優先で目指し、倒そうとします。' },
  ];

  const availableGoalBehaviors = [
    { id: 'seek_visible', label: 'ゴール、アイテムが発見できたら即座に目指す', description: '画面内にゴールやアイテムが現れた場合、それを最優先で目指します。' },
    { id: 'ignore', label: 'ゴールを無視する', description: 'ゴールが出現しても特別な行動をしません。' },
  ];

  useEffect(() => {
    if (!gameContainerRef.current) return;

    // ゲームコンフィグ (トータル576x576px = 9 x 64px)
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 448,
      height: 448,
      parent: gameContainerRef.current,
      backgroundColor: '#ecfdf5',
      scene: [GridMovementScene],
      physics: {
        default: 'arcade'
      },
      render: {
        pixelArt: true,
        antialias: false
      },
      audio: {
        disableWebAudio: true,
        noAudio: true
      }
    };

    const game = new Phaser.Game(config);
    gameInstanceRef.current = game;

    // シーンの読み込み完了を待機してコールバックを設定
    game.events.once('ready', () => {
      const scene = game.scene.getScene('GridMovementScene') as GridMovementScene;
      if (scene) {
        sceneRef.current = scene;
        scene.customItems = customItemsRef.current;
        scene.magics = magicsRef.current;
        lastLevelRef.current = 1;
        
        scene.setOnCustomItemsChange?.((updatedItems) => {
          setCustomItems(updatedItems);
          customItemsRef.current = updatedItems;
        });

        scene.setOnStateChange((newState: HeroState) => {
          setHeroState(newState);
          if (newState.level !== lastLevelRef.current) {
            lastLevelRef.current = newState.level;
          }
        });
        
        scene.setOnLog((newLog) => {
          setLogs(prev => [...prev.slice(-49), newLog]);
          setCumulativeLogs(prev => {
            const updated = [...prev, {
              id: newLog.id || Math.random().toString(36).substring(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              type: newLog.type,
              message: newLog.message
            }];
            try {
              localStorage.setItem('cumulativeGameLogs', JSON.stringify(updated));
            } catch (e) {
              console.error(e);
            }
            return updated;
          });
        });

        scene.setOnCustomEvent((eventId, onComplete) => {
          const ev = customEventsRef.current.find(e => e.id === eventId);
          if (ev && ev.nodes.length > 0) {
            setActiveMessageType('event');
            setActiveEvent(ev);
            setActiveNodeIndex(0);
            setOnEventComplete(() => onComplete);
          } else {
            onComplete();
          }
        });
        
        scene.onSystemMessageCallback = (type, text, onComplete) => {
          setActiveMessageType(type);
          setActiveNodeIndex(0);
          setActiveEvent({
            id: `sys-${Date.now()}`,
            name: 'System',
            type: 'conversation',
            nodes: [
              {
                id: '1',
                speakerName: 'システム',
                message: text,
                portraitId: 'none'
              }
            ]
          });
          setOnEventComplete(() => onComplete);
        };



        scene.setOnStatsChange = (expRate: number, sRate: number, dRate: number | null) => {
          setExplorationRate(expRate);
          setSearchRate(sRate);
          setDefeatRate(dRate);
        };

        if (maps && initialMapId) {
          const startMap = maps.find(m => m.id === initialMapId);
          if (startMap) {
            scene.mapData = startMap;
            scene.customItems = customItemsRef.current;
            scene.gridCols = startMap.width;
            scene.gridRows = startMap.height;
            scene.onTestPlayClear = onTestPlayClear ? () => {
              setIsTurbo(false);
              scene.isTurboActive = false;
              onTestPlayClear();
            } : undefined;
            scene.onTeleport = onTeleport ? (targetMapId) => {
              setIsTurbo(false);
              scene.isTurboActive = false;
              onTeleport(targetMapId);
            } : undefined;
            
            // Apply map styles using scene's central method
            scene.applyMapSettings(startMap.bgMode, startMap.bgImage);
            
            // Sync React local states
            const isText = startMap.bgMode === 'text-black';
            const isGray = startMap.bgMode === 'stone-gray';
            const isImg = startMap.bgMode === 'image';
            const isGrass = startMap.bgMode === 'grass-green';
            
            const mode = isText ? 'text' : isGray ? 'grayscale' : 'normal';
            setDisplayMode(mode);
            setUseGrassBg(isImg);
            setIsHd2d(isImg);
            setAllow8Way(false);
            const targetSpeed = isImg ? 500 : isGrass ? 600 : isText ? 1000 : 800;
            setSpeed(targetSpeed);
            scene.setSpeed(targetSpeed);

            // Start from the correct initial position
            scene.resetPosition();
          }
        }

        // テクスチャからプレビュー用URLを抽出
        setTimeout(() => {
          if (game.textures.exists('hero_spritesheet')) {
            const texture = game.textures.get('hero_spritesheet');
            const sourceImage = texture.getSourceImage() as HTMLCanvasElement;
            if (sourceImage && sourceImage.toDataURL) {
              setSpritesheetUrl(sourceImage.toDataURL());
            }
          }
        }, 500);
      }
    });

    return () => {
      game.destroy(true);
      gameInstanceRef.current = null;
      sceneRef.current = null;
    };
  }, [isEventsLoaded]); // Run when events are loaded

  // Watch for initialMapId changes (e.g. teleporting)
  useEffect(() => {
    if (sceneRef.current && maps && initialMapId) {
      const scene = sceneRef.current;
      const targetMap = maps.find(m => m.id === initialMapId);
      if (targetMap && (targetMap.id !== scene.mapData?.id || targetMap !== scene.mapData)) {
        // マップ切り替え時はターボを安全のために強制リセット
        setIsTurbo(false);
        scene.isTurboActive = false;

        const fromMapId = scene.mapData?.id || null;
        scene.mapData = targetMap;
        scene.customItems = customItemsRef.current;
        scene.gridCols = targetMap.width;
        scene.gridRows = targetMap.height;
        
        scene.applyMapSettings(targetMap.bgMode, targetMap.bgImage);
        
        const isText = targetMap.bgMode === 'text-black';
        const isGray = targetMap.bgMode === 'stone-gray';
        const isImg = targetMap.bgMode === 'image';
        const isGrass = targetMap.bgMode === 'grass-green';
        
        const mode = isText ? 'text' : isGray ? 'grayscale' : 'normal';
        setDisplayMode(mode);
        setUseGrassBg(isImg);
        setIsHd2d(isImg);
        setAllow8Way(false);
        const targetSpeed = isImg ? 500 : isGrass ? 600 : isText ? 1000 : 800;
        setSpeed(targetSpeed);
        scene.setSpeed(targetSpeed);

        scene.resetPosition(fromMapId);
      }
    }
  }, [initialMapId, maps]);

  // UI操作ハンドラー
  const toggleAutoMode = () => {
    let nextMode: 'none' | 'random' | 'seek' = 'none';
    if (autoMode === 'none') nextMode = 'random';
    else if (autoMode === 'random') nextMode = 'seek';
    else nextMode = 'none';

    setAutoMode(nextMode);
    sceneRef.current?.setAutoMode(nextMode);
  };

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.movementBehavior = movementBehavior;
    }
  }, [movementBehavior]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.combatBehavior = combatBehavior;
    }
  }, [combatBehavior]);

  useEffect(() => {
    if (sceneRef.current) {
      const scene = sceneRef.current;
      scene.onTestPlayClear = onTestPlayClear ? () => {
        setIsTurbo(false);
        scene.isTurboActive = false;
        onTestPlayClear();
      } : undefined;
    }
  }, [onTestPlayClear]);

  useEffect(() => {
    if (sceneRef.current) {
      const scene = sceneRef.current;
      scene.onTeleport = onTeleport ? (targetMapId) => {
        setIsTurbo(false);
        scene.isTurboActive = false;
        onTeleport(targetMapId);
      } : undefined;
    }
  }, [onTeleport]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.goalBehavior = goalBehavior;
    }
  }, [goalBehavior]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.messageWaitMode = messageWaitMode;
    }
  }, [messageWaitMode]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.messageAutoAdvanceSeconds = messageAutoAdvanceSeconds;
    }
  }, [messageAutoAdvanceSeconds]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.tracerColor = tracerColor;
      sceneRef.current.forceDrawVisitedTrace(); // We'll add this method or it will just draw next turn
    }
  }, [tracerColor]);

  const toggleGrid = () => {
    const nextVal = !showGrid;
    setShowGrid(nextVal);
    sceneRef.current?.toggleGridLines(nextVal);
  };

  const toggleGrassBg = () => {
    const nextVal = !useGrassBg;
    setUseGrassBg(nextVal);
    sceneRef.current?.toggleGrassBg(nextVal);
  };

  const toggle8Way = () => {
    const nextVal = !allow8Way;
    setAllow8Way(nextVal);
    sceneRef.current?.toggle8WayMode(nextVal);
  };

  const toggleHd2d = () => {
    const nextVal = !isHd2d;
    setIsHd2d(nextVal);
    sceneRef.current?.toggleHd2dEffects(nextVal);
  };

  const isTextMode = displayMode === 'text';

  const handleDisplayModeChange = (mode: 'normal' | 'text' | 'grayscale') => {
    setDisplayMode(mode);
    sceneRef.current?.setDisplayMode(mode);
  };

  const openSpritesheetModal = () => {
    const game = gameInstanceRef.current;
    if (game) {
      let textureKey = 'hero_spritesheet';
      if (displayMode === 'text') textureKey = 'hero_spritesheet_text';
      else if (displayMode === 'grayscale') textureKey = 'hero_spritesheet_gray';

      if (game.textures.exists(textureKey)) {
        const texture = game.textures.get(textureKey);
        const sourceImage = texture.getSourceImage() as HTMLCanvasElement;
        if (sourceImage && sourceImage.toDataURL) {
          setSpritesheetUrl(sourceImage.toDataURL());
        }
      }
    }
    setShowSpritesheetModal(true);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    sceneRef.current?.setSpeed(newSpeed);
  };

  const handleReset = () => {
    sceneRef.current?.resetPosition();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 relative">
      
      {/* Settings Toggle Button */}
      <button 
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white rounded-full shadow-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors z-20"
      >
        {showSettings ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <div className={showSettings ? "hidden" : "flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200"}>
        {/* 左側：ゲーム画面（576x576pxフレーム） */}
        <div className="flex flex-col items-center bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden p-4 sm:p-6">

            
            {/* Phaser描画ターゲットとログオーバーレイのラッパー */}
            <div className="relative rounded-lg overflow-hidden shadow-inner border-2 border-emerald-600 bg-emerald-50 select-none" style={{ width: 448, height: 448 }}>
              <div 
                ref={gameContainerRef} 
                className="w-full h-full"
              />
              {/* 会話イベントオーバーレイ */}
              {activeEvent && activeEvent.nodes[activeNodeIndex] && (
                <div 
                  className="absolute inset-0 z-50 cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleNextConversationNode(); }}
                >
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/80 border-t-4 border-indigo-500 p-4 flex gap-4">
                  {PORTRAITS[activeEvent.nodes[activeNodeIndex].portraitId || 'none'] && (
                    <div className="flex-shrink-0 w-24 h-24 bg-slate-800 border-2 border-indigo-400 rounded-lg overflow-hidden flex items-center justify-center">
                      <img 
                        src={PORTRAITS[activeEvent.nodes[activeNodeIndex].portraitId || 'none']} 
                        alt="portrait" 
                        className="w-full h-full object-cover"
                        style={{ imageRendering: 'auto' }}
                      />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="font-bold text-indigo-300 text-sm mb-1 truncate">
                      {activeEvent.nodes[activeNodeIndex].speakerName}
                    </div>
                    <div className="text-white text-base leading-relaxed break-words overflow-y-auto">
                      {activeEvent.nodes[activeNodeIndex].message}
                    </div>
                    <div className="mt-auto self-end text-xs text-indigo-400 animate-pulse mt-2">
                      {
    (() => {
      let waitClick = false;
      if (messageWaitMode === 'item_and_event' && (activeMessageType === 'item' || activeMessageType === 'event')) waitClick = true;
      else if (messageWaitMode === 'event_only' && activeMessageType === 'event') waitClick = true;
      else if (messageWaitMode === 'none') waitClick = false;
      
      return waitClick ? '▼ クリックして進む' : `( ${messageAutoAdvanceSeconds}秒で自動的に進みます )`;
    })()
}
                    </div>
                  </div>
                  </div>
                </div>
              )}
              {/* 踏破率・捜索率・撃破率 表示 */}
              <div className="absolute top-2 left-2 z-20 flex flex-col gap-1 text-[11px] font-bold text-white drop-shadow-md pointer-events-none">
                <div className="bg-black/60 px-2.5 py-0.5 rounded border border-white/20 shadow">
                  踏破率: {Math.floor(explorationRate)}%
                </div>
                <div className="bg-black/60 px-2.5 py-0.5 rounded border border-white/20 shadow">
                  捜索率: {Math.floor(searchRate)}%
                </div>
                <div className="bg-black/60 px-2.5 py-0.5 rounded border border-white/20 shadow text-amber-300">
                  撃破率: {defeatRate === null ? '∞' : `${Math.floor(defeatRate)}%`}
                </div>
              </div>
              {/* Virtual Pad / Auto Toggle Overlay */}
              {autoMode !== 'none' ? (
                <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                  <button
                    onPointerDown={() => {
                      setIsTurbo(true);
                      if (sceneRef.current) sceneRef.current.isTurboActive = true;
                    }}
                    onPointerUp={() => {
                      setIsTurbo(false);
                      if (sceneRef.current) sceneRef.current.isTurboActive = false;
                    }}
                    onPointerLeave={() => {
                      setIsTurbo(false);
                      if (sceneRef.current) sceneRef.current.isTurboActive = false;
                    }}
                    onPointerCancel={() => {
                      setIsTurbo(false);
                      if (sceneRef.current) sceneRef.current.isTurboActive = false;
                    }}
                    className={`px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black rounded-xl shadow-lg border border-orange-400/50 flex items-center justify-center gap-1.5 select-none transition-all duration-150 active:scale-95 ${
                      isTurbo ? 'brightness-125 scale-105 animate-pulse border-orange-300' : 'hover:brightness-110'
                    }`}
                    style={{ touchAction: 'none' }}
                    title="押している間だけ0msで自動行動します"
                  >
                    <Flame className={`w-4 h-4 ${isTurbo ? 'animate-bounce' : ''}`} />
                    TURBO
                  </button>
                  <button
                    onClick={() => {
                      setAutoMode('none');
                      sceneRef.current?.setAutoMode('none');
                    }}
                    className="bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm transition-all border border-emerald-400/50 flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-4 h-4" />
                    AUTO
                  </button>
                </div>
              ) : (
                <div className="absolute bottom-4 left-4 z-20">
                  <div className="grid grid-cols-3 gap-1 bg-slate-800/60 p-2.5 rounded-2xl backdrop-blur-sm border border-white/10 shadow-lg">
                    {/* Row 1: Up */}
                    <div />
                    <button 
                      onPointerDown={() => sceneRef.current?.setVirtualInput('up', true)}
                      onPointerUp={() => sceneRef.current?.setVirtualInput('up', false)}
                      onPointerLeave={() => sceneRef.current?.setVirtualInput('up', false)}
                      className="bg-white/20 hover:bg-white/30 active:bg-white/40 w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                    ><ArrowUp className="w-6 h-6 text-white" /></button>
                    <div />
                    
                    {/* Row 2: Left, Center, Right */}
                    <button 
                      onPointerDown={() => sceneRef.current?.setVirtualInput('left', true)}
                      onPointerUp={() => sceneRef.current?.setVirtualInput('left', false)}
                      onPointerLeave={() => sceneRef.current?.setVirtualInput('left', false)}
                      className="bg-white/20 hover:bg-white/30 active:bg-white/40 w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                    ><ArrowLeft className="w-6 h-6 text-white" /></button>
                    <div className="w-12 h-12 flex items-center justify-center opacity-30">
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    </div>
                    <button 
                      onPointerDown={() => sceneRef.current?.setVirtualInput('right', true)}
                      onPointerUp={() => sceneRef.current?.setVirtualInput('right', false)}
                      onPointerLeave={() => sceneRef.current?.setVirtualInput('right', false)}
                      className="bg-white/20 hover:bg-white/30 active:bg-white/40 w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                    ><ArrowRight className="w-6 h-6 text-white" /></button>

                    {/* Row 3: Return to Auto (✕), Down, Empty */}
                    <button 
                      onClick={() => {
                        setAutoMode('seek');
                        sceneRef.current?.setAutoMode('seek');
                      }}
                      className="bg-rose-600/85 hover:bg-rose-600 active:bg-rose-700 w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm border border-rose-500/30"
                      title="Return to Auto Mode"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                    <button 
                      onPointerDown={() => sceneRef.current?.setVirtualInput('down', true)}
                      onPointerUp={() => sceneRef.current?.setVirtualInput('down', false)}
                      onPointerLeave={() => sceneRef.current?.setVirtualInput('down', false)}
                      className="bg-white/20 hover:bg-white/30 active:bg-white/40 w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                    ><ArrowDown className="w-6 h-6 text-white" /></button>
                    <div />
                  </div>
                </div>
              )}

              {/* アクションログオーバーレイ (最新5件) */}
              <div className="absolute bottom-2 right-2 w-96 pointer-events-none flex flex-col justify-end gap-1 z-10 p-2">
                {logs.slice(-5).map((log) => (
                  <div key={log.id} className={`animate-in fade-in slide-in-from-bottom-2 duration-300 text-xs font-bold text-right drop-shadow-md truncate ${
                    log.type === 'damage' ? 'text-rose-400' :
                    log.type === 'combat' ? 'text-amber-400' :
                    log.type === 'system' ? 'text-sky-300 font-extrabold' :
                    'text-white'
                  }`} style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}>
                    {log.message}
                  </div>
                ))}
              </div>
            </div>

            {/* HP and Level Status Bar */}
            <div className="w-full mt-4 flex items-center justify-between gap-4 font-mono">
              <div className="flex-1 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                  <Heart className="w-3.5 h-3.5 text-rose-400" /> HP
                </div>
                <div className="text-base font-bold text-white">
                  <span className={heroState.hp <= 5 ? "text-rose-400" : ""}>{heroState.hp}</span> / {heroState.maxHp}
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${heroState.hp <= 5 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${Math.max(0, (heroState.hp / heroState.maxHp) * 100)}%` }} 
                  />
                </div>
              </div>
              
              <div className="flex-1 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                  <Star className="w-3.5 h-3.5 text-amber-400" /> Lv.{heroState.level} EXP
                </div>
                <div className="text-base font-bold text-sky-300">
                  {heroState.exp} / {heroState.requiredExp}
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="h-full bg-sky-400 rounded-full transition-all" 
                    style={{ width: `${Math.min(100, Math.max(0, (heroState.exp / heroState.requiredExp) * 100))}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* 魔法スロット（廃止） */}
          </div>
        </div>
      
      {/* 右側：コントロール＆ステータスパネル (設定画面) */}
      <div className={!showSettings ? "hidden" : "flex flex-col gap-6 w-full max-w-md animate-in fade-in zoom-in-95 duration-200"}>
          
          <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-slate-200 flex flex-col gap-4">
            
            {/* Tabs */}
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
              <button
                onClick={() => setActiveMenuTab('settings')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${
                  activeMenuTab === 'settings' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <Settings className="w-4 h-4" />
                設定
              </button>
              <button
                onClick={() => setActiveMenuTab('status')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${
                  activeMenuTab === 'status' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <User className="w-4 h-4" />
                ステータス・装備
              </button>
              <button
                onClick={() => setActiveMenuTab('behavior')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${
                  activeMenuTab === 'behavior' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                <Brain className="w-4 h-4" />
                行動指針
              </button>
            </div>

            {activeMenuTab === 'settings' && (
              <div className="flex flex-col gap-6 animate-in fade-in">
                {/* エディターへの遷移 */}
                <button
                  onClick={() => navigate('/editor/map')}
                  className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors border border-slate-700 mt-2"
                >
                  <Map className="w-5 h-5 text-slate-300" />
                  マップ＆イベントエディターを開く
                </button>
                <button
                  onClick={() => navigate('/editor/enemy')}
                  className="flex items-center justify-center gap-2 w-full bg-indigo-700 hover:bg-indigo-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors border border-indigo-600"
                >
                  <Ghost className="w-5 h-5 text-indigo-300" />
                  エネミーエディターを開く
                </button>
                <button
                  onClick={() => navigate('/editor/hero')}
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors border border-emerald-500"
                >
                  <Sword className="w-5 h-5 text-emerald-200" />
                  主人公ステータス設定を開く
                </button>
                <button
                  onClick={() => navigate('/editor/event')}
                  className="flex items-center justify-center gap-2 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors border border-amber-500"
                >
                  <MessageSquare className="w-5 h-5 text-amber-200" />
                  イベントエディターを開く
                </button>
                <button
                  onClick={() => navigate('/editor/item')}
                  className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors border border-indigo-500"
                >
                  <Package className="w-5 h-5 text-indigo-200" />
                  アイテムエディターを開く
                </button>
                <button
                  onClick={() => navigate('/editor/magic')}
                  className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors border border-purple-500"
                >
                  <Sparkles className="w-5 h-5 text-purple-200" />
                  マジックエディターを開く
                </button>

                {/* 自動移動モード切替 */}
                <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <div className="text-sm font-medium text-slate-800">Auto Movement</div>
                    <div className="text-xs text-slate-500">
                      {autoMode === 'none' && 'Manual control only'}
                      {autoMode === 'random' && 'Wandering randomly'}
                      {autoMode === 'seek' && 'Action Policy (オート行動)'}
                    </div>
                  </div>
                  <button
                    onClick={toggleAutoMode}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                      autoMode !== 'none'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20' 
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {autoMode === 'none' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {autoMode === 'none' ? 'OFF' : (autoMode === 'random' ? 'Random' : 'Policy')}
                  </button>
                </div>

                {/* 移動スピード調整 */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm font-medium text-slate-700">
                    <span>Movement Speed</span>
                    <span className="font-mono text-emerald-600">{speed} ms / grid</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="1000"
                    step="50"
                    value={speed}
                    onChange={(e) => handleSpeedChange(Number(e.target.value))}
                    className="w-full accent-emerald-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Fast (150ms)</span>
                    <span>Slow (1000ms)</span>
                  </div>
                </div>

                {/* ユーティリティボタン群 */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Center
                  </button>

                  {/* Tracer Color Selector */}
                  <div className="col-span-2 flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase font-sans">Tracer Color</span>
                    <div className="grid grid-cols-5 gap-1">
                      <button
                        onClick={() => setTracerColor('green')}
                        className={`w-full aspect-square rounded-md transition-all border-2 ${
                          tracerColor === 'green' ? 'border-emerald-500 scale-110 shadow-sm' : 'border-transparent hover:border-emerald-200'
                        }`}
                        style={{ backgroundColor: '#10b981' }}
                      />
                      <button
                        onClick={() => setTracerColor('blue')}
                        className={`w-full aspect-square rounded-md transition-all border-2 ${
                          tracerColor === 'blue' ? 'border-blue-500 scale-110 shadow-sm' : 'border-transparent hover:border-blue-200'
                        }`}
                        style={{ backgroundColor: '#3b82f6' }}
                      />
                      <button
                        onClick={() => setTracerColor('red')}
                        className={`w-full aspect-square rounded-md transition-all border-2 ${
                          tracerColor === 'red' ? 'border-red-500 scale-110 shadow-sm' : 'border-transparent hover:border-red-200'
                        }`}
                        style={{ backgroundColor: '#ef4444' }}
                      />
                      <button
                        onClick={() => setTracerColor('gray')}
                        className={`w-full aspect-square rounded-md transition-all border-2 ${
                          tracerColor === 'gray' ? 'border-slate-500 scale-110 shadow-sm' : 'border-transparent hover:border-slate-200'
                        }`}
                        style={{ backgroundColor: '#64748b' }}
                      />
                      <button
                        onClick={() => setTracerColor('none')}
                        className={`w-full aspect-square flex items-center justify-center rounded-md transition-all border-2 bg-white ${
                          tracerColor === 'none' ? 'border-slate-500 scale-110 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 「今のところのログ」 (Current Game Logs) */}
                <div className="flex flex-col gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 animate-pulse">
                      <Scroll className="w-4 h-4 text-emerald-600" />
                      今のところのログ (累積履歴)
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={exportCumulativeLogs}
                        className="px-2.5 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[11px] font-medium transition-colors flex items-center gap-1 shadow-sm"
                        title="ログをJSONとしてダウンロードします"
                      >
                        <Download className="w-3 h-3" />
                        書き出し
                      </button>
                      <button
                        onClick={clearCumulativeLogs}
                        className="px-2.5 py-1 bg-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:bg-rose-200 rounded text-[11px] font-medium transition-colors shadow-sm"
                      >
                        クリア
                      </button>
                    </div>
                  </div>
                  <div 
                    ref={cumulativeLogsContainerRef}
                    className="w-full max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-slate-900 p-2.5 font-mono text-[11px] text-slate-300 leading-relaxed flex flex-col gap-1 shadow-inner scrollbar-thin"
                  >
                    {cumulativeLogs.length === 0 ? (
                      <div className="text-slate-500 text-center py-4 italic">戦闘やイベントのログはありません</div>
                    ) : (
                      cumulativeLogs.map((log) => {
                        let typeColor = 'text-slate-400';
                        if (log.type === 'combat') typeColor = 'text-amber-400';
                        else if (log.type === 'damage') typeColor = 'text-rose-400';
                        else if (log.type === 'event') typeColor = 'text-cyan-400';
                        else if (log.type === 'system') typeColor = 'text-emerald-400';
                        
                        return (
                          <div key={log.id} className="border-b border-slate-800/60 pb-1 last:border-0 text-left">
                            <span className="text-[9px] text-slate-500 mr-1.5">[{log.timestamp}]</span>
                            <span className={`${typeColor} font-semibold mr-1.5`}>[{log.type.toUpperCase()}]</span>
                            <span className="text-slate-200">{log.message}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 text-left">
                    ※ゲーム中の全ての戦闘・イベント・会話等の累積ログが自動で保存されます。エンディング到達時などにこのログを書き出して利用できます。
                  </div>
                </div>
              </div>
            )}

            {activeMenuTab === 'status' && (
              <div className="flex flex-col gap-4 animate-in fade-in">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    基本ステータス
                  </h4>
                  <div className="flex gap-4 items-center">
                    <HeroGraphic scene={sceneRef.current} displayMode={heroState.displayMode} />
                    <div className="flex-1 grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>レベル</span>
                        <span className="font-bold text-slate-900">{heroState.level}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>経験値</span>
                        <span className="font-bold text-slate-900">{heroState.exp} / {heroState.requiredExp}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>HP</span>
                        <span className="font-bold text-slate-900">{heroState.hp} / {heroState.maxHp}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>攻撃力</span>
                        <span className="font-bold text-slate-900">
                          {heroState.baseAttack}
                          {heroState.attack > (heroState.baseAttack || 0) && <span className="text-red-500 text-xs ml-1">+{heroState.attack - (heroState.baseAttack || 0)}</span>}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>防御力</span>
                        <span className="font-bold text-slate-900">
                          {heroState.baseDefense}
                          {heroState.defense > (heroState.baseDefense || 0) && <span className="text-blue-500 text-xs ml-1">+{heroState.defense - (heroState.baseDefense || 0)}</span>}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-sky-600" />
                    現在の装備
                  </h4>
                  <div className="space-y-2">
                    {[
                      { id: 'weapon', label: '武器', icon: '⚔️', eqId: heroState.equippedWeaponId },
                      { id: 'armor', label: '防具', icon: '🛡️', eqId: heroState.equippedArmorId },
                      { id: 'accessory', label: '装飾', icon: '💍', eqId: heroState.equippedAccessoryId }
                    ].map(slot => {
                      const eq = customItems.find(it => it.id === slot.eqId);
                      return (
                        <div key={slot.id} className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-500 ml-1">{slot.label}</span>
                          {eq ? (
                            <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-sm">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl">{eq.chestGraphic || slot.icon}</span>
                                <div>
                                  <div className="font-bold text-slate-800">{eq.name}</div>
                                  <div className="text-[10px] text-slate-500 flex flex-wrap gap-1 font-bold mt-0.5">
                                    {eq.attack !== undefined && eq.attack > 0 && <span className="text-red-500">攻+{eq.attack}</span>}
                                    {eq.defense !== undefined && eq.defense > 0 && <span className="text-blue-500">防+{eq.defense}</span>}
                                    {eq.attackElement && (
                                      <span className="text-[9px] px-1 bg-red-50 text-red-600 border border-red-200 rounded">
                                        攻:{{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[eq.attackElement] || eq.attackElement}
                                      </span>
                                    )}
                                    {eq.defenseElement && (
                                      <span className="text-[9px] px-1 bg-blue-50 text-blue-600 border border-blue-200 rounded">
                                        防:{{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[eq.defenseElement] || eq.defenseElement}
                                      </span>
                                    )}
                                    {eq.attackElement && eq.attackElementEnchantValue !== undefined && eq.attackElementEnchantValue > 0 && (
                                      <span className="text-[9px] px-1 bg-amber-50 text-amber-700 border border-amber-200 rounded font-extrabold" title={`敵が${{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[eq.attackElement] || eq.attackElement}属性の時に攻撃力+${eq.attackElementEnchantValue}`}>
                                        付与攻:{{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[eq.attackElement] || eq.attackElement}+{eq.attackElementEnchantValue}
                                      </span>
                                    )}
                                    {eq.defenseElement && eq.defenseElementEnchantValue !== undefined && eq.defenseElementEnchantValue > 0 && (
                                      <span className="text-[9px] px-1 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded font-extrabold" title={`敵が${{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[eq.defenseElement] || eq.defenseElement}属性の時に防御力+${eq.defenseElementEnchantValue}`}>
                                        付与防:{{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[eq.defenseElement] || eq.defenseElement}+{eq.defenseElementEnchantValue}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  if (sceneRef.current) sceneRef.current.equipItem(null, slot.id as any);
                                }}
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold border border-slate-300 transition-colors"
                              >
                                外す
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                               <span className="text-xl opacity-30 grayscale">{slot.icon}</span>
                               <span className="text-slate-400 italic text-xs">未装備</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-indigo-600" />
                      アイテムボックス
                    </span>
                    <span className="text-xs font-normal text-slate-500 font-mono">
                      {heroState.acquiredItems?.length || 0} 個
                    </span>
                  </h4>
                  
                  {heroState.acquiredItems && heroState.acquiredItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {heroState.acquiredItems.map((itemId) => {
                        const item = customItems.find(it => it.id === itemId);
                        if (!item) return null;
                        const isEquipped = heroState.equippedWeaponId === itemId || heroState.equippedArmorId === itemId || heroState.equippedAccessoryId === itemId;
                        const isEquipment = item.type === 'equipment';
                        const slot = item.equipmentType || 'weapon';
                        const slotLabels = { weapon: '武器', armor: '防具', accessory: '装飾' };

                        return (
                          <div 
                            key={itemId}
                            className={`flex justify-between items-center p-2 rounded-lg border text-xs transition-all ${
                              isEquipped 
                                ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <div className="relative flex-shrink-0 w-8 h-8 bg-slate-100 rounded flex items-center justify-center border border-slate-200">
                                <span className="text-lg">{item.chestGraphic || '🎁'}</span>
                                {isEquipped && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full border border-white flex items-center justify-center shadow-sm">
                                    E
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-800 truncate flex items-center gap-1">
                                  {item.name}
                                  {isEquipment && <span className="text-[9px] text-slate-500 font-normal">[{slotLabels[slot]}]</span>}
                                  {isEquipped && <span className="text-[9px] text-indigo-600 font-extrabold">[E]</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {item.description || '説明なし'}
                                </div>
                                <div className="text-[10px] flex gap-1.5 mt-0.5 font-bold flex-wrap">
                                  {item.attack !== undefined && item.attack > 0 && <span className="text-red-500">攻+{item.attack}</span>}
                                  {item.defense !== undefined && item.defense > 0 && <span className="text-blue-500">防+{item.defense}</span>}
                                  {item.attackElement && (
                                    <span className="text-[9px] px-1 bg-red-50 text-red-600 rounded border border-red-100 font-extrabold">
                                      {{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[item.attackElement] || item.attackElement}攻
                                    </span>
                                  )}
                                  {item.defenseElement && (
                                    <span className="text-[9px] px-1 bg-blue-50 text-blue-600 rounded border border-blue-100 font-extrabold">
                                      {{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[item.defenseElement] || item.defenseElement}防
                                    </span>
                                  )}
                                  {item.attackElement && item.attackElementEnchantValue !== undefined && item.attackElementEnchantValue > 0 && (
                                    <span className="text-[9px] px-1 bg-amber-50 text-amber-700 rounded border border-amber-100 font-extrabold" title={`敵が${{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[item.attackElement] || item.attackElement}属性の時に攻撃力+${item.attackElementEnchantValue}`}>
                                      付与攻:{{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[item.attackElement] || item.attackElement}+{item.attackElementEnchantValue}
                                    </span>
                                  )}
                                  {item.defenseElement && item.defenseElementEnchantValue !== undefined && item.defenseElementEnchantValue > 0 && (
                                    <span className="text-[9px] px-1 bg-cyan-50 text-cyan-700 rounded border border-cyan-100 font-extrabold" title={`敵が${{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[item.defenseElement] || item.defenseElement}属性の時に防御力+${item.defenseElementEnchantValue}`}>
                                      付与防:{{ fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' }[item.defenseElement] || item.defenseElement}+{item.defenseElementEnchantValue}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {isEquipment && (
                              <button
                                onClick={() => {
                                  if (sceneRef.current) {
                                    if (isEquipped) {
                                      sceneRef.current.equipItem(null, slot);
                                    } else {
                                      sceneRef.current.equipItem(itemId, slot);
                                    }
                                  }
                                }}
                                className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors flex-shrink-0 ml-2 ${
                                  isEquipped
                                    ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                    : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-sm'
                                }`}
                              >
                                {isEquipped ? '外す' : '装備'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-400 text-center text-xs">
                      アイテムボックスは空です。
                    </div>
                  )}
                </div>

                {/* スプライト生成ボタンをこちらへ移動 */}
                <button
                  onClick={openSpritesheetModal}
                  className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-bold transition-all shadow-sm w-full mt-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  スプライトシートを表示 (Sprites)
                </button>
              </div>
            )}

            {activeMenuTab === 'behavior' && (
              <div className="flex flex-col gap-5 animate-in fade-in">
                <div className="text-sm text-slate-600 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  自動行動時の行動指針をセットします。新しい指針は冒険やアイテムで獲得できます。
                </div>

                {/* 移動指針 */}
                <div className="flex flex-col gap-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Move className="w-4 h-4 text-emerald-600" />
                    非戦闘時の移動指針
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <select
                      value={movementBehavior}
                      onChange={(e) => setMovementBehavior(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none font-bold shadow-sm"
                    >
                      {availableMovementBehaviors.map(b => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1 pl-1">
                      {availableMovementBehaviors.find(b => b.id === movementBehavior)?.description}
                    </p>
                  </div>
                </div>

                {/* 戦闘指針 */}
                <div className="flex flex-col gap-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Sword className="w-4 h-4 text-rose-600" />
                    戦闘時の行動指針
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <select
                      value={combatBehavior}
                      onChange={(e) => setCombatBehavior(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2.5 outline-none font-bold shadow-sm"
                    >
                      {availableCombatBehaviors.map(b => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1 pl-1">
                      {availableCombatBehaviors.find(b => b.id === combatBehavior)?.description}
                    </p>
                  </div>
                </div>

                {/* メッセージ処理 */}
                <div className="flex flex-col gap-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    メッセージ処理の行動指針
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600">クリック待ちの設定</label>
                    <select
                      value={messageWaitMode}
                      onChange={(e) => setMessageWaitMode(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold shadow-sm"
                    >
                      <option value="item_and_event">アイテムゲット、イベント発生</option>
                      <option value="event_only">イベント発生のみ</option>
                      <option value="none">クリック待ちなし</option>
                    </select>
                    
                    <label className="text-xs font-bold text-slate-600 mt-2">自動で次に進むまでの秒数: {messageAutoAdvanceSeconds}秒</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      value={messageAutoAdvanceSeconds}
                      onChange={(e) => setMessageAutoAdvanceSeconds(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>

                {/* ゴール指針 */}
                <div className="flex flex-col gap-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    アイテム・ゴール発見時の行動指針
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <select
                      value={goalBehavior}
                      onChange={(e) => setGoalBehavior(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2.5 outline-none font-bold shadow-sm"
                    >
                      {availableGoalBehaviors.map(b => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1 pl-1">
                      {availableGoalBehaviors.find(b => b.id === goalBehavior)?.description}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center">
                  <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg transition-colors border border-emerald-200 shadow-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    新しいアセットを探す (未実装)
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      
      {/* スプライトシートの切り出し確認モーダル */}
      {showSpritesheetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-800">Generated 64x64px Spritesheet</h4>
                <p className="text-xs text-slate-500">4 Frames × 4 Directions (Total 256x256px)</p>
              </div>
              <button 
                onClick={() => setShowSpritesheetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center bg-slate-900 p-6 rounded-xl border border-slate-800 mb-4 overflow-auto">
              {spritesheetUrl ? (
                <div className="relative border border-slate-700 bg-slate-800/50 p-2 rounded">
                  <img 
                    src={spritesheetUrl} 
                    alt="Hero Spritesheet" 
                    className="w-64 h-64 select-none"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {/* ガイドグリッド */}
                  <div className="absolute inset-2 pointer-events-none grid grid-cols-4 grid-rows-4">
                    {Array.from({ length: 16 }).map((_, idx) => (
                      <div key={idx} className="border border-emerald-500/20" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-sm py-12">Loading texture...</div>
              )}
              <div className="grid grid-cols-4 w-64 text-center text-[10px] font-mono text-emerald-400 mt-2">
                <span>Frame 0</span>
                <span>Frame 1</span>
                <span>Frame 2</span>
                <span>Frame 3</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div><strong className="text-slate-800">Row 0:</strong> DOWN (Front walking animation)</div>
              <div><strong className="text-slate-800">Row 1:</strong> UP (Back walking animation)</div>
              <div><strong className="text-slate-800">Row 2:</strong> LEFT (Side walking animation)</div>
              <div><strong className="text-slate-800">Row 3:</strong> RIGHT (Side walking animation)</div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSpritesheetModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
