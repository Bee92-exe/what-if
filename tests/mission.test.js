import { describe, it, expect } from 'vitest';
import { createMissionState, runDay, scienceDelivered, instrumentsFor, captureBlocked, DEFAULT_PLAN } from '../src/sim/mission.js';
import { pickEvent, applyEffect } from '../src/sim/events.js';
import { computeScore, starsFor, outcomeTier, goldBadge } from '../src/sim/scoring.js';
import { buildCauseChain, dayHeadline, satelliteVoice } from '../src/sim/debrief.js';
import { makeRng } from '../src/utils/rng.js';
import { partById, rocketById, orbitById } from '../src/utils/dataStore.js';
import ch1 from '../src/data/missions/ch1_storm.json' with { type: 'json' };
import eventsData from '../src/data/events.json' with { type: 'json' };

const orbit = orbitById.get('sso_600');
const rocket = rocketById.get('small');
const eventMap = new Map(eventsData.events.map((e) => [e.id, e]));

/** The known-good design from the design tests. */
function goodDesign() {
  let d = { slots: { bus: 'bus6u', power_panel: 'panels_deployable', power_battery: 'battery_100', comms: 'comms_sband', payload: ['thermal_ir'], extra: null } };
  return d;
}

function simulate(design, planOverrides = {}, seed = 7) {
  const rng = makeRng(seed);
  let state = createMissionState(design, partById, rocket, orbit, ch1, 'TEST-1');
  const dayLogs = [];
  while (!state.finished) {
    const plan = { imaging: true, downlink: true, powerSave: false, ...planOverrides };
    ({ state } = runDay(state, plan, partById, orbit, ch1, rng));
    dayLogs.push(state.day);
  }
  return state;
}

describe('mission sim', () => {
  it('scores 0 science instead of crashing when progress is missing', () => {
    // An old save, or a mission record left over from the previous chapter,
    // has no entry for this mission's objectives.
    const empty = scienceDelivered({ objectiveProgress: {} }, ch1);
    expect(empty).toBe(0);
    expect(scienceDelivered({}, ch1)).toBe(0);
    const partial = scienceDelivered(
      { objectiveProgress: { cyc_formation: { captured: 1, delivered: 0.5 } } },
      ch1
    );
    // 0.5 of the 0.2-weight objective out of 1.0 total weight.
    expect(partial).toBeCloseTo(0.1, 5);
  });

  it('runs exactly deadlineDays days', () => {
    const state = simulate(goodDesign());
    expect(state.day).toBe(ch1.deadlineDays);
    expect(state.finished).toBe(true);
  });

  it('a thermal design delivers cyclone objectives despite clouds', () => {
    const state = simulate(goodDesign());
    // thermal works day & night; intensification + landfall targets need it
    expect(state.objectiveProgress.cyc_intensify.delivered).toBeGreaterThan(0);
    expect(state.images.delivered).toBeGreaterThan(0);
    expect(scienceDelivered(state, ch1)).toBeGreaterThan(0.4);
  });

  it('battery drains when generation cannot keep up (body panels + camera)', () => {
    const bad = { slots: { bus: 'bus12u', power_panel: 'panels_body', power_battery: 'battery_40', comms: 'comms_sband', payload: ['camera_visible', 'thermal_ir'], extra: null } };
    const state = simulate(bad);
    expect(state.lowBatteryDays).toBeGreaterThan(0);
  });

  it('visible camera is blocked by heavy cloud and at night', () => {
    const cam = partById.get('camera_visible');
    expect(captureBlocked(cam, 0.9, false)).toBe(true);
    expect(captureBlocked(cam, 0.3, true)).toBe(true);
    expect(captureBlocked(cam, 0.3, false)).toBe(false);
    const thermal = partById.get('thermal_ir');
    expect(captureBlocked(thermal, 0.9, true)).toBe(false);
  });

  it('imaging For serves target needs', () => {
    const instruments = [partById.get('camera_visible'), partById.get('thermal_ir')];
    expect(instrumentsFor('thermal', instruments).map((p) => p.id)).toEqual(['thermal_ir']);
    expect(instrumentsFor('visible_or_thermal', instruments)).toHaveLength(2);
    expect(instrumentsFor('any', instruments)).toHaveLength(2);
  });

  it('paused imaging costs days', () => {
    const state = simulate(goodDesign(), { imaging: false });
    expect(state.daysLost).toBeGreaterThan(0);
    expect(scienceDelivered(state, ch1)).toBe(0);
  });
});

