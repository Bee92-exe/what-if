import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, jumpTo, next, currentChoices, whenMatches } from '../src/story/dialogue.js';
import { getState, setFlag, setFlags, save, load, newGame, hasSave, clearSave, subscribe } from '../src/state/gameState.js';
import ch0 from '../src/data/dialogue/ch0.json' with { type: 'json' };

const nodes = [
  { id: 'a', speaker: 'kabir', text: 'One', next: 'b' },
  { id: 'b', speaker: 'kabir', text: 'Two', next: 'choice' },
  {
    id: 'choice',
    speaker: 'kabir',
    text: 'Pick',
    choices: [
      { text: 'Tea', set: { drink: 'tea' }, next: 'tea_end' },
      { text: 'Coffee', set: { drink: 'coffee' }, next: 'coffee_end' },
    ],
  },
  { id: 'tea_end', speaker: 'kabir', text: 'Good choice', next: null },
  { id: 'coffee_end', speaker: 'kabir', text: 'Bold choice', next: null },
];

describe('dialogue engine', () => {
  it('auto-advances through nodes with next', () => {
    const s = createSession(nodes);
    expect(jumpTo(s, null).id).toBe('a');
    expect(next(s).id).toBe('b');
    expect(next(s).id).toBe('choice');
  });

  it('choices set flags and route', () => {
    const s = createSession(nodes);
    jumpTo(s, 'choice');
    expect(currentChoices(s)).toHaveLength(2);
    const after = next(s, 0);
    expect(s.flags.drink).toBe('tea');
    expect(after.id).toBe('tea_end');
  });

  it('ends when next is null', () => {
    const s = createSession(nodes);
    jumpTo(s, 'tea_end');
    expect(next(s)).toBeNull();
    expect(s.finished).toBe(true);
  });

  it('when-conditions gate visibility', () => {
    const hidden = { id: 'h', speaker: 'x', text: 'secret', when: { flag: 'knows', is: true }, next: null };
    const open = { id: 'o', speaker: 'x', text: 'plain', next: null };
    const s = createSession([hidden, open]);
    const first = jumpTo(s, null);
    expect(first.id).toBe('o');
  });

  it('setter nodes apply flags', () => {
    const setter = { id: 'set', set: { met: true }, next: 'plain' };
    const plain = { id: 'plain', speaker: 'x', text: 'hi', next: null };
    const s = createSession([setter, plain]);
    jumpTo(s, 'set');
    expect(s.flags.met).toBe(true);
  });

  it('missing node id ends the session safely', () => {
    const s = createSession(nodes);
    jumpTo(s, 'does_not_exist');
    expect(s.finished).toBe(true);
  });

  it('whenMatches handles missing flags', () => {
    expect(whenMatches(undefined, {})).toBe(true);
    expect(whenMatches({ flag: 'x', is: false }, {})).toBe(true);
    expect(whenMatches({ flag: 'x', is: false }, { x: true })).toBe(false);
    expect(whenMatches({ flag: 'x' }, { x: true })).toBe(true);
  });
});

describe('ch0 dialogue data', () => {
  it('has unique node ids and all next references resolve', () => {
    const ids = new Set(ch0.nodes.map((n) => n.id));
    expect(ids.size).toBe(ch0.nodes.length);
    for (const n of ch0.nodes) {
      if (n.next) expect(ids.has(n.next), `${n.id} -> ${n.next}`).toBe(true);
      for (const c of n.choices ?? []) expect(ids.has(c.next), `${n.id} choice -> ${c.next}`).toBe(true);
    }
  });

  it('plays from start to Kabir confession with flag set', () => {
    for (const pick of [0, 1]) {
      const s = createSession(ch0.nodes);
      let node = jumpTo(s, null);
      let guard = 0;
      while (node && guard++ < 100) {
        const choices = currentChoices(s);
        node = choices.length ? next(s, pick) : next(s);
      }
      expect(s.finished).toBe(true);
      expect(s.flags.kabirConfessed).toBe(true);
      expect(s.flags.askedAboutShapla).toBe(true);
    }
  });

  it('either tutorial choice routes to a valid node', () => {
    const s = createSession(ch0.nodes);
    let node = jumpTo(s, null);
    while (node && !node.choices) node = next(s);
    expect(node?.choices?.length).toBe(2);
    const afterA = next(s, 0);
    expect(afterA).toBeTruthy();
    const s2 = createSession(ch0.nodes);
    node = jumpTo(s2, null);
    while (node && !node.choices) node = next(s2);
    const afterB = next(s2, 1);
    expect(afterB).toBeTruthy();
  });
});

describe('gameState', () => {
  beforeEach(() => {
    // Vitest node environment has no localStorage; the game itself always does
    // (browser). A minimal stub keeps these tests honest about the contract.
    if (typeof globalThis.localStorage === 'undefined') {
      const store = new Map();
      globalThis.localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
        clear: () => store.clear(),
      };
    }
    localStorage.clear();
    newGame();
  });

  it('flags set and notify subscribers', () => {
    let calls = 0;
    const unsub = subscribe(() => calls++);
    setFlag('priorityChoice', 'science');
    setFlags({ askedAboutShapla: true });
    expect(getState().flags.priorityChoice).toBe('science');
    expect(calls).toBeGreaterThanOrEqual(2);
    unsub();
  });

  it('save/load round-trips through localStorage', () => {
    setFlags({ kabirConfessed: true });
    getState().chapter = 1;
    expect(save()).toBe(true);
    expect(hasSave()).toBe(true);

    newGame();
    expect(getState().flags.kabirConfessed).toBeUndefined();

    expect(load()).toBe(true);
    expect(getState().flags.kabirConfessed).toBe(true);
    expect(getState().chapter).toBe(1);
  });

  it('load returns false with no save', () => {
    expect(load()).toBe(false);
  });

  it('clearSave removes the save', () => {
    save();
    clearSave();
    expect(hasSave()).toBe(false);
  });

  it('newGame resets state', () => {
    setFlags({ x: 1 });
    getState().chapter = 3;
    newGame();
    expect(getState().chapter).toBe(0);
    expect(getState().flags).toEqual({});
  });
});
