const fs = require('fs');
let code = fs.readFileSync('src/pages/MapEditorPage.tsx', 'utf8');

const stateTarget = `  const [customEventId, setCustomEventId] = useState<string>('');
  
  // アイテム配置用の状態`;
const stateReplace = `  const [customEventId, setCustomEventId] = useState<string>('');
  const [playMode, setPlayMode] = useState<'always' | 'once_per_map' | 'once_global'>('always');
  
  // アイテム配置用の状態`;
code = code.replace(stateTarget, stateReplace);

const addDataTarget = `        if (eventCondExpRate !== null) data.requiredExplorationRate = eventCondExpRate;
        if (eventCondSearchRate !== null) data.requiredSearchRate = eventCondSearchRate;
        if (eventCondDefeatRate !== null) data.requiredDefeatRate = eventCondDefeatRate;
        
        newEvents.push({ x, y, type: eventType, data });`;
const addDataReplace = `        if (eventCondExpRate !== null) data.requiredExplorationRate = eventCondExpRate;
        if (eventCondSearchRate !== null) data.requiredSearchRate = eventCondSearchRate;
        if (eventCondDefeatRate !== null) data.requiredDefeatRate = eventCondDefeatRate;
        data.playMode = playMode;
        
        newEvents.push({ x, y, type: eventType, data });`;
code = code.replace(addDataTarget, addDataReplace);

const editTarget = `    } else if (editingEvent.type === 'custom_event') {
      data.eventId = editingEvent.eventId || '';
    }`;
const editReplace = `    } else if (editingEvent.type === 'custom_event') {
      data.eventId = editingEvent.eventId || '';
    }
    data.playMode = editingEvent.playMode || 'always';`;
code = code.replace(editTarget, editReplace);

const uiTarget = `                <div className="flex flex-col gap-1 mt-2 border-t border-slate-600 pt-2">
                  <label className="text-xs text-slate-400 font-bold uppercase">固有条件 (踏破率)</label>`;
const uiReplace = `                {(eventType === 'custom_event' || eventType === 'start_point' || eventType === 'teleport' || eventType === 'monologue') && (
                  <div className="flex flex-col gap-1 mt-2">
                    <label className="text-xs text-slate-400 font-bold uppercase">再生頻度設定</label>
                    <select 
                      value={playMode}
                      onChange={(e) => setPlayMode(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-400"
                    >
                      <option value="always">何度でも表示する (Always)</option>
                      <option value="once_per_map">一回だけ表示 (マップ出入りでリセット)</option>
                      <option value="once_global">ゲーム中一回だけしか表示しない</option>
                    </select>
                  </div>
                )}
                
                <div className="flex flex-col gap-1 mt-2 border-t border-slate-600 pt-2">
                  <label className="text-xs text-slate-400 font-bold uppercase">固有条件 (踏破率)</label>`;
code = code.replace(uiTarget, uiReplace);

const editUiTarget = `                <div className="flex flex-col gap-1 mt-2 border-t border-slate-700 pt-2">
                  <label className="text-xs text-slate-300 font-bold uppercase">固有条件 (踏破率)</label>`;
const editUiReplace = `                <div className="flex flex-col gap-1 mt-2">
                  <label className="text-xs text-slate-300 font-bold uppercase">再生頻度設定</label>
                  <select 
                    value={editingEvent.playMode || 'always'}
                    onChange={(e) => setEditingEvent({ ...editingEvent, playMode: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-slate-500"
                  >
                    <option value="always">何度でも表示する (Always)</option>
                    <option value="once_per_map">一回だけ表示 (マップ出入りでリセット)</option>
                    <option value="once_global">ゲーム中一回だけしか表示しない</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 mt-2 border-t border-slate-700 pt-2">
                  <label className="text-xs text-slate-300 font-bold uppercase">固有条件 (踏破率)</label>`;
code = code.replace(editUiTarget, editUiReplace);

fs.writeFileSync('src/pages/MapEditorPage.tsx', code);
console.log('patched map editor playmode');
