/*
 * tools/build-models.mjs
 * ------------------------------------------------------------
 * Generates a small library of procedural, stylized glTF (.glb) models for
 * the major bodies in the 3D viewer. Output is written to ../assets/models.
 *
 * The models are intentionally lightweight (a few hundred triangles each,
 * no textures) so they ship as small .glb files (typically < 30 KB each)
 * that can be committed into the repository. They are *recognizable* —
 * a high-gain dish + bus + RTG for Voyager, a hex mirror + sunshield for
 * JWST, a banded sphere + ring for Saturn, etc. — but they are NOT
 * accurate physical representations of the spacecraft.
 *
 * License of the generated assets: CC0 / public domain.
 *
 * Usage:
 *   cd tools
 *   npm install
 *   npm run build:models
 *
 * Re-run any time the model definitions change.
 */

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// --- Browser API polyfills for Node so GLTFExporter (binary mode) works ---
// Node 20+ provides Blob globally. GLTFExporter's binary path uses FileReader
// to read the JSON-side blob into an ArrayBuffer; this shim emulates the
// minimal behaviour we need (readAsArrayBuffer / onloadend / .result).
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(buf => {
        this.result = buf;
        if (typeof this.onloadend === "function") this.onloadend();
      });
    }
  };
}
// GLTFExporter calls `URL.createObjectURL` and `URL.revokeObjectURL` only when
// embedding image textures. Our procedural models have no textures, so no-ops
// would suffice, but provide them for safety.
if (typeof globalThis.URL.createObjectURL === "undefined") {
  globalThis.URL.createObjectURL = () => "blob:noop";
  globalThis.URL.revokeObjectURL = () => {};
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "assets", "models");
mkdirSync(OUT_DIR, { recursive: true });

// ---------- Helpers ---------------------------------------------------------

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metalness ?? 0.4,
    roughness: opts.roughness ?? 0.55,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
  });
}

function meshAt(geo, material, x = 0, y = 0, z = 0, rot = null, name = "") {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
  if (name) m.name = name;
  return m;
}

// Solar panel: a flat boxy plane with a darker subdivided look — actually
// just a single box with an emissive cell tint for readability.
function solarPanel(w, h, name = "panel") {
  const g = new THREE.BoxGeometry(w, 0.04, h);
  const m = mat(0x1a4080, { metalness: 0.3, roughness: 0.6, emissive: 0x101830, emissiveIntensity: 0.4 });
  const panel = new THREE.Mesh(g, m);
  panel.name = name;
  // Add a tiny bezel / frame
  const frameGeo = new THREE.BoxGeometry(w + 0.06, 0.05, h + 0.06);
  const frameMat = mat(0xc8d0d8, { metalness: 0.7, roughness: 0.3 });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = -0.005;
  panel.add(frame);
  return panel;
}

// ---------- Reference bodies (planets) -------------------------------------

function buildSun() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    mat(0xffd27a, { emissive: 0xffb84d, emissiveIntensity: 1.4, metalness: 0, roughness: 1 })
  );
  g.add(core);
  // Subtle outer photosphere
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 24, 16),
    mat(0xffe0a0, { emissive: 0xffc070, emissiveIntensity: 0.4, transparent: true, opacity: 0.35, side: THREE.BackSide })
  );
  g.add(halo);
  return g;
}

