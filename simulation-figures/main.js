import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Audio from './audio.js';

// ---------- palette ----------
const COL = { amber: 0xffb24d, cyan: 0x56b8ff, teal: 0x3ee6c4, dim: 0x243a5c, edge: 0x03050a };
const hex2css = h => '#' + h.toString(16).padStart(6, '0');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- the center: 3 clusters, 6 zones ----------
const CLUSTERS = {
  A: { key: 'tt', name: 'Think Tank',     color: COL.amber },
  B: { key: 'wf', name: 'Workshop Floor', color: COL.cyan  },
  C: { key: 'sc', name: 'Showcase',       color: COL.teal  },
};
// listed in TOUR ORDER (left column top→bottom, then middle, then right)
const ZONES = [
  { n: 1, cl: 'A', x: -14, z: -6, name: 'Mission Framing & Collaboration',
    purpose: 'Where challenges are defined — workshops, leadership sessions, and classified or sensitive framing.',
    caps: ['Floor-to-ceiling writable walls', '“Mission Wall” of active challenges', 'Private secure pods for sensitive work', 'Modular, reconfigurable furniture'] },
  { n: 6, cl: 'A', x: -14, z: 6, name: 'Knowledge & Research Hub',
    purpose: 'The memory of the center — every challenge leaves reusable knowledge behind.',
    caps: ['Emerging-tech & threat-intelligence library', 'Commercial innovation scans', 'Technology scouting & horizon watch', 'Searchable archive of past missions'] },
  { n: 2, cl: 'B', x: 0, z: -6, name: 'Digital Experimentation Lab',
    purpose: 'Model and prove it in software before touching hardware — simulate, analyse, decide.',
    caps: ['AR / VR rigs', 'Digital-twin environment', 'Simulation & scenario sandbox', 'AI / data-analysis bench'] },
  { n: 3, cl: 'B', x: 0, z: 6, name: 'Rapid Prototyping & Integration Lab',
    purpose: 'Where ideas become things — and physical meets digital on the integration bay.',
    caps: ['3D printing, including metals', 'Electronics & rapid-PCB bench', 'Materials testing', 'Sensor / wearable integration bay'] },
  { n: 4, cl: 'C', x: 14, z: -6, name: 'Test & Evaluation Area',
    purpose: 'Controlled, instrumented evaluation — hard evidence before any field exposure.',
    caps: ['Instrumented test rigs', 'Controlled evaluation protocols', 'Evidence & data capture', 'Repeatable measurement'] },
  { n: 5, cl: 'C', x: 14, z: 6, name: 'Showcase & Demonstration Area',
    purpose: 'Where the center tells its story — and attracts talent, partners, and budget.',
    caps: ['Live demo stations for VIPs & partners', '“From Idea to Field” timeline walls', 'Gallery of evolved prototypes', 'Leadership briefing space'] },
];

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
scene.fog = new THREE.FogExp2(COL.edge, 0.014);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 400);
camera.position.set(0, 26, 40);
camera.lookAt(0, 0, 0);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('labels').appendChild(labelRenderer.domElement);

// controls attached to the WebGL canvas (which receives pointer events; #labels/#ui pass through)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.minDistance = 14; controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI * 0.49;
controls.enabled = false; controls.target.set(0, 0, 0);

// ---------- lights ----------
scene.add(new THREE.AmbientLight(0x4060a0, 0.75));
const key = new THREE.PointLight(0x9ec8ff, 70, 160); key.position.set(0, 26, 18); scene.add(key);

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.55, 0.26);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const bloomBase = 0.7;

// ---------- helpers ----------
function gradientTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(256, 205, 30, 256, 256, 370);
  g.addColorStop(0, '#0b1426'); g.addColorStop(0.6, '#070b16'); g.addColorStop(1, '#03050a');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
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
// the zone name as a glowing floor marking — spaced caps, auto-fit to width, drawn upright so it
// reads correctly once the plane is laid flat and faces the (front / +Z) tour camera.
const FLOORLBL_W = 1024, FLOORLBL_H = 220;
function floorLabelTexture(text, hex) {
  const c = document.createElement('canvas'); c.width = FLOORLBL_W; c.height = FLOORLBL_H;
  const x = c.getContext('2d');
  const css = hex2css(hex), label = text.toUpperCase();
  try { x.letterSpacing = '3px'; } catch (e) {}
  let fs = 116; const font = s => `800 ${s}px ui-sans-serif, system-ui, "Segoe UI", Arial, sans-serif`;
  x.font = font(fs);
  while (x.measureText(label).width > FLOORLBL_W - 70 && fs > 34) { fs -= 4; x.font = font(fs); }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const cx = FLOORLBL_W / 2, cy = FLOORLBL_H / 2 + 4;
  // core kept as a *light tint* of the cluster hue (halfway to white) — bright enough to read on the
  // same-colour tile, but still clearly amber/cyan/teal rather than washing out to white.
  const ch = i => (hex >> i) & 255;
  const lite = m => `rgb(${Math.round(ch(16) + (255 - ch(16)) * m)},${Math.round(ch(8) + (255 - ch(8)) * m)},${Math.round(ch(0) + (255 - ch(0)) * m)})`;
  x.shadowColor = css; x.shadowBlur = 8;               // faint halo — just enough to lift off the tile
  x.fillStyle = css; x.fillText(label, cx, cy);
  x.shadowBlur = 0;
  x.lineWidth = 8; x.strokeStyle = 'rgba(2,6,14,0.7)'; x.strokeText(label, cx, cy); // crisp dark edge → letters stay legible
  x.fillStyle = lite(0.34); x.fillText(label, cx, cy); // solid tinted core (more colour, less white)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------- star / dust field ----------
(function dust() {
  const N = reducedMotion ? 500 : 1400, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 44 + Math.random() * 90, a = Math.random() * Math.PI * 2, h = (Math.random() - 0.5) * 60;
    pos[i*3] = Math.cos(a) * r; pos[i*3+1] = h; pos[i*3+2] = Math.sin(a) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x3a5a86, size: 0.18, transparent: true, opacity: 0.7, toneMapped: false })));
})();

