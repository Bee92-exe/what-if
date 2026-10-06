import { MINUTES_PER_DAY } from './orbit.js';
import { computePower, computeDataBudget, installedParts, mbpsToMBPerMin } from './power.js';


export const DEFAULT_PLAN = { imaging: true, downlink: true, powerSave: false };

export function createMissionState(design, byId, rocket, orbit, mission, satelliteName = 'SHAPLA-2') {
  const power = computePower(design, byId, orbit);
  const batteryCapacityWh = power.batteryHave;
  return {
    day: 0,
    totalDays: mission.deadlineDays,
    satelliteName,
    design,
    rocketId: rocket.id,
    orbitId: orbit.id,
    batteryWh: batteryCapacityWh,
    batteryCapacityWh,
    bufferMB: 0,
    images: { captured: 0, usable: 0, delivered: 0 },
    objectiveProgress: Object.fromEntries(mission.targets.map((t) => [t.id, { captured: 0, delivered: 0 }])),
    daysLost: 0,
    eventCount: 0,
    lowBatteryDays: 0,
    log: [],
    finished: false,
  };
}

export function instrumentsFor(need, instruments) {
  const can = (p, cloud) => {
    if (p.capabilities?.sees_through_clouds) return true;
    if (p.id === 'thermal_ir') return true;
    if (p.id === 'camera_visible') return cloud < 0.6;
    return false;
  };
  switch (need) {
    case 'thermal': return instruments.filter((p) => p.id === 'thermal_ir' || p.id === 'sar_small');
    case 'visible_or_thermal': return instruments.filter((p) => p.id === 'camera_visible' || p.id === 'thermal_ir' || p.id === 'sar_small');
    case 'any': default: return instruments;
  }
}

export function captureBlocked(part, cloud, isNight) {
  if (part.capabilities?.sees_through_clouds) return false;
  if (part.id === 'thermal_ir') return false;
  if (part.id === 'camera_visible') return isNight || cloud >= 0.6;
  return false;
}

