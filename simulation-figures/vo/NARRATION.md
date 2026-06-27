# Narration — one line per beat

The guided tour reads one calm line per beat in the **`bm_george`** voice. The clips are
**rendered** (`01.mp3 … 08.mp3` + `manifest.json`); the tour auto-detects them and paces each
beat to its clip length. Delete the clips / manifest to fall back to **caption-only**.

| # | Beat | Dur | Line |
|---|------|-----|------|
| 01 | Intro (wide) | 10.5s | An innovation center isn't a building — it's a capability you can walk through. Six zones, in three working clusters, on one operating system. |
| 02 | Zone 1 — Mission Framing | 13.8s | It begins in the Think Tank. In Mission Framing, a raw problem becomes a sharp, well-defined challenge — on writable walls, a live mission board, and in pods secure enough for sensitive work. |
| 03 | Zone 6 — Knowledge Hub | 13.7s | Beside it, the Knowledge and Research Hub — the memory of the center. Technology scouting, threat intelligence, and the archive of past missions, so every challenge leaves reusable knowledge behind. |
| 04 | Zone 2 — Digital Experimentation | 14.8s | On the Workshop Floor, the Digital Experimentation Lab proves the idea in software first. Simulation, AI, and a digital twin test a modification a hundred times before a single part is cut. |
| 05 | Zone 3 — Rapid Prototyping & Integration | 15.0s | Beside it, Rapid Prototyping and Integration — where ideas become things. Metal and polymer printing, an electronics bench, and a bay where a wearable is instrumented and read by AI in real time. |
| 06 | Zone 4 — Test & Evaluation | 15.2s | In the Showcase wing, Test and Evaluation puts the prototype under control. Instrumented rigs and repeatable protocols turn a promising demonstrator into hard evidence, before anything reaches the field. |
| 07 | Zone 5 — Demonstration | 13.0s | And the Demonstration area, where the center tells its story — live stations for leadership and partners, an idea-to-field timeline, and a gallery that attracts talent, vendors, and budget. |
| 08 | Finale (wide) | 10.3s | Six zones. One capability — the physical expression of an innovation operating system, turning challenges into validated outcomes. |

Total narration ≈ 1:46. Re-render or change voice with `./generate.sh`
(e.g. `VOICE=am_adam ./generate.sh`).