// slow drifting nebula cards for colour depth
const nebula = new THREE.Group(); scene.add(nebula);
[[ -32, 8, -40, 64, 0x2a4a7a], [34, -2, -46, 74, 0x123a4a], [4, 16, -54, 96, 0x3a2a5a]].forEach(([x, y, z, s, col]) => {
  const c = new THREE.Color(col);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s),
    new THREE.MeshBasicMaterial({ map: radialTexture(c.r*255|0, c.g*255|0, c.b*255|0), transparent: true,
      opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  m.position.set(x, y, z); m.userData.spin = (Math.random() - 0.5) * 0.02; nebula.add(m);
});

// ============================================================
//  THE SUBSTRATE — the operating system the zones sit on
// ============================================================
const grid = new THREE.GridHelper(140, 70, 0x1c3354, 0x101e33);
grid.material.transparent = true; grid.material.opacity = 0.12; grid.position.y = -3; scene.add(grid);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshBasicMaterial({ map: radialTexture(36, 78, 120), transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
);
floor.rotation.x = -Math.PI / 2; floor.position.y = -2.98; scene.add(floor);

['Methodology', 'Governance', 'Technology'].forEach((w, i) => {
  const lbl = makeLabel(w, 'substrate-label', 0);
  lbl.obj.position.set(-17 + i * 17, -2.6, 15);
  scene.add(lbl.obj);
});

// circulation path linking the zones in tour order (reads like a corridor)
{
  const pts = ZONES.map(z => new THREE.Vector3(z.x, 0.08, z.z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
  const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.05, 8, false), glowMat(COL.dim, 0.4));
  scene.add(path);
}

// ============================================================
//  ZONE PROPS — procedural furnishings + little figures
// ============================================================
const spinners = [];
let curFigs = null;   // figures collected during the current buildZoneProps() call
function pmat(list, color, base) { const m = glowMat(color, base); list.push({ m, base }); return m; }
function addBox(grp, list, dims, pos, color, base, withEdge = true) {
  const g = new THREE.BoxGeometry(dims[0], dims[1], dims[2]);
  const mesh = new THREE.Mesh(g, pmat(list, color, base)); mesh.position.set(pos[0], pos[1], pos[2]); grp.add(mesh);
  if (withEdge) {
    const eb = Math.min(1, base * 2.4);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: eb, toneMapped: false }));
    e.position.copy(mesh.position); grp.add(e); list.push({ m: e.material, base: eb });
  }
  return mesh;
}
function addCyl(grp, list, rt, rb, h, pos, color, base) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 18), pmat(list, color, base));
  m.position.set(pos[0], pos[1], pos[2]); grp.add(m); return m;
}
// a closed polyline through station waypoints, so a walker patrols a real route (not a tight loop)
function makePath(pts) {
  const segs = []; let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1e-3;
    segs.push({ ax: a[0], az: a[1], ux: dx / len, uz: dz / len, len, start: total }); total += len;
  }
  return { segs, total };
}
function pathAt(P, d) {                                  // position + travel direction at arc-length d
  d = ((d % P.total) + P.total) % P.total;
  let s = P.segs[0];
  for (const seg of P.segs) { if (d <= seg.start + seg.len) { s = seg; break; } }
  const t = d - s.start;
  return { x: s.ax + s.ux * t, z: s.az + s.uz * t, dx: s.ux, dz: s.uz };
}
const PEOPLE = 0xe8c9a0;   // warm skin/uniform tone — shaded by the scene lights for a realistic read
// figure proportions (≈1.0 tall, matching the scene scale)
const HIP_Y = 0.46, TOR = 0.30, SHO_Y = HIP_Y + TOR, THIGH = 0.24, SHIN = 0.22, UARM = 0.20, FARM = 0.18, HEADR = 0.105;
// an articulated little person: torso, head, jointed arms + legs (so they can actually walk).
// opt: {seated, ry (facing), scale, walk:{cx,cz,r,speed}}
function addFigure(parent, list, x, z, opt = {}) {
  const s = (opt.scale || 1) * 1.06, seated = !!opt.seated, base = 0.95;
  const mat = new THREE.MeshStandardMaterial({ color: PEOPLE, emissive: 0x8a5e36, emissiveIntensity: 0.9,
    roughness: 0.7, metalness: 0.0, transparent: true, opacity: base });
  const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = opt.ry || 0; root.scale.setScalar(s);
  const part = (geo, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; root.add(m); return m; };
  const limb = (len, r) => {                                        // a capsule hanging down -Y from its pivot
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len - 2 * r), 3, 6), mat);
    m.position.y = -len / 2; return m;
  };
  part(new THREE.CylinderGeometry(0.10, 0.135, TOR, 8), HIP_Y + TOR / 2);   // torso
  part(new THREE.CylinderGeometry(0.135, 0.12, 0.12, 8), HIP_Y + 0.02);     // pelvis
  part(new THREE.CylinderGeometry(0.05, 0.06, 0.07, 6), SHO_Y + 0.02);      // neck
  part(new THREE.SphereGeometry(HEADR, 10, 8), SHO_Y + 0.05 + HEADR);       // head
  const sh = part(new THREE.CapsuleGeometry(0.055, 0.24, 2, 6), SHO_Y); sh.rotation.z = Math.PI / 2;  // shoulders
  const joint = (px, py, make) => { const p = new THREE.Group(); p.position.set(px, py, 0); make(p); root.add(p); return p; };
  const arm = side => { let e; const p = joint(side * 0.17, SHO_Y, p => { p.add(limb(UARM, 0.05)); e = new THREE.Group(); e.position.y = -UARM; e.add(limb(FARM, 0.045)); p.add(e); }); return { p, e }; };
  const leg = side => { let k; const p = joint(side * 0.08, HIP_Y, p => { p.add(limb(THIGH, 0.06)); k = new THREE.Group(); k.position.y = -THIGH; k.add(limb(SHIN, 0.05));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.18), mat); foot.position.set(0, -SHIN + 0.02, 0.05); k.add(foot); p.add(k); }); return { p, k }; };
  const j = { aL: arm(-1), aR: arm(1), lL: leg(-1), lR: leg(1) };
  if (seated) {                                                    // sit: thighs forward, shins down, hands on lap
    j.lL.p.rotation.x = -1.45; j.lR.p.rotation.x = -1.45; j.lL.k.rotation.x = 1.5; j.lR.k.rotation.x = 1.5;
    j.aL.p.rotation.x = -0.25; j.aR.p.rotation.x = -0.25; j.aL.e.rotation.x = 0.5; j.aR.e.rotation.x = 0.5;
    root.position.y = -0.02;
  }
  parent.add(root);
  list.push({ m: mat, base });
  const act = opt.act || (opt.walk ? 'walk' : (seated ? 'meet' : 'view'));
  const idx = curFigs ? curFigs.length : 0;
  const rate = 1 + (((idx * 0.37) % 0.30) - 0.15);                 // ±15% timing spread → figures fall out of sync
  const walk = opt.walk || null;
  if (walk && walk.path) walk.P = makePath(walk.path);            // precompute the patrol route
  const rest = { rx: root.rotation.x,                              // pose to relax back to when the zone isn't selected
    aLp: j.aL.p.rotation.x, aRp: j.aR.p.rotation.x, aLe: j.aL.e.rotation.x, aRe: j.aR.e.rotation.x,
    lLp: j.lL.p.rotation.x, lRp: j.lR.p.rotation.x, lLk: j.lL.k.rotation.x, lRk: j.lR.k.rotation.x };
  if (curFigs) curFigs.push({ g: root, x0: x, z0: z, ry: opt.ry || 0, seated, act, rest, phase: idx * 1.7, rate, walk, j });
  return root;
}
// a few people scattered in an area (x±dx, z±dz), deterministic spread, all facing the exhibit
function addCrowd(grp, list, cx, cz, dx, dz, n, act = 'view') {
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996;                                   // golden-angle scatter
    const x = cx + Math.cos(a) * dx * ((i % 3) + 1) / 3;
    const z = cz + Math.sin(a) * dz * ((i % 2) + 1) / 2;
    addFigure(grp, list, x, z, { ry: Math.atan2(-0.6 - z, 0 - x), act });   // face the pedestals
  }
}
function addChair(grp, list, x, z, color, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  addBox(g, list, [0.4, 0.06, 0.4], [0, 0.34, 0], color, 0.3, false);     // seat
  addBox(g, list, [0.4, 0.4, 0.06], [0, 0.54, -0.18], color, 0.3, false); // back
  grp.add(g); return g;
}
function spin(mesh, s) { mesh.userData.spin = s; spinners.push(mesh); return mesh; }

