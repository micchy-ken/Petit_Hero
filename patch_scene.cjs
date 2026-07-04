const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

const targetStr = `  public setOnStateChange(callback: (state: HeroState) => void) {`;
const replaceStr = `  public onCustomEventCallback?: (eventId: string, onComplete: () => void) => void;

  public setOnCustomEvent(callback: (eventId: string, onComplete: () => void) => void) {
    this.onCustomEventCallback = callback;
  }

  public setOnStateChange(callback: (state: HeroState) => void) {`;

code = code.replace(targetStr, replaceStr);

const checkEventsTarget = `    const monologueEvent = eventsHere.find((e: any) => e.type === 'monologue');`;
const checkEventsReplace = `    const monologueEvent = eventsHere.find((e: any) => e.type === 'monologue');
    const customEvent = eventsHere.find((e: any) => e.type === 'custom_event');

    if (customEvent && this.onCustomEventCallback) {
      this.isShowingMonologue = true; // Use same flag to pause movement
      this.onCustomEventCallback(customEvent.data?.eventId || '', () => {
        this.isShowingMonologue = false;
        if (teleportEvent) {
          this.handleTeleport(teleportEvent);
        }
      });
      return;
    }`;

code = code.replace(checkEventsTarget, checkEventsReplace);

const initialCheckEventsTarget = `    // Initial monologue check
    if (this.mapData && this.mapData.events) {
      const monologueEvent = this.mapData.events.find((e: any) => e.type === 'monologue' && e.x === this.currentGridX && e.y === this.currentGridY);`;
const initialCheckEventsReplace = `    // Initial monologue check
    if (this.mapData && this.mapData.events) {
      const customEvent = this.mapData.events.find((e: any) => e.type === 'custom_event' && e.x === this.currentGridX && e.y === this.currentGridY);
      if (customEvent && this.onCustomEventCallback) {
        this.isShowingMonologue = true;
        this.onCustomEventCallback(customEvent.data?.eventId || '', () => {
          this.isShowingMonologue = false;
        });
        return;
      }

      const monologueEvent = this.mapData.events.find((e: any) => e.type === 'monologue' && e.x === this.currentGridX && e.y === this.currentGridY);`;

code = code.replace(initialCheckEventsTarget, initialCheckEventsReplace);

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('patched scene');
