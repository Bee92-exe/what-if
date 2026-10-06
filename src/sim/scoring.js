import { scienceDelivered } from './mission.js';


export function computeScore(state, stats, mission) {
  const science = scienceDelivered(state, mission) * (1 - (state.sciencePenaltyPct ?? 0));
  const budgetRaw = Math.min(1, mission.budget / Math.max(stats.cost, 0.01));
  const budgetScore = budgetRaw * (state.extraCost ? 0.9 : 1);
  const reliability = stats.reliability;
  const daysLost = Math.min(state.daysLost ?? 0, state.totalDays ?? 10);
  const schedule = Math.max(0, 1 - 0.15 * daysLost);

  const total = 40 * science + 20 * budgetScore + 20 * reliability + 20 * schedule;
  return {
    science,
    budgetScore,
    reliability,
    schedule,
    total: Math.round(total),
    breakdown: [
      { label: 'SCIENCE', weight: 40, value: Math.round(science * 100), detail: `${Math.round(science * 100)}% objectives` },
      { label: 'BUDGET', weight: 20, value: Math.round(budgetScore * 100), detail: `$${stats.cost.toFixed(1)}M of $${mission.budget.toFixed(1)}M` },
      { label: 'RELIABILITY', weight: 20, value: Math.round(reliability * 100), detail: `${Math.round(reliability * 100)}% reliable` },
      { label: 'SCHEDULE', weight: 20, value: Math.round(schedule * 100), detail: daysLost ? `${daysLost}d lost` : 'no days lost' },
    ],
  };
}

export function starsFor(total) {
  if (total >= 85) return 3;
  if (total >= 60) return 2;
  return 1;
}

export function goldBadge(state, stats, mission) {
  const capacity = stats.rocketCapacityKg ?? 30;
  const massHealthy = stats.massMargin >= 0.1 * capacity;
  const powerHealthy = stats.power.generationOK && stats.power.batteryOK;
  const costHealthy = stats.cost <= mission.budget;
  return massHealthy && powerHealthy && costHealthy;
}

export function outcomeTier(score, mission) {
  const tier = mission.outcomeTiers.find((t) => score >= t.minScore) ?? mission.outcomeTiers[mission.outcomeTiers.length - 1];
  return tier;
}