function buildPlanet(color, opts = {}) {
  const g = new THREE.Group();
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    mat(color, { metalness: 0.05, roughness: 0.85, emissive: opts.emissive ?? 0x000000, emissiveIntensity: 0.2 })
  );
  g.add(sphere);
  // Optional banding for gas giants: a slightly squashed ring of darker color.
  if (opts.bands) {
    for (let i = 0; i < 4; i++) {
      const y = (i - 1.5) * 0.35;
      const r = Math.sqrt(Math.max(0.0001, 1 - y * y));
      const tube = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.04, 8, 48),
        mat(opts.bandColor || 0x000000, { metalness: 0.0, roughness: 1.0, transparent: true, opacity: 0.35 })
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.y = y;
      g.add(tube);
    }
  }
  // Optional ring system (Saturn).
  if (opts.ring) {
    const ringGeo = new THREE.RingGeometry(1.35, 2.1, 96);
    const ringMat = mat(0xe6d3a3, {
      metalness: 0.1, roughness: 0.8, side: THREE.DoubleSide,
      transparent: true, opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2.2;
    g.add(ring);
  }
  // Optional axial tilt (Uranus).
  if (opts.tilt) g.rotation.z = opts.tilt;
  return g;
}

// ---------- Spacecraft ------------------------------------------------------

// Voyager / Pioneer style: high-gain dish + bus + RTG boom + magnetometer.
function buildVoyager() {
  const g = new THREE.Group();
  // Dish (parabolic-ish: thin cylinder)
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 0.08, 48, 1, true),
    mat(0xe6e6e6, { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide })
  );
  dish.rotation.x = Math.PI / 2;
  dish.position.z = 0.45;
  g.add(dish);
  // Dish back / cone
  const dishBack = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 0.35, 48, 1, true),
    mat(0xc0c0c0, { metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide })
  );
  dishBack.rotation.x = -Math.PI / 2;
  dishBack.position.z = 0.25;
  g.add(dishBack);
  // 10-sided bus
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10),
    mat(0xb89860, { metalness: 0.55, roughness: 0.4 })
  );
  bus.rotation.x = Math.PI / 2;
  bus.position.z = 0.0;
  g.add(bus);
  // RTG boom + RTG cans
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8),
    mat(0x808080, { metalness: 0.5, roughness: 0.5 })
  );
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-1.0, 0, 0);
  g.add(boom);
  for (let i = 0; i < 3; i++) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.22, 12),
      mat(0x404040, { metalness: 0.4, roughness: 0.6 })
    );
    can.rotation.z = Math.PI / 2;
    can.position.set(-1.5 - i * 0.28, 0, 0);
    g.add(can);
  }
  // Magnetometer boom (the long one)
  const mag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 3.2, 6),
    mat(0xb0b0b0, { metalness: 0.4, roughness: 0.5 })
  );
  mag.rotation.z = Math.PI / 2;
  mag.position.set(2.0, 0, 0);
  g.add(mag);
  return g;
}

// Pioneer: dish + tiny bus + RTG booms (similar but smaller / simpler)
function buildPioneer() {
  const g = new THREE.Group();
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 0.07, 36, 1, true),
    mat(0xe0e0e0, { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide })
  );
  dish.rotation.x = Math.PI / 2;
  dish.position.z = 0.3;
  g.add(dish);
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.25, 0.25),
    mat(0xa0a0a0, { metalness: 0.5, roughness: 0.45 })
  );
  bus.position.z = 0.0;
  g.add(bus);
  // Two RTG arms
  for (const dir of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6),
      mat(0x808080)
    );
    arm.rotation.z = Math.PI / 2;
    arm.position.x = dir * 0.85;
    g.add(arm);
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.2, 10),
      mat(0x404040)
    );
    can.rotation.z = Math.PI / 2;
    can.position.x = dir * 1.55;
    g.add(can);
  }
  return g;
}

// New Horizons: trapezoidal bus + dish + RTG cylinder.
function buildNewHorizons() {
  const g = new THREE.Group();
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.5, 0.6),
    mat(0xc88f4a, { metalness: 0.5, roughness: 0.5 })
  );
  g.add(bus);
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.06, 36, 1, true),
    mat(0xeaeaea, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide })
  );
  dish.rotation.x = Math.PI / 2;
  dish.position.z = 0.45;
  g.add(dish);
  // RTG along one side
  const rtg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.7, 14),
    mat(0x303030)
  );
  rtg.position.set(-0.65, 0, 0);
  rtg.rotation.z = Math.PI / 2;
  g.add(rtg);
  return g;
}

// Cassini: long stack with dish on top + RTG cans.
function buildCassini() {
  const g = new THREE.Group();
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.4, 1.4, 16),
    mat(0xd9b070, { metalness: 0.55, roughness: 0.4 })
  );
  g.add(stack);
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.07, 40, 1, true),
    mat(0xeeeeee, { metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide })
  );
  dish.position.y = 0.85;
  g.add(dish);
  // Magnetometer-like boom
  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 2.5, 6),
    mat(0xb0b0b0)
  );
  boom.rotation.z = Math.PI / 2;
  boom.position.x = 1.4;
  g.add(boom);
  // RTGs
  for (let i = 0; i < 3; i++) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.4, 12),
      mat(0x303030)
    );
    can.rotation.z = Math.PI / 2;
    can.position.set(-0.55, -0.4 + i * 0.4, 0);
    g.add(can);
  }
  return g;
}

