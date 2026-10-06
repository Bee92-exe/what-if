import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { Panel, Button, Bar } from '../ui/index.js';
import { partIconKey } from '../art/sprites/partIcons.js';
import { clampLines, ellipsize, wrapText } from '../ui/textMetrics.js';
import { headlineFact } from '../ui/partFacts.js';
import { parts, partById, rocketById, orbitById } from '../utils/dataStore.js';
import { computeDesignStats } from '../sim/stats.js';
import {
  emptyDesign,
  installPart,
  canInstall,
  launchGating,
  budgetStatus,
  payloadCapacity,
  SLOT_ORDER,
} from '../sim/design.js';
import { getState, setDesign, save } from '../state/gameState.js';
import missionFor from '../utils/missions.js';
import { playMusic } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';

const L = {
  rail: { x: 8, y: 48, w: 152, rowH: 40, gap: 3 },
  list: { x: 164, y: 48, w: 240, panelH: 256, rowH: 58 },
  right: { x: 412, w: 220 },
  info: { y: 48, h: 120 },
  tele: { y: 176, h: 127 },
  bottom: { y: 310, h: 46 },
};

const SLOT_KID = {
  bus: 'BODY',
  power_panel: 'SUN',
  power_battery: 'JAR',
  comms: 'RADIO',
  payload: 'EYES',
  extra: 'EXTRAS',
};

const ASSEMBLY = { x: 100, y: 328, pitch: 27, max: 7 };

export default class DesignScene extends Phaser.Scene {
  constructor() {
    super('design');
  }

  init() {
    if ((getState().chapter ?? 0) < 1) getState().chapter = 1;
    this.mission = missionFor();
    this.design = getState().design ?? emptyDesign();
    this.selectedSlot = 'bus';
    this.pickerIndex = 0;
    this.toastText = null;
    this.toastUntil = 0;
  }

  create() {
    playMusic('design');
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLOR.spaceBlack).setOrigin(0);

    this.buildHeader();
    this.buildRail();
    this.buildList();
    this.buildInfoPanel();
    this.buildTelemetry();
    this.buildBottomBar();
    this.bindKeys();

