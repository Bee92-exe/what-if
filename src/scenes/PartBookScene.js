import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Button, ButtonGroup, PartCard } from '../ui/index.js';
import { partIconKey } from '../art/sprites/partIcons.js';
import { ellipsize } from '../ui/textMetrics.js';
import { parts, partById } from '../utils/dataStore.js';
import { getState, save } from '../state/gameState.js';
import { sfx } from '../audio/sfx.js';
import { playMusic } from '../audio/music.js';

const CARD = { x: 12, y: 68, w: 616, h: 200 };

export default class PartBookScene extends Phaser.Scene {
  constructor() {
    super('partsbook');
  }

  init(data) {
    this.from = data?.from ?? 'title';
    const startId = data?.partId ?? getState().flags.lastBookPart;
    const startIndex = parts.findIndex((p) => p.id === startId);
    this.index = startIndex >= 0 ? startIndex : 0;
  }

  create() {
    playMusic('menu');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLOR.spaceBlack).setOrigin(0);

    this.add.text(12, 8, 'PARTS BOOK', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold }).setOrigin(0, 0);
    this.add
      .text(12, 40, 'Every part of her, and what it does.', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.dim,
      })
      .setOrigin(0, 0);
    this.counter = this.add
      .text(GAME_WIDTH - 12, 12, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.text })
      .setOrigin(1, 0);

    this.card = new PartCard(this, CARD.x, CARD.y, CARD.w, CARD.h, { demoW: 150, scale: 3, title: 'WHAT IS THIS?' });

    this.buildFilmstrip();
    this.buildFooter();
    this.show(this.index);
  }

  buildFilmstrip() {
    const unlocked = getState().unlocked.parts;
    const size = 24;
    const gap = 13;
    const total = parts.length * size + (parts.length - 1) * gap;
    const x0 = Math.round((GAME_WIDTH - total) / 2);
    const y = 300;
    this.strip = parts.map((part, i) => {
      const x = x0 + i * (size + gap);
      const locked = !isUnlocked(part, unlocked);
      const box = this.add
        .rectangle(x - 3, y - size / 2 - 3, size + 6, size + 6, COLOR.navy)
        .setOrigin(0, 0)
        .setStrokeStyle(1, locked ? COLOR.dim : COLOR.metal)
        .setInteractive({ useHandCursor: true });
      const icon = this.add.image(x + size / 2, y, partIconKey(part)).setScale(1).setAlpha(locked ? 0.25 : 1);
      const mark = this.add
        .text(x + size / 2, y, locked ? '?' : '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
        .setOrigin(0.5);
      box.on('pointerdown', () => {
        this.show(i);
        sfx.click();
      });
      return { box, icon, mark, x, locked };
    });
    this.nameLine = this.add
      .text(GAME_WIDTH / 2, 318, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0.5, 0);
  }

  buildFooter() {
    this.buttons = new ButtonGroup(this);
    this.prevButton = new Button(this, 72, 343, 120, 32, '< PREVIOUS', () => this.step(-1), { font: FONT_SIZE.xs });
    this.nextButton = new Button(this, 208, 343, 120, 32, 'NEXT >', () => this.step(1), { font: FONT_SIZE.xs });
    this.doneButton = new Button(
      this,
      GAME_WIDTH - 82,
      343,
      148,
      32,
      this.from === 'design' ? 'BACK TO BUILDING' : 'DONE',
      () => this.close(),
      { accent: true, font: FONT_SIZE.xs }
    );
    for (const b of [this.prevButton, this.nextButton, this.doneButton]) this.buttons.add(b);

    this.input.keyboard.on('keydown-LEFT', () => this.step(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.step(1));
    this.input.keyboard.on('keydown-ESC', () => this.close());
  }

  step(dir) {
    this.show((this.index + dir + parts.length) % parts.length);
    sfx.click();
  }

  show(index) {
    this.index = index;
    const part = parts[index];
    getState().flags.lastBookPart = part.id;
    save();
    this.card.show(part);
    this.counter.setText(`${index + 1} / ${parts.length}`);
    const locked = !isUnlocked(part, getState().unlocked.parts);
    this.nameLine.setText(
      ellipsize(locked ? `LOCKED - finish ${part.unlockedBy}` : part.name, 460, FONT_SIZE.xs)
    );
    this.nameLine.setColor(CSS.dim);
    this.strip.forEach((s, i) => {
      const selected = i === index;
      s.box.setFillStyle(selected ? COLOR.blue : COLOR.navy);
      s.box.setStrokeStyle(selected ? 2 : 1, selected ? COLOR.gold : s.locked ? COLOR.dim : COLOR.metal);
    });
  }

  close() {
    this.scene.start(this.from === 'design' ? 'design' : 'title');
  }
}

function isUnlocked(part, unlockedParts) {
  if (!part.unlockedBy || part.unlockedBy === 'start') return true;
  return unlockedParts.includes(part.id);
}
