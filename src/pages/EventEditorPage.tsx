import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, MessageSquare, Trash2, Loader2, Check, Play } from 'lucide-react';
import { PORTRAITS } from '../data/portraits';
import { CustomEvent, ConversationNode } from '../types/CustomEvent';
import { fetchCustomEventsFromFirestore, saveCustomEventsToFirestore } from '../lib/dbService';

export default function EventEditorPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CustomEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [previewEvent, setPreviewEvent] = useState<CustomEvent | null>(null);
  const [previewNodeIndex, setPreviewNodeIndex] = useState(0);

  const playEvent = (event: CustomEvent) => {
    if (event.nodes.length === 0) return;
    setPreviewEvent(event);
    setPreviewNodeIndex(0);
  };

  const nextPreviewNode = () => {
    if (!previewEvent) return;
    if (previewNodeIndex < previewEvent.nodes.length - 1) {
      setPreviewNodeIndex(previewNodeIndex + 1);
    } else {
      setPreviewEvent(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchCustomEventsFromFirestore();
    setEvents(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      await saveCustomEventsToFirestore(events);
      setSaveMessage('保存しました');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage('エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const addEvent = () => {
    const newEvent: CustomEvent = {
      id: `ev_${Date.now()}`,
      name: '新規会話イベント',
      type: 'conversation',
      nodes: [
        { id: `node_${Date.now()}`, speakerName: '村人', portraitId: 'villager', message: 'こんにちは！' }
      ]
    };
    setEvents([...events, newEvent]);
  };

  const updateEventName = (index: number, name: string) => {
    const newEvents = [...events];
    newEvents[index].name = name;
    setEvents(newEvents);
  };

  const removeEvent = (index: number) => {
    const newEvents = [...events];
    newEvents.splice(index, 1);
    setEvents(newEvents);
  };

  const addNode = (eventIndex: number) => {
    const newEvents = [...events];
    newEvents[eventIndex].nodes.push({
      id: `node_${Date.now()}`,
      speakerName: '主人公',
      portraitId: 'hero',
      message: '...'
    });
    setEvents(newEvents);
  };

  const updateNode = (eventIndex: number, nodeIndex: number, field: keyof ConversationNode, value: string) => {
    const newEvents = [...events];
    const updatedNode = {
      ...newEvents[eventIndex].nodes[nodeIndex],
      [field]: value
    };
    
    // 顔グラフィック変更時にデフォルト名前を自動設定
    if (field === 'portraitId') {
      if (value === 'hero') {
        updatedNode.speakerName = '主人公';
      } else if (value === 'villager') {
        updatedNode.speakerName = '村人';
      } else if (value === 'none') {
        updatedNode.speakerName = '';
      }
    }
    
    newEvents[eventIndex].nodes[nodeIndex] = updatedNode;
    setEvents(newEvents);
  };

  const removeNode = (eventIndex: number, nodeIndex: number) => {
    const newEvents = [...events];
    newEvents[eventIndex].nodes.splice(nodeIndex, 1);
    setEvents(newEvents);
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
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">イベントエディター (会話)</h1>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
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

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">アセット済み顔グラフィック</div>
          <div className="flex flex-wrap gap-4">
            {Object.entries(PORTRAITS).filter(([key, val]) => val !== '').map(([key, url]) => (
              <div key={key} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg p-2 pr-4 shadow-sm hover:shadow transition-shadow">
                <img src={url} alt={key} className="w-10 h-10 object-cover rounded-md border border-slate-200" />
                <div className="text-sm font-bold text-slate-700">
                  {key === 'hero' ? '主人公' : key === 'villager' ? '村人' : key}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-xl text-slate-800">会話イベント一覧</h2>
          <button
            onClick={addEvent}
            className="flex items-center gap-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規イベント
          </button>
        </div>

        {events.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p>イベントがありません。「新規イベント」から作成してください。</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {events.map((event, eventIndex) => (
              <div key={event.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{event.id}</span>
                    <input
                      type="text"
                      value={event.name}
                      onChange={(e) => updateEventName(eventIndex, e.target.value)}
                      className="font-bold text-lg text-slate-800 border-b-2 border-slate-200 focus:border-indigo-500 outline-none px-2 py-1 flex-1 transition-colors"
                      placeholder="イベント名"
                      title="イベント名"
                    />
                  </div>
                  <button
                    onClick={() => playEvent(event)}
                    className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="プレビュー再生"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => removeEvent(eventIndex)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="イベント削除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-3 pl-4 border-l-2 border-slate-100">
                  {event.nodes.map((node, nodeIndex) => (
                    <div key={node.id} className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 relative group">
                      <div className="w-full sm:w-1/4 flex flex-col gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">話者 / 顔グラフィック</label>
                          <select
                            value={node.portraitId || 'none'}
                            onChange={(e) => updateNode(eventIndex, nodeIndex, 'portraitId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="none">なし</option>
                            <option value="hero">主人公</option>
                            <option value="villager">村人</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">メッセージ</label>
                        <textarea
                          value={node.message}
                          onChange={(e) => updateNode(eventIndex, nodeIndex, 'message', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[40px]"
                          placeholder="セリフを入力"
                          rows={2}
                        />
                      </div>
                      <button
                        onClick={() => removeNode(eventIndex, nodeIndex)}
                        className="absolute -right-2 -top-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 p-1 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addNode(eventIndex)}
                  className="self-start flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1"
                >
                  <Plus className="w-4 h-4" /> セリフを追加
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      {/* プレビューオーバーレイ */}
      {previewEvent && previewEvent.nodes[previewNodeIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={nextPreviewNode}>
          <div className="w-full max-w-2xl bg-black/80 border-t-4 border-indigo-500 p-6 flex gap-6 cursor-pointer shadow-2xl rounded-lg">
            {PORTRAITS[previewEvent.nodes[previewNodeIndex].portraitId || 'none'] && (
              <div className="flex-shrink-0 w-24 h-24 bg-slate-800 border-2 border-indigo-400 rounded-lg overflow-hidden flex items-center justify-center">
                <img 
                  src={PORTRAITS[previewEvent.nodes[previewNodeIndex].portraitId || 'none']} 
                  alt="portrait" 
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            )}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="font-bold text-indigo-300 text-lg mb-2 truncate">
                {previewEvent.nodes[previewNodeIndex].speakerName}
              </div>
              <div className="text-white text-xl leading-relaxed break-words overflow-y-auto">
                {previewEvent.nodes[previewNodeIndex].message}
              </div>
              <div className="mt-auto self-end text-sm text-indigo-400 animate-pulse mt-4">
                ▼ クリックして進む
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
