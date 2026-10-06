import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE } from '../config.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('preload');
  }

  preload() {
    const barBg = this.add.rectangle(320, 190, 404, 16, COLOR.navy).setStrokeStyle(1, COLOR.metal);
    const bar = this.add.rectangle(320 - 200, 190, 0, 12, COLOR.teal).setOrigin(0, 0.5);
    this.add
      .text(320, 156, 'PADMA SPACE AGENCY', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.md}px`,
        color: CSS.dim,
      })
      .setOrigin(0.5);

    this.load.on('progress', (v) => bar.setSize(Math.max(0, 400 * v), 12));
    this.load.once('complete', () => {
      barBg.destroy();
      bar.destroy();
      this.scene.start('title');
    });

  }

  create() {
    this.time.delayedCall(400, () => {
      if (this.scene.isActive()) this.scene.start('title');
    });
  }
}
