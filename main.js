import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Audio from './audio.js';

// ---------- palette ----------
// Same brand colours as the other pieces; `threat` is the hostile-drone red used for the
// travelling challenge until it is neutralised/validated (then it lerps to teal).
const COL = { amber: 0xffb24d, cyan: 0x56b8ff, teal: 0x3ee6c4, threat: 0xff2247, dim: 0x243a5c, edge: 0x03050a };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// verification hooks (harmless in normal use): ?beat=N jumps to + holds a beat,
// ?fixeddt forces a fixed dt so damped motion/camera still resolve under headless virtual-time.
const PARAMS = new URLSearchParams(location.search);
const FIXED_DT = PARAMS.has('fixeddt');
const BEAT_PARAM = PARAMS.has('beat') ? parseInt(PARAMS.get('beat'), 10) : null;

// ---------- renderer / scene / camera ----------
const host = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = gradientTexture();
scene.fog = new THREE.FogExp2(COL.edge, 0.018);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(-18, 7, 22);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('labels').appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, labelRenderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 8; controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.58;
controls.enabled = false; controls.target.set(0, 1.2, 0);

// ---------- lights ----------
scene.add(new THREE.AmbientLight(0x4060a0, 0.7));
const key = new THREE.PointLight(0x9ec8ff, 60, 160); key.position.set(0, 18, 16); scene.add(key);
const rim = new THREE.DirectionalLight(0x88b4ff, 0.5); rim.position.set(-20, 10, -8); scene.add(rim);

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.95, 0.6, 0.18);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const bloomBase = 0.95;

// ---------- helpers ----------
function gradientTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(256, 215, 30, 256, 256, 380);
  g.addColorStop(0, '#0b1426'); g.addColorStop(0.6, '#070b16'); g.addColorStop(1, '#03050a');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function radialTexture(r, g, b) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const grd = x.createRadialGradient(128, 128, 4, 128, 128, 128);
  grd.addColorStop(0, `rgba(${r},${g},${b},0.9)`);
  grd.addColorStop(0.4, `rgba(${r},${g},${b},0.25)`);
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = grd; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowMat = (hex, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity, toneMapped: false });
function makeLabel(text, cls, y = 0) {
  const el = document.createElement('div'); el.className = cls; el.textContent = text;
  const obj = new CSS2DObject(el); obj.position.y = y; obj.center.set(0.5, 1);
  return { obj, el };
}
function expApproach(v, target, lambda, dt) { v.lerp(target, 1 - Math.exp(-lambda * dt)); }

// ============================================================
//  THE LINEAR TRACK  (a straight rail; the challenge slides station to station)
// ============================================================
const RAIL_Y = 0.75;
const STAGES   = ['Mission Framing', 'Knowledge Scan', 'Digital Twin', 'Integration', 'Test & Eval', 'Decision Gate', 'Field Trial'];
const ARTIFACTS = [
  'Challenge brief — detect & defeat small hostile drones',
  'Sensor & threat-library scan — radar · RF · acoustic · EO',
  'Sensor-fusion AI tuned in a digital twin',
  'Integrated detect–track–defeat node (live feed)',
  'Evidence pack — live-fly intercept trials',
  'Go / Iterate / Stop',
  'Forward-base field trial + reusable knowledge',
];
const N = STAGES.length;
const STATION_GAP = 9;
const stationX = STAGES.map((_, i) => -((N - 1) / 2) * STATION_GAP + i * STATION_GAP); // centred on 0
const RAIL_X0 = stationX[0], RAIL_X1 = stationX[N - 1];

// linear position along the rail (u in 0..1) — the "same transition" as the curve piece,
// just straightened into a line.
function railPoint(u, out) {
  out.set(THREE.MathUtils.lerp(RAIL_X0, RAIL_X1, THREE.MathUtils.clamp(u, 0, 1)), RAIL_Y, 0);
  return out;
}

// the rail itself (a glowing tube), plus a faint ground guide line under it
{
  const railCurve = new THREE.LineCurve3(new THREE.Vector3(RAIL_X0 - 1.5, RAIL_Y, 0), new THREE.Vector3(RAIL_X1 + 1.5, RAIL_Y, 0));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve, 1, 0.05, 8, false), glowMat(COL.dim, 0.6)));
  const guide = new THREE.Mesh(new THREE.PlaneGeometry(RAIL_X1 - RAIL_X0 + 6, 0.5),
    new THREE.MeshBasicMaterial({ color: COL.dim, transparent: true, opacity: 0.18, toneMapped: false }));
  guide.rotation.x = -Math.PI / 2; guide.position.set(0, 0.02, 0); scene.add(guide);
}

// ---------- operating-system substrate (Methodology · Governance · Technology) ----------
// a single glowing baseplate strip running the length of the line — the "innovation OS"
// the whole track sits on. Lights up once the capability layers engage.
const substrate = new THREE.Mesh(
  new THREE.PlaneGeometry(RAIL_X1 - RAIL_X0 + 8, 6),
  new THREE.MeshBasicMaterial({ map: radialTexture(36, 78, 120), transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
substrate.rotation.x = -Math.PI / 2; substrate.position.set(0, -0.04, 0); scene.add(substrate);
const subLabels = ['Methodology', 'Governance', 'Technology'].map((t, i) => {
  const l = makeLabel(t, 'cap-label digital', 0);
  l.obj.position.set(-STATION_GAP * 1.4 + i * STATION_GAP * 1.4, 0.05, 3.1); scene.add(l.obj);
  return l.el;
});

// ============================================================
//  STATIONS  (one pad + motif per stage, in a straight line)
// ============================================================
const animed = []; // per-station update closures (time, dt) => {…}, ticked each frame
const _mc = new THREE.Color(); // scratch colour reused by motif closures

function buildStation(i, name) {
  const grp = new THREE.Group(); grp.position.set(stationX[i], 0, 0); scene.add(grp);

  // pad
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.22, 40), glowMat(COL.dim, 0.55));
  pad.position.y = 0.11; grp.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.04, 12, 60),
    new THREE.MeshBasicMaterial({ color: COL.dim, transparent: true, opacity: 0.5, toneMapped: false }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.24; grp.add(ring);

  // the node the token rides over (kept on the rail height)
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), glowMat(COL.dim, 0.9));
  node.position.y = RAIL_Y; grp.add(node);

  // station-specific motif (sits on the pad)
  buildMotif(i, grp);

  // nameplate hangs BELOW the station (centre.y=0 → text drops downward) so it sits in the
  // clear vertical space under each motif. Heights are staggered by parity so adjacent
  // nameplates never collide when the camera pulls wide on the final shot.
  const lbl = makeLabel(`${i + 1} · ${name}`, 'stage-label', 2.5);
  lbl.obj.position.y = (i % 2) ? -2.1 : -1.0; lbl.obj.center.set(0.5, 0); grp.add(lbl.obj);
  return { grp, pad, ring, node, lbl, name };
}

