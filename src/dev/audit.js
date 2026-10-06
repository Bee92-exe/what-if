import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { load, getState, save, newGame } from '../state/gameState.js';

export function installAudit(game) {
  const collectTexts = (scene) => {
    const out = [];
    const walk = (obj) => {
      if (obj.type === 'Text' && obj.text !== '') out.push(obj);
      if (obj.list) obj.list.forEach(walk);
    };
    scene.children.list.forEach(walk);
    return out;
  };

  const paintOrder = (scene) => {
    const out = [];
    let order = 0;
    const walk = (obj) => {
      out.push({ obj, order: order++ });
      if (obj.list) obj.list.forEach(walk);
    };
    scene.children.list.forEach(walk);
    return out;
  };

  const box = (b) => [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];

  const labelOf = (obj) => {
    const parent = obj.parentContainer;
    if (!parent?.list) return '';
    const t = parent.list.find((c) => c.type === 'Text' && c.text);
    return t ? String(t.text).replace(/\n/g, ' ').slice(0, 24) : '';
  };

  const isOpaque = (obj) => {
    if (obj.mask) return false;
    if (obj.type === 'Rectangle') return (obj.fillAlpha ?? 1) > 0.9;
    if (obj.type === 'Image' || obj.type === 'Sprite' || obj.type === 'TileSprite') return (obj.alpha ?? 1) > 0.5;
    return false;
  };

  const audit = (key, slack = 2) => {
    const scene = key ? game.scene.getScene(key) : game.scene.getScenes(true)[0];
    if (!scene) return { error: `no scene ${key ?? '(active)'}` };
    const shown = (o) => {
      let cur = o;
      while (cur) {
        if (cur.visible === false) return false;
        cur = cur.parentContainer;
      }
      return true;
    };
    const isMasked = (o) => {
      let cur = o;
      while (cur) {
        if (cur.mask) return true;
        cur = cur.parentContainer;
      }
      return false;
    };
    const boxes = collectTexts(scene).map((t) => {
      const b = t.getBounds();
      return {
        obj: t,
        text: String(t.text).replace(/\n/g, ' / ').slice(0, 34),
        x: Math.round(b.x),
        y: Math.round(b.y),
        right: Math.round(b.x + b.width),
        bottom: Math.round(b.y + b.height),
        onScreen: shown(t) && t.alpha > 0.05,
        masked: isMasked(t),
        followsCanvas:
          isMasked(t) ||
          (b.x >= -1 && b.y >= -1 && b.x + b.width <= GAME_WIDTH + 1 && b.y + b.height <= GAME_HEIGHT + 1),
      };
    });
    const visible = boxes.filter((b) => b.onScreen && !b.masked);
    const overlaps = [];
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i];
        const c = visible[j];
        const ox = Math.min(a.right, c.right) - Math.max(a.x, c.x);
        const oy = Math.min(a.bottom, c.bottom) - Math.max(a.y, c.y);
        if (ox > slack && oy > slack) overlaps.push({ a: a.text, b: c.text, ox, oy });
      }
    }
    const order = new Map();
    for (const { obj, order: o } of paintOrder(scene)) order.set(obj, o);
    const solids = [];
    for (const { obj } of paintOrder(scene)) {
      if (!isOpaque(obj) || !shown(obj)) continue;
      const b = obj.getBounds?.();
      if (!b || b.width < 6 || b.height < 6) continue;
      solids.push({ obj, x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height, box: box(b), label: labelOf(obj) });
    }
    const covered = [];
    for (const t of boxes) {
      if (!t.onScreen) continue;
      const textObj = t.obj;
      if (!textObj) continue;
      const tOrder = order.get(textObj) ?? -1;
      for (const s of solids) {
        if ((order.get(s.obj) ?? -2) < tOrder) continue;
        if (s.obj === textObj || isMasked(textObj)) continue;
        const ox = Math.min(t.right, s.right) - Math.max(t.x, s.x);
        const oy = Math.min(t.bottom, s.bottom) - Math.max(t.y, s.y);
        if (ox > slack && oy > slack) {
          covered.push({
            text: t.text,
            at: [t.x, t.y, t.right - t.x, t.bottom - t.y],
            by: `${s.obj.type}${s.label ? ` "${s.label}"` : ''}`,
            byBox: s.box,
            ox,
            oy,
          });
          break;
        }
      }
    }
    return {
      scene: scene.scene.key,
      texts: boxes.length,
      offCanvas: boxes.filter((b) => !b.followsCanvas),
      overlaps,
      covered,
    };
  };

  const scrolls = (key) => {
    const scene = key ? game.scene.getScene(key) : game.scene.getScenes(true)[0];
    if (!scene) return { error: `no scene ${key ?? '(active)'}` };
    const found = [];
    const walk = (obj) => {
      if (obj.constructor?.name === 'ScrollBox') {
        found.push({
          x: Math.round(obj.x),
          y: Math.round(obj.y),
          w: obj.w,
          h: obj.h,
          innerH: Math.round(obj.innerH),
          contentH: Math.round(obj.contentHeight ?? 0),
          maxScroll: Math.round(obj.maxScroll ?? 0),
          overflow: (obj.maxScroll ?? 0) > 0,
          arrows: obj.upBtn ? obj.upBtn.visible : null,
          masked: !!obj.content?.mask,
          lines: String(obj.raw ?? '').split('\n').length,
        });
      }
      if (obj.list) obj.list.forEach(walk);
    };
    scene.children.list.forEach(walk);
    return { scene: scene.scene.key, boxes: found, broken: found.filter((b) => b.overflow && b.arrows !== true).length, unmasked: found.filter((b) => !b.masked).length };
  };

  window.md = window.md || {};
  window.md.audit = audit;
  window.md.scrolls = scrolls;
  window.md.state = { get: getState, load, save, newGame };
  window.md.loadSave = () => {
    const ok = load();
    return { loaded: ok, chapter: getState().chapter, hasDesign: !!getState().design, hasMission: !!getState().mission };
  };
  window.md.auditAll = (keys) => {
    const list = keys ?? Object.keys(game.scene.keys ?? {});
    const report = {};
    for (const k of list) {
      if (game.scene.isActive(k)) report[k] = audit(k);
    }
    return report;
  };
  return audit;
}
