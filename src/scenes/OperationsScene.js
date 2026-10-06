import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Panel, Button, ButtonGroup, ScrollBox } from '../ui/index.js';
import { ellipsize, wrapText } from '../ui/textMetrics.js';
import { partById, rocketById, orbitById } from '../utils/dataStore.js';
import { computeDesignStats } from '../sim/stats.js';
import { createMissionState, runDay, DEFAULT_PLAN } from '../sim/mission.js';
import { pickEvent, applyEffect } from '../sim/events.js';
import { dayHeadline } from '../sim/debrief.js';
import { getState, save } from '../state/gameState.js';
import { makeRng } from '../utils/rng.js';
import { sfx } from '../audio/sfx.js';
import missionFor from '../utils/missions.js';
import { drawStarfield, fillDisc, plotEllipse } from '../art/procedural.js';
import eventsData from '../data/events.json' with { type: 'json' };
import { playMusic } from '../audio/music.js';

const eventMap = new Map(eventsData.events.map((e) => [e.id, e]));

const SKY = { y: 36, h: 196 };
const PANEL = { x: 12, y: 236, w: GAME_WIDTH - 24, h: 122 };

const EVENT = {
  problem: { x: -288, y: -118, w: 576, h: 116 },
  buttonY: 40,
  buttonGap: 56,
};
const DAY_ANIM_MS = 6000;
const ORBITS_PER_DAY = 2;

export default class OperationsScene extends Phaser.Scene {
  constructor() {
    super('operations');
  }

  init() {
    const gs = getState();
    this.mission = missionFor();
    const rocket = rocketById.get(gs.mission?.rocketId ?? this.mission.allowedRockets[0]);
    const orbit = orbitById.get(gs.mission?.orbitId ?? this.mission.orbits[0]);
    this.rocket = rocket;
    this.orbit = orbit;
    this.rng = makeRng(gs.mission?.seed ?? 12345);
    const saved = gs.mission?.state;
    this.mstate = saved && !saved.finished
      ? saved
      : createMissionState(gs.design ?? { slots: { payload: [] } }, partById, rocket, orbit, this.mission, gs.mission?.satelliteName);
    this.firedEvents = gs.mission?.firedEvents ?? [];
    this.phase = 'plan';
    this.dayResult = null;
    this.animT = 0;
  }

  persist() {
    const gs = getState();
    if (gs.mission) {
      gs.mission.state = this.mstate;
      gs.mission.firedEvents = this.firedEvents;
    }
    save();
  }

