import { describe, it, expect } from 'vitest';
import { computePower, computeDataBudget, mbpsToMBPerMin, computeDesignReliability } from '../src/sim/power.js';
import { computeDesignStats } from '../src/sim/stats.js';
import { capacityCheck, launchRoll } from '../src/sim/launch.js';
import { eclipseMinutes, passFraction } from '../src/sim/orbit.js';
import { makeRng } from '../src/utils/rng.js';
import { partById, rocketById, orbitById } from '../src/utils/dataStore.js';

const orbit = orbitById.get('leo_inclined');

/** Helper to build a design from part ids. */
function design(...ids) {
  const slots = { bus: null, power_panel: null, power_battery: null, comms: null, payload: [], extra: null };
  for (const id of ids) {
    const p = partById.get(id);
    if (!p) throw new Error(`unknown part ${id}`);
    if (p.slot === 'payload') slots.payload.push(id);
    else slots[p.slot] = id;
  }
  return { slots };
}

describe('orbit helpers', () => {
  it('computes eclipse minutes from period and fraction', () => {
    // 94.6 min period * 0.37 eclipse = 35.002
    expect(eclipseMinutes(orbit)).toBeCloseTo(94.6 * 0.37, 2);
  });

  it('computes pass fraction under 10%', () => {
    expect(passFraction(orbit)).toBeLessThan(0.1);
  });
});

describe('power model', () => {
  it('a good design passes both generation and battery checks', () => {
    // 12U + deployable + 100Wh + S-band + thermal: the "balanced" archetype
    const d = design('bus12u', 'panels_deployable', 'battery_100', 'comms_sband', 'thermal_ir');
    const p = computePower(d, partById, orbit);
    expect(p.generationOK).toBe(true);
    expect(p.batteryOK).toBe(true);
    expect(p.warnings.filter((w) => w.severity === 'error')).toHaveLength(0);
  });

  it('body panels + visible camera fail the generation check', () => {
    const d = design('bus12u', 'panels_body', 'battery_100', 'comms_sband', 'camera_visible', 'thermal_ir');
    const p = computePower(d, partById, orbit);
    expect(p.generationOK).toBe(false);
    const w = p.warnings.find((x) => x.id === 'power_generation_low');
    expect(w).toBeTruthy();
    expect(w.text).toContain('Panels give');
  });

  it('battery sizing follows the eclipse formula exactly', () => {
    // eclipseDraw for bus6u+uhf+thermal: 3 + 2*0.25 + 6*0.3*0.5 = 4.4 W;
    // eclipse = 94.6*0.37 = 35.002 min; needed = 4.4 * (35.002/60) / 0.5 = 5.13 Wh.
    // The 40 Wh battery passes easily; a mission-length eclipse would not.
    const d = design('bus6u', 'panels_deployable', 'battery_40', 'comms_sband', 'thermal_ir');
    const p = computePower(d, partById, orbit);
    expect(p.batteryNeeded).toBeGreaterThan(0);
    expect(p.batteryHave).toBeGreaterThanOrEqual(p.batteryNeeded);
    expect(p.batteryOK).toBe(true);
  });

  it('battery need scales with eclipse draw and eclipse length', () => {
    const small = computePower(design('bus6u', 'panels_deployable', 'battery_40', 'comms_uhf'), partById, orbit);
    const hungry = computePower(design('bus6u', 'panels_deployable', 'battery_40', 'comms_uhf', 'thermal_ir'), partById, orbit);
    expect(hungry.batteryNeeded).toBeGreaterThan(small.batteryNeeded);
  });

  it('missing battery is an error, not a warning', () => {
    const d = design('bus6u', 'panels_body', 'comms_uhf', 'camera_visible');
    const p = computePower(d, partById, orbit);
    const w = p.warnings.find((x) => x.id === 'power_missing');
    expect(w?.severity).toBe('error');
  });

  it('optical camera does not draw power in eclipse, thermal does', () => {
    const withCam = computePower(design('bus6u', 'panels_deployable', 'battery_40', 'comms_uhf', 'camera_visible'), partById, orbit);
    const withThermal = computePower(design('bus6u', 'panels_deployable', 'battery_40', 'comms_uhf', 'thermal_ir'), partById, orbit);
    expect(withThermal.eclipseDraw).toBeGreaterThan(withCam.eclipseDraw);
  });

  it('mbps -> MB/min conversion', () => {
    expect(mbpsToMBPerMin(1)).toBeCloseTo(7.5);
    expect(mbpsToMBPerMin(10)).toBeCloseTo(75);
  });
});

describe('data budget', () => {
  it('UHF with a camera starves the downlink', () => {
    const d = design('bus6u', 'panels_deployable', 'battery_100', 'comms_uhf', 'camera_visible');
    const data = computeDataBudget(d, partById, orbit);
    expect(data.bufferOK).toBe(false);
  });

  it('S-band with thermal is comfortable', () => {
    const d = design('bus6u', 'panels_deployable', 'battery_100', 'comms_sband', 'thermal_ir');
    const data = computeDataBudget(d, partById, orbit);
    expect(data.bufferOK).toBe(true);
  });
});

describe('stats aggregation', () => {
  it('mass margin respects the rocket capacity', () => {
    // 27U bus (32 kg) alone exceeds the 30 kg ride-share slot.
    const heavy = design('bus27u', 'panels_deployable', 'battery_100', 'comms_xband', 'thermal_ir');
    const stats = computeDesignStats(heavy, partById, orbit, rocketById.get('rideshare'));
    expect(stats.mass).toBeGreaterThan(30);
    expect(stats.massMargin).toBeLessThan(0);
    expect(stats.warnings.some((w) => w.id === 'mass_over')).toBe(true);
  });

  it('cost includes rocket and operations', () => {
    const d = design('bus6u', 'panels_body', 'battery_40', 'comms_uhf', 'camera_visible');
    const stats = computeDesignStats(d, partById, orbit, rocketById.get('rideshare'), 10);
    // hardware 8+1+1.2+0.4+0.6=11.2? No: bus6u .8 + panels .2 + battery .2 + uhf .1 + camera .6 = 1.9
    expect(stats.cost).toBeCloseTo(1.9 + 1.0 + 0.5, 5);
  });

  it('reliability multiplies down', () => {
    const r = computeDesignReliability(design('bus6u', 'panels_body', 'battery_40', 'comms_uhf'), partById);
    expect(r).toBeGreaterThan(0.9);
    expect(r).toBeLessThan(1.0);
  });
});

describe('launch', () => {
  it('blocks overweight designs', () => {
    const check = capacityCheck(35, rocketById.get('rideshare'));
    expect(check.ok).toBe(false);
    expect(check.margin).toBe(-5);
  });

  it('seeded rng makes rolls reproducible', () => {
    const a = launchRoll(0.92, makeRng(42));
    const b = launchRoll(0.92, makeRng(42));
    expect(a).toEqual(b);
  });

  it('reliability 0 never succeeds, 1 always succeeds', () => {
    expect(launchRoll(0, makeRng(1)).success).toBe(false);
    expect(launchRoll(1, makeRng(1)).success).toBe(true);
  });
});
