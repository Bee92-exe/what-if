# Design Notes

Balance decisions and playtest notes. All numbers are placeholders pending the
official NASA dataset drop (plan §4.10); this file records *why* they are what
they are.

## Balance pipeline

`npm run balance` samples random valid designs per rocket/orbit pair and
reports two tiers:

- **launchable** — no hard errors (mass, missing parts): it can leave the pad.
- **mission-viable** — no errors AND no warnings: it will actually deliver the
  science. The plan's 15–30% target applies to this tier.

### First run (2026-10-06, 5000 samples per pair)

| Rocket / orbit | launchable | mission-viable |
|---|---|---|
| rideshare / LEO | 65.8% | 11.2% |
| rideshare / SSO | 66.5% | 15.3% |
| rideshare / high LEO | 66.1% | 10.1% |
| small / LEO | 100% | 16.1% |
| small / SSO | 100% | 21.7% |
| small / high LEO | 100% | 17.7% |

Reading: most random designs can launch (mass is generous), but only ~10–22%
are actually mission-viable — in/near the target band, and the three viable
archetypes are distinct (thermal-only, camera-only, camera+thermal).

### Findings recorded for tuning

1. **Eclipse battery sizing rarely binds.** With a ~35-minute LEO eclipse and
   a 50% depth-of-discharge rule, the 40 Wh battery covers realistic eclipse
   draws; the binding constraint is *daily generation vs draw*. The eclipse bar
   still teaches the concept and will bite harder once real dataset numbers
   replace placeholders.
2. **Mass almost never binds in Chapter 1** (max ch1 build ≈ 25.2 kg vs the
   30 kg ride-share). The 27U bus unlocks in Chapter 2 and makes mass a real
   decision.
3. **Data budget is the sharpest early trade-off.** The camera generates
   560 MB/day against a UHF downlink of 30 MB/day; the mission-length backlog
   check (storage must cover the whole mission's accumulation, not one day)
   makes this fail loudly — which is the intended lesson.

## Simulation notes

- `runDay` is pure; the Operations scene animates what it already decided, and
  the balance tool reuses the same functions.
- Events are seeded (mulberry32). Same seed → same mission, so bug reports and
  balance runs are reproducible.
- The buffer rule was changed from the plan's per-day formula to a
  mission-length check: a backlog you cannot clear before landfall means
  images are lost even if one day's excess fits in storage.
- Launch gating reports one explicit blocker per empty slot (bus, panels,
  battery, comms, payload) instead of duplicating the sim's warnings.
