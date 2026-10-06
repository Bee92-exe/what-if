import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Button } from '../ui/index.js';
import { getState, newGame, setPlayer, save } from '../state/gameState.js';
import { AVATARS, MAX_NAME, cleanName } from '../utils/player.js';
import { sfx } from '../audio/sfx.js';

const SUGGESTED = {
  0: ['ARIF', 'SAMIR', 'NABIL', 'ORIN', 'RAFI'],
  1: ['NILA', 'RIYA', 'TANHA', 'MIRA', 'JUHI', 'TITHI'],
};

const ROWS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ'];
const ALL_SUGGESTED = Object.values(SUGGESTED).flat();

export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super('character');
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLOR.spaceBlack, 1).setOrigin(0);
    this.add
      .text(320, 8, 'WHO IS THE DIRECTOR?', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold })
      .setOrigin(0.5, 0);

    this.avatarIndex = Math.random() < 0.5 ? 0 : 1;
    this.name = Phaser.Utils.Array.GetRandom(SUGGESTED[this.avatarIndex]);

    this.buildNameField();
    this.buildAvatars();
    this.buildKeyboard();
    this.buildStart();

    this.add
      .text(GAME_WIDTH - 10, GAME_HEIGHT - 6, 'ESC = back', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(1, 1);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('title'));

    this.refreshName();
  }


  buildNameField() {
    this.add
      .text(110, 36, 'YOUR NAME', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0, 0);
    this.plate = this.add.rectangle(320, 62, 420, 36, COLOR.navy).setStrokeStyle(1, COLOR.metal);
    this.nameText = this.add
      .text(126, 62, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.text })
      .setOrigin(0, 0.5);
    this.cursor = this.add.rectangle(130, 62, 2, 20, COLOR.gold).setOrigin(0, 0.5);
    if (!getState().settings?.reducedMotion) {
      this.tweens.add({ targets: this.cursor, alpha: 0, duration: 500, yoyo: true, repeat: -1 });
    }
    this.add
      .text(320, 86, 'Type your name, or tap the letters below.', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.xs}px`,
        color: CSS.dim,
      })
      .setOrigin(0.5, 0);
    this.input.keyboard.on('keydown', (e) => {
      if (/^[a-zA-Z]$/.test(e.key)) this.type(e.key.toUpperCase());
      else if (e.key === ' ') this.type(' ');
      else if (e.key === 'Backspace') this.type(null);
      else if (e.key === 'Enter') this.start();
    });
  }

  type(ch) {
    if (ch === null) {
      this.name = this.name.slice(0, -1);
      sfx.click();
    } else if (this.name.length < MAX_NAME) {
      this.name += ch;
      sfx.click();
    } else {
      sfx.error();
      return;
    }
    this.refreshName();
  }

  refreshName() {
    this.nameText.setText(this.name);
    this.cursor.x = this.nameText.x + this.nameText.width + 4;
  }


  buildAvatars() {
    this.cards = AVATARS.map((avatar, i) => {
      const x = i === 0 ? 224 : 416;
      const card = this.add.container(x, 158);
      const bg = this.add.rectangle(0, 0, 168, 108, COLOR.navy).setStrokeStyle(1, COLOR.metal);
      const face = this.add.image(0, -14, avatar.sprite).setScale(5);
      const label = this.add
        .text(0, 42, avatar.label, { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.dim })
        .setOrigin(0.5);
      card.add([bg, face, label]);
      card.setSize(168, 108).setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.pickAvatar(i));
      return { card, bg, label };
    });
    this.pickAvatar(this.avatarIndex, true);
  }

  pickAvatar(i, silent = false) {
    this.avatarIndex = i;
    this.cards.forEach(({ bg, label }, index) => {
      const on = index === i;
      bg.setStrokeStyle(on ? 2 : 1, on ? COLOR.gold : COLOR.metal);
      label.setColor(on ? CSS.gold : CSS.dim);
    });
    if (!silent && ALL_SUGGESTED.includes(this.name)) {
      this.name = Phaser.Utils.Array.GetRandom(SUGGESTED[i]);
      this.refreshName();
    }
    if (!silent) sfx.click();
  }


  buildKeyboard() {
    const keyW = 54;
    const keyH = 28;
    const gap = 4;
    ROWS.forEach((row, r) => {
      const y = 216 + r * (keyH + gap) + keyH / 2;
      const letters = r === 2 ? `${row}SD`.split('') : row.split('');
      const width = letters.length * keyW + (letters.length - 1) * gap;
      letters.forEach((key, c) => {
        const x = 320 - width / 2 + c * (keyW + gap) + keyW / 2;
        const label = key === 'S' && r === 2 ? 'SPC' : key === 'D' && r === 2 ? 'DEL' : key;
        const isSpace = label === 'SPC';
        const isDel = label === 'DEL';
        new Button(this, x, y, keyW, keyH, label, () => this.type(isDel ? null : isSpace ? ' ' : label), {
          font: FONT_SIZE.sm,
        });
      });
    });
  }


  buildStart() {
    new Button(this, 320, 328, 240, 40, 'START', () => this.start(), { accent: true, font: FONT_SIZE.md });
  }

  start() {
    if (this.started) return;
    this.started = true;
    const name = cleanName(this.name);
    newGame();
    setPlayer({ name, avatar: this.avatarIndex });
    save();
    sfx.confirm();
    this.scene.start('interstitial');
  }
}