function holoTwin(grp, L, pos, color, r = 0.7, base = 0.9) {   // spinning wireframe "digital twin"
  const h = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.45, toneMapped: false }));
  h.position.set(pos[0], pos[1], pos[2]); grp.add(h); L.push({ m: h.material, base }); spin(h, 0.5); return h;
}

// build the furnishings + people for one zone into propGrp (origin = slab top, +y up)
function buildZoneProps(zi, grp, color) {
  const L = [], A = 0.32; curFigs = [];             // fills sit dim until the zone is active
  switch (zi) {
    case 0: { // Mission Framing — a workshop in session
      addBox(grp, L, [5, 2.2, 0.12], [0, 1.1, -2.6], color, A);                 // mission wall
      addBox(grp, L, [1.4, 0.05, 0.9], [0, 1.05, -2.52], 0xffffff, 0.1, false); // wall content
      addBox(grp, L, [0.12, 1.8, 2.6], [-3.7, 0.9, 0.2], color, A);             // side board / partition
      addCyl(grp, L, 0.95, 0.95, 0.12, [0, 0.5, 0.7], color, A);               // meeting table
      addCyl(grp, L, 0.16, 0.16, 0.5, [0, 0.25, 0.7], color, A * 0.8);
      [[-1.4, 0.7], [1.4, 0.7], [-0.9, 1.9], [0.9, 1.9], [0, -0.5]].forEach(([sx, sz]) => {  // seated team
        const ry = Math.atan2(0.7 - sz, 0 - sx);
        addChair(grp, L, sx, sz, color, ry); addFigure(grp, L, sx, sz, { seated: true, ry, act: 'meet' });
      });
      addFigure(grp, L, -1.5, -2.0, { walk: { path: [[-1.5, -2.0], [1.5, -2.0]], speed: 0.7 } }); // presenter pacing the wall
      addFigure(grp, L, 0.7, -2.0, { ry: 0, act: 'present' });                                  // colleague presenting at the wall
      break;
    }
    case 1: { // Knowledge Hub — a working library
      for (let s = 0; s < 4; s++) addBox(grp, L, [0.7, 2.0, 2.6], [-3.0 + s * 1.0, 1.0, -1.6], color, A); // shelf rows
      addBox(grp, L, [0.12, 1.6, 2.6], [3.4, 0.8, -1.4], color, A);             // side shelf
      [[1.2, 1.0], [2.5, 1.6]].forEach(([dx, dz]) => {                          // reading desks + seated readers
        addBox(grp, L, [1.4, 0.08, 0.8], [dx, 0.75, dz], color, A);
        addChair(grp, L, dx, dz + 0.7, color, Math.PI); addFigure(grp, L, dx, dz + 0.7, { seated: true, ry: Math.PI, act: 'read' });
      });
      addFigure(grp, L, -1.2, 0.5, { ry: Math.PI, act: 'browse' });             // person browsing the shelves
      addCyl(grp, L, 0.5, 0.55, 0.9, [-0.6, 0.45, 1.7], color, A);             // terminal pedestal
      holoTwin(grp, L, [-0.6, 1.15, 1.7], color, 0.34);                         // rotating reference globe
      addFigure(grp, L, 0.3, 2.1, { ry: -2.0, act: 'observe' });                // researcher at the terminal
      break;
    }
    case 2: { // Digital Experimentation — operators, VR, digital twin
      [[-1.9, -1.4], [-0.2, -1.6]].forEach(([mx, mz]) => {                      // operator stations
        addBox(grp, L, [1.5, 0.9, 0.08], [mx, 1.2, mz], color, A);             // monitor
        addCyl(grp, L, 0.05, 0.05, 0.7, [mx, 0.35, mz], color, A * 0.7);       // stand
        addBox(grp, L, [1.4, 0.06, 0.7], [mx, 0.75, mz + 0.7], color, A);      // desk
        addChair(grp, L, mx, mz + 1.3, color, Math.PI); addFigure(grp, L, mx, mz + 1.3, { seated: true, ry: Math.PI, act: 'type' });
      });
      holoTwin(grp, L, [1.9, 1.35, 0.4], color);                               // digital twin
      addCyl(grp, L, 0.7, 0.7, 0.04, [1.9, 0.52, 0.4], color, A);             // holo pad
      addBox(grp, L, [0.3, 1.2, 0.3], [3.2, 0.6, -0.4], color, A);            // VR rig stand
      addFigure(grp, L, 2.4, 0.4, { ry: -Math.PI / 2, act: 'vr' });            // person in VR
      addBox(grp, L, [0.8, 1.6, 0.6], [3.4, 0.8, 2.0], color, A);             // server rack
      addFigure(grp, L, -1.9, 0.6, { walk: { path: [[-1.9, 0.6], [-0.2, 0.6], [2.6, 1.6], [2.4, 2.6], [-1.0, 2.4]], speed: 0.95 } }); // supervisor desk-to-desk
      break;
    }
    case 3: { // Rapid Prototyping — printer, workbench, robot arm, makers
      const fg = new THREE.BoxGeometry(1.5, 1.5, 1.5);                          // open printer frame
      const fe = new THREE.LineSegments(new THREE.EdgesGeometry(fg), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7, toneMapped: false }));
      fe.position.set(-2.0, 0.85, -1.1); grp.add(fe); L.push({ m: fe.material, base: 0.7 });
      addBox(grp, L, [1.4, 0.06, 1.4], [-2.0, 1.2, -1.1], color, A);            // gantry plate
      addBox(grp, L, [1.8, 0.7, 1.0], [1.6, 0.35, -1.0], color, A);            // workbench
      addCyl(grp, L, 0.18, 0.22, 0.3, [1.6, 0.85, -1.0], color, A);             // robot arm
      addBox(grp, L, [0.16, 0.7, 0.16], [1.6, 1.3, -1.0], color, A);
      addBox(grp, L, [0.6, 0.14, 0.14], [1.9, 1.6, -1.0], color, A);
      addBox(grp, L, [0.5, 0.4, 0.5], [-3.7, 0.2, 1.4], color, A);             // parts bins
      addBox(grp, L, [0.5, 0.4, 0.5], [-3.0, 0.2, 1.4], color, A);
      addBox(grp, L, [0.12, 1.2, 1.6], [3.7, 0.6, -0.4], color, A);            // tool-rack wall
      addFigure(grp, L, -2.0, 0.5, { ry: Math.PI, act: 'work' });               // maker at the printer
      addFigure(grp, L, 1.6, 0.2, { ry: 0, act: 'work' });                      // maker at the bench
      addFigure(grp, L, -2.0, 1.2, { walk: { path: [[-2.0, 1.2], [1.4, 1.0], [0, 2.2]], speed: 0.85 } }); // maker moving printer↔bench
      break;
    }
    case 4: { // Test & Evaluation — rig, control desk, observers
      addBox(grp, L, [0.16, 1.8, 0.16], [-1.2, 0.9, -1.2], color, A);           // portal posts
      addBox(grp, L, [0.16, 1.8, 0.16], [1.2, 0.9, -1.2], color, A);
      addBox(grp, L, [2.7, 0.16, 0.16], [0, 1.8, -1.2], color, A);             // portal beam
      addCyl(grp, L, 0.9, 0.9, 0.16, [0, 0.55, 0.2], color, A);               // platform
      const dut = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), pmat(L, color, A * 1.5));
      dut.position.set(0, 1.05, 0.2); grp.add(dut); spin(dut, 0.6);             // device under test
      [-2.4, 2.4].forEach(x => {
        addCyl(grp, L, 0.04, 0.04, 1.2, [x, 0.6, 0.4], color, A * 0.8);         // sensor towers
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), pmat(L, color, 0.8));
        tip.position.set(x, 1.25, 0.4); grp.add(tip);
      });
      addBox(grp, L, [1.6, 0.7, 0.7], [2.8, 0.35, 1.9], color, A);             // control console desk
      addBox(grp, L, [1.1, 0.6, 0.06], [2.8, 1.1, 1.6], color, A);            // console screen
      addChair(grp, L, 2.8, 2.6, color, Math.PI); addFigure(grp, L, 2.8, 2.6, { seated: true, ry: Math.PI, act: 'type' }); // operator at the console
      addFigure(grp, L, -2.4, 1.6, { walk: { path: [[-2.4, 1.6], [-0.6, 1.8], [-1.4, 2.6]], speed: 0.7 } }); // observer patrolling the rig
      addFigure(grp, L, -1.3, 2.1, { ry: -0.3, act: 'observe' });                          // observer with a clipboard
      break;
    }
    case 5: { // Showcase — gallery with a crowd of visitors
      const arte = [new THREE.IcosahedronGeometry(0.3, 0), new THREE.OctahedronGeometry(0.32), new THREE.TorusKnotGeometry(0.2, 0.07, 48, 8)];
      [-2.0, 0, 2.0].forEach((x, k) => {
        addCyl(grp, L, 0.4, 0.45, 0.9, [x, 0.45, -0.6], color, A);              // pedestal
        const a = new THREE.Mesh(arte[k], pmat(L, color, A * 1.5)); a.position.set(x, 1.15, -0.6); grp.add(a); spin(a, 0.4 + k * 0.1);
        addCyl(grp, L, 0.05, 0.06, 0.7, [x - 1.0, 0.35, 0.4], color, A * 0.7);  // stanchion posts
      });
      addBox(grp, L, [5, 1.4, 0.1], [0, 1.4, -2.5], color, A);                 // banner / timeline wall
      addFigure(grp, L, 0.9, 0.4, { ry: Math.PI / 2, scale: 1.04, act: 'present' }); // a presenter addressing the room
      addCrowd(grp, L, 0, 2.0, 2.0, 0.9, 5, 'view');                            // visitors viewing the pedestals
      addFigure(grp, L, -2.4, 1.0, { walk: { path: [[-2.4, 1.0], [0, 1.4], [2.4, 1.0], [0, 2.2]], speed: 0.7 } }); // a visitor strolling the gallery
      break;
    }
  }
  const figs = curFigs; curFigs = null;
  return { mats: L, figs };
}

