const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

// Add states
code = code.replace(
  `const [goalBehavior, setGoalBehavior] = useState<string>('seek_visible');`,
  `const [goalBehavior, setGoalBehavior] = useState<string>('seek_visible');
  const [messageWaitMode, setMessageWaitMode] = useState<string>('event_only');
  const [messageAutoAdvanceSeconds, setMessageAutoAdvanceSeconds] = useState<number>(2);`
);

// Pass states to scene
code = code.replace(
  `useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.goalBehavior = goalBehavior;
    }
  }, [goalBehavior]);`,
  `useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.goalBehavior = goalBehavior;
    }
  }, [goalBehavior]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.messageWaitMode = messageWaitMode;
    }
  }, [messageWaitMode]);

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.messageAutoAdvanceSeconds = messageAutoAdvanceSeconds;
    }
  }, [messageAutoAdvanceSeconds]);`
);

// Render settings UI
const targetUI = `{/* ゴール指針 */}`;
const replaceUI = `{/* メッセージ処理 */}
                <div className="flex flex-col gap-2">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    メッセージ処理の行動指針
                  </h4>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600">クリック待ちの設定</label>
                    <select
                      value={messageWaitMode}
                      onChange={(e) => setMessageWaitMode(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold shadow-sm"
                    >
                      <option value="all_messages_and_map_move">すべてのメッセージ、マップ移動後</option>
                      <option value="all_messages">すべてのメッセージ（アイテムゲット、レベルアップ、イベント発生）</option>
                      <option value="item_and_event">アイテムゲット、イベント発生</option>
                      <option value="event_only">イベント発生のみ</option>
                      <option value="none">クリック待ちなし</option>
                    </select>
                    
                    <label className="text-xs font-bold text-slate-600 mt-2">自動で次に進むまでの秒数: {messageAutoAdvanceSeconds}秒</label>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="1"
                      value={messageAutoAdvanceSeconds}
                      onChange={(e) => setMessageAutoAdvanceSeconds(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>

                {/* ゴール指針 */}`;
code = code.replace(targetUI, replaceUI);

// React overlay timer logic
const targetEffect = `  useEffect(() => {
    customEventsRef.current = customEvents;
  }, [customEvents]);`;
const replaceEffect = `  useEffect(() => {
    customEventsRef.current = customEvents;
  }, [customEvents]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (activeEvent) {
      let waitClick = false;
      if (messageWaitMode === 'all_messages_and_map_move') waitClick = true;
      else if (messageWaitMode === 'all_messages') waitClick = true;
      else if (messageWaitMode === 'item_and_event') waitClick = true;
      else if (messageWaitMode === 'event_only') waitClick = true;
      else if (messageWaitMode === 'none') waitClick = false;

      if (!waitClick) {
        timerId = setTimeout(() => {
          handleNextConversationNode();
        }, messageAutoAdvanceSeconds * 1000);
      }
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [activeEvent, activeNodeIndex, messageWaitMode, messageAutoAdvanceSeconds]); // eslint-disable-line react-hooks/exhaustive-deps`;
code = code.replace(targetEffect, replaceEffect);

// Overlay UI message
const targetOverlayText = `▼ クリックして進む`;
const replaceOverlayText = `{
    ['all_messages_and_map_move', 'all_messages', 'item_and_event', 'event_only'].includes(messageWaitMode) 
    ? '▼ クリックして進む' 
    : \`( \${messageAutoAdvanceSeconds}秒で自動的に進みます )\`
}`;
code = code.replace(targetOverlayText, replaceOverlayText);

// Fix import
code = code.replace(
  `import { Play, Flame, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, X, Heart, Star, Sparkles, Map, Target, Move, Sword, ScanEye, MousePointer2, Menu, LogOut, Zap, Hexagon, ImageIcon } from 'lucide-react';`,
  `import { Play, Flame, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, X, Heart, Star, Sparkles, Map, Target, Move, Sword, ScanEye, MousePointer2, Menu, LogOut, Zap, Hexagon, ImageIcon, MessageSquare } from 'lucide-react';`
);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('Patched PhaserGameContainer.tsx');
