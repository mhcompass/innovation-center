# Innovation & R&D Center — cinematic case walkthroughs

Two standalone, self-running Three.js walkthroughs of how the **Innovation & R&D Center** takes a
real mission challenge through its method — from challenge to a fielded capability — behind one
landing page. Fully **scripted/synthetic** and **offline / air-gapped** (vendored three.js,
procedural audio, pre-rendered voiceover).

| Route | Demo | What it shows |
|-------|------|---------------|
| `/linear/` | **Linear Case · Counter-drone** | A counter-drone (C-UAS) challenge slides station to station down a straight track — framing → scan → digital twin → integration → test & eval → **decision gate** → field trial. |
| `/simulation-figures/` | **The Center · Zoned Blueprint** | The center as space — an isometric floor plan of **six zones in three working clusters** on one operating system, with **realistic walking figures** moving through it. |

## Run locally
Static site — serve over HTTP (ES-module import maps need `http://`, not `file://`):

```bash
python3 -m http.server 8080
# open http://localhost:8080  →  pick a view
```

## Deploy (nginx + Tailscale)
See **[DEPLOY_TAILSCALE.md](DEPLOY_TAILSCALE.md)**. In short, on spark:

```bash
docker compose up -d --build                      # http://localhost:46750
# or, on the tailnet:
export TS_AUTHKEY=tskey-auth-xxxxxxxx
docker compose -f docker-compose.yml -f docker-compose.tailscale.yml \
    --profile production up -d --build            # https://innovation-center.<tailnet>.ts.net
```

## Layout
```
innovation-center/
├─ index.html                landing page
├─ linear/                   the Linear Case demo (self-contained)
├─ simulation-figures/       the Live Case in the Center demo (self-contained)
├─ Dockerfile  nginx.conf
├─ docker-compose.yml  docker-compose.tailscale.yml  tailscale/serve.json
└─ DEPLOY_TAILSCALE.md
```

Each demo has its own `README.md` / `SCRIPT.md` and a `vo/generate.sh` to re-render narration.
