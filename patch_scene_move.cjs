const fs = require('fs');
let code = fs.readFileSync('src/phaser/GridMovementScene.ts', 'utf8');

const targetStr = `  private checkAndMoveRandomly() {`;
const replaceStr = `  private checkAndMoveRandomly() {
    if (this.isShowingMonologue) return;`;

code = code.replace(targetStr, replaceStr);

// Let's also check for update method moving logic, but checkAndMoveRandomly handles pointer click movement and AI movement, which seems to be the main way the hero moves. What about WASD?

const targetUpdateStr = `  public update(time: number, delta: number) {`;
const replaceUpdateStr = `  public update(time: number, delta: number) {
    if (this.isShowingMonologue) return;`;

code = code.replace(targetUpdateStr, replaceUpdateStr);

fs.writeFileSync('src/phaser/GridMovementScene.ts', code);
console.log('patched move');
