export interface EnemyAsset {
  id: string;
  name: string;
  image?: string;
  hp: number;
  attack: number;
  defense: number;
  exp: number;
  speed: number;
  behavior: string;
  attackElement?: string;
  attackElementEnchantValue?: number;
  defenseElement?: string;
  defenseElementEnchantValue?: number;
}

export const EnemyAssets: Record<string, EnemyAsset[]> = {
  'text-black': [
    { id: 'text_teki', name: '敵', hp: 10, attack: 2, defense: 0, exp: 2, speed: 1000, behavior: 'seek' },
  ],
  'stone-gray': [
    { id: 'gray_slime', name: '白黒スライム', hp: 12, attack: 3, defense: 1, exp: 3, speed: 800, behavior: 'seek' },
  ],
  'color': [
    { id: 'color_slime_green', name: 'グリーンスライム', hp: 10, attack: 2, defense: 0, exp: 2, speed: 1000, behavior: 'random' },
    { id: 'color_slime_red', name: 'レッドスライム', hp: 15, attack: 4, defense: 2, exp: 4, speed: 900, behavior: 'seek', attackElement: 'fire', attackElementEnchantValue: 2, defenseElement: 'fire', defenseElementEnchantValue: 1 },
    { id: 'color_slime_blue', name: 'ブルースライム', hp: 12, attack: 3, defense: 1, exp: 3, speed: 800, behavior: 'seek', attackElement: 'water', attackElementEnchantValue: 2, defenseElement: 'water', defenseElementEnchantValue: 1 },
    { id: 'color_goblin', name: 'ゴブリン', hp: 20, attack: 5, defense: 2, exp: 5, speed: 700, behavior: 'seek' },
    { id: 'color_bat', name: 'コウモリ', hp: 8, attack: 2, defense: 0, exp: 1, speed: 500, behavior: 'random' },
    { id: 'color_golem', name: 'ゴーレム', hp: 45, attack: 10, defense: 6, exp: 12, speed: 1200, behavior: 'random' },
    { id: 'color_lizardman', name: 'リザードマン', hp: 30, attack: 7, defense: 3, exp: 8, speed: 800, behavior: 'seek' },
    { id: 'color_skeleton', name: 'ガイコツ', hp: 20, attack: 5, defense: 1, exp: 5, speed: 950, behavior: 'seek', defenseElement: 'dark', defenseElementEnchantValue: 2 },
    { id: 'color_swordsman', name: '剣士', hp: 28, attack: 8, defense: 2, exp: 9, speed: 750, behavior: 'seek' },
    { id: 'color_griffon', name: 'グリフォン', hp: 32, attack: 7, defense: 2, exp: 11, speed: 600, behavior: 'seek', attackElement: 'wind', attackElementEnchantValue: 2 },
  ],
};

export const BossAssets: Record<string, EnemyAsset[]> = {
  'text-black': [
    { id: 'text_boss', name: 'ボス', hp: 50, attack: 10, defense: 5, exp: 50, speed: 1200, behavior: 'seek' },
  ],
  'stone-gray': [
    { id: 'gray_boss', name: '白黒魔王', hp: 75, attack: 14, defense: 8, exp: 80, speed: 1000, behavior: 'rarely' },
  ],
  'color': [
    { id: 'color_dragon', name: 'ドラゴン', hp: 120, attack: 18, defense: 12, exp: 120, speed: 1000, behavior: 'rarely', attackElement: 'fire', attackElementEnchantValue: 5, defenseElement: 'fire', defenseElementEnchantValue: 4 },
    { id: 'color_demon_king', name: '魔王', hp: 180, attack: 25, defense: 15, exp: 250, speed: 1000, behavior: 'rarely', attackElement: 'dark', attackElementEnchantValue: 8, defenseElement: 'dark', defenseElementEnchantValue: 6 },
  ],
};

let dynamicEnemyAssets: Record<string, EnemyAsset[]> | null = null;
let dynamicBossAssets: Record<string, EnemyAsset[]> | null = null;

export const setDynamicAssets = (enemies: Record<string, EnemyAsset[]>, bosses: Record<string, EnemyAsset[]>) => {
  dynamicEnemyAssets = enemies;
  dynamicBossAssets = bosses;
};

export const getAvailableEnemies = (bgMode: string) => {
  const assets = dynamicEnemyAssets || EnemyAssets;
  if (bgMode === 'text-black') return assets['text-black'] || [];
  if (bgMode === 'stone-gray') return assets['stone-gray'] || [];
  return assets['color'] || [];
};

export const getAvailableBosses = (bgMode: string) => {
  const assets = dynamicBossAssets || BossAssets;
  if (bgMode === 'text-black') return assets['text-black'] || [];
  if (bgMode === 'stone-gray') return assets['stone-gray'] || [];
  return assets['color'] || [];
};

export const getEnemyAssetById = (id: string): EnemyAsset | undefined => {
  const enemies = dynamicEnemyAssets || EnemyAssets;
  const bosses = dynamicBossAssets || BossAssets;
  for (const bgMode in enemies) {
    const found = enemies[bgMode].find(e => e.id === id);
    if (found) return found;
  }
  for (const bgMode in bosses) {
    const found = bosses[bgMode].find(e => e.id === id);
    if (found) return found;
  }
  return undefined;
};




