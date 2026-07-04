const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const targetEffect = `  useEffect(() => {
    fetchCustomEventsFromFirestore().then(setCustomEvents);
  }, []);`;
const replaceEffect = `  const [isEventsLoaded, setIsEventsLoaded] = useState(false);
  useEffect(() => {
    fetchCustomEventsFromFirestore().then((data) => {
      setCustomEvents(data);
      setIsEventsLoaded(true);
    });
  }, []);`;
code = code.replace(targetEffect, replaceEffect);

const targetMount = `  // Phaserの初期化
  useEffect(() => {
    if (!gameContainerRef.current) return;
    if (gameInstanceRef.current) return;`;
const replaceMount = `  // Phaserの初期化
  useEffect(() => {
    if (!isEventsLoaded) return;
    if (!gameContainerRef.current) return;
    if (gameInstanceRef.current) return;`;
code = code.replace(targetMount, replaceMount);

const targetDeps = `    return () => {
      game.destroy(true);
      gameInstanceRef.current = null;
      sceneRef.current = null;
    };
  }, []); // Only run once on mount`;
const replaceDeps = `    return () => {
      game.destroy(true);
      gameInstanceRef.current = null;
      sceneRef.current = null;
    };
  }, [isEventsLoaded]); // Run when events are loaded`;
code = code.replace(targetDeps, replaceDeps);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('patched game loader');
