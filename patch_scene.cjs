const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

// Add properties
code = code.replace(
  `public isShowingMonologue: boolean = false;`,
  `public isShowingMonologue: boolean = false;
  public messageWaitMode: string = 'event_only';
  public messageAutoAdvanceSeconds: number = 2;
  private messageQueue: { type: string, text: string, onComplete?: () => void }[] = [];
  private monologueAutoAdvanceTimer: Phaser.Time.TimerEvent | null = null;`
);

// Replace showMonologue
const oldShowMonologue = `  public showMonologue(text: string, onComplete?: () => void) {
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
  }`;

const newShowMonologue = `  public showMonologue(text: string, onComplete?: () => void) {
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

    this.isShowingMonologue = true;
    this.pendingTeleportAction = msg.onComplete || null;

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

    this.monologueTextElement?.setText(msg.text);
    this.monologueContainer.setVisible(true);

    let waitClick = false;
    if (this.messageWaitMode === 'all_messages_and_map_move') waitClick = true;
    else if (this.messageWaitMode === 'all_messages' && msg.type !== 'map_move') waitClick = true;
    else if (this.messageWaitMode === 'item_and_event' && (msg.type === 'item' || msg.type === 'event')) waitClick = true;
    else if (this.messageWaitMode === 'event_only' && msg.type === 'event') waitClick = true;
    else if (this.messageWaitMode === 'none') waitClick = false;

    const promptText = this.monologueContainer.list[2] as Phaser.GameObjects.Text;
    if (promptText) {
        promptText.setVisible(true);
        promptText.setText(waitClick ? '▼ クリックして進む' : \`( \${this.messageAutoAdvanceSeconds}秒で自動的に進みます )\`);
    }

    if (this.monologueAutoAdvanceTimer) {
        this.monologueAutoAdvanceTimer.destroy();
        this.monologueAutoAdvanceTimer = null;
    }

    if (!waitClick) {
        this.monologueAutoAdvanceTimer = this.time.delayedCall(this.messageAutoAdvanceSeconds * 1000, () => {
            this.dismissMonologue();
        });
    }
  }

  private dismissMonologue() {
    if (!this.isShowingMonologue) return;
    this.isShowingMonologue = false;
    
    if (this.monologueAutoAdvanceTimer) {
        this.monologueAutoAdvanceTimer.destroy();
        this.monologueAutoAdvanceTimer = null;
    }

    if (this.monologueContainer) {
      this.monologueContainer.setVisible(false);
    }
    
    if (this.pendingTeleportAction) {
      const action = this.pendingTeleportAction;
      this.pendingTeleportAction = null;
      action();
    }
    
    this.processMessageQueue();
  }`;

code = code.replace(oldShowMonologue, newShowMonologue);

// Replace map arrival
const initDataTarget = `          this.notifyStateChange(false);
          this.checkMapEvents();
        }
      });`;
const initDataReplace = `          this.notifyStateChange(false);
          if (this.mapData?.name) {
             this.enqueueMessage('map_move', \`\${this.mapData.name} に到着した\`);
          }
          this.checkMapEvents();
        }
      });`;
code = code.replace(initDataTarget, initDataReplace);


// Level up message
code = code.replace(
  `this.sendLog(\`レベルアップ！ レベル \${this.heroLevel} になりました！ 🎉\`, 'system');`,
  `this.sendLog(\`レベルアップ！ レベル \${this.heroLevel} になりました！ 🎉\`, 'system');\n      this.enqueueMessage('levelup', \`レベルアップ！ レベル \${this.heroLevel} になりました！ 🎉\`);`
);

// Item get message
const targetItem = `      if (item.itemId === 'treasure_text') {
        this.sendLog('宝を手に入れた！ ✨ (Exp +50)', 'info');
        this.heroExp += 50;
        this.checkLevelUp();
      } else {
        this.sendLog(\`アイテムを手に入れた！ (\${item.itemId})\`, 'info');
      }`;
const replaceItem = `      if (item.itemId === 'treasure_text') {
        this.sendLog('宝を手に入れた！ ✨ (Exp +50)', 'info');
        this.enqueueMessage('item', '宝を手に入れた！ ✨ (Exp +50)');
        this.heroExp += 50;
        this.checkLevelUp();
      } else {
        this.sendLog(\`アイテムを手に入れた！ (\${item.itemId})\`, 'info');
        this.enqueueMessage('item', \`アイテムを手に入れた！ (\${item.itemId})\`);
      }`;
code = code.replace(targetItem, replaceItem);

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('Patched GridMovementScene.ts');
