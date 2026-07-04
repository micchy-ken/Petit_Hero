const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

const playedPropsTarget = `  private itemSprites: { gridX: number, gridY: number, sprite: Phaser.GameObjects.Text, itemId: string }[] = [];
  private teleportPortals: { x: number, y: number, container: Phaser.GameObjects.Container }[] = [];`;
const playedPropsReplace = `  private itemSprites: { gridX: number, gridY: number, sprite: Phaser.GameObjects.Text, itemId: string }[] = [];
  private teleportPortals: { x: number, y: number, container: Phaser.GameObjects.Container }[] = [];
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
    const uniqueId = \`\${this.mapData?.id}_\${event.x}_\${event.y}_\${event.type}\`;
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
    const uniqueId = \`\${this.mapData?.id}_\${event.x}_\${event.y}_\${event.type}\`;
    if (mode === 'once_per_map') {
      this.playedMapEvents.add(uniqueId);
    } else if (mode === 'once_global') {
      this.addGlobalPlayedEvent(uniqueId);
    }
  }`;
code = code.replace(playedPropsTarget, playedPropsReplace);

const checkMapEventsTarget = `  private checkMapEvents() {
    if (!this.mapData || !this.mapData.events) return;
    const eventsHere = this.mapData.events.filter((e: any) => e.x === this.currentGridX && e.y === this.currentGridY);
    const teleportEvent = eventsHere.find((e: any) => e.type === 'teleport');
    const monologueEvent = eventsHere.find((e: any) => e.type === 'monologue');
    const customEvent = eventsHere.find((e: any) => e.type === 'custom_event');
    
    const teleportHasCustomEvent = teleportEvent && teleportEvent.data?.eventId;

    if (customEvent && this.onCustomEventCallback) {
      this.isShowingMonologue = true; 
      this.onCustomEventCallback(customEvent.data?.eventId || '', () => {
        this.isShowingMonologue = false;
        if (teleportEvent) {
          this.handleTeleport(teleportEvent);
        }
      });
      return;
    }
    
    if (teleportHasCustomEvent && this.onCustomEventCallback) {
      this.isShowingMonologue = true;
      this.onCustomEventCallback(teleportEvent.data.eventId, () => {
        this.isShowingMonologue = false;
        this.handleTeleport(teleportEvent);
      });
      return;
    }

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
  }`;

const checkMapEventsReplace = `  private checkMapEvents() {
    if (!this.mapData || !this.mapData.events) return;
    const eventsHere = this.mapData.events.filter((e: any) => e.x === this.currentGridX && e.y === this.currentGridY);
    const teleportEvent = eventsHere.find((e: any) => e.type === 'teleport');
    const monologueEvent = eventsHere.find((e: any) => e.type === 'monologue');
    const customEvent = eventsHere.find((e: any) => e.type === 'custom_event');
    
    const teleportHasCustomEvent = teleportEvent && teleportEvent.data?.eventId;

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
    
    if (teleportHasCustomEvent && this.onCustomEventCallback && this.canPlayEvent(teleportEvent)) {
      this.isShowingMonologue = true;
      this.markEventPlayed(teleportEvent);
      this.onCustomEventCallback(teleportEvent.data.eventId, () => {
        this.isShowingMonologue = false;
        this.handleTeleport(teleportEvent);
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
  }`;
code = code.replace(checkMapEventsTarget, checkMapEventsReplace);

const initialCheckTarget = `    // Initial check (start_point, custom_event, monologue)
    if (this.mapData && this.mapData.events) {
      const customEvent = this.mapData.events.find((e: any) => e.type === 'custom_event' && e.x === this.currentGridX && e.y === this.currentGridY);
      const startPointEvent = this.mapData.events.find((e: any) => e.type === 'start_point' && e.x === this.currentGridX && e.y === this.currentGridY);
      
      const eventIdToPlay = customEvent ? customEvent.data?.eventId : (startPointEvent ? startPointEvent.data?.eventId : null);

      if (eventIdToPlay && this.onCustomEventCallback) {
        this.isShowingMonologue = true;
        this.onCustomEventCallback(eventIdToPlay, () => {
          this.isShowingMonologue = false;
        });
        return;
      }

      const monologueEvent = this.mapData.events.find((e: any) => e.type === 'monologue' && e.x === this.currentGridX && e.y === this.currentGridY);
      if (monologueEvent) {
        this.showMonologue(monologueEvent.data?.text || '');
      }
    }`;
const initialCheckReplace = `    // Initial check (start_point, custom_event, monologue)
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
        this.showMonologue(monologueEvent.data?.text || '');
      }
    }`;
code = code.replace(initialCheckTarget, initialCheckReplace);

const resetPosTarget = `    // 踏破・視野情報をクリアし、表示もクリアする
    this.visitedGrids.clear();
    this.viewedGrids.clear();
    if (this.visitedTraceGraphics) {
      this.visitedTraceGraphics.clear();
    }`;
const resetPosReplace = `    // マップ切り替え時の処理
    if (fromMapId !== undefined && fromMapId !== this.mapData?.id) {
       this.playedMapEvents.clear();
    }
    
    // 踏破・視野情報をクリアし、表示もクリアする
    this.visitedGrids.clear();
    this.viewedGrids.clear();
    if (this.visitedTraceGraphics) {
      this.visitedTraceGraphics.clear();
    }`;
code = code.replace(resetPosTarget, resetPosReplace);

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('patched scene playmode');
