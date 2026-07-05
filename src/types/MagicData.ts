export interface MagicData {
  id: string;
  name: string;
  attribute: 'fire' | 'ice';
  power: number;
  interval: number;
  acquisitionType: 'item' | 'event' | 'level';
  acquisitionValue: string;
}
