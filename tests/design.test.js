import { describe, it, expect } from 'vitest';
import {
  emptyDesign,
  installPart,
  removePart,
  canInstall,
  payloadCapacity,
  launchGating,
  budgetStatus,
} from '../src/sim/design.js';
import { computeDesignStats } from '../src/sim/stats.js';
import { partById, rocketById, orbitById } from '../src/utils/dataStore.js';

const orbit = orbitById.get('leo_inclined');
const rocket = rocketById.get('rideshare');
const bus6u = partById.get('bus6u');
const camera = partById.get('camera_visible');
const thermal = partById.get('thermal_ir');
const sar = partById.get('sar_small');

describe('design rules', () => {
  it('payload capacity comes from the bus', () => {
    let d = emptyDesign();
    expect(payloadCapacity(d, partById)).toBe(0);
    d = installPart(d, bus6u);
    expect(payloadCapacity(d, partById)).toBe(2);
  });

  it('payloads toggle on and off', () => {
    let d = installPart(emptyDesign(), bus6u);
    d = installPart(d, camera);
    expect(d.slots.payload).toEqual(['camera_visible']);
    d = installPart(d, camera);
    expect(d.slots.payload).toEqual([]);
  });

  it('bus slot replaces rather than appends', () => {
    let d = installPart(emptyDesign(), bus6u);
    d = installPart(d, partById.get('bus12u'));
    expect(d.slots.bus).toBe('bus12u');
    expect(d.slots.payload).toEqual([]);
  });

  it('payload install is blocked when the bus is full', () => {
    let d = installPart(emptyDesign(), bus6u);
    d = installPart(d, camera);
    d = installPart(d, thermal);
    const check = canInstall(d, sar, partById, ['sar_small']);
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('2 instruments');
  });

  it('locked parts are rejected with a reason', () => {
    const d = installPart(emptyDesign(), bus6u);
    const check = canInstall(d, sar, partById, []);
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('CH2');
  });

  it('removePart clears the right slot', () => {
    let d = installPart(emptyDesign(), bus6u);
    d = installPart(d, camera);
    d = removePart(d, 'camera_visible');
    expect(d.slots.payload).toEqual([]);
    d = removePart(d, 'bus6u');
    expect(d.slots.bus).toBeNull();
  });

  it('installPart does not mutate the original design', () => {
    const d = installPart(emptyDesign(), bus6u);
    const before = JSON.stringify(d);
    installPart(d, camera);
    expect(JSON.stringify(d)).toBe(before);
  });
});

describe('launch gating', () => {
  const mission = { budget: 6.0, deadlineDays: 10 };

  it('blocks an empty design with one blocker per empty slot', () => {
    const d = emptyDesign();
    const stats = computeDesignStats(d, partById, orbit, rocket);
    const gate = launchGating(d, stats);
    expect(gate.canLaunch).toBe(false);
    expect(gate.blockers.map((b) => b.id)).toEqual(['no_bus', 'no_panels', 'no_battery', 'no_comms', 'no_payload']);
  });

  it('allows a valid design', () => {
    let d = installPart(emptyDesign(), bus6u);
    d = installPart(d, partById.get('panels_deployable'));
    d = installPart(d, partById.get('battery_100'));
    d = installPart(d, partById.get('comms_sband'));
    d = installPart(d, thermal);
    const stats = computeDesignStats(d, partById, orbit, rocket);
    const gate = launchGating(d, stats);
    expect(gate.blockers).toEqual([]);
    expect(gate.canLaunch).toBe(true);
  });

  it('blocks an overweight design', () => {
    let d = installPart(emptyDesign(), partById.get('bus27u'));
    d = installPart(d, partById.get('panels_deployable'));
    d = installPart(d, partById.get('battery_100'));
    d = installPart(d, partById.get('comms_sband'));
    d = installPart(d, thermal);
    const stats = computeDesignStats(d, partById, orbit, rocket);
    const gate = launchGating(d, stats);
    expect(gate.canLaunch).toBe(false);
    expect(gate.blockers.some((b) => b.id === 'mass_over')).toBe(true);
  });

  it('budget status reports overspend', () => {
    let d = installPart(emptyDesign(), partById.get('bus12u'));
    d = installPart(d, partById.get('panels_deployable'));
    d = installPart(d, partById.get('battery_100'));
    d = installPart(d, partById.get('comms_xband'));
    d = installPart(d, camera);
    d = installPart(d, thermal);
    const stats = computeDesignStats(d, partById, orbit, rocketById.get('small'), mission.deadlineDays);
    const b = budgetStatus(stats, mission);
    expect(b.over).toBe(true);
    expect(b.overBy).toBeGreaterThan(0);
    expect(b.fraction).toBe(1);
  });
});