// small shared prop helpers (kept local to keep the motif code readable)
const dot = (hex, r = 0.05, op = 0.95) => new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), glowMat(hex, op));
const bar = (len, thick, hex, op = 0.85) => new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, len, 6), glowMat(hex, op));
function beamLine(hex, op = 0) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
}
function setBeam(line, ax, ay, az, bx, by, bz) {
  const p = line.geometry.attributes.position.array;
  p[0] = ax; p[1] = ay; p[2] = az; p[3] = bx; p[4] = by; p[5] = bz;
  line.geometry.attributes.position.needsUpdate = true;
}

function buildMotif(i, grp) {
  const A = COL.amber, C = COL.cyan, T = COL.teal, X = COL.threat;
  if (i === 0) {
    // Mission Framing — a holo briefing table: hex plinth, table surface, a rotating
    // threat globe (the problem), orbiting brief cards, and seats around it.
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.62, 0.55, 6), glowMat(A, 0.7));
    plinth.position.y = 0.4; grp.add(plinth);
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 6), glowMat(A, 0.45));
    table.position.y = 0.7; grp.add(table);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12),
      new THREE.MeshBasicMaterial({ color: A, wireframe: true, transparent: true, opacity: 0.7, toneMapped: false }));
    globe.position.y = 1.5; grp.add(globe);
    const globeCore = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), glowMat(A, 0.45));
    globeCore.position.y = 1.5; grp.add(globeCore);
    const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 8, 40), glowMat(A, 0.7));
    orbitRing.position.y = 1.5; grp.add(orbitRing);
    const cards = [0, 1, 2].map(k => {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.22),
        new THREE.MeshBasicMaterial({ color: C, transparent: true, opacity: 0.55, side: THREE.DoubleSide, toneMapped: false }));
      grp.add(c); return c;
    });
    for (let k = 0; k < 4; k++) { // seats / participants around the table
      const a = (k / 4) * Math.PI * 2 + 0.4;
      const s = bar(0.42, 0.07, COL.dim, 0.85); s.position.set(Math.cos(a) * 1.25, 0.32, Math.sin(a) * 1.25); grp.add(s);
    }
    animed.push((time) => {
      globe.rotation.y += 0.01; globe.rotation.x = 0.3;
      orbitRing.rotation.x = Math.PI / 2 + Math.sin(time * 0.6) * 0.5; orbitRing.rotation.z += 0.012;
      globe.position.y = globeCore.position.y = 1.5 + Math.sin(time * 1.4) * 0.05;
      cards.forEach((c, k) => {
        const a = time * 0.5 + k * (Math.PI * 2 / 3);
        c.position.set(Math.cos(a) * 1.0, 1.15 + Math.sin(time * 1.2 + k) * 0.06, Math.sin(a) * 1.0);
        c.lookAt(c.position.x * 2, c.position.y, c.position.z * 2);
      });
    });
  } else if (i === 1) {
    // Knowledge Scan — rotating radar dish on a post, concentric range rings, a sweep
    // sector, blinking contacts, and a stack of prior-art "library" volumes.
    const post = bar(1.1, 0.08, COL.dim, 0.9); post.position.y = 0.65; grp.add(post);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ color: C, transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false }));
    dish.rotation.x = Math.PI * 0.9; dish.position.y = 1.2; grp.add(dish);
    const feed = dot(C, 0.06); feed.position.y = 1.05; grp.add(feed);
    [0.55, 0.95, 1.35].forEach(r => { // range rings on the pad
      const rr = new THREE.Mesh(new THREE.TorusGeometry(r, 0.015, 8, 60), glowMat(C, 0.3));
      rr.rotation.x = Math.PI / 2; rr.position.y = 0.27; grp.add(rr);
    });
    const sweep = new THREE.Mesh(new THREE.RingGeometry(0.2, 1.4, 40, 1, 0, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ color: C, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sweep.rotation.x = -Math.PI / 2; sweep.position.y = 0.3; grp.add(sweep);
    const blips = [0, 1, 2, 3].map(k => {
      const a = k * 1.7, r = 0.5 + (k % 3) * 0.35;
      const b = dot(X, 0.055); b.position.set(Math.cos(a) * r, 0.32, Math.sin(a) * r); grp.add(b);
      return { b, ph: k * 1.3 };
    });
    for (let k = 0; k < 4; k++) { // prior-art library stack
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.34), glowMat(C, 0.4 + k * 0.05));
      v.position.set(-1.25, 0.3 + k * 0.14, 0.2); v.rotation.y = 0.2; grp.add(v);
    }
    animed.push((time) => {
      dish.rotation.y += 0.022; sweep.rotation.z -= 0.03;
      feed.material.opacity = 0.6 + Math.sin(time * 6) * 0.35;
      blips.forEach(o => { o.b.material.opacity = 0.2 + Math.max(0, Math.sin(time * 1.5 + o.ph)) * 0.8; });
    });
  } else if (i === 2) {
    // Digital Twin — wireframe shell around a solid core, an orbiting *simulated swarm*
    // being tested inside the twin, a base grid disc, and a holographic readout panel.
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), glowMat(T, 0.85));
    core.position.y = 1.0; grp.add(core);
    const wire = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshBasicMaterial({ color: C, wireframe: true, transparent: true, opacity: 0.5, toneMapped: false }));
    wire.position.y = 1.0; grp.add(wire);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.03, 32),
      new THREE.MeshBasicMaterial({ color: C, transparent: true, opacity: 0.18, toneMapped: false }));
    disc.position.y = 0.3; grp.add(disc);
    const swarm = [];
    for (let k = 0; k < 6; k++) { const s = dot(X, 0.07, 0.9); grp.add(s); swarm.push(s); }
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5),
      new THREE.MeshBasicMaterial({ color: C, transparent: true, opacity: 0.16, side: THREE.DoubleSide, toneMapped: false }));
    panel.position.set(1.25, 1.05, 0); panel.rotation.y = -0.5; grp.add(panel);
    const bars = [0, 1, 2, 3].map(k => {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), glowMat(T, 0.7));
      b.position.set(1.05 + k * 0.13, 0.95, 0.02); b.rotation.y = -0.5; grp.add(b); return b;
    });
    animed.push((time) => {
      wire.rotation.y += 0.01; wire.rotation.x += 0.006; core.rotation.x += 0.012; core.rotation.y -= 0.01;
      swarm.forEach((s, k) => {
        const a = time * (0.7 + k * 0.12) + k, r = 0.78;
        s.position.set(core.position.x + Math.cos(a) * r, 1.0 + Math.sin(time * 1.5 + k) * 0.45, Math.sin(a) * r);
      });
      bars.forEach((b, k) => { b.scale.y = 0.4 + (Math.sin(time * 2 + k * 1.1) * 0.5 + 0.5); });
    });
  } else if (i === 3) {
    // Integration — a real sensor node: mast with radar dish + EO ball + RF antennas,
    // a server rack with status lights, an effector turret, and cabling between them.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.7, 8), glowMat(COL.dim, 0.9));
    mast.position.y = 0.95; grp.add(mast);
    const dish = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 10, 24), glowMat(A, 0.85));
    dish.position.y = 1.72; dish.rotation.y = Math.PI / 2; grp.add(dish);
    const eo = dot(C, 0.13, 0.9); eo.position.set(0, 1.45, 0.18); grp.add(eo); // EO/IR ball
    [-0.18, 0, 0.18].forEach(o => { // RF antenna fan
      const ant = bar(0.5, 0.015, A, 0.8); ant.position.set(o, 1.95, 0); ant.rotation.z = o * 1.6; grp.add(ant);
    });
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.4), glowMat(COL.dim, 0.8));
    rack.position.set(-0.95, 0.4, 0.1); grp.add(rack);
    const leds = [0, 1, 2, 3].map(k => {
      const l = dot(k % 2 ? C : A, 0.04); l.position.set(-0.72, 0.2 + k * 0.13, 0.12); grp.add(l); return { l, ph: k };
    });
    const turret = new THREE.Group(); turret.position.set(0.85, 0.3, 0); grp.add(turret);
    turret.add(bar(0.3, 0.12, A, 0.85)); // base
    const barrel = bar(0.5, 0.05, A, 0.95); barrel.rotation.z = Math.PI / 2.6; barrel.position.set(0.12, 0.2, 0); turret.add(barrel);
    const c1 = beamLine(C, 0.4); grp.add(c1); setBeam(c1, -0.95, 0.55, 0.1, 0, 0.5, 0); // cable rack→mast
    animed.push((time) => {
      dish.rotation.y += 0.03; turret.rotation.y = Math.sin(time * 0.7) * 0.6;
      leds.forEach(o => { o.l.material.opacity = 0.3 + Math.max(0, Math.sin(time * 4 + o.ph * 1.5)) * 0.7; });
    });
  } else if (i === 4) {
    // Test & Eval — the live-fly range: arena + range rings, target drones, a tracking
    // bracket locked onto each, a ground effector, and interceptor beams once trials run.
    const arena = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 12, 60), glowMat(C, 0.6));
    arena.rotation.x = Math.PI / 2; arena.position.y = 0.3; grp.add(arena);
    [0.7, 1.0].forEach(r => { const rr = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 50), glowMat(C, 0.25));
      rr.rotation.x = Math.PI / 2; rr.position.y = 0.28; grp.add(rr); });
    const turret = new THREE.Group(); turret.position.y = 0.3; grp.add(turret);
    turret.add(bar(0.4, 0.13, C, 0.85));
    const barrel = bar(0.55, 0.05, C, 0.95); barrel.position.y = 0.35; turret.add(barrel);
    const drones = [], brackets = [], beams = [];
    for (let k = 0; k < 3; k++) {
      const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), glowMat(X, 0.95)); grp.add(d); drones.push(d);
      const br = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 4, 4), glowMat(C, 0)); grp.add(br); brackets.push(br);
      const bm = beamLine(C, 0); grp.add(bm); beams.push(bm);
    }
    animed.push((time, dt) => {
      _mc.set(evidenceOn ? T : X);
      turret.rotation.y += dt * 0.8;
      drones.forEach((d, k) => {
        const a = time * (0.8 + k * 0.25) + k * 2.1, r = 0.95;
        d.position.set(Math.cos(a) * r, 1.0 + Math.sin(time * 2 + k) * 0.22, Math.sin(a) * r);
        d.rotation.y += dt * 2; d.material.color.lerp(_mc, dt * 2);
        const br = brackets[k]; br.position.copy(d.position); br.rotation.x += dt * 1.5; br.rotation.y += dt;
        br.material.opacity = THREE.MathUtils.damp(br.material.opacity, evidenceOn ? 0.9 : 0, 4, dt);
        br.material.color.copy(d.material.color);
        const lit = evidenceOn ? 0.6 + Math.max(0, Math.sin(time * 8 + k * 2)) * 0.4 : 0;
        beams[k].material.opacity = THREE.MathUtils.damp(beams[k].material.opacity, lit, 5, dt);
        setBeam(beams[k], 0, 0.65, 0, d.position.x, d.position.y, d.position.z);
      });
    });
  } else if (i === 5) {
    // Decision Gate — the threshold arch: legs + lintel, an energy curtain, a sweeping
    // scan line, and Go/Iterate/Stop indicator lights above.
    const matG = glowMat(T, 0.85);
    [-0.75, 0.75].forEach(x => { const leg = bar(1.7, 0.09, T, 0.85); leg.position.set(x, 0.95, 0); grp.add(leg); });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.18), matG.clone()); top.position.y = 1.8; grp.add(top);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6),
      new THREE.MeshBasicMaterial({ color: T, transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    beam.position.y = 0.95; grp.add(beam);
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.06),
      new THREE.MeshBasicMaterial({ color: C, transparent: true, opacity: 0, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    scan.position.y = 0.95; grp.add(scan);
    const inds = [[-0.4, T], [0, A], [0.4, X]].map(([x, col]) => {
      const o = dot(col, 0.08); o.position.set(x, 2.05, 0); grp.add(o); return o;
    });
    animed.push((time, dt) => {
      beam.material.opacity = THREE.MathUtils.damp(beam.material.opacity, (gateOpen ? 0.45 : 0.12) + Math.sin(time * 3) * 0.04, 3, dt);
      const on = gateOpen ? 0.85 : 0.18;
      scan.material.opacity = THREE.MathUtils.damp(scan.material.opacity, on, 3, dt);
      scan.position.y = 0.3 + ((time * 0.5) % 1) * 1.3;
      inds.forEach((o, k) => { o.material.opacity = 0.35 + Math.max(0, Math.sin(time * 2.5 + k * 2.1)) * 0.65; });
    });
  } else if (i === 6) {
    // Field Trial — a forward outpost: bunker, flag, a protective coverage dome (the
    // fielded C-UAS bubble), a perimeter ring, a friendly patrol drone, and an antenna.
    const bunker = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.7), glowMat(T, 0.55)); bunker.position.y = 0.45; grp.add(bunker);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.7, 0.35, 4), glowMat(T, 0.5)); roof.position.y = 0.85; roof.rotation.y = Math.PI / 4; grp.add(roof);
    const pole = bar(1.2, 0.04, COL.dim, 0.9); pole.position.set(0.55, 1.0, 0.1); grp.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.28),
      new THREE.MeshBasicMaterial({ color: T, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
    flag.position.set(0.78, 1.45, 0.1); grp.add(flag);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.55, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshBasicMaterial({ color: T, wireframe: true, transparent: true, opacity: 0.18, toneMapped: false }));
    dome.position.y = 0.28; grp.add(dome);
    const perim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.02, 8, 60), glowMat(T, 0.4));
    perim.rotation.x = Math.PI / 2; perim.position.y = 0.27; grp.add(perim);
    const antenna = bar(0.7, 0.02, T, 0.8); antenna.position.set(-0.5, 0.85, -0.2); grp.add(antenna);
    const beacon = dot(C, 0.05); beacon.position.set(-0.5, 1.2, -0.2); grp.add(beacon);
    const patrol = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), glowMat(T, 0.95)); grp.add(patrol);
    animed.push((time, dt) => {
      flag.rotation.y = Math.sin(time * 2) * 0.3;
      dome.rotation.y += dt * 0.1;
      beacon.material.opacity = 0.3 + Math.max(0, Math.sin(time * 5)) * 0.7;
      const a = time * 0.9; patrol.position.set(Math.cos(a) * 1.1, 1.1 + Math.sin(time * 1.6) * 0.25, Math.sin(a) * 1.1);
      patrol.rotation.y += dt * 3;
      perim.material.opacity = 0.25 + Math.sin(time * 1.5) * 0.12;
    });
  }
}

