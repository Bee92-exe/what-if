import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';
import BootScene from './scenes/BootScene.js';
import PreloadScene from './scenes/PreloadScene.js';
import TitleScene from './scenes/TitleScene.js';
import CharacterScene from './scenes/CharacterScene.js';
import InterstitialScene from './scenes/InterstitialScene.js';
import StoryScene from './scenes/StoryScene.js';
import BriefingRoomScene from './scenes/BriefingRoomScene.js';
import BriefingScene from './scenes/BriefingScene.js';
import DesignScene from './scenes/DesignScene.js';
import LaunchScene from './scenes/LaunchScene.js';
import OperationsScene from './scenes/OperationsScene.js';
import DebriefScene from './scenes/DebriefScene.js';
import PartBookScene from './scenes/PartBookScene.js';
import NotebookScene from './scenes/NotebookScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import UiTestScene from './scenes/UiTestScene.js';
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0d0b1e',
  pixelArt: true,
  roundPixels: true,
  preserveDrawingBuffer: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    CharacterScene,
    InterstitialScene,
    StoryScene,
    BriefingRoomScene,
    BriefingScene,
    DesignScene,
    LaunchScene,
    OperationsScene,
    DebriefScene,
    PartBookScene,
    NotebookScene,
    SettingsScene,
    UiTestScene,
  ],
};

export function zoomFor(w, h) {
  const z = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
  return Math.max(1, Math.floor(z));
}

window.__MD_GAME = new Phaser.Game(config);

try { window.md = window.md || {}; window.md.zoomFor = zoomFor; } catch (e) {}

if (import.meta.env?.DEV) {
  import('./dev/audit.js').then((m) => m.installAudit(window.__MD_GAME));
}
