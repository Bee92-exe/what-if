import { computePower, computeDataBudget, computeDesignReliability, installedParts } from './power.js';


export const OPS_COST_PER_DAY = 0.05;

export function computeDesignStats(design, byId, orbit, rocket, missionDays = 10) {
  const parts = installedParts(design, byId);

  const mass = parts.reduce((s, p) => s + p.mass, 0);
  const massMargin = rocket.capacityKg - mass;

  const hardwareCost = parts.reduce((s, p) => s + p.cost, 0);
  const totalCost = hardwareCost + rocket.cost + OPS_COST_PER_DAY * missionDays;

  const power = computePower(design, byId, orbit);
  const data = computeDataBudget(design, byId, orbit, missionDays);
  const reliability = computeDesignReliability(design, byId);

  const warnings = [...power.warnings, ...data.warnings];
  if (massMargin < 0) {
    warnings.push({
      id: 'mass_over',
      severity: 'error',
      text: `${Math.abs(massMargin).toFixed(1)} kg over the rocket's ${rocket.capacityKg} kg limit. It will not launch.`,
      relatedParts: parts.map((p) => p.id),
    });
  }

  const bus = parts.find((p) => p.slot === 'bus');
  const payloadCount = design.slots.payload?.filter(Boolean).length ?? 0;
  if (bus && payloadCount > bus.payloadSlots) {
    warnings.push({
      id: 'payload_overflow',
      severity: 'error',
      text: `${bus.name} holds ${bus.payloadSlots} instruments, not ${payloadCount}.`,
      relatedParts: [bus.id],
    });
  }

  const bars = {
    mass: mass / rocket.capacityKg,
    powerDay: Math.min(1, power.avgDraw * 1.1 / Math.max(power.avgGen, 0.001)),
    powerEclipse: Math.min(1, power.batteryNeeded / Math.max(power.batteryHave, 0.001)),
    cost: totalCost / 8,
    data: Math.min(1, data.dataPerDay / Math.max(data.downlinkPerDay, 1)),
    risk: 1 - reliability,
  };

  return {
    mass,
    massMargin,
    rocketCapacityKg: rocket.capacityKg,
    cost: totalCost,
    power,
    data,
    reliability,
    warnings,
    bars,
  };
}
