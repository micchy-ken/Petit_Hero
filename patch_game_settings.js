import fs from 'fs';
let content = fs.readFileSync('src/pages/GamePage.tsx', 'utf-8');

const stateTarget = `  const [loadedPosition, setLoadedPosition] = useState<any | null>(null);`;
const stateReplacement = `  const [loadedPosition, setLoadedPosition] = useState<any | null>(null);
  const [initialShowSettings, setInitialShowSettings] = useState(false);`;

content = content.replace(stateTarget, stateReplacement);

const launchTarget = `  const launchGame = async (scenario: Scenario, continueGame: boolean) => {
    // Clear URL parameters to prevent settings menu from auto-opening
    if (window.location.search.includes('settings=true') || window.location.hash.includes('settings=true')) {
      navigate('/', { replace: true });
    }`;

const launchReplacement = `  const launchGame = async (scenario: Scenario, continueGame: boolean) => {
    const shouldShowSettings = window.location.search.includes('settings=true') || window.location.hash.includes('settings=true');
    setInitialShowSettings(shouldShowSettings);

    // Clear URL parameters to prevent settings menu from auto-opening
    if (shouldShowSettings) {
      navigate('/', { replace: true });
    }`;

content = content.replace(launchTarget, launchReplacement);

const propsTarget = `          <PhaserGameContainer 
            isTestPlay={false}`;

const propsReplacement = `          <PhaserGameContainer 
            isTestPlay={false}
            initialShowSettings={initialShowSettings}`;

content = content.replace(propsTarget, propsReplacement);

fs.writeFileSync('src/pages/GamePage.tsx', content);
console.log("Patched GamePage settings");
