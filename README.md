# 🚀 What IF

> *What if your engineering choices decided who got warned in time?*
> A 2D pixel-art, story-driven game where you design, launch, and fly a satellite, then find out how every choice shaped the outcome.

**Built for:** NASA Space Apps Challenge 2026, challenge **"Space Mission Design Game"**
**Team:** *"SleepDeprived Ninjas"*
**Click [HERE](https://bee92-exe.github.io/what-if/) to play**
---

## 📖 The Story

A cyclone is forming in the Bay of Bengal, and the small, fictional **Padma Space Agency** has no eyes in the sky. You are its rookie mission director. With a tight budget, a mass limit, and a deadline, you must build a satellite that can watch the storm.

But there is a ghost in the control room. Nine years ago the agency's first satellite, *Shapla-1*, died in orbit. Everyone calls it bad luck. Your mentor, Kabir-bhai, knows otherwise. By the end of your first mission, you will learn what really happened, and why **"luck is just margin you didn't plan."**

---

## 🎯 What the Challenge Asks, and How the Game Answers

| Challenge requirement | In the game |
|---|---|
| Design a complete space mission | Briefing, spacecraft design, launch, and 10 days of operations |
| Make engineering decisions | Choose the bus, solar panels, battery, antenna, instruments, rocket, and orbit |
| Manage limited resources | Budget, mass, power, and data limits shown as live bars |
| Simulate the mission | A day-by-day operations simulation with events like solar flares and ground-station rain-outs |
| See how each choice shapes success | A debrief that traces the exact cause chain behind your result |

---

## 🎮 How to Play

1. **Briefing:** meet the team and learn the objective, budget, and deadline.
2. **Design:** fill the spacecraft slots with parts. Watch the Mass, Power (day and eclipse), Cost, Data, and Risk bars change as you choose.
3. **Launch:** pick a rocket and an orbit. The chance of success is shown honestly.
4. **Operations:** each mission day, plan which passes to image and which to downlink, then watch the orbit play out and react to events.
5. **Debrief:** get your score, stars, and a plain-language explanation of why things worked or failed.

**Controls:** mouse or touch to click and drag; keyboard (arrow keys, Enter, Esc) also works. Dialogue can be skipped.

---

## 🧠 What You Will Learn

- Every design choice is a trade-off: more power means more mass, and more mass means more cost.
- Batteries must be sized for **eclipse**, not for the average.
- The right instrument depends on the question (clouds, darkness, speed).
- Orbit choice changes coverage, signal strength, and radiation.
- Mission success is measured by impact, not by hardware.

---

## ✨ Features

- Story-driven chapters with a cast of characters and a hidden mystery
- Live engineering bars on the design screen with plain-language warnings
- Day-by-day mission simulation with random but fair events
- Cause-chain debrief that names the real numbers behind your result
- In-game engineer's notebook and glossary
- Pixel-art world built on a 16-colour palette
- Built to run on real NASA Earth-observation data (sea surface temperature and rainfall) for the storm and flood scenarios, with per-record provenance on every value *(see [Data and Credits](#-data-and-credits))*
- A "What if?" retry in every debrief: change one decision and see how the outcome changes

> **Status:** Prologue, Chapter 1 and Chapter 2 are playable end to end. The hosted build and Chapter 3+ are still to come.

---

## 🛠️ Tech Stack

| Area | Tool |
|---|---|
| Game engine | [Phaser 3](https://phaser.io/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Language | JavaScript (ES modules) |
| Tests | Vitest |
| Art | Text-defined pixel sprites generated at runtime (16-colour palette) |

---

## ▶️ Run It Locally

**Requirements:** [Node.js](https://nodejs.org/) 20.19 or newer (or 22.12+), and npm.

```bash
# 1. Clone the repository
git clone https://github.com/Bee92-exe/what-if.git
cd what-if

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open the local address shown in the terminal (usually `http://localhost:5173`).

**Other commands**

```bash
npm run build          # production build into /dist
npm run preview        # preview the production build
npm run test           # run simulation unit tests
npm run validate:data  # validate the JSON content in src/data
npm run balance        # headless balance simulation
```

---

## 📁 Project Structure

```
what-if/
├─ public/assets/        # fonts, optional sprite/audio overrides
├─ src/
│  ├─ scenes/            # Title, Story, Briefing, Design, Launch, Operations, Debrief...
│  ├─ sim/               # pure simulation logic (no Phaser): power, data, orbit, scoring
│  ├─ story/             # dialogue engine and story flags
│  ├─ state/             # game state and save/load
│  ├─ ui/                # pixel UI kit (panels, buttons, bars)
│  ├─ art/               # palette, text sprites, procedural backgrounds
│  ├─ audio/             # music and sound effects
│  └─ data/              # parts, rockets, orbits, missions, events, dialogue (JSON)
├─ tools/                # data validation and headless balance tools
├─ tests/                # unit tests for the simulation
└─ docs/                 # credits, design notes, submission notes
```

The simulation in `src/sim/` is separate from the graphics, and all game content lives in JSON files in `src/data/`, so new parts, events, and chapters can be added without changing code.

---

## 🛰️ Data and Credits

This project is designed to be grounded in open NASA data and research. The
provenance pipeline is in place — every record carries an
`origin: placeholder | derived | nasa` tag, and `npm run validate:data` gates
release — but **the numbers shipping in `src/data/` today are still
placeholders. No dataset below has been ingested yet.** These are the sources
we intend to ingest once the official challenge resource list is confirmed.

| Data / resource | Source | Planned use |
|---|---|---|
| **GHRSST Level 4 MUR Global Foundation Sea Surface Temperature Analysis (v4.1)**, JPL / PO.DAAC | [NASA Earthdata](https://search.earthdata.nasa.gov/search/granules?p=C1996881146-POCLOUD&pg[0][v]=f&pg[0][gsk]=-start_date&q=MUR-JPL-L4-GLOB-v4.1) | Ocean temperature in the Bay of Bengal, which shapes how the cyclone forms and strengthens in Chapter 1 |
| **GPM IMERG Early Run, Daily (GPM_3IMERGDE v07)**, NASA GES DISC | [NASA Earthdata](https://www.earthdata.nasa.gov/data/catalog/ges-disc-gpm-3imergde-07) | Daily rainfall estimates (mm/day) for cyclone rain and monsoon flooding scenarios |
| **Daigle, Bregon and Roychoudhury, "Qualitative Event-based Diagnosis with Possible Conflicts Applied to Spacecraft Power Distribution Systems" (NASA Ames, 2012)** | [NASA DASHlink (PDF)](https://c3.ndc.nasa.gov/dashlink/static/media/publication/8-DaigleEtAl-QED-Safeprocess2012.pdf) | Design reference for the debrief: tracing a fault (battery, relay, inverter, sensor) back to its cause by how the system's measurements deviate |

NASA data is openly shared in accordance with the [EOSDIS Data Use and Citation Guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance). Spacecraft part, rocket, and orbit numbers are simplified for gameplay and are not taken from these datasets.

**Fonts, sounds, and tools** are listed with their licences in [`docs/CREDITS.md`](docs/CREDITS.md).

*All characters, the Padma Space Agency, and the Shapla-1 mission are fictional.*

---

## 🗺️ Roadmap

- [x] Concept, story, and build plan
- [x] Prologue: *The Ghost of Shapla-1*
- [x] Chapter 1: *Eye on the Storm*
- [x] Chapter 2: *The Silent River*
- [ ] Hosted playable build
- [ ] Stretch: Chapter 3 (lunar lander), Chapter 4 (deep space), sandbox mode, Bangla language

*(Tick the boxes as you finish them.)*

---

## 👥 Team

| Name | Role |
|---|---|
| Khushi | Game design and story |
| Sabbir | Programming |
| Faujia | Pixel art and Planning |
| Farin | Research and NASA data |
| Siyam | Research and Testing |


---

## 🙏 Acknowledgements

Thanks to NASA and the Space Apps Challenge organisers, our local event hosts, and our mentors.

*Made with curiosity at the NASA Space Apps Challenge 2026.*
