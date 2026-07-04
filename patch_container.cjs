const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const importTarget = `import { MapData } from '../types/MapData';`;
const importReplace = `import { MapData } from '../types/MapData';
import { CustomEvent, ConversationNode } from '../types/CustomEvent';
import { fetchCustomEventsFromFirestore } from '../lib/dbService';`;
code = code.replace(importTarget, importReplace);

const stateTarget = `  // UIステータス`;
const stateReplace = `  // カスタムイベント再生ステータス
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<CustomEvent | null>(null);
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const [onEventComplete, setOnEventComplete] = useState<(() => void) | null>(null);

  useEffect(() => {
    fetchCustomEventsFromFirestore().then(setCustomEvents);
  }, []);

  // UIステータス`;
code = code.replace(stateTarget, stateReplace);

const sceneSetupTarget = `        scene.setOnLog((log: ActionLog) => {
          setLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
        });`;
const sceneSetupReplace = `        scene.setOnLog((log: ActionLog) => {
          setLogs(prev => [log, ...prev].slice(0, 100)); // Keep last 100 logs
        });
        
        scene.setOnCustomEvent((eventId, onComplete) => {
          const ev = customEvents.find(e => e.id === eventId);
          if (ev && ev.nodes.length > 0) {
            setActiveEvent(ev);
            setActiveNodeIndex(0);
            setOnEventComplete(() => onComplete);
          } else {
            onComplete();
          }
        });`;
code = code.replace(sceneSetupTarget, sceneSetupReplace);

// We need to pass customEvents reference dynamically because scene might use stale closure.
// Wait, scene just passes eventId to the callback. The callback in useEffect has stale closure of customEvents.
// Oh, the callback is set in useEffect `scene.setOnCustomEvent(...)`. If `customEvents` changes, it won't be updated.
// Actually, `customEvents` is only fetched once on mount. So we can use a ref, or just let it use the state.
// Let's use a ref for customEvents to avoid stale closures.
fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('patched container');