// ============================================================
//  ZONE TILES
// ============================================================
const tileW = 9, tileD = 8, tileH = 0.5;
const pickMeshes = [];
const zoneObjs = ZONES.map((z, i) => {
  const cl = CLUSTERS[z.cl];
  const grp = new THREE.Group(); grp.position.set(z.x, 0, z.z); scene.add(grp);

  // translucent plot slab
  const fill = new THREE.Mesh(new THREE.BoxGeometry(tileW, tileH, tileD), glowMat(cl.color, 0.1));
  fill.position.y = tileH / 2; fill.userData.zone = i; grp.add(fill); pickMeshes.push(fill);

  // bright edge outline
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(tileW, tileH, tileD)),
    new THREE.LineBasicMaterial({ color: cl.color, transparent: true, opacity: 0.32, toneMapped: false }));
  edges.position.y = tileH / 2; grp.add(edges);

  // illuminated floor glow on top face
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(tileW - 0.6, tileD - 0.6),
    new THREE.MeshBasicMaterial({ color: cl.color, transparent: true, opacity: 0.06,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = tileH + 0.02; grp.add(glow);

  // procedural furnishings + figures, sitting on the slab top
  const propGrp = new THREE.Group(); propGrp.position.y = tileH; grp.add(propGrp);
  const built = buildZoneProps(i, propGrp, cl.color);
  const propMats = built.mats, figures = built.figs;

  // zone name laid flat on the tile floor as a glowing floor marking, set near the front (+Z) edge
  // so the furnishings/figures in the middle of the tile don't cover it
  const decalH = (tileW - 1) * FLOORLBL_H / FLOORLBL_W;
  const nameDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(tileW - 1, decalH),
    new THREE.MeshBasicMaterial({ map: floorLabelTexture(z.name, cl.color), transparent: true,
      opacity: 0.92, depthWrite: false, toneMapped: false }));
  nameDecal.rotation.x = -Math.PI / 2;
  nameDecal.position.set(0, tileH + 0.03, tileD / 2 - 0.2 - decalH / 2);
  grp.add(nameDecal);

  return { z, cl, grp, fill, edges, glow, propMats, figures, nameDecal };
});

