const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

// Add properties
code = code.replace(
  "private teleportPortals: { x: number, y: number, container: Phaser.GameObjects.Container, met: boolean }[] = [];",
  `private teleportPortals: { x: number, y: number, container: Phaser.GameObjects.Container, met: boolean }[] = [];
  // モノローグ管理
  private monologueContainer?: Phaser.GameObjects.Container;
  private monologueTextElement?: Phaser.GameObjects.Text;
  public isShowingMonologue: boolean = false;
  private pendingTeleportAction: (() => void) | null = null;`
);

// Add showMonologue method before checkMapEvents
const showMonologueCode = `
  public showMonologue(text: string, onComplete?: () => void) {
    if (this.isShowingMonologue) return;
    this.isShowingMonologue = true;
    this.pendingTeleportAction = onComplete || null;

    if (!this.monologueContainer) {
      const { width, height } = this.cameras.main;
      this.monologueContainer = this.add.container(0, 0);
      this.monologueContainer.setDepth(100);
      this.monologueContainer.setScrollFactor(0);

      const bg = this.add.rectangle(width / 2, height - (height / 3) / 2 - 10, width - 40, height / 3, 0x000000, 0.8);
      bg.setStrokeStyle(4, 0x10b981);
      
      this.monologueTextElement = this.add.text(40, height - height / 3 + 10, '', {
        fontFamily: '"Inter", sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        wordWrap: { width: width - 80, useAdvancedWrap: true }
      });
      
      const promptText = this.add.text(width / 2, height - 30, '▼ クリックして進む', {
        fontFamily: '"Inter", sans-serif',
        fontSize: '14px',
        color: '#a7f3d0'
      }).setOrigin(0.5, 0.5);

      this.monologueContainer.add([bg, this.monologueTextElement, promptText]);

      // Click to dismiss
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.dismissMonologue();
      });
    }

    this.monologueTextElement?.setText(text);
    this.monologueContainer.setVisible(true);
  }

  private dismissMonologue() {
    if (!this.isShowingMonologue) return;
    this.isShowingMonologue = false;
    if (this.monologueContainer) {
      this.monologueContainer.setVisible(false);
    }
    if (this.pendingTeleportAction) {
      const action = this.pendingTeleportAction;
      this.pendingTeleportAction = null;
      action();
    }
  }
`;

code = code.replace(
  "private checkMapEvents() {",
  showMonologueCode + "\n  private checkMapEvents() {"
);

// Update checkMapEvents
const checkMapEventsOriginal = `  private checkMapEvents() {
    if (!this.mapData || !this.mapData.events) return;
    const event = this.mapData.events.find((e: any) => e.x === this.currentGridX && e.y === this.currentGridY);
    if (event && event.type === 'teleport') {`;

const checkMapEventsReplacement = `  private checkMapEvents() {
    if (!this.mapData || !this.mapData.events) return;
    const eventsHere = this.mapData.events.filter((e: any) => e.x === this.currentGridX && e.y === this.currentGridY);
    const teleportEvent = eventsHere.find((e: any) => e.type === 'teleport');
    const monologueEvent = eventsHere.find((e: any) => e.type === 'monologue');

    if (monologueEvent) {
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

  private handleTeleport(event: any) {`;

code = code.replace(checkMapEventsOriginal, checkMapEventsReplacement);

// Fix handleTeleport
const oldTeleportEnd = `      } else {
        const reqExp = eventData.requiredExplorationRate || 0;
        const reqSearch = eventData.requiredSearchRate || 0;
        const reqDefeat = eventData.requiredDefeatRate || 0;
        let reason = '';
        if (reqExp > 0 && expRate < reqExp) reason += \` 踏破率: \${Math.floor(expRate)}% / \${reqExp}%\`;
        if (reqSearch > 0 && sRate < reqSearch) reason += \` 捜索率: \${Math.floor(sRate)}% / \${reqSearch}%\`;
        if (reqDefeat > 0 && dRate < reqDefeat) reason += \` 撃破率: \${Math.floor(dRate)}% / \${reqDefeat}%\`;
        this.sendLog(\`条件未達成のため移動できません。\${reason}\`, 'system');
      }
    }
  }`;

const newTeleportEnd = `      } else {
        const reqExp = eventData.requiredExplorationRate || 0;
        const reqSearch = eventData.requiredSearchRate || 0;
        const reqDefeat = eventData.requiredDefeatRate || 0;
        let reason = '';
        if (reqExp > 0 && expRate < reqExp) reason += \` 踏破率: \${Math.floor(expRate)}% / \${reqExp}%\`;
        if (reqSearch > 0 && sRate < reqSearch) reason += \` 捜索率: \${Math.floor(sRate)}% / \${reqSearch}%\`;
        if (reqDefeat > 0 && dRate < reqDefeat) reason += \` 撃破率: \${Math.floor(dRate)}% / \${reqDefeat}%\`;
        this.sendLog(\`条件未達成のため移動できません。\${reason}\`, 'system');
      }
  }`;

code = code.replace(oldTeleportEnd, newTeleportEnd);

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('patched scene');
