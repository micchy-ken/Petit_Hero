const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

code = code.replace(
  /else if \(messageWaitMode === 'item_and_event' && \(activeMessageType === 'item' \|\| activeMessageType === 'event' \|\| activeMessageType === 'levelup'\)\) waitClick = true;/g,
  "else if (messageWaitMode === 'item_and_event' && (activeMessageType === 'item' || activeMessageType === 'event')) waitClick = true;"
);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('Patched levelup waiting condition');
