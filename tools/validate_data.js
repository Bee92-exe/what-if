#!/usr/bin/env node
/**
 * Data validator (build plan 6.3, M2 acceptance).
 * Checks: schema fields present, ids unique, slot names valid, capability
 * flags boolean, unlockedBy references, placeholder audit.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PART_ICONS } from '../src/art/sprites/partIcons.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const errors = [];
const warn = [];

const VALID_SLOTS = new Set(['bus', 'power_panel', 'power_battery', 'comms', 'payload', 'extra']);
const VALID_ORIGIN = new Set(['nasa', 'derived', 'placeholder']);
const NUMERIC = ['mass', 'power', 'cost', 'reliability'];

const parts = read('src/data/parts.json').parts;
const rockets = read('src/data/rockets.json').rockets;
const orbits = read('src/data/orbits.json').orbits;

// --- parts ---
const partIds = new Set();
for (const p of parts) {
  if (!p.id) errors.push(`part missing id: ${JSON.stringify(p.name)}`);
  if (partIds.has(p.id)) errors.push(`duplicate part id: ${p.id}`);
  partIds.add(p.id);
  if (!VALID_SLOTS.has(p.slot)) errors.push(`${p.id}: bad slot "${p.slot}"`);
  for (const f of NUMERIC) {
    if (typeof p[f] !== 'number') errors.push(`${p.id}: ${f} must be a number`);
  }
  if (typeof p.reliability !== 'number' || p.reliability < 0 || p.reliability > 1) {
    errors.push(`${p.id}: reliability must be 0..1`);
  }
  if (!VALID_ORIGIN.has(p.origin)) errors.push(`${p.id}: origin must be one of ${[...VALID_ORIGIN]}`);
  if (p.slot === 'payload' && typeof p.dataRateMBperMin !== 'number') errors.push(`${p.id}: payload needs dataRateMBperMin`);
  if (p.slot === 'power_panel' && typeof p.genW !== 'number') errors.push(`${p.id}: panel needs genW`);
  if (p.slot === 'power_battery' && typeof p.capacityWh !== 'number') errors.push(`${p.id}: battery needs capacityWh`);
  if (p.slot === 'comms' && typeof p.downlinkMbps !== 'number') errors.push(`${p.id}: comms needs downlinkMbps`);
  if (p.slot === 'bus' && !(p.payloadSlots > 0 && p.storageGB > 0)) errors.push(`${p.id}: bus needs payloadSlots + storageGB`);
  // Child-facing layer: every part needs its own icon and kid wording, or the
  // design room would fall back to engineering jargon for a 4-year-old.
  if (!p.icon) errors.push(`${p.id}: missing icon key`);
  else if (p.icon.startsWith('part_') && !PART_ICONS[p.icon.slice(5)]) {
    errors.push(`${p.id}: icon "${p.icon}" has no spec in src/art/sprites/partIcons.js`);
  }
  if (!p.kid || typeof p.kid !== 'object') errors.push(`${p.id}: missing kid wording block`);
  else {
    for (const f of ['name', 'is', 'does']) {
      if (typeof p.kid[f] !== 'string' || !p.kid[f]) errors.push(`${p.id}: kid.${f} must be a non-empty string`);
    }
    if ((p.kid.name ?? '').length > 18) errors.push(`${p.id}: kid.name too long for its panel (${p.kid.name.length} > 18)`);
    for (const f of ['is', 'does']) {
      if ((p.kid[f] ?? '').length > 42) errors.push(`${p.id}: kid.${f} too long to read (${p.kid[f].length} > 42)`);
    }
  }
}

// --- rockets ---
const rocketIds = new Set();
for (const r of rockets) {
  if (!r.id) errors.push('rocket missing id');
  if (rocketIds.has(r.id)) errors.push(`duplicate rocket id: ${r.id}`);
  rocketIds.add(r.id);
  if (!(r.capacityKg > 0)) errors.push(`${r.id}: capacityKg must be > 0`);
  if (!(r.cost >= 0)) errors.push(`${r.id}: cost must be >= 0`);
  if (typeof r.reliability !== 'number' || r.reliability <= 0 || r.reliability > 1) errors.push(`${r.id}: reliability 0..1 exclusive`);
}

// --- orbits ---
const orbitIds = new Set();
for (const o of orbits) {
  if (!o.id) errors.push('orbit missing id');
  if (orbitIds.has(o.id)) errors.push(`duplicate orbit id: ${o.id}`);
  orbitIds.add(o.id);
  for (const f of ['periodMin', 'eclipseFraction', 'passesPerDay', 'passMinutes', 'radiationFactor']) {
    if (typeof o[f] !== 'number') errors.push(`${o.id}: ${f} must be a number`);
  }
  if (o.eclipseFraction <= 0 || o.eclipseFraction >= 1) errors.push(`${o.id}: eclipseFraction must be 0..1 exclusive`);
}

// --- unlockedBy references (soft: only warn — unlock ids can be chapters) ---
for (const p of parts) {
  if (p.unlockedBy && !['start', 'ch1', 'ch2', 'ch3'].includes(p.unlockedBy)) {
    warn.push(`${p.id}: unlockedBy "${p.unlockedBy}" is not a known chapter id`);
  }
}

// --- placeholder audit (4.10): strict mode via --strict ---
const all = [...parts, ...rockets, ...orbits];
const placeholders = all.filter((x) => x.origin === 'placeholder').length;
if (process.argv.includes('--strict') && placeholders > 0) {
  errors.push(`--strict: ${placeholders} placeholder records remain (NASA ingestion pending)`);
}

console.log(`Validated ${parts.length} parts, ${rockets.length} rockets, ${orbits.length} orbits.`);
if (placeholders) console.log(`NOTE: ${placeholders} record(s) are origin=placeholder (expected until NASA ingestion).`);
if (warn.length) {
  console.log(`\nWARNINGS — ${warn.length}`);
  warn.forEach((w) => console.log(`  - ${w}`));
}
if (errors.length) {
  console.log(`\nFAILED — ${errors.length}`);
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
console.log('All checks passed.');
