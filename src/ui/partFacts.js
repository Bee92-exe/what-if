const YES = 'YES';
const NO = 'no';

export function factsFor(part) {
  const mass = `${part.mass} kg`;
  const eat = `${part.power} W`;
  const money = `$${Number(part.cost).toFixed(1)}M`;
  switch (part.slot) {
    case 'bus':
      return [
        { label: 'WEIGHS', value: mass },
        { label: 'HOLDS', value: `${part.payloadSlots} eyes` },
        { label: 'REMEMBERS', value: `${part.storageGB} GB` },
        { label: 'COST', value: money },
      ];
    case 'power_panel':
      return [
        { label: 'MAKES', value: `${part.genW} W`, flag: 'good' },
        { label: 'WEIGHS', value: mass },
        ...(part.needsDeployment
          ? [{ label: 'OPENS OUT', value: YES, flag: 'good' }]
          : [{ label: 'OPENS OUT', value: NO }]),
        { label: 'COST', value: money },
      ];
    case 'power_battery':
      return [
        { label: 'STORES', value: `${part.capacityWh} Wh`, flag: 'good' },
        { label: 'WEIGHS', value: mass },
        { label: 'IN THE DARK', value: 'keeps her awake', flag: 'good' },
        { label: 'COST', value: money },
      ];
    case 'comms':
      return [
        { label: 'SENDS HOME', value: `${part.downlinkMbps} Mbps`, flag: 'good' },
        { label: 'EATS', value: eat },
        { label: 'CAN IT SHOUT', value: part.downlinkMbps >= 1 ? 'loudly' : 'softly' },
        { label: 'COST', value: money },
      ];
    case 'payload':
      return [
        { label: 'PICTURES', value: `${part.dataRateMBperMin} MB/min` },
        { label: 'EATS', value: eat },
        {
          label: 'AT NIGHT',
          value: part.capabilities?.works_at_night ? YES : NO,
          flag: part.capabilities?.works_at_night ? 'good' : 'bad',
        },
        {
          label: 'THRU CLOUD',
          value: part.capabilities?.sees_through_clouds ? YES : NO,
          flag: part.capabilities?.sees_through_clouds ? 'good' : 'bad',
        },
      ];
    default:
      return [
        { label: 'HELPS WITH', value: extraHelp(part) },
        { label: 'WEIGHS', value: mass },
        { label: 'EATS', value: eat },
        { label: 'COST', value: money },
      ];
  }
}

function extraHelp(part) {
  if (part.pointingEfficiency) return 'aiming';
  if (part.radiationProtection) return 'Sun rays';
  if (part.canDeorbit) return 'moving';
  return 'the mission';
}

export function headlineFact(part) {
  switch (part.slot) {
    case 'power_panel':
      return `${part.genW} W`;
    case 'power_battery':
      return `${part.capacityWh} Wh`;
    case 'comms':
      return `${part.downlinkMbps} Mbps`;
    case 'payload':
      return `${part.dataRateMBperMin} MB/min`;
    default:
      return `${part.mass} kg`;
  }
}

export function factLine(part) {
  return factsFor(part)
    .map((f) => f.value)
    .join('  ');
}
