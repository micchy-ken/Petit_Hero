const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

code = code.replace(
  `speakerName: type === 'levelup' ? '勇者' : 'システム',
                message: text,
                portraitId: type === 'levelup' ? 'hero' : 'none'`,
  `speakerName: 'システム',
                message: text,
                portraitId: 'none'`
);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('Patched system message callback');
