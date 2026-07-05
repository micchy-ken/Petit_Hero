const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

// Add callback
code = code.replace(
  `public onCustomEventCallback?: (eventId: string, onComplete: () => void) => void;`,
  `public onCustomEventCallback?: (eventId: string, onComplete: () => void) => void;
  public onSystemMessageCallback?: (type: string, text: string, onComplete: () => void) => void;`
);

const oldProcess = `  private processMessageQueue() {
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

      const fullScreenHitArea = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0);
      fullScreenHitArea.setInteractive({ useHandCursor: true });
      fullScreenHitArea.on('pointerdown', () => {
        this.dismissMonologue();
      });

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

      this.monologueContainer.add([fullScreenHitArea, bg, this.monologueTextElement, promptText]);

      // Click to dismiss handled by fullScreenHitArea
    }

    this.monologueTextElement?.setText(msg.text);
    this.monologueContainer.setVisible(true);

    let waitClick = false;
    if (this.messageWaitMode === 'all_messages_and_map_move') waitClick = true;
    else if (this.messageWaitMode === 'all_messages' && msg.type !== 'map_move') waitClick = true;
    else if (this.messageWaitMode === 'item_and_event' && (msg.type === 'item' || msg.type === 'event')) waitClick = true;
    else if (this.messageWaitMode === 'event_only' && msg.type === 'event') waitClick = true;
    else if (this.messageWaitMode === 'none') waitClick = false;

    const promptText = this.monologueContainer.list[3] as Phaser.GameObjects.Text;
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

const newProcess = `  private processMessageQueue() {
    if (this.isShowingMonologue || this.messageQueue.length === 0) return;
    const msg = this.messageQueue.shift();
    if (!msg) return;

    this.isShowingMonologue = true;

    if (this.onSystemMessageCallback) {
        this.onSystemMessageCallback(msg.type, msg.text, () => {
            this.isShowingMonologue = false;
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
  
  // Keep dismissMonologue empty to avoid compile errors if called from elsewhere
  private dismissMonologue() {
     // Now handled by React callback
  }`;

code = code.replace(oldProcess, newProcess);
fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('Patched GridMovementScene processMessageQueue');
