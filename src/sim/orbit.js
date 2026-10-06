export const MINUTES_PER_DAY = 1440;

export function passFraction(orbit) {
  return (orbit.passesPerDay * orbit.passMinutes) / MINUTES_PER_DAY;
}

export function eclipseMinutes(orbit) {
  return orbit.periodMin * orbit.eclipseFraction;
}

export function daylightMinutes(orbit) {
  return orbit.periodMin * (1 - orbit.eclipseFraction);
}

export function eclipsesPerDay(orbit) {
  return MINUTES_PER_DAY / orbit.periodMin;
}
