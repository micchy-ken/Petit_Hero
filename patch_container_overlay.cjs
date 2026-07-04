const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const importTarget = `import { fetchCustomEventsFromFirestore } from '../lib/dbService';`;
const importReplace = `import { fetchCustomEventsFromFirestore } from '../lib/dbService';
import { PORTRAITS } from '../data/portraits';`;
code = code.replace(importTarget, importReplace);

const handleNextNode = `
  const handleNextConversationNode = () => {
    if (!activeEvent) return;
    if (activeNodeIndex < activeEvent.nodes.length - 1) {
      setActiveNodeIndex(activeNodeIndex + 1);
    } else {
      setActiveEvent(null);
      if (onEventComplete) {
        onEventComplete();
        setOnEventComplete(null);
      }
    }
  };
`;

const reactImports = `import React, { useEffect, useRef, useState } from 'react';`;
const reactReplace = `import React, { useEffect, useRef, useState, useMemo } from 'react';`;
code = code.replace(reactImports, reactReplace);

const stateInsertTarget = `  const customEventsRef = useRef<CustomEvent[]>([]);`;
code = code.replace(stateInsertTarget, stateInsertTarget + handleNextNode);


const overlayTarget = `              />
              {/* 踏破率・捜索率・撃破率 表示 */}`;

const overlayReplace = `              />
              {/* 会話イベントオーバーレイ */}
              {activeEvent && activeEvent.nodes[activeNodeIndex] && (
                <div 
                  className="absolute inset-x-0 bottom-0 z-50 h-1/3 bg-black/80 border-t-4 border-indigo-500 p-4 flex gap-4 cursor-pointer"
                  onClick={handleNextConversationNode}
                >
                  <div className="flex-shrink-0 w-24 h-24 bg-slate-800 border-2 border-indigo-400 rounded-lg overflow-hidden flex items-center justify-center">
                    {PORTRAITS[activeEvent.nodes[activeNodeIndex].portraitId || 'none'] ? (
                      <img src={PORTRAITS[activeEvent.nodes[activeNodeIndex].portraitId || 'none']} alt="portrait" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-slate-500 text-xs text-center">No Image</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="font-bold text-indigo-300 text-sm mb-1 truncate">
                      {activeEvent.nodes[activeNodeIndex].speakerName}
                    </div>
                    <div className="text-white text-base leading-relaxed break-words overflow-y-auto">
                      {activeEvent.nodes[activeNodeIndex].message}
                    </div>
                    <div className="mt-auto self-end text-xs text-indigo-400 animate-pulse mt-2">
                      ▼ クリックして進む
                    </div>
                  </div>
                </div>
              )}
              {/* 踏破率・捜索率・撃破率 表示 */}`;

code = code.replace(overlayTarget, overlayReplace);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('patched container overlay');
