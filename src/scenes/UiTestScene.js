import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Panel, Button, Bar, Tooltip, ButtonGroup, ScrollBox } from '../ui/index.js';
import { PART_ICONS } from '../art/sprites/partIcons.js';
import { drawDitherGradient, drawWater } from '../art/procedural.js';

export default class UiTestScene extends Phaser.Scene {
  constructor() {
    super('uitest');
  }

  create() {
    drawDitherGradient(this, 'bg_sky_dusk', 0, 0, GAME_WIDTH, 200, 0x1b1f4a, 0x2e3f8f, 6);
    drawWater(this, 'bg_water', GAME_WIDTH, 120);
    this.add.image(0, 0, 'bg_sky_dusk').setOrigin(0);
    this.add.image(0, 200, 'bg_water').setOrigin(0);
    this.add.text(12, 8, 'UI KIT TEST', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold }).setOrigin(0, 0);
    this.add
      .text(12, 40, 'Every label is wrapped or ellipsized to its own box.', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.dim,
      })
      .setOrigin(0, 0);

    const ids = Object.keys(PART_ICONS);
    const gap = 38;
    const x0 = Math.round((GAME_WIDTH - (ids.length * gap - gap + 24)) / 2) + 12;
    ids.forEach((id, i) => {
      this.add.image(x0 + i * gap, 92, `part_${id}`).setScale(1);
    });

    const barsPanel = new Panel(this, 206, 208, 388, 176, 'BARS');
    const mk = (i, label, opts) => new Bar(this, -182, -56 + i * 34, 240, label, { valueAlign: 'right', valueX: 364, valueWidth: 90, ...opts });
    this.bars = {
      mass: mk(0, 'WEIGHT', { safeFrom: 0, safeTo: 0.85 }),
      day: mk(1, 'SUN POWER', { warnAt: 0.8, dangerAt: 0.95 }),
      night: mk(2, 'AT NIGHT', { warnAt: 0.8, dangerAt: 0.95 }),
      cost: mk(3, 'BUDGET', { dangerAt: 0.9 }),
    };
    barsPanel.add(Object.values(this.bars));
    this.bars.mass.setValue(0.62, '18.6/30kg');
    this.bars.day.setValue(0.45, '9W of 20W');
    this.bars.night.setValue(0.87, '6 of 7 Wh');
    this.bars.cost.setValue(0.55, '$3.3M');

    const buttonPanel = new Panel(this, 519, 208, 218, 176, 'BUTTONS');
    this.buttons = new ButtonGroup(this);
    const labels = ['ONE', 'TWO', 'TOO LONG FOR THIS BUTTON'];
    labels.forEach((label, i) => {
      const b = new Button(this, 0, -48 + i * 44, 190, 32, label, () => this.shift(), { font: FONT_SIZE.sm });
      buttonPanel.add(b);
      this.buttons.add(b);
    });
    const back = new Button(this, 0, 84, 190, 32, 'BACK TO TITLE', () => this.scene.start('title'), { accent: true, font: FONT_SIZE.sm });
    buttonPanel.add(back);
    this.buttons.add(back);

    this.tooltip = new Tooltip(this);
    const sat = this.add.image(600, 92, 'satellite').setScale(2).setInteractive({ useHandCursor: true });
    this.tooltip.showFor(sat, 'Shapla-class cubesat: 6U bus, two payload slots.');

    this.scroll = new ScrollBox(this, 12, 300, GAME_WIDTH - 24, 52, {
      fontSize: FONT_SIZE.md,
      lineSpacing: 6,
      stepLines: 1,
    });
    this.scroll.setText(
      'This paragraph is far too long for a 52-pixel box, so it scrolls: ' +
        'the ▲▼ arrows, the wheel, a finger drag and the arrow keys all move it, ' +
        'and the arrows only appear when they are needed.'
    );

    this.input.keyboard.once('keydown-ESC', () => this.scene.start('title'));
  }

  shift() {
    this.bars.day.setValue(Phaser.Math.FloatBetween(0.2, 0.95));
    this.bars.mass.setValue(Phaser.Math.FloatBetween(0.3, 1.05));
  }
}