const stationNodes = STAGES.map((name, i) => buildStation(i, name));

// ---------- flow particles streaming along the rail ----------
const FLOW = reducedMotion ? 60 : 200;
const flowGeo = new THREE.BufferGeometry();
const flowPos = new Float32Array(FLOW * 3); const flowU = new Float32Array(FLOW);
for (let i = 0; i < FLOW; i++) flowU[i] = Math.random();
flowGeo.setAttribute('position', new THREE.BufferAttribute(flowPos, 3));
const flow = new THREE.Points(flowGeo, new THREE.PointsMaterial({ color: COL.cyan, size: 0.13, transparent: true, opacity: 0, toneMapped: false }));
scene.add(flow);

// ============================================================
//  THE CHALLENGE TOKEN  (a hostile drone that rides the rail)
// ============================================================
const token = new THREE.Group(); scene.add(token);
const tokBody = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), glowMat(COL.threat, 1)); token.add(tokBody);
// brighter halo for a clearly glowing, visible drone — but kept fairly tight so it still
// reads as a solid neon object rather than a dispersed cloud.
const tokHalo = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 24),
  new THREE.MeshBasicMaterial({ color: COL.threat, transparent: true, opacity: 0.18, toneMapped: false })); token.add(tokHalo);
// X-frame arms (quad-rotor motif), rotor rings, and an underslung sensor gimbal
const arms = [Math.PI / 4, -Math.PI / 4].map(rot => {
  const a = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.04, 0.06), glowMat(COL.threat, 0.8));
  a.position.y = 0.08; a.rotation.y = rot; token.add(a); return a;
});
const rotors = [[0.45, 0.45], [-0.45, 0.45], [0.45, -0.45], [-0.45, -0.45]].map(([x, z]) => {
  const r = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 24), glowMat(COL.threat, 0.9));
  r.rotation.x = Math.PI / 2; r.position.set(x, 0.12, z); token.add(r); return r;
});
const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), glowMat(COL.threat, 0.95));
gimbal.position.y = -0.28; token.add(gimbal);
const tokParts = [tokBody, tokHalo, gimbal, ...arms, ...rotors]; // everything recoloured threat→teal
// downward scan cone — the threat "looking down" on the base; flips off once neutralised
const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 24, 1, true),
  new THREE.MeshBasicMaterial({ color: COL.threat, transparent: true, opacity: 0.14, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
cone.position.y = -0.6; token.add(cone);
const tokLabel = makeLabel('Challenge · Hostile drone', 'orb-label', 1.4); token.add(tokLabel.obj);
const tokColor = new THREE.Color(COL.threat);

const TRAIL = 50;
const trailGeo = new THREE.BufferGeometry();
const trailPos = new Float32Array(TRAIL * 3), trailCol = new Float32Array(TRAIL * 3);
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
const trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({
  size: 0.3, vertexColors: true, transparent: true, opacity: 0.9,
  blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
scene.add(trail);

// ---------- evidence (track-lock brackets at Test & Eval) ----------
const evidence = new THREE.Group();
evidence.position.set(stationX[4], 1.4, 0); evidence.visible = false; scene.add(evidence);
for (let i = 0; i < 6; i++) {
  const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), glowMat(COL.cyan, 0.9));
  const a = (i / 6) * Math.PI * 2; s.position.set(Math.cos(a) * 1.3, Math.sin(i) * 0.4, Math.sin(a) * 1.3); evidence.add(s);
}

// ---------- adoption ring (expanding pulse at the token in the Field stage) ----------
const adoptRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 16, 64),
  new THREE.MeshBasicMaterial({ color: COL.teal, transparent: true, opacity: 0, toneMapped: false }));
