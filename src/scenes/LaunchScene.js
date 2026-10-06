import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Panel, Button, Bar } from '../ui/index.js';
import { ellipsize } from '../ui/textMetrics.js';
import { partById, rocketById, orbitById } from '../utils/dataStore.js';
import { computeDesignStats } from '../sim/stats.js';
import { capacityCheck, launchRoll } from '../sim/launch.js';
import { getState, setFlags, save } from '../state/gameState.js';
import { makeRng } from '../utils/rng.js';
import { sfx } from '../audio/sfx.js';
import { playMusic } from '../audio/music.js';
import missionFor from '../utils/missions.js';
import { fillDisc, plotEllipse } from '../art/procedural.js';

const L = {
  left: { x: 8, w: 304 },
  rocket: { y: 44, h: 152, rowH: 44 },
  orbit: { y: 202, h: 150, rowH: 43 },
  lift: { x: 320, y: 44, w: 146, h: 184 },
  ring: { x: 474, y: 44, w: 158, h: 184 },
  timing: { x: 320, y: 236, w: 312, h: 64 },
  bottom: { y: 304 },
};

const LOOP_MS = 5600;
const ORBITS_PER_LOOP = 2;

const SEQ = { perNumber: 800, ignition: 600, climb: 1400 };
const COUNTDOWN_MS = SEQ.perNumber * 3;
const CLIMB_AT = COUNTDOWN_MS + SEQ.ignition;
const LIFTOFF_END = CLIMB_AT + SEQ.climb;

export default class LaunchScene extends Phaser.Scene {
  constructor() {
    super('launch');
  }

  init() {
    this.mission = missionFor();
    this.rocketId = this.mission.allowedRockets[0];
    this.orbitId = this.mission.orbits[0];
    this.timing = null;
    this.clock = 0;
    this.armed = false;
    this.armedAt = 0;
  }

  create() {
    playMusic('launch');
    this.reduced = !!getState().settings?.reducedMotion;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLOR.spaceBlack).setOrigin(0);