// cluster banner labels (above each column)
const clusterLabels = {};
['A', 'B', 'C'].forEach(k => {
  const cl = CLUSTERS[k];
  const x = ZONES.find(z => z.cl === k).x;
  const lbl = makeLabel(cl.name, `cluster-label ${cl.key}`, 0);
  lbl.obj.position.set(x, 5.6, 0); scene.add(lbl.obj);
  clusterLabels[k] = lbl;
});

// impact ripple on zone arrival
const ripple = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.78, 64),
  new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
ripple.rotation.x = -Math.PI / 2; scene.add(ripple);
let rippleAge = 999;

// ============================================================
//  UI + STORY ENGINE
// ============================================================
const ui = {
  titlecard: document.getElementById('titlecard'), caption: document.getElementById('caption'),
  replay: document.getElementById('replayBtn'), start: document.getElementById('startBtn'),
  loading: document.getElementById('loading'), progress: document.getElementById('progress'),
  vignette: document.getElementById('vignette'), mute: document.getElementById('muteBtn'),
  pause: document.getElementById('pauseBtn'),
  endcard: document.getElementById('endcard'), legend: document.getElementById('legend'),
  panel: document.getElementById('zonepanel'),
  zpCluster: document.getElementById('zpCluster'), zpTitle: document.getElementById('zpTitle'),
  zpPurpose: document.getElementById('zpPurpose'), zpCaps: document.getElementById('zpCaps'),
};
const legEls = { A: ui.legend.querySelector('.tt'), B: ui.legend.querySelector('.wf'), C: ui.legend.querySelector('.sc') };

// voiceover — pre-rendered clips, one per beat. Plays if present, else caption-only.
const VO = {
  available: false, files: [], dur: [], el: new window.Audio(),
  // Live-clip tracking so the tour can wait for narration to actually finish (see updateStory).
  // `playingIdx` = beat whose clip is loaded; `clipEnded` flips true on the audio 'ended' event
  // (or on any load/play failure); `holdUntil` is a real-time watchdog so a clip that stalls and
  // never fires 'ended' can't freeze the tour.
  playingIdx: -1, clipEnded: true, holdUntil: 0,
  async init() {
    try {
      const r = await fetch('vo/manifest.json', { cache: 'no-store' });
      if (!r.ok) return;
      const m = await r.json();
      this.files = m.clips.map(c => 'vo/' + c.file);
      this.dur = m.clips.map(c => c.dur);
      this.available = true; this.el.preload = 'auto'; this.el.volume = 0.95;
      if (this.dur.length === beats.length) paceBeats(this.dur);   // sync the tour to the narration
      this.el.addEventListener('ended', () => { this.clipEnded = true; Audio.duck(false); });
    } catch (e) { /* no VO — captions carry the story */ }
  },
  play(i) {
    if (!this.available || Audio.muted || !this.files[i]) { this.playingIdx = -1; this.clipEnded = true; return; }
    this.playingIdx = i; this.clipEnded = false;
    this.holdUntil = clock.elapsedTime + (this.dur[i] || 12) + 4;   // never wait past clip length + slack
    try { this.el.pause(); this.el.currentTime = 0; this.el.src = this.files[i];
      this.el.play().then(() => Audio.duck(true)).catch(() => { this.clipEnded = true; }); } catch (e) { this.clipEnded = true; }
  },
  // is beat `i`'s narration still playing (so the scene should hold on it)?
  talking(i) { return this.playingIdx === i && !this.clipEnded && clock.elapsedTime < this.holdUntil; },
  stop() { try { this.el.pause(); } catch (e) {} this.playingIdx = -1; this.clipEnded = true; Audio.duck(false); },
};
VO.init();

// progress pips (clickable — jump to a zone)
const pips = ZONES.map((_, i) => {
  const p = document.createElement('span'); p.className = 'pip'; ui.progress.appendChild(p);
  p.addEventListener('click', () => onPick(i));
  return p;
});

// beats — intro wide → one per zone (tour order 1,6,2,3,4,5) → finale wide.
// `zone` is an index into ZONES (-1 = wide framing shot). `cam` is the camera offset from focus.
const beats = [
  { t: 0, zone: -1, cam: [0, 26, 38], cap: 'An innovation center isn’t a building — it’s a capability you can walk through.' },
  { t: 0, zone: 0,  cam: [3.2, 6.8, 10], cap: 'Think Tank · Zone 1 — Mission Framing. A raw problem becomes a sharp, defined challenge.' },
  { t: 0, zone: 1,  cam: [3.2, 6.8, 10], cap: 'Think Tank · Zone 6 — Knowledge Hub. The memory of the center; every challenge leaves knowledge.' },
  { t: 0, zone: 2,  cam: [3.2, 6.8, 10], cap: 'Workshop Floor · Zone 2 — Digital Experimentation. Prove it in a digital twin before cutting metal.' },
  { t: 0, zone: 3,  cam: [3.2, 6.8, 10], cap: 'Workshop Floor · Zone 3 — Rapid Prototyping & Integration. Where ideas become instrumented things.' },
  { t: 0, zone: 4,  cam: [3.2, 6.8, 10], cap: 'Showcase · Zone 4 — Test & Evaluation. Controlled rigs turn demonstrators into hard evidence.' },
  { t: 0, zone: 5,  cam: [3.2, 6.8, 10], cap: 'Showcase · Zone 5 — Demonstration. Where the center tells its story — and attracts budget.' },
  { t: 0, zone: -1, cam: [0, 30, 42], cap: 'Six zones. One capability — the physical expression of an innovation operating system.' },
];
// pace the beats from the narration: each caption holds until its clip ends + a short gap.
// Falls back to these estimates when voiceover is absent (caption-only).
const DEFAULT_DURS = [6, 12, 12, 12, 12, 12, 12, 7];
const GAP = 0.9;
let STORY_END = 55;
function paceBeats(durs) {
  let t = 0;
  for (let i = 0; i < beats.length; i++) { beats[i].t = Math.round(t * 100) / 100; t += (durs[i] || 6) + GAP; }
  STORY_END = Math.round((t + 1.2) * 100) / 100;
}
paceBeats(DEFAULT_DURS);
const zoneToBeat = ZONES.map((_, zi) => beats.findIndex(b => b.zone === zi));

