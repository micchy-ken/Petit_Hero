import re

file = 'src/pages/MapEditorPage.tsx'
with open(file, 'r', encoding='utf8') as f:
    content = f.read()

content = content.replace(
    "const [newMapHeight, setNewMapHeight] = useState(16);",
    "const [newMapHeight, setNewMapHeight] = useState(16);\n  const [editingEvent, setEditingEvent] = useState<any>(null);"
)

content = content.replace(
    "const existingIndex = currentMap.events.findIndex(e => e.x === x && e.y === y);\n      const newEvents = [...currentMap.events];\n      \n      if (existingIndex >= 0) {\n        newEvents.splice(existingIndex, 1);\n      } else {",
    """const existingEvent = currentMap.events.find(e => e.x === x && e.y === y);
      if (existingEvent) {
        setEditingEvent({ ...existingEvent, originalX: existingEvent.x, originalY: existingEvent.y });
        return;
      }
      const newEvents = [...currentMap.events];
      {"""
)

with open(file, 'w', encoding='utf8') as f:
    f.write(content)

