# Audio files

Drop the following mp3s into this directory (exact filenames). The game works
without them — each missing file logs one console info line and stays silent.

| File | Used for | Loop | Volume |
|---|---|---|---|
| `ambient_space.mp3` | Background ambience, starts on first interaction | yes | 0.28 |
| `proximity_tone.mp3` | Rises as the ship nears a scannable body | no | scaled 0–0.5 by distance |
| `scan_fire.mp3` | Scan pulse activation (E press) | no | 0.7 |
| `scan_complete.mp3` | Info panel open | no | 0.65 |
| `moon_unlock.mp3` | Moons unlocking after a planet's first scan | no | 0.6 |
| `thruster.mp3` | Engine loop, volume rides ship speed | yes | scaled 0–0.4 by speed |
| `comet_detected.mp3` | One-shot eerie tone when the comet appears | no | 0.55 |
| `boost.mp3` | Turbo engaged (Shift + W) — warp/whoosh | no | 0.6 |
| `objective_complete.mp3` | An objective ticks off in the checklist | no | 0.6 |
| `ui_click.mp3` | UI / button interactions | no | 0.35 |

Sourcing tips: freesound.org / pixabay.com (CC0). Keep loops seamless
(`ambient_space`, `thruster`); keep one-shots short (<2s) except the comet tone.
