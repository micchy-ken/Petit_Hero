import Phaser from 'phaser';
import { generateHeroSpritesheet } from './HeroSpritesheet';
import {
  generateSlimeSpritesheet,
  generateBatSpritesheet,
  generateGoblinSpritesheet,
  generateDemonKingSpritesheet,
  generateDragonSpritesheet,
  generateGolemSpritesheet,
  generateLizardmanSpritesheet,
  generateSkeletonSpritesheet,
  generateSwordsmanSpritesheet,
  generateGriffonSpritesheet
} from './MonsterSpritesheets';
import { generateObstacleTextures } from './ObstacleTextures';
import { getEnemyAssetById, EnemyAsset, getAvailableEnemies } from '../data/EnemyAssets';
import { getHeroStatusByLevel, getAllHeroStatus } from '../data/HeroStatusAssets';
// @ts-ignore
import grassBgUrl from '../../public/grass_bg_1782776475818.jpg';

export type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right' | 'idle';

export interface HeroState {
  gridX: number;
  gridY: number;
  camGridX: number;
  camGridY: number;
  direction: Direction;
  isMoving: boolean;
  isScrolling: boolean;
  speedMs: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  level: number;
  exp: number;
  requiredExp: number;
  acquiredItems?: string[];
  equippedWeaponId?: string | null;
  equippedArmorId?: string | null;
  equippedAccessoryId?: string | null;
  baseAttack?: number;
  baseDefense?: number;
  displayMode?: 'normal' | 'text' | 'grayscale';
}

interface SlimeData {
  id: string;
  name?: string;
  sprite: Phaser.GameObjects.Sprite;
  gridX: number;
  gridY: number;
  targetGridX?: number;
  targetGridY?: number;
  isMoving: boolean;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  exp: number;
  speed: number;
  behavior: string;
  lastMoveTime?: number;
  enemyId: string;
  direction: Direction;
  attackElement?: string;
  attackElementEnchantValue?: number;
  defenseElement?: string;
  defenseElementEnchantValue?: number;
}

export interface ActionLog {
  id: string;
  message: string;
  type: 'info' | 'combat' | 'system' | 'damage';
}

export class GridMovementScene extends Phaser.Scene {
  public static readonly GRID_SIZE = 64;
  public static readonly VIEWPORT_COLS = 7;
  public static readonly VIEWPORT_ROWS = 7;

  private hero!: Phaser.GameObjects.Sprite;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private targetMarker!: Phaser.GameObjects.Graphics;
  private hd2dLighting!: Phaser.GameObjects.Graphics;
  private vignetteOverlay!: Phaser.GameObjects.Graphics;
  private particleMotes!: Phaser.GameObjects.Arc[];
  private visitedTraceGraphics?: Phaser.GameObjects.Graphics;
  private grassBgImage?: Phaser.GameObjects.Image;
  private useGrassBg: boolean = true;
  private allow8Way: boolean = false;
  private isTextMode: boolean = true;
  private displayMode: 'normal' | 'text' | 'grayscale' = 'text';

  private get is8WayEnabled(): boolean {
    if (this.isHd2dEffectsEnabled || (this.displayMode === 'normal' && this.useGrassBg)) {
      return true;
    }
    return this.allow8Way;
  }
  public tracerColor: 'green' | 'blue' | 'red' | 'gray' | 'none' = 'green';
  public customItems: any[] = [];
  public magics: any[] = [];
  public acquiredItems: Set<string> = new Set();
  private lastMagicCastTime: Record<string, number> = {};
  private slimes: SlimeData[] = [];
  private itemSprites: { gridX: number, gridY: number, sprite: Phaser.GameObjects.GameObject, itemId: string }[] = [];
  private obstacleSprites: { gridX: number, gridY: number, sprite: Phaser.GameObjects.GameObject, type: string }[] = [];
  private teleportPortals: { x: number, y: number, container: Phaser.GameObjects.Container, met: boolean }[] = [];

  private playedMapEvents: Set<string> = new Set();
  
  private getGlobalPlayedEvents(): Set<string> {
    try {
      const data = localStorage.getItem('playedGlobalEvents');
      return data ? new Set(JSON.parse(data)) : new Set();
    } catch {
      return new Set();
    }
  }
  
  private addGlobalPlayedEvent(eventId: string) {
    const set = this.getGlobalPlayedEvents();
    set.add(eventId);
    localStorage.setItem('playedGlobalEvents', JSON.stringify(Array.from(set)));
  }

  private canPlayEvent(event: any): boolean {
    const mode = event.data?.playMode || 'always';
    if (mode === 'always') return true;
    const uniqueId = `${this.mapData?.id}_${event.x}_${event.y}_${event.type}`;
    if (mode === 'once_per_map') {
      if (this.playedMapEvents.has(uniqueId)) return false;
    } else if (mode === 'once_global') {
      const globalSet = this.getGlobalPlayedEvents();
      if (globalSet.has(uniqueId)) return false;
    }
    return true;
  }
  
  private markEventPlayed(event: any) {
    const mode = event.data?.playMode || 'always';
    if (mode === 'always') return;
    const uniqueId = `${this.mapData?.id}_${event.x}_${event.y}_${event.type}`;
    if (mode === 'once_per_map') {
      this.playedMapEvents.add(uniqueId);
    } else if (mode === 'once_global') {
      this.addGlobalPlayedEvent(uniqueId);
    }
  }

  // モノローグ管理
  private monologueContainer?: Phaser.GameObjects.Container;
  private monologueTextElement?: Phaser.GameObjects.Text;
  public isShowingMonologue: boolean = false;
  public messageWaitMode: string = 'event_only';
  public messageAutoAdvanceSeconds: number = 2;
  private messageQueue: { type: string, text: string, onComplete?: () => void }[] = [];
  private monologueAutoAdvanceTimer: Phaser.Time.TimerEvent | null = null;
  private pendingTeleportAction: (() => void) | null = null;

  // 状態管理
  private currentGridX: number = 7; // 16x16の中央付近(7,7)
  private currentGridY: number = 7;
  private heroTargetGridX: number | null = null;
  private heroTargetGridY: number | null = null;
  private currentCamGridX: number = 4; // 7x7画面の中央に(7,7)が来るようカメラ左上を(4,4)に設定
  private currentCamGridY: number = 4;
  private isMoving: boolean = false;
  private currentDirection: Direction = 'idle';
  
  // 設定
  private moveSpeedMs: number = 1000; // 1グリッド移動にかかる時間(ms)
  private autoMode: 'none' | 'random' | 'seek' = 'seek';
  public movementBehavior: string = 'unvisited';
  public combatBehavior: string = 'closest_enemy';
  public goalBehavior: string = 'seek_visible';
  private showGridLines: boolean = true;
  private isHd2dEffectsEnabled: boolean = false;
  public isTurboActive: boolean = false;

  // ヒーローステータス
  private heroHp: number = 20;
  private heroMaxHp: number = 20;
  private heroAttack: number = 5;
  private heroDefense: number = 0;
  private heroAttackElement: string = '';
  private heroAttackElementEnchantValue: number = 0;
  private heroDefenseElement: string = '';
  private heroDefenseElementEnchantValue: number = 0;
  private baseHeroAttack: number = 5;
  private baseHeroDefense: number = 0;
  public equippedWeaponId: string | null = null;
  public equippedArmorId: string | null = null;
  public equippedAccessoryId: string | null = null;
  private heroLevel: number = 1;
  private heroExp: number = 0;
  private lastFireMagicTime: number = 0;
  private lastIceMagicTime: number = 0;

  // Pointer Movement
  private pointerTargetGridX: number | null = null;
  private pointerTargetGridY: number | null = null;

  // Keyboard Movement
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: any;

  // Virtual Pad Movement
  private virtualInput = { up: false, down: false, left: false, right: false };

  public setVirtualInput(dir: 'up'|'down'|'left'|'right', isDown: boolean) {
    this.virtualInput[dir] = isDown;
  }

  // Reactコールバック用
  private onStateChangeCallback?: (state: HeroState) => void;
  private onLogCallback?: (log: ActionLog) => void;
  public setOnStatsChange?: (expRate: number, searchRate: number, defeatRate: number | null) => void;
  public onTestPlayClear?: () => void;
  public onTeleport?: (targetMapId: string) => void;

  private visitedGrids: Set<string> = new Set();
  private viewedGrids: Set<string> = new Set();
  
  private totalEnemiesSpawned: number = 0;
  private enemiesDefeated: number = 0;
  private bossSpawned: boolean = false;
  private bossDefeated: boolean = false;
  private bossAnnouncementSent: boolean = false;
  public isSettingsPaused: boolean = false;
  
  public gridCols: number = 16;
  public gridRows: number = 16;
  public mapData: any = null;

  private totalGrids: number = 16 * 16;

  constructor() {
    super({ key: 'GridMovementScene' });
  }

  public onCustomEventCallback?: (eventId: string, onComplete: () => void) => void;
  public onSystemMessageCallback?: (type: string, text: string, onComplete: () => void) => void;
  public onCustomItemsChangeCallback?: (items: any[]) => void;

  public setOnCustomItemsChange(callback: (items: any[]) => void) {
    this.onCustomItemsChangeCallback = callback;
  }

  public setOnCustomEvent(callback: (eventId: string, onComplete: () => void) => void) {
    this.onCustomEventCallback = callback;
  }

  public setOnStateChange(callback: (state: HeroState) => void) {
    this.onStateChangeCallback = callback;
    this.notifyStateChange();
  }

  public setOnLog(callback: (log: ActionLog) => void) {
    this.onLogCallback = callback;
  }

  public sendLog(message: string, type: ActionLog['type'] = 'info') {
    if (this.onLogCallback) {
      this.onLogCallback({
        id: Math.random().toString(36).substring(2, 9),
        message,
        type
      });
    }
  }

  preload() {
    this.load.image('grass_bg', grassBgUrl);
    generateHeroSpritesheet(this, 'normal');
    generateHeroSpritesheet(this, 'text');
    generateHeroSpritesheet(this, 'grayscale');
    generateSlimeSpritesheet(this, 'normal');
    generateSlimeSpritesheet(this, 'green');
    generateSlimeSpritesheet(this, 'red');
    generateSlimeSpritesheet(this, 'text');
    generateSlimeSpritesheet(this, 'grayscale');
    generateBatSpritesheet(this, 'normal');
    generateBatSpritesheet(this, 'text');
    generateBatSpritesheet(this, 'grayscale');
    generateGoblinSpritesheet(this, 'normal');
    generateGoblinSpritesheet(this, 'text');
    generateGoblinSpritesheet(this, 'grayscale');
    generateGolemSpritesheet(this, 'normal');
    generateGolemSpritesheet(this, 'text');
    generateGolemSpritesheet(this, 'grayscale');
    generateLizardmanSpritesheet(this, 'normal');
    generateLizardmanSpritesheet(this, 'text');
    generateLizardmanSpritesheet(this, 'grayscale');
    generateSkeletonSpritesheet(this, 'normal');
    generateSkeletonSpritesheet(this, 'text');
    generateSkeletonSpritesheet(this, 'grayscale');
    generateSwordsmanSpritesheet(this, 'normal');
    generateSwordsmanSpritesheet(this, 'text');
    generateSwordsmanSpritesheet(this, 'grayscale');
    generateGriffonSpritesheet(this, 'normal');
    generateGriffonSpritesheet(this, 'text');
    generateGriffonSpritesheet(this, 'grayscale');
    generateDemonKingSpritesheet(this, 'normal');
    generateDemonKingSpritesheet(this, 'grayscale');
    generateDragonSpritesheet(this);
    generateObstacleTextures(this);
  }