export function runDay(prev, plan, byId, orbit, mission, rng) {
  if (prev.finished) return { state: prev, log: [] };
  const d = prev.day;
  const cloud = mission.weather.cloudCoverByDay[Math.min(d, mission.weather.cloudCoverByDay.length - 1)];
  const design = prev.design;
  const parts = installedParts(design, byId);
  const power = computePower(design, byId, orbit);
  const data = computeDataBudget(design, byId, orbit, prev.totalDays);
  const log = [];
  const state = {
    ...prev,
    images: { ...prev.images },
    objectiveProgress: Object.fromEntries(
      Object.entries(prev.objectiveProgress).map(([k, v]) => [k, { ...v }])
    ),
    batteryWh: prev.batteryWh,
    bufferMB: prev.bufferMB,
  };

  const dayStartBattery = state.batteryWh;

  const genPerDayWh = power.avgGen * 24 * (plan.powerSave ? 1 : 1);
  const drawPerDayWh = (plan.powerSave ? power.avgDraw * 0.6 : power.avgDraw) * 24;
  state.batteryWh = Math.min(state.batteryCapacityWh, state.batteryWh + genPerDayWh - drawPerDayWh);
  if (state.batteryWh < power.batteryNeeded) {
    state.lowBatteryDays++;
    log.push({
      day: d + 1,
      type: 'power',
      severity: 'warn',
      text: `Battery low (${Math.round(state.batteryWh)} Wh). Night imaging skipped to survive the dark.`,
      values: { batteryWh: state.batteryWh, needed: power.batteryNeeded },
      partIds: ['battery'],
    });
  }
  const nightImaging = state.batteryWh >= power.batteryNeeded;

  const instruments = parts.filter((p) => p.slot === 'payload');
  const activeTargets = mission.targets.filter((t) => d + 1 >= t.dayRange[0] && d + 1 <= t.dayRange[1]);
  let capturedToday = 0;
  let usableToday = 0;
  let dataTodayMB = 0;

  if (plan.imaging) {
    const passes = orbit.passesPerDay;
    const nightPasses = Math.round(passes * orbit.eclipseFraction);
    const dutyScale = plan.powerSave ? 0.5 : 1;
    const passesToUse = plan.loseOnePass ? passes - 1 : passes;
    let blurryRemaining = plan.blurry ? Math.ceil(passes / 2) : 0;
    for (let p = 0; p < passesToUse; p++) {
      const isNight = p < nightPasses;
      if (isNight && !nightImaging) continue;
      const pool = activeTargets.length
        ? instrumentsFor(activeTargets[0].needs, instruments).filter((pi) => !captureBlocked(pi, cloud, isNight))
        : instruments.filter((pi) => !captureBlocked(pi, cloud, isNight));
      const instrument = pool[0];
      if (!instrument) continue;
      const minutes = orbit.passMinutes * dutyScale * (instrument.dutyCycle ?? 0.3);
      const mb = instrument.dataRateMBperMin * minutes;
      capturedToday++;
      dataTodayMB += mb;
      const blurry = blurryRemaining > 0;
      if (blurry) blurryRemaining--;
      const target = blurry
        ? null
        : activeTargets.find((t) =>
            instrumentsFor(t.needs, instruments).some((pi) => pi.id === instrument.id)
          );
      if (blurry) {
        log.push({
          day: d + 1,
          type: 'imaging',
          severity: 'warn',
          text: `${instrument.name}: smeared by the tracking glitch. Recorded, unusable.`,
          values: { target: null, cloud, mb, blurry: true },
          partIds: [instrument.id],
        });
      }
      if (target) {
        usableToday++;
        state.objectiveProgress[target.id].captured++;
        log.push({
          day: d + 1,
          type: 'imaging',
          severity: 'good',
          text: isNight
            ? `${instrument.name}: night pass over the storm. Cloud-top temperature mapped.`
            : `${instrument.name}: daylight pass. ${cloud > 0.6 ? 'Thick cloud, but the signal is there.' : 'Clear air over the vortex.'}`,
          values: { target: target.id, cloud, mb },
          partIds: [instrument.id],
        });
      }
    }
    state.images.captured += capturedToday;
    state.images.usable += usableToday;
    state.bufferMB += dataTodayMB;
    if (capturedToday === 0) {
      log.push({
        day: d + 1,
        type: 'imaging',
        severity: 'warn',
        text: cloud >= 0.6
          ? 'Total cloud cover. The visible camera sees only white.'
          : 'No usable passes today.',
        values: { cloud },
        partIds: [],
      });
    }
  } else {
    state.daysLost++;
    log.push({ day: d + 1, type: 'imaging', severity: 'warn', text: 'Imaging paused by mission direction.', values: {}, partIds: [] });
  }

  if (plan.downlink && state.bufferMB > 0) {
    const fullCapacity = mbpsToMBPerMin(byId.get(state.design.slots.comms)?.downlinkMbps ?? 0) * orbit.passesPerDay * orbit.passMinutes;
    const capacity = plan.downlinkHalf ? fullCapacity * 0.5 : fullCapacity;
    const delivered = Math.min(state.bufferMB, capacity);
    state.bufferMB -= delivered;
    let deliveredImages = 0;
    for (const t of mission.targets) {
      const pending = state.objectiveProgress[t.id].captured - state.objectiveProgress[t.id].delivered;
      if (pending > 0 && delivered > 0) {
        const moved = Math.min(pending, Math.ceil(delivered / Math.max(1, data.dataPerDay || 1) * pending));
        state.objectiveProgress[t.id].delivered += moved;
        deliveredImages += moved;
      }
    }
    state.images.delivered += deliveredImages;
    log.push({
      day: d + 1,
      type: 'downlink',
      severity: 'good',
      text: `Ground station locked. ${Math.round(delivered)} MB home. ${deliveredImages} image set(s) delivered.`,
      values: { delivered, deliveredImages },
      partIds: ['comms'],
    });
  }

  state.day = d + 1;
  if (state.day >= state.totalDays) state.finished = true;

  const dayLog = {
    day: d + 1,
    cloud,
    capturedToday,
    usableToday,
    batteryStart: dayStartBattery,
    batteryEnd: state.batteryWh,
    bufferEnd: state.bufferMB,
    entries: log,
  };
  state.log = [...prev.log, ...log.map((e) => ({ ...e }))].slice(-500);
  return { state, log: dayLog };
}

export function scienceDelivered(state, mission) {
  let got = 0;
  let total = 0;
  const progress = state.objectiveProgress ?? {};
  for (const t of mission.targets) {
    total += t.weight;
    got += t.weight * Math.min(1, progress[t.id]?.delivered ?? 0);
  }
  return total > 0 ? got / total : 0;
}
