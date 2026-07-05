const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

// Import getAvailableEnemies
code = code.replace(
  `import { getEnemyAssetById, EnemyAsset } from '../data/EnemyAssets';`,
  `import { getEnemyAssetById, EnemyAsset, getAvailableEnemies } from '../data/EnemyAssets';`
);

// Patch initial spawning
const target1 = `      if (!enemyConfig) {
        enemyConfig = { id: 'default', name: 'スライム', hp: 10, attack: 2, defense: 0, exp: 2, speed: 1000, behavior: 'random' };
      }`;
const replace1 = `      if (!enemyConfig) {
        const available = getAvailableEnemies(this.mapData?.bgMode || 'image');
        if (available.length > 0) {
          enemyConfig = Phaser.Utils.Array.GetRandom(available);
        } else {
          enemyConfig = { id: 'default', name: 'スライム', hp: 10, attack: 2, defense: 0, exp: 2, speed: 1000, behavior: 'random' };
        }
      }`;
code = code.replace(target1, replace1);

// Patch spawn loop
const target2 = `          if (!enemyConfig) {
            enemyConfig = { id: 'default', name: 'スライム', hp: 10, attack: 2, defense: 0, exp: 2, speed: 1000, behavior: 'random' };
          }`;
const replace2 = `          if (!enemyConfig) {
            const available = getAvailableEnemies(this.mapData?.bgMode || 'image');
            if (available.length > 0) {
              enemyConfig = Phaser.Utils.Array.GetRandom(available);
            } else {
              enemyConfig = { id: 'default', name: 'スライム', hp: 10, attack: 2, defense: 0, exp: 2, speed: 1000, behavior: 'random' };
            }
          }`;
code = code.replace(target2, replace2);

// Patch exp assignments
code = code.replace(/exp: enemyConfig\.exp !== undefined \? enemyConfig\.exp : 2/g, 'exp: (enemyConfig.exp !== undefined && !isNaN(Number(enemyConfig.exp))) ? Number(enemyConfig.exp) : 2');
code = code.replace(/const gainedExp = slime\.exp !== undefined \? slime\.exp : 2;/g, 'const gainedExp = (slime.exp !== undefined && !isNaN(Number(slime.exp))) ? Number(slime.exp) : 2;');
code = code.replace(/const gainedExp = targetSlime\.exp !== undefined \? targetSlime\.exp : 2;/g, 'const gainedExp = (targetSlime.exp !== undefined && !isNaN(Number(targetSlime.exp))) ? Number(targetSlime.exp) : 2;');

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('Patched GridMovementScene.ts');
