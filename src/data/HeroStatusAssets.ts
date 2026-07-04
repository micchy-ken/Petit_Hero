import { HeroStatus } from '../types/HeroStatus';

export const DefaultHeroStatus: HeroStatus[] = [
  { level: 1, maxHp: 20, attack: 5, defense: 0, requiredExp: 10 },
  { level: 2, maxHp: 25, attack: 7, defense: 1, requiredExp: 20 },
  { level: 3, maxHp: 30, attack: 9, defense: 2, requiredExp: 40 },
  { level: 4, maxHp: 35, attack: 11, defense: 3, requiredExp: 70 },
  { level: 5, maxHp: 45, attack: 14, defense: 4, requiredExp: 110 },
  { level: 6, maxHp: 55, attack: 17, defense: 5, requiredExp: 160 },
  { level: 7, maxHp: 65, attack: 20, defense: 6, requiredExp: 220 },
  { level: 8, maxHp: 80, attack: 25, defense: 8, requiredExp: 300 },
  { level: 9, maxHp: 100, attack: 30, defense: 10, requiredExp: 400 },
  { level: 10, maxHp: 120, attack: 35, defense: 12, requiredExp: 9999 },
];

let dynamicHeroStatus: HeroStatus[] | null = null;

export const setDynamicHeroStatus = (statusList: HeroStatus[]) => {
  dynamicHeroStatus = statusList;
};

export const getHeroStatusByLevel = (level: number): HeroStatus | undefined => {
  const assets = dynamicHeroStatus || DefaultHeroStatus;
  return assets.find(s => s.level === level);
};

export const getAllHeroStatus = (): HeroStatus[] => {
  return dynamicHeroStatus || DefaultHeroStatus;
};
