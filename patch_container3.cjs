const fs = require('fs');
let code = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf8');

// Add activeMessageType
code = code.replace(
  `const [activeEvent, setActiveEvent] = useState<CustomEvent | null>(null);`,
  `const [activeMessageType, setActiveMessageType] = useState<string | null>(null);
  const [activeEvent, setActiveEvent] = useState<CustomEvent | null>(null);`
);

// Register callback in useEffect
const targetSetupEffect = `useEffect(() => {
    let game: Phaser.Game;

    if (!gameInstanceRef.current && gameContainerRef.current) {`;
const replaceSetupEffect = `useEffect(() => {
    let game: Phaser.Game;

    if (!gameInstanceRef.current && gameContainerRef.current) {`;
// Actually, let's just add it where onCustomEventCallback is added

const targetCallbackSetup = `sceneRef.current.onCustomEventCallback = (eventId, onComplete) => {
        const eventData = customEventsRef.current.find(e => e.id === eventId);
        if (eventData) {
          setActiveNodeIndex(0);
          setActiveEvent(eventData);
          setOnEventComplete(() => onComplete);
        } else {
          onComplete(); // イベントが見つからない場合はすぐに終了
        }
      };`;
const replaceCallbackSetup = `sceneRef.current.onCustomEventCallback = (eventId, onComplete) => {
        const eventData = customEventsRef.current.find(e => e.id === eventId);
        if (eventData) {
          setActiveNodeIndex(0);
          setActiveMessageType('event');
          setActiveEvent(eventData);
          setOnEventComplete(() => onComplete);
        } else {
          onComplete(); // イベントが見つからない場合はすぐに終了
        }
      };
      
      sceneRef.current.onSystemMessageCallback = (type, text, onComplete) => {
        setActiveNodeIndex(0);
        setActiveMessageType(type);
        setActiveEvent({
          id: \`sys-\${Date.now()}\`,
          name: 'System',
          type: 'conversation',
          nodes: [
            {
              id: '1',
              speakerName: 'システム',
              message: text,
              portraitId: 'none'
            }
          ]
        });
        setOnEventComplete(() => onComplete);
      };`;

code = code.replace(targetCallbackSetup, replaceCallbackSetup);

// Fix timer logic
const targetTimerLogic = `  useEffect(() => {
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
  }, [activeEvent, activeNodeIndex, messageWaitMode, messageAutoAdvanceSeconds]); // eslint-disable-line react-hooks/exhaustive-deps`;

const replaceTimerLogic = `  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (activeEvent) {
      let waitClick = false;
      if (messageWaitMode === 'all_messages_and_map_move') waitClick = true;
      else if (messageWaitMode === 'all_messages' && activeMessageType !== 'map_move') waitClick = true;
      else if (messageWaitMode === 'item_and_event' && (activeMessageType === 'item' || activeMessageType === 'event' || activeMessageType === 'levelup')) waitClick = true;
      else if (messageWaitMode === 'event_only' && activeMessageType === 'event') waitClick = true;
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
  }, [activeEvent, activeNodeIndex, messageWaitMode, messageAutoAdvanceSeconds, activeMessageType]); // eslint-disable-line react-hooks/exhaustive-deps`;
code = code.replace(targetTimerLogic, replaceTimerLogic);

// Fix prompt rendering
const targetOverlayText = `                    <div className="mt-auto self-end text-xs text-indigo-400 animate-pulse mt-2">
                      {
    ['all_messages_and_map_move', 'all_messages', 'item_and_event', 'event_only'].includes(messageWaitMode) 
    ? '▼ クリックして進む' 
    : \`( \${messageAutoAdvanceSeconds}秒で自動的に進みます )\`
}`;

const replaceOverlayText = `                    <div className="mt-auto self-end text-xs text-indigo-400 animate-pulse mt-2">
                      {
    (() => {
      let waitClick = false;
      if (messageWaitMode === 'all_messages_and_map_move') waitClick = true;
      else if (messageWaitMode === 'all_messages' && activeMessageType !== 'map_move') waitClick = true;
      else if (messageWaitMode === 'item_and_event' && (activeMessageType === 'item' || activeMessageType === 'event' || activeMessageType === 'levelup')) waitClick = true;
      else if (messageWaitMode === 'event_only' && activeMessageType === 'event') waitClick = true;
      else if (messageWaitMode === 'none') waitClick = false;
      
      return waitClick ? '▼ クリックして進む' : \`( \${messageAutoAdvanceSeconds}秒で自動的に進みます )\`;
    })()
}`;

code = code.replace(targetOverlayText, replaceOverlayText);

// Fix initial wait mode setting
const targetInitMode = `const [messageWaitMode, setMessageWaitMode] = useState<string>('event_only');`;
const replaceInitMode = `const [messageWaitMode, setMessageWaitMode] = useState<string>('all_messages_and_map_move');`;
code = code.replace(targetInitMode, replaceInitMode);


fs.writeFileSync('src/components/PhaserGameContainer.tsx', code);
console.log('Patched PhaserGameContainer.tsx to handle system messages via activeEvent');
