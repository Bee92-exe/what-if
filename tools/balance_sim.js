#!/usr/bin/env node
/**
 * Headless balance sampler (build plan Section 8).
 * Samples random valid designs per mission and reports viability so numbers
 * in parts.json/orbits.json can be tuned without playtesting every combo.
 *
 * Target: 15-30% of sampled designs viable, at least 3 distinct archetypes.
 */
import { partById, rocketById, orbitById, parts, rockets, orbits } from '../src/utils/dataStore.js';
import { computeDesignStats } from '../src/sim/stats.js';
import { makeRng } from '../src/utils/rng.js';

const SAMPLES = Number(process.argv[2] ?? 5000);

/** Randomly pick a part from a slot group. */
function pickPart(rng, slot, budget) {
  const pool = parts.filter((p) => p.slot === slot && p.cost <= budget);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/** Build one random design. */
function randomDesign(rng) {
  const design = { slots: { bus: null, power_panel: null, power_battery: null, comms: null, payload: [], extra: null } };
  const bus = pickPart(rng, 'bus', 3);
  if (!bus) return null;
  design.slots.bus = bus.id;

  const panel = pickPart(rng, 'power_panel', 1);
  const battery = pickPart(rng, 'power_battery', 1);
  const comms = pickPart(rng, 'comms', 1);
  if (!panel || !battery || !comms) return null;
  design.slots.power_panel = panel.id;
  design.slots.power_battery = battery.id;
  design.slots.comms = comms.id;

  const payloadPool = parts.filter((p) => p.slot === 'payload');
  const nPayload = 1 + Math.floor(rng() * bus.payloadSlots);
  const shuffled = [...payloadPool].sort(() => rng() - 0.5);
  design.slots.payload = shuffled.slice(0, nPayload).map((p) => p.id);

  if (rng() < 0.3) {
    const extras = parts.filter((p) => p.slot === 'extra');
    design.slots.extra = extras[Math.floor(rng() * extras.length)].id;
  }
  return design;
}

/**
 * Two viability tiers:
 * - launchable: no hard errors (mass, missing parts) — it CAN leave the pad.
 * - missionViable: no errors AND no warnings — it will actually deliver science.
 * The 15-30% target applies to missionViable (Section 8).
 */
function tiers(stats) {
  const errors = stats.warnings.some((w) => w.severity === 'error');
  const warns = stats.warnings.some((w) => w.severity === 'warn');
  return { launchable: !errors, missionViable: !errors && !warns };
}

const rng = makeRng(20261006);
const results = {};

for (const rocket of rockets.filter((r) => r.unlockedBy !== 'ch3')) {
  for (const orbit of orbits) {
    let launchableCount = 0;
    let missionViableCount = 0;
    const costs = [];
    const archetypes = new Map();
    for (let i = 0; i < SAMPLES; i++) {
      const design = randomDesign(rng);
      if (!design) continue;
      const stats = computeDesignStats(design, partById, orbit, rocket, 10);
      const t = tiers(stats);
      if (!t.launchable) continue;
      launchableCount++;
      costs.push(stats.cost);
      if (t.missionViable) {
        missionViableCount++;
        const payload = design.slots.payload.map((id) => partById.get(id).name).sort().join(' + ');
        archetypes.set(payload, (archetypes.get(payload) ?? 0) + 1);
      }
    }
    results[`${rocket.id} / ${orbit.id}`] = {
      launchablePct: ((launchableCount / SAMPLES) * 100).toFixed(1),
      missionViablePct: ((missionViableCount / SAMPLES) * 100).toFixed(1),
      medianCost: costs.length ? costs.sort((a, b) => a - b)[Math.floor(costs.length / 2)].toFixed(2) : 'n/a',
      topArchetypes: [...archetypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`),
    };
  }
}

console.log(`Balance sample: ${SAMPLES} designs per rocket/orbit pair\n`);
for (const [combo, r] of Object.entries(results)) {
  console.log(`${combo}`);
  console.log(`  launchable: ${r.launchablePct}%   mission-viable: ${r.missionViablePct}%   median cost: $${r.medianCost}M`);
  r.topArchetypes.forEach((a) => console.log(`    - ${a}`));
}

const missionViableValues = Object.values(results).map((r) => Number(r.missionViablePct));
const inBand = missionViableValues.some((v) => v >= 15 && v <= 30);
console.log(`\n${inBand ? 'OK' : 'NOTE'}: target band for mission-viable is 15-30% ${inBand ? '— met' : `— current range ${Math.min(...missionViableValues)}-${Math.max(...missionViableValues)}% (tune before M6)`}`);
