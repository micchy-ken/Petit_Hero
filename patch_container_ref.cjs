const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const target = `  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);`;
const replace = `  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([]);
  const customEventsRef = useRef<CustomEvent[]>([]);

  useEffect(() => {
    customEventsRef.current = customEvents;
  }, [customEvents]);`;

code = code.replace(target, replace);

const callbackTarget = `        scene.setOnCustomEvent((eventId, onComplete) => {
          const ev = customEvents.find(e => e.id === eventId);`;
const callbackReplace = `        scene.setOnCustomEvent((eventId, onComplete) => {
          const ev = customEventsRef.current.find(e => e.id === eventId);`;

code = code.replace(callbackTarget, callbackReplace);
fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('patched container ref');
