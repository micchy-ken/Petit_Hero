const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

const targetStr = `    this.currentDirection = 'idle';
    this.spawnMapItems();
    this.notifyStateChange(false);
  }`;
const replaceStr = `    this.currentDirection = 'idle';
    this.spawnMapItems();
    this.notifyStateChange(false);

    // Initial monologue check
    if (this.mapData && this.mapData.events) {
      const monologueEvent = this.mapData.events.find((e: any) => e.type === 'monologue' && e.x === this.currentGridX && e.y === this.currentGridY);
      if (monologueEvent) {
        this.showMonologue(monologueEvent.data?.text || '');
      }
    }
  }`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('patched reset');
