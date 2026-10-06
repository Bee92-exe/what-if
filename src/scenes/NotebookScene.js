import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { ScrollBox } from '../ui/index.js';
import glossary from '../data/glossary.json' with { type: 'json' };
import { getState } from '../state/gameState.js';
import { sfx } from '../audio/sfx.js';

export default class NotebookScene extends Phaser.Scene {
  constructor() {
    super('notebook');
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLOR.spaceBlack, 1).setOrigin(0);
    this.add
      .text(12, 8, "ENGINEER'S NOTEBOOK", { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold })
      .setOrigin(0, 0);
    this.add
      .text(12, 40, 'What Kabir told you, written down so you can check.', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.dim,
      })
      .setOrigin(0, 0);

    const unlocked = getState().unlocked.notebook ?? [];
    const flags = getState().flags;
    const entries = glossary.entries.filter((e) => !e.unlockedBy || unlocked.includes(e.unlockedBy) || flags[e.unlockedBy]);

    const lines = [];
    for (const e of entries) {
      lines.push(`* ${e.term}`);
      lines.push(`  ${e.text}`);
      lines.push('');
    }
    if (!lines.length) lines.push('(Nothing here yet. Fly a mission and come back.)');

    this.box = new ScrollBox(this, 12, 68, GAME_WIDTH - 24, 250, { fontSize: FONT_SIZE.md, lineSpacing: 6, stepLines: 3 });
    this.box.setText(lines.join('\n'));

    this.add
      .text(12, GAME_HEIGHT - 12, '▲▼ or wheel to read', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0, 1);
    this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 12, 'ESC = back', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(1, 1);
    this.input.keyboard.once('keydown-ESC', () => {
      this.scene.start('title');
      sfx.click();
    });
  }
}
