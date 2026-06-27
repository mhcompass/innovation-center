# Linear Case — Counter-drone / C-UAS (Three.js prototype)

An **alternative linear view** of a real mission case. Where the zoned pieces
(`innovation-center-space-figures`, `innovation-center-simulation-figures`) work a challenge
**room by room across a floor plan**, this straightens the same idea into a **station track**:
seven stations in a straight line, with the challenge **sliding station to station along a rail**.

The case is **new** — a **counter-drone (C-UAS)** mission, not the heat-strain wearable — so the
scenes are new too: a sweeping radar dish, a digital-twin cube, a sensor mast, a live-fly range,
the gate arch, and a forward outpost.

Fully **standalone / offline / air-gapped** (its own vendored Three.js, procedural audio, and
optional voiceover).

See [`SCRIPT.md`](./SCRIPT.md) for the beat sheet.

## Run it

ES modules must be served over HTTP (not opened as a file):

```bash
cd "innovation-center-linear"
python3 -m http.server 8000
# then open http://localhost:8000
```

Click **▶ Run the case**. A glowing **challenge token** (a hostile drone — red rotor rings, a
downward scan cone) enters at the left and slides down the rail (~58s). At **Test & Eval** an
evidence panel appears; at the **Decision Gate** choose **Go / Iterate / Stop** (auto-advances
after ~9s if left alone). At the end, drag to orbit.

### The case, station by station
Mission Framing → Knowledge Scan → Digital Twin → Integration → **Test & Eval (evidence)** →
**Decision Gate** → Field Trial → knowledge banked.

- **The gate matters:** the evidence shown (2.8 km detection · 94% track accuracy · 88% intercept
  · 6% false alarms) is strong enough that **Go** is defensible. **Iterate** walks the challenge
  **back to the Digital Twin** to re-tune the fusion thresholds, re-tests, and **the numbers
  visibly improve** (3.5 km · 97% · 93% · 3%) before the gate reopens. **Stop** still banks the
  knowledge.
- The token turns **teal** and its threat cone switches off once the system is validated at the
  Field Trial — the threat has become *our* capability.

### Presenter controls
**Space** pause · **← / →** step stations · **R** replay · **M** mute · click a progress pip to
jump · drag to orbit at the end.

## What it is, technically
The **simulation** transition engine, re-staged onto a straight line:
- a travelling **challenge token** (`token`) that rides a straight rail via `railPoint(u)`
  instead of a CatmullRom curve — "same transition, linear mode";
- the `#kpi` evidence readout and the `openGate`/`resolveGate` Decision Gate with the Iterate
  loop-back, ported unchanged;
- per-station **detailed scenes** built in `buildMotif()`, each its own little animated set —
  a holo briefing table with a threat globe + orbiting brief cards; a sweeping radar dish with
  range rings, contacts and a prior-art library; a digital-twin shell with an orbiting *simulated
  swarm* and a live readout; an integrated sensor mast (radar + EO ball + RF antennas) with a
  server rack, status LEDs and an effector turret; a live-fly range where each target gets a
  **tracking bracket** and an **interceptor beam** once trials run; the gate arch with an energy
  curtain, sweeping scan line and Go/Iterate/Stop indicators; and a forward outpost under a
  **protective coverage dome** with a friendly patrol drone — each driven by its own update
  closure in the loop;
- the travelling token is a **quad-rotor** (X-frame arms, four spinning rotor rings, an
  underslung sensor gimbal, a downward threat cone) that turns teal and drops its cone once
  neutralised;
- a glowing **operating-system substrate** (*Methodology · Governance · Technology*) running the
  length of the line, lit once the capability layers engage.

## Voiceover
A calm narrator reads one line per beat (see `vo/NARRATION.md`). Render the clips with
`vo/generate.sh` (Kokoro, `bm_george`); with no clips present the piece runs **caption-only**
and nothing breaks. The ambient bed ducks under narration; the mute button / **M** silences it.
