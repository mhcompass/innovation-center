# The Center — Zoned Blueprint · Realistic figures (Three.js prototype)

> **Variant.** This is the *realistic-figures* version of `innovation-center-space/` — **same
> content, text, zones and `bm_george` narration**, but the people are **articulated humanoids**
> (torso, head, jointed arms + legs) that **walk and move** when their zone is selected, shaded
> by the scene lights instead of glowing capsules. The camera also frames each zone a little
> closer so the figures read. Keep both; pick whichever look you prefer.

A companion to the *From Challenge to Outcome* vision piece. That one shows the **methodology**;
this one shows its **physical expression** — the Innovation & R&D Center as zoned space.
You don't tour a building, you walk a **capability**: an interactive top-down/isometric floor
plan of **six zones in three working clusters**, sitting on a glowing **substrate** of
*Methodology · Governance · Technology* (the innovation operating system).

It is **fully standalone** — its own vendored Three.js and audio; no link to the vision page.

See [`SCRIPT.md`](./SCRIPT.md) for the beat sheet.

## Run it

ES modules must be served over HTTP (not opened as a file):

```bash
cd "innovation-center-space"
python3 -m http.server 8000
# then open http://localhost:8000
```

Click **▶ Tour the center**. The camera walks the six zones (~50s) with captions and a
right-side inspector for each zone. When the tour ends, **drag to orbit** and **click any
zone** to inspect it.

### Presenter controls
- **Space** — pause / resume
- **← / →** — step backward / forward through zones
- **R** — replay the tour from the top
- **M** — mute / unmute
- **Click any progress pip** (top-right) — jump straight to that zone
- **Click any zone tile** — jump to it (during the tour) or inspect it (after)

## The six zones (3 clusters)

| Cluster | Zone | Purpose |
|---|---|---|
| **Think Tank** *(amber)* | 1 · Mission Framing & Collaboration | Define the challenge — workshops, leadership, classified framing |
| | 6 · Knowledge & Research Hub | Reusable knowledge — emerging-tech & threat-intel library, scouting, archive |
| **Workshop Floor** *(cyan)* | 2 · Digital Experimentation Lab | Simulate & prove in software first — AR/VR, digital twin, AI |
| | 3 · Rapid Prototyping & Integration Lab | Make it — 3D print (incl. metals), electronics, sensors, integration bay |
| **Showcase** *(teal)* | 4 · Test & Evaluation Area | Controlled, instrumented proof before the field |
| | 5 · Showcase & Demonstration Area | Tell the story — live demos, "Idea to Field" walls, gallery |

> **Note for client review:** *Zone 6 (Knowledge & Research Hub)* had no description in the
> original brief; its content here is inferred from the "reference library / threat-intelligence
> / reusable knowledge" cues. Confirm or adjust.

## Voiceover
A narrated track is **included** — eight `bm_george` clips (`vo/01.mp3 … 08.mp3` +
`vo/manifest.json`), one detailed line per beat (~1:46 total). The tour auto-detects the
clips and **paces each beat to its clip length**; the ambient bed ducks under the narration,
and the Sound button / **M** silences both. Remove the clips/manifest to fall back to
caption-only — nothing breaks.

Re-render, lengthen, or change the voice with the same script:
```bash
cd vo
KOKORO_BASE_URL=http://100.103.247.112:8000 ./generate.sh    # render on Spark, bm_george
VOICE=am_adam KOKORO_BASE_URL=http://100.103.247.112:8000 ./generate.sh   # different narrator
./generate.sh                                                # local Kokoro (OrbStack)
```
Edit the `lines=( … )` array in `generate.sh` to change the script.
See [`vo/NARRATION.md`](./vo/NARRATION.md) for the current lines.

## Tech notes
- **Fully offline / air-gapped.** Three.js r160 is vendored under `vendor/three/`; the import
  map points at local files — no CDN, no build step.
- **Audio is procedural** (`audio.js`, Web Audio API): a low ambient bed + sparse cues.
  (Browsers require a click before audio starts — the Play button covers that.)
- Postprocessing bloom drives the glow; all visuals are procedural (no external assets).

## Tuning knobs (in `main.js`)
- `ZONES` — the six zones: cluster, grid position, name, purpose, capability list.
- `CLUSTERS` — the three clusters and their colours.
- `beats[]` — tour timing, captions, and per-beat camera offsets.
- `COL` — palette (amber = Think Tank, cyan = Workshop Floor, teal = Showcase).
- `bloom` strength / threshold — overall glow intensity.
