const fs = require('fs');
let code = fs.readFileSync('src/pages/MapEditorPage.tsx', 'utf8');

// Add mobileTab state
const stateTarget = `  const [itemType, setItemType] = useState<string>('treasure_text');`;
const stateReplace = `  const [itemType, setItemType] = useState<string>('treasure_text');
  const [mobileTab, setMobileTab] = useState<'map' | 'canvas' | 'tools'>('canvas');`;
code = code.replace(stateTarget, stateReplace);

// Header responsiveness
const headerTarget = `      {/* 鋼製風ヘッダー */}
      <header className="w-full bg-gradient-to-b from-slate-600 to-slate-700 border-b border-slate-500 shadow-lg px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">`;
const headerReplace = `      {/* 鋼製風ヘッダー */}
      <header className="w-full bg-gradient-to-b from-slate-600 to-slate-700 border-b border-slate-500 shadow-lg px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">`;
code = code.replace(headerTarget, headerReplace);

const headerRightTarget = `        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsTestPlay(true)}`;
const headerRightReplace = `        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-3 flex-wrap">
          <button 
            onClick={() => setIsTestPlay(true)}`;
code = code.replace(headerRightTarget, headerRightReplace);

const saveBtnTarget = `            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 text-red-100" />
                <span>保存失敗</span>
              </>
            )}
          </button>
          <span className="text-sm text-slate-300">
            {currentMap.name} ({currentMap.width}x{currentMap.height})
          </span>
          <div className="text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded shadow-inner border border-slate-800">
            STATUS: ONLINE
          </div>
        </div>
      </header>`;
const saveBtnReplace = `            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-4 h-4 text-red-100" />
                <span>保存失敗</span>
              </>
            )}
          </button>
          <span className="hidden md:inline text-sm text-slate-300">
            {currentMap.name} ({currentMap.width}x{currentMap.height})
          </span>
          <div className="hidden md:block text-xs text-slate-400 font-mono bg-slate-900 px-3 py-1 rounded shadow-inner border border-slate-800">
            STATUS: ONLINE
          </div>
        </div>
      </header>
      
      {/* Mobile Tabs */}
      <div className="flex md:hidden w-full bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <button 
          onClick={() => setMobileTab('map')}
          className={\`flex-1 py-3 text-sm font-bold border-b-2 transition-colors \${mobileTab === 'map' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}\`}
        >
          マップ選択
        </button>
        <button 
          onClick={() => setMobileTab('canvas')}
          className={\`flex-1 py-3 text-sm font-bold border-b-2 transition-colors \${mobileTab === 'canvas' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}\`}
        >
          キャンバス
        </button>
        <button 
          onClick={() => setMobileTab('tools')}
          className={\`flex-1 py-3 text-sm font-bold border-b-2 transition-colors \${mobileTab === 'tools' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}\`}
        >
          ツール設定
        </button>
      </div>`;
code = code.replace(saveBtnTarget, saveBtnReplace);

// Main layout parts
const mainLayoutTarget = `      {/* エディターメイン画面 */}
      <div className="flex-1 w-full max-w-7xl p-6 flex flex-col md:flex-row gap-6">
        
        {/* 左側メニュー：鋼製パネル風 */}
        <aside className="w-full md:w-72 bg-slate-700 rounded-lg border border-slate-600 shadow-xl p-4 flex flex-col gap-6" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)' }}>`;
const mainLayoutReplace = `      {/* エディターメイン画面 */}
      <div className="flex-1 w-full max-w-7xl p-2 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6">
        
        {/* 左側メニュー：鋼製パネル風 */}
        <aside className={\`\${mobileTab === 'map' ? 'flex' : 'hidden'} md:flex w-full md:w-72 bg-slate-700 rounded-lg border border-slate-600 shadow-xl p-4 flex-col gap-6 shrink-0\`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)' }}>`;
code = code.replace(mainLayoutTarget, mainLayoutReplace);

const canvasTarget = `        {/* 中央：マッププレビュー領域 */}
        <main className="flex-1 bg-slate-900 rounded-lg border-2 border-slate-700 p-2 flex items-center justify-center relative overflow-auto shadow-inner">`;
const canvasReplace = `        {/* 中央：マッププレビュー領域 */}
        <main className={\`\${mobileTab === 'canvas' ? 'flex' : 'hidden'} md:flex flex-1 bg-slate-900 rounded-lg border-2 border-slate-700 p-2 flex-col items-center justify-center relative overflow-auto shadow-inner min-h-[50vh]\`}>`;
code = code.replace(canvasTarget, canvasReplace);

const rightAsideTarget = `        {/* 右側：マップ設定領域 */}
        <aside className="w-full md:w-80 bg-slate-700 rounded-lg border border-slate-600 shadow-xl p-4 flex flex-col gap-6 overflow-y-auto" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)' }}>`;
const rightAsideReplace = `        {/* 右側：マップ設定領域 */}
        <aside className={\`\${mobileTab === 'tools' ? 'flex' : 'hidden'} md:flex w-full md:w-80 bg-slate-700 rounded-lg border border-slate-600 shadow-xl p-4 flex-col gap-6 overflow-y-auto shrink-0\`} style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 6px rgba(0,0,0,0.3)' }}>`;
code = code.replace(rightAsideTarget, rightAsideReplace);

fs.writeFileSync('src/pages/MapEditorPage.tsx', code);
console.log('patched map editor for mobile');
