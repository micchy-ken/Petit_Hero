const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const targetEffect = `  useEffect(() => {
    fetchCustomEventsFromFirestore().then((data) => {
      setCustomEvents(data);
      setIsEventsLoaded(true);
    });
  }, []);`;
const replaceEffect = `  useEffect(() => {
    fetchCustomEventsFromFirestore().then((data) => {
      setCustomEvents(data);
      customEventsRef.current = data;
      setIsEventsLoaded(true);
    });
  }, []);`;
code = code.replace(targetEffect, replaceEffect);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('patched game loader ref');
