const fs = require('fs');
const file = 'src/pages/MapEditorPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Insert useState
content = content.replace(
  "const [newMapHeight, setNewMapHeight] = useState(16);",
  "const [newMapHeight, setNewMapHeight] = useState(16);\n  const [editingEvent, setEditingEvent] = useState<any>(null);"
);

// Modify handleGridClick
content = content.replace(
  "const existingIndex = currentMap.events.findIndex(e => e.x === x && e.y === y);\n      const newEvents = [...currentMap.events];\n      \n      if (existingIndex >= 0) {\n        newEvents.splice(existingIndex, 1);\n      } else {",
  `const existingEvent = currentMap.events.find(e => e.x === x && e.y === y);
      if (existingEvent) {
        setEditingEvent({ ...existingEvent, originalX: existingEvent.x, originalY: existingEvent.y });
        return;
      }
      const newEvents = [...currentMap.events];
      {`
);

fs.writeFileSync(file, content);
