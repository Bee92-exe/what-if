import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Panel, Button, ButtonGroup } from '../ui/index.js';
import { getState, clearSave, save } from '../state/gameState.js';
import { sfx } from '../audio/sfx.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('settings');
  }

  create() {
    const gs = getState();
    if (!gs.settings) gs.settings = { textSpeed: 'normal', muted: false, reducedMotion: false };
    this.s = gs.settings;

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLOR.spaceBlack, 1).setOrigin(0);
    this.add.text(12, 8, 'SETTINGS', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold }).setOrigin(0, 0);
    this.add
      .text(12, 40, 'Tap a row to change it.', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.dim })
      .setOrigin(0, 0);

    const panel = new Panel(this, 320, 196, GAME_WIDTH - 24, 260, 'CONSOLE OPTIONS');
    const rowW = GAME_WIDTH - 64;
    const left = -rowW / 2;
    const rows = [
      { key: 'textSpeed', label: 'TEXT SPEED', hint: 'How fast the words appear', values: ['slow', 'normal', 'fast'] },
      { key: 'muted', label: 'SOUND', hint: 'Music and bleeps', values: [true, false] },
      { key: 'reducedMotion', label: 'CALM SCREEN', hint: 'Stop the moving animations', values: [false, true] },
    ];

    this.rows = rows.map((row, i) => {
      const y = -74 + i * 52;
      const bg = this.add.rectangle(left, y - 22, rowW, 44, COLOR.navy).setOrigin(0, 0).setStrokeStyle(1, COLOR.metal);
      const label = this.add
        .text(left + 14, y - 18, row.label, { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.text })
        .setOrigin(0, 0);
      const hint = this.add
        .text(left + 14, y + 6, row.hint, { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
        .setOrigin(0, 0);
      const value = this.add
        .text(rowW / 2 - 14, y, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.gold })
        .setOrigin(1, 0.5);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.cycle(row));
      panel.add([bg, label, hint, value]);
      return { row, value };
    });

    this.buttons = new ButtonGroup(this);
    this.buttons.add(
      new Button(this, 0, 88, 260, 40, 'ERASE SAVE DATA', () => {
        clearSave();
        this.add
          .text(320, 330, 'Save erased. NEW GAME will start fresh.', {
            fontFamily: FONT_MAIN,
            fontSize: `${FONT_SIZE.sm}px`,
            color: CSS.danger,
          })
          .setOrigin(0.5)
          .setDepth(10);
        sfx.error();
      }, { font: FONT_SIZE.sm })
    );
    panel.add(this.buttons.buttons);

    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 12, 'ESC = back', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(1, 1);
    this.input.keyboard.once('keydown-ESC', () => {
      save();
      this.scene.start('title');
    });

    this.refresh();
  }

  cycle(row) {
    const i = row.values.indexOf(this.s[row.key]);
    this.s[row.key] = row.values[(i + 1) % row.values.length];
    if (row.key === 'muted') sfx.setMuted(this.s.muted);
    this.refresh();
    sfx.click();
  }

  refresh() {
    const text = (row) => {
      const v = this.s[row.key];
      if (row.key === 'textSpeed') return String(v).toUpperCase();
      if (row.key === 'reducedMotion') return v ? 'CALM' : 'LIVELY';
      return v ? 'OFF' : 'ON';
    };
    this.rows.forEach(({ row, value }) => value.setText(text(row)));
  }
}