// JWST: 18-segment hex mirror (approximated as a flat circle of hex tiles)
// + diamond sunshield + bus underneath.
function buildJWST() {
  const g = new THREE.Group();
  // Sunshield (5 layers stacked, large diamond)
  for (let i = 0; i < 5; i++) {
    const w = 4 + i * 0.05;
    const h = 2.6 + i * 0.04;
    const layer = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      mat(0xc6cad0, {
        metalness: 0.85, roughness: 0.25, side: THREE.DoubleSide,
        emissive: 0x222a36, emissiveIntensity: 0.2,
      })
    );
    layer.rotation.x = -Math.PI / 2;
    layer.rotation.z = Math.PI / 4;
    layer.position.y = -0.25 - i * 0.05;
    g.add(layer);
  }
  // Hex mirror tiles. Approximated by 19 small hex prisms in honeycomb.
  const hexMat = mat(0xf6e7a8, { metalness: 0.95, roughness: 0.15, emissive: 0x332a10, emissiveIntensity: 0.25 });
  const tileR = 0.32;
  // Honeycomb offsets (axial coords)
  const axials = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (q + r < -2 || q + r > 2) continue;
      axials.push([q, r]);
    }
  }
  for (const [q, r] of axials) {
    const x = tileR * Math.sqrt(3) * (q + r / 2);
    const z = tileR * 1.5 * r;
    const tile = new THREE.Mesh(new THREE.CylinderGeometry(tileR * 0.95, tileR * 0.95, 0.06, 6), hexMat);
    tile.position.set(x, 0.6, z);
    g.add(tile);
  }
  // Secondary mirror tripod
  const sec = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.06, 24),
    mat(0xf6e7a8, { metalness: 0.95, roughness: 0.15 })
  );
  sec.position.set(0, 1.6, 1.0);
  g.add(sec);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6),
      mat(0x808080)
    );
    strut.position.set(0.4 * Math.sin(a), 1.1, 0.5 + 0.4 * Math.cos(a));
    strut.rotation.z = Math.PI / 6;
    g.add(strut);
  }
  // Bus
  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.4, 0.8),
    mat(0xa0a8b0, { metalness: 0.5, roughness: 0.5 })
  );
  bus.position.y = -0.55;
  g.add(bus);
  return g;
}

// Hubble: cylinder body + aperture door + two solar panels + dish.
function buildHubble() {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 2.4, 24),
    mat(0xe2c878, { metalness: 0.55, roughness: 0.4 })
  );
  tube.rotation.z = Math.PI / 2;
  g.add(tube);
  const aperture = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 0.05, 24),
    mat(0x111111)
  );
  aperture.rotation.z = Math.PI / 2;
  aperture.position.x = 1.22;
  g.add(aperture);
  // Solar panels
  for (const dir of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6),
      mat(0xb0b0b0)
    );
    arm.position.y = dir * 0.6;
    g.add(arm);
    const panel = solarPanel(2.2, 0.9);
    panel.position.y = dir * 1.0;
    g.add(panel);
  }
  // Antenna dish
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.04, 20),
    mat(0xe0e0e0)
  );
  dish.position.set(0.5, 0, -0.7);
  g.add(dish);
  const dishArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6),
    mat(0xb0b0b0)
  );
  dishArm.position.set(0.5, 0, -0.45);
  g.add(dishArm);
  return g;
}

