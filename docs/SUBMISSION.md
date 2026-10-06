# Space Apps Submission — Mission Director: The Padma Files

**Challenge:** Space Mission Design Game
**Team:** (fill in) · **Local event:** (fill in)

## The game

You are the rookie director of a small, fictional space agency in a
Bangladesh-inspired delta. A cyclone is forming in the Bay of Bengal and the
agency has no eyes in the sky. You design a satellite from parts (bus, panels,
battery, comms, instruments), choose a rocket and an orbit, launch it, fly ten
mission days, and find out whether your engineering choices warned the coast
in time.

## How it maps to the challenge

| Challenge requirement | Where it lives |
|---|---|
| Design a complete mission | Tutorial + Chapter 1/2: design → launch → operations → debrief |
| Make engineering decisions | Trade-offs on mass, power (day **and** eclipse), data, cost, risk — every part pushes on several at once |
| Manage limited resources | $6M budget, 30 kg ride-share slot, 100 Wh battery, 1 Mbps downlink, 10 days |
| Evaluate how choices shape success | The debrief's cause chain names the exact numbers that decided the outcome; the outcome screen reports how many coastal villages were warned in time |

## How to play

- **Goal:** capture usable cyclone observations and get them to the ground
  before landfall (day 10).
- **Design:** pick parts; watch the six bars; warnings tell you *why* something
  is wrong. LAUNCH is blocked only by hard constraints (missing parts,
  overweight).
- **Launch:** choose rocket and orbit; the odds shown are the odds used.
- **Operations:** each day, set the plan (imaging / downlink / power-save),
  watch the orbit, react to one event, read the satellite's log.
- **Debrief:** stars, score breakdown, and the three moments that decided it.
  "What if?" takes you back to the design room with the same constraints.

## What you learn

- Everything is a trade-off; margin is what saves missions.
- The right instrument depends on the question — clouds that blind a camera are
  data for a thermal eye, and radar sees through anything.
- Orbit choice changes coverage, eclipse time, and radiation.
- Success is measured by impact on the ground, not by hardware.

## NASA data & resources

Placeholders are in use today; the ingestion pipeline is built
(`tools/ingest_nasa_data.js` slot + `origin: placeholder|derived|nasa`
provenance on every record, `validate_data.js --strict` gates release).
Candidate sources to confirm against the official challenge resource list:
NASA Small Spacecraft Technology State-of-the-Art, NASA LSP launch vehicle
performance data, NSSDCA, NASA open data portal, NASA Worldview/GIBS imagery.

**Every real-world claim is marked `VERIFY` in the data files** and must have a
source in `docs/CREDITS.md` before shipping.

## Tech

Phaser 3 + Vite, plain JavaScript. 320×180 pixel art, 16-colour palette, all
sprites generated from text at boot (no binary assets). Pure simulation layer
(`src/sim/`) unit-tested with Vitest (59 tests) and reused by the headless
balance tool.

## Checklist

- [x] Playable build (`npm run build` → `dist/`, static hosting ready)
- [x] README with run/build instructions
- [x] Credits for every font, tool, and dataset (`docs/CREDITS.md`)
- [x] "How to play" and "what you learn"
- [x] Balance tool + notes (`docs/DESIGN_NOTES.md`)
- [ ] Public URL (deploy `dist/` to GitHub Pages / itch.io / Netlify)
- [ ] Trailer (60–90 s) and 4–6 screenshots
- [ ] Team names and local event details filled in
- [ ] AI-use disclosure per local event rules
- [ ] NASA dataset ingestion once the official resource list drops
