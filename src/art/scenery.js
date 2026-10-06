import { COLOR, GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { drawDitherGradient, drawStarfield, drawWater, fillDisc } from './procedural.js';
import { makeRng } from '../utils/rng.js';
import { getState } from '../state/gameState.js';

export const SCENERY = {
  skyH: 176,
  landY: 176,
  landH: 76,
  waterY: 252,
  barH: 20,
  barY: GAME_HEIGHT - 20,
  padX: 60,
  padY: 172,
  towerX: 96,
  towerY: 132,
  annexX: 112,
  centreX: 486,
  moonX: 566,
  moonY: 42,
  moonR: 14,
};

function rect(g, x, y, w, h, color) {
  g.fillStyle(color, 1);
  g.fillRect(x, y, w, h);
}

function bake(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

function buildLand(scene) {
  return bake(scene, 'bg_land', GAME_WIDTH, SCENERY.landH, (g) => {
    const rng = makeRng(4242);
    const groundY = 18;
    rect(g, 0, 0, GAME_WIDTH, groundY + 3, COLOR.blue);
    fillDisc(g, 70, 30, 34, COLOR.navy);
    fillDisc(g, 236, 34, 28, COLOR.navy);
    fillDisc(g, 420, 32, 40, COLOR.navy);
    fillDisc(g, 596, 30, 30, COLOR.navy);
    rect(g, 0, groundY, GAME_WIDTH, 3, COLOR.teal);
    rect(g, 0, groundY + 3, GAME_WIDTH, 2, COLOR.green);
    rect(g, 0, groundY + 5, GAME_WIDTH, SCENERY.landH - groundY - 5, COLOR.brown);
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(rng() * GAME_WIDTH);
      const y = groundY + 8 + Math.floor(rng() * (SCENERY.landH - groundY - 12));
      rect(g, x, y, 2, 3, rng() > 0.5 ? COLOR.green : COLOR.teal);
    }
    const apronY = 46;
    rect(g, SCENERY.centreX - 20, apronY, GAME_WIDTH - SCENERY.centreX + 20, SCENERY.landH - apronY, COLOR.metal);
    for (let x = SCENERY.centreX - 20; x < GAME_WIDTH; x += 26) rect(g, x, apronY, 1, SCENERY.landH - apronY, COLOR.spaceBlack);
    rect(g, SCENERY.centreX - 20, apronY, GAME_WIDTH - SCENERY.centreX + 20, 1, COLOR.ice);
  });
}

function buildCentre(scene) {
  const w = GAME_WIDTH - SCENERY.centreX;
  return bake(scene, 'bg_centre', w, SCENERY.landH, (g) => {
    const rng = makeRng(90210);
    const baseY = 66;
    const blocks = [
      { x: 6, w: 44, top: 20 },
      { x: 56, w: 30, top: 38 },
      { x: 92, w: 26, top: 46 },
      { x: 124, w: 26, top: 30 },
    ];
    for (const b of blocks) {
      const bh = baseY - b.top;
      rect(g, b.x, b.top, b.w, bh, COLOR.metal);
      rect(g, b.x, b.top, b.w, 1, COLOR.spaceBlack);
      rect(g, b.x, b.top, 1, bh, COLOR.spaceBlack);
      rect(g, b.x + b.w - 1, b.top, 1, bh, COLOR.spaceBlack);
      rect(g, b.x, b.top + 1, b.w, 4, COLOR.blue);
      for (let wy = b.top + 9; wy < baseY - 8; wy += 8) {
        for (let wx = b.x + 4; wx < b.x + b.w - 4; wx += 6) {
          rect(g, wx, wy, 3, 3, rng() > 0.35 ? COLOR.gold : COLOR.navy);
        }
      }
    }
    rect(g, 20, 54, 9, 12, COLOR.navy);
    rect(g, 22, 58, 5, 8, COLOR.gold);
    rect(g, 27, 4, 1, 16, COLOR.metal);
    rect(g, 104, 38, 1, 8, COLOR.metal);
    fillDisc(g, 104, 36, 5, COLOR.ice);
    rect(g, 104, 36, 1, 5, COLOR.navy);
    fillDisc(g, 137, 30, 12, COLOR.blue);
    fillDisc(g, 137, 30, 9, COLOR.navy);
    rect(g, 137, 22, 1, 8, COLOR.spaceBlack);
  });
}

function buildAnnex(scene) {
  return bake(scene, 'bg_annex', 46, SCENERY.landH, (g) => {
    rect(g, 4, 42, 40, 24, COLOR.metal);
    rect(g, 4, 42, 40, 1, COLOR.spaceBlack);
    rect(g, 4, 42, 1, 24, COLOR.spaceBlack);
    rect(g, 43, 42, 1, 24, COLOR.spaceBlack);
    rect(g, 2, 38, 44, 4, COLOR.blue);
    for (let x = 4; x < 44; x += 6) rect(g, x, 38, 3, 4, COLOR.metal);
    rect(g, 2, 42, 44, 1, COLOR.spaceBlack);
    rect(g, 20, 54, 8, 12, COLOR.spaceBlack);
    rect(g, 10, 48, 4, 4, COLOR.gold);
    rect(g, 34, 48, 4, 4, COLOR.gold);
    rect(g, 40, 22, 1, 16, COLOR.metal);
    rect(g, 32, 24, 9, 1, COLOR.metal);
  });
}

function buildPad(scene) {
  const w = 84;
  const h = 24;
  return bake(scene, 'bg_pad', w, h, (g) => {
    rect(g, 0, 10, w, h - 10, COLOR.metal);
    for (let x = 10; x < w; x += 14) rect(g, x, 11, 1, h - 11, COLOR.navy);
    rect(g, 0, 0, w, 6, COLOR.metal);
    rect(g, 0, 0, w, 1, COLOR.ice);
    rect(g, 30, 1, 24, 8, COLOR.spaceBlack);
    rect(g, 0, 6, w, 4, COLOR.metal);
    rect(g, 0, 6, w, 1, COLOR.spaceBlack);
    rect(g, 33, 0, 3, 2, COLOR.navy);
    rect(g, 48, 0, 3, 2, COLOR.navy);
  });
}

function buildMoon(scene) {
  const r = SCENERY.moonR;
  const size = r * 2 + 1;
  return bake(scene, 'bg_moon', size, size, (g) => {
    fillDisc(g, r, r, r, COLOR.white);
    fillDisc(g, r - 4, r - 3, 3, COLOR.ice);
    fillDisc(g, r + 4, r + 2, 2, COLOR.ice);
    fillDisc(g, r, r + 6, 2, COLOR.ice);
    fillDisc(g, r + 6, r - 6, 1, COLOR.ice);
    fillDisc(g, r - 6, r + 4, 1, COLOR.ice);
  });
}

function buildTower(scene) {
  const w = 12;
  const h = 64;
  return bake(scene, 'bg_tower', w, h, (g) => {
    rect(g, 1, 0, 2, h, COLOR.metal);
    rect(g, 9, 0, 2, h, COLOR.metal);
    for (let y = 2; y < h - 4; y += 8) {
      rect(g, 3, y, 6, 1, COLOR.metal);
      rect(g, 4, y + 3, 1, 4, COLOR.metal);
      rect(g, 7, y + 3, 1, 4, COLOR.metal);
    }
    rect(g, 0, 4, w, 2, COLOR.ice);
    rect(g, 6, 0, 6, 2, COLOR.metal);
  });
}

export function bakeSpaceCentreTextures(scene) {
  drawDitherGradient(scene, 'bg_sky_dusk', 0, 0, GAME_WIDTH, SCENERY.skyH, 0x1b1f4a, 0x2e3f8f, 6);
  drawStarfield(scene, 'bg_stars', GAME_WIDTH, SCENERY.skyH, 20261006, 10);
  buildLand(scene);
  buildMoon(scene);
  buildCentre(scene);
  buildAnnex(scene);
  buildPad(scene);
  buildTower(scene);
  drawWater(scene, 'bg_water', GAME_WIDTH, GAME_HEIGHT - SCENERY.waterY);
}

export function drawSpaceCentre(scene) {
  bakeSpaceCentreTextures(scene);
  scene.add.image(0, 0, 'bg_sky_dusk').setOrigin(0);
  scene.add.image(0, 0, 'bg_stars').setOrigin(0);
  scene.add.image(SCENERY.moonX, SCENERY.moonY, 'bg_moon').setOrigin(0.5);
  scene.add.image(0, SCENERY.landY, 'bg_land').setOrigin(0);
  scene.add.image(SCENERY.annexX, SCENERY.landY, 'bg_annex').setOrigin(0);
  scene.add.image(SCENERY.centreX, SCENERY.landY, 'bg_centre').setOrigin(0);
  scene.add.image(SCENERY.padX, SCENERY.padY, 'bg_pad').setOrigin(0.5, 0);
  scene.add.image(SCENERY.towerX, SCENERY.towerY, 'bg_tower').setOrigin(0.5, 0);
  scene.add.image(0, SCENERY.waterY, 'bg_water').setOrigin(0);

  const beacon = scene.add.rectangle(SCENERY.centreX + 27, SCENERY.landY + 3, 2, 2, COLOR.red).setOrigin(0.5, 0);
  if (!getState().settings?.reducedMotion) {
    scene.tweens.add({ targets: beacon, alpha: 0.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return scene;
}

export function drawBottomBar(scene) {
  scene.add.rectangle(0, SCENERY.barY, GAME_WIDTH, SCENERY.barH, COLOR.spaceBlack, 1).setOrigin(0);
  scene.add.rectangle(0, SCENERY.barY, GAME_WIDTH, 1, COLOR.navy, 1).setOrigin(0);
  return SCENERY.barY;
}

export function drawStoryDesk(scene) {
  bake(scene, 'story_desk', 37, 11, (g) => {
    rect(g, 0, 0, 37, 1, COLOR.skinMid);
    rect(g, 0, 1, 37, 1, COLOR.brown);
    rect(g, 0, 2, 37, 1, COLOR.spaceBlack);
    rect(g, 0, 3, 37, 8, 0x4a2b1a);
    for (let x = 3; x < 37; x += 7) rect(g, x, 4, 1, 6, COLOR.brown);
  });
  const desk = scene.add.image(0, 296, 'story_desk').setOrigin(0).setScale(4);
  const folder = scene.add.image(74, 276, 'reportFolder').setOrigin(0.5).setScale(4);
  return [desk, folder];
}

function buildRoom(scene, key, { wall, floor, seed }) {
  return bake(scene, key, GAME_WIDTH, GAME_HEIGHT, (g) => {
    const rng = makeRng(seed);
    const floorY = 246;
    rect(g, 0, 0, GAME_WIDTH, floorY, wall);
    for (let x = 0; x < GAME_WIDTH; x += 32) rect(g, x, 0, 1, floorY, COLOR.navy);
    for (const shelfY of [58, 108, 158]) {
      rect(g, 24, shelfY, 592, 3, COLOR.brown);
      rect(g, 24, shelfY + 3, 592, 1, COLOR.spaceBlack);
      let x = 30;
      while (x < 606) {
        const w = 3 + Math.floor(rng() * 5);
        const h = 16 + Math.floor(rng() * 12);
        const colors = [COLOR.blue, COLOR.teal, COLOR.red, COLOR.green, COLOR.gold, COLOR.metal, COLOR.orange];
        rect(g, x, shelfY - h, w, h, colors[Math.floor(rng() * colors.length)]);
        x += w + 1;
      }
    }
    for (const px of [58, 546]) {
      rect(g, px, 228, 34, 3, COLOR.metal);
      rect(g, px + 2, 224, 30, 4, COLOR.white);
      rect(g, px + 4, 220, 26, 4, COLOR.ice);
      rect(g, px + 7, 216, 20, 4, COLOR.brown);
    }
    rect(g, 0, floorY, GAME_WIDTH, GAME_HEIGHT - floorY, floor);
    for (let x = -40; x < GAME_WIDTH; x += 48) {
      rect(g, x, floorY + 34, 46, 1, COLOR.spaceBlack);
      rect(g, x + 8, floorY + 52, 46, 1, COLOR.spaceBlack);
    }
  });
}

export function drawReportRoom(scene) {
  buildRoom(scene, 'bg_room_reports', { wall: 0x2a2f5e, floor: COLOR.brown, seed: 5150 });
  bake(scene, 'bg_room_lamp', GAME_WIDTH, 60, (g) => {
    rect(g, 320, 0, 1, 18, COLOR.spaceBlack);
    rect(g, 312, 18, 17, 2, COLOR.spaceBlack);
    rect(g, 304, 20, 33, 8, COLOR.metal);
    rect(g, 300, 28, 41, 2, COLOR.navy);
    rect(g, 316, 30, 9, 5, COLOR.gold);
    rect(g, 312, 35, 17, 1, COLOR.gold);
    rect(g, 308, 36, 25, 1, COLOR.gold);
  });
  scene.add.image(0, 0, 'bg_room_reports').setOrigin(0);
  scene.add.image(0, 0, 'bg_room_lamp').setOrigin(0);
  return scene;
}

export function drawBriefingRoom(scene) {
  buildRoom(scene, 'bg_room_briefing', { wall: 0x232848, floor: COLOR.metal, seed: 606 });
  bake(scene, 'briefing_screen', 320, 104, (g) => {
    rect(g, 0, 0, 320, 104, COLOR.spaceBlack);
    rect(g, 0, 0, 320, 1, COLOR.metal);
    rect(g, 0, 103, 320, 1, COLOR.metal);
    rect(g, 0, 0, 1, 104, COLOR.metal);
    rect(g, 319, 0, 1, 104, COLOR.metal);
    rect(g, 152, 84, 16, 14, COLOR.blue);
    rect(g, 146, 88, 5, 6, COLOR.navy);
    rect(g, 170, 88, 5, 6, COLOR.navy);
    rect(g, 130, 92, 14, 2, COLOR.navy);
    rect(g, 178, 92, 14, 2, COLOR.navy);
  });
  bake(scene, 'briefing_table', 500, 28, (g) => {
    rect(g, 0, 0, 500, 3, COLOR.skinMid);
    rect(g, 0, 3, 500, 13, COLOR.brown);
    rect(g, 0, 16, 500, 10, 0x4a2b1a);
    rect(g, 0, 26, 500, 2, COLOR.spaceBlack);
  });
  scene.add.image(0, 0, 'bg_room_briefing').setOrigin(0);
  scene.add.image(320, 22, 'briefing_screen').setOrigin(0.5, 0);
  return scene;
}

export function addBriefingTable(scene) {
  scene.add.image(320, 224, 'briefing_table').setOrigin(0.5, 0);
  return scene;
}