// ISS: simplified truss + 4 solar arrays + a couple of modules.
function buildISS() {
  const g = new THREE.Group();
  // Truss
  const truss = new THREE.Mesh(
    new THREE.BoxGeometry(5.5, 0.2, 0.2),
    mat(0xe0e0e0, { metalness: 0.6, roughness: 0.4 })
  );
  g.add(truss);
  // Modules cluster
  const mod1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 1.6, 16),
    mat(0xeeeeee, { metalness: 0.4, roughness: 0.5 })
  );
  mod1.rotation.x = Math.PI / 2;
  g.add(mod1);
  const mod2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 1.0, 16),
    mat(0xdddddd, { metalness: 0.4, roughness: 0.5 })
  );
  mod2.position.set(0.5, 0, 0);
  g.add(mod2);
  // 4 solar wings
  const wingPositions = [-2.2, -0.9, 0.9, 2.2];
  for (const x of wingPositions) {
    const top = solarPanel(0.8, 2.4);
    top.position.set(x, 0.6, 0);
    top.rotation.z = Math.PI / 2;
    g.add(top);
    const bot = solarPanel(0.8, 2.4);
    bot.position.set(x, -0.6, 0);
    bot.rotation.z = Math.PI / 2;
    g.add(bot);
  }
  // Radiators
  const rad = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 1.4, 0.6),
    mat(0xeeeeee, { metalness: 0.6, roughness: 0.4 })
  );
  rad.position.set(0, 0, 0.6);
  g.add(rad);
  return g;
}

// Tiangong: T-shaped modules + solar panels.
function buildTiangong() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 2.0, 18),
    mat(0xe8e8e8, { metalness: 0.5, roughness: 0.45 })
  );
  core.rotation.z = Math.PI / 2;
  g.add(core);
  // Two side modules
  for (const dir of [-1, 1]) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 1.4, 16),
      mat(0xe0e0e0, { metalness: 0.5, roughness: 0.45 })
    );
    m.position.set(0, 0, dir * 0.8);
    g.add(m);
  }
  // Solar panels (4)
  for (const dir of [-1, 1]) {
    for (const yz of [-1, 1]) {
      const p = solarPanel(0.9, 2.0);
      p.rotation.z = Math.PI / 2;
      p.position.set(dir * 1.4, yz * 0.5, 0);
      g.add(p);
    }
  }
  return g;
}

// Mars rover (perseverance / curiosity look-alike).
function buildRover() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.5, 0.9),
    mat(0xd9c08a, { metalness: 0.4, roughness: 0.6 })
  );
  body.position.y = 0.45;
  g.add(body);
  // RTG box (sticking out the back)
  const rtg = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.35, 0.45),
    mat(0x303030)
  );
  rtg.position.set(-0.85, 0.45, 0);
  g.add(rtg);
  // Mast / camera head
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10),
    mat(0xb0b0b0)
  );
  mast.position.set(0.4, 1.05, 0);
  g.add(mast);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.18, 0.3),
    mat(0x707070)
  );
  head.position.set(0.4, 1.55, 0);
  g.add(head);
  // Robotic arm (folded)
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.08, 0.08),
    mat(0xb0b0b0)
  );
  arm.position.set(0.65, 0.45, 0.4);
  arm.rotation.y = -0.3;
  g.add(arm);
  // 6 wheels
  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 16);
  const wheelMat = mat(0x202020, { metalness: 0.2, roughness: 0.9 });
  const wxs = [-0.5, 0, 0.5];
  for (const wx of wxs) {
    for (const wz of [-0.55, 0.55]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(wx, 0.22, wz);
      w.rotation.x = Math.PI / 2;
      g.add(w);
    }
  }
  return g;
}

// Apollo CSM: command capsule (cone) + service module (cylinder) + nozzle.
function buildApolloCSM() {
  const g = new THREE.Group();
  const sm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.6, 1.6, 24),
    mat(0xd0d0d0, { metalness: 0.7, roughness: 0.3 })
  );
  g.add(sm);
  const cm = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 0.7, 24),
    mat(0xb0b0b0, { metalness: 0.6, roughness: 0.4 })
  );
  cm.position.y = 1.15;
  g.add(cm);
  const nozzle = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.7, 18, 1, true),
    mat(0x404040, { metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide })
  );
  nozzle.position.y = -1.15;
  nozzle.rotation.x = Math.PI;
  g.add(nozzle);
  // High-gain dish
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.04, 20),
    mat(0xe6e6e6)
  );
  dish.position.set(0.85, -0.3, 0);
  dish.rotation.z = Math.PI / 2;
  g.add(dish);
  return g;
}

