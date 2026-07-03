import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Ghost, Loader2 } from 'lucide-react';
import { EnemyAssets as initialEnemyAssets, BossAssets as initialBossAssets, EnemyAsset } from '../data/EnemyAssets';

type BgMode = 'text-black' | 'stone-gray' | 'color';

function EnemyGraphicPreview({ bgMode }: { bgMode: BgMode }) {
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
      if (time - lastTime > 200) {
        frame = (frame + 1) % frames;
        lastTime = time;
        
        ctx.clearRect(0, 0, frameWidth, frameHeight);
        
        if (bgMode === 'text-black') {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, frameWidth, frameHeight);
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 40px "Inter", sans-serif';
          ctx.fillText('敵', frameWidth / 2, frameHeight / 2);
        } else if (bgMode === 'stone-gray') {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(0, 0, frameWidth, frameHeight);
          
          const tCtx = document.createElement('canvas').getContext('2d')!;
          tCtx.canvas.width = 32;
          tCtx.canvas.height = 32;
          tCtx.imageSmoothingEnabled = false;
          
          const gp = (x: number, y: number, w: number, h: number, color: string) => {
            tCtx.fillStyle = color;
            tCtx.fillRect(x, y, w, h);
          };
          
          let scaleX = 1;
          let scaleY = 1;
          let offsetY = 0;

          if (frame === 1) { scaleX = 1.2; scaleY = 0.8; offsetY = 3; }
          else if (frame === 2) { scaleX = 0.8; scaleY = 1.2; offsetY = -1; }
          else if (frame === 3) { scaleX = 0.9; scaleY = 1.1; offsetY = -4; }

          tCtx.translate(16, 26);
          tCtx.scale(scaleX, scaleY);
          tCtx.translate(-16, -26 + offsetY);

          if (frame !== 3) {
            tCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            tCtx.beginPath();
            tCtx.ellipse(16, 27, 8, 2, 0, 0, Math.PI * 2);
            tCtx.fill();
          } else {
            tCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            tCtx.beginPath();
            tCtx.ellipse(16, 29, 5, 1, 0, 0, Math.PI * 2);
            tCtx.fill();
          }

          gp(12, 14, 8, 12, '#444444'); gp(10, 16, 12, 10, '#444444'); gp(8, 19, 16, 7, '#444444');
          gp(13, 15, 6, 10, '#888888'); gp(11, 17, 10, 8, '#888888'); gp(9, 20, 14, 5, '#888888');
          gp(14, 16, 4, 8, '#dddddd'); gp(12, 18, 8, 6, '#dddddd'); gp(10, 21, 12, 3, '#dddddd');
          gp(12, 19, 1, 2, '#000000'); gp(19, 19, 1, 2, '#000000');
          gp(12, 19, 1, 1, '#ffffff'); gp(19, 19, 1, 1, '#ffffff');
          gp(15, 22, 2, 1, '#000000');
          
          ctx.drawImage(tCtx.canvas, 0, 0, 32, 32, 0, 0, 64, 64);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, frameWidth, frameHeight);
          
          const palette = {
            highlight: '#a5f3fc', bodyHi: '#38bdf8', body: '#0284c7', bodyDark: '#0369a1',
            shadow: '#0c4a6e', eye: '#ffffff', pupil: '#0f172a', mouth: '#0f172a'
          };
          const p = (x: number, y: number, w: number, h: number, color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
          };
          
          ctx.save();
          let scaleX = 1; let scaleY = 1; let offsetY = 0;
          if (frame === 1) { scaleX = 1.2; scaleY = 0.8; offsetY = 10; }
          else if (frame === 2) { scaleX = 0.8; scaleY = 1.2; offsetY = -4; }
          else if (frame === 3) { scaleX = 0.9; scaleY = 1.1; offsetY = -12; }

          ctx.translate(32, 50);
          ctx.scale(scaleX, scaleY);
          ctx.translate(-32, -50 + offsetY);

          if (frame !== 3) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
            ctx.beginPath(); ctx.ellipse(32, 52, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
            ctx.beginPath(); ctx.ellipse(32, 60, 10, 2, 0, 0, Math.PI * 2); ctx.fill();
          }

          p(24, 28, 16, 24, palette.shadow); p(20, 32, 24, 18, palette.shadow); p(16, 36, 32, 12, palette.shadow);
          p(25, 29, 14, 22, palette.bodyDark); p(21, 33, 22, 16, palette.bodyDark); p(17, 37, 30, 10, palette.bodyDark);
          p(26, 30, 12, 18, palette.body); p(22, 32, 18, 14, palette.body); p(19, 36, 26, 8, palette.body);
          p(27, 31, 8, 12, palette.bodyHi); p(24, 34, 12, 8, palette.bodyHi);
          p(26, 33, 4, 4, palette.highlight); p(31, 32, 2, 2, palette.highlight); p(22, 38, 2, 4, palette.highlight);
          p(22, 38, 4, 6, palette.eye); p(24, 40, 2, 4, palette.pupil);
          p(38, 38, 4, 6, palette.eye); p(38, 40, 2, 4, palette.pupil);
          p(30, 44, 4, 2, palette.mouth);
          ctx.restore();
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    animationId = requestAnimationFrame(draw);
    
    return () => cancelAnimationFrame(animationId);
  }, [bgMode]);

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

  const [isSaving, setIsSaving] = useState(false);

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
      const response = await fetch('/api/save-enemies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enemyAssets, bossAssets })
      });
      if (response.ok) {
        alert('Saved successfully!');
      } else {
        alert('Failed to save');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving enemies');
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
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
              <EnemyGraphicPreview bgMode={selectedBgMode} />
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
                  value={currentEnemy.defense ?? 0}
                  onChange={e => handleUpdate({ defense: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">攻撃方法</label>
                <select
                  value={currentEnemy.attackMethod || 'melee'}
                  onChange={e => handleUpdate({ attackMethod: e.target.value as 'melee' | 'fire' })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="melee">近接攻撃 (通常)</option>
                  <option value="fire">ファイア</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">入手経験値</label>
                <input
                  type="number"
                  min="0"
                  value={currentEnemy.exp ?? 2}
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
