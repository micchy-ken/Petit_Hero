export interface ConversationNode {
  id: string;
  speakerName: string;
  portraitId?: string;
  message: string;
}

export interface CustomEvent {
  id: string;
  name: string;
  type: 'conversation';
  nodes: ConversationNode[];
  mapId?: string;
}