adoptRing.rotation.x = Math.PI / 2; scene.add(adoptRing);

// ============================================================
//  ATMOSPHERE
// ============================================================
(function dust() {
  const M = reducedMotion ? 400 : 1200, pos = new Float32Array(M * 3);
  for (let i = 0; i < M; i++) {
    const r = 35 + Math.random() * 90, a = Math.random() * Math.PI * 2, h = (Math.random() - 0.5) * 55;
    pos[i*3] = Math.cos(a) * r; pos[i*3+1] = h; pos[i*3+2] = Math.sin(a) * r - 8;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x3a5a86, size: 0.16, transparent: true, opacity: 0.7, toneMapped: false })));
})();

const grid = new THREE.GridHelper(160, 80, 0x1c3354, 0x101e33);
grid.material.transparent = true; grid.material.opacity = 0; grid.position.y = -0.06; scene.add(grid);

const nebula = new THREE.Group(); scene.add(nebula);
[[-34, 6, -38, 60, 0x2a4a7a], [36, -2, -44, 70, 0x123a4a], [4, 14, -52, 90, 0x3a2a5a]].forEach(([x, y, z, s, col]) => {
  const c = new THREE.Color(col);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s),
    new THREE.MeshBasicMaterial({ map: radialTexture(c.r*255|0, c.g*255|0, c.b*255|0), transparent: true,
      opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.set(x, y, z); m.userData.spin = (Math.random() - 0.5) * 0.02; nebula.add(m);
});

// impact ripple when the challenge reaches a station
const ripple = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 64),
  new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