// Parker Solar Probe: hex bus + circular heat shield + small panels.
function buildPSP() {
  const g = new THREE.Group();
  const shield = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 0.08, 36),
    mat(0xf0e0c0, { metalness: 0.2, roughness: 0.8, emissive: 0x603010, emissiveIntensity: 0.25 })
  );
  shield.position.y = 0.5;
  g.add(shield);
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.7, 6),
    mat(0xb0b0b0)
  );
  g.add(bus);
  // Small folded panels
  for (const dir of [-1, 1]) {
    const p = solarPanel(0.6, 0.4);
    p.position.set(dir * 0.55, 0, 0);
    p.rotation.z = Math.PI / 2;
    g.add(p);
  }
  return g;
}

// Juno: hex bus + 3 long solar panel wings.
function buildJuno() {
  const g = new THREE.Group();
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.6, 6),
    mat(0xd0d0d0, { metalness: 0.5, roughness: 0.5 })
  );
  g.add(bus);
  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24),
    mat(0xeeeeee)
  );
  dish.position.y = 0.4;
  g.add(dish);
  // 3 long panel arms at 120 deg
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const arm = new THREE.Group();
    arm.rotation.y = a;
    const p1 = solarPanel(1.5, 0.7); p1.position.set(1.2, 0, 0); arm.add(p1);
    const p2 = solarPanel(1.5, 0.7); p2.position.set(2.7, 0, 0); arm.add(p2);
    const p3 = solarPanel(1.5, 0.7); p3.position.set(4.2, 0, 0); arm.add(p3);
    g.add(arm);
  }
  return g;
}

// ---------- Registry & export ----------------------------------------------

const REGISTRY = {
  // Reference bodies
  "sun.glb":     buildSun,
  "mercury.glb": () => buildPlanet(0xa39282),
  "venus.glb":   () => buildPlanet(0xe8c98a, { emissive: 0x402810 }),
  "earth.glb":   () => buildPlanet(0x4fc3ff, { bands: false, emissive: 0x0a1a30 }),
  "mars.glb":    () => buildPlanet(0xff7a59, { emissive: 0x301008 }),
  "jupiter.glb": () => buildPlanet(0xe2b07a, { bands: true, bandColor: 0x6a4830 }),
  "saturn.glb":  () => buildPlanet(0xe6d3a3, { ring: true }),
  "uranus.glb":  () => buildPlanet(0xa8e0e6, { tilt: 1.5 }),
  "neptune.glb": () => buildPlanet(0x6c9eff, { emissive: 0x081830 }),
  "pluto.glb":   () => buildPlanet(0xbfa28a),

  // Spacecraft
  "voyager.glb":      buildVoyager,
  "pioneer.glb":      buildPioneer,
  "newhorizons.glb":  buildNewHorizons,
  "cassini.glb":      buildCassini,
  "jwst.glb":         buildJWST,
  "hubble.glb":       buildHubble,
  "iss.glb":          buildISS,
  "tiangong.glb":     buildTiangong,
  "rover.glb":        buildRover,
  "apollo.glb":       buildApolloCSM,
  "psp.glb":          buildPSP,
  "juno.glb":         buildJuno,
};

const exporter = new GLTFExporter();

function exportGLB(root) {
  return new Promise((resolve, reject) => {
    exporter.parse(
      root,
      (result) => resolve(Buffer.from(result)),
      (err) => reject(err),
      { binary: true, embedImages: true }
    );
  });
}

let total = 0;
for (const [name, build] of Object.entries(REGISTRY)) {
  const root = build();
  // Wrap in a parent group with identity transform — keeps the exporter happy
  // and lets us apply transforms predictably at runtime.
  const wrapper = new THREE.Group();
  wrapper.name = name.replace(/\.glb$/, "");
  wrapper.add(root);
  // Drop UV attributes since none of the procedural materials sample textures;
  // this typically saves ~25% file size on sphere-heavy models.
  wrapper.traverse(o => {
    if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.uv) {
      o.geometry.deleteAttribute("uv");
    }
  });
  const buf = await exportGLB(wrapper);
  const out = join(OUT_DIR, name);
  writeFileSync(out, buf);
  total += buf.length;
  console.log(`  ${name.padEnd(20)}  ${(buf.length / 1024).toFixed(1).padStart(6)} KB`);
}
console.log(`Wrote ${Object.keys(REGISTRY).length} models, ${(total / 1024).toFixed(1)} KB total -> ${OUT_DIR}`);
