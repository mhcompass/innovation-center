# Narration — one line per beat (Linear Case: counter-drone / C-UAS)

Read in the **`bm_george`** voice. Render the clips (`01.mp3 … 08.mp3` + `manifest.json`)
with `./generate.sh`; with no clips present the piece runs **caption-only** — nothing breaks.

| # | Beat (station) | Line |
|---|------|------|
| 01 | Mission Framing | A real problem: cheap hostile drones can slip over a forward base with little warning. |
| 02 | Knowledge Scan | It enters the center. We scan radar, RF and acoustic sensors, and prior art. |
| 03 | Digital Twin | In a digital twin, we tune a sensor-fusion AI against simulated drone swarms. |
| 04 | Integration | We integrate a real detect, track and defeat node, and wire the live track feed. |
| 05 | Test & Eval | Under live-fly trials on the range, the evidence comes in: detection out to nearly three kilometres. |
| 06 | Decision | The evidence is in. Now make the call — go, iterate, or stop. |
| 07 | Field Trial | Validated, the system transitions to a forward-base field trial. |
| 08 | Close | One threat in, a validated capability out — and the model and protocol are banked for the next challenge. |

Re-render or change voice with `./generate.sh` (e.g. `VOICE=am_adam ./generate.sh`).
