const SAVE_KEY = 'mission-director-save-v1';
const VERSION = 1;

const state = {
  version: VERSION,
  flags: {},
  chapter: 0,
  player: { name: '', avatar: 0 },
  satelliteName: '',
  results: {},
  unlocked: { parts: [], notebook: [] },
  resume: null,
  design: null,
};

const listeners = new Set();

let restored = false;

function restoreOnce() {
  if (restored) return;
  restored = true;
  load();
}

export function getState() {
  restoreOnce();
  return state;
}

export function setFlag(key, value) {
  state.flags[key] = value;
  emit();
}

export function setFlags(obj) {
  Object.assign(state.flags, obj);
  emit();
}

export function setPlayer(player) {
  state.player = { ...state.player, ...player };
  emit();
  return state.player;
}

export function setDesign(design) {
  state.design = design;
  emit();
}

export function emit() {
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function newGame() {
  restored = true;
  state.version = VERSION;
  state.flags = {};
  state.chapter = 0;
  state.player = { name: '', avatar: 0 };
  state.satelliteName = '';
  state.results = {};
  state.unlocked = { parts: [], notebook: [] };
  state.resume = null;
  state.design = null;
  emit();
}

export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (typeof data.version !== 'number' || data.version > VERSION) return false;
    Object.assign(state, data);
    emit();
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}
