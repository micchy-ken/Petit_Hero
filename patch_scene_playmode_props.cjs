const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

const playedPropsTarget = `  private itemSprites: { gridX: number, gridY: number, sprite: Phaser.GameObjects.GameObject, itemId: string }[] = [];
  private teleportPortals: { x: number, y: number, container: Phaser.GameObjects.Container }[] = [];`;
const playedPropsReplace = `  private itemSprites: { gridX: number, gridY: number, sprite: Phaser.GameObjects.GameObject, itemId: string }[] = [];
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
fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('patched scene playmode props');
