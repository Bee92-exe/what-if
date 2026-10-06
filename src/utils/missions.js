import ch1 from '../data/missions/ch1_storm.json' with { type: 'json' };
import ch2 from '../data/missions/ch2_river.json' with { type: 'json' };
import { getState } from '../state/gameState.js';

const MISSIONS = { 1: ch1, 2: ch2 };

export default function missionFor() {
  const chapter = getState().chapter ?? 1;
  return MISSIONS[chapter] ?? ch1;
}
