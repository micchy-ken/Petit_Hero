import fs from 'fs';
let content = fs.readFileSync('src/components/PhaserGameContainer.tsx', 'utf-8');

const propsInterfaceTarget = `interface PhaserGameContainerProps {
  isTestPlay: boolean;
  maps?: MapData[];
  initialMapId?: string;
  scenarioId?: string;
  scenarioStatusMode?: 'individual' | 'shared';
  initialHeroState?: any;
  initialPosition?: any;
  onTeleport?: (targetMapId: string) => void;
}`;

const propsInterfaceReplacement = `interface PhaserGameContainerProps {
  isTestPlay: boolean;
  maps?: MapData[];
  initialMapId?: string;
  scenarioId?: string;
  scenarioStatusMode?: 'individual' | 'shared';
  initialHeroState?: any;
  initialPosition?: any;
  onTeleport?: (targetMapId: string) => void;
  initialShowSettings?: boolean;
}`;

content = content.replace(propsInterfaceTarget, propsInterfaceReplacement);

const propsTarget = `export const PhaserGameContainer: React.FC<PhaserGameContainerProps> = ({ 
  isTestPlay, 
  maps, 
  initialMapId,
  scenarioId,
  scenarioStatusMode,
  initialHeroState,
  initialPosition,
  onTeleport
}) => {`;

const propsReplacement = `export const PhaserGameContainer: React.FC<PhaserGameContainerProps> = ({ 
  isTestPlay, 
  maps, 
  initialMapId,
  scenarioId,
  scenarioStatusMode,
  initialHeroState,
  initialPosition,
  onTeleport,
  initialShowSettings = false
}) => {`;

content = content.replace(propsTarget, propsReplacement);

const initTarget = `  const showSettingsOnInit = location.search.includes('settings=true') || location.hash.includes('settings=true');
  const [showSettings, setShowSettings] = useState(showSettingsOnInit);`;

const initReplacement = `  const showSettingsOnInit = initialShowSettings || location.search.includes('settings=true') || location.hash.includes('settings=true');
  const [showSettings, setShowSettings] = useState(showSettingsOnInit);`;

content = content.replace(initTarget, initReplacement);

fs.writeFileSync('src/components/PhaserGameContainer.tsx', content);
console.log("Patched Phaser props");
