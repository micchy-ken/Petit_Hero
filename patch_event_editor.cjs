const fs = require('fs');
let code = fs.readFileSync('src/pages/EventEditorPage.tsx', 'utf8');

const target1 = `        { id: \`node_\${Date.now()}\`, speakerName: '村人', message: 'こんにちは！' }`;
const replace1 = `        { id: \`node_\${Date.now()}\`, speakerName: '村人', portraitId: 'villager', message: 'こんにちは！' }`;
code = code.replace(target1, replace1);

const target2 = `      speakerName: '主人公',
      message: '...'`;
const replace2 = `      speakerName: '主人公',
      portraitId: 'hero',
      message: '...'`;
code = code.replace(target2, replace2);

const target3 = `                      <div className="w-full sm:w-1/4">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">話者名</label>
                        <input
                          type="text"
                          value={node.speakerName || ''}
                          onChange={(e) => updateNode(eventIndex, nodeIndex, 'speakerName', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="名前"
                        />
                      </div>`;
const replace3 = `                      <div className="w-full sm:w-1/4 flex flex-col gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">話者名</label>
                          <input
                            type="text"
                            value={node.speakerName || ''}
                            onChange={(e) => updateNode(eventIndex, nodeIndex, 'speakerName', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="名前"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">顔グラフィック</label>
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
                      </div>`;
code = code.replace(target3, replace3);

fs.writeFileSync('src/pages/EventEditorPage.tsx', code);
console.log('patched event editor');
