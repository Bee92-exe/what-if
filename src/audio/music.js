import { getState } from '../state/gameState.js';

const TRACKS = {
  menu: {
    bpm: 92,
    bass: [110, 0, 110, 0, 146.8, 0, 130.8, 0, 98, 0, 98, 0, 130.8, 0, 146.8, 0],
    lead: [440, 0, 523, 587, 0, 523, 440, 0, 392, 0, 440, 523, 0, 587, 523, 440],
  },
  design: {
    bpm: 108,
    bass: [98, 0, 98, 130.8, 0, 98, 0, 123.5, 87.3, 0, 87.3, 116.5, 0, 87.3, 0, 110],
    lead: [392, 494, 587, 0, 494, 0, 392, 0, 349, 440, 523, 0, 440, 0, 349, 0],
  },
  operations: {
    bpm: 120,
    bass: [87.3, 87.3, 0, 87.3, 110, 0, 87.3, 0, 82.4, 82.4, 0, 82.4, 98, 0, 82.4, 0],
    lead: [0, 0, 349, 0, 415, 0, 0, 349, 0, 0, 329, 0, 392, 0, 0, 311],
  },
};

let ctx = null;
let timer = null;
let step = 0;
let currentTrack = null;

function ac() {
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

function playNote(freq, time, dur, type, vol) {
  const c = ac();
  if (!c || !freq) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(time);
  osc.stop(time + dur + 0.05);
}

export function playMusic(trackName) {
  const track = TRACKS[trackName] ?? TRACKS.menu;
  if (currentTrack === trackName && timer) return;
  stopMusic();
  currentTrack = trackName;
  const c = ac();
  if (!c) return;
  const stepDur = 60 / track.bpm / 2;
  step = 0;
  timer = setInterval(() => {
    if (getState().settings?.muted) return;
    const i = step % 16;
    const t = c.currentTime + 0.05;
    playNote(track.bass[i], t, stepDur * 0.9, 'triangle', 0.025);
    playNote(track.lead[i], t, stepDur * 0.7, 'square', 0.012);
    if (i % 4 === 0) playNote(track.bass[i] / 2, t, stepDur * 0.5, 'sine', 0.03);
    step++;
  }, stepDur * 1000);
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  currentTrack = null;
}
