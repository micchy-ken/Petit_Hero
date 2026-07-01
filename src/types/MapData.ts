export interface MapEvent {
  x: number;
  y: number;
  type: string;
  data?: any;
}

export interface MapItem {
  x: number;
  y: number;
  itemId: string;
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
  enemies: string[];
}
