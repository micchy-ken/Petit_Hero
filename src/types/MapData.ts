import { FlagOperation } from './Flag';

export interface EventBranch {
  flagId: string;
  flagValue: any;
  flagIndex?: number;
  eventType: 'teleport' | 'monologue' | 'custom_event';
  eventData: {
    targetMap?: string;
    text?: string;
    eventId?: string;
  };
}

export interface MapEvent {
  x: number;
  y: number;
  type: string;
  data?: any;
  flagOperations?: FlagOperation[];
  requiredFlagId?: string;
  requiredFlagValue?: any;
  requiredFlagIndex?: number;
  branchFlagId?: string;
  branchFlagValue?: any;
  branchFlagIndex?: number;
  branchEventType?: 'start_point' | 'teleport' | 'monologue' | 'custom_event';
  branchEventData?: {
    fromMap?: string | null;
    targetMap?: string;
    text?: string;
    eventId?: string;
  };
  branches?: EventBranch[];
}


export interface MapItem {
  x: number;
  y: number;
  itemId: string;
  graphic?: string;
  requiredFlagId?: string;
  requiredFlagValue?: any;
  requiredFlagIndex?: number;
}

export interface MapObstacle {
  x: number;
  y: number;
  type: 'transparent' | 'pillar' | 'rock' | 'peg' | 'wall';
}

export interface MapClearConditions {
  explorationRate?: number | null; // 踏破率
  searchRate?: number | null;      // 捜索率
  defeatRate?: number | null;      // 撃破率
  requiredEvents?: string[];       // 必須イベント
}

export interface MapData {
  id: string;
  name: string;
  width: number;
  height: number;
  bgMode: 'text-black' | 'grass-green' | 'stone-gray' | 'image';
  bgImage?: string;
  events: MapEvent[];
  items: MapItem[];
  obstacles?: MapObstacle[];
  enemies: string[]; // 最大3種類
  maxEnemies?: number | 'infinite'; // 出現数
  boss?: string;     // 最大1種類
  clearConditions?: MapClearConditions;
  scenarioId?: string;
  forceManualMode?: boolean;
  bossDefeatFlagOperations?: FlagOperation[];
  enemySweepFlagOperations?: FlagOperation[];
}
