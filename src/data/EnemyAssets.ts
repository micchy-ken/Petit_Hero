export interface EnemyAsset {
  id: string;
  name: string;
  image?: string;
  hp: number;
  attack: number;
  speed: number;
  behavior: string;
}

export const EnemyAssets: Record<string, EnemyAsset[]> = {
  'text-black': [
    { id: 'text_teki', name: '敵', hp: 10, attack: 2, speed: 1000, behavior: 'seek' },
  ],
  'stone-gray': [
    { id: 'gray_slime', name: '白黒スライム', hp: 12, attack: 3, speed: 800, behavior: 'seek' },
  ],
  'color': [
    { id: 'color_slime_green', name: 'グリーンスライム', hp: 10, attack: 2, speed: 1000, behavior: 'random' },
    { id: 'color_slime_red', name: 'レッドスライム', hp: 15, attack: 4, speed: 900, behavior: 'seek' },
    { id: 'color_slime_blue', name: 'ブルースライム', hp: 12, attack: 3, speed: 800, behavior: 'seek' },
    { id: 'color_goblin', name: 'ゴブリン', hp: 20, attack: 5, speed: 700, behavior: 'seek' },
    { id: 'color_bat', name: 'コウモリ', hp: 8, attack: 2, speed: 500, behavior: 'random' },
  ],
};

export const BossAssets: Record<string, EnemyAsset[]> = {
  'text-black': [
    { id: 'text_boss', name: 'ボス', hp: 50, attack: 10, speed: 1200, behavior: 'seek' },
  ],
  'stone-gray': [
    { id: 'gray_boss', name: '白黒魔王', hp: 60, attack: 12, speed: 1000, behavior: 'seek' },
  ],
  'color': [
    { id: 'color_dragon', name: 'ドラゴン', hp: 80, attack: 15, speed: 1500, behavior: 'seek' },
    { id: 'color_demon_king', name: '魔王', hp: 100, attack: 20, speed: 800, behavior: 'seek' },
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




