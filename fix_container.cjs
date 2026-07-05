const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

const targetEffect = `  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (activeEvent) {
      let waitClick = false;
      if (messageWaitMode === 'all_messages_and_map_move') waitClick = true;
      else if (messageWaitMode === 'all_messages') waitClick = true;
      else if (messageWaitMode === 'item_and_event') waitClick = true;
      else if (messageWaitMode === 'event_only') waitClick = true;
      else if (messageWaitMode === 'none') waitClick = false;

      if (!waitClick) {
        timerId = setTimeout(() => {
          handleNextConversationNode();
        }, messageAutoAdvanceSeconds * 1000);
      }
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [activeEvent, activeNodeIndex, messageWaitMode, messageAutoAdvanceSeconds]); // eslint-disable-line react-hooks/exhaustive-deps\n`;

code = code.replace(targetEffect, ''); // Remove from original spot

// Put it right after messageAutoAdvanceSeconds declaration
const targetAnchor = `  const [messageWaitMode, setMessageWaitMode] = useState<string>('event_only');
  const [messageAutoAdvanceSeconds, setMessageAutoAdvanceSeconds] = useState<number>(2);`;
  
const newAnchor = `  const [messageWaitMode, setMessageWaitMode] = useState<string>('event_only');
  const [messageAutoAdvanceSeconds, setMessageAutoAdvanceSeconds] = useState<number>(2);

${targetEffect}`;

code = code.replace(targetAnchor, newAnchor);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('Fixed PhaserGameContainer.tsx');