// state
let playing = false, paused = false, ended = false;
let storyTime = 0, beatIdx = -1;
let activeZone = -2, gridOn = false, finaleT = -1;
const focusPoint = new THREE.Vector3(0, 0, 0);
const desiredPos = new THREE.Vector3();
const desiredLook = new THREE.Vector3(0, 0, 0);
const exploreTarget = new THREE.Vector3(0, 0, 0);
const camOffset = new THREE.Vector3(0, 26, 38);
// Damped rig position, kept separate from camera.position so the handheld sway (added below) is a
// clean fixed-amplitude offset and never gets fed back into the damp (which amplified it into a shake).
const camBase = new THREE.Vector3(0, 26, 40);

const tileCenter = i => new THREE.Vector3(ZONES[i].x, 1.4, ZONES[i].z);

function setCaption(text) { ui.caption.textContent = text; ui.caption.classList.add('show'); }

function openPanel(i) {
  const z = ZONES[i], cl = CLUSTERS[z.cl];
  ui.panel.style.setProperty('--accent', hex2css(cl.color));
  ui.zpCluster.textContent = `${cl.name} · Zone ${z.n}`;
  ui.zpTitle.textContent = z.name;
  ui.zpPurpose.textContent = z.purpose;
  ui.zpCaps.innerHTML = z.caps.map(c => `<li>${c}</li>`).join('');
  ui.panel.classList.add('show');
}
function hidePanel() { ui.panel.classList.remove('show'); }

function fireRipple(i) {
  const c = tileCenter(i);
  ripple.position.set(c.x, 0.04, c.z); rippleAge = 0;
  ripple.material.color.set(CLUSTERS[ZONES[i].cl].color);
}

// the one place active-zone visual state is set — idempotent, safe for tour + clicks
function setActiveZone(i) {
  if (i === activeZone) return;
  activeZone = i;
  pips.forEach((p, k) => { p.classList.toggle('active', k === i); p.classList.toggle('done', i >= 0 && k < i); });
  ['A', 'B', 'C'].forEach(k => {
    const on = i >= 0 && ZONES[i].cl === k;
    clusterLabels[k].el.classList.toggle('lit', on);
    legEls[k].classList.toggle('active', on);
  });
  if (i >= 0) { openPanel(i); fireRipple(i); Audio.gateChime(); }
  else hidePanel();
}

// finale ---------------------------------------------------------
function triggerFinale() {
  if (finaleT >= 0) return;
  finaleT = 0; gridOn = true; Audio.finalChord();
  setTimeout(() => { if (finaleT >= 0) ui.endcard.classList.add('show'); }, 600);
}

// timeline driver ------------------------------------------------
function updateStory(t) {
  let idx = 0; for (let i = 0; i < beats.length; i++) if (t >= beats[i].t) idx = i;
  // Hold on the current beat until its narration clip has actually finished. The wall clock can
  // outrun the audio on a deployed server — per-clip network buffering delays when a clip starts,
  // and a late manifest load leaves the (shorter) DEFAULT_DURS pacing in effect — which otherwise
  // cuts the scene to the next zone while the voice is still talking. Park at the next boundary so
  // exactly one beat advances the moment the clip ends (never skipping a zone).
  if (beatIdx >= 0 && idx > beatIdx && VO.talking(beatIdx)) { storyTime = beats[beatIdx + 1].t; return; }
  if (idx !== beatIdx) {
    beatIdx = idx; const b = beats[idx];
    camOffset.set(b.cam[0], b.cam[1], b.cam[2]);
    if (b.zone >= 0) { focusPoint.copy(tileCenter(b.zone)); setActiveZone(b.zone); }
    else { focusPoint.set(0, 0.5, 0); setActiveZone(-1); }
    if (idx === beats.length - 1) { ui.caption.classList.remove('show'); triggerFinale(); }
    else setCaption(b.cap);
    VO.play(idx);
  }
  if (t >= STORY_END && !ended) endStory();
}

// play / seek / explore -----------------------------------------
function startStory() {
  resetScene();
  Audio.resume(); Audio.startAmbient();
  ui.titlecard.classList.remove('show'); ui.replay.hidden = true;
  ui.pause.hidden = false; ui.pause.textContent = '⏸ Pause';
  ui.legend.classList.add('show');
  playing = true; paused = false; ended = false; storyTime = 0; beatIdx = -1; controls.enabled = false;
  camBase.copy(camera.position);   // start the damped rig from wherever the idle framing left the camera
}
function seekZone(zi) {                       // jump within the tour timeline
  if (!playing) startStory();
  const bi = zoneToBeat[zi];
  ended = false; ui.replay.hidden = true; controls.enabled = false;
  storyTime = beats[bi].t + 0.01; beatIdx = -1; paused = false; playing = true;
}
function inspectZone(zi) {                     // explore mode — light + refocus orbit, no restart
  setActiveZone(zi);
  exploreTarget.copy(tileCenter(zi));
}
function onPick(zi) { if (ended) inspectZone(zi); else seekZone(zi); }

