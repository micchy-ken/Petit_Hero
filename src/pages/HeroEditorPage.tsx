import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { HeroStatus } from '../types/HeroStatus';
import { fetchHeroStatusFromFirestore, saveHeroStatusToFirestore } from '../lib/dbService';

export default function HeroEditorPage() {
  const navigate = useNavigate();
  const [statusList, setStatusList] = useState<HeroStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchHeroStatusFromFirestore();
    setStatusList(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await saveHeroStatusToFirestore(statusList);
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage('エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = (index: number, updates: Partial<HeroStatus>) => {
    const newList = [...statusList];
    newList[index] = { ...newList[index], ...updates };
    setStatusList(newList);
  };

  const handleAddLevel = () => {
    const lastLevel = statusList.length > 0 ? statusList[statusList.length - 1] : {
      level: 0,
      maxHp: 10,
      attack: 2,
      defense: 0,
      requiredExp: 10
    };
    
    setStatusList([...statusList, {
      level: lastLevel.level + 1,
      maxHp: lastLevel.maxHp + 5,
      attack: lastLevel.attack + 2,
      defense: lastLevel.defense + 1,
      requiredExp: lastLevel.requiredExp + 50
    }]);
  };

  const handleRemoveLevel = (index: number) => {
    const newList = [...statusList];
    newList.splice(index, 1);
    // Reassign levels
    const reordered = newList.map((item, i) => ({
      ...item,
      level: i + 1
    }));
    setStatusList(reordered);
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
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/?settings=true')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            title="戻る"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">主人公ステータス設定</h1>
        </div>
        <div className="flex items-center gap-3">
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

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="font-bold text-xl text-slate-800">レベルごとのステータス</h2>
            <button
              onClick={handleAddLevel}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              レベル追加
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Lv</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">体力 (MaxHP)</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">攻撃力</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">防御力</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">次Lvへの必要経験値</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {statusList.map((status, index) => (
                  <tr key={status.level} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {status.level}
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="1"
                        value={status.maxHp}
                        onChange={e => handleUpdate(index, { maxHp: parseInt(e.target.value) || 1 })}
                        className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="0"
                        value={status.attack}
                        onChange={e => handleUpdate(index, { attack: parseInt(e.target.value) || 0 })}
                        className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="0"
                        value={status.defense}
                        onChange={e => handleUpdate(index, { defense: parseInt(e.target.value) || 0 })}
                        className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min="1"
                        value={status.requiredExp}
                        onChange={e => handleUpdate(index, { requiredExp: parseInt(e.target.value) || 1 })}
                        className="w-28 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {statusList.length > 1 && index === statusList.length - 1 && (
                        <button
                          onClick={() => handleRemoveLevel(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
