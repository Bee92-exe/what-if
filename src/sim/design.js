export const SLOT_ORDER = ['bus', 'power_panel', 'power_battery', 'comms', 'payload', 'extra'];

export const SLOT_LABELS = {
  bus: 'BUS',
  power_panel: 'PANELS',
  power_battery: 'BATTERY',
  comms: 'COMMS',
  payload: 'PAYLOAD',
  extra: 'EXTRA',
};

export function emptyDesign() {
  return { slots: { bus: null, power_panel: null, power_battery: null, comms: null, payload: [], extra: null } };
}

export function payloadCapacity(design, byId) {
  const bus = design.slots.bus ? byId.get(design.slots.bus) : null;
  return bus?.payloadSlots ?? 0;
}

export function isInstalled(design, partId) {
  const s = design.slots;
  return s.bus === partId || s.power_panel === partId || s.power_battery === partId || s.comms === partId || s.extra === partId || s.payload.includes(partId);
}

export function isUnlocked(part, unlockedBy, unlockedParts = []) {
  if (!unlockedBy) return true;
  if (unlockedBy === 'start') return true;
  return unlockedParts.includes(part.id);
}

export function canInstall(design, part, byId, unlockedParts = []) {
  if (!isUnlocked(part, part.unlockedBy, unlockedParts)) {
    return { ok: false, reason: `Locked until ${part.unlockedBy.toUpperCase()}` };
  }
  if (part.slot === 'payload') {
    const cap = payloadCapacity(design, byId);
    const installed = design.slots.payload.length;
    if (cap === 0) return { ok: false, reason: 'Choose a bus first' };
    if (installed >= cap && !design.slots.payload.includes(part.id)) {
      return { ok: false, reason: `Bus holds ${cap} instruments` };
    }
  }
  return { ok: true };
}

export function installPart(design, part) {
  const next = { slots: { ...design.slots, payload: [...design.slots.payload] } };
  if (part.slot === 'payload') {
    const i = next.slots.payload.indexOf(part.id);
    if (i >= 0) next.slots.payload.splice(i, 1);
    else next.slots.payload.push(part.id);
  } else {
    next.slots[part.slot] = next.slots[part.slot] === part.id ? null : part.id;
  }
  return next;
}

export function removePart(design, partId) {
  const next = { slots: { ...design.slots, payload: design.slots.payload.filter((id) => id !== partId) } };
  for (const slot of ['bus', 'power_panel', 'power_battery', 'comms', 'extra']) {
    if (next.slots[slot] === partId) next.slots[slot] = null;
  }
  return next;
}

export function launchGating(design, stats) {
  const blockers = [];
  const s = design.slots;
  if (!s.bus) blockers.push({ id: 'no_bus', text: 'No bus selected.' });
  if (!s.power_panel) blockers.push({ id: 'no_panels', text: 'No solar panels: nothing to eat.' });
  if (!s.power_battery) blockers.push({ id: 'no_battery', text: 'No battery: the first eclipse would kill her.' });
  if (!s.comms) blockers.push({ id: 'no_comms', text: 'No comms: nobody would hear her.' });
  if (!s.payload.length) blockers.push({ id: 'no_payload', text: 'No instruments: nothing to see with.' });
  if (stats.massMargin < 0) blockers.push({ id: 'mass_over', text: `Overweight by ${Math.abs(stats.massMargin).toFixed(1)} kg.` });
  const covered = new Set(['no_bus', 'no_panels', 'no_battery', 'no_comms', 'no_payload', 'mass_over', 'power_missing', 'comms_missing']);
  for (const e of stats.warnings) {
    if (e.severity === 'error' && !covered.has(e.id)) blockers.push({ id: e.id, text: e.text });
  }
  return { canLaunch: blockers.length === 0, blockers };
}

export function budgetStatus(stats, mission) {
  const over = stats.cost - mission.budget;
  return {
    over: over > 0,
    overBy: Math.max(0, over),
    fraction: Math.min(1, stats.cost / mission.budget),
  };
}