  create() {
    const { GRID_SIZE, VIEWPORT_COLS, VIEWPORT_ROWS } = GridMovementScene;

    const initialStatus = getHeroStatusByLevel(this.heroLevel);
    if (initialStatus) {
      this.heroMaxHp = initialStatus.maxHp;
      this.heroHp = this.heroMaxHp;
      this.baseHeroAttack = initialStatus.attack;
      this.baseHeroDefense = initialStatus.defense;
    }
    this.recalculateStats();

    // カメラ境界を設定
    this.cameras.main.setBounds(0, 0, this.gridCols * GRID_SIZE, this.gridRows * GRID_SIZE);
    this.cameras.main.scrollX = this.currentCamGridX * GRID_SIZE;
    this.cameras.main.scrollY = this.currentCamGridY * GRID_SIZE;

    // 1. 背景画像とグリッドの作成
    this.grassBgImage = this.add.image(0, 0, 'grass_bg').setOrigin(0, 0);
    this.grassBgImage.setDepth(-1);
    this.createGridBackground();

    // 2. HD-2D 環境光＆ゴッドレイ風オーバーレイ (カメラ固定)
    this.hd2dLighting = this.add.graphics();
    this.hd2dLighting.setDepth(2);
    this.hd2dLighting.setScrollFactor(0, 0);
    this.drawHd2dLighting();

    // 3. 移動先ターゲットのマーカー
    this.targetMarker = this.add.graphics();
    this.targetMarker.setDepth(3);

    // 4. アニメーション定義 (4方向 × 4フレーム)
    const dirs: { key: Direction; row: number }[] = [
      { key: 'down', row: 0 },
      { key: 'up', row: 1 },
      { key: 'left', row: 2 },
      { key: 'right', row: 3 }
    ];

    dirs.forEach(({ key, row }) => {
      const startFrame = row * 4;
      
      // normal textures
      this.anims.create({
        key: `walk-${key}`,
        frames: this.anims.generateFrameNumbers('hero_spritesheet', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 8,
        repeat: -1
      });

      this.anims.create({
        key: `idle-${key}`,
        frames: [{ key: 'hero_spritesheet', frame: startFrame }],
        frameRate: 1
      });

      // text mode textures
      this.anims.create({
        key: `walk-${key}-text`,
        frames: this.anims.generateFrameNumbers('hero_spritesheet_text', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 8,
        repeat: -1
      });

      this.anims.create({
        key: `idle-${key}-text`,
        frames: [{ key: 'hero_spritesheet_text', frame: startFrame }],
        frameRate: 1
      });

      // grayscale mode textures
      this.anims.create({
        key: `walk-${key}-gray`,
        frames: this.anims.generateFrameNumbers('hero_spritesheet_gray', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 8,
        repeat: -1
      });

      this.anims.create({
        key: `idle-${key}-gray`,
        frames: [{ key: 'hero_spritesheet_gray', frame: startFrame }],
        frameRate: 1
      });
    });

    // スライムのアニメーション (ブルー)
    this.anims.create({
      key: 'slime-idle',
      frames: [{ key: 'slime_spritesheet', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'slime-shake',
      frames: this.anims.generateFrameNumbers('slime_spritesheet', { start: 1, end: 2 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'slime-jump',
      frames: [{ key: 'slime_spritesheet', frame: 3 }],
      frameRate: 1
    });

    // スライムのアニメーション (グリーン)
    this.anims.create({
      key: 'slime-idle-green',
      frames: [{ key: 'slime_spritesheet_green', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'slime-shake-green',
      frames: this.anims.generateFrameNumbers('slime_spritesheet_green', { start: 1, end: 2 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'slime-jump-green',
      frames: [{ key: 'slime_spritesheet_green', frame: 3 }],
      frameRate: 1
    });

    // スライムのアニメーション (レッド)
    this.anims.create({
      key: 'slime-idle-red',
      frames: [{ key: 'slime_spritesheet_red', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'slime-shake-red',
      frames: this.anims.generateFrameNumbers('slime_spritesheet_red', { start: 1, end: 2 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'slime-jump-red',
      frames: [{ key: 'slime_spritesheet_red', frame: 3 }],
      frameRate: 1
    });

    // スライムのアニメーション (text mode)
    this.anims.create({
      key: 'slime-idle-text',
      frames: [{ key: 'slime_spritesheet_text', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'slime-shake-text',
      frames: this.anims.generateFrameNumbers('slime_spritesheet_text', { start: 1, end: 2 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'slime-jump-text',
      frames: [{ key: 'slime_spritesheet_text', frame: 3 }],
      frameRate: 1
    });

    // スライムのアニメーション (grayscale mode)
    this.anims.create({
      key: 'slime-idle-gray',
      frames: [{ key: 'slime_spritesheet_gray', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'slime-shake-gray',
      frames: this.anims.generateFrameNumbers('slime_spritesheet_gray', { start: 1, end: 2 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'slime-jump-gray',
      frames: [{ key: 'slime_spritesheet_gray', frame: 3 }],
      frameRate: 1
    });

    // コウモリのアニメーション
    this.anims.create({
      key: 'bat-idle',
      frames: this.anims.generateFrameNumbers('bat_spritesheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'bat-idle-text',
      frames: [{ key: 'bat_spritesheet_text', frame: 0 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'bat-idle-gray',
      frames: this.anims.generateFrameNumbers('bat_spritesheet_gray', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    // ゴブリンのアニメーション
    const gobDirs: { key: Direction; row: number }[] = [
      { key: 'down', row: 0 },
      { key: 'up', row: 1 },
      { key: 'left', row: 2 },
      { key: 'right', row: 3 }
    ];
    gobDirs.forEach(({ key, row }) => {
      const startFrame = row * 4;
      
      this.anims.create({
        key: `goblin-walk-${key}`,
        frames: this.anims.generateFrameNumbers('goblin_spritesheet', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 8,
        repeat: -1
      });

      this.anims.create({
        key: `goblin-idle-${key}`,
        frames: [{ key: 'goblin_spritesheet', frame: startFrame }],
        frameRate: 1
      });

      this.anims.create({
        key: `goblin-walk-${key}-gray`,
        frames: this.anims.generateFrameNumbers('goblin_spritesheet_gray', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 8,
        repeat: -1
      });

      this.anims.create({
        key: `goblin-idle-${key}-gray`,
        frames: [{ key: 'goblin_spritesheet_gray', frame: startFrame }],
        frameRate: 1
      });
    });

    // 新モンスター5体のアニメーション（golem, lizardman, skeleton, swordsman, griffon）
    const newMonsters = ['golem', 'lizardman', 'skeleton', 'swordsman', 'griffon'];
    const standardDirs: { key: Direction; row: number }[] = [
      { key: 'down', row: 0 },
      { key: 'up', row: 1 },
      { key: 'left', row: 2 },
      { key: 'right', row: 3 }
    ];

    newMonsters.forEach(mName => {
      standardDirs.forEach(({ key, row }) => {
        const startFrame = row * 4;
        
        // カラー版歩き・待機
        this.anims.create({
          key: `${mName}-walk-${key}`,
          frames: this.anims.generateFrameNumbers(`${mName}_spritesheet`, {
            start: startFrame,
            end: startFrame + 3
          }),
          frameRate: 8,
          repeat: -1
        });
        this.anims.create({
          key: `${mName}-idle-${key}`,
          frames: [{ key: `${mName}_spritesheet`, frame: startFrame }],
          frameRate: 1
        });

        // 白黒版歩き・待機
        this.anims.create({
          key: `${mName}-walk-${key}-gray`,
          frames: this.anims.generateFrameNumbers(`${mName}_spritesheet_gray`, {
            start: startFrame,
            end: startFrame + 3
          }),
          frameRate: 8,
          repeat: -1
        });
        this.anims.create({
          key: `${mName}-idle-${key}-gray`,
          frames: [{ key: `${mName}_spritesheet_gray`, frame: startFrame }],
          frameRate: 1
        });
      });
    });

    // 魔王 & ドラゴンのアニメーション
    const bossDirs: { key: Direction; row: number }[] = [
      { key: 'down', row: 0 },
      { key: 'up', row: 1 },
      { key: 'left', row: 2 },
      { key: 'right', row: 3 }
    ];
    bossDirs.forEach(({ key, row }) => {
      const startFrame = row * 4;
      
      // 魔王カラー
      this.anims.create({
        key: `demon_king-walk-${key}`,
        frames: this.anims.generateFrameNumbers('demon_king_spritesheet', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 6,
        repeat: -1
      });
      this.anims.create({
        key: `demon_king-idle-${key}`,
        frames: [{ key: 'demon_king_spritesheet', frame: startFrame }],
        frameRate: 1
      });

      // 魔王白黒
      this.anims.create({
        key: `demon_king-walk-${key}-gray`,
        frames: this.anims.generateFrameNumbers('demon_king_spritesheet_gray', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 6,
        repeat: -1
      });
      this.anims.create({
        key: `demon_king-idle-${key}-gray`,
        frames: [{ key: 'demon_king_spritesheet_gray', frame: startFrame }],
        frameRate: 1
      });

      // ドラゴンカラー
      this.anims.create({
        key: `dragon-walk-${key}`,
        frames: this.anims.generateFrameNumbers('dragon_spritesheet', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 6,
        repeat: -1
      });
      this.anims.create({
        key: `dragon-idle-${key}`,
        frames: [{ key: 'dragon_spritesheet', frame: startFrame }],
        frameRate: 1
      });

      // ドラゴン白黒
      this.anims.create({
        key: `dragon-walk-${key}-gray`,
        frames: this.anims.generateFrameNumbers('dragon_spritesheet', {
          start: startFrame,
          end: startFrame + 3
        }),
        frameRate: 6,
        repeat: -1
      });
      this.anims.create({
        key: `dragon-idle-${key}-gray`,
        frames: [{ key: 'dragon_spritesheet', frame: startFrame }],
        frameRate: 1
      });
    });

    // 5. 勇者スプライト配置
    const startX = this.currentGridX * GRID_SIZE + GRID_SIZE / 2;
    const startY = this.currentGridY * GRID_SIZE + GRID_SIZE / 2;

    this.hero = this.add.sprite(startX, startY, 'hero_spritesheet', 0);
    this.hero.setDepth(10);
    this.hero.play(this.getAnimKey('idle-down'));

    // 6. HD-2D マナ粒子（ホタル風パーティクル）の生成（カメラ固定領域内で生成）
    this.particleMotes = [];
    for (let i = 0; i < 20; i++) {
      const px = Phaser.Math.Between(0, VIEWPORT_COLS * GRID_SIZE);
      const py = Phaser.Math.Between(0, VIEWPORT_ROWS * GRID_SIZE);
      const radius = Phaser.Math.FloatBetween(1, 2.8);
      const color = Phaser.Math.RND.pick([0xfef08a, 0xa5f3fc, 0xffffff, 0xbbf7d0]);
      
      const mote = this.add.circle(px, py, radius, color, Phaser.Math.FloatBetween(0.3, 0.85));
      mote.setDepth(15);
      mote.setScrollFactor(0, 0); // 常に画面内に表示
      this.particleMotes.push(mote);

      // ふわふわ漂うトゥイーン
      this.startMoteAnimation(mote);
    }

    // 7. HD-2D ヴィネット（シネマティック枠）(カメラ固定)
    this.vignetteOverlay = this.add.graphics();
    this.vignetteOverlay.setDepth(20);
    this.vignetteOverlay.setScrollFactor(0, 0);
    this.drawVignette();

    // 8. 初回ステータス通知
    this.notifyStateChange();

    // 9. キーボード入力の初期化
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = this.input.keyboard.addKeys('W,S,A,D');
    }

    // 10. ポインター入力による移動処理
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.autoMode !== 'none') {
        this.pointerTargetGridX = null;
        this.pointerTargetGridY = null;
        return;
      }
      
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const targetGridX = Math.floor(worldPoint.x / GridMovementScene.GRID_SIZE);
      const targetGridY = Math.floor(worldPoint.y / GridMovementScene.GRID_SIZE);
      
      // フィールド範囲内か確認
      if (targetGridX >= 0 && targetGridX < this.gridCols &&
          targetGridY >= 0 && targetGridY < this.gridRows) {
        this.pointerTargetGridX = targetGridX;
        this.pointerTargetGridY = targetGridY;
        this.sendLog(`(${targetGridX}, ${targetGridY}) へ移動中...`, 'system');
      }
    });

    // 10. AI/自動移動タイマー
    this.time.addEvent({
      delay: 100,
      callback: this.checkAndMoveRandomly,
      callbackScope: this,
      loop: true
    });

    // 初期表示設定の適用
    this.setDisplayMode(this.displayMode);
    this.toggleHd2dEffects(this.isHd2dEffectsEnabled);

    // Initial stats trigger
    this.updateStats(this.currentGridX, this.currentGridY, this.currentCamGridX, this.currentCamGridY);

    if (this.isSettingsPaused) {
      if (this.anims) {
        this.anims.pauseAll();
      }
    }
  }

  public update(time: number, delta: number) {
    if (this.isSettingsPaused) {
      if (this.anims && !this.anims.paused) {
        this.anims.pauseAll();
      }
      return;
    } else {
      if (this.anims && this.anims.paused) {
        this.anims.resumeAll();
      }
    }
    if (this.isShowingMonologue) return;
    
    // 魔法自動詠唱
    if (this.slimes.length > 0) {
      this.magics.forEach(magic => {
        let hasMagic = false;
        if (magic.acquisitionType === 'item') {
          const acquiredByMagicId = this.customItems.some((item: any) => item.targetMagicId === magic.id && this.acquiredItems.has(item.id));
          hasMagic = this.acquiredItems.has(magic.acquisitionValue) || acquiredByMagicId;
        } else if (magic.acquisitionType === 'event') {
          // Check if event was played (using basic string inclusion for now or if event ID matches)
          hasMagic = Array.from(this.playedMapEvents).some(id => id.includes(magic.acquisitionValue)) || 
                     Array.from(this.getGlobalPlayedEvents()).some(id => id.includes(magic.acquisitionValue));
        } else if (magic.acquisitionType === 'level') {
          hasMagic = this.heroLevel >= Number(magic.acquisitionValue);
        }

        if (hasMagic) {
          const lastTime = this.lastMagicCastTime[magic.id] || 0;
          const intervalMs = (magic.interval || 3) * 1000;
          if (time - lastTime > intervalMs) {
            this.castMagic(magic);
            this.lastMagicCastTime[magic.id] = time;
          }
        }
      });
    }

    if (this.autoMode === 'none' && !this.isMoving) {
      let moved = false;
      
      const up = this.cursors?.up.isDown || this.wasdKeys?.W.isDown || this.virtualInput.up;
      const down = this.cursors?.down.isDown || this.wasdKeys?.S.isDown || this.virtualInput.down;
      const left = this.cursors?.left.isDown || this.wasdKeys?.A.isDown || this.virtualInput.left;
      const right = this.cursors?.right.isDown || this.wasdKeys?.D.isDown || this.virtualInput.right;

      if (this.is8WayEnabled) {
        if (up && left) {
          this.pointerTargetGridX = null;
          this.pointerTargetGridY = null;
          this.moveInDirection('up-left');
          moved = true;
        } else if (up && right) {
          this.pointerTargetGridX = null;
          this.pointerTargetGridY = null;
          this.moveInDirection('up-right');
          moved = true;
        } else if (down && left) {
          this.pointerTargetGridX = null;
          this.pointerTargetGridY = null;
          this.moveInDirection('down-left');
          moved = true;
        } else if (down && right) {
          this.pointerTargetGridX = null;
          this.pointerTargetGridY = null;
          this.moveInDirection('down-right');
          moved = true;
        }
      }

      if (!moved) {
        if (up) {
          this.pointerTargetGridX = null;
          this.pointerTargetGridY = null;
          this.moveInDirection('up');
        } else if (down) {
          this.pointerTargetGridX = null;
          this.pointerTargetGridY = null;
          this.moveInDirection('down');
        } else if (left) {
          this.pointerTargetGridX = null;
          this.pointerTargetGridY = null;
          this.moveInDirection('left');
        } else if (right) {
          this.pointerTargetGridX = null;
          this.pointerTargetGridY = null;
          this.moveInDirection('right');
        }
      }
    }
  }

  private startMoteAnimation(mote: Phaser.GameObjects.Arc) {
    const targetX = mote.x + Phaser.Math.Between(-40, 40);
    const targetY = mote.y - Phaser.Math.Between(20, 60);
    const duration = Phaser.Math.Between(3000, 7000);

    this.tweens.add({
      targets: mote,
      x: targetX,
      y: targetY,
      alpha: { from: mote.alpha, to: 0.1 },
      duration: duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        const { GRID_SIZE, VIEWPORT_COLS, VIEWPORT_ROWS } = GridMovementScene;
        mote.setPosition(Phaser.Math.Between(0, VIEWPORT_COLS * GRID_SIZE), VIEWPORT_ROWS * GRID_SIZE + 10);
        mote.setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));
        this.startMoteAnimation(mote);
      }
    });
  }

  private createGridBackground() {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(0);
    this.drawGrid();

    this.visitedTraceGraphics = this.add.graphics();
    this.visitedTraceGraphics.setDepth(1);
    this.drawVisitedTrace();
  }

  private drawGrid() {
    if (!this.gridGraphics) return;
    const { GRID_SIZE } = GridMovementScene;
    this.gridGraphics.clear();

    if (this.grassBgImage) {
      this.grassBgImage.setVisible(this.displayMode === 'normal' && this.useGrassBg);
      this.grassBgImage.setDisplaySize(this.gridCols * GRID_SIZE, this.gridRows * GRID_SIZE);
    }

    if (this.displayMode === 'text') {
      if (this.showGridLines) {
        this.gridGraphics.lineStyle(1, 0xffffff, 0.3);
        for (let i = 0; i <= this.gridRows; i++) {
          this.gridGraphics.moveTo(0, i * GRID_SIZE);
          this.gridGraphics.lineTo(this.gridCols * GRID_SIZE, i * GRID_SIZE);
        }
        for (let i = 0; i <= this.gridCols; i++) {
          this.gridGraphics.moveTo(i * GRID_SIZE, 0);
          this.gridGraphics.lineTo(i * GRID_SIZE, this.gridRows * GRID_SIZE);
        }
        this.gridGraphics.strokePath();
      }
      return;
    }

    if (this.displayMode === 'grayscale') {
      // Background is white
      this.gridGraphics.fillStyle(0xffffff, 1);
      this.gridGraphics.fillRect(0, 0, this.gridCols * GRID_SIZE, this.gridRows * GRID_SIZE);

      // Draw occasional stones
      for (let row = 0; row < this.gridRows; row++) {
        for (let col = 0; col < this.gridCols; col++) {
          const landmarkHash = (row * 37 + col * 17) % 13;
          if (landmarkHash === 4 || landmarkHash === 8) {
            const ox = col * GRID_SIZE + 24;
            const oy = row * GRID_SIZE + 24;
            // Stone Outline
            this.gridGraphics.fillStyle(0x444444, 1);
            this.gridGraphics.fillRect(ox, oy, 12, 8);
            this.gridGraphics.fillRect(ox + 2, oy - 2, 8, 12);
            // Stone Body
            this.gridGraphics.fillStyle(0x888888, 1);
            this.gridGraphics.fillRect(ox + 2, oy, 8, 6);
            this.gridGraphics.fillRect(ox + 4, oy - 1, 4, 8);
            // Highlight
            this.gridGraphics.fillStyle(0xdddddd, 1);
            this.gridGraphics.fillRect(ox + 4, oy, 2, 2);
          }
        }
      }

      if (this.showGridLines) {
        this.gridGraphics.lineStyle(1, 0xcccccc, 0.7);
        for (let i = 0; i <= this.gridRows; i++) {
          this.gridGraphics.moveTo(0, i * GRID_SIZE);
          this.gridGraphics.lineTo(this.gridCols * GRID_SIZE, i * GRID_SIZE);
        }
        for (let i = 0; i <= this.gridCols; i++) {
          this.gridGraphics.moveTo(i * GRID_SIZE, 0);
          this.gridGraphics.lineTo(i * GRID_SIZE, this.gridRows * GRID_SIZE);
        }
        this.gridGraphics.strokePath();
      }
      return;
    }

    if (this.useGrassBg) {
      if (this.showGridLines) {
        this.gridGraphics.lineStyle(1, 0xffffff, 0.15);
        for (let i = 0; i <= this.gridRows; i++) {
          this.gridGraphics.moveTo(0, i * GRID_SIZE);
          this.gridGraphics.lineTo(this.gridCols * GRID_SIZE, i * GRID_SIZE);
        }
        for (let i = 0; i <= this.gridCols; i++) {
          this.gridGraphics.moveTo(i * GRID_SIZE, 0);
          this.gridGraphics.lineTo(i * GRID_SIZE, this.gridRows * GRID_SIZE);
        }
        this.gridGraphics.strokePath();
      }
      return;
    }

    // HD-2D風 深みのある森の芝生タイル（微細な濃淡トーン）
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const isEven = (row + col) % 2 === 0;
        const color = isEven ? 0x064e3b : 0x065f46; // ダークエメラルド
        this.gridGraphics.fillStyle(color, 1);
        this.gridGraphics.fillRect(col * GRID_SIZE, row * GRID_SIZE, GRID_SIZE, GRID_SIZE);

        // タイル内側のハイライト（立体感）
        if (this.isHd2dEffectsEnabled) {
          this.gridGraphics.fillStyle(0x34d399, isEven ? 0.08 : 0.04);
          this.gridGraphics.fillRect(col * GRID_SIZE + 2, row * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4);
        }

        // スクロール時の現在地把握に役立つ自然のランドマーク配置
        const landmarkHash = (row * 37 + col * 17) % 13;
        if (landmarkHash === 1) {
          // 小さな黄・白の花
          this.gridGraphics.fillStyle(0xfef08a, 0.75);
          this.gridGraphics.fillCircle(col * GRID_SIZE + 20, row * GRID_SIZE + 24, 3.5);
          this.gridGraphics.fillStyle(0xffffff, 0.85);
          this.gridGraphics.fillCircle(col * GRID_SIZE + 16, row * GRID_SIZE + 21, 2);
          this.gridGraphics.fillCircle(col * GRID_SIZE + 24, row * GRID_SIZE + 21, 2);
        } else if (landmarkHash === 4) {
          // 森の小石
          this.gridGraphics.fillStyle(0x334155, 0.8);
          this.gridGraphics.fillRoundedRect(col * GRID_SIZE + 40, row * GRID_SIZE + 42, 10, 6, 2);
          this.gridGraphics.fillStyle(0x475569, 0.5);
          this.gridGraphics.fillRoundedRect(col * GRID_SIZE + 41, row * GRID_SIZE + 43, 8, 3, 1);
        } else if (landmarkHash === 7) {
          // 小さなシダ植物
          this.gridGraphics.fillStyle(0x10b981, 0.55);
          this.gridGraphics.fillRect(col * GRID_SIZE + 14, row * GRID_SIZE + 46, 4, 10);
          this.gridGraphics.fillRect(col * GRID_SIZE + 20, row * GRID_SIZE + 44, 4, 12);
        }
      }
    }

    // 16x16フィールド全体の外枠ボーダー
    this.gridGraphics.lineStyle(4, 0x047857, 0.9);
    this.gridGraphics.strokeRect(1, 1, this.gridCols * GRID_SIZE - 2, this.gridRows * GRID_SIZE - 2);

    // グリッド線
    if (this.showGridLines) {
      this.gridGraphics.lineStyle(1, 0x10b981, 0.35);
      for (let i = 0; i <= this.gridCols; i++) {
        this.gridGraphics.lineBetween(i * GRID_SIZE, 0, i * GRID_SIZE, this.gridRows * GRID_SIZE);
      }
      for (let j = 0; j <= this.gridRows; j++) {
        this.gridGraphics.lineBetween(0, j * GRID_SIZE, this.gridCols * GRID_SIZE, j * GRID_SIZE);
      }
    }
  }

  public forceDrawVisitedTrace() {
    this.drawVisitedTrace();
  }

  private drawVisitedTrace() {
    if (!this.visitedTraceGraphics) return;
    this.visitedTraceGraphics.clear();

    const { GRID_SIZE } = GridMovementScene;

    if (this.tracerColor === 'none') {
      return;
    }

    let traceColor = 0x10b981; // green
    let traceAlpha = 0.28;

    if (this.tracerColor === 'blue') {
      traceColor = 0x3b82f6;
    } else if (this.tracerColor === 'red') {
      traceColor = 0xef4444;
    } else if (this.tracerColor === 'gray') {
      traceColor = 0x64748b;
    } else if (this.tracerColor === 'green') {
      traceColor = 0x10b981;
    }

    this.visitedGrids.forEach(key => {
      const [xs, ys] = key.split(',');
      const x = parseInt(xs, 10);
      const y = parseInt(ys, 10);

      const px = x * GRID_SIZE;
      const py = y * GRID_SIZE;

      // 1. 各タイルの四隅に上品な L 字型のコーナータグを描画
      this.visitedTraceGraphics!.lineStyle(1.5, traceColor, traceAlpha * 1.5);
      const tagSize = 8;
      
      // 左上角
      this.visitedTraceGraphics!.moveTo(px + tagSize, py);
      this.visitedTraceGraphics!.lineTo(px, py);
      this.visitedTraceGraphics!.lineTo(px, py + tagSize);

      // 右上角
      this.visitedTraceGraphics!.moveTo(px + GRID_SIZE - tagSize, py);
      this.visitedTraceGraphics!.lineTo(px + GRID_SIZE, py);
      this.visitedTraceGraphics!.lineTo(px + GRID_SIZE, py + tagSize);

      // 左下角
      this.visitedTraceGraphics!.moveTo(px, py + GRID_SIZE - tagSize);
      this.visitedTraceGraphics!.lineTo(px, py + GRID_SIZE);
      this.visitedTraceGraphics!.lineTo(px + tagSize, py + GRID_SIZE);

      // 右下角
      this.visitedTraceGraphics!.moveTo(px + GRID_SIZE, py + GRID_SIZE - tagSize);
      this.visitedTraceGraphics!.lineTo(px + GRID_SIZE, py + GRID_SIZE);
      this.visitedTraceGraphics!.lineTo(px + GRID_SIZE - tagSize, py + GRID_SIZE);
      this.visitedTraceGraphics!.strokePath();

      // 2. セル中央にドットを控えめに描く
      this.visitedTraceGraphics!.fillStyle(traceColor, traceAlpha);
      this.visitedTraceGraphics!.fillCircle(px + GRID_SIZE / 2, py + GRID_SIZE / 2, 4);
    });
  }

  private drawHd2dLighting() {
    if (!this.hd2dLighting) return;
    const { GRID_SIZE, VIEWPORT_COLS, VIEWPORT_ROWS } = GridMovementScene;
    const totalW = VIEWPORT_COLS * GRID_SIZE; // 448
    const totalH = VIEWPORT_ROWS * GRID_SIZE; // 448
    this.hd2dLighting.clear();

    if (!this.isHd2dEffectsEnabled) return;

    // 左上からの陽光（サンライト・ゴッドレイ）
    this.hd2dLighting.fillStyle(0xfef08a, 0.12);
    this.hd2dLighting.fillTriangle(0, 0, totalW * 0.7, 0, 0, totalH * 0.7);

    this.hd2dLighting.fillStyle(0x38bdf8, 0.08);
    this.hd2dLighting.fillTriangle(totalW, 0, totalW, totalH, 0, totalH);
  }

  private drawVignette() {
    if (!this.vignetteOverlay) return;
    const { GRID_SIZE, VIEWPORT_COLS, VIEWPORT_ROWS } = GridMovementScene;
    const totalW = VIEWPORT_COLS * GRID_SIZE;
    const totalH = VIEWPORT_ROWS * GRID_SIZE;

    this.vignetteOverlay.clear();
    if (!this.isHd2dEffectsEnabled) return;

    // 周辺減光（ヴィネットフレーム）
    const frameSize = 38;
    this.vignetteOverlay.fillStyle(0x022c22, 0.45);
    this.vignetteOverlay.fillRect(0, 0, totalW, frameSize);
    this.vignetteOverlay.fillRect(0, totalH - frameSize, totalW, frameSize);
    this.vignetteOverlay.fillRect(0, frameSize, frameSize, totalH - frameSize * 2);
    this.vignetteOverlay.fillRect(totalW - frameSize, frameSize, frameSize, totalH - frameSize * 2);
  }

  private getAnimKey(baseKey: string): string {
    if (this.displayMode === 'text') {
      return `${baseKey}-text`;
    } else if (this.displayMode === 'grayscale') {
      return `${baseKey}-gray`;
    }
    return baseKey;
  }

  private ensureEnemyTextureAndAnims(enemyId: string) {
    const isText = this.displayMode === 'text';

    if (isText) {
      let char = '敵';
      if (enemyId.includes('boss') || enemyId === 'text_boss') {
        char = '魔';
      } else if (enemyId === 'color_bat') {
        char = '蝙';
      } else if (enemyId === 'color_goblin') {
        char = 'ゴ';
      } else if (enemyId === 'color_golem') {
        char = '剛';
      } else if (enemyId === 'color_lizardman') {
        char = '蜥';
      } else if (enemyId === 'color_skeleton') {
        char = '骨';
      } else if (enemyId === 'color_swordsman') {
        char = '剣';
      } else if (enemyId === 'color_griffon') {
        char = '鷲';
      } else {
        const asset = getEnemyAssetById(enemyId);
        if (asset && asset.name) {
          // If the name starts with crown emoji, strip it for the character render
          const cleanName = asset.name.replace(/^👑/, '');
          char = cleanName.charAt(0);
        }
      }

      const textureKey = `text_spritesheet_${enemyId}`;
      if (!this.textures.exists(textureKey)) {
        const frameWidth = 64;
        const frameHeight = 64;
        const frames = 4;

        const canvas = document.createElement('canvas');
        canvas.width = frameWidth * frames;
        canvas.height = frameHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 40px "Inter", sans-serif';

        for (let frame = 0; frame < frames; frame++) {
          const ox = frame * frameWidth + frameWidth / 2;
          const oy = frameHeight / 2;
          ctx.fillText(char, ox, oy);
        }

        this.textures.addSpriteSheet(textureKey, canvas as unknown as HTMLImageElement, {
          frameWidth,
          frameHeight
        });
      }

      const animKey = `idle-${enemyId}-text`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: [{ key: textureKey, frame: 0 }],
          frameRate: 1
        });
      }
    }
  }

  private getMonsterTextureAndAnim(enemyId: string, action: 'idle' | 'walk' | 'shake' | 'jump', dir: Direction = 'down'): { texture: string, anim: string } {
    const mode = this.displayMode; // 'text' | 'grayscale' | 'normal'
    
    if (mode === 'text') {
      this.ensureEnemyTextureAndAnims(enemyId);
      return { texture: `text_spritesheet_${enemyId}`, anim: `idle-${enemyId}-text` };
    }

    const suffix = mode === 'grayscale' ? '-gray' : '';
    const isGray = mode === 'grayscale';

    // コウモリ
    if (enemyId === 'color_bat') {
      const tex = isGray ? 'bat_spritesheet_gray' : 'bat_spritesheet';
      return { texture: tex, anim: `bat-idle${suffix}` };
    }

    // 魔王 (白黒/カラー)
    if (enemyId === 'color_demon_king' || enemyId === 'gray_boss') {
      const forceGray = enemyId === 'gray_boss' || isGray;
      const tex = forceGray ? 'demon_king_spritesheet_gray' : 'demon_king_spritesheet';
      const actualSuffix = forceGray ? '-gray' : '';
      const animPrefix = action === 'walk' ? 'demon_king-walk' : 'demon_king-idle';
      const cleanDir = (dir === 'up-left' || dir === 'up-right') ? 'up' : 
                      (dir === 'down-left' || dir === 'down-right') ? 'down' : dir;
      const finalDir = (cleanDir === 'idle' || cleanDir === 'up' || cleanDir === 'down' || cleanDir === 'left' || cleanDir === 'right') ? cleanDir : 'down';
      return { texture: tex, anim: `${animPrefix}-${finalDir}${actualSuffix}` };
    }

    // ドラゴン
    if (enemyId === 'color_dragon') {
      const forceGray = isGray;
      const tex = 'dragon_spritesheet';
      const actualSuffix = forceGray ? '-gray' : '';
      const animPrefix = action === 'walk' ? 'dragon-walk' : 'dragon-idle';
      const cleanDir = (dir === 'up-left' || dir === 'up-right') ? 'up' : 
                      (dir === 'down-left' || dir === 'down-right') ? 'down' : dir;
      const finalDir = (cleanDir === 'idle' || cleanDir === 'up' || cleanDir === 'down' || cleanDir === 'left' || cleanDir === 'right') ? cleanDir : 'down';
      return { texture: tex, anim: `${animPrefix}-${finalDir}${actualSuffix}` };
    }

    // ゴブリン
    if (enemyId === 'color_goblin') {
      const tex = isGray ? 'goblin_spritesheet_gray' : 'goblin_spritesheet';
      const animPrefix = action === 'walk' ? 'goblin-walk' : 'goblin-idle';
      const cleanDir = (dir === 'up-left' || dir === 'up-right') ? 'up' : 
                      (dir === 'down-left' || dir === 'down-right') ? 'down' : dir;
      const finalDir = (cleanDir === 'idle' || cleanDir === 'up' || cleanDir === 'down' || cleanDir === 'left' || cleanDir === 'right') ? cleanDir : 'down';
      return { texture: tex, anim: `${animPrefix}-${finalDir}${suffix}` };
    }

    // ゴーレム
    if (enemyId === 'color_golem') {
      const tex = isGray ? 'golem_spritesheet_gray' : 'golem_spritesheet';
      const animPrefix = action === 'walk' ? 'golem-walk' : 'golem-idle';
      const cleanDir = (dir === 'up-left' || dir === 'up-right') ? 'up' : 
                      (dir === 'down-left' || dir === 'down-right') ? 'down' : dir;
      const finalDir = (cleanDir === 'idle' || cleanDir === 'up' || cleanDir === 'down' || cleanDir === 'left' || cleanDir === 'right') ? cleanDir : 'down';
      return { texture: tex, anim: `${animPrefix}-${finalDir}${suffix}` };
    }

    // リザードマン
    if (enemyId === 'color_lizardman') {
      const tex = isGray ? 'lizardman_spritesheet_gray' : 'lizardman_spritesheet';
      const animPrefix = action === 'walk' ? 'lizardman-walk' : 'lizardman-idle';
      const cleanDir = (dir === 'up-left' || dir === 'up-right') ? 'up' : 
                      (dir === 'down-left' || dir === 'down-right') ? 'down' : dir;
      const finalDir = (cleanDir === 'idle' || cleanDir === 'up' || cleanDir === 'down' || cleanDir === 'left' || cleanDir === 'right') ? cleanDir : 'down';
      return { texture: tex, anim: `${animPrefix}-${finalDir}${suffix}` };
    }

    // ガイコツ
    if (enemyId === 'color_skeleton') {
      const tex = isGray ? 'skeleton_spritesheet_gray' : 'skeleton_spritesheet';
      const animPrefix = action === 'walk' ? 'skeleton-walk' : 'skeleton-idle';
      const cleanDir = (dir === 'up-left' || dir === 'up-right') ? 'up' : 
                      (dir === 'down-left' || dir === 'down-right') ? 'down' : dir;
      const finalDir = (cleanDir === 'idle' || cleanDir === 'up' || cleanDir === 'down' || cleanDir === 'left' || cleanDir === 'right') ? cleanDir : 'down';
      return { texture: tex, anim: `${animPrefix}-${finalDir}${suffix}` };
    }

    // 剣士
    if (enemyId === 'color_swordsman') {
      const tex = isGray ? 'swordsman_spritesheet_gray' : 'swordsman_spritesheet';
      const animPrefix = action === 'walk' ? 'swordsman-walk' : 'swordsman-idle';
      const cleanDir = (dir === 'up-left' || dir === 'up-right') ? 'up' : 
                      (dir === 'down-left' || dir === 'down-right') ? 'down' : dir;
      const finalDir = (cleanDir === 'idle' || cleanDir === 'up' || cleanDir === 'down' || cleanDir === 'left' || cleanDir === 'right') ? cleanDir : 'down';
      return { texture: tex, anim: `${animPrefix}-${finalDir}${suffix}` };
    }

    // グリフォン
    if (enemyId === 'color_griffon') {
      const tex = isGray ? 'griffon_spritesheet_gray' : 'griffon_spritesheet';
      const animPrefix = action === 'walk' ? 'griffon-walk' : 'griffon-idle';
      const cleanDir = (dir === 'up-left' || dir === 'up-right') ? 'up' : 
                      (dir === 'down-left' || dir === 'down-right') ? 'down' : dir;
      const finalDir = (cleanDir === 'idle' || cleanDir === 'up' || cleanDir === 'down' || cleanDir === 'left' || cleanDir === 'right') ? cleanDir : 'down';
      return { texture: tex, anim: `${animPrefix}-${finalDir}${suffix}` };
    }

    // スライム系
    let tex = 'slime_spritesheet';
    let slimeColorSuffix = suffix;
    if (isGray) {
      tex = 'slime_spritesheet_gray';
    } else if (enemyId === 'color_slime_green') {
      tex = 'slime_spritesheet_green';
      slimeColorSuffix = '-green';
    } else if (enemyId === 'color_slime_red') {
      tex = 'slime_spritesheet_red';
      slimeColorSuffix = '-red';
    }

    let anim = `slime-idle${slimeColorSuffix}`;
    if (action === 'shake') anim = `slime-shake${slimeColorSuffix}`;
    if (action === 'jump') anim = `slime-jump${slimeColorSuffix}`;

    return { texture: tex, anim };
  }

  private playMonsterAnim(slime: SlimeData, action: 'idle' | 'walk' | 'shake' | 'jump', dir: Direction = 'down') {
    if (!slime.sprite || !slime.sprite.active) return;
    const { texture, anim } = this.getMonsterTextureAndAnim(slime.enemyId, action, dir);
    if (slime.sprite.texture.key !== texture) {
      slime.sprite.setTexture(texture);
    }
    slime.sprite.play(anim, true);
  }

  public toggleTextMode(enabled?: boolean) {
    const nextMode = (enabled !== undefined ? enabled : !this.isTextMode) ? 'text' : 'normal';
    this.setDisplayMode(nextMode);
  }

  public applyMapSettings(bgMode: string, bgImage?: string) {
    if (bgMode === 'text-black') {
      this.setDisplayMode('text');
      this.setSpeed(1000);
      this.toggle8WayMode(false);
      this.toggleHd2dEffects(false);
      this.toggleGrassBg(false);
      this.cameras.main.setBackgroundColor('#000000');
    } else if (bgMode === 'stone-gray') {
      this.setDisplayMode('grayscale');
      this.setSpeed(800);
      this.toggle8WayMode(false);
      this.toggleHd2dEffects(false);
      this.toggleGrassBg(false);
      this.cameras.main.setBackgroundColor('#cbd5e1'); // Match map editor bg
    } else if (bgMode === 'grass-green') {
      this.setDisplayMode('normal');
      this.setSpeed(800);
      this.toggle8WayMode(false);
      this.toggleHd2dEffects(false);
      this.toggleGrassBg(false);
      this.cameras.main.setBackgroundColor('#4ade80');
    } else if (bgMode === 'image') {
      this.setDisplayMode('normal');
      this.setSpeed(800);
      this.toggle8WayMode(false);
      this.toggleHd2dEffects(true);
      this.toggleGrassBg(true);
      this.cameras.main.setBackgroundColor('#000000');
      if (bgImage && this.grassBgImage) {
         // TODO: support loading arbitrary bg image if not preloaded. For now, it defaults to grass_bg
      }
    }
  }

  public setDisplayMode(mode: 'normal' | 'text' | 'grayscale') {
    this.displayMode = mode;
    this.isTextMode = (mode === 'text');
    
    // 背景色の変更
    if (this.cameras && this.cameras.main) {
      if (this.displayMode === 'text') {
        this.cameras.main.setBackgroundColor('#000000');
      } else if (this.displayMode === 'grayscale') {
        this.cameras.main.setBackgroundColor('#ffffff');
      } else {
        this.cameras.main.setBackgroundColor('#ecfdf5'); // default background color
      }
    }

    // テクスチャの変更
    let heroTexture = 'hero_spritesheet';
    if (this.displayMode === 'text') heroTexture = 'hero_spritesheet_text';
    else if (this.displayMode === 'grayscale') heroTexture = 'hero_spritesheet_gray';
    if (this.hero) {
      this.hero.setTexture(heroTexture);
    }
    
    if (this.slimes) {
      this.slimes.forEach(slime => {
        if (slime && slime.sprite) {
          this.playMonsterAnim(slime, slime.isMoving ? 'walk' : 'idle', slime.direction || 'down');
        }
      });
    }

    // アニメーションを即時更新
    if (this.hero && this.hero.anims) {
      const currentAnimKey = this.hero.anims.currentAnim?.key;
      if (currentAnimKey) {
        let baseKey = currentAnimKey;
        if (baseKey.endsWith('-text')) baseKey = baseKey.replace('-text', '');
        else if (baseKey.endsWith('-gray')) baseKey = baseKey.replace('-gray', '');
        this.hero.play(this.getAnimKey(baseKey), true);
      }
    }

    // 描画の更新
    this.drawGrid();
    this.drawVisitedTrace();
    this.updateTeleportPortals(true);
    this.updateMapItemSprites();
    this.updateMapObstacleSprites();
  }

  public toggleGridLines(show?: boolean) {
    this.showGridLines = show !== undefined ? show : !this.showGridLines;
    this.drawGrid();
  }

  public toggleHd2dEffects(enabled?: boolean) {
    this.isHd2dEffectsEnabled = enabled !== undefined ? enabled : !this.isHd2dEffectsEnabled;
    this.drawGrid();
    this.drawHd2dLighting();
    this.drawVignette();
    if (this.particleMotes) {
      this.particleMotes.forEach(m => m.setVisible(this.isHd2dEffectsEnabled));
    }
  }

  public toggleGrassBg(enabled?: boolean) {
    this.useGrassBg = enabled !== undefined ? enabled : !this.useGrassBg;
    this.drawGrid();
  }

  public toggle8WayMode(enabled?: boolean) {
    this.allow8Way = enabled !== undefined ? enabled : !this.allow8Way;
  }

  public setAutoMode(mode: 'none' | 'random' | 'seek') {
    this.autoMode = mode;
  }

  public setSpeed(speedMs: number) {
    this.moveSpeedMs = speedMs;
    const frameRate = Math.max(4, Math.round(3600 / speedMs));
    ['up', 'down', 'left', 'right'].forEach(dir => {
      ['', '-text', '-gray'].forEach(suffix => {
        const anim = this.anims.get(`walk-${dir}${suffix}`);
        if (anim) {
          anim.frameRate = frameRate;
        }
      });
    });
  }

  private checkAndMoveRandomly() {
    if (this.isSettingsPaused) return;
    if (this.isShowingMonologue) return;
    if (this.autoMode === 'none') {
      if (this.pointerTargetGridX !== null && this.pointerTargetGridY !== null) {
        if (!this.isMoving) {
          const dx = this.pointerTargetGridX - this.currentGridX;
          const dy = this.pointerTargetGridY - this.currentGridY;
          if (dx === 0 && dy === 0) {
            this.pointerTargetGridX = null;
            this.pointerTargetGridY = null;
          } else {
            const possibleDirs: Direction[] = [];
            if (this.is8WayEnabled) {
              if (dx > 0 && dy > 0) possibleDirs.push('down-right');
              else if (dx > 0 && dy < 0) possibleDirs.push('up-right');
              else if (dx < 0 && dy > 0) possibleDirs.push('down-left');
              else if (dx < 0 && dy < 0) possibleDirs.push('up-left');
              else if (dx > 0) possibleDirs.push('right');
              else if (dx < 0) possibleDirs.push('left');
              else if (dy > 0) possibleDirs.push('down');
              else if (dy < 0) possibleDirs.push('up');
            } else {
              if (dx > 0) possibleDirs.push('right');
              else if (dx < 0) possibleDirs.push('left');
              if (dy > 0) possibleDirs.push('down');
              else if (dy < 0) possibleDirs.push('up');
            }
            
            if (possibleDirs.length > 0) {
              const nextDir = Phaser.Utils.Array.GetRandom(possibleDirs);
              this.moveInDirection(nextDir);
            }
          }
        }
      }
    }

    // スライムの補充
    const maxEnemies = this.mapData?.maxEnemies;
    const isInfinite = maxEnemies === undefined || maxEnemies === 'infinite';

    if (this.slimes.length < 5 && Math.random() < 0.1) {
      if (isInfinite || this.totalEnemiesSpawned < (maxEnemies as number)) {
        let sx = 0;
        let sy = 0;
        let found = false;

        const pos = this.findScatteredSpawnPosition(3, 2);
        if (pos) {
          sx = pos.x;
          sy = pos.y;
          found = true;
        }

        if (found) {
          const { GRID_SIZE } = GridMovementScene;
          
          let enemyConfig: EnemyAsset | undefined = undefined;
          if (this.mapData?.enemies && this.mapData.enemies.length > 0) {
            const enemyId = Phaser.Utils.Array.GetRandom(this.mapData.enemies as string[]);
            enemyConfig = getEnemyAssetById(enemyId);
          }
          if (!enemyConfig) {
            const available = getAvailableEnemies(this.mapData?.bgMode || 'image');
            if (available.length > 0) {
              enemyConfig = Phaser.Utils.Array.GetRandom(available);
            } else {
              enemyConfig = { id: 'default', name: 'スライム', hp: 10, attack: 2, defense: 0, exp: 2, speed: 1000, behavior: 'random' };
            }
          }

          const slimeSprite = this.add.sprite(sx * GRID_SIZE + GRID_SIZE / 2, sy * GRID_SIZE + GRID_SIZE / 2, 'slime_spritesheet', 0);
          slimeSprite.setDepth(9);

          const newSlime: SlimeData = {
            id: `slime-${Math.random().toString(36).substring(2, 9)}`,
            name: enemyConfig.name,
            sprite: slimeSprite,
            gridX: sx,
            gridY: sy,
            isMoving: false,
            hp: enemyConfig.hp,
            maxHp: enemyConfig.hp,
            attack: enemyConfig.attack,
            defense: enemyConfig.defense !== undefined ? enemyConfig.defense : 0,
            exp: (enemyConfig.exp !== undefined && !isNaN(Number(enemyConfig.exp))) ? Number(enemyConfig.exp) : 2,
            speed: enemyConfig.speed,
            behavior: enemyConfig.behavior,
            enemyId: enemyConfig.id,
            direction: 'down',
            attackElement: enemyConfig.attackElement,
            attackElementEnchantValue: enemyConfig.attackElementEnchantValue,
            defenseElement: enemyConfig.defenseElement,
            defenseElementEnchantValue: enemyConfig.defenseElementEnchantValue,
          };

          this.slimes.push(newSlime);
          this.playMonsterAnim(newSlime, 'idle', 'down');
          
          this.totalEnemiesSpawned++;
          this.sendLog(`野生の${enemyConfig.name || 'スライム'}が現れた！ 👾`, 'system');
        }
      }
    }

    // 勇者の自動移動
    if (this.autoMode !== 'none' && !this.isMoving) {
      if (this.autoMode === 'seek') {
        // 1. まずアイテムやゴールが画面に映っているかチェック
        let targetGoal: any = null;
        if (this.goalBehavior === 'seek_visible') {
          // まずアイテムをチェック
          const visibleItems = this.itemSprites.filter((item) => {
            if (!item.sprite || !item.sprite.active) return false;
            return (
              item.gridX >= this.currentCamGridX &&
              item.gridX < this.currentCamGridX + GridMovementScene.VIEWPORT_COLS &&
              item.gridY >= this.currentCamGridY &&
              item.gridY < this.currentCamGridY + GridMovementScene.VIEWPORT_ROWS
            );
          });

          if (visibleItems.length > 0) {
            targetGoal = { x: visibleItems[0].gridX, y: visibleItems[0].gridY };
          } else if (this.mapData && this.mapData.events) {
            const expRate = (this.visitedGrids.size / this.totalGrids) * 100;
            const sRate = (this.viewedGrids.size / this.totalGrids) * 100;
            const dRate = this.getDefeatRate();

            const activeGoals = this.mapData.events.filter((event: any) => {
              if (event.type !== 'teleport') return false;
              const eventData = event.data || {};
              let met = true;
              if (eventData.requiredExplorationRate && expRate < eventData.requiredExplorationRate) met = false;
              if (eventData.requiredSearchRate && sRate < eventData.requiredSearchRate) met = false;
              if (eventData.requiredDefeatRate && dRate < eventData.requiredDefeatRate) met = false;
              if (!met) return false;

              // 画面に映っている (現在のカメラビューポート内)
              const onScreen = (
                event.x >= this.currentCamGridX &&
                event.x < this.currentCamGridX + GridMovementScene.VIEWPORT_COLS &&
                event.y >= this.currentCamGridY &&
                event.y < this.currentCamGridY + GridMovementScene.VIEWPORT_ROWS
              );
              return onScreen;
            });

            if (activeGoals.length > 0) {
              targetGoal = activeGoals[0];
            }
          }
        }

        if (targetGoal) {
          // ゴールを目指す
          const possibleDirs: Direction[] = [];
          const gx = targetGoal.x;
          const gy = targetGoal.y;
          const dx = gx - this.currentGridX;
          const dy = gy - this.currentGridY;

          if (this.is8WayEnabled) {
            if (dx > 0 && dy > 0) possibleDirs.push('down-right');
            else if (dx > 0 && dy < 0) possibleDirs.push('up-right');
            else if (dx < 0 && dy > 0) possibleDirs.push('down-left');
            else if (dx < 0 && dy < 0) possibleDirs.push('up-left');
            
            if (possibleDirs.length === 0) {
              if (dx > 0) possibleDirs.push('right');
              else if (dx < 0) possibleDirs.push('left');
              if (dy > 0) possibleDirs.push('down');
              else if (dy < 0) possibleDirs.push('up');
            }
          } else {
            if (Math.abs(dx) >= Math.abs(dy)) {
              if (dx > 0) possibleDirs.push('right');
              else if (dx < 0) possibleDirs.push('left');
            } else {
              if (dy > 0) possibleDirs.push('down');
              else if (dy < 0) possibleDirs.push('up');
            }
            if (possibleDirs.length === 0) {
              if (dx > 0) possibleDirs.push('right');
              else if (dx < 0) possibleDirs.push('left');
              if (dy > 0) possibleDirs.push('down');
              else if (dy < 0) possibleDirs.push('up');
            }
          }

          let moved = false;
          if (possibleDirs.length > 0) {
            const uniqueDirs = Array.from(new Set(possibleDirs));
            for (const dir of uniqueDirs) {
              if (this.moveInDirection(dir)) {
                moved = true;
                break;
              }
            }
          }

          if (!moved) {
            const allDirs: Direction[] = ['up', 'down', 'left', 'right'];
            if (this.is8WayEnabled) {
              allDirs.push('up-left', 'up-right', 'down-left', 'down-right');
            }
            const sortedDirs = allDirs
              .map(dir => {
                let tx = this.currentGridX;
                let ty = this.currentGridY;
                switch (dir) {
                  case 'up': ty -= 1; break;
                  case 'down': ty += 1; break;
                  case 'left': tx -= 1; break;
                  case 'right': tx += 1; break;
                  case 'up-left': ty -= 1; tx -= 1; break;
                  case 'up-right': ty -= 1; tx += 1; break;
                  case 'down-left': ty += 1; tx -= 1; break;
                  case 'down-right': ty += 1; tx += 1; break;
                }
                const dist = Math.pow(tx - gx, 2) + Math.pow(ty - gy, 2);
                return { dir, dist };
              })
              .sort((a, b) => a.dist - b.dist);

            for (const item of sortedDirs) {
              if (this.moveInDirection(item.dir)) {
                moved = true;
                break;
              }
            }
          }
        } else {
          // 索敵・戦闘モード (AIを使わないロジック)
          let targetSlime: SlimeData | null = null;
          
          if (this.slimes.length > 0 && this.combatBehavior === 'closest_enemy') {
            // 最も近いスライムを探す
            let minDistance = Infinity;

            this.slimes.forEach(slime => {
              const dist = Math.abs(slime.gridX - this.currentGridX) + Math.abs(slime.gridY - this.currentGridY);
              if (dist < minDistance) {
                minDistance = dist;
                targetSlime = slime;
              }
            });
          }

          if (targetSlime) {
            // 最も近いスライムに近づく方向を決定
            const possibleDirs: Direction[] = [];
            const sx = targetSlime.gridX;
            const sy = targetSlime.gridY;
            const dx = sx - this.currentGridX;
            const dy = sy - this.currentGridY;

            if (this.is8WayEnabled) {
              if (dx > 0 && dy > 0) possibleDirs.push('down-right');
              else if (dx > 0 && dy < 0) possibleDirs.push('up-right');
              else if (dx < 0 && dy > 0) possibleDirs.push('down-left');
              else if (dx < 0 && dy < 0) possibleDirs.push('up-left');
              else if (dx > 0) possibleDirs.push('right');
              else if (dx < 0) possibleDirs.push('left');
              else if (dy > 0) possibleDirs.push('down');
              else if (dy < 0) possibleDirs.push('up');
            } else {
              if (dx > 0) possibleDirs.push('right');
              else if (dx < 0) possibleDirs.push('left');
              if (dy > 0) possibleDirs.push('down');
              else if (dy < 0) possibleDirs.push('up');
            }

            if (possibleDirs.length > 0) {
              const nextDir = Phaser.Utils.Array.GetRandom(possibleDirs);
              this.moveInDirection(nextDir);
            }
          } else {
            // 敵がいない場合、または戦闘行動がない場合
            if (this.movementBehavior === 'unvisited') {
              this.performExploreWalk();
            } else {
              this.performRandomWalk();
            }
          }
        }
      } else {
        // 通常のランダムウォーク (seek 以外)
        this.performRandomWalk();
      }
    }

    // スライムの行動
    const currentTime = this.time.now;
    this.slimes.forEach(slime => {
      if (slime.isMoving) return;
      if (slime.behavior === 'idle') return;

      const lastMove = slime.lastMoveTime || 0;
      if (currentTime - lastMove < slime.speed) return;

      if (slime.behavior === 'rarely') {
        if (Math.random() < 0.8) {
          // 80% chance to skip moving on this tick
          // Still update lastMoveTime so they don't spam check every frame
          slime.lastMoveTime = currentTime;
          return;
        }
      }

      slime.lastMoveTime = currentTime;

      let nextDir: Direction | null = null;

      if (slime.behavior === 'seek') {
        const dx = this.currentGridX - slime.gridX;
        const dy = this.currentGridY - slime.gridY;
        
        // Simple seek logic
        if (Math.abs(dx) > Math.abs(dy)) {
          nextDir = dx > 0 ? 'right' : 'left';
        } else if (dy !== 0) {
          nextDir = dy > 0 ? 'down' : 'up';
        }
      }

      if (!nextDir || slime.behavior === 'random' || slime.behavior === 'rarely') {
        const slimeDirs: Direction[] = [];
        if (slime.gridY > 0) slimeDirs.push('up');
        if (slime.gridY < this.gridRows - 1) slimeDirs.push('down');
        if (slime.gridX > 0) slimeDirs.push('left');
        if (slime.gridX < this.gridCols - 1) slimeDirs.push('right');

        if (slimeDirs.length > 0) {
          nextDir = Phaser.Utils.Array.GetRandom(slimeDirs);
        }
      }

      if (nextDir) {
        this.moveSlime(slime, nextDir);
      }
    });
  }

  private performRandomWalk() {
    const possibleDirs: Direction[] = [];
    if (this.currentGridY > 0) possibleDirs.push('up');
    if (this.currentGridY < this.gridRows - 1) possibleDirs.push('down');
    if (this.currentGridX > 0) possibleDirs.push('left');
    if (this.currentGridX < this.gridCols - 1) possibleDirs.push('right');
    
    if (this.is8WayEnabled) {
      if (this.currentGridY > 0 && this.currentGridX > 0) possibleDirs.push('up-left');
      if (this.currentGridY > 0 && this.currentGridX < this.gridCols - 1) possibleDirs.push('up-right');
      if (this.currentGridY < this.gridRows - 1 && this.currentGridX > 0) possibleDirs.push('down-left');
      if (this.currentGridY < this.gridRows - 1 && this.currentGridX < this.gridCols - 1) possibleDirs.push('down-right');
    }

    if (possibleDirs.length > 0) {
      const nextDir = Phaser.Utils.Array.GetRandom(possibleDirs);
      this.moveInDirection(nextDir);
    }
  }

  private performExploreWalk() {
    // 未踏破エリアを探す簡易的な探索
    // 周囲8マスまたは4マスの中で、未訪問のマスを優先する
    const neighbors = [
      { dir: 'up' as Direction, dx: 0, dy: -1 },
      { dir: 'down' as Direction, dx: 0, dy: 1 },
      { dir: 'left' as Direction, dx: -1, dy: 0 },
      { dir: 'right' as Direction, dx: 1, dy: 0 },
    ];
    if (this.is8WayEnabled) {
      neighbors.push(
        { dir: 'up-left' as Direction, dx: -1, dy: -1 },
        { dir: 'up-right' as Direction, dx: 1, dy: -1 },
        { dir: 'down-left' as Direction, dx: -1, dy: 1 },
        { dir: 'down-right' as Direction, dx: 1, dy: 1 }
      );
    }

    const unvisitedDirs: Direction[] = [];
    const validDirs: Direction[] = [];

    for (const n of neighbors) {
      const nx = this.currentGridX + n.dx;
      const ny = this.currentGridY + n.dy;
      if (nx >= 0 && nx < this.gridCols && ny >= 0 && ny < this.gridRows) {
        if (!this.isTileOccupied(nx, ny)) {
          validDirs.push(n.dir);
          const gridKey = `${nx},${ny}`;
          if (!this.visitedGrids.has(gridKey)) {
            unvisitedDirs.push(n.dir);
          }
        }
      }
    }

    if (unvisitedDirs.length > 0) {
      const nextDir = Phaser.Utils.Array.GetRandom(unvisitedDirs);
      this.moveInDirection(nextDir);
    } else if (validDirs.length > 0) {
      // 周囲のマスがすべて踏破済みの場合、画面内の未踏破エリアを探す
      let targetUnvisitedGrid: {x: number, y: number} | null = null;
      let minUnvisitedDist = Infinity;

      for (let y = this.currentCamGridY; y < this.currentCamGridY + GridMovementScene.VIEWPORT_ROWS; y++) {
        for (let x = this.currentCamGridX; x < this.currentCamGridX + GridMovementScene.VIEWPORT_COLS; x++) {
          if (x >= 0 && x < this.gridCols && y >= 0 && y < this.gridRows) {
            if (!this.visitedGrids.has(`${x},${y}`) && !this.isTileOccupied(x, y)) {
              const dist = Math.abs(x - this.currentGridX) + Math.abs(y - this.currentGridY);
              if (dist < minUnvisitedDist) {
                minUnvisitedDist = dist;
                targetUnvisitedGrid = { x, y };
              }
            }
          }
        }
      }

      if (targetUnvisitedGrid) {
        // 未踏破エリアに近づく
        const dx = targetUnvisitedGrid.x - this.currentGridX;
        const dy = targetUnvisitedGrid.y - this.currentGridY;
        const possibleDirs: Direction[] = [];

        if (this.is8WayEnabled) {
          if (dx > 0 && dy > 0) possibleDirs.push('down-right');
          else if (dx > 0 && dy < 0) possibleDirs.push('up-right');
          else if (dx < 0 && dy > 0) possibleDirs.push('down-left');
          else if (dx < 0 && dy < 0) possibleDirs.push('up-left');
          
          if (possibleDirs.length === 0) {
            if (dx > 0) possibleDirs.push('right');
            else if (dx < 0) possibleDirs.push('left');
            if (dy > 0) possibleDirs.push('down');
            else if (dy < 0) possibleDirs.push('up');
          }
        } else {
          if (Math.abs(dx) >= Math.abs(dy)) {
            if (dx > 0) possibleDirs.push('right');
            else if (dx < 0) possibleDirs.push('left');
          } else {
            if (dy > 0) possibleDirs.push('down');
            else if (dy < 0) possibleDirs.push('up');
          }
          if (possibleDirs.length === 0) {
            if (dx > 0) possibleDirs.push('right');
            else if (dx < 0) possibleDirs.push('left');
            if (dy > 0) possibleDirs.push('down');
            else if (dy < 0) possibleDirs.push('up');
          }
        }

        let moved = false;
        if (possibleDirs.length > 0) {
          const uniqueDirs = Array.from(new Set(possibleDirs));
          for (const dir of uniqueDirs) {
            if (this.moveInDirection(dir)) {
              moved = true;
              break;
            }
          }
        }

        if (!moved) {
          // 何らかの理由で直進できない場合は迂回 (ランダム)
          const nextDir = Phaser.Utils.Array.GetRandom(validDirs);
          this.moveInDirection(nextDir);
        }
      } else {
        // 画面内に未訪問がない場合はランダムに移動
        const nextDir = Phaser.Utils.Array.GetRandom(validDirs);
        this.moveInDirection(nextDir);
      }
    }
  }

  private performAttack(slimeIndex: number) {
    const slime = this.slimes[slimeIndex];
    if (!slime) {
      this.isMoving = false;
      return;
    }

    const elMap: any = {
      fire: '火',
      water: '水',
      wind: '風',
      earth: '地',
      light: '光',
      dark: '闇',
      ice: '氷'
    };

    let baseDamage = this.heroAttack - (slime.defense || 0);
    let elementMsg = '';

    if (this.heroAttackElement && slime.defenseElement && this.heroAttackElement === slime.defenseElement) {
      const reduction = slime.defenseElementEnchantValue || 0;
      if (reduction > 0) {
        baseDamage -= reduction;
        elementMsg = ` (属性:${elMap[this.heroAttackElement]}防御で-${reduction})`;
      }
    }

    const damage = Math.max(1, baseDamage);
    slime.hp -= damage;
    this.sendLog(`勇者の通常攻撃！ ${slime.name || 'スライム'}に ${damage} ダメージを与えた！${elementMsg} ⚔️`, 'combat');

    // 攻撃エフェクト (本格的な円弧のダブルクロス・スラッシュ & スパーク)
    
    // 1. 1発目のスラッシュ (左上から右下への鋭い一閃)
    const slash1 = this.add.graphics();
    slash1.setDepth(15);
    const angle1 = -Math.PI / 6; // やや右肩下がり
    const radius1 = 28;
    const animState1 = { progress: 0 };
    
    this.tweens.add({
      targets: animState1,
      progress: 1,
      duration: 180,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        slash1.clear();
        const p = animState1.progress;
        const start = angle1 - Math.PI / 2 + p * Math.PI * 0.4;
        const end = angle1 - Math.PI / 2 + p * Math.PI * 1.3;
        
        // 黄金の斬撃オーラ
        slash1.lineStyle(6, 0xffaa00, (1 - p) * 0.85);
        slash1.beginPath();
        slash1.arc(slime.sprite.x, slime.sprite.y, radius1, start, end, false);
        slash1.strokePath();

        // 鋭い刃光 (白)
        slash1.lineStyle(2, 0xffffff, (1 - p) * 1.0);
        slash1.beginPath();
        slash1.arc(slime.sprite.x, slime.sprite.y, radius1, start + 0.1, end - 0.1, false);
        slash1.strokePath();
      },
      onComplete: () => slash1.destroy()
    });

    // 2. 2発目のスラッシュ (少し遅れて右上から左下へ交差する一閃)
    this.time.delayedCall(80, () => {
      if (!slime.sprite || !slime.sprite.active) return;
      const slash2 = this.add.graphics();
      slash2.setDepth(15);
      const angle2 = (Math.PI * 5) / 6; // 反対方向への傾き
      const radius2 = 25;
      const animState2 = { progress: 0 };

      this.tweens.add({
        targets: animState2,
        progress: 1,
        duration: 180,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          slash2.clear();
          const p = animState2.progress;
          const start = angle2 - Math.PI / 2 + p * Math.PI * 0.4;
          const end = angle2 - Math.PI / 2 + p * Math.PI * 1.3;

          // シアン/スカイブルーの斬撃オーラ (2段目は美しい色合いの変化)
          slash2.lineStyle(5, 0x00f0ff, (1 - p) * 0.85);
          slash2.beginPath();
          slash2.arc(slime.sprite.x, slime.sprite.y, radius2, start, end, false);
          slash2.strokePath();

          // 鋭い刃光 (白)
          slash2.lineStyle(1.5, 0xffffff, (1 - p) * 1.0);
          slash2.beginPath();
          slash2.arc(slime.sprite.x, slime.sprite.y, radius2, start + 0.08, end - 0.08, false);
          slash2.strokePath();
        },
        onComplete: () => slash2.destroy()
      });
    });

    // 3. 火花・衝撃スパーク
    for (let i = 0; i < 12; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(150, 300);
      const size = Phaser.Math.Between(2, 5);
      const spark = this.add.graphics();
      spark.setDepth(16);
      spark.setPosition(slime.sprite.x, slime.sprite.y);
      
      // 火花のひし形
      spark.fillStyle(0xfff59d, 0.9);
      spark.fillTriangle(0, -size, -size * 0.5, 0, size * 0.5, 0);
      spark.fillTriangle(0, size, -size * 0.5, 0, size * 0.5, 0);

      this.tweens.add({
        targets: spark,
        x: slime.sprite.x + Math.cos(angle) * speed * 0.25,
        y: slime.sprite.y + Math.sin(angle) * speed * 0.25,
        scale: 0,
        alpha: 0,
        angle: Phaser.Math.Between(0, 360),
        duration: Phaser.Math.Between(300, 500),
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      });
    }

    // 4. ヒット時のカメラ微揺れと、スライムの赤フラッシュ & ノックバック
    this.cameras.main.shake(80, 0.006);
    
    // スライムの赤色点滅 (ティント) と微小なノックバック
    if (slime.sprite && slime.sprite.active) {
      slime.sprite.setTint(0xff5555);
      
      // 被弾方向への小さな揺れ
      const knockX = (slime.sprite.x - this.hero.x) * 0.15;
      const knockY = (slime.sprite.y - this.hero.y) * 0.15;
      const origSlimeX = slime.sprite.x;
      const origSlimeY = slime.sprite.y;

      this.tweens.add({
        targets: slime.sprite,
        x: origSlimeX + knockX,
        y: origSlimeY + knockY,
        duration: 50,
        yoyo: true,
        onComplete: () => {
          if (slime.sprite && slime.sprite.active) {
            slime.sprite.clearTint();
            slime.sprite.x = origSlimeX;
            slime.sprite.y = origSlimeY;
          }
        }
      });

      // 150ms後にティントを安全にクリア
      this.time.delayedCall(150, () => {
        if (slime.sprite && slime.sprite.active) {
          slime.sprite.clearTint();
        }
      });
    }

    // ちょっとだけ前進して戻る（バンプ）
    const origX = this.hero.x;
    const origY = this.hero.y;
    const dx = (slime.sprite.x - origX) * 0.3;
    const dy = (slime.sprite.y - origY) * 0.3;

    this.tweens.add({
      targets: this.hero,
      x: origX + dx,
      y: origY + dy,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.hero.play(this.getAnimKey(`idle-${this.currentDirection}`), true);
        this.isMoving = false;

        if (slime.hp <= 0) {
          if (slime.id.startsWith('boss-')) {
            this.bossDefeated = true;
          }
          this.enemiesDefeated++;
          this.updateStats(this.currentGridX, this.currentGridY, this.currentCamGridX, this.currentCamGridY);
          
          const gainedExp = (slime.exp !== undefined && !isNaN(Number(slime.exp))) ? Number(slime.exp) : 2;
          this.sendLog(`${slime.name || 'スライム'}を倒した！ 経験値を ${gainedExp} 獲得。 🌟`, 'info');
          this.heroExp += gainedExp;
          this.checkLevelUp();
          
          this.tweens.add({
            targets: slime.sprite,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              if (slime.sprite && slime.sprite.active) slime.sprite.destroy();
            }
          });
          const currentIdx = this.slimes.indexOf(slime);
          if (currentIdx !== -1) {
            this.slimes.splice(currentIdx, 1);
          }
        }
        this.notifyStateChange(false);
      }
    });
  }

  private performSlimeAttack(slime: SlimeData) {
    slime.isMoving = true;
    this.playMonsterAnim(slime, 'jump', slime.direction);

    const origX = slime.sprite.x;
    const origY = slime.sprite.y;
    const dx = (this.hero.x - origX) * 0.3;
    const dy = (this.hero.y - origY) * 0.3;

    this.tweens.add({
      targets: slime.sprite,
      x: origX + dx,
      y: origY + dy,
      duration: 150,
      yoyo: true,
      onComplete: () => {
        if (slime.sprite && slime.sprite.active) {
          this.playMonsterAnim(slime, 'idle', slime.direction);
        }
        slime.isMoving = false;
        
        const elMap: any = {
          fire: '火',
          water: '水',
          wind: '風',
          earth: '地',
          light: '光',
          dark: '闇',
          ice: '氷'
        };

        let baseEnemyAttack = slime.attack || 2;
        let extraEnchant = 0;
        let elementMsg = '';

        if (slime.attackElement) {
          extraEnchant = slime.attackElementEnchantValue || 0;
          if (extraEnchant > 0) {
            // 主人公の防御属性と一致する場合、主人公の防御属性付与ボーナスで低減する
            if (this.heroDefenseElement && this.heroDefenseElement === slime.attackElement) {
              const reduction = this.heroDefenseElementEnchantValue || 0;
              extraEnchant = Math.max(0, extraEnchant - reduction);
              if (reduction > 0) {
                elementMsg = ` (属性:${elMap[slime.attackElement]}防御で付与攻-${reduction})`;
              }
            }
          }
        }

        const damage = Math.max(1, (baseEnemyAttack + extraEnchant) - this.heroDefense);
        this.heroHp = Math.max(0, this.heroHp - damage);
        this.sendLog(`${slime.name || 'スライム'}の攻撃！ 勇者は ${damage} ダメージを受けた！${elementMsg} 💥`, 'damage');
        
        // 画面フラッシュ
        this.cameras.main.flash(200, 255, 0, 0);
        
        this.notifyStateChange(false);

        if (this.heroHp <= 0) {
          this.sendLog(`勇者は力尽きてしまった... 💀`, 'system');
          // 本当はゲームオーバー処理を入れる
          this.time.delayedCall(1000, () => {
             this.heroHp = this.heroMaxHp;
             this.sendLog(`勇者は不思議な力で復活した！ ✨`, 'system');
             this.notifyStateChange(false);
          });
        }
      }
    });
  }

  private isBossEnemy(enemyId: string): boolean {
    return ['gray_boss', 'color_demon_king', 'color_dragon'].includes(enemyId);
  }

  private isTileOccupiedByOthers(x: number, y: number, excludeSlimeId: string): boolean {
    if (this.currentGridX === x && this.currentGridY === y) return true;
    if (this.heroTargetGridX === x && this.heroTargetGridY === y) return true;
    for (const s of this.slimes) {
      if (s.id === excludeSlimeId) continue;
      const isBoss = this.isBossEnemy(s.enemyId);
      if (isBoss) {
        if (x >= s.gridX && x <= s.gridX + 1 && y >= s.gridY && y <= s.gridY + 1) return true;
        if (s.targetGridX !== undefined && s.targetGridY !== undefined) {
          if (x >= s.targetGridX && x <= s.targetGridX + 1 && y >= s.targetGridY && y <= s.targetGridY + 1) return true;
        }
      } else {
        if (s.gridX === x && s.gridY === y) return true;
        if (s.targetGridX === x && s.targetGridY === y) return true;
      }
    }
    if (this.mapData && this.mapData.obstacles) {
      if (this.mapData.obstacles.some((obs: any) => obs.x === x && obs.y === y)) return true;
    }
    return false;
  }

  private isTileOccupied(x: number, y: number): boolean {
    if (this.currentGridX === x && this.currentGridY === y) return true;
    if (this.heroTargetGridX === x && this.heroTargetGridY === y) return true;
    for (const s of this.slimes) {
      const isBoss = this.isBossEnemy(s.enemyId);
      if (isBoss) {
        if (x >= s.gridX && x <= s.gridX + 1 && y >= s.gridY && y <= s.gridY + 1) return true;
        if (s.targetGridX !== undefined && s.targetGridY !== undefined) {
          if (x >= s.targetGridX && x <= s.targetGridX + 1 && y >= s.targetGridY && y <= s.targetGridY + 1) return true;
        }
      } else {
        if (s.gridX === x && s.gridY === y) return true;
        if (s.targetGridX === x && s.targetGridY === y) return true;
      }
    }
    if (this.mapData && this.mapData.obstacles) {
      if (this.mapData.obstacles.some((obs: any) => obs.x === x && obs.y === y)) return true;
    }
    return false;
  }

  private isTileOccupiedByAnything(x: number, y: number): boolean {
    // 1. 主人公との重複チェック
    if (this.currentGridX === x && this.currentGridY === y) return true;
    if (this.heroTargetGridX === x && this.heroTargetGridY === y) return true;

    // 2. 敵との重複チェック (ボス考慮)
    for (const s of this.slimes) {
      const isBoss = this.isBossEnemy(s.enemyId);
      if (isBoss) {
        if (x >= s.gridX && x <= s.gridX + 1 && y >= s.gridY && y <= s.gridY + 1) return true;
        if (s.targetGridX !== undefined && s.targetGridY !== undefined) {
          if (x >= s.targetGridX && x <= s.targetGridX + 1 && y >= s.targetGridY && y <= s.targetGridY + 1) return true;
        }
      } else {
        if (s.gridX === x && s.gridY === y) return true;
        if (s.targetGridX === x && s.targetGridY === y) return true;
      }
    }

    // 3. マップ上のアイテムとの重複チェック
    if (this.mapData && this.mapData.items) {
      if (this.mapData.items.some((item: any) => item.x === x && item.y === y)) return true;
    }
    if (this.itemSprites && this.itemSprites.some((itemSprite: any) => itemSprite.gridX === x && itemSprite.gridY === y)) return true;

    // 4. マップ上のイベントとの重複チェック
    if (this.mapData && this.mapData.events) {
      if (this.mapData.events.some((e: any) => e.x === x && e.y === y)) return true;
    }

    // 5. 障害物との重複チェック
    if (this.mapData && this.mapData.obstacles) {
      if (this.mapData.obstacles.some((obs: any) => obs.x === x && obs.y === y)) return true;
    }

    return false;
  }

  private moveSlime(slime: SlimeData, dir: Direction) {
    if (slime.isMoving) return;

    let targetGridX = slime.gridX;
    let targetGridY = slime.gridY;

    switch (dir) {
      case 'up': targetGridY -= 1; break;
      case 'down': targetGridY += 1; break;
      case 'left': targetGridX -= 1; break;
      case 'right': targetGridX += 1; break;
      case 'up-left': targetGridY -= 1; targetGridX -= 1; break;
      case 'up-right': targetGridY -= 1; targetGridX += 1; break;
      case 'down-left': targetGridY += 1; targetGridX -= 1; break;
      case 'down-right': targetGridY += 1; targetGridX += 1; break;
    }

    const isBoss = this.isBossEnemy(slime.enemyId);

    if (isBoss) {
      // マップ外はみ出し防止 (ボスは2x2を占有するため、右下方向がはみ出ないようにする)
      if (targetGridX < 0 || targetGridX + 1 >= this.gridCols || targetGridY < 0 || targetGridY + 1 >= this.gridRows) {
        return;
      }

      // ボスの2x2マス全てについて判定
      for (let ox = 0; ox < 2; ox++) {
        for (let oy = 0; oy < 2; oy++) {
          const tx = targetGridX + ox;
          const ty = targetGridY + oy;

          // 勇者への攻撃判定
          if ((tx === this.currentGridX && ty === this.currentGridY) || 
              (tx === this.heroTargetGridX && ty === this.heroTargetGridY)) {
            slime.direction = dir;
            this.performSlimeAttack(slime);
            return;
          }

          // 他のキャラクター等との重なり防止
          if (this.isTileOccupiedByOthers(tx, ty, slime.id)) {
            return;
          }
        }
      }
    } else {
      // 通常スライムの衝突チェック
      // 勇者への攻撃判定
      if ((targetGridX === this.currentGridX && targetGridY === this.currentGridY) || 
          (targetGridX === this.heroTargetGridX && targetGridY === this.heroTargetGridY)) {
        slime.direction = dir;
        this.performSlimeAttack(slime);
        return;
      }
      // 全てのキャラクターとの重なり防止
      if (this.isTileOccupied(targetGridX, targetGridY)) return;
    }

    slime.isMoving = true;
    slime.targetGridX = targetGridX;
    slime.targetGridY = targetGridY;
    slime.direction = dir;
    
    // プルプル震える/移動準備
    this.playMonsterAnim(slime, 'shake', dir);

    const { GRID_SIZE } = GridMovementScene;
    // 128x128（2x2グリッド）のボスは基準点が中央にあるため、x, y座標が+GRID_SIZE (2x2の中心) になる。
    const targetX = isBoss 
      ? targetGridX * GRID_SIZE + GRID_SIZE 
      : targetGridX * GRID_SIZE + GRID_SIZE / 2;
    const targetY = isBoss 
      ? targetGridY * GRID_SIZE + GRID_SIZE 
      : targetGridY * GRID_SIZE + GRID_SIZE / 2;

    // プルプルする時間 (移動速度の30%程度、最大150ms)
    const shakeDuration = this.isTurboActive ? 2 : Math.min(150, this.moveSpeedMs * 0.3);
    const moveDuration = this.isTurboActive ? 18 : (this.moveSpeedMs - shakeDuration);

    this.time.delayedCall(shakeDuration, () => {
      if (!slime.sprite || !slime.sprite.active) return;
      this.playMonsterAnim(slime, 'walk', dir); // 歩行アニメーション
      this.tweens.add({
        targets: slime.sprite,
        x: targetX,
        y: targetY,
        duration: moveDuration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          slime.gridX = targetGridX;
          slime.gridY = targetGridY;
          slime.targetGridX = undefined;
          slime.targetGridY = undefined;
          slime.isMoving = false;
          if (slime.sprite && slime.sprite.active) {
            this.playMonsterAnim(slime, 'idle', dir);
          }
        }
      });
    });
  }

  public moveInDirection(dir: Direction): boolean {
    if (this.isMoving || dir === 'idle') return false;

    let targetGridX = this.currentGridX;
    let targetGridY = this.currentGridY;

    switch (dir) {
      case 'up': targetGridY -= 1; break;
      case 'down': targetGridY += 1; break;
      case 'left': targetGridX -= 1; break;
      case 'right': targetGridX += 1; break;
      case 'up-left': targetGridY -= 1; targetGridX -= 1; break;
      case 'up-right': targetGridY -= 1; targetGridX += 1; break;
      case 'down-left': targetGridY += 1; targetGridX -= 1; break;
      case 'down-right': targetGridY += 1; targetGridX += 1; break;
    }

    if (
      targetGridX < 0 || targetGridX >= this.gridCols ||
      targetGridY < 0 || targetGridY >= this.gridRows
    ) {
      return false;
    }

    const { VIEWPORT_COLS, VIEWPORT_ROWS, GRID_SIZE } = GridMovementScene;
    
    // スライムとの戦闘判定 (ボス考慮)
    const targetSlimeIndex = this.slimes.findIndex(s => {
      const isBoss = this.isBossEnemy(s.enemyId);
      if (isBoss) {
        // 2x2マスのいずれかと重なっているか
        if (targetGridX >= s.gridX && targetGridX <= s.gridX + 1 && targetGridY >= s.gridY && targetGridY <= s.gridY + 1) {
          return true;
        }
        if (s.targetGridX !== undefined && s.targetGridY !== undefined) {
          if (targetGridX >= s.targetGridX && targetGridX <= s.targetGridX + 1 && targetGridY >= s.targetGridY && targetGridY <= s.targetGridY + 1) {
            return true;
          }
        }
        return false;
      } else {
        return (s.gridX === targetGridX && s.gridY === targetGridY) || 
               (s.targetGridX === targetGridX && s.targetGridY === targetGridY);
      }
    });
    
    if (targetSlimeIndex !== -1) {
      this.isMoving = true;
      this.currentDirection = dir;
      
      let animDir = 'down';
      if (dir.includes('left')) animDir = 'left';
      else if (dir.includes('right')) animDir = 'right';
      else if (dir.includes('up')) animDir = 'up';
      else if (dir.includes('down')) animDir = 'down';
      
      this.hero.play(this.getAnimKey(`walk-${animDir}`), true);
      this.performAttack(targetSlimeIndex);
      return true;
    }

    // 全てのキャラクターとの重なり防止
    if (this.isTileOccupied(targetGridX, targetGridY)) return false;

    // カメラのデッドゾーン（中心3x3=9マスのグリッド内はカメラ固定、それ以外はスクロール）計算
    const maxCamGridX = this.gridCols - VIEWPORT_COLS; // 16 - 7 = 9
    const maxCamGridY = this.gridRows - VIEWPORT_ROWS; // 9

    let targetCamGridX = this.currentCamGridX;
    let targetCamGridY = this.currentCamGridY;

    const nextViewX = targetGridX - this.currentCamGridX;
    const nextViewY = targetGridY - this.currentCamGridY;

    // 7x7画面インデックス(0~6)。中心は3。中心±1(インデックス2~4)は固定、それ以外に進む場合にスクロール
    if (nextViewX > 4) {
      if (this.currentCamGridX < maxCamGridX) {
        targetCamGridX = this.currentCamGridX + 1;
      }
    } else if (nextViewX < 2) {
      if (this.currentCamGridX > 0) {
        targetCamGridX = this.currentCamGridX - 1;
      }
    }

    if (nextViewY > 4) {
      if (this.currentCamGridY < maxCamGridY) {
        targetCamGridY = this.currentCamGridY + 1;
      }
    } else if (nextViewY < 2) {
      if (this.currentCamGridY > 0) {
        targetCamGridY = this.currentCamGridY - 1;
      }
    }

    const isScrolling = targetCamGridX !== this.currentCamGridX || targetCamGridY !== this.currentCamGridY;

    this.isMoving = true;
    this.heroTargetGridX = targetGridX;
    this.heroTargetGridY = targetGridY;
    this.currentDirection = dir;
    
    // アニメーション用の方向を決定
    let animDir = 'down';
    if (dir.includes('left')) animDir = 'left';
    else if (dir.includes('right')) animDir = 'right';
    else if (dir.includes('up')) animDir = 'up';
    else if (dir.includes('down')) animDir = 'down';
    
    this.hero.play(this.getAnimKey(`walk-${animDir}`), true);

    const targetX = targetGridX * GRID_SIZE + GRID_SIZE / 2;
    const targetY = targetGridY * GRID_SIZE + GRID_SIZE / 2;

    // 目的地パルス
    this.targetMarker.clear();

    // HD-2D ダストトレイル
    if (this.isHd2dEffectsEnabled) {
      this.spawnStepTrail(this.hero.x, this.hero.y + 24);
    }

    this.notifyStateChange(isScrolling);

    // キャラクターの移動トゥイーン
    this.tweens.add({
      targets: this.hero,
      x: targetX,
      y: targetY,
      duration: this.isTurboActive ? 20 : this.moveSpeedMs,
      ease: 'Linear',
      onComplete: () => {
        this.currentGridX = targetGridX;
        this.currentGridY = targetGridY;
        this.heroTargetGridX = null;
        this.heroTargetGridY = null;
        this.isMoving = false;
        this.targetMarker.clear();

        this.hero.play(this.getAnimKey(`idle-${animDir}`), true);
        this.notifyStateChange(false);
        this.checkMapEvents();
        this.checkMapItems();
      }
    });

    // スクロールが必要な場合、カメラも並行してトゥイーン
    if (isScrolling) {
      this.tweens.add({
        targets: this.cameras.main,
        scrollX: targetCamGridX * GRID_SIZE,
        scrollY: targetCamGridY * GRID_SIZE,
        duration: this.isTurboActive ? 20 : this.moveSpeedMs,
        ease: 'Linear',
        onComplete: () => {
          this.currentCamGridX = targetCamGridX;
          this.currentCamGridY = targetCamGridY;
        }
      });
    }

    return true;
  }

  private checkMapItems() {
    const itemIndex = this.itemSprites.findIndex(i => i.gridX === this.currentGridX && i.gridY === this.currentGridY);
    if (itemIndex >= 0) {
      const item = this.itemSprites[itemIndex];

      // --- アーティファクトの特殊生成ロジック ---
      if (item.itemId.startsWith('artifact_')) {
        const parts = item.itemId.split('_'); // e.g. ['artifact', 'weapon', 'lvl1', '3']
        const cat = parts[1]; // 'weapon' | 'armor' | 'accessory'
        const tier = parts[2]; // 'lvl1' | 'lvl4' | 'lvl7' | 'lvl10'
        
        let nameBase = '';
        let baseAtk = 0;
        let baseDef = 0;
        let enchantMin = 2;
        let enchantMax = 5;
        let luckyVal = 10;
        let levelRangeStr = '';
        
        if (tier === 'lvl1') {
          levelRangeStr = 'Lv1-3';
          enchantMin = 2;
          enchantMax = 5;
          luckyVal = 10;
          if (cat === 'weapon') {
            nameBase = '大剣';
            baseAtk = 15;
          } else if (cat === 'armor') {
            nameBase = '全身鎧';
            baseDef = 12;
          } else {
            nameBase = '指輪';
            baseAtk = 6;
            baseDef = 6;
          }
        } else if (tier === 'lvl4') {
          levelRangeStr = 'Lv4-6';
          enchantMin = 4;
          enchantMax = 8;
          luckyVal = 15;
          if (cat === 'weapon') {
            nameBase = '勇者の剣';
            baseAtk = 30;
          } else if (cat === 'armor') {
            nameBase = '勇者の鎧';
            baseDef = 25;
          } else {
            nameBase = '勇者のネックレス';
            baseAtk = 12;
            baseDef = 12;
          }
        } else if (tier === 'lvl7') {
          levelRangeStr = 'Lv7-9';
          enchantMin = 7;
          enchantMax = 15;
          luckyVal = 20;
          if (cat === 'weapon') {
            nameBase = '伝説の剣';
            baseAtk = 60;
          } else if (cat === 'armor') {
            nameBase = '伝説の鎧';
            baseDef = 50;
          } else {
            nameBase = '伝説のアンクレット';
            baseAtk = 25;
            baseDef = 25;
          }
        } else if (tier === 'lvl10') {
          levelRangeStr = 'Lv10';
          enchantMin = 16;
          enchantMax = 20;
          luckyVal = 30;
          if (cat === 'weapon') {
            nameBase = 'オリハルコンソード';
            baseAtk = 100;
          } else if (cat === 'armor') {
            nameBase = 'オリハルコンアーマー';
            baseDef = 80;
          } else {
            nameBase = 'ゴッドオーブ';
            baseAtk = 40;
            baseDef = 40;
          }
        }
        
        // 属性のランダム決定
        const elements = ['fire', 'water', 'wind', 'earth', 'light', 'dark'];
        const elementMap: Record<string, string> = {
          fire: '火',
          water: '水',
          wind: '風',
          earth: '地',
          light: '光',
          dark: '闇'
        };
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        const elementLabel = elementMap[randomElement];
        
        // 付与数値の決定
        let enchantValue = Math.floor(Math.random() * (enchantMax - enchantMin + 1)) + enchantMin;
        // 10%の確率で極限値
        const isLucky = Math.random() < 0.10;
        if (isLucky) {
          enchantValue = luckyVal;
        }
        
        // アイテム表示名の構築
        const luckySuffix = isLucky ? ' ★極限★' : '';
        const displayName = `${nameBase} (${elementLabel}+${enchantValue})${luckySuffix}`;
        
        // ユニークIDの生成
        const genItemId = `artifact_gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // カスタムアイテムの生成
        let artifactGraphic = '🏺';
        if (cat === 'weapon') artifactGraphic = '⚔️';
        else if (cat === 'armor') artifactGraphic = '🛡️';
        else artifactGraphic = '💍';

        const generatedItem: any = {
          id: genItemId,
          name: displayName,
          type: 'equipment',
          equipmentType: cat === 'weapon' ? 'weapon' : (cat === 'armor' ? 'armor' : 'accessory'),
          chestGraphic: artifactGraphic,
          description: `秘境から発掘されたアーティファクト (${levelRangeStr})。${isLucky ? '限界突破した魔力を宿している。' : ''}`,
          attack: baseAtk,
          defense: baseDef
        };
        
        if (cat === 'weapon') {
          generatedItem.attackElement = randomElement;
          generatedItem.attackElementEnchantValue = enchantValue;
        } else if (cat === 'armor') {
          generatedItem.defenseElement = randomElement;
          generatedItem.defenseElementEnchantValue = enchantValue;
        } else {
          // 指輪 (Accessory) は両方に1/2ずつ
          const halfAtk = Math.floor(enchantValue / 2);
          const halfDef = Math.ceil(enchantValue / 2);
          if (halfAtk > 0) {
            generatedItem.attackElement = randomElement;
            generatedItem.attackElementEnchantValue = halfAtk;
          }
          if (halfDef > 0) {
            generatedItem.defenseElement = randomElement;
            generatedItem.defenseElementEnchantValue = halfDef;
          }
        }
        
        // リストに追加してReact側に同期
        this.customItems.push(generatedItem);
        if (this.onCustomItemsChangeCallback) {
          this.onCustomItemsChangeCallback([...this.customItems]);
        }
        
        // マップ上の設置アーティファクトとしての取得フラグを設定
        this.acquiredItems.add(item.itemId);
        // 生成されたユニークアイテム自体も所持アイテムボックスに追加
        this.acquiredItems.add(genItemId);
        
        // 自動装備の比較（より強い場合は自動的に装備する）
        const slot = generatedItem.equipmentType;
        const equippedId = slot === 'weapon' ? this.equippedWeaponId : (slot === 'armor' ? this.equippedArmorId : this.equippedAccessoryId);
        const currentEquipped = equippedId ? this.customItems.find((it: any) => it.id === equippedId) : null;
        
        // 総合力（基礎値＋属性付与値）で比較
        const currentPower = (currentEquipped?.attack || 0) + (currentEquipped?.defense || 0) + (currentEquipped?.attackElementEnchantValue || 0) + (currentEquipped?.defenseElementEnchantValue || 0);
        const newPower = (generatedItem.attack || 0) + (generatedItem.defense || 0) + (generatedItem.attackElementEnchantValue || 0) + (generatedItem.defenseElementEnchantValue || 0);
        
        const shouldEquip = !currentEquipped || (newPower > currentPower);
        if (shouldEquip) {
          if (slot === 'weapon') this.equippedWeaponId = genItemId;
          else if (slot === 'armor') this.equippedArmorId = genItemId;
          else this.equippedAccessoryId = genItemId;
          
          this.recalculateStats();
          
          const elementInfo = [];
          if (generatedItem.attackElement) {
            elementInfo.push(`攻撃属性: ${elementMap[generatedItem.attackElement]}(+${generatedItem.attackElementEnchantValue})`);
          }
          if (generatedItem.defenseElement) {
            elementInfo.push(`防御属性: ${elementMap[generatedItem.defenseElement]}(+${generatedItem.defenseElementEnchantValue})`);
          }
          const elementStr = elementInfo.length > 0 ? ` (${elementInfo.join(', ')})` : '';
          
          const luckyMsg = isLucky ? '\n🌟 超ラッキー！極限魔力(10%確率)が発現しました！' : '';
          const equipMsg = `『${displayName}』を鑑定し、装備した！ 🏺${luckyMsg}\n(攻撃力+${generatedItem.attack} 防御力+${generatedItem.defense}${elementStr})`;
          this.sendLog(`『${displayName}』を装備した！ 🏺 (攻撃力+${generatedItem.attack} 防御力+${generatedItem.defense})`, 'info');
          this.enqueueMessage('item', equipMsg);
        } else {
          const luckyMsg = isLucky ? '\n🌟 超ラッキー！極限魔力(10%確率)が発現しました！' : '';
          const msg = `『${displayName}』を獲得した！ 🏺${luckyMsg}\n(攻撃力+${generatedItem.attack} 防御力+${generatedItem.defense}) (Exp +5)`;
          this.sendLog(`『${displayName}』を手に入れた！ 🏺`, 'info');
          this.enqueueMessage('item', msg);
        }
        
        this.heroExp += 5;
        this.checkLevelUp();
        
        if (item.sprite && item.sprite.active) {
          item.sprite.destroy();
        }
        this.itemSprites.splice(itemIndex, 1);
        this.notifyStateChange(false);
        return;
      }
      // --- アーティファクトの特殊生成ロジック終了 ---

      this.acquiredItems.add(item.itemId);
      const isDefault = item.itemId === 'treasure_text';
      const customItem = this.customItems.find((it: any) => it.id === item.itemId);

      if (isDefault) {
        this.sendLog('宝を手に入れた！ ✨ (Exp +5)', 'info');
        this.enqueueMessage('item', '宝を手に入れた！ ✨ (Exp +5)');
        this.heroExp += 5;
        this.checkLevelUp();
            } else if (customItem) {
        if (customItem.type === 'equipment') {
          // equipmentTypeを推測または取得
          let slot = customItem.equipmentType;
          if (!slot) {
            const name = customItem.name || '';
            if (name.includes('剣') || name.includes('ブレード') || name.includes('ソード') || name.includes('刀') || name.includes('斧') || name.includes('弓') || name.includes('杖') || name.includes('ハンマー') || name.includes('ウェポン') || name.includes('アクス') || name.includes('ダガー')) {
              slot = 'weapon';
            } else if (name.includes('鎧') || name.includes('盾') || name.includes('シールド') || name.includes('アーマー') || name.includes('兜') || name.includes('ヘルム') || name.includes('ローブ') || name.includes('ベスト') || name.includes('プレート')) {
              slot = 'armor';
            } else if (name.includes('指輪') || name.includes('リング') || name.includes('ネックレス') || name.includes('アンクレット') || name.includes('オーブ') || name.includes('アミュレット') || name.includes('靴') || name.includes('ブーツ') || name.includes('ベルト')) {
              slot = 'accessory';
            } else if ((customItem.attack || 0) > 0 && (!(customItem.defense || 0) || (customItem.attack || 0) > (customItem.defense || 0))) {
              slot = 'weapon';
            } else if ((customItem.defense || 0) > 0) {
              slot = 'armor';
            } else {
              slot = 'accessory';
            }
          }
          if (!slot) slot = 'weapon';

          // 表示用のアイコンを取得
          let itemIcon = customItem.chestGraphic || '🎁';
          const chestIcons = ['📦', '🎁', '💎', '⭐', '💀', '🔔', '💰', '👑', '🏺'];
          if (chestIcons.includes(itemIcon)) {
            if (slot === 'weapon') itemIcon = '⚔️';
            else if (slot === 'armor') itemIcon = '🛡️';
            else if (slot === 'accessory') itemIcon = '💍';
          }

          const equippedId = slot === 'weapon' ? this.equippedWeaponId : (slot === 'armor' ? this.equippedArmorId : this.equippedAccessoryId);
          const currentEquipped = equippedId ? this.customItems.find((it: any) => it.id === equippedId) : null;
          const currentAtk = currentEquipped?.attack || 0;
          const currentDef = currentEquipped?.defense || 0;
          const newAtk = customItem.attack || 0;
          const newDef = customItem.defense || 0;
          
          const shouldEquip = !currentEquipped || (newAtk > currentAtk) || (newDef > currentDef);
          if (shouldEquip) {
            if (slot === 'weapon') this.equippedWeaponId = customItem.id;
            else if (slot === 'armor') this.equippedArmorId = customItem.id;
            else this.equippedAccessoryId = customItem.id;
            this.recalculateStats();
            
            const elementInfo = [];
            const elMap: Record<string, string> = { fire: '火', water: '水', wind: '風', earth: '地', light: '光', dark: '闇' };
            if (customItem.attackElement) {
              let msg = `攻撃属性: ${elMap[customItem.attackElement] || customItem.attackElement}`;
              if (customItem.attackElementEnchantValue && customItem.attackElementEnchantValue > 0) {
                msg += `(付与攻+${customItem.attackElementEnchantValue})`;
              }
              elementInfo.push(msg);
            }
            if (customItem.defenseElement) {
              let msg = `防御属性: ${elMap[customItem.defenseElement] || customItem.defenseElement}`;
              if (customItem.defenseElementEnchantValue && customItem.defenseElementEnchantValue > 0) {
                msg += `(付与防+${customItem.defenseElementEnchantValue})`;
              }
              elementInfo.push(msg);
            }
            const elementStr = elementInfo.length > 0 ? ` (${elementInfo.join(', ')})` : '';
            
            const equipMsg = `『${customItem.name}』を装備した！ ${itemIcon}\n(攻撃力+${newAtk} 防御力+${newDef}${elementStr})\n${customItem.description || ''}`;
            this.sendLog(`『${customItem.name}』を装備した！ ${itemIcon} (攻撃力+${newAtk} 防御力+${newDef})`, 'info');
            this.enqueueMessage('item', equipMsg);
          } else {
            const descText = customItem.description ? `\n${customItem.description}` : '';
            const msg = `『${customItem.name}』(装備品)を手に入れた！ ${itemIcon} (攻撃力+${newAtk} 防御力+${newDef}) (Exp +5)${descText}`;
            this.sendLog(`『${customItem.name}』を手に入れた！ ${itemIcon}`, 'info');
            this.enqueueMessage('item', msg);
          }
        } else {
          const typeLabel = customItem.type === 'magic' ? '魔法' : customItem.type === 'move_asset' ? 'ムーブアセット' : customItem.type === 'event' ? 'イベント' : customItem.type === 'drop' ? 'ドロップ' : 'アーティファクト';
          const itemIcon = customItem.chestGraphic || '✨';
          const descText = customItem.description ? `\n${customItem.description}` : '';
          const msg = `『${customItem.name}』(${typeLabel})を手に入れた！ ${itemIcon} (Exp +5)${descText}`;
          this.sendLog(`『${customItem.name}』を手に入れた！ ${itemIcon}`, 'info');
          this.enqueueMessage('item', msg);
        }
        this.heroExp += 5;
        this.checkLevelUp();
      } else {
        this.sendLog(`アイテムを手に入れた！ (${item.itemId})`, 'info');
        this.enqueueMessage('item', `アイテムを手に入れた！ (${item.itemId})`);
      }

      if (item.sprite && item.sprite.active) {
        item.sprite.destroy();
      }
      this.itemSprites.splice(itemIndex, 1);
      this.notifyStateChange(false);
    }
  }

  
  public showMonologue(text: string, onComplete?: () => void) {
    this.enqueueMessage('event', text, onComplete);
  }

  public enqueueMessage(type: string, text: string, onComplete?: () => void) {
    this.messageQueue.push({ type, text, onComplete });
    this.processMessageQueue();
  }

  private processMessageQueue() {
    if (this.isShowingMonologue || this.messageQueue.length === 0) return;
    const msg = this.messageQueue.shift();
    if (!msg) return;

    // Reset movement inputs on monologue trigger to prevent running away or locked inputs
    this.virtualInput = { up: false, down: false, left: false, right: false };
    if (this.input && this.input.keyboard) {
      this.input.keyboard.resetKeys();
    }

    this.isShowingMonologue = true;

    if (this.onSystemMessageCallback) {
        this.onSystemMessageCallback(msg.type, msg.text, () => {
            this.isShowingMonologue = false;
            if (this.input && this.input.keyboard) {
              this.input.keyboard.resetKeys();
            }
            if (msg.onComplete) {
              const action = msg.onComplete;
              action();
            }
            this.processMessageQueue();
        });
    } else {
        this.isShowingMonologue = false;
        if (msg.onComplete) msg.onComplete();
        this.processMessageQueue();
    }
  }

  // Now handled by React callback
  private dismissMonologue() {}

  private checkMapEvents() {
    if (!this.mapData || !this.mapData.events) return;
    const eventsHere = this.mapData.events.filter((e: any) => e.x === this.currentGridX && e.y === this.currentGridY);
    const teleportEvent = eventsHere.find((e: any) => e.type === 'teleport');
    const monologueEvent = eventsHere.find((e: any) => e.type === 'monologue');
    const customEvent = eventsHere.find((e: any) => e.type === 'custom_event');
    
    if (customEvent && this.onCustomEventCallback && this.canPlayEvent(customEvent)) {
      this.isShowingMonologue = true; 
      this.markEventPlayed(customEvent);
      this.onCustomEventCallback(customEvent.data?.eventId || '', () => {
        this.isShowingMonologue = false;
        if (teleportEvent) {
          this.handleTeleport(teleportEvent);
        }
      });
      return;
    }

    if (monologueEvent && this.canPlayEvent(monologueEvent)) {
      this.markEventPlayed(monologueEvent);
      this.showMonologue(monologueEvent.data?.text || '', () => {
        if (teleportEvent) {
          this.handleTeleport(teleportEvent);
        }
      });
      return;
    }

    if (teleportEvent) {
      this.handleTeleport(teleportEvent);
    }
  }

  private handleTeleport(event: any) {
    const eventData = event.data || {};
    let met = true;
    const expRate = (this.visitedGrids.size / this.totalGrids) * 100;
    const sRate = (this.viewedGrids.size / this.totalGrids) * 100;
    const dRate = this.getDefeatRate();
    
    if (eventData.requiredExplorationRate && expRate < eventData.requiredExplorationRate) met = false;
    if (eventData.requiredSearchRate && sRate < eventData.requiredSearchRate) met = false;
    if (eventData.requiredDefeatRate && dRate < eventData.requiredDefeatRate) met = false;
    
    if (met) {
      const doTransition = () => {
        this.isTurboActive = false;
        if (this.onTestPlayClear) {
          this.onTestPlayClear();
        } else if (this.onTeleport && eventData.targetMap) {
          this.sendLog(`条件クリア！次のマップへ移動します。`, 'system');
          this.onTeleport(eventData.targetMap);
        } else {
          this.sendLog(`条件クリア！次のマップへ移動します。(※移動先未設定)`, 'system');
        }
      };

      const teleportHasCustomEvent = eventData.eventId;
      if (teleportHasCustomEvent && this.onCustomEventCallback && this.canPlayEvent(event)) {
        this.isShowingMonologue = true;
        this.markEventPlayed(event);
        this.onCustomEventCallback(eventData.eventId, () => {
          this.isShowingMonologue = false;
          doTransition();
        });
      } else {
        doTransition();
      }
    } else {
      const reqExp = eventData.requiredExplorationRate || 0;
      const reqSearch = eventData.requiredSearchRate || 0;
      const reqDefeat = eventData.requiredDefeatRate || 0;
      let reason = '';
      if (reqExp > 0 && expRate < reqExp) reason += ` 踏破率: ${Math.floor(expRate)}% / ${reqExp}%`;
      if (reqSearch > 0 && sRate < reqSearch) reason += ` 捜索率: ${Math.floor(sRate)}% / ${reqSearch}%`;
      if (reqDefeat > 0 && dRate < reqDefeat) reason += ` 撃破率: ${Math.floor(dRate)}% / ${reqDefeat}%`;
      this.sendLog(`イベント発生条件を満たしていません:${reason}`, 'info');
    }
  }

  private spawnStepTrail(px: number, py: number) {
    const puff = this.add.circle(px, py, 6, 0xffffff, 0.5);
    puff.setDepth(5);
    this.tweens.add({
      targets: puff,
      scale: { from: 0.8, to: 2.2 },
      alpha: { from: 0.5, to: 0 },
      y: py - 6,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => puff.destroy()
    });
  }

  private getDefeatRate(): number {
    const maxEnemies = this.mapData?.maxEnemies;
    const isInfinite = maxEnemies === undefined || maxEnemies === 'infinite';
    
    if (isInfinite) {
      if (this.bossSpawned) {
        return this.bossDefeated ? 100 : 0;
      }
      return 0;
    } else {
      const targetCount = Math.max(maxEnemies as number, this.bossSpawned ? 1 : 0);
      if (targetCount > 0) {
        return Math.min(100, (this.enemiesDefeated / targetCount) * 100);
      }
    }
    return 0;
  }

  private getDisplayDefeatRate(): number | null {
    const maxEnemies = this.mapData?.maxEnemies;
    const isInfinite = maxEnemies === undefined || maxEnemies === 'infinite';
    
    if (isInfinite && !this.bossSpawned) {
      return null;
    }
    return this.getDefeatRate();
  }

  public resetPosition(fromMapId?: string | null, overridePosition?: { gridX: number; gridY: number; camGridX: number; camGridY: number } | null) {
    // マップ切り替え時は強制的に移動 animation 等をクリアしてリセットする
    this.isMoving = false;
    if (this.tweens) {
      this.tweens.killAll();
    }

    const isMapChanging = fromMapId !== undefined && fromMapId !== this.mapData?.id;
    if (isMapChanging) {
      this.totalEnemiesSpawned = 0;
      this.enemiesDefeated = 0;
      this.bossSpawned = false;
      this.bossDefeated = false;
      this.bossAnnouncementSent = false;
    } else {
      // 同一マップでのリセット時はボス再生成のためにspawnフラグだけ落とすが、アナウンスや討伐状況はリセットしない
      this.bossSpawned = false;
    }
    
    // マップ切り替え時の処理
    if (isMapChanging) {
       this.playedMapEvents.clear();
     }
    
    // 踏破・視野情報をクリアし、表示もクリアする
    this.visitedGrids.clear();
    this.viewedGrids.clear();
    if (this.visitedTraceGraphics) {
      this.visitedTraceGraphics.clear();
    }
    
    // reset slimes array when loading map
    this.slimes.forEach(s => {
      if (s.sprite && s.sprite.active) s.sprite.destroy();
    });
    this.slimes = [];
    
    this.itemSprites.forEach(item => {
      if (item.sprite && item.sprite.active) item.sprite.destroy();
    });
    this.itemSprites = [];

    this.obstacleSprites.forEach(obs => {
      if (obs.sprite && obs.sprite.active) obs.sprite.destroy();
    });
    this.obstacleSprites = [];

    this.teleportPortals.forEach(p => {
      if (p.container && p.container.active) p.container.destroy();
    });
    this.teleportPortals = [];

    if (overridePosition) {
      this.currentGridX = overridePosition.gridX;
      this.currentGridY = overridePosition.gridY;
      const { GRID_SIZE } = GridMovementScene;
      if (this.cameras && this.cameras.main) {
        this.cameras.main.setBounds(0, 0, this.gridCols * GRID_SIZE, this.gridRows * GRID_SIZE);
      }
    } else if (this.mapData) {
       const { GRID_SIZE } = GridMovementScene;
       // カメラのスクロール境界を新しいマップサイズに動的更新
       if (this.cameras && this.cameras.main) {
         this.cameras.main.setBounds(0, 0, this.gridCols * GRID_SIZE, this.gridRows * GRID_SIZE);
       }

       // 1. 指定された移行元のマップID(fromMapId)に合致するスタート地点を優先検索
       let startEvent = null;
       if (fromMapId) {
         startEvent = this.mapData.events?.find(
           (e: any) => e.type === 'start_point' && e.data?.fromMap === fromMapId
         );
       }

       // 2. なければ、設定なし(fromMapがnullまたは空文字列)の初期値を探す
       if (!startEvent) {
         startEvent = this.mapData.events?.find(
           (e: any) => e.type === 'start_point' && (!e.data || e.data.fromMap === null || e.data.fromMap === '')
         );
       }

       // 3. それでもなければ、何かしらの最初の start_point を使用
       if (!startEvent) {
         startEvent = this.mapData.events?.find((e: any) => e.type === 'start_point');
       }

       if (startEvent) {
          this.currentGridX = startEvent.x;
          this.currentGridY = startEvent.y;
       } else {
          this.currentGridX = 0;
          this.currentGridY = 0;
       }
    } else {
       this.currentGridX = 7;
       this.currentGridY = 7;
    }

    if (overridePosition) {
      this.currentCamGridX = overridePosition.camGridX;
      this.currentCamGridY = overridePosition.camGridY;
    } else {
      this.currentCamGridX = Math.max(0, Math.min(this.currentGridX - Math.floor(GridMovementScene.VIEWPORT_COLS / 2), this.gridCols - GridMovementScene.VIEWPORT_COLS));
      this.currentCamGridY = Math.max(0, Math.min(this.currentGridY - Math.floor(GridMovementScene.VIEWPORT_ROWS / 2), this.gridRows - GridMovementScene.VIEWPORT_ROWS));
    }
    
    const { GRID_SIZE } = GridMovementScene;
    if (this.hero) {
      this.hero.setPosition(this.currentGridX * GRID_SIZE + GRID_SIZE / 2, this.currentGridY * GRID_SIZE + GRID_SIZE / 2);
    }
    if (this.cameras && this.cameras.main) {
      this.cameras.main.scrollX = this.currentCamGridX * GRID_SIZE;
      this.cameras.main.scrollY = this.currentCamGridY * GRID_SIZE;
    }
    if (this.hero) {
      this.hero.play(this.getAnimKey('idle-down'));
    }
    this.currentDirection = 'idle';
    this.spawnMapItems();
    this.spawnMapObstacles();
    this.spawnInitialEnemies();
    this.notifyStateChange(false);

    // Initial check (start_point, custom_event, monologue)
    if (this.mapData && this.mapData.events) {
      const customEvent = this.mapData.events.find((e: any) => e.type === 'custom_event' && e.x === this.currentGridX && e.y === this.currentGridY);
      const startPointEvent = this.mapData.events.find((e: any) => e.type === 'start_point' && e.x === this.currentGridX && e.y === this.currentGridY);
      
      const activeEvent = customEvent || startPointEvent;
      
      if (activeEvent && activeEvent.data?.eventId && this.onCustomEventCallback && this.canPlayEvent(activeEvent)) {
        this.isShowingMonologue = true;
        this.markEventPlayed(activeEvent);
        this.onCustomEventCallback(activeEvent.data.eventId, () => {
          this.isShowingMonologue = false;
        });
        return;
      }

      const monologueEvent = this.mapData.events.find((e: any) => e.type === 'monologue' && e.x === this.currentGridX && e.y === this.currentGridY);
      if (monologueEvent && this.canPlayEvent(monologueEvent)) {
        this.markEventPlayed(monologueEvent);
        this.showMonologue(monologueEvent.data?.text || '', () => {
          if (activeEvent && activeEvent.type === 'start_point' && activeEvent.data?.targetMap) {
            this.handleTeleport(activeEvent);
          }
        });
        return;
      }
    }
  }

  private updateStats(currentX: number, currentY: number, camX: number, camY: number) {
    this.visitedGrids.add(`${currentX},${currentY}`);

    for (let x = 0; x < GridMovementScene.VIEWPORT_COLS; x++) {
      for (let y = 0; y < GridMovementScene.VIEWPORT_ROWS; y++) {
        const gridX = camX + x;
        const gridY = camY + y;
        if (gridX >= 0 && gridX < this.gridCols && gridY >= 0 && gridY < this.gridRows) {
          this.viewedGrids.add(`${gridX},${gridY}`);
        }
      }
    }

    if (this.setOnStatsChange) {
      const expRate = (this.visitedGrids.size / this.totalGrids) * 100;
      const searchRate = (this.viewedGrids.size / this.totalGrids) * 100;
      const dRate = this.getDisplayDefeatRate();
      
      this.setOnStatsChange(expRate, searchRate, dRate);
    }
    this.updateTeleportPortals();
    this.drawVisitedTrace();
  }

  private notifyStateChange(isScrolling: boolean = false) {
    this.updateStats(this.currentGridX, this.currentGridY, this.currentCamGridX, this.currentCamGridY);
    
    if (this.onStateChangeCallback) {
      const statusAsset = getHeroStatusByLevel(this.heroLevel);
      this.onStateChangeCallback({
        gridX: this.currentGridX,
        gridY: this.currentGridY,
        camGridX: this.currentCamGridX,
        camGridY: this.currentCamGridY,
        direction: this.currentDirection,
        isMoving: this.isMoving,
        isScrolling: isScrolling,
        speedMs: this.moveSpeedMs,
        hp: this.heroHp,
        maxHp: this.heroMaxHp,
        attack: this.heroAttack,
        defense: this.heroDefense,
        level: this.heroLevel,
        exp: this.heroExp,
        requiredExp: statusAsset?.requiredExp || 10,
        acquiredItems: Array.from(this.acquiredItems),
        equippedWeaponId: this.equippedWeaponId,
        equippedArmorId: this.equippedArmorId,
        equippedAccessoryId: this.equippedAccessoryId,
        baseAttack: this.baseHeroAttack,
        baseDefense: this.baseHeroDefense,
        displayMode: this.displayMode
      });
    }
  }

  private findScatteredSpawnPosition(minHeroDist: number = 4, minEnemyDist: number = 3, isBoss: boolean = false): { x: number; y: number } | null {
    // 候補地選定プロセス（複数パスで徐々に制約を緩和）
    const maxPasses = 5;
    for (let pass = 0; pass < maxPasses; pass++) {
      const currentMinHeroDist = Math.max(0, minHeroDist - pass);
      const currentMinEnemyDist = Math.max(0, minEnemyDist - pass);
      
      const candidates: { x: number; y: number }[] = [];
      
      // マップ全体の移動可能な範囲から選定（外周1タイルは壁などの設置を考慮して内側を優先）
      for (let x = 1; x < this.gridCols - 1; x++) {
        for (let y = 1; y < this.gridRows - 1; y++) {
          let isOccupied = false;
          if (isBoss) {
            // ボスは2x2がマップ内かつ空いているかチェック
            if (x + 1 >= this.gridCols || y + 1 >= this.gridRows) {
              continue;
            }
            for (let ox = 0; ox < 2; ox++) {
              for (let oy = 0; oy < 2; oy++) {
                if (this.isTileOccupiedByAnything(x + ox, y + oy)) {
                  isOccupied = true;
                  break;
                }
              }
            }
          } else {
            isOccupied = this.isTileOccupiedByAnything(x, y);
          }

          if (isOccupied) {
            continue;
          }

          // 勇者からの距離（マンハッタン距離）
          const heroDist = Math.abs(x - this.currentGridX) + Math.abs(y - this.currentGridY);
          if (heroDist < currentMinHeroDist) {
            continue;
          }

          // 初期画面（ビューポート）内への出現を避ける
          if (currentMinHeroDist > 0) {
            const inViewport = (x >= this.currentCamGridX && x < this.currentCamGridX + GridMovementScene.VIEWPORT_COLS) &&
                               (y >= this.currentCamGridY && y < this.currentCamGridY + GridMovementScene.VIEWPORT_ROWS);
            if (inViewport) {
              continue;
            }
          }

          // 他の敵との最小距離チェック
          let tooCloseToOtherEnemy = false;
          for (const s of this.slimes) {
            const dist = Math.abs(x - s.gridX) + Math.abs(y - s.gridY);
            if (dist < currentMinEnemyDist) {
              tooCloseToOtherEnemy = true;
              break;
            }
          }
          if (tooCloseToOtherEnemy) {
            continue;
          }

          candidates.push({ x, y });
        }
      }

      if (candidates.length > 0) {
        return Phaser.Utils.Array.GetRandom(candidates);
      }
    }

    // 究極のフォールバック：重複が一切ないマスを探す
    const fallbackCandidates: { x: number; y: number }[] = [];
    for (let x = 0; x < this.gridCols; x++) {
      for (let y = 0; y < this.gridRows; y++) {
        let isOccupied = false;
        if (isBoss) {
          if (x + 1 >= this.gridCols || y + 1 >= this.gridRows) {
            continue;
          }
          for (let ox = 0; ox < 2; ox++) {
            for (let oy = 0; oy < 2; oy++) {
              if (this.isTileOccupiedByAnything(x + ox, y + oy)) {
                isOccupied = true;
                break;
              }
            }
          }
        } else {
          isOccupied = this.isTileOccupiedByAnything(x, y);
        }

        if (!isOccupied) {
          fallbackCandidates.push({ x, y });
        }
      }
    }
    if (fallbackCandidates.length > 0) {
      return Phaser.Utils.Array.GetRandom(fallbackCandidates);
    }

    // 最後の手段：勇者以外のすべてのマス
    for (let x = 0; x < this.gridCols; x++) {
      for (let y = 0; y < this.gridRows; y++) {
        if (x !== this.currentGridX || y !== this.currentGridY) {
          return { x, y };
        }
      }
    }

    return null;
  }

  private spawnInitialEnemies() {
    // Clean up any existing slimes
    this.slimes.forEach(s => {
      if (s.sprite && s.sprite.active) s.sprite.destroy();
    });
    this.slimes = [];

    if (!this.mapData) return;

    const { GRID_SIZE } = GridMovementScene;
    const maxEnemies = this.mapData.maxEnemies;
    const isInfinite = maxEnemies === undefined || maxEnemies === 'infinite';
    const initialSpawnCount = isInfinite ? 5 : (maxEnemies as number);

    // Determine initial texture based on bgMode
    const mode = this.displayMode; // 'text' | 'grayscale' | 'normal'
    const defaultTex = mode === 'grayscale' ? 'slime_spritesheet_gray' : 'slime_spritesheet';

    // 1. Spawn Boss if configured and not yet defeated
    if (this.mapData.boss && !this.bossDefeated) {
      const bossConfig = getEnemyAssetById(this.mapData.boss);
      if (bossConfig) {
        const pos = this.findScatteredSpawnPosition(4, 3, true);
        if (pos) {
          const sx = pos.x;
          const sy = pos.y;
          const isLargeBoss = ['gray_boss', 'color_demon_king', 'color_dragon'].includes(bossConfig.id);
          
          // ボスは2x2グリッドの中心点にスライムを表示する
          const bossX = isLargeBoss ? sx * GRID_SIZE + GRID_SIZE : sx * GRID_SIZE + GRID_SIZE / 2;
          const bossY = isLargeBoss ? sy * GRID_SIZE + GRID_SIZE : sy * GRID_SIZE + GRID_SIZE / 2;

          // Use a default texture first, playMonsterAnim will instantly load and resolve the custom textures
          const bossSprite = this.add.sprite(bossX, bossY, defaultTex, 0);
          bossSprite.setDepth(9);
          
          if (isLargeBoss) {
            bossSprite.setScale(1.0);
            bossSprite.setOrigin(0.5, 0.5); // 中央。128x128ピクセルが2x2（128x128ピクセル）を綺麗に覆います。
          } else {
            bossSprite.setScale(1.4);
          }

          const newBoss: SlimeData = {
            id: `boss-${Math.random().toString(36).substring(2, 9)}`,
            name: `👑${bossConfig.name}`,
            sprite: bossSprite,
            gridX: sx,
            gridY: sy,
            isMoving: false,
            hp: bossConfig.hp,
            maxHp: bossConfig.hp,
            attack: bossConfig.attack,
            defense: bossConfig.defense !== undefined ? bossConfig.defense : 0,
            exp: (bossConfig.exp !== undefined && !isNaN(Number(bossConfig.exp))) ? Number(bossConfig.exp) : 50,
            speed: bossConfig.speed,
            behavior: bossConfig.behavior || 'seek',
            enemyId: bossConfig.id,
            direction: 'down',
            attackElement: bossConfig.attackElement,
            attackElementEnchantValue: bossConfig.attackElementEnchantValue,
            defenseElement: bossConfig.defenseElement,
            defenseElementEnchantValue: bossConfig.defenseElementEnchantValue,
          };
          this.slimes.push(newBoss);
          this.bossSpawned = true;
          this.playMonsterAnim(newBoss, 'idle', 'down');
          this.totalEnemiesSpawned++;
          if (!this.bossAnnouncementSent) {
            this.sendLog(`エリアボス【${bossConfig.name}】が現れた！ 👑`, 'system');
            this.bossAnnouncementSent = true;
          }
        }
      }
    }

    // 2. Spawn Regular Enemies
    const spawnedSoFar = this.totalEnemiesSpawned;
    const remainingToSpawn = isInfinite ? initialSpawnCount : Math.max(0, (maxEnemies as number) - spawnedSoFar);
    
    // ボスを含め合計で最大5体までに制限する
    const maxActiveEnemies = 5;
    const slimesToSpawn = Math.max(0, maxActiveEnemies - this.slimes.length);
    const loopCount = Math.min(slimesToSpawn, remainingToSpawn);
    
    for (let i = 0; i < loopCount; i++) {
      const pos = this.findScatteredSpawnPosition(4, 3);
      if (!pos) continue;

      const sx = pos.x;
      const sy = pos.y;

      let enemyConfig: EnemyAsset | undefined = undefined;
      if (this.mapData.enemies && this.mapData.enemies.length > 0) {
        const enemyId = Phaser.Utils.Array.GetRandom(this.mapData.enemies as string[]);
        enemyConfig = getEnemyAssetById(enemyId);
      }
      if (!enemyConfig) {
        const available = getAvailableEnemies(this.mapData.bgMode || 'image');
        if (available.length > 0) {
          enemyConfig = Phaser.Utils.Array.GetRandom(available);
        } else {
          enemyConfig = { id: 'default', name: 'スライム', hp: 10, attack: 2, defense: 0, exp: 2, speed: 1000, behavior: 'random' };
        }
      }

      const slimeSprite = this.add.sprite(sx * GRID_SIZE + GRID_SIZE / 2, sy * GRID_SIZE + GRID_SIZE / 2, defaultTex, 0);
      slimeSprite.setDepth(9);

      const newSlime: SlimeData = {
        id: `slime-${Math.random().toString(36).substring(2, 9)}`,
        name: enemyConfig.name,
        sprite: slimeSprite,
        gridX: sx,
        gridY: sy,
        isMoving: false,
        hp: enemyConfig.hp,
        maxHp: enemyConfig.hp,
        attack: enemyConfig.attack,
        defense: enemyConfig.defense !== undefined ? enemyConfig.defense : 0,
        exp: (enemyConfig.exp !== undefined && !isNaN(Number(enemyConfig.exp))) ? Number(enemyConfig.exp) : 2,
        speed: enemyConfig.speed,
        behavior: enemyConfig.behavior,
        enemyId: enemyConfig.id,
        direction: 'down',
        attackElement: enemyConfig.attackElement,
        attackElementEnchantValue: enemyConfig.attackElementEnchantValue,
        defenseElement: enemyConfig.defenseElement,
        defenseElementEnchantValue: enemyConfig.defenseElementEnchantValue,
      };

      this.slimes.push(newSlime);
      this.playMonsterAnim(newSlime, 'idle', 'down');
      this.totalEnemiesSpawned++;
    }
  }

  private spawnMapItems() {
    if (!this.mapData || !this.mapData.items) return;
    const { GRID_SIZE } = GridMovementScene;
    
    this.mapData.items.forEach((item: any) => {
      // Check if item has already been collected
      if (this.acquiredItems && this.acquiredItems.has(item.itemId)) {
        return;
      }

      let spriteObj: Phaser.GameObjects.GameObject;

      if (this.displayMode === 'text') {
        // Text mode: display "宝" in white using the same "Inter", sans-serif bold font as "勇" and "敵"
        const textObj = this.add.text(
          item.x * GRID_SIZE + GRID_SIZE / 2, 
          item.y * GRID_SIZE + GRID_SIZE / 2, 
          '宝', 
          { 
            fontFamily: '"Inter", sans-serif', 
            fontSize: '40px', 
            color: '#ffffff', 
            fontStyle: 'bold' 
          }
        );
        textObj.setOrigin(0.5, 0.5);
        textObj.setDepth(5);
        spriteObj = textObj;
      } else if (this.displayMode === 'grayscale') {
        // Grayscale mode: display a rough pixel art treasure chest
        const textureKey = `item_gray_chest_pixel`;
        if (!this.textures.exists(textureKey)) {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d')!;
          
          // Helper to draw a pixel on a 16x16 grid
          const gp = (x: number, y: number, w: number, h: number, color: string) => {
            ctx.fillStyle = color;
            ctx.fillRect(x * 4, y * 4, w * 4, h * 4);
          };

          // Outline
          gp(2, 4, 12, 10, '#000000');
          // Lid
          gp(3, 5, 10, 3, '#888888');
          // Lid highlight
          gp(3, 4, 10, 1, '#bbbbbb');
          // Line between lid and body
          gp(3, 8, 10, 1, '#000000');
          // Body
          gp(3, 9, 10, 4, '#555555');
          // Lock
          gp(7, 7, 2, 3, '#dddddd');

          this.textures.addCanvas(textureKey, canvas);
        }

        const sprite = this.add.sprite(
          item.x * GRID_SIZE + GRID_SIZE / 2, 
          item.y * GRID_SIZE + GRID_SIZE / 2, 
          textureKey
        );
        sprite.setDepth(5);
        spriteObj = sprite;
      } else {
        // Normal mode
        const isDefault = item.itemId === 'treasure_text';
        const customItem = this.customItems.find((it: any) => it.id === item.itemId);
        const graphic = item.graphic || (isDefault ? '宝' : '📦');

        const textObj = this.add.text(
          item.x * GRID_SIZE + GRID_SIZE / 2, 
          item.y * GRID_SIZE + GRID_SIZE / 2, 
          graphic, 
          { 
            fontFamily: 'serif', 
            fontSize: '24px', 
            color: '#fbbf24', 
            fontStyle: 'bold' 
          }
        );
        textObj.setOrigin(0.5, 0.5);
        textObj.setDepth(5);
        spriteObj = textObj;
      }

      this.itemSprites.push({
        gridX: item.x,
        gridY: item.y,
        sprite: spriteObj,
        itemId: item.itemId
      });
    });
  }

  private spawnMapObstacles() {
    if (!this.mapData || !this.mapData.obstacles) return;
    const { GRID_SIZE } = GridMovementScene;

    this.mapData.obstacles.forEach((obs: any) => {
      if (obs.type === 'transparent') {
        return;
      }

      let spriteObj: Phaser.GameObjects.GameObject;

      if (this.displayMode === 'text') {
        let label = '壁';
        let color = '#ef4444';
        if (obs.type === 'pillar') { label = '柱'; color = '#9ca3af'; }
        else if (obs.type === 'rock') { label = '岩'; color = '#64748b'; }
        else if (obs.type === 'peg') { label = '杭'; color = '#b45309'; }

        const textObj = this.add.text(
          obs.x * GRID_SIZE + GRID_SIZE / 2, 
          obs.y * GRID_SIZE + GRID_SIZE / 2, 
          label, 
          { 
            fontFamily: '"Inter", sans-serif', 
            fontSize: '32px', 
            color: color, 
            fontStyle: 'bold' 
          }
        );
        textObj.setOrigin(0.5, 0.5);
        textObj.setDepth(4);
        spriteObj = textObj;
      } else {
        const textureKey = this.displayMode === 'grayscale' ? `obstacle_${obs.type}_gray` : `obstacle_${obs.type}`;
        const sprite = this.add.sprite(
          obs.x * GRID_SIZE + GRID_SIZE / 2, 
          obs.y * GRID_SIZE + GRID_SIZE / 2, 
          textureKey
        );
        sprite.setDepth(4);
        spriteObj = sprite;
      }

      this.obstacleSprites.push({
        gridX: obs.x,
        gridY: obs.y,
        sprite: spriteObj,
        type: obs.type
      });
    });
  }

  public updateMapObstacleSprites() {
    this.obstacleSprites.forEach(obs => {
      if (obs.sprite && obs.sprite.active) {
        obs.sprite.destroy();
      }
    });
    this.obstacleSprites = [];
    this.spawnMapObstacles();
  }

  public updateMapItemSprites() {
    this.itemSprites.forEach(item => {
      if (item.sprite && item.sprite.active) {
        item.sprite.destroy();
      }
    });
    this.itemSprites = [];
    this.spawnMapItems();
  }

  public recalculateStats() {
    const equippedWeapon = this.customItems.find((it: any) => it.id === this.equippedWeaponId);
    const equippedArmor = this.customItems.find((it: any) => it.id === this.equippedArmorId);
    const equippedAccessory = this.customItems.find((it: any) => it.id === this.equippedAccessoryId);
    
    let attackBonus = 0;
    let defenseBonus = 0;
    
    let heroAttackElement = '';
    let heroAttackElementEnchantValue = 0;
    let heroDefenseElement = '';
    let heroDefenseElementEnchantValue = 0;

    const checkItemElements = (item: any) => {
      if (!item) return;
      if (item.attackElement) {
        if (!heroAttackElement || (item.attackElementEnchantValue || 0) > heroAttackElementEnchantValue) {
          heroAttackElement = item.attackElement;
          heroAttackElementEnchantValue = item.attackElementEnchantValue || 0;
        }
      }
      if (item.defenseElement) {
        if (!heroDefenseElement || (item.defenseElementEnchantValue || 0) > heroDefenseElementEnchantValue) {
          heroDefenseElement = item.defenseElement;
          heroDefenseElementEnchantValue = item.defenseElementEnchantValue || 0;
        }
      }
    };
    
    if (equippedWeapon) {
      attackBonus += equippedWeapon.attack || 0;
      defenseBonus += equippedWeapon.defense || 0;
      checkItemElements(equippedWeapon);
    }
    if (equippedArmor) {
      attackBonus += equippedArmor.attack || 0;
      defenseBonus += equippedArmor.defense || 0;
      checkItemElements(equippedArmor);
    }
    if (equippedAccessory) {
      attackBonus += equippedAccessory.attack || 0;
      defenseBonus += equippedAccessory.defense || 0;
      checkItemElements(equippedAccessory);
    }
    
    this.heroAttack = this.baseHeroAttack + attackBonus;
    this.heroDefense = this.baseHeroDefense + defenseBonus;
    this.heroAttackElement = heroAttackElement;
    this.heroAttackElementEnchantValue = heroAttackElementEnchantValue;
    this.heroDefenseElement = heroDefenseElement;
    this.heroDefenseElementEnchantValue = heroDefenseElementEnchantValue;
  }

  public equipItem(itemId: string | null, slot?: 'weapon' | 'armor' | 'accessory') {
    if (itemId) {
      const item = this.customItems.find((it: any) => it.id === itemId);
      if (item) {
        const itemSlot = item.equipmentType || 'weapon';
        if (itemSlot === 'weapon') this.equippedWeaponId = itemId;
        else if (itemSlot === 'armor') this.equippedArmorId = itemId;
        else this.equippedAccessoryId = itemId;
        this.sendLog(`『${item.name}』を装備しました。`, 'info');
      }
    } else if (slot) {
      if (slot === 'weapon') this.equippedWeaponId = null;
      else if (slot === 'armor') this.equippedArmorId = null;
      else this.equippedAccessoryId = null;
      this.sendLog(`装備を外しました。`, 'info');
    } else {
      // Clear all if no slot provided
      this.equippedWeaponId = null;
      this.equippedArmorId = null;
      this.equippedAccessoryId = null;
      this.sendLog(`装備を全て外しました。`, 'info');
    }
    
    this.recalculateStats();
    this.notifyStateChange();
  }

  private checkLevelUp() {
    let statusAsset = getHeroStatusByLevel(this.heroLevel);
    while (statusAsset && this.heroExp >= statusAsset.requiredExp) {
      this.heroExp -= statusAsset.requiredExp;
      this.heroLevel++;
      
      const newStatus = getHeroStatusByLevel(this.heroLevel);
      if (newStatus) {
        this.heroMaxHp = newStatus.maxHp;
        this.heroHp = this.heroMaxHp;
        this.baseHeroAttack = newStatus.attack;
        this.baseHeroDefense = newStatus.defense;
      } else {
        // Fallback or max level
        this.heroMaxHp += 5;
        this.heroHp = this.heroMaxHp;
        this.baseHeroAttack += 2;
        this.baseHeroDefense += 1;
      }
      this.recalculateStats();
      this.sendLog(`レベルアップ！ レベル ${this.heroLevel} になりました！ 🎉`, 'system');
      this.enqueueMessage('levelup', `レベルアップ！ レベル ${this.heroLevel} になりました！ 🎉`);
      statusAsset = getHeroStatusByLevel(this.heroLevel);
    }
    this.notifyStateChange();
  }

  public addLevel() {
    const statusAsset = getHeroStatusByLevel(this.heroLevel);
    this.heroExp += (statusAsset?.requiredExp || 10);
    this.checkLevelUp();
  }

  public castMagic(magic: any) {
    if (this.slimes.length === 0) {
      return;
    }

    if (magic.attribute === 'ice' || magic.attribute === 'water') {
      this.castIceMagicEffect(magic);
      return;
    }

    // Default or fire: 最も近いスライムをターゲットにする
    let targetSlime: SlimeData | null = null;
    let minDistance = Infinity;

    this.slimes.forEach(slime => {
      const dist = Phaser.Math.Distance.Between(this.hero.x, this.hero.y, slime.sprite.x, slime.sprite.y);
      if (dist < minDistance) {
        minDistance = dist;
        targetSlime = slime;
      }
    });

    if (targetSlime) {
      this.shootFireball(targetSlime, magic);
    }
  }

  private shootFireball(targetSlime: SlimeData, magic: any) {
    const startX = this.hero.x;
    const startY = this.hero.y;
    const endX = targetSlime.sprite.x;
    const endY = targetSlime.sprite.y;

    const dx = endX - startX;
    const dy = endY - startY;

    // 4方向（十字方向）のみに飛ぶように軸を制限する
    let targetX = startX;
    let targetY = startY;

    if (Math.abs(dx) >= Math.abs(dy)) {
      // 左右方向
      targetX = endX;
      targetY = startY;
    } else {
      // 上下方向
      targetX = startX;
      targetY = endY;
    }

    // 火の魔法（ファイアボール）のコンテナ作成
    const fireball = this.add.container(startX, startY);
    fireball.setDepth(15);

    // 重ね合わせによるリッチな光沢エフェクト (HD-2D風)
    const outerGlow = this.add.circle(0, 0, 14, 0xff3300, 0.4);
    const midGlow = this.add.circle(0, 0, 9, 0xff7700, 0.7);
    const innerCore = this.add.circle(0, 0, 4, 0xffdd00, 1.0);
    fireball.add([outerGlow, midGlow, innerCore]);

    const dist = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    const speed = 400; // ピクセル/秒の飛行速度
    const duration = (dist / speed) * 1000;

    this.sendLog(`火の魔法（${magic.name || 'ファイアボール'}）を直線に放った！ 🔥`, "combat");

    this.tweens.add({
      targets: fireball,
      x: targetX,
      y: targetY,
      duration: duration,
      onUpdate: () => {
        // 飛行中、火の粉（トレイル）を発生させる
        if (Math.random() < 0.5) {
          const sparkX = fireball.x + Phaser.Math.Between(-6, 6);
          const sparkY = fireball.y + Phaser.Math.Between(-6, 6);
          const spark = this.add.circle(sparkX, sparkY, Phaser.Math.Between(3, 6), 0xff5500, 0.8);
          spark.setDepth(14);
          this.tweens.add({
            targets: spark,
            scale: 0,
            alpha: 0,
            duration: 250,
            onComplete: () => spark.destroy()
          });
        }
      },
      onComplete: () => {
        fireball.destroy();
        // 直撃ポイント近くにいるスライムすべてにダメージを与える
        this.triggerFireExplosionAt(targetX, targetY, magic.power || 12);
      }
    });
  }

  private triggerFireExplosionAt(x: number, y: number, fireDamage: number) {
    
    // 爆発の近く（48px以内）にいるスライムを探す
    const hitSlimes = this.slimes.filter(slime => {
      if (!slime.sprite || !slime.sprite.active) return false;
      const dist = Phaser.Math.Distance.Between(x, y, slime.sprite.x, slime.sprite.y);
      return dist <= 48;
    });

    if (hitSlimes.length > 0) {
      hitSlimes.forEach(targetSlime => {
        const actualFireDamage = Math.max(1, fireDamage - (targetSlime.defense || 0));
        targetSlime.hp -= actualFireDamage;
        this.sendLog(`ファイアボールが直撃！ ${targetSlime.name || 'スライム'}に ${actualFireDamage} ダメージを与えた！ 🔥`, "combat");

        // スライムの撃破処理
        if (targetSlime.hp <= 0) {
          if (targetSlime.id.startsWith('boss-')) {
            this.bossDefeated = true;
          }
          this.enemiesDefeated++;
          this.updateStats(this.currentGridX, this.currentGridY, this.currentCamGridX, this.currentCamGridY);
          
          const gainedExp = (targetSlime.exp !== undefined && !isNaN(Number(targetSlime.exp))) ? Number(targetSlime.exp) : 2;
          this.sendLog(`${targetSlime.name || 'スライム'}を焼き尽くした！ 経験値を ${gainedExp} 獲得。`, "info");
          this.heroExp += gainedExp;
          this.checkLevelUp();

          this.tweens.add({
            targets: targetSlime.sprite,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
              if (targetSlime.sprite && targetSlime.sprite.active) targetSlime.sprite.destroy();
            }
          });

          const currentIdx = this.slimes.indexOf(targetSlime);
          if (currentIdx !== -1) {
            this.slimes.splice(currentIdx, 1);
          }
        }
      });
    } else {
      this.sendLog("ファイアボールは外れて爆発した。 🔥", "combat");
    }

    // 1. 火花の拡散エフェクト (10方向)
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI * 2) / 10;
      const speed = Phaser.Math.Between(100, 200);
      const spark = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xff5500, 1);
      spark.setDepth(16);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed * 0.3,
        y: y + Math.sin(angle) * speed * 0.3,
        scale: 0,
        alpha: 0,
        duration: Phaser.Math.Between(300, 500),
        onComplete: () => spark.destroy()
      });
    }

    // 2. 爆発波（衝撃波）のエフェクト
    const wave = this.add.circle(x, y, 5, 0xffaa00, 0.4);
    wave.setDepth(15);
    this.tweens.add({
      targets: wave,
      scale: 8,
      alpha: 0,
      duration: 300,
      onComplete: () => wave.destroy()
    });

    this.notifyStateChange(false);
  }

  public castIceMagicEffect(magic: any) {
    this.sendLog(`氷の魔法（${magic.name || 'アイシクル・サークル'}）！ ❄️`, "combat");

    const GRID_SIZE = GridMovementScene.GRID_SIZE;
    const hx = this.hero.x;
    const hy = this.hero.y;

    // 1. 周囲8マスの敵を探す (ボス考慮)
    const hitSlimes = this.slimes.filter(slime => {
      if (!slime.sprite || !slime.sprite.active) return false;
      const isBoss = this.isBossEnemy(slime.enemyId);
      if (isBoss) {
        // 2x2マスのいずれかが勇者の周囲8マス(dx <= 1 かつ dy <= 1)に含まれるか、ただし勇者自身のマスは除く
        for (let ox = 0; ox < 2; ox++) {
          for (let oy = 0; oy < 2; oy++) {
            const tx = slime.gridX + ox;
            const ty = slime.gridY + oy;
            const dx = Math.abs(tx - this.currentGridX);
            const dy = Math.abs(ty - this.currentGridY);
            if (dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0)) {
              return true;
            }
          }
        }
        return false;
      } else {
        const dx = Math.abs(slime.gridX - this.currentGridX);
        const dy = Math.abs(slime.gridY - this.currentGridY);
        return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
      }
    });

    // 2. 精細な「氷の円（アイシクル・サークル）」演出用コンテナ
    const iceContainer = this.add.container(hx, hy);
    iceContainer.setDepth(15);

    // 2-1. 美しい氷結の魔法陣（同心円・多重幾何学構造）
    const magicCircle = this.add.graphics();
    iceContainer.add(magicCircle);

    // 円の半径
    const radius = GRID_SIZE * 1.1; // 約52〜53px

    // 魔法陣のベース描画 (半透明の極寒の青いオーラ)
    magicCircle.fillStyle(0x33ccff, 0.15);
    magicCircle.fillCircle(0, 0, radius);

    // 外側の精細な氷の装飾リング
    magicCircle.lineStyle(1.5, 0x00d8ff, 0.6);
    magicCircle.strokeCircle(0, 0, radius);
    magicCircle.lineStyle(1.0, 0xffffff, 0.8);
    magicCircle.strokeCircle(0, 0, radius - 4);
    
    // 内側のルーンリング
    magicCircle.lineStyle(1.0, 0x88f0ff, 0.4);
    magicCircle.strokeCircle(0, 0, radius * 0.5);

    // 八角形の氷の結界線を引く (8マス効果を象徴した幾何学デザイン)
    magicCircle.lineStyle(0.8, 0x00f0ff, 0.3);
    magicCircle.beginPath();
    for (let i = 0; i <= 8; i++) {
      const angle = (i * Math.PI) / 4;
      const tx = Math.cos(angle) * (radius - 2);
      const ty = Math.sin(angle) * (radius - 2);
      if (i === 0) magicCircle.moveTo(tx, ty);
      else magicCircle.lineTo(tx, ty);
    }
    magicCircle.closePath();
    magicCircle.strokePath();

    // 2-2. 円周上の16箇所に配置される、外向きの「氷の結晶（クリスタル）」
    const shardCount = 16;
    for (let i = 0; i < shardCount; i++) {
      const angle = (i * Math.PI * 2) / shardCount;
      const cx = Math.cos(angle) * radius;
      const cy = Math.sin(angle) * radius;

      const crystal = this.add.graphics();
      crystal.setPosition(cx, cy);
      // 外向きになるように回転
      crystal.setRotation(angle + Math.PI / 2);

      // 青から白の精細なグラデーション調のトゲ
      crystal.fillStyle(0x00bfff, 0.65);
      crystal.fillTriangle(-5, 0, 5, 0, 0, -16);
      crystal.fillStyle(0xffffff, 0.9);
      crystal.fillTriangle(-2.5, 0, 2.5, 0, 0, -12);
      crystal.lineStyle(0.8, 0xffffff, 0.85);
      crystal.strokeTriangle(-5, 0, 5, 0, 0, -16);

      iceContainer.add(crystal);
    }

    // アニメーション設定：サークルを回転させながらポップさせ、最後は砕け散るように拡大フェードアウト
    iceContainer.setScale(0);
    iceContainer.setAlpha(0);

    // 3. メインのアニメーション
    this.tweens.add({
      targets: iceContainer,
      scale: 1.0,
      alpha: 1.0,
      angle: 180, // ぐるりと回転
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 回転が最高潮に達したあと、一気にサークル全体が拡大＆フェードアウト
        this.tweens.add({
          targets: iceContainer,
          scale: 1.3,
          alpha: 0,
          angle: 240,
          duration: 400,
          ease: 'Sine.easeOut',
          onComplete: () => {
            iceContainer.destroy();
          }
        });

        // 美しいきらめき氷屑を24方向へ放射状に吹き飛ばす
        for (let i = 0; i < 24; i++) {
          const angle = (i * Math.PI * 2) / 24 + Phaser.Math.FloatBetween(-0.1, 0.1);
          const speed = Phaser.Math.Between(70, 150);
          const size = Phaser.Math.Between(2, 5);
          
          const shard = this.add.graphics();
          shard.setDepth(16);
          shard.setPosition(hx, hy);
          shard.fillStyle(0xe0faff, 0.9);
          // 綺麗なひし形の結晶
          shard.fillTriangle(0, -size, -size * 0.6, 0, size * 0.6, 0);
          shard.fillTriangle(0, size, -size * 0.6, 0, size * 0.6, 0);

          this.tweens.add({
            targets: shard,
            x: hx + Math.cos(angle) * speed * 0.5,
            y: hy + Math.sin(angle) * speed * 0.5,
            scale: 0,
            angle: Phaser.Math.Between(0, 360),
            alpha: 0,
            duration: Phaser.Math.Between(400, 750),
            ease: 'Cubic.easeOut',
            onComplete: () => shard.destroy()
          });
        }
      }
    });

    // 4. 冷気ダストの微細な舞い上がり
    for (let i = 0; i < 8; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const startDist = Phaser.Math.Between(10, radius);
      const px = hx + Math.cos(angle) * startDist;
      const py = hy + Math.sin(angle) * startDist;
      const iceMote = this.add.circle(px, py, Phaser.Math.Between(2, 4), 0xaae8ff, 0.7);
      iceMote.setDepth(16);

      this.tweens.add({
        targets: iceMote,
        y: py - Phaser.Math.Between(15, 35),
        x: px + Phaser.Math.Between(-10, 10),
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(600, 900),
        ease: 'Quad.easeOut',
        onComplete: () => iceMote.destroy()
      });
    }

    // 5. ダメージ適用 (効果は周囲8マスのまま)
    const iceDamage = magic.power || 12; // 氷の魔法は周囲のみのため強力
    hitSlimes.forEach(targetSlime => {
      const actualIceDamage = Math.max(1, iceDamage - (targetSlime.defense || 0));
      targetSlime.hp -= actualIceDamage;
      this.sendLog(`サークル氷結が${targetSlime.name || 'スライム'}に直撃！ ${actualIceDamage} ダメージ！ `, "combat");

      // 敵が力尽きたかチェック
      if (targetSlime.hp <= 0) {
        if (targetSlime.id.startsWith('boss-')) {
          this.bossDefeated = true;
        }
        this.enemiesDefeated++;
        this.updateStats(this.currentGridX, this.currentGridY, this.currentCamGridX, this.currentCamGridY);
        
        const gainedExp = (targetSlime.exp !== undefined && !isNaN(Number(targetSlime.exp))) ? Number(targetSlime.exp) : 2;
        this.sendLog(`${targetSlime.name || 'スライム'}を完全に凍りつかせて砕いた！ 経験値を ${gainedExp} 獲得。`, "info");
        this.heroExp += gainedExp;
        this.checkLevelUp();

        this.tweens.add({
          targets: targetSlime.sprite,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            if (targetSlime.sprite && targetSlime.sprite.active) targetSlime.sprite.destroy();
          }
        });

        const currentIdx = this.slimes.indexOf(targetSlime);
        if (currentIdx !== -1) {
          this.slimes.splice(currentIdx, 1);
        }
      }
    });

    this.notifyStateChange(false);
  }

  public resetHero() {
    this.heroLevel = 1;
    const initialStatus = getHeroStatusByLevel(1);
    if (initialStatus) {
      this.heroMaxHp = initialStatus.maxHp;
      this.heroHp = this.heroMaxHp;
      this.baseHeroAttack = initialStatus.attack;
      this.baseHeroDefense = initialStatus.defense;
    } else {
      this.heroMaxHp = 20;
      this.heroHp = 20;
      this.baseHeroAttack = 5;
      this.baseHeroDefense = 0;
    }
    this.equippedWeaponId = null;
    this.equippedArmorId = null;
    this.equippedAccessoryId = null;
    this.recalculateStats();
    this.heroExp = 0;
    this.sendLog(`[デモ] ステータスがレベル 1 にリセットされました。 🔄`, 'system');
    this.notifyStateChange();
  }

  private updateTeleportPortals(forceRebuild: boolean = false) {
    if (!this.mapData || !this.mapData.events) return;
    const { GRID_SIZE } = GridMovementScene;

    if (forceRebuild) {
      this.teleportPortals.forEach(p => {
        if (p.container && p.container.active) p.container.destroy();
      });
      this.teleportPortals = [];
    }

    const teleportEvents = this.mapData.events.filter((e: any) => e.type === 'teleport');

    const expRate = (this.visitedGrids.size / this.totalGrids) * 100;
    const sRate = (this.viewedGrids.size / this.totalGrids) * 100;
    const dRate = this.getDefeatRate();

    teleportEvents.forEach((event: any) => {
      const eventData = event.data || {};
      let met = true;
      if (eventData.requiredExplorationRate && expRate < eventData.requiredExplorationRate) met = false;
      if (eventData.requiredSearchRate && sRate < eventData.requiredSearchRate) met = false;
      if (eventData.requiredDefeatRate && dRate < eventData.requiredDefeatRate) met = false;

      const existingIndex = this.teleportPortals.findIndex(p => p.x === event.x && p.y === event.y);

      if (met) {
        if (existingIndex === -1) {
          const px = event.x * GRID_SIZE + GRID_SIZE / 2;
          const py = event.y * GRID_SIZE + GRID_SIZE / 2;

          const container = this.add.container(px, py);
          container.setDepth(4);

          const portalG = this.add.graphics();
          container.add(portalG);

          let color = 0xd97706; // 黄金ベース
          let ringColor = 0xf59e0b;
          let runeColor = 0xfef08a;

          if (this.displayMode === 'text') {
            color = 0x059669;
            ringColor = 0x34d399;
            runeColor = 0x6ee7b7;
          } else if (this.displayMode === 'grayscale') {
            color = 0x4b5563;
            ringColor = 0x9ca3af;
            runeColor = 0xe5e7eb;
          }

          portalG.fillStyle(color, 0.25);
          portalG.fillCircle(0, 0, GRID_SIZE * 0.45);
          portalG.lineStyle(2, ringColor, 0.9);
          portalG.strokeCircle(0, 0, GRID_SIZE * 0.45);
          portalG.lineStyle(1, 0xffffff, 0.6);
          portalG.strokeCircle(0, 0, GRID_SIZE * 0.3);

          portalG.lineStyle(0.8, runeColor, 0.5);
          portalG.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const tx = Math.cos(angle) * (GRID_SIZE * 0.45);
            const ty = Math.sin(angle) * (GRID_SIZE * 0.45);
            if (i === 0) portalG.moveTo(tx, ty);
            else portalG.lineTo(tx, ty);
          }
          portalG.closePath();
          portalG.strokePath();

          const textStr = this.displayMode === 'text' ? '門' : '🌀';
          const portalText = this.add.text(0, 0, textStr, {
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff'
          });
          portalText.setOrigin(0.5, 0.5);
          container.add(portalText);

          this.tweens.add({
            targets: portalG,
            angle: 360,
            duration: 3500,
            repeat: -1
          });

          this.tweens.add({
            targets: container,
            y: py - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });

          container.setScale(0);
          this.tweens.add({
            targets: container,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
          });

          if (!forceRebuild) {
            this.sendLog(`条件達成！テレポートゲートが現れた！ 🌀 (${event.x}, ${event.y})`, 'system');
            this.enqueueMessage('system', '条件達成！テレポートゲートが現れた！ 🌀');
            
            for (let i = 0; i < 12; i++) {
              const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
              const speed = Phaser.Math.Between(50, 120);
              const p = this.add.circle(px, py, Phaser.Math.Between(2, 4), ringColor, 0.8);
              p.setDepth(15);
              this.tweens.add({
                targets: p,
                x: px + Math.cos(angle) * speed * 0.4,
                y: py + Math.sin(angle) * speed * 0.4,
                scale: 0,
                alpha: 0,
                duration: Phaser.Math.Between(400, 800),
                onComplete: () => p.destroy()
              });
            }
          }

          this.teleportPortals.push({
            x: event.x,
            y: event.y,
            container: container,
            met: true
          });
        }
      } else {
        if (existingIndex !== -1) {
          const p = this.teleportPortals[existingIndex];
          this.tweens.add({
            targets: p.container,
            scale: 0,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              if (p.container && p.container.active) p.container.destroy();
            }
          });
          this.teleportPortals.splice(existingIndex, 1);
          this.sendLog(`条件が未達成になり、テレポートゲートが消滅した。`, 'system');
        }
      }
    });
  }

  public setHeroStateAndPosition(state: any, pos: { gridX: number; gridY: number; camGridX: number; camGridY: number } | null) {
    if (state) {
      if (state.level !== undefined) this.heroLevel = state.level;
      if (state.hp !== undefined) this.heroHp = state.hp;
      if (state.maxHp !== undefined) this.heroMaxHp = state.maxHp;
      if (state.attack !== undefined) this.heroAttack = state.attack;
      if (state.defense !== undefined) this.heroDefense = state.defense;
      if (state.baseAttack !== undefined) this.baseHeroAttack = state.baseAttack;
      if (state.baseDefense !== undefined) this.baseHeroDefense = state.baseDefense;
      if (state.exp !== undefined) this.heroExp = state.exp;
      if (state.equippedWeaponId !== undefined) this.equippedWeaponId = state.equippedWeaponId;
      if (state.equippedArmorId !== undefined) this.equippedArmorId = state.equippedArmorId;
      if (state.equippedAccessoryId !== undefined) this.equippedAccessoryId = state.equippedAccessoryId;
      if (state.acquiredItems) {
        this.acquiredItems = new Set(state.acquiredItems);
      }
      this.recalculateStats();
    }
    
    if (pos) {
      this.currentGridX = pos.gridX;
      this.currentGridY = pos.gridY;
      this.currentCamGridX = pos.camGridX;
      this.currentCamGridY = pos.camGridY;
      
      const { GRID_SIZE } = GridMovementScene;
      if (this.hero) {
        this.hero.setPosition(this.currentGridX * GRID_SIZE + GRID_SIZE / 2, this.currentGridY * GRID_SIZE + GRID_SIZE / 2);
      }
      if (this.cameras && this.cameras.main) {
        this.cameras.main.scrollX = this.currentCamGridX * GRID_SIZE;
        this.cameras.main.scrollY = this.currentCamGridY * GRID_SIZE;
      }
    }
    this.notifyStateChange();
  }
}
