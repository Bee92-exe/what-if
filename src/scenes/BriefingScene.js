import Phaser from 'phaser';
import { CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Panel, Button, ButtonGroup, ScrollBox } from '../ui/index.js';
import { buildSpeakerStage } from '../ui/speakerStage.js';
import { ellipsize } from '../ui/textMetrics.js';
import { getState, setFlag, save } from '../state/gameState.js';
import { fillTokens } from '../utils/player.js';
import missionFor from '../utils/missions.js';
import { SPEAKER_PORTRAIT, SPEAKER_NAME, TEAM_INTRO, TEAM_ORDER } from './storyCast.js';
import { drawSpaceCentre, drawBottomBar } from '../art/scenery.js';

export default class BriefingScene extends Phaser.Scene {
  constructor() {
    super('briefing');
  }

  init() {
    this.briefIndex = 0;
    this.folderShown = false;
    this.mission = missionFor();
  }

  create() {
    drawSpaceCentre(this);
    drawBottomBar(this);

    this.add
      .text(12, 8, 'BRIEFING', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold })
      .setOrigin(0, 0);
    this.add
      .text(12, 40, ellipsize(this.mission.title.toUpperCase(), 616, FONT_SIZE.md), {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.md}px`,
        color: CSS.dim,
      })
      .setOrigin(0, 0);

    const intros = getState().flags?.metTheTeam
      ? []
      : TEAM_ORDER.filter((speaker) => TEAM_INTRO[speaker]).map((speaker) => ({
          speaker,
          text: TEAM_INTRO[speaker],
        }));
    this.introCount = intros.length;
    this.lines = [...intros, ...(this.mission.briefing ?? [])];

    this.stage = buildSpeakerStage(this);
    this.hint = this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 6, 'TAP TO GO ON', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(1, 1);
    this.input.on('pointerup', (pointer, currentlyOver) => {
      if (this.folderShown || this.stage.box.dragging) return;
      if (currentlyOver?.length) return;
      this.nextLine();
    });
    this.input.keyboard.on('keydown-SPACE', () => !this.folderShown && this.nextLine());
    this.input.keyboard.on('keydown-ENTER', () => !this.folderShown && this.nextLine());

    this.nextLine();
  }

  nextLine() {
    if (this.briefIndex >= this.lines.length) return this.showFolder();
    const line = this.lines[this.briefIndex++];
    this.stage.nameText.setText(SPEAKER_NAME[line.speaker] ?? line.speaker);
    this.stage.show(line.speaker, SPEAKER_PORTRAIT[line.speaker] ?? 'kabir_neutral');
    this.stage.box.setText(fillTokens(line.text, getState().player));
    if (this.introCount && this.briefIndex === this.introCount) {
      setFlag('metTheTeam', true);
      save();
    }
    if (this.briefIndex >= this.lines.length) this.hint.setText('TAP FOR THE MISSION FOLDER');
  }

  showFolder() {
    this.folderShown = true;
    this.hint.setVisible(false);
    this.stage.hide();

    const panel = new Panel(this, 320, 180, GAME_WIDTH - 24, 240, 'MISSION FOLDER');
    this.folderBox = new ScrollBox(this, -288, -88, 576, 192, { fontSize: FONT_SIZE.md, lineSpacing: 8, stepLines: 2 });
    panel.add(this.folderBox);

    this.folderBox.setText(this.folderText());

    const group = new ButtonGroup(this);
    group.add(
      new Button(this, 320, 326, 320, 44, 'TO THE DESIGN ROOM', () => {
        setFlag('briefingDone', true);
        save();
        this.scene.start('design');
      }, { accent: true, font: FONT_SIZE.md })
    );
  }

  folderText() {
    const m = this.mission;
    const objectives = m.targets
      .map((t, i) => `${i + 1}. Days ${t.dayRange[0]}-${t.dayRange[1]}: ${t.name ?? t.id.replace(/_/g, ' ')}`)
      .join('\n');
    return [
      `GOAL: ${m.goal ?? 'Watch the storm and warn the coast in time.'}`,
      '',
      `MONEY: $${m.budget.toFixed(1)}M      TIME: ${m.deadlineDays} days`,
      '',
      'WHAT SHE MUST SEE:',
      objectives,
      '',
      'HOW: pick a rocket and a road in the sky at launch.',
      'If the satellite cannot see the storm when it matters,',
      'the warning comes too late.',
    ].join('\n');
  }
}
