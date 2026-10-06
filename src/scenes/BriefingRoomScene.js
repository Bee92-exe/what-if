import Phaser from 'phaser';
import { CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Button } from '../ui/index.js';
import { getState } from '../state/gameState.js';
import { drawBriefingRoom, addBriefingTable, drawBottomBar } from '../art/scenery.js';
import { SPEAKER_NAME, SPEAKER_PORTRAIT, SPEAKER_SHORT_ROLE, TEAM_ORDER } from './storyCast.js';

const SEATS = [176, 272, 368, 464];

export default class BriefingRoomScene extends Phaser.Scene {
  constructor() {
    super('briefingroom');
  }

  create() {
    const calm = !!getState().settings?.reducedMotion;
    drawBriefingRoom(this);
    drawBottomBar(this);

    this.add
      .text(320, 44, 'AT THE', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.dim })
      .setOrigin(0.5, 0);
    this.add
      .text(320, 62, 'BRIEFING ROOM', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.gold })
      .setOrigin(0.5, 0);
    this.add
      .text(320, 92, 'The whole team is waiting for you.', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.xs}px`,
        color: CSS.dim,
      })
      .setOrigin(0.5, 0);

    this.cast = TEAM_ORDER.map((speaker, i) => {
      const x = SEATS[i] ?? SEATS[SEATS.length - 1];
      const group = this.add.container(x, 210);
      const portrait = this.add.image(0, 0, SPEAKER_PORTRAIT[speaker]).setScale(4);
      const name = this.add
        .text(0, 46, SPEAKER_NAME[speaker], { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.accent })
        .setOrigin(0.5, 0);
      const role = this.add
        .text(0, 58, SPEAKER_SHORT_ROLE[speaker] ?? '', {
          fontFamily: FONT_MAIN,
          fontSize: `${FONT_SIZE.xs}px`,
          color: CSS.ink,
        })
        .setOrigin(0.5, 0);
      group.add([portrait, name, role]);
      group.setVisible(calm);
      if (!calm) {
        this.time.delayedCall(180 + i * 260, () => {
          group.setVisible(true).setY(200);
          this.tweens.add({ targets: group, y: 210, duration: 240, ease: 'Sine.easeOut' });
        });
      }
      return group;
    });

    addBriefingTable(this);

    new Button(this, 320, 314, 240, 44, 'GO IN', () => this.scene.start('briefing'), {
      accent: true,
      font: FONT_SIZE.md,
    });

    this.add
      .text(GAME_WIDTH - 10, GAME_HEIGHT - 6, 'ESC = back to the title', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.xs}px`,
        color: CSS.dim,
      })
      .setOrigin(1, 1);
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('title'));
  }
}
