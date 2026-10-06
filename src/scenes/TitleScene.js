import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { hasSave, getState } from '../state/gameState.js';
import { drawSpaceCentre, drawBottomBar, SCENERY } from '../art/scenery.js';
import { Button, ButtonGroup } from '../ui/index.js';
import { playMusic } from '../audio/music.js';

function gsChapterScene() {
  const gs = getState();
  if (gs.mission?.state?.finished) return 'debrief';
  if (gs.mission?.started) return 'operations';
  if (gs.design) return 'design';
  if (gs.flags?.briefingDone) return 'briefing';
  if (gs.flags?.kabirConfessed) return 'briefingroom';
  return 'story';
}

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    playMusic('menu');
    drawSpaceCentre(this);
    drawBottomBar(this);

    this.add
      .text(320, 24, 'WHAT IF?', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xl}px`, color: CSS.gold })
      .setOrigin(0.5, 0);
    this.add
      .text(320, 66, 'The Padma Files', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.dim })
      .setOrigin(0.5, 0);

    const rocket = this.add.image(SCENERY.padX, 150, 'rocketSmall').setScale(2);
    if (!getState().settings?.reducedMotion) {
      this.tweens.add({
        targets: rocket,
        y: 142,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const entries = [];
    if (hasSave()) {
      entries.push(['CONTINUE', () => this.scene.start(gsChapterScene())]);
    }
    entries.push(['NEW GAME', () => this.scene.start('character')]);
    entries.push(['PARTS BOOK', () => this.scene.start('partsbook', { from: 'title' }), false, true]);
    entries.push(['NOTEBOOK', () => this.scene.start('notebook')]);
    entries.push(['SETTINGS', () => this.scene.start('settings')]);
    entries.push(['UI TEST', () => this.scene.start('uitest'), false, true]);

    const h = 36;
    const gap = 4;
    const top = 104;
    const buttons = new ButtonGroup(this);
    entries.forEach(([label, cb, accent, highlight], i) => {
      const b = new Button(this, 320, top + i * (h + gap) + h / 2, 320, h, label, cb, {
        accent,
        font: FONT_SIZE.md,
        fill: highlight ? COLOR.blue : undefined,
      });
      buttons.add(b);
    });

    this.add
      .text(320, GAME_HEIGHT - 6, 'a Padma Space Agency story  |  NASA Space Apps 2026', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.xs}px`,
        color: CSS.dim,
      })
      .setOrigin(0.5, 1);
  }
}
