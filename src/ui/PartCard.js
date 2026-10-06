import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE } from '../config.js';
import { partIconKey } from '../art/sprites/partIcons.js';
import { ellipsize, wrapText } from './textMetrics.js';
import { factsFor } from './partFacts.js';
import { getState } from '../state/gameState.js';

export class PartCard extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    this.cardW = w;
    this.cardH = h;
    this.pad = 10;
    this.iconScale = opts.scale ?? 2;
    this.top = opts.title ? 24 : this.pad;

    this.add(scene.add.rectangle(0, 0, w, h, COLOR.navy, 1).setOrigin(0, 0).setStrokeStyle(1, COLOR.metal));
    if (opts.title) {
      this.add(scene.add.rectangle(0, 0, w, 20, COLOR.spaceBlack, 1).setOrigin(0, 0));
      this.add(
        scene.add
          .text(this.pad, 5, ellipsize(opts.title, w - 20, FONT_SIZE.sm), {
            fontFamily: FONT_MAIN,
            fontSize: `${FONT_SIZE.sm}px`,
            color: CSS.accent,
          })
          .setOrigin(0, 0)
      );
    }

    const demoY = this.top + this.pad;
    this.demoSize = Math.max(48, Math.min(opts.demoW ?? 96, h - demoY - this.pad));
    this.demoCx = this.pad + this.demoSize / 2;
    this.demoCy = demoY + this.demoSize / 2;
    const textX = this.pad + this.demoSize + 14;
    this.textW = Math.max(40, w - textX - this.pad);

    if (this.demoSize < this.iconScale * 24) this.iconScale = Math.max(1, Math.floor(this.demoSize / 24));

    this.add(
      scene.add
        .rectangle(this.pad, demoY, this.demoSize, this.demoSize, COLOR.spaceBlack, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, COLOR.metal)
    );
    this.icon = scene.add.image(this.demoCx, this.demoCy, 'part_bus6u').setScale(this.iconScale);
    this.add(this.icon);

    this.nameText = scene.add
      .text(textX, demoY - 2, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.lg}px`,
        color: CSS.gold,
        wordWrap: { width: this.textW },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    this.isText = scene.add
      .text(textX, 0, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.text,
        wordWrap: { width: this.textW },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    this.doesText = scene.add
      .text(textX, 0, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.md}px`,
        color: CSS.accent,
        wordWrap: { width: this.textW },
        lineSpacing: 4,
      })
      .setOrigin(0, 0);
    this.add([this.nameText, this.isText, this.doesText]);
    this.textX = textX;
    this.demoY = demoY;

    this.chipGap = 6;
    this.chips = [];
    for (let i = 0; i < 4; i++) {
      const chip = this.makeChip(0, 0, 10, 10);
      this.chips.push(chip);
      this.add(chip.root);
    }

    this.demoFx = scene.add.container(0, 0);
    this.add(this.demoFx);
    this.clear();
  }

  makeChip(x, y, w, h) {
    const scene = this.scene;
    const root = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, w, h, COLOR.spaceBlack, 1).setOrigin(0, 0).setStrokeStyle(1, COLOR.metal);
    const label = scene.add
      .text(6, 4, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0, 0);
    const value = scene.add
      .text(6, 0, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.text })
      .setOrigin(0, 0);
    root.add([bg, label, value]);
    return { root, bg, label, value, w, h };
  }

  layout() {
    const gridTop = this.doesText.y + this.doesText.height + 8;
    const avail = this.cardH - this.pad - gridTop - this.chipGap;
    const chipH = Math.max(22, Math.floor(avail / 2));
    const chipW = Math.floor((this.textW - this.chipGap) / 2);
    this.chips.forEach((chip, i) => {
      const x = this.textX + (i % 2) * (chipW + this.chipGap);
      const y = gridTop + Math.floor(i / 2) * (chipH + this.chipGap);
      chip.root.setPosition(x, y);
      chip.bg.setSize(chipW, chipH);
      chip.label.setY(4);
      chip.value.setY(chipH / 2 + 1);
      chip.w = chipW;
      chip.h = chipH;
    });
  }

  clear() {
    this.stopDemo();
    this.current = null;
    this.icon.setVisible(false);
    this.nameText.setText('');
    this.isText.setText('');
    this.doesText.setText('');
    for (const c of this.chips) {
      c.label.setText('');
      c.value.setText('');
      c.root.setVisible(false);
    }
    return this;
  }

  show(part) {
    if (!part) return this.clear();
    this.current = part;
    const kid = part.kid ?? {};
    this.icon.setTexture(partIconKey(part)).setVisible(true).setScale(this.iconScale);
    this.nameText.setText(wrapText(kid.name ?? part.name, this.textW, FONT_SIZE.lg));
    this.nameText.setPosition(this.textX, this.demoY - 2);
    this.isText.setText(wrapText(kid.is ?? part.blurb ?? '', this.textW, FONT_SIZE.sm));
    this.isText.setPosition(this.textX, this.nameText.y + this.nameText.height + 8);
    this.doesText.setText(wrapText(kid.does ?? '', this.textW, FONT_SIZE.md));
    this.doesText.setPosition(this.textX, this.isText.y + this.isText.height + 8);
    this.layout();

    const facts = factsFor(part).slice(0, this.chips.length);
    this.chips.forEach((chip, i) => {
      const fact = facts[i];
      if (!fact) {
        chip.root.setVisible(false);
        return;
      }
      chip.root.setVisible(true);
      chip.label.setText(ellipsize(fact.label, chip.w - 12, FONT_SIZE.xs));
      chip.value.setText(ellipsize(fact.value, chip.w - 12, FONT_SIZE.sm));
      chip.value.setColor(fact.flag === 'good' ? CSS.accent : fact.flag === 'bad' ? CSS.danger : CSS.text);
    });
    this.startDemo(part);
    return this;
  }


  startDemo(part) {
    this.stopDemo();
    if (getState().settings?.reducedMotion) return;
    const s = this.scene;
    const cx = this.demoCx;
    const cy = this.demoCy;
    const half = this.demoSize / 2;
    const tweens = [];
    const add = (obj) => this.demoFx.add(obj);
    const rect = (x, y, w, h, color) => add(s.add.rectangle(x, y, w, h, color, 1).setOrigin(0.5));

    switch (part.slot) {
      case 'bus': {
        tweens.push(s.tweens.add({ targets: this.icon, y: cy - 2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        break;
      }
      case 'power_panel': {
        if (part.needsDeployment) {
          tweens.push(
            s.tweens.add({
              targets: this.icon,
              scaleX: { from: this.iconScale * 0.3, to: this.iconScale },
              duration: 750,
              hold: 750,
              yoyo: true,
              repeat: -1,
            })
          );
        } else {
          tweens.push(s.tweens.add({ targets: this.icon, y: cy - 2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
        }
        const sun = rect(cx - half + 10, cy - half + 10, 8, 8, COLOR.gold);
        tweens.push(s.tweens.add({ targets: sun, alpha: { from: 1, to: 0.25 }, duration: 800, yoyo: true, repeat: -1 }));
        break;
      }
      case 'power_battery': {
        for (let i = 0; i < 3; i++) {
          const bar = rect(cx - half + 18 + i * 12, cy + half - 18, 9, 12, COLOR.gold);
          bar.setAlpha(0.15);
          tweens.push(
            s.tweens.add({ targets: bar, alpha: 1, duration: 260, delay: i * 350, yoyo: true, hold: 350, repeat: -1, repeatDelay: 450 })
          );
        }
        break;
      }
      case 'comms': {
        const count = part.downlinkMbps >= 1 ? 3 : 1;
        for (let i = 0; i < count; i++) {
          const wave = rect(cx + 14, cy, 10, 8, COLOR.teal);
          wave.setAlpha(0);
          tweens.push(
            s.tweens.add({
              targets: wave,
              x: cx + 14 + i * 16,
              alpha: { from: 1, to: 0 },
              duration: 750,
              delay: i * 220,
              repeat: -1,
              repeatDelay: 350,
            })
          );
        }
        break;
      }
      case 'payload': {
        if (part.capabilities?.sees_through_clouds) {
          for (let i = 0; i < 2; i++) {
            const cloud = rect(cx - half + 14 + i * 6, cy - 18 + i * 6, 20 + i * 8, 8, COLOR.white);
            tweens.push(
              s.tweens.add({ targets: cloud, x: cloud.x + this.demoSize - 34, duration: 2400, delay: i * 300, repeat: -1, repeatDelay: 250 })
            );
          }
          const wave = rect(cx + 14, cy + 20, 10, 6, COLOR.teal);
          tweens.push(s.tweens.add({ targets: wave, x: cx + 30, alpha: { from: 1, to: 0 }, duration: 900, repeat: -1 }));
        } else {
          const flash = rect(cx, cy, 18, 18, COLOR.white);
          flash.setAlpha(0);
          tweens.push(s.tweens.add({ targets: flash, alpha: { from: 0, to: 1 }, duration: 130, yoyo: true, hold: 70, repeat: -1, repeatDelay: 1100 }));
          const photo = rect(cx + 20, cy + 16, 12, 9, COLOR.ice);
          photo.setAlpha(0);
          tweens.push(s.tweens.add({ targets: photo, y: cy - 14, alpha: { from: 1, to: 0 }, duration: 1200, repeat: -1, repeatDelay: 400 }));
          if (part.capabilities?.works_at_night) {
            for (let i = 0; i < 3; i++) {
              const warm = rect(cx + 18 + i * 10, cy + 14, 6, 10, COLOR.orange);
              warm.setAlpha(0.35);
              tweens.push(
                s.tweens.add({
                  targets: warm,
                  y: cy - half + 10,
                  alpha: { from: 0.6, to: 0 },
                  duration: 1100,
                  delay: i * 260,
                  repeat: -1,
                  repeatDelay: 180,
                })
              );
            }
          }
        }
        break;
      }
      default: {
        if (part.pointingEfficiency) {
          const starH = rect(cx - half + 16, cy - half + 16, 18, 4, COLOR.gold);
          const starV = rect(cx - half + 23, cy - half + 9, 4, 18, COLOR.gold);
          for (const st of [starH, starV]) {
            tweens.push(s.tweens.add({ targets: st, alpha: { from: 1, to: 0.2 }, duration: 600, yoyo: true, repeat: -1 }));
          }
        } else if (part.radiationProtection) {
          for (let i = 0; i < 3; i++) {
            const ray = rect(cx - 16 + i * 16, cy - half + 14, 6, 14, COLOR.orange);
            tweens.push(s.tweens.add({ targets: ray, y: ray.y + 12, alpha: { from: 1, to: 0.3 }, duration: 520, delay: i * 120, yoyo: true, repeat: -1 }));
          }
        } else {
          for (let i = 0; i < 3; i++) {
            const puff = rect(cx, cy + 14, 12, 9, i === 0 ? COLOR.gold : COLOR.orange);
            puff.setAlpha(0);
            tweens.push(s.tweens.add({ targets: puff, y: cy + 34 + i * 6, alpha: { from: 1, to: 0 }, duration: 700, delay: i * 220, repeat: -1 }));
          }
        }
        break;
      }
    }
    this.demoTweens = tweens;
  }

  stopDemo() {
    this.demoTweens?.forEach((t) => t.remove());
    this.demoTweens = [];
    this.demoFx?.removeAll(true);
    this.icon?.setScale(this.iconScale);
  }

  destroy(fromScene) {
    this.stopDemo();
    super.destroy(fromScene);
  }
}
