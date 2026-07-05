const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

const targetMonologue = `      const bg = this.add.rectangle(width / 2, height - (height / 3) / 2 - 10, width - 40, height / 3, 0x000000, 0.8);
      bg.setStrokeStyle(4, 0x10b981);`;

const replaceMonologue = `      const fullScreenHitArea = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
      fullScreenHitArea.setInteractive({ useHandCursor: true });
      fullScreenHitArea.on('pointerdown', () => {
        this.dismissMonologue();
      });

      const bg = this.add.rectangle(width / 2, height - (height / 3) / 2 - 10, width - 40, height / 3, 0x000000, 0.8);
      bg.setStrokeStyle(4, 0x10b981);`;

code = code.replace(targetMonologue, replaceMonologue);

const targetAdd = `this.monologueContainer.add([bg, this.monologueTextElement, promptText]);`;
const replaceAdd = `this.monologueContainer.add([fullScreenHitArea, bg, this.monologueTextElement, promptText]);`;

code = code.replace(targetAdd, replaceAdd);

// Remove the old bg interactive just in case
const targetOldBgInteractive = `      // Click to dismiss
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.dismissMonologue();
      });`;
code = code.replace(targetOldBgInteractive, `      // Click to dismiss handled by fullScreenHitArea`);

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('Patched GridMovementScene.ts monologue click area');
