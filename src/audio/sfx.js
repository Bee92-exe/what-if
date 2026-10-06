let ctx = null;
let muted = false;

function ac() {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.04, slide = 0, delay = 0 } = {}) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  setMuted(m) {
    muted = m;
  },
  click() {
    tone(660, 0.05, { vol: 0.02 });
  },
  confirm() {
    tone(520, 0.08);
    tone(780, 0.1, { delay: 0.07 });
  },
  error() {
    tone(220, 0.12, { type: 'sawtooth', vol: 0.05 });
    tone(180, 0.14, { type: 'sawtooth', vol: 0.05, delay: 0.1 });
  },
  warning() {
    tone(880, 0.07, { type: 'triangle' });
    tone(880, 0.07, { type: 'triangle', delay: 0.12 });
  },
  packet() {
    tone(1200, 0.04, { type: 'sine', vol: 0.03 });
    tone(1600, 0.05, { type: 'sine', vol: 0.03, delay: 0.05 });
  },
  launch() {
    tone(80, 1.2, { type: 'sawtooth', vol: 0.06, slide: 60 });
    tone(50, 1.4, { type: 'square', vol: 0.05, slide: 30, delay: 0.1 });
    tone(1400, 0.3, { type: 'sine', vol: 0.02, delay: 1.0, slide: 800 });
  },
  star() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { type: 'triangle', delay: i * 0.09, vol: 0.05 }));
  },
  ding() {
    tone(1047, 0.15, { type: 'sine', vol: 0.05 });
  },
};
