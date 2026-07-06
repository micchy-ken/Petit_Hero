import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Ghost, Loader2 } from 'lucide-react';
import { EnemyAssets as initialEnemyAssets, BossAssets as initialBossAssets, EnemyAsset } from '../data/EnemyAssets';
import { fetchEnemyAssetsFromFirestore, saveEnemyAssetsToFirestore } from '../lib/dbService';

type BgMode = 'text-black' | 'stone-gray' | 'color';

function EnemyGraphicPreview({ bgMode, enemyId }: { bgMode: BgMode, enemyId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.imageSmoothingEnabled = false;
    
    let frame = 0;
    const frames = 4;
    const frameWidth = 64;
    const frameHeight = 64;
    let animationId: number;
    let lastTime = 0;
    
    const draw = (time: number) => {
      if (time - lastTime > 150) { // アニメーション速度
        frame = (frame + 1) % frames;
        lastTime = time;
        
        ctx.clearRect(0, 0, frameWidth, frameHeight);
        
        // 1. テキストモード
        if (bgMode === 'text-black') {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, frameWidth, frameHeight);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 32px "Inter", sans-serif';
          
          let char = '敵';
          if (enemyId === 'color_bat') char = '蝙';
          else if (enemyId === 'color_goblin') char = 'ゴ';
          else if (enemyId === 'text_boss') char = '魔';
          else if (enemyId === 'text_teki') char = '敵';
          
          ctx.fillText(char, frameWidth / 2, frameHeight / 2);
        } else {
          // 2. グラフィックモード (カラー or グレイスケール)
          const isGray = bgMode === 'stone-gray';
          ctx.fillStyle = isGray ? '#f1f5f9' : '#ecfdf5';
          ctx.fillRect(0, 0, frameWidth, frameHeight);
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = 32;
          tempCanvas.height = 32;
          const tCtx = tempCanvas.getContext('2d')!;
          tCtx.imageSmoothingEnabled = false;
          
          const gp = (x: number, y: number, w: number, h: number, color: string) => {
            tCtx.fillStyle = color;
            tCtx.fillRect(x, y, w, h);
          };

          // ----------------- コウモリ -----------------
          if (enemyId === 'color_bat') {
            const cBody = isGray ? '#666666' : '#2e1065';
            const cWing = isGray ? '#444444' : '#4c1d95';
            const cWingDark = isGray ? '#222222' : '#1e1b4b';
            const cEye = isGray ? '#ffffff' : '#f43f5e';
            const cMouth = '#ffffff';

            tCtx.save();
            const bounceY = Math.sin((frame / frames) * Math.PI * 2) * 2;
            tCtx.translate(0, bounceY);

            // 影
            tCtx.fillStyle = isGray ? 'rgba(0, 0, 0, 0.2)' : 'rgba(15, 23, 42, 0.15)';
            tCtx.beginPath();
            tCtx.ellipse(16, 28, 5 - Math.abs(bounceY) * 0.3, 1.5, 0, 0, Math.PI * 2);
            tCtx.fill();

            // 耳
            gp(13, 9, 2, 3, cBody);
            gp(17, 9, 2, 3, cBody);
            // 頭/体
            gp(12, 11, 8, 8, cBody);
            gp(13, 19, 6, 2, cBody);

            // 翼 (羽ばたき)
            if (frame === 0) {
              gp(5, 11, 7, 3, cWing); gp(20, 11, 7, 3, cWing);
              gp(3, 13, 9, 2, cWingDark); gp(20, 13, 9, 2, cWingDark);
              gp(2, 15, 6, 2, cWingDark); gp(24, 15, 6, 2, cWingDark);
            } else if (frame === 1 || frame === 3) {
              gp(6, 8, 6, 3, cWing); gp(20, 8, 6, 3, cWing);
              gp(8, 11, 4, 4, cWingDark); gp(20, 11, 4, 4, cWingDark);
              gp(10, 15, 2, 3, cWingDark); gp(20, 15, 2, 3, cWingDark);
            } else if (frame === 2) {
              gp(10, 13, 2, 7, cWing); gp(20, 13, 2, 7, cWing);
              gp(9, 14, 1, 5, cWingDark); gp(22, 14, 1, 5, cWingDark);
            }

            // 目 / キバ
            gp(14, 13, 1, 2, cEye); gp(17, 13, 1, 2, cEye);
            gp(15, 16, 2, 1, cBody);
            gp(15, 17, 1, 1, cMouth); gp(16, 17, 1, 1, cMouth);

            tCtx.restore();

          // ----------------- ゴブリン -----------------
          } else if (enemyId === 'color_goblin') {
            const cSkin = isGray ? '#777777' : '#16a34a';
            const cSkinDark = isGray ? '#444444' : '#14532d';
            const cCloth = isGray ? '#555555' : '#854d0e';
            const cClothDark = isGray ? '#333333' : '#451a03';
            const cWeapon = isGray ? '#888888' : '#71717a';
            const cEye = isGray ? '#ffffff' : '#facc15';
            const cHair = isGray ? '#666666' : '#27272a';

            tCtx.save();
            const isStep1 = frame === 1;
            const isStep2 = frame === 3;
            const bobY = (isStep1 || isStep2) ? -1 : 0;
            const legOffset = isStep1 ? 1 : (isStep2 ? -1 : 0);

            tCtx.translate(0, bobY);

            // 影
            tCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            tCtx.beginPath();
            tCtx.ellipse(16, 28, 6, 2, 0, 0, Math.PI * 2);
            tCtx.fill();

            // 正面向き
            gp(7, 13, 3, 2, cSkinDark); gp(22, 13, 3, 2, cSkinDark);
            gp(10, 10, 12, 9, cSkin);
            gp(11, 9, 10, 1, cHair); gp(14, 7, 4, 2, cHair);
            gp(12, 13, 2, 2, cEye); gp(18, 13, 2, 2, cEye);
            gp(13, 14, 1, 1, '#000000'); gp(18, 14, 1, 1, '#000000');
            gp(14, 16, 4, 1, cSkinDark); gp(14, 17, 1, 1, '#ffffff'); gp(17, 17, 1, 1, '#ffffff');
            gp(10, 19, 12, 6, cCloth); gp(12, 25, 8, 2, cClothDark);
            gp(11, 25 + (legOffset > 0 ? -1 : 0), 2, 4, cSkin); gp(19, 25 + (legOffset < 0 ? -1 : 0), 2, 4, cSkin);

            const wpY = 17 + (isStep2 ? -1 : 0);
            gp(23, wpY, 2, 6, cWeapon); gp(22, wpY - 2, 4, 3, cWeapon); gp(21, wpY + 4, 2, 2, cClothDark);

            tCtx.restore();

          // ----------------- スライム系 -----------------
          } else {
            const palette = {
              highlight: '#a5f3fc', bodyHi: '#38bdf8', body: '#0284c7', bodyDark: '#0369a1',
              shadow: '#0c4a6e', eye: '#ffffff', pupil: '#0f172a', mouth: '#0f172a'
            };

            if (isGray) {
              palette.highlight = '#dddddd'; palette.bodyHi = '#aaaaaa'; palette.body = '#888888';
              palette.bodyDark = '#666666'; palette.shadow = '#444444';
            } else if (enemyId === 'color_slime_green') {
              palette.highlight = '#bbf7d0'; palette.bodyHi = '#4ade80'; palette.body = '#22c55e';
              palette.bodyDark = '#16a34a'; palette.shadow = '#14532d';
            } else if (enemyId === 'color_slime_red') {
              palette.highlight = '#fecdd3'; palette.bodyHi = '#fb7185'; palette.body = '#f43f5e';
              palette.bodyDark = '#e11d48'; palette.shadow = '#881337';
            }

            tCtx.save();
            let scaleX = 1; let scaleY = 1; let offsetY = 0;
            if (frame === 1) { scaleX = 1.2; scaleY = 0.8; offsetY = 3; }
            else if (frame === 2) { scaleX = 0.8; scaleY = 1.2; offsetY = -1; }
            else if (frame === 3) { scaleX = 0.9; scaleY = 1.1; offsetY = -4; }

            tCtx.translate(16, 26);
            tCtx.scale(scaleX, scaleY);
            tCtx.translate(-16, -26 + offsetY);

            // 影
            if (frame !== 3) {
              tCtx.fillStyle = 'rgba(15, 23, 42, 0.4)';
              tCtx.beginPath(); tCtx.ellipse(16, 27, 8, 2, 0, 0, Math.PI * 2); tCtx.fill();
            } else {
              tCtx.fillStyle = 'rgba(15, 23, 42, 0.2)';
              tCtx.beginPath(); tCtx.ellipse(16, 29, 5, 1, 0, 0, Math.PI * 2); tCtx.fill();
            }

            gp(12, 14, 8, 12, palette.shadow); gp(10, 16, 12, 10, palette.shadow); gp(8, 19, 16, 7, palette.shadow);
            gp(13, 15, 6, 10, palette.bodyDark); gp(11, 17, 10, 8, palette.bodyDark); gp(9, 20, 14, 5, palette.bodyDark);
            gp(14, 16, 4, 8, palette.body); gp(12, 18, 8, 6, palette.body); gp(10, 21, 12, 3, palette.body);
            gp(15, 17, 2, 4, palette.bodyHi); gp(13, 19, 4, 2, palette.bodyHi);
            gp(13, 17, 1, 2, palette.highlight); gp(11, 20, 1, 1, palette.highlight);
            gp(11, 20, 2, 3, palette.eye); gp(12, 21, 1, 2, palette.pupil);
            gp(19, 20, 2, 3, palette.eye); gp(19, 21, 1, 2, palette.pupil);
            gp(15, 23, 2, 1, palette.mouth);

            tCtx.restore();
          }
          
          ctx.drawImage(tempCanvas, 0, 0, 32, 32, 0, 0, 64, 64);
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    animationId = requestAnimationFrame(draw);
    
    return () => cancelAnimationFrame(animationId);
  }, [bgMode, enemyId]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
      <canvas ref={canvasRef} width={64} height={64} className="w-32 h-32 image-rendering-pixelated rounded-lg shadow-sm" />
      <span className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-widest">プレビュー</span>
    </div>
  );
}

export default function EnemyEditorPage() {
  const navigate = useNavigate();
  const [enemyAssets, setEnemyAssets] = useState(initialEnemyAssets);
  const [bossAssets, setBossAssets] = useState(initialBossAssets);

  const [selectedType, setSelectedType] = useState<'enemy' | 'boss'>('enemy');
  const [selectedBgMode, setSelectedBgMode] = useState<BgMode>('color');
  const [selectedEnemyId, setSelectedEnemyId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load enemy assets from Firestore on mount
  useEffect(() => {
    async function loadAssets() {
      try {
        const assets = await fetchEnemyAssetsFromFirestore();
        if (assets) {
          setEnemyAssets(assets.enemyAssets);
          setBossAssets(assets.bossAssets);
        }
      } catch (e) {
        console.error('Failed to load assets from Firestore:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAssets();
  }, []);

  // Initialize selected enemy
  useEffect(() => {
    const assets = selectedType === 'enemy' ? enemyAssets : bossAssets;
    const list = assets[selectedBgMode];
    if (list && list.length > 0) {
      if (!list.find(e => e.id === selectedEnemyId)) {
        setSelectedEnemyId(list[0].id);
      }
    } else {
      setSelectedEnemyId('');
    }
  }, [selectedType, selectedBgMode, enemyAssets, bossAssets, selectedEnemyId]);

  const currentList = selectedType === 'enemy' ? enemyAssets[selectedBgMode] : bossAssets[selectedBgMode];
  const currentEnemy = currentList?.find(e => e.id === selectedEnemyId);

  const handleUpdate = (updates: Partial<EnemyAsset>) => {
    if (!currentEnemy) return;
    
    const setAssets = selectedType === 'enemy' ? setEnemyAssets : setBossAssets;
    
    setAssets(prev => {
      const newList = prev[selectedBgMode].map(e => 
        e.id === currentEnemy.id ? { ...e, ...updates } : e
      );
      return { ...prev, [selectedBgMode]: newList };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveEnemyAssetsToFirestore(enemyAssets, bossAssets);
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e: any) {
      console.error(e);
      alert('保存に失敗しました: ' + e.message);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-slate-500">データを読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/?settings=true')}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Ghost className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg text-slate-900">エネミーエディター</h1>
            </div>
          </div>
          
          {saveMessage && (
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              キャラクタータイプ
            </label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as 'enemy' | 'boss')}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="enemy">通常モンスター</option>
              <option value="boss">ボス</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              対応マップ
            </label>
            <select
              value={selectedBgMode}
              onChange={e => setSelectedBgMode(e.target.value as BgMode)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="text-black">テキストモード</option>
              <option value="stone-gray">石ころモード</option>
              <option value="color">カラー(通常)</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              キャラクター選択
            </label>
            <select
              value={selectedEnemyId}
              onChange={e => setSelectedEnemyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {currentList?.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>

        {currentEnemy ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-8">
            <div className="flex-shrink-0">
              <EnemyGraphicPreview bgMode={selectedBgMode} enemyId={selectedEnemyId} />
            </div>
            <div className="flex-1 flex flex-col gap-5">
              <h2 className="font-bold text-xl text-slate-800 border-b border-slate-100 pb-3 mb-2">
                ステータス編集
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">名前</label>
                <input
                  type="text"
                  value={currentEnemy.name}
                  onChange={e => handleUpdate({ name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">画像設定 (今後の実装)</label>
                <input
                  type="text"
                  value={currentEnemy.image || ''}
                  onChange={e => handleUpdate({ image: e.target.value })}
                  placeholder="未設定"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">HP (体力)</label>
                <input
                  type="number"
                  min="1"
                  value={currentEnemy.hp}
                  onChange={e => handleUpdate({ hp: parseInt(e.target.value) || 1 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">攻撃力</label>
                <input
                  type="number"
                  min="0"
                  value={currentEnemy.attack}
                  onChange={e => handleUpdate({ attack: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">防御力</label>
                <input
                  type="number"
                  min="0"
                  value={currentEnemy.defense !== undefined ? currentEnemy.defense : 0}
                  onChange={e => handleUpdate({ defense: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">獲得経験値</label>
                <input
                  type="number"
                  min="0"
                  value={currentEnemy.exp !== undefined ? currentEnemy.exp : 0}
                  onChange={e => handleUpdate({ exp: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">移動スピード (ms/grid)</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={currentEnemy.speed}
                  onChange={e => handleUpdate({ speed: parseInt(e.target.value) || 500 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">値が小さいほど高速に動きます。</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">行動パターン</label>
                <select
                  value={currentEnemy.behavior}
                  onChange={e => handleUpdate({ behavior: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="seek">勇者を追尾する</option>
                  <option value="random">ランダムに徘徊する</option>
                  <option value="idle">待機 (動かない)</option>
                </select>
              </div>

              <div className="sm:col-span-2 mt-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex flex-wrap sm:flex-nowrap items-end gap-2">
                <div className="flex-1 min-w-[80px]">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1">攻撃属性</label>
                  <select
                    value={currentEnemy.attackElement || ''}
                    onChange={e => handleUpdate({ attackElement: e.target.value })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="">無 (None)</option>
                    <option value="fire">火 (Fire)</option>
                    <option value="water">水 (Water)</option>
                    <option value="wind">風 (Wind)</option>
                    <option value="earth">地 (Earth)</option>
                    <option value="light">光 (Light)</option>
                    <option value="dark">闇 (Dark)</option>
                  </select>
                </div>
                
                <div className="w-20 min-w-[60px]">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1" title="攻撃属性付与ボーナス">付与攻</label>
                  <input
                    type="number"
                    min="0"
                    value={currentEnemy.attackElementEnchantValue !== undefined ? currentEnemy.attackElementEnchantValue : 0}
                    onChange={e => handleUpdate({ attackElementEnchantValue: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={!currentEnemy.attackElement}
                  />
                </div>

                <div className="flex-1 min-w-[80px]">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1">防御属性</label>
                  <select
                    value={currentEnemy.defenseElement || ''}
                    onChange={e => handleUpdate({ defenseElement: e.target.value })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="">無 (None)</option>
                    <option value="fire">火 (Fire)</option>
                    <option value="water">水 (Water)</option>
                    <option value="wind">風 (Wind)</option>
                    <option value="earth">地 (Earth)</option>
                    <option value="light">光 (Light)</option>
                    <option value="dark">闇 (Dark)</option>
                  </select>
                </div>

                <div className="w-20 min-w-[60px]">
                  <label className="block text-[11px] font-bold text-indigo-700 mb-1" title="防御属性付与ボーナス">付与防</label>
                  <input
                    type="number"
                    min="0"
                    value={currentEnemy.defenseElementEnchantValue !== undefined ? currentEnemy.defenseElementEnchantValue : 0}
                    onChange={e => handleUpdate({ defenseElementEnchantValue: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={!currentEnemy.defenseElement}
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-8 rounded-2xl text-center text-slate-400 border border-slate-200 border-dashed">
            キャラクターが見つかりません
          </div>
        )}
      </main>
    </div>
  );
}
