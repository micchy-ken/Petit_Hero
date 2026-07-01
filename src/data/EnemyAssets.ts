export interface EnemyAsset {
  id: string;
  name: string;
}

export const EnemyAssets: Record<string, EnemyAsset[]> = {
  'text-black': [
    { id: 'text_teki', name: '敵' },
  ],
  'stone-gray': [
    { id: 'gray_slime', name: '白黒スライム' },
  ],
  'color': [
    { id: 'color_slime_green', name: 'グリーンスライム' },
    { id: 'color_slime_red', name: 'レッドスライム' },
    { id: 'color_slime_blue', name: 'ブルースライム' },
    { id: 'color_goblin', name: 'ゴブリン' },
    { id: 'color_bat', name: 'コウモリ' },
  ],
};

export const BossAssets: Record<string, EnemyAsset[]> = {
  'text-black': [
    { id: 'text_boss', name: 'ボス' },
  ],
  'stone-gray': [
    { id: 'gray_boss', name: '白黒魔王' },
  ],
  'color': [
    { id: 'color_dragon', name: 'ドラゴン' },
    { id: 'color_demon_king', name: '魔王' },
  ],
};

export const getAvailableEnemies = (bgMode: string) => {
  if (bgMode === 'text-black') return EnemyAssets['text-black'];
  if (bgMode === 'stone-gray') return EnemyAssets['stone-gray'];
  return EnemyAssets['color'];
};

export const getAvailableBosses = (bgMode: string) => {
  if (bgMode === 'text-black') return BossAssets['text-black'];
  if (bgMode === 'stone-gray') return BossAssets['stone-gray'];
  return BossAssets['color'];
};
