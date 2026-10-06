import Phaser from 'phaser';
import { generateAllTextures } from '../art/textureFactory.js';
import { bakeSpaceCentreTextures } from '../art/scenery.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const keys = generateAllTextures(this);

    bakeSpaceCentreTextures(this);

    if (keys.length < 5) throw new Error('BootScene: expected the full texture set');

    this.time.delayedCall(120, () => this.scene.start('preload'));
  }
}
