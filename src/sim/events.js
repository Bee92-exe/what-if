import { makeRng } from '../utils/rng.js';


export function pickEvent(pool, eventsById, day, rng, alreadyFired = []) {
  const candidates = pool
    .map((id) => eventsById.get(id))
    .filter((e) => e && e.minDay <= day && !alreadyFired.includes(e.id));
  if (!candidates.length) return null;
  const totalWeight = candidates.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * totalWeight;
  for (const e of candidates) {
    roll -= e.weight;
    if (roll <= 0) return e;
  }
  return candidates[candidates.length - 1];
}

export function applyEffect(state, event, choice, mission, rng) {
  const eff = choice.effect ?? {};
  const next = { ...state, images: { ...state.images }, planOverride: {} };
  const logBits = [];

  if (choice.set) {
    next.flags = { ...(state.flags ?? {}), ...choice.set };
  }
  if (eff.skipDay) {
    next.planOverride = { imaging: false, downlink: true, powerSave: true };
  }
  if (eff.skipImagingToday) {
    next.planOverride = { ...next.planOverride, imaging: false };
  }
  if (eff.powerSaveToday) {
    next.planOverride = { ...next.planOverride, powerSave: true };
  }
  if (eff.downlinkHalf) {
    next.planOverride = { ...next.planOverride, downlinkHalf: true };
  }
  if (eff.costExtra) {
    next.extraCost = (state.extraCost ?? 0) + eff.costExtra;
  }
  if (eff.bufferLossPct) {
    const loss = state.bufferMB * eff.bufferLossPct;
    next.bufferMB = state.bufferMB - loss;
    logBits.push(`${Math.round(loss)} MB of low-value frames dumped.`);
  }
  if (eff.batteryHitPct) {
    const hit = state.batteryCapacityWh * eff.batteryHitPct;
    next.batteryCapacityWh = state.batteryCapacityWh - hit;
    next.batteryWh = Math.min(state.batteryWh, next.batteryCapacityWh);
    logBits.push(`Battery capacity permanently down ${Math.round(hit)} Wh.`);
  }
  if (eff.riskInstrumentDamage) {
    if (rng() < eff.riskInstrumentDamage) {
      next.sciencePenaltyPct = (state.sciencePenaltyPct ?? 0) + 0.15;
      logBits.push('Imaging computer damaged: 15% of remaining science lost.');
      next.eventDamage = true;
    } else {
      logBits.push('The electronics held. No damage.');
    }
  }
  if (eff.loseOnePass) {
    next.planOverride = { ...next.planOverride, loseOnePass: true };
  }
  if (eff.blurryImages) {
    next.planOverride = { ...next.planOverride, blurry: true };
  }

  const logEntry = {
    day: state.day,
    type: 'event',
    severity: 'warn',
    text: `${event.name}: ${choice.outcome}${logBits.length ? ' ' + logBits.join(' ') : ''}`,
    values: { eventId: event.id, choiceId: choice.text },
    partIds: [],
  };
  next.eventCount = (state.eventCount ?? 0) + 1;
  next.log = [...(state.log ?? []), logEntry].slice(-500);
  return { state: next, outcomeText: choice.outcome, logEntry };
}
