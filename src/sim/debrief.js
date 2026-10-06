import { scienceDelivered } from './mission.js';

const LESSONS = {
  power: 'Size the battery for the eclipse, not the average.',
  data: 'A downlink slower than your cameras fills the buffer.',
  imaging_cloud: 'Clouds that blind a camera feed a thermal eye.',
  event: 'Margin decides whether bad luck is a story or a funeral.',
  daylost: 'A day of coverage is a resource. Spend it carefully.',
  good: 'With margin the mission looks easy. It was not.',
};

export function buildCauseChain(state, mission) {
  const moments = [];
  let bestBattery = null;
  let worstData = null;

  for (const entry of state.log) {
    if (entry.type === 'power' && entry.values?.batteryWh !== undefined) {
      if (!bestBattery || entry.values.batteryWh < bestBattery.values.batteryWh) bestBattery = entry;
    }
    if (entry.type === 'imaging' && entry.values?.cloud !== undefined && entry.values.cloud >= 0.6) {
      if (!worstData) worstData = entry;
    }
  }

  if (bestBattery) {
    moments.push({
      day: bestBattery.day,
      title: 'Deepest battery dip',
      text: `Battery hit ${Math.round(bestBattery.values.batteryWh)} Wh (design minimum ${Math.round(bestBattery.values.needed)} Wh).`,
      lesson: LESSONS.power,
    });
  }
  if (worstData) {
    moments.push({
      day: worstData.day,
      title: 'Clouds vs the camera',
      text: `Cloud ${(worstData.values.cloud * 100).toFixed(0)}% on day ${worstData.day}. ${worstData.text}`,
      lesson: LESSONS.imaging_cloud,
    });
  }

  const events = state.log.filter((e) => e.type === 'event');
  for (const e of events.slice(0, 1)) {
    moments.push({ day: e.day, title: 'The mission met luck', text: e.text, lesson: LESSONS.event });
  }

  const science = scienceDelivered(state, mission);
  const tier = mission.outcomeTiers.find((t) => science * 100 >= t.minScore);
  moments.push({
    day: state.totalDays,
    title: 'Landfall day',
    text: `${Math.round(science * 100)}% of objectives delivered. ${tier?.text ?? ''}`,
    lesson: science >= 0.6 ? LESSONS.good : LESSONS.data,
  });

  if ((state.daysLost ?? 0) > 0 && moments.length >= 3) {
    moments[2] = {
      day: state.log.find((e) => /paused/i.test(e.text))?.day ?? state.totalDays,
      title: 'Coverage paused',
      text: `${state.daysLost} day(s) of coverage lost to events and orders.`,
      lesson: LESSONS.daylost,
    };
  }

  return moments.slice(0, 3);
}

export function dayHeadline(day) {
  const d = day.day;
  const good = Math.max(0, Math.round(day.good ?? 0));
  const delivered = Math.max(0, Math.round(day.delivered ?? 0));
  const battery = Math.max(0, Math.round(day.batteryWh ?? 0));
  if (good > 0 && delivered > 0) return `Day ${d}: ${good} good picture${good === 1 ? '' : 's'}, ${delivered} MB home.`;
  if (good > 0) return `Day ${d}: ${good} good picture${good === 1 ? '' : 's'}. Battery ${battery} Wh.`;
  if (delivered > 0) return `Day ${d}: no new pictures. ${delivered} MB came home.`;
  if ((day.cloud ?? 0) >= 0.6) return `Day ${d}: cloud kept her camera blind.`;
  return `Day ${d}: a quiet day in orbit. Battery ${battery} Wh.`;
}

export function satelliteVoice(dayLog, state) {
  const lines = [];
  const name = state.satelliteName ?? 'SHAPLA-2';
  if (dayLog.capturedToday > 0) {
    lines.push(dayLog.cloud > 0.6
      ? `Day ${dayLog.day}. Clouds like wet wool. I photographed the top of the storm's anger.`
      : `Day ${dayLog.day}. Clear spiral over the bay. It looks like a staircase for giants.`);
  } else if (dayLog.entries.some((e) => e.severity === 'warn')) {
    lines.push(`Day ${dayLog.day}. Dark or blind today. I kept the memory warm.`);
  }
  if (dayLog.batteryEnd < dayLog.batteryStart) {
    lines.push(`Battery ${Math.round(dayLog.batteryEnd)} Wh and falling. I'm fine. Mostly.`);
  } else {
    lines.push(`Battery ${Math.round(dayLog.batteryEnd)} Wh. ${state.batteryCapacityWh > 60 ? 'Room to spare.' : 'Tight, but enough.'}`);
  }
  if (dayLog.bufferEnd > 2000) {
    lines.push('Storage shelf bending. Someone downstairs please answer the phone.');
  }
  return lines.slice(0, 3);
}
