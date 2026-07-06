import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Loader2, Package, Sparkles, Check, HelpCircle } from 'lucide-react';
import { CustomItem, ItemType } from '../types/CustomItem';
import { fetchCustomItemsFromFirestore, saveCustomItemsToFirestore, fetchMagicDataFromFirestore } from '../lib/dbService';
import { MagicData } from '../types/MagicData';

const CHEST_GRAPHICS = [
  { key: '📦', label: 'ノーマル木箱 (📦)' },
  { key: '🎁', label: 'プレゼントボックス (🎁)' },
  { key: '💎', label: 'ジュエルチェスト (💎)' },
  { key: '⭐', label: 'スターチェスト (⭐)' },
  { key: '💀', label: 'シャドウチェスト (💀)' },
  { key: '🔔', label: 'ベルチェスト (🔔)' },
  { key: '💰', label: 'ゴールドチェスト (💰)' },
  { key: '👑', label: 'ロイヤルチェスト (👑)' },
];

const ITEM_TYPES: { value: ItemType; label: string; color: string; description: string }[] = [
  { value: 'equipment', label: '装備品', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', description: 'ヒーローに装備させて攻撃や防御を強化するアイテム' },
  { value: 'magic', label: '魔法', color: 'bg-purple-100 text-purple-700 border-purple-200', description: '特別な効果や攻撃を放つ呪文書・ルーン' },
  { value: 'move_asset', label: 'ムーブアセット', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', description: '移動能力や移動範囲に影響を与えるアセット' },
  { value: 'event', label: 'イベント', color: 'bg-amber-100 text-amber-700 border-amber-200', description: '特定のイベント発生条件や鍵となる重要アイテム' },
  { value: 'drop', label: 'ドロップ', color: 'bg-rose-100 text-rose-700 border-rose-200', description: 'モンスターを倒した時や探索時に手に入る素材' },
  { value: 'artifact', label: 'アーティファクト', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', description: '所持しているだけで永続的な恩恵をもたらす秘宝' },
];

export default function ItemEditorPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CustomItem[]>([]);
  const [magics, setMagics] = useState<MagicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [data, magicsData] = await Promise.all([
      fetchCustomItemsFromFirestore(),
      fetchMagicDataFromFirestore()
    ]);
    
    // Seed default items if empty
    if (data.length === 0) {
      const defaultItems: CustomItem[] = [
        { id: 'item_iron_sword', name: '鋼鉄の剣', type: 'equipment', chestGraphic: '📦', description: '攻撃力が上昇する頑丈な剣。' },
        { id: 'item_fire_scroll', name: 'ファイアボルト', type: 'magic', chestGraphic: '🔥', description: '炎の弾を撃ち出す古代の呪文書。', targetMagicId: 'magic_fire' },
        { id: 'item_ice_scroll', name: 'アイスブラスト', type: 'magic', chestGraphic: '❄️', description: '冷たい吹雪を巻き起こす呪文書。', targetMagicId: 'magic_ice' },
        { id: 'item_teleport_boots', name: 'エルメスの靴', type: 'move_asset', chestGraphic: '💎', description: 'すばやく移動できるようになる不思議な靴。' },
        { id: 'item_gate_key', name: '古びた真鍮の鍵', type: 'event', chestGraphic: '🗝️', description: 'ゲートを開くために必要な古い鍵。' },
      ];
      setItems(defaultItems);
    } else {
      setItems(data);
    }
    setMagics(magicsData);
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await saveCustomItemsToFirestore(items);
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage('エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = () => {
    const newItem: CustomItem = {
      id: `item_${Date.now()}`,
      name: '新規アイテム',
      type: 'equipment',
      chestGraphic: '📦',
      description: 'アイテムの説明文。'
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof CustomItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (window.confirm('このアイテムを削除してもよろしいですか？')) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/?settings=true')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            title="戻る"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">アイテムエディター</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 animate-in fade-in zoom-in-95">
              <Check className="w-4 h-4" />
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">アイテムの管理と登録</h2>
            <p className="text-xs text-slate-500 mt-1">ここで作成したアイテムをマップ上に配置して、勇者に拾わせることができます。</p>
          </div>
          <button
            onClick={addItem}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            新規アイテム追加
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500 flex flex-col items-center justify-center">
            <Package className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="font-bold text-slate-700 text-lg">アイテムがありません</h3>
            <p className="text-sm text-slate-400 mt-2">「新規アイテム追加」ボタンから最初のアイテムを作成しましょう。</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {items.map((item, index) => {
              const currentType = ITEM_TYPES.find(t => t.value === item.type) || ITEM_TYPES[0];
              return (
                <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4 hover:border-slate-300 transition-all">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {item.id}
                      </span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        className="font-bold text-lg text-slate-800 border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none px-2 py-0.5 flex-1 md:flex-initial transition-colors min-w-[200px]"
                        placeholder="アイテム名"
                        title="アイテム名"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all self-end md:self-auto"
                      title="アイテム削除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* 宝箱のグラフィック */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">宝箱のグラフィック</label>
                      <div className="flex gap-2">
                        <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-2xl shadow-inner">
                          {item.chestGraphic || '📦'}
                        </div>
                        <select
                          value={item.chestGraphic || '📦'}
                          onChange={(e) => updateItem(index, 'chestGraphic', e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        >
                          {CHEST_GRAPHICS.map((g) => (
                            <option key={g.key} value={g.key}>{g.label}</option>
                          ))}
                          {/* 自由な文字・絵文字を入力できるように追加用のプレースホルダや直接入力項目を足すとさらに親切 */}
                        </select>
                      </div>
                    </div>

                    {/* 種類 */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">種類 (Type)</label>
                      <select
                        value={item.type}
                        onChange={(e) => updateItem(index, 'type', e.target.value as ItemType)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-medium"
                      >
                        {ITEM_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* 説明文 */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">説明 (Description)</label>
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm resize-y min-h-[38px]"
                        placeholder="拾ったときのメッセージや効果の説明"
                        rows={1}
                      />
                    </div>

                    {item.type === 'equipment' && (
                      <div className="md:col-span-12 mt-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex flex-wrap lg:flex-nowrap items-end gap-2">
                        <div className="w-24 min-w-[90px]">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1">種類 (Type)</label>
                          <select
                            value={item.equipmentType || 'weapon'}
                            onChange={(e) => updateItem(index, 'equipmentType', e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          >
                            <option value="weapon">武器 (Weapon)</option>
                            <option value="armor">防具 (Armor)</option>
                            <option value="accessory">アクセサリー (Accessory)</option>
                          </select>
                        </div>
                        
                        <div className="w-14 min-w-[50px]">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1">攻撃 (Atk)</label>
                          <input
                            type="number"
                            value={item.attack !== undefined ? item.attack : 0}
                            onChange={(e) => updateItem(index, 'attack', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            min="0"
                          />
                        </div>
                        
                        <div className="w-20 min-w-[80px]">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1">攻撃属性</label>
                          <select
                            value={item.attackElement || ''}
                            onChange={(e) => updateItem(index, 'attackElement', e.target.value)}
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
                        
                        <div className="w-16 min-w-[60px]">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1" title="属性を持つ敵に対する攻撃ボーナス">攻ボーナス</label>
                          <input
                            type="number"
                            value={item.attackElementEnchantValue !== undefined ? item.attackElementEnchantValue : 0}
                            onChange={(e) => updateItem(index, 'attackElementEnchantValue', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                            min="0"
                            disabled={!item.attackElement}
                            placeholder="0"
                          />
                        </div>

                        <div className="w-14 min-w-[50px]">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1">防御 (Def)</label>
                          <input
                            type="number"
                            value={item.defense !== undefined ? item.defense : 0}
                            onChange={(e) => updateItem(index, 'defense', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                            min="0"
                          />
                        </div>

                        <div className="w-20 min-w-[80px]">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1">防御属性</label>
                          <select
                            value={item.defenseElement || ''}
                            onChange={(e) => updateItem(index, 'defenseElement', e.target.value)}
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

                        <div className="w-16 min-w-[60px]">
                          <label className="block text-[11px] font-bold text-indigo-700 mb-1" title="属性を持つ敵に対する防御ボーナス">防ボーナス</label>
                          <input
                            type="number"
                            value={item.defenseElementEnchantValue !== undefined ? item.defenseElementEnchantValue : 0}
                            onChange={(e) => updateItem(index, 'defenseElementEnchantValue', parseInt(e.target.value) || 0)}
                            className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
                            min="0"
                            disabled={!item.defenseElement}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* プレビュー・お助け情報 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentType.color}`}>
                        {currentType.label}
                      </span>
                      <span>{currentType.description}</span>
                    </div>
                    <div className="font-mono text-[10px] opacity-60">
                      ID: {item.id}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