    this.buildHeader();
    this.buildPickers();
    this.buildLiftoffWindow();
    this.buildOrbitWindow();
    this.buildTimingGame();
    this.buildFooter();
    this.bindKeys();
    this.refresh();
  }

  buildHeader() {
    this.add
      .text(12, 6, 'LAUNCH!', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold })
      .setOrigin(0, 0);
    this.add
      .text(12, 32, ellipsize(this.mission.title.toUpperCase(), 300, FONT_SIZE.xs), {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.xs}px`,
        color: CSS.dim,
      })
      .setOrigin(0, 0);
    this.add
      .text(GAME_WIDTH - 12, 10, 'B = BACK TO BUILDING', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.xs}px`,
        color: CSS.dim,
      })
      .setOrigin(1, 0);
  }

  buildPickers() {
    this.add
      .text(L.left.x, L.rocket.y - 4, '1. PICK A ROCKET', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.accent })
      .setOrigin(0, 0);
    this.add
      .text(L.left.x, L.orbit.y - 4, '2. PICK A ROAD IN THE SKY', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.accent,
      })
      .setOrigin(0, 0);

    const mkRow = (y, w) => {
      const bg = this.add
        .rectangle(L.left.x, y, w, 38, COLOR.navy)
        .setOrigin(0, 0)
        .setStrokeStyle(1, COLOR.metal);
      const name = this.add
        .text(L.left.x + 10, y + 4, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.text })
        .setOrigin(0, 0);
      const line = this.add
        .text(L.left.x + 10, y + 24, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
        .setOrigin(0, 0);
      const tick = this.add
        .text(L.left.x + w - 10, y + 24, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.accent })
        .setOrigin(1, 0);
      return { bg, name, line, tick };
    };

    this.rocketRows = this.mission.allowedRockets.map((id, i) => {
      const y = L.rocket.y + 14 + i * L.rocket.rowH;
      const row = mkRow(y, L.left.w);
      row.bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.rocketId = id;
        sfx.click();
        this.refresh();
      });
      return row;
    });

    this.orbitRows = this.mission.orbits.map((id, i) => {
      const y = L.orbit.y + 14 + i * L.orbit.rowH;
      const row = mkRow(y, L.left.w);
      row.bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.orbitId = id;
        sfx.click();
        this.refresh();
      });
      return row;
    });
  }

  buildLiftoffWindow() {
    const { x, y, w, h } = L.lift;
    this.liftWindow = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, COLOR.spaceBlack).setOrigin(0, 0).setStrokeStyle(1, COLOR.metal);
    this.liftWindow.add(bg);
    this.add
      .text(x + 4, y - 14, 'LIFT-OFF', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.accent })
      .setOrigin(0, 0);

    this.liftStars = [];
    for (let i = 0; i < 22; i++) {
      const s = this.add.rectangle(
        Phaser.Math.Between(4, w - 6),
        Phaser.Math.Between(4, h - 4),
        Phaser.Math.Between(1, 2),
        1,
        i % 5 === 0 ? COLOR.ice : COLOR.metal
      );
      this.liftWindow.add(s);
      this.liftStars.push(s);
    }
    this.liftGround = this.add.rectangle(0, h - 26, w, 26, COLOR.brown).setOrigin(0, 0);
    this.liftPad = this.add.rectangle(w / 2 - 18, h - 34, 36, 8, COLOR.metal).setOrigin(0, 0);
    this.liftWindow.add([this.liftGround, this.liftPad]);

    this.liftRocket = this.add.image(w / 2, h - 40, 'rocketSmall').setScale(2).setOrigin(0.5, 1);
    this.liftFlame = this.add.image(w / 2, h - 36, 'rocketFlame2').setScale(2).setOrigin(0.5, 0).setVisible(false);
    this.liftWindow.add([this.liftRocket, this.liftFlame]);

    this.liftSmoke = [];
    for (let i = 0; i < 7; i++) {
      const puff = this.add.rectangle(w / 2, h - 34, 16, 10, i % 2 ? COLOR.metal : COLOR.white).setOrigin(0.5).setAlpha(0);
      this.liftWindow.add(puff);
      this.liftSmoke.push(puff);
    }
    this.countdownText = this.add
      .text(w / 2, 24, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xl}px`, color: CSS.gold })
      .setOrigin(0.5, 0)
      .setVisible(false);
    this.liftWindow.add(this.countdownText);
    this.liftCaption = this.add
      .text(w / 2, h - 16, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0.5, 0);
    this.liftWindow.add(this.liftCaption);
    this.maskContainer(this.liftWindow, x, y, w, h);
  }

  buildOrbitWindow() {
    const { x, y, w, h } = L.ring;
    this.orbitWindow = this.add.container(x, y);
    this.orbitWindow.add(this.add.rectangle(0, 0, w, h, COLOR.spaceBlack).setOrigin(0, 0).setStrokeStyle(1, COLOR.metal));
    this.add
      .text(x + 4, y - 14, 'HER ROAD', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.accent })
      .setOrigin(0, 0);

    const earth = this.add.graphics();
    fillDisc(earth, w / 2, h + 210, 250, 0x1b3a5c);
    fillDisc(earth, w * 0.35, h + 30, 10, COLOR.teal);
    fillDisc(earth, w * 0.62, h + 24, 7, COLOR.green);
    this.orbitWindow.add(earth);
    this.orbitWindow.sendToBack(earth);

    const sun = this.add.graphics();
    fillDisc(sun, 20, 26, 8, COLOR.gold);
    fillDisc(sun, 20, 26, 5, COLOR.white);
    this.orbitWindow.add(sun);

    const path = this.add.graphics();
    plotEllipse(path, w / 2, h - 78, (w - 24) / 2, 42, COLOR.metal);
    this.orbitWindow.add(path);

    this.orbitStation = this.add.image(w * 0.36, h - 26, 'groundStation').setOrigin(0.5, 1);
    this.orbitBeam = this.add
      .rectangle(w * 0.36, h - 40, 6, 26, COLOR.teal, 0.9)
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.orbitWindow.add([this.orbitStation, this.orbitBeam]);
    this.orbitWindow.bringToTop(this.orbitStation);

    this.orbitSat = this.add.image(w / 2, h - 120, 'satellite').setScale(3);
    this.orbitWindow.add(this.orbitSat);
    this.orbitCaption = this.add
      .text(w / 2, h - 16, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0.5, 0);
    this.orbitWindow.add(this.orbitCaption);
    this.maskContainer(this.orbitWindow, x, y, w, h);
  }

  maskContainer(container, x, y, w, h) {
    const shape = this.make.graphics({ x: 0, y: 0 }, false);
    shape.fillStyle(0xffffff).fillRect(x + 1, y + 1, w - 2, h - 2);
    container.setMask(shape.createGeometryMask());
    this.masks = this.masks ?? [];
    this.masks.push(shape);
  }

  buildTimingGame() {
    const t = L.timing;
    this.timingPanel = new Panel(this, t.x + t.w / 2, t.y + t.h / 2, t.w, t.h, 'LAST JOB: STOP THE BAR');
    this.timingHint = this.add
      .text(0, -8, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0.5, 0.5);
    this.trackBg = this.add.rectangle(0, 10, 240, 14, COLOR.spaceBlack).setStrokeStyle(1, COLOR.metal);
    this.trackZone = this.add.rectangle(0, 10, 56, 12, COLOR.teal);
    this.trackMarker = this.add.rectangle(-120, 10, 4, 16, COLOR.gold);
    this.timingPanel.add([this.timingHint, this.trackBg, this.trackZone, this.trackMarker]);
    this.trackBg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.stopTiming());
    this.timingHint.setText('TAP HERE WHEN THE MARK IS GREEN');
    this.setTimingResult(null);
  }

  setTimingResult(result) {
    this.timingResult = result;
    const text = result === 'perfect' ? 'PERFECT!' : result === 'good' ? 'GOOD!' : result === 'poor' ? 'MISSED' : '';
    if (text) this.timingHint.setText(text);
    else this.timingHint.setText('TAP HERE WHEN THE MARK IS GREEN');
    this.timingHint.setColor(result === 'perfect' ? CSS.accent : result === 'good' ? CSS.gold : result === 'poor' ? CSS.danger : CSS.dim);
  }

  buildFooter() {
    this.weightBar = new Bar(this, L.left.x + 312, L.bottom.y + 2, 130, 'WEIGHT', { showValue: false, font: FONT_SIZE.xs });
    this.oddsText = this.add
      .text(L.left.x + 312, L.bottom.y + 40, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.text })
      .setOrigin(0, 0);


    this.launchButton = new Button(this, GAME_WIDTH - 70, L.bottom.y + 24, 124, 44, 'LAUNCH!', () => this.doLaunch(), {
      accent: true,
      font: FONT_SIZE.md,
    });
  }

  bindKeys() {
    this.input.keyboard.on('keydown-SPACE', () => this.stopTiming());
    this.input.keyboard.on('keydown-B', () => this.scene.start('design'));
    this.input.keyboard.on('keydown-ENTER', () => this.doLaunch());
  }

  stats() {
    const design = getState().design ?? { slots: { payload: [] } };
    return computeDesignStats(
      design,
      partById,
      orbitById.get(this.orbitId),
      rocketById.get(this.rocketId),
      this.mission.deadlineDays
    );
  }

  refresh() {
    const stats = this.stats();
    this.rocketRows.forEach((row, i) => {
      const r = rocketById.get(this.mission.allowedRockets[i]);
      const selected = this.mission.allowedRockets[i] === this.rocketId;
      const fits = r.capacityKg >= stats.mass;
      row.name.setText(`${r.name}${selected ? '  <<' : ''}`);
      row.name.setColor(selected ? CSS.gold : CSS.text);
      row.line.setText(`${r.capacityKg}kg | $${r.cost.toFixed(1)}M | safe ${Math.round(r.reliability * 100)}%`);
      row.line.setColor(fits ? CSS.dim : CSS.danger);
      row.tick.setText(fits ? 'FITS' : 'TOO SMALL');
      row.tick.setColor(fits ? CSS.accent : CSS.danger);
      row.bg.setStrokeStyle(selected ? 2 : 1, selected ? COLOR.gold : COLOR.metal);
      row.bg.setFillStyle(selected ? COLOR.blue : COLOR.navy);
    });

    this.orbitRows.forEach((row, i) => {
      const o = orbitById.get(this.mission.orbits[i]);
      const selected = this.mission.orbits[i] === this.orbitId;
      row.name.setText(`${o.name}${selected ? '  <<' : ''}`);
      row.name.setColor(selected ? CSS.gold : CSS.text);
      row.line.setText(`${o.altitudeKm}km | ${o.passesPerDay} passes | dark ${Math.round(o.eclipseFraction * 100)}%`);
      row.tick.setText(`${o.periodMin.toFixed(0)} min`);
      row.tick.setColor(CSS.dim);
      row.bg.setStrokeStyle(selected ? 2 : 1, selected ? COLOR.gold : COLOR.metal);
      row.bg.setFillStyle(selected ? COLOR.blue : COLOR.navy);
    });

    const rocket = rocketById.get(this.rocketId);
    const cap = capacityCheck(stats.mass, rocket);
    this.weightBar.labelText.setText(`WEIGHT ${stats.mass.toFixed(1)}/${rocket.capacityKg}kg`);
    this.weightBar.setValue(Math.min(1, stats.mass / rocket.capacityKg));
    const overall = Math.round(rocket.reliability * stats.reliability * 100);
    this.oddsText.setText(`CHANCE ${overall}%`);
    this.oddsText.setColor(overall >= 85 ? CSS.accent : overall >= 70 ? CSS.gold : CSS.danger);
    this.launchButton.blocked = !cap.ok;
    this.launchButton.setAlpha(cap.ok ? 1 : 0.4);
    this.orbitCaption.setText(`${orbitById.get(this.orbitId).periodMin.toFixed(0)} min around`);
    this.liftCaption.setText(this.armed ? rocket.name.toUpperCase() : 'PRESS LAUNCH!');
  }

  update(time, delta) {
    this.clock += delta;
    const d = Math.min(delta, 50);
    if (!this.reduced) {
      this.renderLiftoff(d);
      this.renderOrbit(d);
    }
    if (!this.timingResult && !this.armed) this.advanceMarker(d);
  }

  renderLiftoff(delta) {
    const w = L.lift.w;
    const h = L.lift.h;

    if (!this.armed) {
      this.countdownText.setVisible(false);
      this.liftFlame.setVisible(false);
      this.liftRocket.setVisible(true).setPosition(w / 2, h - 40);
      for (const puff of this.liftSmoke) puff.setAlpha(0);
      return;
    }

    const t = this.clock - this.armedAt;
    let y = h - 40;
    let flame = 0;
    if (t < COUNTDOWN_MS) {
      const n = 3 - Math.floor(t / SEQ.perNumber);
      this.countdownText.setText(String(Math.max(1, n))).setColor(CSS.gold).setVisible(true);
      this.liftFlame.setVisible(false);
      this.liftRocket.setVisible(true).setY(h - 40);
      this.liftRocket.setX(w / 2 + Phaser.Math.Between(-1, 1));
    } else if (t < CLIMB_AT) {
      this.countdownText.setText('GO!').setColor(CSS.danger).setVisible(true);
      this.liftFlame.setVisible(true).setX(w / 2);
      this.liftRocket.setX(w / 2 + Phaser.Math.Between(-2, 2));
      this.liftRocket.setY(h - 40 + Phaser.Math.Between(0, 2));
      flame = 1;
    } else {
      const climb = Math.min(1, (t - CLIMB_AT) / SEQ.climb);
      const eased = climb * climb * 0.6 + climb * 0.4;
      y = h - 40 - eased * (h + 30);
      this.countdownText.setVisible(false);
      this.liftFlame.setVisible(climb < 0.9).setX(w / 2);
      this.liftRocket.setX(w / 2);
      flame = climb < 0.9 ? 1 : 0;
      for (const s of this.liftStars) {
        s.y += (2 + climb * 14) * (delta / 16);
        if (s.y > h - 30) s.y = 2;
      }
    }
    this.liftRocket.setY(y);
    if (flame) {
      this.liftFlame.setTexture(this.clock % 160 < 80 ? 'rocketFlame1' : 'rocketFlame2');
      this.liftFlame.setY(this.liftRocket.y + 4);
      this.liftFlame.setScale(2, 2 + Phaser.Math.Between(0, 1));
    }
    const nearPad = y > h - 110;
    this.liftSmoke.forEach((puff, i) => {
      if (!nearPad) {
        puff.setAlpha(0);
        return;
      }
      const t2 = ((this.clock / 600 + i * 0.18) % 1 + 1) % 1;
      puff.setAlpha(Math.max(0, 0.9 - t2));
      puff.setX(w / 2 + (i % 2 ? 1 : -1) * (4 + t2 * 30));
      puff.setY(h - 34 - t2 * 10);
      puff.setScale(0.6 + t2 * 1.6, 0.6 + t2 * 1.2);
    });
  }

  renderOrbit(delta) {
    void delta;
    const w = L.ring.w;
    const h = L.ring.h;
    const cx = w / 2;
    const cy = h - 78;
    const rx = (w - 24) / 2;
    const ry = 42;
    const frac = (((this.clock % LOOP_MS) + LOOP_MS) % LOOP_MS) / LOOP_MS;
    const a = frac * Math.PI * 2 * ORBITS_PER_LOOP - Math.PI / 2;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    this.orbitSat.setPosition(x, y);
    const night = Math.cos(a) > 0.25;
    this.orbitSat.setAlpha(night ? 0.65 : 1);
    const nearStation = Math.abs(x - w * 0.36) < 26 && y < cy;
    this.orbitBeam.setVisible(nearStation && !night).setX(w * 0.36);
  }

  advanceMarker(delta) {
    this.markerT = (this.markerT ?? 0) + delta;
    const period = 1500;
    const phase = (((this.markerT % period) + period) % period) / period;
    const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2;
    this.trackMarker.setX(-120 + tri * 240);
  }

  stopTiming() {
    if (this.timingResult || this.armed) return;
    const dist = Math.abs(this.trackMarker.x);
    const inZone = dist <= 28;
    const near = dist <= 60;
    this.setTimingResult(inZone ? 'perfect' : near ? 'good' : 'poor');
    sfx.confirm();
    if (!inZone) sfx.error();
  }

  doLaunch() {
    if (this.launchButton.blocked || this.armed) return;
    if (!this.timingResult) this.stopTiming();

    const rocket = rocketById.get(this.rocketId);
    const design = getState().design;
    const seed = Date.now() % 2147483647;
    const roll = launchRoll(rocket.reliability, makeRng(seed));

    setFlags({ launchTiming: this.timingResult, launchSeed: seed, rocketId: this.rocketId, orbitId: this.orbitId });
    save();

    this.armed = true;
    this.armedAt = this.clock;
    this.launchButton.blocked = true;
    this.launchButton.setLabel('FLYING!');
    this.liftCaption.setText(rocket.name.toUpperCase());
    sfx.launch();

    this.time.delayedCall(LIFTOFF_END, () => {
      if (!roll.success) {
        setFlags({ launchFailed: true, launchFailureCause: `${rocket.name}: ${Math.round((1 - rocket.reliability) * 100)}% chance came up.` });
        save();
        this.scene.start('debrief', { launchFailure: true });
        return;
      }
      getState().mission = {
        design,
        rocketId: this.rocketId,
        orbitId: this.orbitId,
        seed,
        day: 0,
        log: [],
        started: true,
        satelliteName: getState().satelliteName || 'SHAPLA-2',
      };
      save();
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('operations'));
    });
  }
}
