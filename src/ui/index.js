import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT, statusColor } from '../config.js';
import { ellipsize, wrapText } from './textMetrics.js';


export class Panel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, title) {
    super(scene, x, y);
    scene.add.existing(this);

    this.w = w;
    this.h = h;
    this.back = scene.add.rectangle(0, 0, w, h, COLOR.navy, 1).setStrokeStyle(1, COLOR.metal);
    this.add(this.back);

    if (title) {
      this.titleBar = scene.add.rectangle(0, -h / 2 + 12, w, 22, COLOR.spaceBlack, 1);
      this.titleText = scene.add
        .text(-w / 2 + 8, -h / 2 + 5, ellipsize(title, w - 16, FONT_SIZE.sm), {
          fontFamily: FONT_MAIN,
          fontSize: `${FONT_SIZE.sm}px`,
          color: CSS.accent,
        })
        .setOrigin(0, 0);
      this.add([this.titleBar, this.titleText]);
    }
  }

  get innerLeft() {
    return this.x - this.w / 2 + 8;
  }

  get innerRight() {
    return this.x + this.w / 2 - 8;
  }

  get innerWidth() {
    return this.w - 16;
  }
}

export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, label, onClick, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    const fill = opts.fill ?? (opts.accent ? COLOR.teal : COLOR.blue);
    const font = opts.font ?? (opts.accent ? FONT_SIZE.md : FONT_SIZE.sm);
    this.font = font;
    this.bg = scene.add.rectangle(0, 0, w, h, fill).setStrokeStyle(1, COLOR.metal);
    this.label = scene.add
      .text(0, 0, ellipsize(label, w - 12, font), {
        fontFamily: FONT_MAIN,
        fontSize: `${font}px`,
        color: opts.textColor ?? CSS.text,
      })
      .setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });

    this.on('pointerover', () => this.bg.setFillStyle(opts.accent ? COLOR.green : COLOR.spaceBlack));
    this.on('pointerout', () => this.bg.setFillStyle(fill));
    this.on('pointerdown', () => this.bg.setFillStyle(COLOR.spaceBlack));
    this.on('pointerup', () => {
      this.bg.setFillStyle(opts.accent ? COLOR.green : COLOR.spaceBlack);
      if (!this.blocked) onClick?.();
    });

    this.focusRing = scene.add.rectangle(0, 0, w + 4, h + 4).setStrokeStyle(1, COLOR.gold);
    this.focusRing.setVisible(false);
    this.addAt(this.focusRing, 0);

    this.blocked = false;
  }

  setLabel(text) {
    this.label.setText(ellipsize(text, this.width - 12, this.font));
    return this;
  }

  setFocused(on) {
    this.focusRing.setVisible(on);
    return this;
  }
}

export class ButtonGroup {
  constructor(scene) {
    this.scene = scene;
    this.buttons = [];
    this.index = 0;
    scene.input.keyboard.on('keydown-TAB', (e) => {
      e.preventDefault?.();
      this.move(e.shiftKey ? -1 : 1);
    });
    scene.input.keyboard.on('keydown-DOWN', () => this.move(1));
    scene.input.keyboard.on('keydown-UP', () => this.move(-1));
    scene.input.keyboard.on('keydown-ENTER', () => this.activate());
  }

  add(button) {
    this.buttons.push(button);
    this.refresh();
    return this;
  }

  move(dir) {
    if (!this.buttons.length) return;
    this.index = (this.index + dir + this.buttons.length) % this.buttons.length;
    this.refresh();
  }

  activate() {
    const b = this.buttons[this.index];
    if (b) b.emit('pointerup');
  }

  refresh() {
    this.buttons.forEach((b, i) => b.setFocused(i === this.index));
  }
}

export class Bar extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, label, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    this.w = w;
    const font = opts.font ?? FONT_SIZE.sm;
    const barX = opts.labelWidth ?? 0;
    this.barX = barX;
    this.labelText = scene.add
      .text(0, 0, ellipsize(label, barX || w, font), { fontFamily: FONT_MAIN, fontSize: `${font}px`, color: opts.labelColor ?? CSS.dim })
      .setOrigin(0, 0);
    this.bg = scene.add
      .rectangle(barX, 22, w, 10, COLOR.spaceBlack)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, COLOR.metal);
    this.fill = scene.add.rectangle(barX + 1, 22, 0, 8, COLOR.teal).setOrigin(0, 0.5);
    const rightAlign = opts.valueAlign === 'right';
    this.valueText =
      opts.showValue === false
        ? null
        : scene.add
            .text(rightAlign ? (opts.valueX ?? barX + w + 100) : barX + w + 8, 22, '', {
              fontFamily: FONT_MAIN,
              fontSize: `${font}px`,
              color: opts.valueColor ?? CSS.text,
            })
            .setOrigin(rightAlign ? 1 : 0, 0.5);

    this.add([this.labelText, this.bg, this.fill]);
    if (this.valueText) this.add(this.valueText);

    this.font = font;
    this.dangerAt = opts.dangerAt;
    this.warnAt = opts.warnAt;
    this.valueWidth = opts.valueWidth ?? 0;
    this.valueRightAlign = rightAlign;
    if (opts.safeFrom !== undefined) {
      const x0 = barX + Math.round(opts.safeFrom * w);
      const x1 = barX + Math.round((opts.safeTo ?? 1) * w);
      for (const tx of [x0, x1 - 2]) {
        this.add(scene.add.rectangle(tx, 22, 2, 10, COLOR.green, 1).setOrigin(0, 0.5));
      }
    }
  }

  setValue(fraction, text) {
    const f = Phaser.Math.Clamp(Number.isFinite(fraction) ? fraction : 0, 0, 1);
    this.fill.setSize(Math.max(0, (this.w - 2) * f), 8);
    this.fill.setFillStyle(
      statusColor(f, { warnAt: this.warnAt ?? 0.8, dangerAt: this.dangerAt ?? 0.95 })
    );
    if (this.valueText) {
      const t = text ?? `${Math.round(f * 100)}%`;
      this.valueText.setText(this.valueWidth ? ellipsize(t, this.valueWidth, this.font) : t);
    }
    return this;
  }

  setValueColor(color) {
    this.valueText?.setColor(color);
    return this;
  }
}

export class Tooltip {
  constructor(scene) {
    this.scene = scene;
    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${FONT_SIZE.sm}px`,
        color: CSS.text,
        backgroundColor: '#0d0b1e',
        padding: { x: 6, y: 4 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0)
      .setDepth(1000)
      .setVisible(false);
  }

  showFor(gameObject, message, wrapWidth = 280) {
    gameObject.on('pointerover', () => {
      this.text.setText(wrapText(message, wrapWidth, FONT_SIZE.sm)).setVisible(true);
      this.position(gameObject.x, gameObject.y);
    });
    gameObject.on('pointerout', () => this.text.setVisible(false));
    gameObject.on('pointermove', () => this.position(gameObject.x, gameObject.y));
  }

  position(x, y) {
    const t = this.text;
    const w = t.width + 12;
    t.setPosition(
      Phaser.Math.Clamp(x + 8, 2, GAME_WIDTH - w - 2),
      Phaser.Math.Clamp(y + 10, 2, GAME_HEIGHT - t.height - 4)
    );
  }

  hide() {
    this.text.setVisible(false);
  }
}

export { ScrollBox } from './ScrollBox.js';
export { PartCard } from './PartCard.js';
export * from './textMetrics.js';
export { factsFor, headlineFact, factLine } from './partFacts.js';
