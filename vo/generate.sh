#!/usr/bin/env bash
# Render the voiceover with Kokoro (OpenAI-compatible /v1/audio/speech).
#
# Default points at the LOCAL Kokoro container (OrbStack). To render with
# Spark instead, just override the base URL, e.g.:
#   KOKORO_BASE_URL=http://100.103.247.112:8000 ./generate.sh
# Pick a different narrator with VOICE=am_michael ./generate.sh
#
# Voices: bm_george (UK narrator), am_michael (US male), bf_emma (UK F),
#         af_bella (US F), af_nicole (US F whisper).
set -euo pipefail

BASE="${KOKORO_BASE_URL:-http://itsm-tts.orb.local:8000}"
VOICE="${VOICE:-bm_george}"
MODEL="${KOKORO_MODEL:-kokoro}"
SPEED="${SPEED:-0.95}"
OUT="$(cd "$(dirname "$0")" && pwd)"

lines=(
  "A real problem: cheap hostile drones can slip over a forward base with little warning."
  "It enters the center. We scan radar, RF and acoustic sensors, and prior art."
  "In a digital twin, we tune a sensor-fusion AI against simulated drone swarms."
  "We integrate a real detect, track and defeat node, and wire the live track feed."
  "Under live-fly trials on the range, the evidence comes in: detection out to nearly three kilometres."
  "The evidence is in. Now make the call — go, iterate, or stop."
  "Validated, the system transitions to a forward-base field trial."
  "One threat in, a validated capability out — and the model and protocol are banked for the next challenge."
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
  "A real problem: cheap hostile drones can slip over a forward base with little warning.",
  "It enters the center. We scan radar, RF and acoustic sensors, and prior art.",
  "In a digital twin, we tune a sensor-fusion AI against simulated drone swarms.",
  "We integrate a real detect, track and defeat node, and wire the live track feed.",
  "Under live-fly trials on the range, the evidence comes in: detection out to nearly three kilometres.",
  "The evidence is in. Now make the call — go, iterate, or stop.",
  "Validated, the system transitions to a forward-base field trial.",
  "One threat in, a validated capability out — and the model and protocol are banked for the next challenge.",
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
