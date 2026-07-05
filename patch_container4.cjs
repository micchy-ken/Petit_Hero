const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const targetCallbackSetup = `        scene.setOnCustomEvent((eventId, onComplete) => {
          const ev = customEventsRef.current.find(e => e.id === eventId);
          if (ev && ev.nodes.length > 0) {
            setActiveEvent(ev);
            setActiveNodeIndex(0);
            setOnEventComplete(() => onComplete);
          } else {
            onComplete();
          }
        });`;

const replaceCallbackSetup = `        scene.setOnCustomEvent((eventId, onComplete) => {
          const ev = customEventsRef.current.find(e => e.id === eventId);
          if (ev && ev.nodes.length > 0) {
            setActiveMessageType('event');
            setActiveEvent(ev);
            setActiveNodeIndex(0);
            setOnEventComplete(() => onComplete);
          } else {
            onComplete();
          }
        });
        
        scene.onSystemMessageCallback = (type, text, onComplete) => {
          setActiveMessageType(type);
          setActiveNodeIndex(0);
          setActiveEvent({
            id: \`sys-\${Date.now()}\`,
            name: 'System',
            type: 'conversation',
            nodes: [
              {
                id: '1',
                speakerName: type === 'levelup' ? '勇者' : 'システム',
                message: text,
                portraitId: type === 'levelup' ? 'hero' : 'none'
              }
            ]
          });
          setOnEventComplete(() => onComplete);
        };`;

code = code.replace(targetCallbackSetup, replaceCallbackSetup);
fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('Patched container again');
