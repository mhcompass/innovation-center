# Linear Case — beat sheet (Counter-drone / C-UAS)

The C-UAS case run down a **straight station track**. A hostile-drone challenge token enters at
the left and **slides station to station** along the rail; the evidence appears at Test & Eval;
the Decision Gate is the call. Same transition as the galaxy/pipeline simulation — straightened
into a clean line (no zones, no floor plan).

| Beat | Station | On screen | VO clip |
|---|---|---|---|
| 0 | Mission Framing | Hostile-drone token enters; problem = detect & defeat with low false alarms | 01 |
| 1 | Knowledge Scan | Rotating radar dish sweeps — scan radar / RF / acoustic / EO + prior art | 02 |
| 2 | Digital Twin | Tune a sensor-fusion AI in a digital twin vs. simulated swarms | 03 |
| 3 | Integration | Sensor mast — integrate a real detect–track–defeat node, live feed | 04 |
| 4 | Test & Eval | Live-fly trials on the range → **KPI panel** (2.8 km · 94% · 88% · 6%) | 05 |
| 5 | **Decision gate** | **Go / Iterate / Stop.** Iterate → back to Digital Twin → re-test → numbers improve (3.5 km · 97% · 93% · 3%) → gate again | 06 |
| 6 | Field Trial | Validated → forward-base outpost; token turns **teal**; knowledge banked | 07 |
| 7 | Close (wide) | "One threat in, a validated capability out." | 08 |

## Why this version
Same real-case machinery as the simulation pieces, but staged as an **alternative linear view**:
discrete stations in a straight line with the challenge sliding along a rail, instead of the
zoned floor plan. New mission (counter-drone), new station scenes (radar dish, digital-twin cube,
sensor mast, live-fly range, gate arch, forward outpost).

## Reuse
Built on the **simulation** transition engine — the travelling challenge token + trail, the
`#kpi` evidence readout, and the `openGate`/`resolveGate` Decision Gate with the Iterate
loop-back — re-staged onto a straight rail (`railPoint(u)`) with per-station motifs.