ripple.rotation.x = -Math.PI / 2; scene.add(ripple);
let rippleAge = 999, lastActive = -1;

// finale shockwave sweeping down the line
const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.2, 120),
  new THREE.MeshBasicMaterial({ color: COL.teal, transparent: true, opacity: 0,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
shock.rotation.x = -Math.PI / 2; shock.position.y = 0.05; scene.add(shock);

// ============================================================
//  STORY ENGINE
// ============================================================
const ui = {
  titlecard: document.getElementById('titlecard'), caption: document.getElementById('caption'),
  artifact: document.getElementById('artifact'), gate: document.getElementById('gate'),
  replay: document.getElementById('replayBtn'), start: document.getElementById('startBtn'),
  loading: document.getElementById('loading'), progress: document.getElementById('progress'),
  vignette: document.getElementById('vignette'), mute: document.getElementById('muteBtn'),
  endcard: document.getElementById('endcard'), kpi: document.getElementById('kpi'),
};

// evidence the live-fly trials produce — surfaced at Test & Eval to justify the gate.
const KPI = {
  title: 'Evidence pack · live-fly intercept trials',
  rows: [
    { k: 'Detection range', v: '2.8 km', good: true },
    { k: 'Track accuracy', v: '94%', good: true },
    { k: 'Intercept rate', v: '88%', good: true },
    { k: 'False-alarm rate', v: '6%', good: true },
  ],
};
function renderKPI() {
  ui.kpi.innerHTML = `<div class="kpi-title">${KPI.title}</div>` +
    KPI.rows.map(r => `<div class="kpi-row"><span>${r.k}</span><b class="${r.good ? 'ok' : 'warn'}">${r.v}</b></div>`).join('');
}
renderKPI();
function showKPI(on) { ui.kpi.classList.toggle('show', on); }
// Iterate path: a second round of trials measurably improves the evidence.
function improveKPI() {
  KPI.title = 'Evidence pack · re-test after fusion tuning';
  KPI.rows = [
    { k: 'Detection range', v: '3.5 km', good: true },
    { k: 'Track accuracy', v: '97%', good: true },
    { k: 'Intercept rate', v: '93%', good: true },
    { k: 'False-alarm rate', v: '3%', good: true },
  ];
  renderKPI();
}

// voiceover — pre-rendered clips, one per beat. Plays if present, else caption-only.
const VO = {
  available: false, files: [], dur: [], el: new window.Audio(),
  async init() {
    try {
      const r = await fetch('vo/manifest.json', { cache: 'no-store' });
      if (!r.ok) return;
      const m = await r.json();
      this.files = m.clips.map(c => 'vo/' + c.file);
      this.dur = m.clips.map(c => c.dur);
      this.available = true; this.el.preload = 'auto'; this.el.volume = 0.95;
      this.el.addEventListener('ended', () => Audio.duck(false));
    } catch (e) { /* no VO available — captions carry the story */ }
  },
  play(i) {
    if (!this.available || Audio.muted || !this.files[i]) return;
    try { this.el.pause(); this.el.currentTime = 0; this.el.src = this.files[i];
      this.el.play().then(() => Audio.duck(true)).catch(() => {}); } catch (e) {}
  },
  stop() { try { this.el.pause(); } catch (e) {} Audio.duck(false); },
};
VO.init();

// progress pips (clickable — presenters can jump to any station)
const pips = STAGES.map((_, i) => {
  const p = document.createElement('span'); p.className = 'pip'; ui.progress.appendChild(p);
  p.addEventListener('click', () => seek(i));
  return p;
});

// state
let playing = false, paused = false, ended = false;
let storyTime = 0, beatIdx = -1, targetU = 0;
let capLit = false, evidenceOn = false, adoptOn = false, gridOn = false, gateOpen = false;
let decision = null, iterating = false, adoptLift = 0;
let gateAutoTimer = null;
let finaleT = -1, coreFlare = 0;
const desiredPos = new THREE.Vector3();
const desiredLook = new THREE.Vector3(0, 1.2, 0);
// camera rig: a steady offset RELATIVE to the token, except the finale (absolute wide shot).
const camOffset = new THREE.Vector3(4, 5.5, 18);
const camAbsPos = new THREE.Vector3();
let camAbs = false;

// beats — 1:1 with the 7 stations (+ a wide reveal). `cam` is a [dx,dy,dz] offset from the
// token along the rail; the final beat is `abs` (absolute wide shot of the whole line).
const beats = [
  { t: 0,  stage: 0, cam: [4, 5, 17],   cap: 'A real problem: cheap hostile drones can slip over a forward base with little warning.' },
  { t: 6,  stage: 1, cam: [4, 5, 16],   cap: 'It enters the center. We scan radar, RF and acoustic sensors, and prior art.' },
  { t: 13, stage: 2, cam: [4, 5, 15],   cap: 'In a digital twin, we tune a sensor-fusion AI against simulated drone swarms.' },
  { t: 21, stage: 3, cam: [4, 5, 15],   cap: 'We integrate a real detect–track–defeat node and wire the live track feed.' },
  { t: 28, stage: 4, cam: [3.5, 4.5, 14], cap: 'Live-fly trials on the range — the evidence comes in.' },
  { t: 35, stage: 5, cam: [2.5, 4, 12], cap: 'Evidence is in. Make the call: Go, Iterate, or Stop.' },
  { t: 43, stage: 6, cam: [4, 5, 16],   cap: 'Validated: the system transitions to a forward-base field trial.' },
  { t: 51, stage: 6, cam: [0, 16, 42], abs: true, cap: 'One threat in, a validated capability out — and reusable knowledge banked.' },
];
const STORY_END = 58;
const stageToBeat = STAGES.map((_, s) => beats.findIndex(b => b.stage === s));

// derive scene flags purely from beat index (idempotent — makes seeking safe)
function applyStateForBeat(i) {
  capLit = i >= 2;
  evidenceOn = i >= 4;
  evidence.visible = evidenceOn;
  if (!evidenceOn) evidence.scale.set(0.01, 0.01, 0.01);
  adoptOn = i >= 6;
  gridOn = i >= 7;
}

function setCaption(text) { ui.caption.textContent = text; ui.caption.classList.add('show'); }
function setArtifact(stage) {
  ui.artifact.textContent = `Artifact · ${ARTIFACTS[stage]}`;
  ui.artifact.classList.add('show');
}
function setActiveStage(i) {
  stationNodes.forEach((s, k) => { s.lbl.el.classList.toggle('active', k === i); s.lbl.el.classList.toggle('done', k < i); });
  pips.forEach((p, k) => { p.classList.toggle('active', k === i); p.classList.toggle('done', k < i); });
  showKPI(i === 4 || i === 5);   // evidence pack stays up through Test & Eval + the Decision gate
}

// gate ----------------------------------------------------------
function openGate() {
  paused = true; gateOpen = true;
  ui.gate.classList.add('show'); ui.vignette.classList.add('focus');
  Audio.gateChime();
  gateAutoTimer = setTimeout(() => { if (gateOpen && decision === null) resolveGate('go'); }, 9000);
}
function closeGate() {
  gateOpen = false; ui.gate.classList.remove('show'); ui.vignette.classList.remove('focus');
  if (gateAutoTimer) { clearTimeout(gateAutoTimer); gateAutoTimer = null; }
}
function resolveGate(choice) {
  closeGate(); decision = choice;
  if (choice === 'iterate') {
    iterating = true;
    setCaption('Iterate — re-tune the fusion thresholds in the digital twin.');
    targetU = 2 / (N - 1); setActiveStage(2); setArtifact(2);
    setTimeout(() => {
      improveKPI();                                    // the second round of trials raises the evidence
      setCaption('Re-tested — longer detection range, more intercepts, fewer false alarms.');
      targetU = 4 / (N - 1); setActiveStage(4); setArtifact(4);
      setTimeout(() => { iterating = false; decision = null; openGate(); }, 2600);
    }, 2200);
  } else if (choice === 'stop') {
    setCaption('Stopped — but the fusion model and test protocol are banked for reuse.');
    Audio.stopTone();
    setTimeout(() => endStory(), 2600);
  } else {
    paused = false; storyTime = beats[6].t + 0.01; // resume at field trial
  }
}
ui.gate.querySelectorAll('button[data-decision]').forEach(b =>
  b.addEventListener('click', () => resolveGate(b.dataset.decision)));

// finale --------------------------------------------------------
function triggerFinale() {
  if (finaleT >= 0) return;
  finaleT = 0; shock.position.set(stationX[6], 0.05, 0); shock.scale.set(1, 1, 1);
  Audio.finalChord();
  setTimeout(() => { if (finaleT >= 0) ui.endcard.classList.add('show'); }, 600);
}

// timeline driver ----------------------------------------------
function updateStory(t) {
  let idx = 0; for (let i = 0; i < beats.length; i++) if (t >= beats[i].t) idx = i;
  if (idx !== beatIdx) {
    const prev = beatIdx;
    beatIdx = idx; const b = beats[idx];
    if (!iterating) { targetU = b.stage / (N - 1); setActiveStage(b.stage); setArtifact(b.stage); }
    if (b.abs) { camAbs = true; camAbsPos.set(b.cam[0], b.cam[1], b.cam[2]); }
    else { camAbs = false; camOffset.set(b.cam[0], b.cam[1], b.cam[2]); }
    applyStateForBeat(idx);
    if (idx === 5 && decision === null) openGate(); else if (idx !== 5) closeGate();
    if (idx === beats.length - 1) { ui.caption.classList.remove('show'); ui.artifact.classList.remove('show'); triggerFinale(); }
    else setCaption(b.cap);
    if (prev !== -1) { if (idx === 6) Audio.adoptChord(); else if (idx < 5 && !VO.available) Audio.tick(); }
    VO.play(idx);
  }
  if (t >= STORY_END && !ended) endStory();
}

// play / seek / reset ------------------------------------------
function startStory() {
  resetScene();
  Audio.resume(); Audio.startAmbient();
  ui.titlecard.classList.remove('show'); ui.replay.hidden = true;
  playing = true; paused = false; ended = false; storyTime = 0; beatIdx = -1; controls.enabled = false;
}
function seek(stage) {
  if (!playing) startStory();
  ended = false; ui.replay.hidden = true; controls.enabled = false;
  const i = stageToBeat[stage];
  closeGate(); iterating = false;
  decision = i > 5 ? 'go' : null;
  storyTime = beats[i].t + 0.01; beatIdx = -1; paused = false; playing = true;
}
function endStory() {
  ended = true; playing = false; paused = false; closeGate();
  Audio.fadeMaster(0, 2.5);
  setActiveStage(N - 1);
  stationNodes.forEach(s => s.lbl.el.classList.add('done'));
  ui.replay.hidden = false;
  controls.target.copy(desiredLook); controls.enabled = true;
}
function resetScene() {
  storyTime = 0; beatIdx = -1; targetU = 0; adoptLift = 0;
  capLit = evidenceOn = adoptOn = gridOn = false; decision = null; iterating = false;
  closeGate(); ui.caption.classList.remove('show'); ui.artifact.classList.remove('show');
  tokColor.set(COL.threat); evidence.visible = false; evidence.scale.set(0.01, 0.01, 0.01);
  adoptRing.material.opacity = 0; flow.material.opacity = 0;
  rippleAge = 999; lastActive = -1;
  finaleT = -1; coreFlare = 0; shock.material.opacity = 0; bloom.strength = bloomBase;
  ui.endcard.classList.remove('show'); VO.stop();
  KPI.title = 'Evidence pack · live-fly intercept trials';
  KPI.rows = [
    { k: 'Detection range', v: '2.8 km', good: true }, { k: 'Track accuracy', v: '94%', good: true },
    { k: 'Intercept rate', v: '88%', good: true }, { k: 'False-alarm rate', v: '6%', good: true },
  ];
  renderKPI();
  subLabels.forEach(l => { l.classList.remove('lit'); l.style.opacity = ''; });
  setActiveStage(-1);
  const p0 = railPoint(0, new THREE.Vector3()); token.position.copy(p0); token._u = 0;
  for (let i = 0; i < TRAIL; i++) { trailPos[i*3] = p0.x; trailPos[i*3+1] = p0.y; trailPos[i*3+2] = p0.z; }
  camAbs = false; camOffset.set(4, 5, 17);
  desiredLook.copy(p0); desiredPos.copy(p0).add(camOffset); camera.position.copy(desiredPos);
}

ui.start.addEventListener('click', startStory);
ui.replay.addEventListener('click', startStory);

function toggleMute() {
  Audio.resume(); Audio.setMuted(!Audio.muted);
  VO.el.muted = Audio.muted;
  ui.mute.textContent = Audio.muted ? '🔇 Muted' : '🔊 Sound';
}
ui.mute.addEventListener('click', toggleMute);

// presenter keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); if (playing && !gateOpen) paused = !paused; }
  else if (e.key === 'ArrowRight') { seek(Math.min((beats[Math.max(beatIdx,0)].stage) + 1, N - 1)); }
  else if (e.key === 'ArrowLeft')  { seek(Math.max((beats[Math.max(beatIdx,0)].stage) - 1, 0)); }
  else if (e.key === 'r' || e.key === 'R') { startStory(); }
  else if (e.key === 'm' || e.key === 'M') { toggleMute(); }
});

