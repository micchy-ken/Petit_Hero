import re

file = 'src/pages/MapEditorPage.tsx'
with open(file, 'r', encoding='utf8') as f:
    content = f.read()

modal_html = """
      {/* イベント編集モーダル */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-700 rounded-xl border border-slate-500 shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              イベント編集 ({editingEvent.type})
            </h3>
            
            {editingEvent.type === 'teleport' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-300 font-bold uppercase">テレポート先</label>
                <select 
                  value={editingEvent.data?.targetMap || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, data: { ...editingEvent.data, targetMap: e.target.value } })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none"
                >
                  {maps.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                
                <label className="text-xs text-slate-300 font-bold uppercase mt-2">必要な探索率 (%)</label>
                <input 
                  type="number"
                  value={editingEvent.data?.requiredExplorationRate || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, data: { ...editingEvent.data, requiredExplorationRate: e.target.value ? Number(e.target.value) : undefined } })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none"
                  placeholder="例: 100"
                />
                
                <label className="text-xs text-slate-300 font-bold uppercase mt-2">必要な敵撃破率 (%)</label>
                <input 
                  type="number"
                  value={editingEvent.data?.requiredDefeatRate || ''}
                  onChange={(e) => setEditingEvent({ ...editingEvent, data: { ...editingEvent.data, requiredDefeatRate: e.target.value ? Number(e.target.value) : undefined } })}
                  className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-slate-200 outline-none"
                  placeholder="例: 100"
                />
              </div>
            )}
            
            <div className="flex justify-between mt-4 border-t border-slate-600 pt-4">
              <button 
                onClick={() => {
                  const newEvents = currentMap.events.filter(e => !(e.x === editingEvent.originalX && e.y === editingEvent.originalY));
                  handleUpdateCurrentMap({ events: newEvents });
                  setEditingEvent(null);
                }}
                className="px-4 py-2 rounded text-sm bg-red-600 hover:bg-red-500 text-white transition-colors"
              >
                削除
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 rounded text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                >
                  キャンセル
                </button>
                <button 
                  onClick={() => {
                    const newEvents = currentMap.events.map(e => {
                      if (e.x === editingEvent.originalX && e.y === editingEvent.originalY) {
                        const { originalX, originalY, ...rest } = editingEvent;
                        return rest;
                      }
                      return e;
                    });
                    handleUpdateCurrentMap({ events: newEvents });
                    setEditingEvent(null);
                  }}
                  className="px-4 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
"""

content = content.replace("    </div>\n  );\n}\n", modal_html + "    </div>\n  );\n}\n")

with open(file, 'w', encoding='utf8') as f:
    f.write(content)
