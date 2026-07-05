const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const targetActiveEvent = `{activeEvent && activeEvent.nodes[activeNodeIndex] && (
                <div 
                  className="absolute inset-x-0 bottom-0 z-50 h-1/3 bg-black/80 border-t-4 border-indigo-500 p-4 flex gap-4 cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleNextConversationNode(); }}
                >
                  <div className="flex-shrink-0 w-24 h-24 bg-slate-800 border-2 border-indigo-400 rounded-lg overflow-hidden flex items-center justify-center">`;

const replaceActiveEvent = `{activeEvent && activeEvent.nodes[activeNodeIndex] && (
                <div 
                  className="absolute inset-0 z-50 cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleNextConversationNode(); }}
                >
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-black/80 border-t-4 border-indigo-500 p-4 flex gap-4">
                  <div className="flex-shrink-0 w-24 h-24 bg-slate-800 border-2 border-indigo-400 rounded-lg overflow-hidden flex items-center justify-center">`;

code = code.replace(targetActiveEvent, replaceActiveEvent);

const targetActiveEventClose = `                    <div className="mt-auto self-end text-xs text-indigo-400 animate-pulse mt-2">
                      {
    ['all_messages_and_map_move', 'all_messages', 'item_and_event', 'event_only'].includes(messageWaitMode) 
    ? '▼ クリックして進む' 
    : \`( \${messageAutoAdvanceSeconds}秒で自動的に進みます )\`
}
                    </div>
                  </div>
                </div>
              )}`;

const replaceActiveEventClose = `                    <div className="mt-auto self-end text-xs text-indigo-400 animate-pulse mt-2">
                      {
    ['all_messages_and_map_move', 'all_messages', 'item_and_event', 'event_only'].includes(messageWaitMode) 
    ? '▼ クリックして進む' 
    : \`( \${messageAutoAdvanceSeconds}秒で自動的に進みます )\`
}
                    </div>
                  </div>
                  </div>
                </div>
              )}`;

code = code.replace(targetActiveEventClose, replaceActiveEventClose);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('Patched PhaserGameContainer.tsx activeEvent click area');
