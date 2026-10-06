import Phaser from 'phaser';
import { COLOR, CSS, FONT_MAIN, FONT_SIZE, GAME_WIDTH, GAME_HEIGHT, typeDelay } from '../config.js';
import { buildSpeakerStage } from '../ui/speakerStage.js';
import { wrapText } from '../ui/textMetrics.js';
import { createSession, next as dlgNext, currentChoices, start as dlgStart } from '../story/dialogue.js';
import { getState, setFlag, setFlags, save } from '../state/gameState.js';
import { fillTokens } from '../utils/player.js';
import { drawReportRoom, drawBottomBar } from '../art/scenery.js';
import { SPEAKER_NAME, introFor } from './storyCast.js';
import ch0 from '../data/dialogue/ch0.json' with { type: 'json' };
import ch2 from '../data/dialogue/ch2.json' with { type: 'json' };

const CHAPTER_DIALOGUE = { ch0: ch0.nodes, ch2: ch2.nodes };
const CHAPTER_NEXT = { ch0: 'briefingroom', ch2: 'briefingroom' };

export default class StoryScene extends Phaser.Scene {
  constructor() {
    super('story');
  }

  init() {
    this.session = null;
    this.typewriter = null;
    this.choiceItems = [];
    this.autoFollow = true;
    this.queue = [];
  }

