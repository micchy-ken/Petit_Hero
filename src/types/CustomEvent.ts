export interface ConversationNode {
  id: string;
  speakerName: string;
  portraitId?: 'hero' | 'villager' | 'none';
  message: string;
}

export interface CustomEvent {
  id: string;
  name: string;
  type: 'conversation';
  nodes: ConversationNode[];
}
