const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const targetOrder = `        if (maps && initialMapId) {
          const startMap = maps.find(m => m.id === initialMapId);`;

const replaceOrder = `
        scene.setOnStateChange((newState: HeroState) => {
          setHeroState(newState);
          setIsMoving(newState.isMoving);
          if (newState.level !== lastLevelRef.current) {
            lastLevelRef.current = newState.level;
          }
        });
        
        scene.setOnLog((newLog) => {
          setLogs(prev => [...prev.slice(-49), newLog]);
        });

        scene.setOnCustomEvent((eventId, onComplete) => {
          const ev = customEventsRef.current.find(e => e.id === eventId);
          if (ev && ev.nodes.length > 0) {
            setActiveEvent(ev);
            setActiveNodeIndex(0);
            setOnEventComplete(() => onComplete);
          } else {
            onComplete();
          }
        });

        scene.setOnStatsChange((exp, search, defeat) => {
          setExplorationRate(exp);
          setSearchRate(search);
          setDefeatRate(defeat);
        });

        if (maps && initialMapId) {
          const startMap = maps.find(m => m.id === initialMapId);`;

code = code.replace(targetOrder, replaceOrder);

const targetRemove1 = `        scene.setOnStateChange((newState: HeroState) => {
          setHeroState(newState);
          setIsMoving(newState.isMoving);
          if (newState.level !== lastLevelRef.current) {
            lastLevelRef.current = newState.level;
          }
        });
        
        scene.setOnLog((newLog) => {
          setLogs(prev => [...prev.slice(-49), newLog]); // 最新50件を保持
        });

        scene.setOnCustomEvent((eventId, onComplete) => {
          const ev = customEventsRef.current.find(e => e.id === eventId);
          if (ev && ev.nodes.length > 0) {
            setActiveEvent(ev);
            setActiveNodeIndex(0);
            setOnEventComplete(() => onComplete);
          } else {
            onComplete();
          }
        });`;

code = code.replace(targetRemove1, ``);

const targetRemove2 = `        scene.setOnStatsChange((exp, search, defeat) => {
          setExplorationRate(exp);
          setSearchRate(search);
          setDefeatRate(defeat);
        });`;
code = code.replace(targetRemove2, ``);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('patched callbacks order');
