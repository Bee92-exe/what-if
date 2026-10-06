# WHAT IF? — The Padma Files

> What IF your satellite design decided who got warned in time? A 2D pixel-art space mission game built with NASA data.

A 2D pixel-art, story-driven **space mission design game** built for the
2026 NASA Space Apps Challenge (challenge: *Space Mission Design Game*).

You are the rookie director of a small space agency. A cyclone is forming in
the Bay of Bengal and your agency has no eyes in the sky. Design a satellite,
launch it, fly it day by day — and find out whether your engineering choices
helped real people in time.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build & deploy

```bash
npm run build      # outputs dist/ (relative paths, any static host)
npm run preview    # serve the built version locally
```

## Tests & tools

```bash
npm test           # Vitest unit tests for the pure simulation (src/sim)
npm run validate:data   # JSON schema + reference checks for src/data
npm run balance         # headless balance sampler (10,000 random designs)
```

## Architecture in one paragraph

Everything lives in three layers. **Data** (`src/data/*.json`): parts,
rockets, orbits, missions, events, dialogue — adding content never needs code
changes. **Simulation** (`src/sim/*.js`): pure JavaScript, no Phaser, unit
tested, seeded RNG — the same code balances the game headlessly and plays it
in the browser. **Presentation** (`src/scenes`, `src/ui`, `src/art`): Phaser
3 at 640x360 with integer scaling and a 16-colour palette; sprites are
generated from text at boot (no binary assets required, PNG overrides
supported in `public/assets/sprites/`).

## Design rules

1. Keep the simulation pure — no Phaser imports in `src/sim/`.
2. Be data-driven — content in JSON, never hardcoded in scenes.
3. 16-colour palette only; every sprite uses `src/config.js` PALETTE.
4. No copyrighted assets — fonts/audio CC0/OFL, recorded in `docs/CREDITS.md`.
5. `npm run build` must pass after every milestone.
6. Science claims marked `VERIFY` in data with sources in `docs/CREDITS.md`.

## Credits

Pixel font and any external assets are listed in `docs/CREDITS.md`.
NASA data sources and attribution: `docs/CREDITS.md` and `public/assets/nasa/`.
