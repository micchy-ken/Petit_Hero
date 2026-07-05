import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Loader2, Sparkles, Check, Flame, Snowflake } from 'lucide-react';
import { MagicData } from '../types/MagicData';
import { fetchMagicDataFromFirestore, saveMagicDataToFirestore } from '../lib/dbService';

export default function MagicEditorPage() {
  const navigate = useNavigate();
  const [magics, setMagics] = useState<MagicData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchMagicDataFromFirestore();
    setMagics(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMagicDataToFirestore(magics);
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveMessage('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const addMagic = () => {
    const newMagic: MagicData = {
      id: `magic_${Date.now()}`,
      name: '新しい魔法',
      attribute: 'fire',
      power: 10,
      interval: 3,
      acquisitionType: 'item',
      acquisitionValue: 'item_fire_scroll'
    };
    setMagics([...magics, newMagic]);
  };

  const removeMagic = (id: string) => {
    setMagics(magics.filter(m => m.id !== id));
  };

  const updateMagic = (id: string, updates: Partial<MagicData>) => {
    setMagics(magics.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/?settings=true')}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-500" />
              マジックエディター
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {saveMessage && (
              <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> {saveMessage}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              保存
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {magics.map((magic) => (
            <div key={magic.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ID (変更不可)</label>
                    <input
                      type="text"
                      value={magic.id}
                      disabled
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">魔法名</label>
                    <input
                      type="text"
                      value={magic.name}
                      onChange={(e) => updateMagic(magic.id, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">属性</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={magic.attribute}
                        onChange={(e) => updateMagic(magic.id, { attribute: e.target.value as 'fire' | 'ice' })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="fire">火 (Fire)</option>
                        <option value="ice">氷 (Ice)</option>
                      </select>
                      {magic.attribute === 'fire' ? <Flame className="text-red-500 w-5 h-5" /> : <Snowflake className="text-blue-500 w-5 h-5" />}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">攻撃力</label>
                    <input
                      type="number"
                      value={magic.power}
                      onChange={(e) => updateMagic(magic.id, { power: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">インターバル (秒)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={magic.interval}
                      onChange={(e) => updateMagic(magic.id, { interval: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">習得方法</label>
                    <select
                      value={magic.acquisitionType}
                      onChange={(e) => updateMagic(magic.id, { acquisitionType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="item">アイテム入手時</option>
                      <option value="event">イベント到達時</option>
                      <option value="level">レベルアップ時</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {magic.acquisitionType === 'item' ? '対象アイテムID' : magic.acquisitionType === 'event' ? '対象イベントID' : '必要レベル'}
                    </label>
                    <input
                      type={magic.acquisitionType === 'level' ? "number" : "text"}
                      value={magic.acquisitionValue}
                      onChange={(e) => updateMagic(magic.id, { acquisitionValue: magic.acquisitionType === 'level' ? Number(e.target.value) : e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder={magic.acquisitionType === 'item' ? "例: item_fire_scroll" : magic.acquisitionType === 'event' ? "例: event_01" : "例: 5"}
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeMagic(magic.id)}
                  className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addMagic}
            className="w-full py-4 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl hover:border-purple-500 hover:text-purple-600 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            魔法を追加
          </button>
        </div>
      </div>
    </div>
  );
}