// ============================================================
//  ANIMATION LOOP
// ============================================================
const clock = new THREE.Clock();
const tmp = new THREE.Vector3(), tmpC = new THREE.Color(), teal = new THREE.Color(COL.teal);

function animate() {
  requestAnimationFrame(animate);
  const dt = FIXED_DT ? 0.05 : Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;

  if (playing && !paused) storyTime += dt;
  if (playing) updateStory(storyTime);

  // token travel along the straight rail
  token._u = THREE.MathUtils.damp(token._u ?? 0, THREE.MathUtils.clamp(targetU, 0, 1), 2.4, dt);
  railPoint(token._u, tmp);
  adoptLift = THREE.MathUtils.damp(adoptLift, adoptOn ? 1.1 : 0, 2, dt);
  token.position.copy(tmp); token.position.y += adoptLift + (reducedMotion ? 0 : Math.sin(time * 1.6) * 0.06);
  const pulse = reducedMotion ? 1 : 1 + Math.sin(time * 4) * 0.06;
  tokBody.scale.setScalar(pulse); tokHalo.scale.setScalar(1 + Math.sin(time * 2.5) * 0.12);
  tokBody.rotation.y += dt * 0.6; tokBody.rotation.x += dt * 0.3;
  rotors.forEach((r, i) => { r.rotation.z += dt * (8 + i); });   // rotors spin fast
  if (adoptOn) tokColor.lerp(teal, dt * 1.2);                    // neutralised → becomes our capability
  tokParts.forEach(p => p.material.color.copy(tokColor));
  cone.material.color.copy(tokColor);
  cone.material.opacity = THREE.MathUtils.damp(cone.material.opacity, adoptOn ? 0.02 : 0.14, 3, dt); // threat cone fades when defeated

  // token trail
  for (let i = TRAIL - 1; i > 0; i--) {
    trailPos[i*3] = trailPos[(i-1)*3]; trailPos[i*3+1] = trailPos[(i-1)*3+1]; trailPos[i*3+2] = trailPos[(i-1)*3+2];
  }
  trailPos[0] = token.position.x; trailPos[1] = token.position.y; trailPos[2] = token.position.z;
  for (let i = 0; i < TRAIL; i++) {
    const f = (1 - i / TRAIL) ** 1.6;
    trailCol[i*3] = tokColor.r * f; trailCol[i*3+1] = tokColor.g * f; trailCol[i*3+2] = tokColor.b * f;
  }
  trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;

  // station highlight — active / done / future
  const activeIdx = Math.round(token._u * (N - 1));
  stationNodes.forEach((s, i) => {
    const target = (i === activeIdx) ? COL.cyan : (i < activeIdx ? COL.teal : COL.dim);
    tmpC.set(target);
    s.node.material.color.lerp(tmpC, dt * 4);
    s.pad.material.color.lerp(tmpC, dt * 4);
    s.ring.material.color.copy(s.pad.material.color);
    s.ring.rotation.z += dt * (i === activeIdx ? 0.7 : 0.08);
    const ns = (i === activeIdx) ? 1.3 + Math.sin(time * 5) * 0.12 : 1;
    s.node.scale.setScalar(THREE.MathUtils.damp(s.node.scale.x, ns, 5, dt));
  });

  // station motifs — each station drives its own detailed scene (cheap enough to tick all)
  animed.forEach(fn => fn(time, dt));

  // flow particles streaming along the rail (dim while the gate has focus)
  const flowTarget = ((token._u > 0.02 && !ended) || gridOn) ? (gateOpen ? 0.22 : 0.85) : 0;
  flow.material.opacity = THREE.MathUtils.damp(flow.material.opacity, flowTarget, 3, dt);
  const fp = flowGeo.attributes.position.array;
  for (let i = 0; i < FLOW; i++) {
    flowU[i] += dt * 0.05; if (flowU[i] > 1) flowU[i] -= 1;
    railPoint(flowU[i], tmp);
    fp[i*3] = tmp.x + (Math.random()-0.5)*0.06; fp[i*3+1] = tmp.y + (Math.random()-0.5)*0.5; fp[i*3+2] = tmp.z + (Math.random()-0.5)*0.06;
  }
  flowGeo.attributes.position.needsUpdate = true;

  // operating-system substrate lights up once the capability layers engage; on the final
  // wide shot the Methodology/Governance/Technology labels fade so they don't collide with
  // the station nameplates (the summary row is what should read there).
  const onFinale = beatIdx === beats.length - 1;
  subLabels.forEach(l => { l.classList.toggle('lit', capLit); l.style.opacity = onFinale ? '0' : ''; });
  substrate.material.opacity = THREE.MathUtils.damp(substrate.material.opacity, capLit ? 0.42 : 0.18, 2, dt);

  // evidence brackets
  if (evidenceOn) {
    expApproach(evidence.scale, tmp.set(1, 1, 1), 3, dt);
    evidence.rotation.y += dt * 0.4;
    evidence.children.forEach(s => { s.rotation.x += dt; s.rotation.y += dt * 1.3; });
  }

  // adoption ring (expanding pulse at the token)
  if (adoptOn) {
    adoptRing.position.copy(token.position);
    const grow = 1 + ((time * 0.6) % 2.4);
    adoptRing.scale.set(grow, grow, grow);
    adoptRing.material.opacity = Math.max(0, 0.6 * (1 - (grow - 1) / 2.4));
  } else adoptRing.material.opacity = 0;

  // impact ripple on station arrival
  if (playing && activeIdx !== lastActive) {
    lastActive = activeIdx; rippleAge = 0;
    ripple.position.copy(stationNodes[activeIdx].grp.position); ripple.position.y = 0.28;
    ripple.material.color.set(adoptOn ? COL.teal : COL.cyan);
  }
  rippleAge += dt;
  const rk = rippleAge / 0.85;
  if (rk < 1) { const rs = 1 + rk * 3.4; ripple.scale.set(rs, rs, rs); ripple.material.opacity = 0.75 * (1 - rk); }
  else ripple.material.opacity = 0;

  // finale sweep — shockwave down the line + bloom flare
  if (finaleT >= 0) {
    finaleT += dt;
    const env = finaleT < 0.3 ? finaleT / 0.3 : Math.max(0, 1 - (finaleT - 0.3) / 1.9);
    bloom.strength = bloomBase + env * 0.95;
    coreFlare = env * 0.85;
    const sg = 1 + finaleT * 30;
    shock.scale.set(sg, sg, sg);
    shock.material.opacity = Math.max(0, 0.85 * (1 - finaleT / 1.7));
  } else coreFlare = 0;
  tokBody.material.color.offsetHSL(0, 0, coreFlare * 0.4 * dt); // tiny flare lift on the token

  // atmosphere
  nebula.children.forEach(m => { m.rotation.z += m.userData.spin * dt; });
  grid.material.opacity = THREE.MathUtils.damp(grid.material.opacity, gridOn ? 0.5 : 0.1, 2, dt);

  // camera — steady rig tracking the token at a consistent offset
  if (playing) {
    if (camAbs) {
      expApproach(desiredPos, camAbsPos, 1.2, dt);
      expApproach(desiredLook, tmp.set(0, 1.2, 0), 1.2, dt);
    } else {
      desiredPos.copy(token.position).add(camOffset);
      expApproach(desiredLook, token.position, 2.2, dt);
    }
    expApproach(camera.position, desiredPos, 1.8, dt);
    camera.position.x += Math.sin(time * 0.22) * 0.16;
    camera.position.y += Math.sin(time * 0.17 + 1) * 0.10;
    camera.lookAt(desiredLook);
  } else controls.update();

  composer.render();
  labelRenderer.render(scene, camera);
}

// ---------- boot ----------
resetScene();
ui.loading.style.display = 'none';
animate();

if (BEAT_PARAM != null) { // headless: jump to a beat, snap the camera/token, and hold it
  startStory();
  const i = Math.max(0, Math.min(BEAT_PARAM, beats.length - 1));
  const b = beats[i];
  storyTime = b.t + 0.01; paused = true;
  targetU = b.stage / (N - 1); token._u = targetU; railPoint(targetU, token.position);
  if (b.abs) { camAbs = true; camAbsPos.set(b.cam[0], b.cam[1], b.cam[2]); desiredPos.copy(camAbsPos); desiredLook.set(0, 1.2, 0); }
  else { camAbs = false; camOffset.set(b.cam[0], b.cam[1], b.cam[2]); desiredPos.copy(token.position).add(camOffset); desiredLook.copy(token.position); }
  camera.position.copy(desiredPos); camera.lookAt(desiredLook);
}

// ---------- resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
