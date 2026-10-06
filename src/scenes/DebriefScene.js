import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Button, ButtonGroup, ScrollBox } from '../ui/index.js';
import { ellipsize, wrapText } from '../ui/textMetrics.js';
import { partById, rocketById, orbitById } from '../utils/dataStore.js';
import { computeDesignStats } from '../sim/stats.js';
import { computeScore, starsFor, outcomeTier, goldBadge } from '../sim/scoring.js';
import { buildCauseChain } from '../sim/debrief.js';
import { getState, setFlags, setFlag, save } from '../state/gameState.js';
import { sfx } from '../audio/sfx.js';
import { playMusic } from '../audio/music.js';
import missionFor from '../utils/missions.js';

const UNLOCKS_BY_CHAPTER = {
  1: ['bus27u', 'sar_small', 'comms_xband', 'rad_shield', 'thruster'],
  2: [],
};

export default class DebriefScene extends Phaser.Scene {
  constructor() {
    super('debrief');
  }

  init(data) {
    this.launchFailure = !!data?.launchFailure;
    this.mission = missionFor();
    this.chainIndex = 0;
  }

  create() {
    playMusic('menu');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLOR.navy, 1).setOrigin(0);
    this.input.keyboard.on('keydown-B', () => this.scene.start('design'));
    if (this.launchFailure) this.createFailure();
    else this.createResult();
  }

  createFailure() {
    const reduced = getState().settings?.reducedMotion;
    this.add
      .text(320, 36, 'LAUNCH FAILURE', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xl}px`, color: CSS.danger })
      .setOrigin(0.5, 0);
    const cause = getState().flags.launchFailureCause ?? 'The rocket came apart at max-Q.';
    this.add
      .text(320, 96, wrapText(cause, 560, FONT_SIZE.md), {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.md}px`,
        color: CSS.text,
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);
    const lines = [
      'Nobody was hurt. The satellite never reached orbit.',
      'The cyclone arrives unseen — but not to the villages.',
      'Kabir: "Design again. Better this time."',
    ];
    this.add
      .text(320, 176, lines.join('\n'), {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.dim,
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5, 0);

    const buttons = new ButtonGroup(this);
    buttons.add(new Button(this, 320, 300, 320, 44, 'BACK TO THE DRAWING BOARD', () => this.scene.start('design'), { accent: true }));
    sfx.error();
    if (!reduced) this.cameras.main.shake(400, 0.01);
  }

  createResult() {
    const gs = getState();
    const m = this.mission;
    const design = gs.design ?? { slots: { payload: [] } };
    const rocket = rocketById.get(gs.mission?.rocketId ?? m.allowedRockets[0]);
    const orbit = orbitById.get(gs.mission?.orbitId ?? m.orbits[0]);
    const stats = computeDesignStats(design, partById, orbit, rocket, m.deadlineDays);
    const mstate = gs.mission?.state ?? {
      log: [],
      objectiveProgress: {},
      images: { captured: 0, usable: 0, delivered: 0 },
      daysLost: 0,
      totalDays: m.deadlineDays,
      batteryWh: 0,
      batteryCapacityWh: 0,
      bufferMB: 0,
      eventCount: 0,
      satelliteName: 'SHAPLA-2',
    };
    const finalScore = computeScore(mstate, stats, m);
    const stars = starsFor(finalScore.total);
    const tier = outcomeTier(finalScore.total, m);
    const gold = goldBadge(mstate, stats, m);
    this.chain = buildCauseChain(mstate, m);

    this.scorePage = this.add.container(0, 0);
    this.chainPage = this.add.container(0, 0).setVisible(false);

    this.buildScorePage(tier, finalScore, stars, gold);
    this.buildChainPage(this.chain.length);

    this.stepChain(0);
    this.recordProgress(finalScore, stars, gold);
  }

  buildScorePage(tier, finalScore, stars, gold) {
    const add = (o) => this.scorePage.add(o);
    add(
      this.add.text(12, 8, 'MISSION REPORT', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold }).setOrigin(0, 0)
    );
    add(
      this.add
        .text(GAME_WIDTH - 12, 12, `SCORE ${finalScore.total} / 100`, {
          fontFamily: FONT_MAIN,
          fontSize: `${FONT_SIZE.md}px`,
          color: finalScore.total >= 60 ? CSS.accent : CSS.gold,
        })
        .setOrigin(1, 0)
    );
    add(
      this.add
        .text(320, 44, tier.text, {
          fontFamily: FONT_MAIN,
          fontSize: `${FONT_SIZE.lg}px`,
          color: tier.minScore >= 60 ? CSS.accent : CSS.gold,
          align: 'center',
          wordWrap: { width: 600 },
          lineSpacing: 6,
        })
        .setOrigin(0.5, 0)
    );

    const starRow = this.add.container(gold ? 280 : 320, 150);
    for (let i = 0; i < 3; i++) starRow.add(this.star(-70 + i * 70, 0, 7, i < stars));
    add(starRow);
    if (gold) {
      add(
        this.add
          .text(400, 142, "KABIR'S SEAL", { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.accent })
          .setOrigin(0, 0)
      );
    }
    if (stars >= 2) sfx.star();

    finalScore.breakdown.forEach((b, i) => {
      const y = 184 + i * 34;
      const row = this.add.container(12, y);
      row.add(
        this.add
          .text(0, 0, b.label, { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.text })
          .setOrigin(0, 0)
      );
      row.add(
        this.add
          .text(0, 20, ellipsize(b.detail, 186, FONT_SIZE.xs), {
            fontFamily: FONT_MAIN,
            fontSize: `${FONT_SIZE.xs}px`,
            color: CSS.dim,
          })
          .setOrigin(0, 0)
      );
      const bg = this.add.rectangle(200, 22, 260, 14, COLOR.spaceBlack).setOrigin(0, 0.5).setStrokeStyle(1, COLOR.metal);
      const fill = this.add
        .rectangle(201, 22, Math.max(0, 258 * (b.value / 100)), 12, b.value >= 70 ? COLOR.teal : b.value >= 40 ? COLOR.gold : COLOR.red)
        .setOrigin(0, 0.5);
      row.add([bg, fill]);
      const earned = Math.round((b.value / 100) * b.weight);
      row.add(
        this.add
          .text(512, 22, String(earned), { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.text })
          .setOrigin(1, 0.5)
      );
      row.add(
        this.add
          .text(524, 22, `of ${b.weight}`, { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.dim })
          .setOrigin(0, 0.5)
      );
      add(row);
    });

    const buttons = new ButtonGroup(this);
    if (getState().chapter < 2) {
      buttons.add(new Button(this, 72, 336, 120, 32, 'WHY?', () => this.showPage('chain'), { font: FONT_SIZE.xs }));
      buttons.add(new Button(this, 320, 336, 160, 32, 'TRY ANOTHER BUILD', () => this.scene.start('design'), { font: FONT_SIZE.xs }));
      buttons.add(new Button(this, 540, 336, 176, 32, 'NEXT CHAPTER >', () => this.advanceChapter(), { accent: true, font: FONT_SIZE.xs }));
    } else {
      buttons.add(new Button(this, 110, 336, 160, 32, 'WHY?', () => this.showPage('chain'), { font: FONT_SIZE.xs }));
      buttons.add(new Button(this, 430, 336, 220, 32, 'END OF FILE', () => this.scene.start('title'), { accent: true, font: FONT_SIZE.xs }));
    }
    this.scorePage.add(buttons.buttons);
  }

  buildChainPage(count) {
    const add = (o) => this.chainPage.add(o);
    add(
      this.add
        .text(12, 8, 'WHY IT WENT THIS WAY', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold })
        .setOrigin(0, 0)
    );
    this.chainCounter = this.add
      .text(GAME_WIDTH - 12, 36, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.dim })
      .setOrigin(1, 0);
    add(this.chainCounter);
    this.chainDay = this.add
      .text(12, 54, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.accent })
      .setOrigin(0, 0);
    add(this.chainDay);
    this.chainBox = new ScrollBox(this, 12, 78, GAME_WIDTH - 24, 222, {
      fontSize: FONT_SIZE.md,
      lineSpacing: 6,
      stepLines: 2,
    });
    add(this.chainBox);
    this.chainCounter.setText(`MOMENT 1 OF ${count}`);

    const buttons = new ButtonGroup(this);
    buttons.add(new Button(this, 72, 330, 120, 32, '< THE SCORE', () => this.showPage('score'), { font: FONT_SIZE.xs }));
    buttons.add(new Button(this, 320, 330, 220, 32, 'NEXT MOMENT >', () => this.stepChain(1), { font: FONT_SIZE.xs }));
    buttons.add(new Button(this, 552, 330, 152, 32, 'THE SCORE >', () => this.showPage('score'), { accent: true, font: FONT_SIZE.xs }));
    this.chainPage.add(buttons.buttons);
  }

  star(x, y, cell, filled) {
    const g = this.add.graphics();
    g.fillStyle(filled ? COLOR.gold : COLOR.metal, 1);
    const pattern = ['..#..', '.###.', '#####', '.#.#.'];
    const ox = x - (pattern[0].length * cell) / 2;
    const oy = y - (pattern.length * cell) / 2;
    for (let r = 0; r < pattern.length; r++) {
      for (let c = 0; c < pattern[r].length; c++) {
        if (pattern[r][c] !== '#') continue;
        g.fillRect(Math.round(ox + c * cell), Math.round(oy + r * cell), cell, cell);
      }
    }
    return g;
  }

  showPage(page) {
    this.scorePage.setVisible(page === 'score');
    this.chainPage.setVisible(page === 'chain');
    sfx.click();
  }

  stepChain(dir) {
    const n = Math.max(1, this.chain.length);
    this.chainIndex = (((this.chainIndex ?? 0) + dir) % n + n) % n;
    const c = this.chain[this.chainIndex];
    this.chainDay.setText(ellipsize(`DAY ${c.day}: ${c.title.toUpperCase()}`, GAME_WIDTH - 24, FONT_SIZE.md));
    this.chainBox.setText(`${c.text}\n\nLESSON\n${c.lesson}`);
    this.chainCounter.setText(`MOMENT ${this.chainIndex + 1} OF ${n}`);
    if (dir !== 0) sfx.click();
  }

  recordProgress(score, stars, gold) {
    const gs = getState();
    const chapterId = `ch${gs.chapter}`;
    const prev = gs.results[chapterId];
    if (!prev || score.total > prev.score) {
      gs.results[chapterId] = { score: score.total, stars, gold };
    }
    setFlags({ lastScore: score.total, lastStars: stars });
    save();
  }

  advanceChapter() {
    const gs = getState();
    const finishedChapter = gs.chapter;
    const unlocks = UNLOCKS_BY_CHAPTER[finishedChapter] ?? [];
    const newlyUnlocked = unlocks.filter((id) => !gs.unlocked.parts.includes(id));
    getState().unlocked.parts = [...getState().unlocked.parts, ...newlyUnlocked];

    if (finishedChapter === 1) {
      setFlag('ch1Complete', true);
      getState().chapter = 2;
      getState().mission = null;
      save();
      this.scene.start('story');
      return;
    }
    setFlag('campaignComplete', true);
    getState().mission = null;
    save();
    this.scene.start('title');
  }
}
