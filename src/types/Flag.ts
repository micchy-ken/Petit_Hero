export type FlagType = 'toggle' | 'number' | 'array_toggle';

export interface Flag {
  id: string;
  name: string;
  type: FlagType;
  value: any; // Toggle: boolean, Number: number, ArrayToggle: boolean[]
  arraySize?: number; // ArrayToggleの場合のサイズ
}

export interface FlagOperation {
  flagId: string;
  action: 'set' | 'toggle' | 'add' | 'sub';
  value: any; // Toggle: boolean, Number: number, ArrayToggle: boolean (またはインデックスに対して設定する値)
  index?: number; // 配列トグルの場合のインデックス (0-indexed)
}

