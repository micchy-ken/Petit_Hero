export interface MagicData {
  id: string;
  name: string;
  attribute: 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark' | 'ice' | '';
  power: number;
  interval: number;
  acquisitionType: 'item' | 'event' | 'level';
  acquisitionValue: string;
}
