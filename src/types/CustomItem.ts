export type ItemType = 'equipment' | 'magic' | 'move_asset' | 'event' | 'drop' | 'artifact';

export interface CustomItem {
  id: string;
  name: string;
  chestGraphic: string; // Predefined chest visual key, e.g., '🎁', '📦', '💎', '⭐', '💀', '🔔'
  type: ItemType;
  description: string;
}
