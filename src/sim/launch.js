export function capacityCheck(designMass, rocket) {
  return {
    ok: designMass <= rocket.capacityKg,
    margin: rocket.capacityKg - designMass,
  };
}

export function launchRoll(rocketReliability, rng) {
  return {
    probability: rocketReliability,
    success: rng() < rocketReliability,
  };
}
