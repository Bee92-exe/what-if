# Credits

Every external asset, font, dataset, and fact source used by Mission Director.

## Fonts

| Asset | Licence | Source |
|---|---|---|
| Press Start 2P (`public/assets/fonts/press-start-2p.ttf`) | SIL Open Font License 1.1 (`OFL-PressStart2P.txt` alongside the font) | Google Fonts / Codeman38 |

All other visuals are generated in code (text sprites + procedural baking) and
carry no external copyright.

## Art

All sprites are authored in-repo as text (`src/art/sprites/*.js`) using the
16-colour palette in `src/config.js`. No external images are used.

**Palette exceptions (documented, intentional):**
- Procedural sky/water gradients interpolate between two palette colours
  (`src/art/procedural.js`), producing intermediate shades only in those
  backgrounds.
- The browser rasterises the pixel font with anti-aliased edges; sprite and UI
  pixels themselves are palette-exact.

## Data

All game numbers are currently `origin: "placeholder"` (Section 4.10 of the
build plan). NASA datasets will be ingested via `tools/ingest_nasa_data.js`
after the official challenge resource list ships; every generated record will
carry a `source` block and be listed here.

## Libraries

| Library | Licence | Use |
|---|---|---|
| Phaser 3.90 | MIT | Game engine |
| Vite | MIT | Build tool |
| Vitest | MIT | Unit tests |