function endStory() {
  ended = true; playing = false; paused = false;
  Audio.fadeMaster(0, 2.5);
  ui.pause.hidden = true; ui.replay.hidden = false;
  controls.target.copy(desiredLook); exploreTarget.set(0, 0.5, 0);
  controls.enabled = true;
}
function resetScene() {
  storyTime = 0; beatIdx = -1; gridOn = false; finaleT = -1;
  bloom.strength = bloomBase;
  ui.caption.classList.remove('show'); ui.endcard.classList.remove('show');
  ui.legend.classList.remove('show'); hidePanel(); VO.stop();
  activeZone = -2; setActiveZone(-1);
  zoneObjs.forEach(o => {
    o.grp.position.y = 0;
    o.edges.material.opacity = 0.32; o.fill.material.opacity = 0.1; o.glow.material.opacity = 0.06;
    o.propMats.forEach(p => p.m.opacity = p.base * 0.26);
  });
  focusPoint.set(0, 0.5, 0); camOffset.set(0, 26, 38);
  desiredPos.copy(focusPoint).add(camOffset); camera.position.copy(desiredPos);
  desiredLook.set(0, 0, 0); camera.lookAt(desiredLook);
}

ui.start.addEventListener('click', startStory);
ui.replay.addEventListener('click', startStory);

function toggleMute() {
  Audio.resume(); Audio.setMuted(!Audio.muted);
  VO.el.muted = Audio.muted;
  ui.mute.textContent = Audio.muted ? '🔇 Muted' : '🔊 Sound';
}
ui.mute.addEventListener('click', toggleMute);

// pause / resume the tour — freezes the timeline AND the narration, and reflects state on the
// button so it stays in sync whether toggled by the button or the Space key.
function setPaused(p) {
  if (!playing || ended) return;
  paused = p;
  ui.pause.textContent = paused ? '▶ Resume' : '⏸ Pause';
  ui.pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
  if (paused) { try { VO.el.pause(); } catch (e) {} }
  else if (VO.available && !Audio.muted && VO.playingIdx >= 0 && !VO.clipEnded) {
    try { VO.el.play().catch(() => {}); } catch (e) {}
    // push the narration watchdog out past the time spent paused, so the beat still waits for the clip
    VO.holdUntil = clock.elapsedTime + Math.max(0, (VO.dur[VO.playingIdx] || 12) - VO.el.currentTime) + 2;
  }
}
function togglePause() { setPaused(!paused); }
ui.pause.addEventListener('click', togglePause);

// Silence this demo whenever its page is hidden or navigated away (e.g. switching
// between the landing page and the other demo) so a backgrounded/bfcached page can't
// keep playing and overlap the one in view. Resume only if it was mid-play.
function silenceOnLeave() { try { VO.stop(); Audio.suspend(); } catch (e) {} }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) silenceOnLeave();
  else if (playing) Audio.resume();
});
window.addEventListener('pagehide', silenceOnLeave);

// click a zone tile (works as jump during tour, inspect during explore)
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downX = 0, downY = 0;
renderer.domElement.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
renderer.domElement.addEventListener('pointerup', e => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // a drag, not a click
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickMeshes, false)[0];
  if (hit) onPick(hit.object.userData.zone);
});

// presenter keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); togglePause(); }
  else if (e.key === 'ArrowRight') { onPick(Math.min(Math.max(activeZone, 0) + 1, ZONES.length - 1)); }
  else if (e.key === 'ArrowLeft')  { onPick(Math.max(Math.max(activeZone, 0) - 1, 0)); }
  else if (e.key === 'r' || e.key === 'R') { startStory(); }
  else if (e.key === 'm' || e.key === 'M') { toggleMute(); }
});

