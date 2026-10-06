import { describe, it, expect } from 'vitest';
import {
  advance,
  charsThatFit,
  fits,
  wrapText,
  ellipsize,
  clampLines,
  textHeight,
  lineCount,
} from '../src/ui/textMetrics.js';
import { GAME_WIDTH, GAME_HEIGHT, FONT_SIZE, ART_SCALE } from '../src/config.js';
import { PART_ICONS, ICON_SIZE, partIconKey } from '../src/art/sprites/partIcons.js';
import partsData from '../src/data/parts.json' with { type: 'json' };

const parts = partsData.parts;

describe('text metrics (Press Start 2P is 1:1 monospace)', () => {
  it('every glyph advance equals the font size', () => {
    for (const size of Object.values(FONT_SIZE)) expect(advance(size)).toBe(size);
  });

  it('counts how many characters fit a panel', () => {
    expect(charsThatFit(160, FONT_SIZE.md)).toBe(10);
    expect(charsThatFit(0, FONT_SIZE.md)).toBe(1); // never zero, or a line would vanish
    expect(fits('1234567890', 160, FONT_SIZE.md)).toBe(true);
    expect(fits('12345678901', 160, FONT_SIZE.md)).toBe(false);
  });

  it('wraps text so no line is ever wider than the box', () => {
    const wrapped = wrapText('the quick brown fox jumps over the lazy dog', 160, FONT_SIZE.md);
    for (const line of wrapped.split('\n')) {
      expect(advance(FONT_SIZE.md) * line.length).toBeLessThanOrEqual(160);
    }
  });

  it('hard-breaks a single word that cannot fit', () => {
    const wrapped = wrapText('supercalifragilisticexpialidocious', 80, FONT_SIZE.md);
    const lines = wrapped.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(5);
  });

  it('keeps explicit paragraph breaks', () => {
    expect(wrapText('one\ntwo', 160, FONT_SIZE.md)).toBe('one\ntwo');
  });

  it('ellipsizes down to the available width', () => {
    const out = ellipsize('abcdefghijklmnop', 80, FONT_SIZE.md);
    expect(out.length).toBeLessThanOrEqual(5);
    expect(out.endsWith('..')).toBe(true);
    expect(ellipsize('abc', 80, FONT_SIZE.md)).toBe('abc');
  });

  // Regression: a Phaser Text style exposes fontSize as the CSS string "16px".
  // Feeding that to the maths produced NaN, and ellipsize('LAUNCHING') came out
  // as a bare '..' on the LAUNCH button.
  it('accepts a CSS font-size string as well as a number', () => {
    expect(ellipsize('LAUNCHING', 112, '16px')).toBe('LAUNC..');
    expect(charsThatFit(112, '16px')).toBe(7);
    expect(advance('24px')).toBe(24);
    expect(textHeight('abc', 160, '16px')).toBe(16);
  });

  it('clamps to a maximum number of lines', () => {
    const out = clampLines('one two three four five six seven eight nine', 80, FONT_SIZE.md, 2);
    expect(out.split('\n').length).toBe(2);
  });

  it('measures height from wrapped lines plus line spacing', () => {
    expect(textHeight('abc', 160, FONT_SIZE.md)).toBe(FONT_SIZE.md);
    expect(lineCount('abc', 160, FONT_SIZE.md)).toBe(1);
    const two = textHeight('aaaaa bbbbb', 80, FONT_SIZE.md, 4);
    expect(two).toBe(FONT_SIZE.md * 2 + 4);
  });
});

describe('canvas + art scale', () => {
  it('renders at 640x360 (2x the original design grid)', () => {
    expect(GAME_WIDTH).toBe(640);
    expect(GAME_HEIGHT).toBe(360);
    expect(ART_SCALE).toBe(2);
  });

  it('keeps body text large enough for a young child', () => {
    expect(FONT_SIZE.md).toBeGreaterThanOrEqual(16);
    // A 16px glyph on a 640px canvas is ~2.5% of the width; the old 320px
    // canvas at 8px was 2.5% too, so on-screen size is unchanged while the
    // number of characters per line doubles.
    expect(FONT_SIZE.md / GAME_WIDTH).toBeCloseTo(8 / 320, 5);
  });
});

describe('part icons', () => {
  it('has one distinct icon spec per catalog part', () => {
    for (const part of parts) {
      expect(PART_ICONS[part.id], `missing icon spec for ${part.id}`).toBeTruthy();
      expect(part.icon).toBe(`part_${part.id}`);
      expect(partIconKey(part)).toBe(part.icon);
    }
    expect(Object.keys(PART_ICONS).length).toBe(parts.length);
  });

  it('draws only inside the icon canvas and only with palette colours', () => {
    for (const [id, spec] of Object.entries(PART_ICONS)) {
      expect(spec.px.length).toBeGreaterThan(0);
      for (const [x, y, w, h, color] of spec.px) {
        expect(Number.isInteger(x) && Number.isInteger(y), `${id} rect origin`).toBe(true);
        expect(w, `${id} rect width`).toBeGreaterThan(0);
        expect(h, `${id} rect height`).toBeGreaterThan(0);
        expect(x, `${id} x out of bounds`).toBeGreaterThanOrEqual(0);
        expect(y, `${id} y out of bounds`).toBeGreaterThanOrEqual(0);
        expect(x + w, `${id} right edge out of bounds`).toBeLessThanOrEqual(ICON_SIZE);
        expect(y + h, `${id} bottom edge out of bounds`).toBeLessThanOrEqual(ICON_SIZE);
        expect(color, `${id} colour ${color} outside the 16-colour palette`).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(15);
      }
    }
  });

  it('gives every part child-facing wording that fits its panel', () => {
    for (const part of parts) {
      expect(part.kid, `${part.id} has no kid block`).toBeTruthy();
      expect(part.kid.name.length, `${part.id} kid.name too long`).toBeLessThanOrEqual(18);
      expect(part.kid.is.length, `${part.id} kid.is too long`).toBeLessThanOrEqual(42);
      expect(part.kid.does.length, `${part.id} kid.does too long`).toBeLessThanOrEqual(42);
    }
  });
});
