const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const target = `className="absolute inset-x-0 bottom-0 z-50 h-1/3 bg-black/80 border-t-4 border-indigo-500 p-4 flex gap-4 cursor-pointer"
                  onClick={handleNextConversationNode}`;
const replace = `className="absolute inset-x-0 bottom-0 z-50 h-1/3 bg-black/80 border-t-4 border-indigo-500 p-4 flex gap-4 cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); handleNextConversationNode(); }}`;
code = code.replace(target, replace);
fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('patched container pointer');