// ============================================================
//  ANIMATION LOOP
// ============================================================
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime;

  if (playing && !paused) storyTime += dt;
  if (playing) updateStory(storyTime);

  // zone tiles — lift + brighten the active one
  zoneObjs.forEach((o, i) => {
    const active = i === activeZone;
    o.grp.position.y = THREE.MathUtils.damp(o.grp.position.y, active ? 1.3 : 0, 3, dt);
    o.edges.material.opacity = THREE.MathUtils.damp(o.edges.material.opacity, active ? 1 : 0.3, 4, dt);
    o.fill.material.opacity = THREE.MathUtils.damp(o.fill.material.opacity, active ? 0.14 : 0.08, 4, dt);
    o.glow.material.opacity = THREE.MathUtils.damp(o.glow.material.opacity, active ? 0.07 : 0.04, 4, dt);
    o.nameDecal.material.opacity = THREE.MathUtils.damp(o.nameDecal.material.opacity, active ? 1 : 0.92, 4, dt);
    o.propMats.forEach(p => {
      p.m.opacity = THREE.MathUtils.damp(p.m.opacity, active ? p.base : p.base * 0.26, 4, dt);
    });
    // people animate only while their zone is selected — each joint ("motor") is driven by
    // the figure's MEANINGFUL activity (f.act): walking, typing, working, presenting… not noise.
    o.figures.forEach(f => {
      const g = f.g, J = f.j, R = f.rest;
      if (active && !reducedMotion) {
        const ph = f.phase + time * f.rate;                            // per-figure timing → no two in lockstep
        switch (f.act) {
          case 'walk': {
            const w = f.walk; let dist, dx, dz;
            if (w.P) {                                                 // patrol a route between stations
              dist = time * w.speed * f.rate;
              const q = pathAt(w.P, dist); g.position.x = q.x; g.position.z = q.z; dx = q.dx; dz = q.dz;
            } else {                                                   // (fallback) circular loop
              const ang = f.phase + time * w.speed * f.rate;
              g.position.x = w.cx + Math.cos(ang) * w.r; g.position.z = w.cz + Math.sin(ang) * w.r;
              dx = -Math.sin(ang); dz = Math.cos(ang); dist = w.r * time * w.speed * f.rate;
            }
            g.rotation.y = Math.atan2(dx, dz);                         // face the direction of travel
            const p = (dist / 0.55) * Math.PI * 2 + f.phase;           // stride locked to distance → no foot-slide
            const sw = Math.sin(p);
            J.lL.p.rotation.x = sw * 0.45; J.lR.p.rotation.x = -sw * 0.45;          // thighs swing opposite
            J.lL.k.rotation.x = Math.max(0, -sw) * 0.7; J.lR.k.rotation.x = Math.max(0, sw) * 0.7; // knee bends on recovery
            J.aL.p.rotation.x = -sw * 0.32; J.aR.p.rotation.x = sw * 0.32;          // arms counter-swing
            J.aL.e.rotation.x = 0.3; J.aR.e.rotation.x = 0.3;
            g.position.y = Math.abs(Math.sin(p)) * 0.022; g.rotation.x = 0; g.rotation.z = 0;
            break;
          }
          case 'type':                                                 // seated at a console — typing, watching the screen
            J.aL.p.rotation.x = -0.55; J.aR.p.rotation.x = -0.55;
            J.aL.e.rotation.x = 0.8 + Math.sin(ph * 3.0) * 0.12; J.aR.e.rotation.x = 0.8 + Math.sin(ph * 3.0 + 1.4) * 0.12;
            g.rotation.x = 0.04; break;
          case 'read':                                                 // seated, leaning over a book, occasional page-turn
            J.aL.p.rotation.x = -0.5; J.aR.p.rotation.x = -0.5; J.aL.e.rotation.x = 1.2;
            J.aR.e.rotation.x = 1.2 + Math.pow(Math.max(0, Math.sin(ph * 0.45)), 10) * 0.5;
            g.rotation.x = 0.16; break;
          case 'meet':                                                 // seated, attentive, slight nod toward the table
            J.aL.p.rotation.x = -0.3; J.aR.p.rotation.x = -0.3; J.aL.e.rotation.x = 0.5; J.aR.e.rotation.x = 0.5;
            g.rotation.x = 0.02 + Math.sin(ph * 0.5) * 0.025; break;
          case 'work':                                                 // standing at a bench, one hand working
            J.aR.p.rotation.x = -0.7 + Math.sin(ph * 2.0) * 0.28; J.aR.e.rotation.x = 0.7;
            J.aL.p.rotation.x = -0.35; J.aL.e.rotation.x = 0.5; g.rotation.x = 0.10; break;
          case 'present':                                              // gesturing toward the wall / exhibit
            J.aR.p.rotation.x = -1.15 + Math.sin(ph * 1.1) * 0.16; J.aR.e.rotation.x = 0.35; J.aL.p.rotation.x = -0.1;
            g.rotation.z = Math.sin(ph * 0.7) * 0.02; break;
          case 'vr':                                                   // exploring in VR — hands up, slow deliberate look
            J.aL.p.rotation.x = -1.0 + Math.sin(ph * 1.3) * 0.14; J.aR.p.rotation.x = -1.0 + Math.sin(ph * 1.3 + 1) * 0.14;
            J.aL.e.rotation.x = 0.6; J.aR.e.rotation.x = 0.6; g.rotation.y = f.ry + Math.sin(ph * 0.45) * 0.22; break;
          case 'browse': {                                             // reaching to a shelf periodically
            const reach = Math.max(0, Math.sin(ph * 0.5));
            J.aR.p.rotation.x = -0.2 - reach * 0.8; J.aR.e.rotation.x = 0.3; break;
          }
          case 'observe':                                              // holding a clipboard, glancing down then up
            J.aL.p.rotation.x = -0.5; J.aL.e.rotation.x = 1.4;
            g.rotation.x = 0.06 + Math.sin(ph * 0.35) * 0.07; break;
          default:                                                     // 'view' — standing calm, a small weight shift
            g.rotation.z = Math.sin(ph * 0.5) * 0.015;
        }
      } else {                                                         // not selected → relax back to the figure's rest pose
        const d = (cur, tgt) => THREE.MathUtils.damp(cur, tgt, 5, dt);
        g.position.y = d(g.position.y, f.seated ? -0.02 : 0); g.rotation.z = d(g.rotation.z, 0);
        g.rotation.x = d(g.rotation.x, R.rx); g.rotation.y = d(g.rotation.y, f.ry);
        if (f.walk) { g.position.x = THREE.MathUtils.damp(g.position.x, f.x0, 3, dt); g.position.z = THREE.MathUtils.damp(g.position.z, f.z0, 3, dt); }
        J.aL.p.rotation.x = d(J.aL.p.rotation.x, R.aLp); J.aR.p.rotation.x = d(J.aR.p.rotation.x, R.aRp);
        J.aL.e.rotation.x = d(J.aL.e.rotation.x, R.aLe); J.aR.e.rotation.x = d(J.aR.e.rotation.x, R.aRe);
        J.lL.p.rotation.x = d(J.lL.p.rotation.x, R.lLp); J.lR.p.rotation.x = d(J.lR.p.rotation.x, R.lRp);
        J.lL.k.rotation.x = d(J.lL.k.rotation.x, R.lLk); J.lR.k.rotation.x = d(J.lR.k.rotation.x, R.lRk);
      }
    });
  });
  if (!reducedMotion) spinners.forEach(s => { s.rotation.y += (s.userData.spin || 0.3) * dt; });

  // cluster labels gentle bob
  Object.values(clusterLabels).forEach((l, i) => { l.obj.position.y = 5.6 + Math.sin(time * 0.8 + i) * 0.12; });

  // ripple
  rippleAge += dt;
  const rk = rippleAge / 0.9;
  if (rk < 1) { const rs = 1 + rk * 4.2; ripple.scale.set(rs, rs, rs); ripple.material.opacity = 0.7 * (1 - rk); }
  else ripple.material.opacity = 0;

  // atmosphere + substrate
  nebula.children.forEach(m => { m.rotation.z += m.userData.spin * dt; });
  grid.material.opacity = THREE.MathUtils.damp(grid.material.opacity, gridOn ? 0.5 : 0.12, 2, dt);
  floor.material.opacity = THREE.MathUtils.damp(floor.material.opacity, gridOn ? 0.7 : 0.4, 2, dt);

  // finale flare
  if (finaleT >= 0) {
    finaleT += dt;
    const env = finaleT < 0.3 ? finaleT / 0.3 : Math.max(0, 1 - (finaleT - 0.3) / 1.9);
    bloom.strength = bloomBase + env * 0.8;
  }

  // camera — cinematic rig during the tour, free orbit after
  if (playing && !ended) {
    desiredPos.copy(focusPoint).add(camOffset);
    expApproach(camBase, desiredPos, 1.6, dt);
    expApproach(desiredLook, focusPoint, 2.2, dt);
    camera.position.copy(camBase);
    if (!reducedMotion) {   // handheld sway — a fixed offset off the damped base, not fed back into it
      camera.position.x += Math.sin(time * 0.22) * 0.18;
      camera.position.y += Math.sin(time * 0.17 + 1) * 0.10;
    }
    camera.lookAt(desiredLook);
  } else {
    expApproach(controls.target, exploreTarget, 2.0, dt);
    controls.update();
  }

  composer.render();
  labelRenderer.render(scene, camera);
}

// ---------- boot ----------
resetScene();
ui.loading.style.display = 'none';
animate();

// ---------- resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});