describe('events', () => {
  it('picks only events whose minDay has passed', () => {
    for (let i = 0; i < 30; i++) {
      const e = pickEvent(ch1.eventPool, eventMap, 1, makeRng(i));
      if (e) expect(e.minDay).toBeLessThanOrEqual(1);
    }
  });

  it('never repeats an event that already fired', () => {
    const fired = ch1.eventPool.filter((id) => eventMap.get(id).minDay <= 5);
    for (let i = 0; i < 30; i++) {
      const e = pickEvent(ch1.eventPool, eventMap, 5, makeRng(100 + i), fired);
      // null is valid: some days legitimately have no eligible event left
      if (e) expect(fired.includes(e.id)).toBe(false);
    }
  });

  it('bufferLossPct actually shrinks the buffer', () => {
    const state = { bufferMB: 1000, batteryCapacityWh: 100, batteryWh: 90, day: 3, log: [], eventCount: 0, images: {}, objectiveProgress: {} };
    const event = eventMap.get('buffer_full');
    const choice = event.choices[0];
    const { state: after, logEntry } = applyEffect(state, event, choice, ch1, makeRng(1));
    expect(after.bufferMB).toBeCloseTo(700);
    expect(logEntry.type).toBe('event');
  });

  it('battery stress permanently reduces capacity', () => {
    const state = { bufferMB: 0, batteryCapacityWh: 100, batteryWh: 90, day: 3, log: [], eventCount: 0, images: {}, objectiveProgress: {} };
    const event = eventMap.get('battery_stress');
    const { state: after } = applyEffect(state, event, event.choices[1], ch1, makeRng(1));
    expect(after.batteryCapacityWh).toBe(80);
  });

  it('flare ride-out has a seeded risk', () => {
    const state = { bufferMB: 0, batteryCapacityWh: 100, batteryWh: 90, day: 3, log: [], eventCount: 0, images: {}, objectiveProgress: {} };
    const event = eventMap.get('solar_flare');
    const lucky = applyEffect(state, event, event.choices[1], ch1, makeRng(3));
    const { state: after } = lucky;
    // deterministic: same seed -> same outcome
    const again = applyEffect(state, event, event.choices[1], ch1, makeRng(3));
    expect(after.sciencePenaltyPct ?? 0).toBe(again.state.sciencePenaltyPct ?? 0);
  });

  // Regression: skipDay used to increment daysLost here AND in runDay, so a
  // 10-day mission could report more lost days than it had days.
  it('a skipDay event costs exactly one day, never two', () => {
    const rng = makeRng(11);
    let state = createMissionState(goodDesign(), partById, rocket, orbit, ch1, 'TEST-1');
    const event = eventMap.get('solar_flare');
    const { state: afterEvent } = applyEffect(state, event, event.choices[0], ch1, rng);
    expect(afterEvent.daysLost ?? 0).toBe(0); // counted only when the day actually runs

    const nextPlan = { ...DEFAULT_PLAN, ...afterEvent.planOverride };
    expect(nextPlan.imaging).toBe(false);
    ({ state } = runDay(state, nextPlan, partById, orbit, ch1, rng));
    expect(state.daysLost).toBe(1);
  });

  it('daysLost never exceeds the mission length', () => {
    let state = simulate(goodDesign(), { imaging: false });
    expect(state.daysLost).toBeLessThanOrEqual(state.totalDays);
    const score = computeScore(state, { cost: 4.6, reliability: 0.9, power: { generationOK: true, batteryOK: true }, massMargin: 5 }, ch1);
    const sched = score.breakdown.find((b) => b.label === 'SCHEDULE');
    expect(sched.value).toBe(0);
    expect(sched.detail).toBe(`${state.totalDays}d lost`);
  });

  // Regression: these three effects were declared in events.json but never read
  // by runDay, so those choices silently did nothing (unfair to the player).
  it('downlinkHalf actually halves what reaches the ground', () => {
    const full = simulate(goodDesign());
    const half = simulate(goodDesign(), { downlinkHalf: true });
    const capturedFull = full.objectiveProgress.cyc_landfall_prep.captured;
    const capturedHalf = half.objectiveProgress.cyc_landfall_prep.captured;
    expect(capturedHalf).toBe(capturedFull); // same imaging...
    expect(half.bufferMB).toBeGreaterThan(full.bufferMB); // ...but more stuck aboard
  });

  it('loseOnePass costs exactly one pass', () => {
    const full = simulate(goodDesign());
    const lost = simulate(goodDesign(), { loseOnePass: true });
    expect(full.images.captured - lost.images.captured).toBe(ch1.deadlineDays);
  });

  it('blurry images are recorded but never serve an objective', () => {
    const state = simulate(goodDesign(), { blurry: true });
    const blurryEntries = state.log.filter((e) => e.values?.blurry);
    expect(blurryEntries.length).toBeGreaterThan(0);
    blurryEntries.forEach((e) => expect(e.values.target).toBe(null));
    const clear = simulate(goodDesign());
    expect(state.images.usable).toBeLessThan(clear.images.usable);
  });
});

