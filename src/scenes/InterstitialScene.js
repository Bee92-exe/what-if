import Phaser from 'phaser';
import { CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT, typeDelay } from '../config.js';
import { ScrollBox } from '../ui/index.js';
import { getState } from '../state/gameState.js';
import { avatarFor, fillTokens } from '../utils/player.js';
import { drawReportRoom, drawBottomBar } from '../art/scenery.js';

const LINES = [
  '{name} walked into the report room of the research centre.',
  'Piles of reports. Old missions, storm charts, launch logs — years of them.',
  'Then one folder caught {his} eye. It was dusty, and it did not belong here.',
  'THE PADMA FILES.',
];

export default class InterstitialScene extends Phaser.Scene {
  constructor() {
    super('interstitial');
  }

  init() {
    this.lineIndex = 0;
    this.shownChars = 0;
    this.fullText = '';
    this.typer = null;
    this.typing = false;
  }

  create() {
    const gs = getState();
    const player = gs.player ?? {};
    const avatar = avatarFor(player.avatar);

    drawReportRoom(this);
    drawBottomBar(this);

    this.add
      .text(320, 12, 'PADMA SPACE RESEARCH CENTRE', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.accent,
      })
      .setOrigin(0.5, 0);

    const walker = this.add.image(-40, 206, avatar.sprite).setScale(4);
    if (gs.settings?.reducedMotion) {
      walker.setX(132);
    } else {
      this.tweens.add({ targets: walker, x: 132, duration: 1200, ease: 'Sine.easeOut' });
      this.tweens.add({
        targets: walker,
        y: 202,
        duration: 900,
        yoyo: true,
        repeat: -1,
        delay: 1200,
        ease: 'Sine.easeInOut',
      });
    }

    this.box = new ScrollBox(this, 32, 236, GAME_WIDTH - 64, 100, {
      title: 'THE REPORT ROOM',
      fontSize: FONT_SIZE.md,
      lineSpacing: 8,
      stepLines: 3,
    });

    this.hint = this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 6, 'TAP TO GO ON', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.xs}px`,
        color: CSS.dim,
      })
      .setOrigin(1, 1);

    this.bindInput();
    this.nextLine();
  }

  bindInput() {
    this.input.on('pointerup', (pointer, currentlyOver) => {
      if (this.box.dragging || currentlyOver?.length) return;
      this.advance();
    });
    this.input.keyboard.on('keydown-SPACE', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
  }

  nextLine() {
    const player = getState().player ?? {};
    this.fullText = fillTokens(LINES[this.lineIndex] ?? '', player);
    this.shownChars = 0;
    this.box.setText('');
    this.hint.setText('TAP TO GO ON');
    this.hint.setColor(CSS.dim);
    this.typing = true;
    this.typer = this.time.addEvent({
      delay: typeDelay(getState().settings),
      repeat: this.fullText.length - 1,
      callback: () => {
        this.shownChars += 1;
        this.box.setText(this.fullText.slice(0, this.shownChars), { keepScroll: true });
        if (this.shownChars >= this.fullText.length) this.lineDone();
      },
    });
  }

  lineDone() {
    this.typing = false;
    if (this.lineIndex < LINES.length - 1) return;
    this.hint.setText('TAP TO OPEN THE FILES');
    this.hint.setColor(CSS.gold);
  }

  advance() {
    if (this.typing) {
      this.typer?.remove();
      this.typing = false;
      this.shownChars = this.fullText.length;
      this.box.setText(this.fullText);
      this.lineDone();
      return;
    }
    this.lineIndex += 1;
    if (this.lineIndex < LINES.length) return this.nextLine();
    this.scene.start('story');
  }
}
