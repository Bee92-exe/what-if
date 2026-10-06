import partsData from '../data/parts.json' with { type: 'json' };
import rocketsData from '../data/rockets.json' with { type: 'json' };
import orbitsData from '../data/orbits.json' with { type: 'json' };

export const parts = partsData.parts;
export const rockets = rocketsData.rockets;
export const orbits = orbitsData.orbits;

export const partById = new Map(parts.map((p) => [p.id, p]));
export const rocketById = new Map(rockets.map((r) => [r.id, r]));
export const orbitById = new Map(orbits.map((o) => [o.id, o]));
