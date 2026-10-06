import { COLOR, CSS, FONT_MAIN, FONT_SIZE } from '../config.js';
import { ScrollBox } from './ScrollBox.js';


export const SPEECH_BOX = { x: 148, y: 190, w: 480, h: 150 };

export const NAME_PLATE = { x: SPEECH_BOX.x, y: 158, w: 260, h: 26 };

export const PORTRAIT_CARD = { x: 8, y: SPEECH_BOX.y, w: 132, h: SPEECH_BOX.h };

export const PORTRAIT_SCALE = 8;

export const PAPER_SCALE = 6;

export function buildSpeakerStage(scene, opts = {}) {
  const cx = PORTRAIT_CARD.x + PORTRAIT_CARD.w / 2;
  const cy = PORTRAIT_CARD.y + PORTRAIT_CARD.h / 2;

  const frame = scene.add
    .rectangle(PORTRAIT_CARD.x, PORTRAIT_CARD.y, PORTRAIT_CARD.w, PORTRAIT_CARD.h, COLOR.navy, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(1, COLOR.metal);
  const paper = scene.add.image(cx, cy, 'dossierPage').setScale(PAPER_SCALE).setVisible(false);
  const portrait = scene.add.image(cx, cy, 'kabir_neutral').setScale(PORTRAIT_SCALE);

  const namePlate = scene.add
    .rectangle(NAME_PLATE.x, NAME_PLATE.y, NAME_PLATE.w, NAME_PLATE.h, COLOR.spaceBlack, 1)
    .setOrigin(0, 0)
    .setStrokeStyle(1, COLOR.metal);
  const nameText = scene.add
    .text(NAME_PLATE.x + 10, NAME_PLATE.y + 8, '', {
      fontFamily: FONT_MAIN,
      fontSize: `${FONT_SIZE.sm}px`,
      color: CSS.accent,
    })
    .setOrigin(0, 0);

  const box = new ScrollBox(scene, SPEECH_BOX.x, SPEECH_BOX.y, SPEECH_BOX.w, SPEECH_BOX.h, {
    fontSize: FONT_SIZE.md,
    lineSpacing: 8,
    stepLines: 3,
    ...(opts.box ?? {}),
  });

  return {
    box,
    frame,
    paper,
    portrait,
    namePlate,
    nameText,

    show(speaker, portraitKey) {
      const wantsFace = speaker && speaker !== 'narrator';
      const hasArt = !!portraitKey && scene.textures.exists(portraitKey);
      if (wantsFace && hasArt) portrait.setTexture(portraitKey);
      portrait.setVisible(Boolean(wantsFace && hasArt));
      paper.setVisible(!wantsFace || !hasArt);
      namePlate.setVisible(Boolean(wantsFace));
      nameText.setVisible(Boolean(wantsFace));
      frame.setVisible(true);
    },

    hide() {
      frame.setVisible(false);
      paper.setVisible(false);
      portrait.setVisible(false);
      namePlate.setVisible(false);
      nameText.setVisible(false);
      box.setVisible(false);
    },
  };
}