    this.refresh();
  }

  buildHeader() {
    this.add
      .text(12, 8, 'BUILD A SPACESHIP', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.lg}px`, color: CSS.gold })
      .setOrigin(0, 0);
    this.dayText = this.add
      .text(GAME_WIDTH - 12, 6, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.md}px`, color: CSS.text })
      .setOrigin(1, 0);
    this.moneyText = this.add
      .text(GAME_WIDTH - 12, 28, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.dim })
      .setOrigin(1, 0);
  }

  buildRail() {
    this.add
      .text(L.rail.x, L.rail.y - 16, '1. PICK ONE', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.accent,
      })
      .setOrigin(0, 0);

    this.railRows = SLOT_ORDER.map((slot, i) => {
      const y = L.rail.y + i * (L.rail.rowH + L.rail.gap);
      const bg = this.add
        .rectangle(L.rail.x, y, L.rail.w, L.rail.rowH, COLOR.navy)
        .setOrigin(0, 0)
        .setStrokeStyle(1, COLOR.metal);
      const icon = this.add.image(L.rail.x + 22, y + L.rail.rowH / 2, 'part_bus6u').setVisible(false);
      const label = this.add
        .text(L.rail.x + 40, y + 5, SLOT_KID[slot], { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.text })
        .setOrigin(0, 0);
      const value = this.add
        .text(L.rail.x + 40, y + 23, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
        .setOrigin(0, 0);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.selectSlot(slot);
        sfx.click();
      });
      return { slot, bg, icon, label, value };
    });
  }

  buildList() {
    this.add
      .text(L.list.x, L.list.y - 16, '2. WHICH ONE?', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.accent })
      .setOrigin(0, 0);
    const panel = new Panel(this, L.list.x + L.list.w / 2, L.list.y + L.list.panelH / 2, L.list.w, L.list.panelH);
    void panel;
    this.listRows = [];
    for (let i = 0; i < 4; i++) {
      const top = L.list.y + 8 + i * L.list.rowH;
      const bg = this.add
        .rectangle(L.list.x + 8, top, L.list.w - 16, L.list.rowH - 4, COLOR.spaceBlack)
        .setOrigin(0, 0)
        .setStrokeStyle(1, COLOR.metal);
      const icon = this.add.image(L.list.x + 28, top + (L.list.rowH - 4) / 2, 'part_bus6u').setVisible(false);
      const name = this.add
        .text(L.list.x + 46, top + 4, '', {
          fontFamily: FONT_MAIN,
          fontSize: `${FONT_SIZE.md}px`,
          color: CSS.text,
          wordWrap: { width: 130 },
          lineSpacing: 2,
        })
        .setOrigin(0, 0);
      const numbers = this.add
        .text(L.list.x + 46, top + 42, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
        .setOrigin(0, 0);
      const badge = this.add
        .text(L.list.x + L.list.w - 16, top + 42, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
        .setOrigin(1, 0);
      bg.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pickerClick(i));
      this.listRows.push({ bg, icon, name, numbers, badge });
    }
    this.listEmpty = this.add
      .text(L.list.x + L.list.w / 2, L.list.y + 128, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.dim,
        align: 'center',
        wordWrap: { width: L.list.w - 32 },
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  buildInfoPanel() {
    const panel = new Panel(this, L.right.x + L.right.w / 2, L.info.y + L.info.h / 2, L.right.w, L.info.h, 'WHAT IS THIS?');
    const left = -L.right.w / 2;
    panel.add(
      this.add.rectangle(left + 8, -30, 56, 56, COLOR.spaceBlack).setOrigin(0, 0).setStrokeStyle(1, COLOR.metal)
    );
    this.infoIcon = this.add.image(left + 36, -2, 'part_bus6u').setScale(2).setVisible(false);
    this.infoName = this.add
      .text(left + 72, -32, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.gold,
        wordWrap: { width: 140 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this.infoLine = this.add
      .text(left + 72, 4, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.xs}px`,
        color: CSS.text,
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    panel.add([this.infoIcon, this.infoName, this.infoLine]);
    this.bookButton = new Button(this, 0, 44, L.right.w - 32, 24, 'SHOW ME THE BOOK', () => this.openBook(), {
      accent: true,
      font: FONT_SIZE.xs,
    });
    panel.add(this.bookButton);
  }

  buildTelemetry() {
    const panel = new Panel(this, L.right.x + L.right.w / 2, L.tele.y + L.tele.h / 2, L.right.w, L.tele.h, 'WILL SHE FLY?');
    const left = -L.right.w / 2 + 12;
    const valueX = L.right.w - 24;
    const mk = (i, label, opts) =>
      new Bar(this, left, -44 + i * 26, 112, label, {
        valueAlign: 'right',
        valueX,
        valueWidth: 78,
        ...opts,
      });
    this.bars = {
      mass: mk(0, 'WEIGHT'),
      sun: mk(1, 'SUN POWER'),
      night: mk(2, 'AT NIGHT'),
      cost: mk(3, 'BUDGET'),
    };
    panel.add(Object.values(this.bars));
  }

  buildBottomBar() {
    this.add
      .text(8, L.bottom.y + 2, 'HER PARTS', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.accent })
      .setOrigin(0, 0);
    this.add
      .text(8, L.bottom.y + 14, 'P = BOOK', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0, 0);
    this.add
      .text(8, L.bottom.y + 24, 'B = FOLDER', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0, 0);
    this.assemblyLayer = this.add.container(0, 0);
    this.assemblyIcons = [];

    this.statusText = this.add
      .text(312, L.bottom.y + 6, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.gold,
        wordWrap: { width: 180 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);

    this.launchButton = new Button(this, GAME_WIDTH - 70, L.bottom.y + 23, 124, 44, 'LAUNCH!', () => this.tryLaunch(), {
      accent: true,
      font: FONT_SIZE.md,
    });
  }

  bindKeys() {
    this.input.keyboard.on('keydown-UP', () => this.cycleSlot(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.cycleSlot(1));
    this.input.keyboard.on('keydown-LEFT', () => this.cyclePart(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.cyclePart(1));
    this.input.keyboard.on('keydown-ENTER', () => this.installSelected());
    this.input.keyboard.on('keydown-L', () => this.tryLaunch());
    this.input.keyboard.on('keydown-P', () => this.openBook());
    this.input.keyboard.on('keydown-B', () => this.scene.start('briefing'));
  }

  stats() {
    const rocket = rocketById.get(this.mission.allowedRockets[0]);
    const orbit = orbitById.get(this.mission.orbits[0]);
    return computeDesignStats(this.design, partById, orbit, rocket, this.mission.deadlineDays);
  }

  pickerPartsFor(slot) {
    const unlocked = getState().unlocked.parts;
    const all = parts.filter((p) => p.slot === slot);
    const ok = all.filter((p) => canInstall(this.design, p, partById, unlocked).ok);
    const locked = all.filter((p) => !canInstall(this.design, p, partById, unlocked).ok);
    return [...ok, ...locked];
  }

  refresh() {
    const unlocked = getState().unlocked.parts;
    this.pickerParts = this.pickerPartsFor(this.selectedSlot);
    this.dayText.setText(`${this.mission.deadlineDays} DAYS LEFT`);
    this.refreshRail();
    this.refreshList(unlocked);
    this.refreshInfo();
    this.refreshTelemetry();
    this.refreshAssembly();
    this.refreshStatus();
  }

  refreshRail() {
    for (const row of this.railRows) {
      const id = this.design.slots[row.slot];
      const part = id ? partById.get(id) : null;
      const selected = row.slot === this.selectedSlot;
      row.bg.setFillStyle(selected ? COLOR.blue : COLOR.navy);
      row.bg.setStrokeStyle(selected ? 2 : 1, selected ? COLOR.gold : COLOR.metal);
      row.icon.setVisible(!!part);
      if (part) row.icon.setTexture(partIconKey(part));
      const text = part ? part.kid?.name ?? part.name : '- empty -';
      row.value.setText(ellipsize(text, L.rail.w - 44, FONT_SIZE.xs));
      row.value.setColor(part ? CSS.accent : CSS.dim);
      if (row.slot === 'payload') {
        const cap = payloadCapacity(this.design, partById);
        row.value.setText(`${this.design.slots.payload.length} of ${cap} eyes`);
      }
    }
  }

  refreshList(unlocked) {
    this.listRows.forEach((row, i) => {
      const part = this.pickerParts[i];
      if (!part) {
        row.bg.setVisible(false);
        row.icon.setVisible(false);
        row.name.setText('');
        row.numbers.setText('');
        row.badge.setText('');
        return;
      }
      const gate = canInstall(this.design, part, partById, unlocked);
      const installed = isInstalled(this.design, part.id);
      const selected = i === this.pickerIndex % Math.max(1, this.pickerParts.length);
      const visible = true;
      row.bg.setVisible(visible);
      row.icon.setVisible(visible).setTexture(partIconKey(part));
      row.name.setText(wrapText(part.kid?.name ?? part.name, 130, FONT_SIZE.md));
      row.name.setColor(!gate.ok ? CSS.dim : installed ? CSS.accent : selected ? CSS.gold : CSS.text);
      row.numbers.setText(headlineFact(part));
      row.bg.setStrokeStyle(selected ? 2 : 1, selected ? COLOR.gold : installed ? COLOR.teal : COLOR.metal);
      const badge = this.rowBadge(part, gate, installed);
      row.badge.setText(badge.text).setColor(badge.color);
    });
  }

  rowBadge(part, gate, installed) {
    if (!gate.ok) return { text: 'LOCK', color: CSS.dim };
    if (part.slot === 'payload') {
      const night = part.capabilities?.works_at_night;
      const cloud = part.capabilities?.sees_through_clouds;
      if (night && cloud) return { text: 'NIGHT CLOUD', color: CSS.accent };
      if (night) return { text: 'NIGHT', color: CSS.accent };
      if (cloud) return { text: 'CLOUD', color: CSS.accent };
      return { text: 'DAY ONLY', color: CSS.dim };
    }
    if (installed) return { text: 'ON', color: CSS.accent };
    return { text: 'OFF', color: CSS.dim };
  }

  refreshInfo() {
    const part = this.highlightedPart();
    this.infoIcon.setVisible(!!part);
    if (!part) {
      this.infoName.setText('Nothing picked');
      this.infoLine.setText(clampLines('Tap a part below to learn what it is.', 140, FONT_SIZE.xs, 2));
      this.bookButton.setAlpha(0.5);
      return;
    }
    this.infoIcon.setTexture(partIconKey(part));
    this.infoName.setText(clampLines(part.kid?.name ?? part.name, 140, FONT_SIZE.sm, 2));
    this.infoLine.setText(clampLines(part.kid?.is ?? '', 140, FONT_SIZE.xs, 2));
    this.bookButton.setAlpha(1);
  }

  refreshTelemetry() {
    const stats = this.stats();
    const budget = budgetStatus(stats, this.mission);
    this.bars.mass.setValue(stats.bars.mass, `${stats.mass.toFixed(1)}kg`);
    this.bars.mass.setValueColor(stats.massMargin < 0 ? CSS.danger : CSS.text);
    this.bars.sun.setValue(stats.bars.powerDay, `${stats.power.avgGen.toFixed(0)}W`);
    this.bars.night.setValue(stats.bars.powerEclipse, `${stats.power.batteryHave.toFixed(0)}Wh`);
    this.bars.cost.setValue(budget.fraction, `$${stats.cost.toFixed(1)}M`);
    this.bars.cost.setValueColor(budget.over ? CSS.danger : CSS.text);
    this.moneyText.setText(`$ ${stats.cost.toFixed(1)}M of $${this.mission.budget.toFixed(1)}M`);
    this.moneyText.setColor(budget.over ? CSS.danger : CSS.dim);
  }

  refreshAssembly() {
    const s = this.design.slots;
    const chosen = [];
    const push = (key) => {
      if (s[key]) chosen.push(partById.get(s[key]));
    };
    push('bus');
    push('power_panel');
    push('power_battery');
    push('comms');
    for (const id of s.payload) chosen.push(partById.get(id));
    push('extra');
    const list = chosen.filter(Boolean);

    const countChanged = this.assemblyIcons.length !== list.length;
    this.tweens.killTweensOf(this.assemblyIcons);
    this.assemblyLayer.removeAll(true);
    this.assemblyIcons = [];

    list.slice(0, ASSEMBLY.max).forEach((part, i) => {
      const img = this.add.image(ASSEMBLY.x + i * ASSEMBLY.pitch, ASSEMBLY.y, partIconKey(part)).setScale(1);
      this.assemblyLayer.add(img);
      this.assemblyIcons.push(img);
    });
    if (list.length > ASSEMBLY.max) {
      this.assemblyLayer.add(
        this.add
          .text(ASSEMBLY.x + ASSEMBLY.max * ASSEMBLY.pitch, ASSEMBLY.y, `+${list.length - ASSEMBLY.max}`, {
            fontFamily: FONT_MAIN,
            fontSize: `${FONT_SIZE.xs}px`,
            color: CSS.dim,
          })
          .setOrigin(0, 0.5)
      );
    }

    if (countChanged && this.assemblyIcons.length) {
      const last = this.assemblyIcons[this.assemblyIcons.length - 1];
      this.tweens.add({ targets: last, scale: { from: 0.2, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    }
    if (!list.length) {
      this.assemblyLayer.add(
        this.add
          .text(ASSEMBLY.x + 60, ASSEMBLY.y, 'nothing here yet', {
            fontFamily: FONT_MAIN,
            fontSize: `${FONT_SIZE.sm}px`,
            color: CSS.dim,
          })
          .setOrigin(0.5)
      );
    }
  }

  refreshStatus() {
    const gate = launchGating(this.design, this.stats());
    this.launchButton.blocked = !gate.canLaunch;
    this.launchButton.setAlpha(gate.canLaunch ? 1 : 0.4);
    if (this.time.now < this.toastUntil && this.toastText) {
      this.statusText.setText(this.toastText).setColor(CSS.accent);
      return;
    }
    if (gate.canLaunch) {
      this.statusText.setText('She is ready! Press LAUNCH!');
      this.statusText.setColor(CSS.accent);
    } else {
      this.statusText.setText(wrapText(`Kabir: ${gate.blockers[0].text}`, 180, FONT_SIZE.sm));
      this.statusText.setColor(CSS.gold);
    }
  }

  toast(message) {
    this.toastText = message;
    this.toastUntil = this.time.now + 1600;
    this.statusText.setText(wrapText(message, 180, FONT_SIZE.sm)).setColor(CSS.accent);
    this.time.delayedCall(1680, () => this.refreshStatus());
  }

  highlightedPart() {
    const n = this.pickerParts?.length ?? 0;
    if (!n) return null;
    return this.pickerParts[this.pickerIndex % n];
  }

  selectSlot(slot) {
    this.selectedSlot = slot;
    this.pickerIndex = 0;
    this.refresh();
  }

  cycleSlot(dir) {
    const i = SLOT_ORDER.indexOf(this.selectedSlot);
    this.selectSlot(SLOT_ORDER[(i + dir + SLOT_ORDER.length) % SLOT_ORDER.length]);
    sfx.click();
  }

  cyclePart(dir) {
    if (!this.pickerParts?.length) return;
    this.pickerIndex = (this.pickerIndex + dir + this.pickerParts.length) % this.pickerParts.length;
    this.refresh();
    sfx.click();
  }

  installSelected() {
    const part = this.highlightedPart();
    if (part) this.install(part);
  }

  pickerClick(index) {
    const part = this.pickerParts?.[index];
    if (!part) return;
    this.pickerIndex = index;
    this.install(part);
  }

  install(part) {
    const gate = canInstall(this.design, part, partById, getState().unlocked.parts);
    if (!gate.ok) {
      this.toast(gate.reason ?? 'Not yet.');
      sfx.error();
      return;
    }
    this.design = installPart(this.design, part);
    setDesign(this.design);
    save();
    sfx.confirm();
    const name = part.kid?.name ?? part.name;
    this.toast(isInstalled(this.design, part.id) ? `${name.toUpperCase()} IS ON!` : `${name.toUpperCase()} IS OFF.`);
    this.refresh();
  }

  openBook() {
    this.scene.start('partsbook', { from: 'design', partId: this.highlightedPart()?.id });
  }

  tryLaunch() {
    const gate = launchGating(this.design, this.stats());
    if (!gate.canLaunch) {
      this.toast(gate.blockers[0].text);
      sfx.error();
      return;
    }
    setDesign(this.design);
    save();
    this.scene.start('launch');
  }
}

function isInstalled(design, partId) {
  const s = design.slots;
  return s.bus === partId || s.power_panel === partId || s.power_battery === partId || s.comms === partId || s.extra === partId || s.payload.includes(partId);
}
