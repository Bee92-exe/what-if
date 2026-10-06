import { eclipseMinutes, MINUTES_PER_DAY } from './orbit.js';


export const POINTING_DEFAULT = 0.9;
export const COMMS_DUTY = 0.5;
export const COMMS_DUTY_ECLIPSE = 0.25;
export const MAX_DEPTH_OF_DISCHARGE = 0.5;
export const POWER_MARGIN_RECOMMENDED = 1.1;

export function installedParts(design, byId) {
  const lookup = (id) => (byId instanceof Map ? byId.get(id) : byId[id]);
  return Object.values(design.slots)
    .flat()
    .filter(Boolean)
    .map(lookup)
    .filter(Boolean);
}

export function computePower(design, byId, orbit) {
  const parts = installedParts(design, byId);
  const bus = parts.find((p) => p.slot === 'bus');
  const panel = parts.find((p) => p.slot === 'power_panel');
  const battery = parts.find((p) => p.slot === 'power_battery');
  const comms = parts.find((p) => p.slot === 'comms');
  const instruments = parts.filter((p) => p.slot === 'payload');
  const extras = parts.filter((p) => p.slot === 'extra');

  const pointing = extras.reduce((eff, p) => Math.max(eff, p.pointingEfficiency ?? 0), POINTING_DEFAULT);

  const panelGen = panel?.genW ?? 0;
  const avgGen = panelGen * (1 - orbit.eclipseFraction) * pointing;

  const busBase = bus?.power ?? 0;
  const commsDraw = (comms?.power ?? 0) * COMMS_DUTY;
  const instrDraw = instruments.reduce((sum, p) => sum + p.power * (p.dutyCycle ?? 0.3), 0);
  const avgDraw = busBase + commsDraw + instrDraw;

  const nightInstrDraw = instruments
    .filter((p) => p.capabilities?.works_at_night)
    .reduce((sum, p) => sum + p.power * (p.dutyCycle ?? 0.3) * 0.5, 0);
  const eclipseDraw = busBase + (comms?.power ?? 0) * COMMS_DUTY_ECLIPSE + nightInstrDraw;

  const eMin = eclipseMinutes(orbit);
  const batteryNeeded = (eclipseDraw * (eMin / 60)) / MAX_DEPTH_OF_DISCHARGE;
  const batteryHave = battery?.capacityWh ?? 0;

  const generationOK = avgGen >= avgDraw * POWER_MARGIN_RECOMMENDED;
  const batteryOK = batteryHave >= batteryNeeded;

  const warnings = [];
  if (!panel || !battery) {
    warnings.push({
      id: 'power_missing',
      severity: 'error',
      text: !panel ? 'No solar panels: you generate 0 W.' : 'No battery: you cannot survive eclipse.',
      relatedParts: [],
    });
  } else {
    if (!generationOK) {
      warnings.push({
        id: 'power_generation_low',
        severity: 'warn',
        text: `Panels give ${avgGen.toFixed(1)} W but you draw ${avgDraw.toFixed(1)} W (with 10% margin).`,
        relatedParts: [panel.id, ...instruments.map((p) => p.id)],
      });
    }
    if (!batteryOK) {
      warnings.push({
        id: 'power_battery_low',
        severity: 'warn',
        text: `Battery covers ${Math.round((batteryHave / Math.max(batteryNeeded, 0.001)) * 100)}% of the eclipse need (${batteryNeeded.toFixed(0)} Wh).`,
        relatedParts: [battery.id],
      });
    }
  }

  return { avgGen, avgDraw, eclipseDraw, batteryNeeded, batteryHave, generationOK, batteryOK, warnings };
}

export function mbpsToMBPerMin(mbps) {
  return (mbps * 60) / 8;
}

export function computeDataBudget(design, byId, orbit, missionDays = 10) {
  const parts = installedParts(design, byId);
  const comms = parts.find((p) => p.slot === 'comms');
  const instruments = parts.filter((p) => p.slot === 'payload');
  const bus = parts.find((p) => p.slot === 'bus');

  const dataPerDay = instruments.reduce(
    (sum, p) => sum + p.dataRateMBperMin * orbit.passesPerDay * orbit.passMinutes * (p.dutyCycle ?? 0.3),
    0
  );
  const downlinkPerDay = comms ? mbpsToMBPerMin(comms.downlinkMbps) * orbit.passesPerDay * orbit.passMinutes : 0;
  const storageGB = bus?.storageGB ?? 0;

  const backlogPerDay = Math.max(0, dataPerDay - downlinkPerDay);
  const missionBacklogMB = backlogPerDay * missionDays;
  const storageMB = storageGB * 1024;
  const bufferOK = backlogPerDay === 0 || storageMB >= missionBacklogMB * 1.2;

  const warnings = [];
  if (!comms) {
    warnings.push({ id: 'comms_missing', severity: 'error', text: 'No comms: you can never send data home.', relatedParts: [] });
  } else if (!bufferOK) {
    warnings.push({
      id: 'data_backlog',
      severity: 'warn',
      text: `Downlink clears ${downlinkPerDay.toFixed(0)} MB/day but you generate ${dataPerDay.toFixed(0)}. Storage fills on day ${Math.max(1, Math.floor(storageMB / Math.max(backlogPerDay, 1)))} — images after that are lost.`,
      relatedParts: [comms.id, ...instruments.map((p) => p.id)],
    });
  }

  return { dataPerDay, downlinkPerDay, storageGB, backlogPerDay, bufferOK, warnings };
}

export function computeDesignReliability(design, byId) {
  const parts = installedParts(design, byId);
  return parts.reduce((r, p) => r * (p.reliability ?? 1), 1);
}
