const fs = require('fs');

// 1. Update portraits.ts
const portraitsCode = `export const PORTRAITS: Record<string, string> = {
  hero: "https://image.pollinations.ai/prompt/beautiful%20anime%20style%20portrait%20of%20a%20brave%20young%20fantasy%20RPG%20hero%2C%20highly%20detailed%2C%20vibrant%20colors%2C%20facing%20forward?width=256&height=256&nologo=true&seed=hero123",
  villager: "https://image.pollinations.ai/prompt/beautiful%20anime%20style%20portrait%20of%20a%20friendly%20fantasy%20RPG%20villager%2C%20highly%20detailed%2C%20soft%20colors%2C%20facing%20forward?width=256&height=256&nologo=true&seed=villager123",
  none: ""
};
`;
fs.writeFileSync('src/data/portraits.ts', portraitsCode);

// 2. Update EventEditorPage.tsx to auto-set name
let eventEditor = fs.readFileSync('src/pages/EventEditorPage.tsx', 'utf8');

const updateNodeTarget = `  const updateNode = (eventIndex: number, nodeIndex: number, field: keyof ConversationNode, value: string) => {
    const newEvents = [...events];
    newEvents[eventIndex].nodes[nodeIndex] = {
      ...newEvents[eventIndex].nodes[nodeIndex],
      [field]: value
    };
    setEvents(newEvents);
  };`;

const updateNodeReplace = `  const updateNode = (eventIndex: number, nodeIndex: number, field: keyof ConversationNode, value: string) => {
    const newEvents = [...events];
    const updatedNode = {
      ...newEvents[eventIndex].nodes[nodeIndex],
      [field]: value
    };
    
    // 顔グラフィック変更時にデフォルト名前を自動設定
    if (field === 'portraitId') {
      if (value === 'hero') {
        updatedNode.speakerName = '主人公';
      } else if (value === 'villager') {
        updatedNode.speakerName = '村人';
      } else if (value === 'none') {
        updatedNode.speakerName = '';
      }
    }
    
    newEvents[eventIndex].nodes[nodeIndex] = updatedNode;
    setEvents(newEvents);
  };`;

eventEditor = eventEditor.replace(updateNodeTarget, updateNodeReplace);

// Remove the pixelated styling from preview
const previewTarget = `                  className={\`w-full h-full \${previewEvent.nodes[previewNodeIndex].portraitId === 'hero' ? 'object-cover' : 'object-contain'} \`}
                  style={{ imageRendering: previewEvent.nodes[previewNodeIndex].portraitId !== 'hero' ? 'pixelated' : 'auto' }}`;
const previewReplace = `                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'auto' }}`;
eventEditor = eventEditor.replace(previewTarget, previewReplace);

fs.writeFileSync('src/pages/EventEditorPage.tsx', eventEditor);

// 3. Update PhaserGameContainer.tsx to remove pixelated style for portraits
let gameContainer = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');
const gameTarget = `                        className={\`w-full h-full \${activeEvent.nodes[activeNodeIndex].portraitId === 'hero' ? 'object-cover' : 'object-contain'} \`}
                        style={{ imageRendering: activeEvent.nodes[activeNodeIndex].portraitId !== 'hero' ? 'pixelated' : 'auto' }}`;
const gameReplace = `                        className="w-full h-full object-cover"
                        style={{ imageRendering: 'auto' }}`;
gameContainer = gameContainer.replace(gameTarget, gameReplace);
fs.writeFileSync('src/components/PhaserGameContainer.tsx', gameContainer);

console.log('patched anime portraits');
