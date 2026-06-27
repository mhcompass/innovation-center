#!/usr/bin/env bash
# Render the voiceover with Kokoro (OpenAI-compatible /v1/audio/speech).
#
# Default points at the LOCAL Kokoro container (OrbStack). To render with
# Spark instead, just override the base URL, e.g.:
#   KOKORO_BASE_URL=http://100.103.247.112:8000 ./generate.sh
# Pick a different narrator with VOICE=am_michael ./generate.sh
#
# Voices: bm_george (UK narrator, default), am_michael (US male), bf_emma (UK F),
#         af_heart (US F warm), am_adam (US male).
#
# Without the rendered clips + manifest.json the piece plays CAPTION-ONLY.
set -euo pipefail

BASE="${KOKORO_BASE_URL:-http://itsm-tts.orb.local:8000}"
VOICE="${VOICE:-bm_george}"
MODEL="${KOKORO_MODEL:-kokoro}"
SPEED="${SPEED:-0.95}"
OUT="$(cd "$(dirname "$0")" && pwd)"

lines=(
  "An innovation center isn't a building — it's a capability you can walk through. Six zones, in three working clusters, on one operating system."
  "It begins in the Think Tank. In Mission Framing, a raw problem becomes a sharp, well-defined challenge — on writable walls, a live mission board, and in pods secure enough for sensitive work."
  "Beside it, the Knowledge and Research Hub — the memory of the center. Technology scouting, threat intelligence, and the archive of past missions, so every challenge leaves reusable knowledge behind."
  "On the Workshop Floor, the Digital Experimentation Lab proves the idea in software first. Simulation, AI, and a digital twin test a modification a hundred times before a single part is cut."
  "Beside it, Rapid Prototyping and Integration — where ideas become things. Metal and polymer printing, an electronics bench, and a bay where a wearable is instrumented and read by AI in real time."
  "In the Showcase wing, Test and Evaluation puts the prototype under control. Instrumented rigs and repeatable protocols turn a promising demonstrator into hard evidence, before anything reaches the field."
  "And the Demonstration area, where the center tells its story — live stations for leadership and partners, an idea-to-field timeline, and a gallery that attracts talent, vendors, and budget."
  "Six zones. One capability — the physical expression of an innovation operating system, turning challenges into validated outcomes."
)

echo "Kokoro: $BASE   voice: $VOICE   speed: $SPEED"
for i in "${!lines[@]}"; do
  n=$(printf "%02d" $((i + 1)))
  text="${lines[$i]}"
  tmp="$OUT/.$n.wav"
  payload=$(python3 -c 'import json,sys; print(json.dumps({"model":sys.argv[1],"input":sys.argv[2],"voice":sys.argv[3],"speed":float(sys.argv[4]),"response_format":"wav"}))' "$MODEL" "$text" "$VOICE" "$SPEED")
  curl -fsS -m 120 "$BASE/v1/audio/speech" -H "Content-Type: application/json" -d "$payload" -o "$tmp"
  ffmpeg -y -loglevel error -i "$tmp" -codec:a libmp3lame -q:a 4 "$OUT/$n.mp3"
  rm -f "$tmp"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$n.mp3")
  printf "  %s  %5.2fs  %s\n" "$n" "$dur" "$text"
done

# manifest the frontend reads to know clips exist + their durations
python3 - "$OUT" "$VOICE" <<'PY'
import json, os, sys, subprocess
out, voice = sys.argv[1], sys.argv[2]
lines = [
  "An innovation center isn't a building — it's a capability you can walk through. Six zones, in three working clusters, on one operating system.",
  "It begins in the Think Tank. In Mission Framing, a raw problem becomes a sharp, well-defined challenge — on writable walls, a live mission board, and in pods secure enough for sensitive work.",
  "Beside it, the Knowledge and Research Hub — the memory of the center. Technology scouting, threat intelligence, and the archive of past missions, so every challenge leaves reusable knowledge behind.",
  "On the Workshop Floor, the Digital Experimentation Lab proves the idea in software first. Simulation, AI, and a digital twin test a modification a hundred times before a single part is cut.",
  "Beside it, Rapid Prototyping and Integration — where ideas become things. Metal and polymer printing, an electronics bench, and a bay where a wearable is instrumented and read by AI in real time.",
  "In the Showcase wing, Test and Evaluation puts the prototype under control. Instrumented rigs and repeatable protocols turn a promising demonstrator into hard evidence, before anything reaches the field.",
  "And the Demonstration area, where the center tells its story — live stations for leadership and partners, an idea-to-field timeline, and a gallery that attracts talent, vendors, and budget.",
  "Six zones. One capability — the physical expression of an innovation operating system, turning challenges into validated outcomes.",
]
clips = []
for i, text in enumerate(lines):
    f = f"{i+1:02d}.mp3"
    dur = float(subprocess.check_output(
        ["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",os.path.join(out,f)]).strip())
    clips.append({"file": f, "dur": round(dur, 2), "text": text})
json.dump({"voice": voice, "format": "mp3", "clips": clips},
          open(os.path.join(out, "manifest.json"), "w"), indent=2)
print("  manifest.json written")
PY
echo "Done."
