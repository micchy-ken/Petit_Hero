const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

const targetCheckMapEvents = `  private checkMapEvents() {
    if (!this.mapData || !this.mapData.events) return;
    const eventsHere = this.mapData.events.filter((e: any) => e.x === this.currentGridX && e.y === this.currentGridY);
    const teleportEvent = eventsHere.find((e: any) => e.type === 'teleport');
    const monologueEvent = eventsHere.find((e: any) => e.type === 'monologue');
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

const replaceCheckMapEvents = `  private checkMapEvents() {
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

code = code.replace(targetCheckMapEvents, replaceCheckMapEvents);

const targetInitialCheck = `    // Initial monologue check
    if (this.mapData && this.mapData.events) {
      const customEvent = this.mapData.events.find((e: any) => e.type === 'custom_event' && e.x === this.currentGridX && e.y === this.currentGridY);
      if (customEvent && this.onCustomEventCallback) {
        this.isShowingMonologue = true;
        this.onCustomEventCallback(customEvent.data?.eventId || '', () => {
          this.isShowingMonologue = false;
        });
        return;
      }

      const monologueEvent = this.mapData.events.find((e: any) => e.type === 'monologue' && e.x === this.currentGridX && e.y === this.currentGridY);
      if (monologueEvent) {
        this.showMonologue(monologueEvent.data?.text || '');
      }
    }`;

const replaceInitialCheck = `    // Initial check (start_point, custom_event, monologue)
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

code = code.replace(targetInitialCheck, replaceInitialCheck);

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('patched scene events');
