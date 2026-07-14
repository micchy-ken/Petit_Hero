import { FlagOperation } from './Flag';

export interface ConversationNode {
  id: string;
  speakerName: string;
  portraitId?: string;
  message: string;
  type?: 'message' | 'flag';
  flagOperations?: FlagOperation[];
}


export interface CustomEvent {
  id: string;
  name: string;
  type: 'conversation';
  nodes: ConversationNode[];
  mapId?: string;
}
