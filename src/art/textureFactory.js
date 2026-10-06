import Phaser from 'phaser';
import { PALETTE } from '../config.js';
import { charToColor, validateSprite } from './palette.js';
import * as S from './sprites/index.js';
import { portraits } from './sprites/characters.js';
import { generatePartIcons } from './sprites/partIcons.js';


export function makeTexture(scene, key, rows) {
  if (scene.textures.exists(key)) return;
  const bad = validateSprite(rows, key);
  if (bad.length) throw new Error(`textureFactory: invalid palette chars in ${key}: ${bad.join(', ')}`);
  const width = Math.max(...rows.map((r) => r.length));
  const canvasTex = scene.textures.createCanvas(key, width, rows.length);
  const ctx = canvasTex.getContext();
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = charToColor(row[x]);
      if (color === null) continue;
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  canvasTex.refresh();
}

export function generateAllTextures(scene) {
  const entries = {
    satellite: S.satellite,
    rocketSmall: S.rocketSmall,
    rocketFlame1: S.rocketFlame1,
    rocketFlame2: S.rocketFlame2,
    groundStation: S.groundStation,
    reportFolder: S.reportFolder,
    dossierPage: S.dossierPage,
    cyclone1: S.cyclone1,
    cyclone2: S.cyclone2,
    cyclone3: S.cyclone3,
    partBus: S.partBus,
    partPanels: S.partPanels,
    partCamera: S.partCamera,
    partThermal: S.partThermal,
    partComms: S.partComms,
    partBattery: S.partBattery,
    partThruster: S.partThruster,
    partShield: S.partShield,
    partStarTracker: S.partStarTracker,
    ...portraits,
  };
  for (const [key, rows] of Object.entries(entries)) {
    makeTexture(scene, key, rows);
  }
  const iconKeys = generatePartIcons(scene);
  return [...Object.keys(entries), ...iconKeys];
}
