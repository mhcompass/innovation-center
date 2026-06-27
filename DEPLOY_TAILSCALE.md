# Deploying the Innovation & R&D Center demos to Tailscale (from spark)

A **fully static** site — a landing page plus two self-contained Three.js experiences
(`linear/` and `simulation-figures/`). nginx serves it; a Tailscale sidecar publishes it
privately on the tailnet over HTTPS (Tailscale Serve, not Funnel). Same pattern as
`flexible-fleet-cinematic` / `yourcompass-profile`, minus any API (there's no backend).

```
web → http://localhost:46750                              (the static site)
prod → https://innovation-center.<your-tailnet>.ts.net    (via the tailscale sidecar)
```

Routes:
- `/`                     → landing page
- `/linear/`              → the Linear Case (Counter-drone / C-UAS, straight station track)
- `/simulation-figures/`  → The Center · Zoned Blueprint (six zones / three clusters, walking figures)

## One-time prereqs (Tailscale admin console)
- **DNS → MagicDNS**: enabled
- **DNS → HTTPS Certificates**: enabled
- **Keys → Auth key**: generate a reusable key (tag it, e.g. `tag:innovation`, if you use ACL tags)

## Run on spark
From inside this folder:

```bash
# local only (no tailnet)
docker compose up -d --build
# → http://localhost:46750

# publish on the tailnet
export TS_AUTHKEY=tskey-auth-xxxxxxxx
docker compose -f docker-compose.yml -f docker-compose.tailscale.yml \
    --profile production up -d --build
```

The `innovation-center` node appears in the tailnet within a few seconds; the TLS cert is
provisioned on first request. Then open `https://innovation-center.<your-tailnet>.ts.net`.

## Notes
- **HTTPS matters**: the demos use the Web-Audio API (procedural audio + voiceover), which needs
  a secure context — served over the tailnet's HTTPS, so it works. Audio is same-origin (nginx
  serves each demo's `vo/*.mp3`).
- **Voiceover**: clips are committed (`*/vo/*.mp3`). To re-render, run each demo's
  `vo/generate.sh` against a Kokoro endpoint. With no clips present the demos run caption-only.
- **Rename the node**: change `hostname` + `TS_HOSTNAME` in `docker-compose.tailscale.yml`
  (the URL follows the name).
- **Port**: 46750 was chosen to avoid flexible-fleet-cinematic (46740), yourcompass-profile
  (46730) and mindrop (46720/46721); change the `ports:` mapping + `nginx.conf` `listen` +
  `serve.json` proxy target together if you need a different one.
- **Update**: re-run the same `up -d --build` after pulling new commits.

## Files
- `index.html` — landing page linking to the two demos
- `linear/`, `simulation-figures/` — the self-contained experiences
- `Dockerfile` — nginx:alpine serving the static files
- `nginx.conf` — static serving (immutable cache for `*/vendor/`, cache for `*/vo/*.mp3`, no-store shells)
- `docker-compose.yml` — the `web` service
- `docker-compose.tailscale.yml` — the `tailscale` sidecar (profile `production`)
- `tailscale/serve.json` — Tailscale Serve config (`:443 → web:46750`)
- `.dockerignore` — keeps deploy/junk files out of the image