  create() {
    playMusic('operations');
    drawStarfield(this, 'bg_stars', GAME_WIDTH, GAME_HEIGHT, 20261007, 8);
    this.add.image(0, 0, 'bg_stars').setOrigin(0);

    this.buildSky();
    this.buildHeader();
    this.buildPlanPanel();
    this.buildSummaryPanel();
    this.buildEventModal();

    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.phase === 'summary') this.nextDay();
      else if (this.phase === 'plan') this.beginDay();
    });

    this.refreshHeader();
    this.refreshPlan();
    sfx.ding();
  }

  buildSky() {
    this.add.rectangle(0, SKY.y, GAME_WIDTH, SKY.h, COLOR.spaceBlack, 0.6).setOrigin(0);

    const earth = this.add.graphics();
    fillDisc(earth, 320, 470, 330, 0x1b3a5c);
    fillDisc(earth, 250, 196, 12, COLOR.teal);
    fillDisc(earth, 430, 202, 8, COLOR.green);
    this.add
      .text(320, SKY.y + SKY.h - 18, 'BAY OF BENGAL', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0.5);

    const sun = this.add.graphics();
    fillDisc(sun, 44, SKY.y + 26, 14, COLOR.gold);
    fillDisc(sun, 44, SKY.y + 26, 9, COLOR.white);

    const path = this.add.graphics();
    plotEllipse(path, 320, SKY.y + 120, 258, 62, COLOR.metal);
    this.satSprite = this.add.image(320, SKY.y + 58, 'satellite').setScale(4);

    this.station = this.add.image(300, SKY.y + 150, 'groundStation').setScale(3);
    this.stationBeam = this.add.rectangle(300, SKY.y + 118, 10, 36, COLOR.teal, 0.9).setOrigin(0.5, 1).setVisible(false);

    this.cyclone = this.add.image(470, SKY.y + 96, 'cyclone1').setScale(4);
    this.cycloneText = this.add
      .text(470, SKY.y + 130, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.danger })
      .setOrigin(0.5);
  }

  buildHeader() {
    this.add
      .text(12, 4, 'FLIGHT CONTROL', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold })
      .setOrigin(0, 0);
    this.dayText = this.add
      .text(GAME_WIDTH - 12, 4, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.text })
      .setOrigin(1, 0);
    this.batteryText = this.add
      .text(12, 32, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.text })
      .setOrigin(0, 0);
    this.cloudText = this.add
      .text(GAME_WIDTH - 12, 32, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.dim })
      .setOrigin(1, 0);
  }

  buildPlanPanel() {
    this.planPanel = new Panel(this, PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h / 2, PANEL.w, PANEL.h, 'WHAT SHALL SHE DO TODAY?');
    const left = -PANEL.w / 2 + 20;
    this.plan = { ...DEFAULT_PLAN };
    this.toggleRows = [
      { key: 'imaging', label: 'TAKE PICTURES' },
      { key: 'downlink', label: 'SEND THEM HOME' },
      { key: 'powerSave', label: 'REST AND CHARGE' },
    ].map((row, i) => {
      const y = -20 + i * 30;
      const box = this.add
        .rectangle(left, y, 24, 24, COLOR.spaceBlack)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, COLOR.metal)
        .setInteractive({ useHandCursor: true });
      const tick = this.add.rectangle(left + 6, y, 12, 12, COLOR.green).setOrigin(0, 0.5).setVisible(false);
      const label = this.add
        .text(left + 34, y, row.label, { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.text })
        .setOrigin(0, 0.5);
      const state = this.add
        .text(56, y, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.dim })
        .setOrigin(1, 0.5);
      const hit = this.add
        .rectangle(left, y, 348, 28, COLOR.navy, 0.001)
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.plan[row.key] = !this.plan[row.key];
        this.refreshPlan();
        sfx.click();
      });
      this.planPanel.add([box, tick, label, state, hit]);
      return { ...row, box, tick, label, state };
    });
    this.goButton = new Button(this, 180, 0, 216, 56, 'BEGIN DAY', () => this.beginDay(), { accent: true, font: FONT_SIZE.md });
    this.planPanel.add(this.goButton);
  }

  buildSummaryPanel() {
    this.summaryPanel = new Panel(this, PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h / 2, PANEL.w, PANEL.h, 'HOW THE DAY WENT').setVisible(false);
    this.summaryBox = new ScrollBox(this, -292, -33, 420, 84, {
      fontSize: FONT_SIZE.md,
      lineSpacing: 8,
      stepLines: 2,
    });
    this.summaryPanel.add(this.summaryBox);
    this.nextDayButton = new Button(this, 216, 0, 172, 56, 'NEXT DAY >', () => this.nextDay(), { accent: true, font: FONT_SIZE.md });
    this.summaryPanel.add(this.nextDayButton);
  }

  buildEventModal() {
    this.eventPanel = new Panel(this, 320, 194, 616, 300, 'SOMETHING HAPPENED').setVisible(false).setDepth(20);
    this.eventIntro = new ScrollBox(this, EVENT.problem.x, EVENT.problem.y, EVENT.problem.w, EVENT.problem.h, {
      title: 'THE PROBLEM TODAY',
      fontSize: FONT_SIZE.md,
      lineSpacing: 6,
      stepLines: 2,
    });
    this.eventPanel.add(this.eventIntro);
    this.eventChoiceButtons = [];
    this.buttons = new ButtonGroup(this);
  }

  refreshHeader() {
    this.dayText.setText(`DAY ${Math.min(this.mstate.day + 1, this.mstate.totalDays)} / ${this.mstate.totalDays}`);
    const d = this.mstate.day;
    const cloud = this.mission.weather.cloudCoverByDay[Math.min(d, 9)];
    this.cloudText.setText(`CLOUD ${(cloud * 100).toFixed(0)}%`);
    this.batteryText.setText(`BATTERY ${Math.round(this.mstate.batteryWh)} / ${this.mstate.batteryCapacityWh} Wh   PICTURES ${Math.round(this.mstate.bufferMB)} MB`);
    const stage = d < 3 ? 'cyclone1' : d < 6 ? 'cyclone2' : 'cyclone3';
    this.cyclone.setTexture(stage);
    this.cyclone.setPosition(470 - d * 8, SKY.y + 96 - d * 3);
    this.cycloneText.setText(`${['STORM', 'SEVERE', 'LANDFALL'][Math.min(2, Math.floor(d / 3))]}`);
    this.cycloneText.setPosition(this.cyclone.x, this.cyclone.y + 34);
  }

  refreshPlan() {
    for (const row of this.toggleRows) {
      const on = !!this.plan[row.key];
      row.tick.setVisible(on);
      row.state.setText(on ? 'YES' : 'no').setColor(on ? CSS.accent : CSS.dim);
    }
  }

  beginDay() {
    if (this.phase !== 'plan') return;
    this.phase = 'watch';
    this.planPanel.setVisible(false);

    this.pendingEvent = pickEvent(this.mission.eventPool, eventMap, this.mstate.day + 1, this.rng, this.firedEvents);
    const { state } = runDay(this.mstate, this.plan, partById, this.orbit, this.mission, this.rng);
    this.mstate = state;
    this.dayResult = state.log.filter((e) => e.day === this.mstate.day);

    if (this.pendingEvent) {
      this.firedEvents.push(this.pendingEvent.id);
      this.showEvent(this.pendingEvent);
      return;
    }
    this.startDayAnim();
  }

  showEvent(event) {
    this.phase = 'event';
    this.eventPanel.setVisible(true);
    this.eventPanel.titleText.setText(ellipsize(`SOMETHING HAPPENED: ${event.name.toUpperCase()}`, 580, FONT_SIZE.sm));
    this.eventIntro.setText(event.intro);
    this.eventChoiceButtons.forEach((b) => b.destroy());
    this.eventChoiceButtons = [];
    event.choices.forEach((choice, i) => {
      const b = new Button(this, 0, EVENT.buttonY + i * EVENT.buttonGap, 520, 44, choice.text, () => this.resolveEvent(event, choice), {
        font: FONT_SIZE.md,
        accent: i === 0,
      });
      this.eventPanel.add(b);
      this.eventChoiceButtons.push(b);
      this.buttons.add(b);
    });
    sfx.warning();
  }

  resolveEvent(event, choice) {
    const { state, outcomeText } = applyEffect(this.mstate, event, choice, this.mission, this.rng);
    this.mstate = state;
    this.eventPanel.setVisible(false);
    this.eventChoiceButtons.forEach((b) => b.destroy());
    this.eventChoiceButtons = [];
    this.buttons.buttons = [];
    this.toast(outcomeText);
    this.time.delayedCall(1500, () => this.startDayAnim());
  }

  toast(message) {
    const text = this.add
      .text(320, SKY.y + 20, wrapText(message, 520, FONT_SIZE.md), {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.md}px`,
        color: CSS.gold,
        align: 'center',
        lineSpacing: 6,
        backgroundColor: '#0d0b1e',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setDepth(30);
    this.tweens.add({ targets: text, alpha: 0, delay: 2600, duration: 600, onComplete: () => text.destroy() });
  }

  startDayAnim() {
    this.phase = 'watch';
    this.animT = 0;
  }

  update(time, delta) {
    if (this.phase !== 'watch') return;
    this.animT += Math.min(delta, 60);
    const p = Math.min(1, this.animT / DAY_ANIM_MS);
    const a = -Math.PI / 2 + p * Math.PI * 2 * ORBITS_PER_DAY;
    const x = 320 + Math.cos(a) * 258;
    const y = SKY.y + 120 + Math.sin(a) * 62;
    this.satSprite.setPosition(x, y);
    const night = Math.cos(a) > 0.25;
    this.satSprite.setAlpha(night ? 0.6 : 1);
    const overStation = Math.abs(x - 300) < 40 && y < SKY.y + 120;
    this.stationBeam.setVisible(overStation && !night);
    if (overStation && !night && p < 0.98 && Math.random() < 0.15) sfx.packet();
    if (p >= 1) this.showSummary();
  }

  showSummary() {
    if (this.phase === 'summary') return;
    this.phase = 'summary';
    this.stationBeam.setVisible(false);

    const d = this.mstate.day;
    const entries = this.mstate.log.filter((e) => e.day === d);
    const good = entries.filter((e) => e.type === 'imaging' && e.severity === 'good').length;
    const delivered = entries.find((e) => e.type === 'downlink')?.values?.delivered ?? 0;
    const cover = this.mission.weather.cloudCoverByDay;
    const cloud = cover[Math.min(Math.max(0, d - 1), cover.length - 1)];
    this.summaryBox.setText(dayHeadline({ day: d, good, delivered, batteryWh: this.mstate.batteryWh, cloud }));
    this.summaryPanel.setVisible(true);
    this.refreshHeader();
    this.persist();
    sfx.ding();
  }

  nextDay() {
    this.summaryPanel.setVisible(false);
    this.summaryBox.setText('');
    if (this.mstate.finished) {
      this.persist();
      this.scene.start('debrief');
      return;
    }
    this.phase = 'plan';
    this.plan = { ...DEFAULT_PLAN, ...(this.mstate.planOverride ?? {}) };
    this.mstate.planOverride = {};
    this.refreshHeader();
    this.refreshPlan();
    this.planPanel.setVisible(true);
  }
}