  create() {
    const chapterId = `ch${getState().chapter}`;
    const nodes = CHAPTER_DIALOGUE[chapterId];
    if (!nodes) {
      this.scene.start(CHAPTER_NEXT[chapterId] ?? 'title');
      return;
    }

    drawReportRoom(this);
    drawBottomBar(this);

    this.stage = buildSpeakerStage(this);

    this.hintText = this.add
      .text(GAME_WIDTH - 12, GAME_HEIGHT - 6, '', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(1, 1);
    this.add
      .text(12, GAME_HEIGHT - 6, 'S = skip the story', { fontFamily: FONT_MAIN, fontSize: `${FONT_SIZE.xs}px`, color: CSS.dim })
      .setOrigin(0, 1);

    this.bindInput();

    this.session = createSession(nodes, getState().flags);
    const first = this.show(dlgStart(this.session));
    if (!first) this.finishNow();
  }

  bindInput() {
    this.dragStart = null;
    this.dragMoved = false;
    this.justPickedAt = 0;
    this.input.on('pointerdown', (pointer) => {
      this.dragStart = { x: pointer.worldX, y: pointer.worldY };
      this.dragMoved = false;
    });
    this.input.on('pointermove', (pointer) => {
      if (!this.dragStart || !pointer.isDown) return;
      const dx = Math.abs(pointer.worldX - this.dragStart.x);
      const dy = Math.abs(pointer.worldY - this.dragStart.y);
      if (dx + dy > 12) this.dragMoved = true;
    });
    this.input.on('pointerup', (pointer, currentlyOver) => {
      const wasDrag = this.dragMoved || this.stage.box.dragging;
      this.dragStart = null;
      this.dragMoved = false;
      if (wasDrag) return;
      if (currentlyOver?.length) return;
      this.advance();
    });
    this.input.keyboard.on('keydown-SPACE', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
    this.input.keyboard.on('keydown-S', () => this.finishNow());
  }

  show(node) {
    if (!node) return null;
    const queue = [];
    const intro = introFor(node.speaker, getState().flags);
    if (intro) {
      setFlag(`met_${node.speaker}`, true);
      queue.push(intro);
    }
    this.queue = queue;
    return this.render(this.queue.length ? this.queue.shift() : node);
  }

  render(node) {
    this.currentNode = node;
    const portraitKey = node.portrait
      ? `${node.speaker}_${node.portrait}`
      : node.speaker === 'narrator'
        ? null
        : `${node.speaker}_neutral`;
    this.stage.nameText.setText(SPEAKER_NAME[node.speaker] ?? node.speaker.toUpperCase());
    this.stage.show(node.speaker, portraitKey);

    if (this.typewriter) this.typewriter.remove();
    this.clearChoices();
    this.autoFollow = true;
    this.stage.box.setText('');
    this.hintText.setText('');
    const full = fillTokens(node.text ?? '', getState().player);
    this.shownChars = 0;
    this.fullText = full;
    if (!full) {
      this.onTextDone();
      return node;
    }
    this.typewriter = this.time.addEvent({
      delay: typeDelay(getState().settings),
      repeat: full.length - 1,
      callback: () => {
        this.shownChars += 1;
        this.stage.box.setText(full.slice(0, this.shownChars), { keepScroll: true });
        if (this.autoFollow && this.stage.box.maxScroll > 0) this.stage.box.scrollToBottom();
        this.updateHint();
        if (this.shownChars >= full.length) this.onTextDone();
      },
    });
    return node;
  }

  onTextDone() {
    const node = this.currentNode;
    if (node?.choices?.length) this.renderChoices(node.choices);
    else this.updateHint();
  }

  updateHint() {
    const onChoice = !!this.currentNode?.choices?.length && this.choiceItems.length > 0;
    if (onChoice) this.hintText.setText('TAP A YELLOW LINE');
    else this.hintText.setText(this.stage.box.maxScroll > 0 ? 'TAP TO GO ON  -  ▲▼ FOR MORE' : 'TAP TO GO ON');
  }

  renderChoices(choices) {
    const box = this.stage.box;
    const w = box.innerW - 24;
    let y = box.textObj.height + 10;
    this.choiceItems = choices.map((c, i) => {
      const text = this.add
        .text(0, 0, wrapText(`> ${fillTokens(c.text, getState().player)}`, w - 8, FONT_SIZE.md), {
          fontFamily: FONT_MAIN,
          fontSize: `${FONT_SIZE.md}px`,
          color: CSS.gold,
          lineSpacing: 2,
        })
        .setOrigin(0, 0);
      const h = text.height + 8;
      const zone = this.add
        .rectangle(0, y, w, h, COLOR.gold, 0.001)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => text.setColor(CSS.text));
      zone.on('pointerout', () => text.setColor(CSS.gold));
      zone.on('pointerdown', () => this.pick(i));
      text.setY(y + 4);
      box.content.add(zone);
      box.content.add(text);
      y += h + 6;
      return { text, zone };
    });
    box.setContentHeightExtra(y);
    box.setItems(this.choiceItems.map((row) => row.zone));
    box.refresh();
    if (box.maxScroll > 0) box.scrollToBottom();
    this.updateHint();
  }

  pick(index) {
    this.justPickedAt = this.time.now;
    this.dragMoved = true;
    this.clearChoices();
    const node = dlgNext(this.session, index);
    if (!node) return this.finishNow();
    this.persistFlags();
    this.show(node);
  }

  advance() {
    if (this.time && this.time.now - (this.justPickedAt ?? 0) < 250) return;
    const node = this.currentNode;
    if (!node) return;
    const full = this.fullText ?? '';
    if ((this.shownChars ?? 0) < full.length) {
      if (this.typewriter) this.typewriter.remove();
      this.shownChars = full.length;
      this.stage.box.setText(full);
      this.autoFollow = true;
      this.onTextDone();
      return;
    }
    if (node.choices?.length) return;
    if (this.queue?.length) {
      this.render(this.queue.shift());
      return;
    }
    this.pick(null);
  }

  finishNow() {
    let guard = 0;
    while (this.session && !this.session.finished && guard++ < 500) {
      const choices = currentChoices(this.session);
      const node = choices.length ? dlgNext(this.session, 0) : dlgNext(this.session);
      if (!node) break;
    }
    this.finish();
  }

  finish() {
    this.persistFlags();
    save();
    const chapterId = `ch${getState().chapter}`;
    this.scene.start(CHAPTER_NEXT[chapterId] ?? 'title');
  }

  persistFlags() {
    if (this.session) setFlags(this.session.flags);
  }

  clearChoices() {
    for (const row of this.choiceItems ?? []) {
      row.zone.destroy();
      row.text.destroy();
    }
    this.choiceItems = [];
    this.stage?.box.setItems([]);
    this.stage?.box.setContentHeightExtra(0);
  }
}