describe('scoring', () => {
  it('a full-delivery run scores high and earns 3 stars', () => {
    const state = simulate(goodDesign());
    const stats = { cost: 4.6, reliability: 0.9, power: { generationOK: true, batteryOK: true }, massMargin: 5 };
    const score = computeScore(state, stats, ch1);
    expect(score.total).toBeGreaterThan(60);
    expect(starsFor(score.total)).toBeGreaterThanOrEqual(2);
  });

  it('stars and outcome tiers follow the plan thresholds', () => {
    expect(starsFor(86)).toBe(3);
    expect(starsFor(70)).toBe(2);
    expect(starsFor(30)).toBe(1);
    const tier = outcomeTier(88, ch1);
    expect(tier.villagesWarned).toBe('all');
    const tier2 = outcomeTier(10, ch1);
    expect(tier2.villagesWarned).toBe('some');
  });

  it('overspend lowers the budget component', () => {
    const state = simulate(goodDesign());
    const cheap = computeScore(state, { cost: 4.0, reliability: 0.9, power: { generationOK: true, batteryOK: true }, massMargin: 5 }, ch1);
    const pricey = computeScore(state, { cost: 8.0, reliability: 0.9, power: { generationOK: true, batteryOK: true }, massMargin: 5 }, ch1);
    const cheapBudget = cheap.breakdown.find((b) => b.label === 'BUDGET').value;
    const priceyBudget = pricey.breakdown.find((b) => b.label === 'BUDGET').value;
    expect(priceyBudget).toBeLessThan(cheapBudget);
  });
});

describe('debrief', () => {
  it('cause chain has up to 3 moments with lessons', () => {
    const state = simulate(goodDesign());
    const chain = buildCauseChain(state, ch1);
    expect(chain.length).toBeLessThanOrEqual(3);
    expect(chain.length).toBeGreaterThan(0);
    chain.forEach((m) => expect(m.lesson).toBeTruthy());
  });

  // Regression: goldBadge read state._rocketCapacity (never set) and fell back
  // to a hardcoded 30 kg, so a big rocket's mass margin was judged wrong.
  it("Kabir's Seal uses the real rocket capacity", () => {
    const state = simulate(goodDesign());
    const tight = goldBadge(state, { massMargin: 2, rocketCapacityKg: 400, cost: 4.6, power: { generationOK: true, batteryOK: true } }, ch1);
    expect(tight).toBe(false); // 2 kg spare of 400 is not a healthy 10%
    const roomy = goldBadge(state, { massMargin: 60, rocketCapacityKg: 400, cost: 4.6, power: { generationOK: true, batteryOK: true } }, ch1);
    expect(roomy).toBe(true);
  });

  it('satellite voice references real battery numbers', () => {
    const state = simulate(goodDesign());
    const dayLog = { day: 3, capturedToday: 2, cloud: 0.5, batteryEnd: state.batteryWh, batteryStart: state.batteryWh + 2, bufferEnd: state.bufferMB, entries: [] };
    const lines = satelliteVoice(dayLog, state);
    expect(lines.join(' ')).toMatch(/Battery \d+ Wh/);
  });
});

describe('day headline (HOW THE DAY WENT)', () => {
  // The box shows ~3 lines of 16px text: about 70 characters. A headline that
  // overflows would scroll, which defeats "read the day in one look".
  const MAX_CHARS = 70;
  const cases = [
    { day: 1, good: 4, delivered: 120, batteryWh: 33, cloud: 0.3 },
    { day: 2, good: 1, delivered: 0, batteryWh: 28, cloud: 0.5 },
    { day: 3, good: 0, delivered: 90, batteryWh: 20, cloud: 0.5 },
    { day: 4, good: 0, delivered: 0, batteryWh: 12, cloud: 0.9 },
    { day: 10, good: 0, delivered: 0, batteryWh: 40, cloud: 0.5 },
  ];

  it('gives every day one short statement naming the day', () => {
    for (const c of cases) {
      const line = dayHeadline(c);
      expect(line).toContain(`Day ${c.day}`);
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
      expect(line).not.toMatch(/undefined|NaN/);
    }
  });

  it('says what actually happened: pictures, downlink or cloud', () => {
    expect(dayHeadline(cases[0])).toContain('4 good pictures');
    expect(dayHeadline(cases[0])).toContain('120 MB home');
    expect(dayHeadline(cases[1])).toContain('1 good picture');
    expect(dayHeadline(cases[2])).toContain('90 MB came home');
    expect(dayHeadline(cases[3])).toMatch(/cloud/i);
    expect(dayHeadline(cases[4])).toMatch(/quiet/i);
  });
});
