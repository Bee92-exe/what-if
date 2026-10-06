import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE } from '../config.js';
import { wrapText } from './textMetrics.js';

export class ScrollBox extends Phaser.GameObjects.Container {
  constructor(scene, x, y, w, h, opts = {}) {
    super(scene, x, y);
    scene.add.existing(this);

    this.w = w;
    this.h = h;
    this.pad = opts.pad ?? 8;
    this.fontSize = opts.fontSize ?? FONT_SIZE.md;
    this.lineSpacing = opts.lineSpacing ?? 4;
    this.chrome = opts.chrome !== false;
    this.stepLines = opts.stepLines ?? 3;
    this.scrollY = 0;
    this.maxScroll = 0;
    this._items = [];

    const bg = scene.add.rectangle(0, 0, w, h, opts.fill ?? COLOR.spaceBlack, 1).setOrigin(0, 0);
    if (opts.border !== false) bg.setStrokeStyle(1, COLOR.metal);
    this.back = bg;
    this.add(bg);

    this.top = this.pad;
    if (opts.title) {
      const bar = scene.add.rectangle(0, 0, w, 20, COLOR.navy, 1).setOrigin(0, 0);
      const label = scene.add
        .text(this.pad, 5, opts.title, { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.sm}px`, color: CSS.accent })
        .setOrigin(0, 0);
      this.titleText = label;
      this.add([bar, label]);
      this.top = 24;
    }

    this.gutter = this.chrome ? 22 : 0;
    this.innerW = w - this.pad * 2 - this.gutter;
    this.innerH = h - this.top - this.pad;

    this.content = scene.add.container(this.pad, this.top);
    this.add(this.content);

    this.textObj = scene.add
      .text(0, 0, '', {
        fontFamily: FONT_MAIN,
        fontSize: `${this.fontSize}px`,
        color: opts.color ?? CSS.text,
        lineSpacing: this.lineSpacing,
        align: opts.align ?? 'left',
      })
      .setOrigin(0, 0);
    if (opts.align === 'center') this.textObj.setX(this.innerW / 2).setOrigin(0.5, 0);
    this.content.add(this.textObj);

    this.maskShape = scene.make.graphics({ x: 0, y: 0 }, false);
    this.content.setMask(this.maskShape.createGeometryMask());
    this.updateMask();

    if (this.chrome) this.buildChrome(scene);
    this.bindInput(scene);
  }

  buildChrome(scene) {
    const cx = this.w - this.pad - 10;
    this.upBtn = this.makeArrow(scene, cx, this.top + 12, true);
    this.downBtn = this.makeArrow(scene, cx, this.h - this.pad - 12, false);
    this.add([this.upBtn, this.downBtn]);

    this.trackTop = this.top + 28;
    this.trackH = this.h - this.top - 28 - this.pad - 28;
    this.track = scene.add.rectangle(cx, this.trackTop, 4, this.trackH, COLOR.navy, 1).setOrigin(0.5, 0);
    this.thumb = scene.add.rectangle(cx, this.trackTop, 4, 12, COLOR.gold, 1).setOrigin(0.5, 0);
    this.add([this.track, this.thumb]);
    this.setChromeVisible(false);
  }

  makeArrow(scene, x, y, up) {
    const c = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, 20, 20, COLOR.navy, 1).setStrokeStyle(1, COLOR.metal).setOrigin(0.5);
    const tri = up
      ? scene.add.triangle(0, 1, 0, -5, -6, 3, 6, 3, COLOR.gold)
      : scene.add.triangle(0, -1, 0, 5, -6, -3, 6, -3, COLOR.gold);
    c.add([bg, tri]);
    c.setSize(24, 24).setInteractive({ useHandCursor: true });
    c.on('pointerover', () => bg.setFillStyle(COLOR.blue));
    c.on('pointerout', () => bg.setFillStyle(COLOR.navy));
    c.on('pointerdown', () => {
      bg.setFillStyle(COLOR.spaceBlack);
      this.scrollBy((up ? -1 : 1) * this.stepPx());
      this.onUserScroll?.();
    });
    c.on('pointerup', () => bg.setFillStyle(COLOR.navy));
    return c;
  }

  stepPx() {
    return Math.max(this.fontSize, this.stepLines * (this.fontSize + this.lineSpacing));
  }

  setChromeVisible(on) {
    if (!this.chrome) return;
    this.upBtn.setVisible(on);
    this.downBtn.setVisible(on);
    this.track.setVisible(on);
    this.thumb.setVisible(on);
  }

  bindInput(scene) {
    this._wheel = (pointer, objs, dx, dy) => {
      if (!this.maxScroll) return;
      if (!this.containsPoint(pointer.worldX, pointer.worldY)) return;
      this.scrollBy(dy > 0 ? this.stepPx() : -this.stepPx());
      this.onUserScroll?.();
    };
    this._down = (pointer) => {
      if (this.containsPoint(pointer.worldX, pointer.worldY)) this._dragging = false;
      if (!this.containsPoint(pointer.worldX, pointer.worldY)) return;
      this._dragFrom = pointer.worldY;
    };
    this._move = (pointer) => {
      if (this._dragFrom === null || this._dragFrom === undefined || !pointer.isDown) return;
      const dy = this._dragFrom - pointer.worldY;
      if (Math.abs(dy) > 4) this._dragging = true;
      this.scrollBy(dy);
      this._dragFrom = pointer.worldY;
    };
    this._up = () => {
      this._dragFrom = null;
    };
    scene.input.on('wheel', this._wheel);
    scene.input.on('pointerdown', this._down);
    scene.input.on('pointermove', this._move);
    scene.input.on('pointerup', this._up);
    this._keys = {
      up: () => this.scrollBy(-this.stepPx()),
      down: () => this.scrollBy(this.stepPx()),
      pageUp: () => this.scrollBy(-this.pagePx()),
      pageDown: () => this.scrollBy(this.pagePx()),
    };
    scene.input.keyboard.on('keydown-UP', this._keys.up);
    scene.input.keyboard.on('keydown-DOWN', this._keys.down);
    scene.input.keyboard.on('keydown-PAGE_UP', this._keys.pageUp);
    scene.input.keyboard.on('keydown-PAGE_DOWN', this._keys.pageDown);
    this._cleanup = () => this.unbindInput();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this._cleanup);
  }

  unbindInput() {
    const scene = this.scene;
    if (!scene?.input) return;
    scene.input.off('wheel', this._wheel);
    scene.input.off('pointerdown', this._down);
    scene.input.off('pointermove', this._move);
    scene.input.off('pointerup', this._up);
    if (scene.input.keyboard) {
      scene.input.keyboard.off('keydown-UP', this._keys?.up);
      scene.input.keyboard.off('keydown-DOWN', this._keys?.down);
      scene.input.keyboard.off('keydown-PAGE_UP', this._keys?.pageUp);
      scene.input.keyboard.off('keydown-PAGE_DOWN', this._keys?.pageDown);
    }
  }

  worldPos() {
    return this.getWorldTransformMatrix().transformPoint(0, 0);
  }

  updateMask() {
    if (!this.maskShape) return;
    const { x, y } = this.worldPos();
    this.maskShape.clear();
    this.maskShape.fillStyle(0xffffff, 1).fillRect(x + this.pad, y + this.top, this.innerW, this.innerH);
  }

  containsPoint(px, py) {
    const { x, y } = this.worldPos();
    return px >= x && px <= x + this.w && py >= y && py <= y + this.h;
  }

  get dragging() {
    return !!this._dragging;
  }

  pagePx() {
    return Math.max(this.fontSize, this.innerH - this.fontSize);
  }

  get progress() {
    return this.maxScroll ? this.scrollY / this.maxScroll : 0;
  }

  setText(str, opts = {}) {
    this.raw = str;
    this.textObj.setText(wrapText(str, this.innerW, this.fontSize));
    if (this.textObj.originX === 0.5) this.textObj.setX(this.innerW / 2);
    this.refresh();
    if (opts.toBottom) this.scrollToBottom();
    else if (!opts.keepScroll) this.scrollTo(0);
    else this.scrollTo(this.scrollY);
    return this;
  }

  setItems(items) {
    this._items = items.filter(Boolean);
    return this;
  }

  setContentHeightExtra(px) {
    this._extraH = Math.max(0, px || 0);
    return this;
  }

  refreshItemInput() {
    const { y } = this.worldPos();
    for (const item of this._items) {
      if (!item.input) continue;
      const worldY = y + this.top + item.y - this.scrollY;
      const inside = worldY + item.height > y + this.top && worldY < y + this.top + this.innerH;
      item.input.enabled = inside;
    }
  }

  refresh() {
    this.updateMask();
    const contentH = Math.max(this.textObj.height, this._extraH ?? 0);
    this.contentHeight = contentH;
    this.maxScroll = Math.max(0, contentH - this.innerH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScroll);
    this.content.setY(this.top - this.scrollY);
    const overflow = this.maxScroll > 0;
    this.setChromeVisible(overflow);
    if (overflow) {
      const frac = Math.min(1, this.innerH / contentH);
      const thumbH = Math.max(14, Math.round(this.trackH * frac));
      this.thumb.setSize(4, thumbH);
      this.thumb.setY(this.trackTop + Math.round((this.trackH - thumbH) * this.progress));
      this.upBtn.setAlpha(this.scrollY > 0 ? 1 : 0.4);
      this.downBtn.setAlpha(this.scrollY < this.maxScroll ? 1 : 0.4);
    }
    this.refreshItemInput();
    return this;
  }

  scrollTo(px) {
    this.scrollY = Phaser.Math.Clamp(px, 0, this.maxScroll);
    this.content.setY(this.top - this.scrollY);
    if (this.maxScroll > 0) {
      const frac = Math.min(1, this.innerH / this.contentHeight);
      const thumbH = Math.max(14, Math.round(this.trackH * frac));
      this.thumb.setY(this.trackTop + Math.round((this.trackH - thumbH) * (this.scrollY / this.maxScroll)));
      this.upBtn.setAlpha(this.scrollY > 0 ? 1 : 0.4);
      this.downBtn.setAlpha(this.scrollY < this.maxScroll ? 1 : 0.4);
    }
    this.refreshItemInput();
    return this;
  }

  scrollBy(px) {
    return this.scrollTo(this.scrollY + px);
  }

  scrollToBottom() {
    return this.scrollTo(this.maxScroll);
  }

  overflowHint() {
    if (!this.maxScroll) return '';
    if (this.scrollY <= 0) return 'MORE BELOW';
    if (this.scrollY >= this.maxScroll) return 'MORE ABOVE';
    return 'MORE ABOVE AND BELOW';
  }

  destroy(fromScene) {
    this.unbindInput();
    this.scene?.events?.off(Phaser.Scenes.Events.SHUTDOWN, this._cleanup);
    this.maskShape?.destroy();
    super.destroy(fromScene);
  }
}
