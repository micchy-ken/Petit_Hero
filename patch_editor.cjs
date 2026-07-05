const fs = require('fs');
let code = fs.readFileSync('src/pages/EventEditorPage.tsx', 'utf8');

const targetMainStart = `<main className="flex-1 p-4 max-w-5xl mx-auto w-full">`;
const replaceMainStart = `<main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
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
        </div>`;
code = code.replace(targetMainStart, replaceMainStart);

const targetSpeakerInput = `                        <div>
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
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">顔グラフィック</label>`;

const replaceSpeakerInput = `                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">話者 / 顔グラフィック</label>`;

code = code.replace(targetSpeakerInput, replaceSpeakerInput);

fs.writeFileSync('src/pages/EventEditorPage.tsx', code);
console.log('Patched event editor');
