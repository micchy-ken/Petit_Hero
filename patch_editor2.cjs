const fs = require('fs');
let code = fs.readFileSync('src/pages/EventEditorPage.tsx', 'utf8');

const mainMatch = code.match(/<main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">/);
if (mainMatch) {
  const replaceMainStart = `<main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
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
        </div>`;
  code = code.replace(mainMatch[0], replaceMainStart);
  console.log("Patched main");
}

const speakerInputRegex = /<div>\s*<label className="block text-\[10px\] font-bold text-slate-400 uppercase tracking-wider mb-1">話者名<\/label>\s*<input\s*type="text"\s*value={node\.speakerName \|\| ''}\s*onChange={\(e\) => updateNode\(eventIndex, nodeIndex, 'speakerName', e\.target\.value\)}\s*className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1\.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"\s*placeholder="名前"\s*\/>\s*<\/div>\s*<div>\s*<label className="block text-\[10px\] font-bold text-slate-400 uppercase tracking-wider mb-1">顔グラフィック<\/label>/m;
if (speakerInputRegex.test(code)) {
  code = code.replace(speakerInputRegex, `<div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">話者 / 顔グラフィック</label>`);
  console.log("Patched speaker input");
} else {
  console.log("speaker input not found!");
}

fs.writeFileSync('src/pages/EventEditorPage.tsx', code);
