// Procedural canvas-based color textures for reference bodies (Sun + planets).
//
// We deliberately *generate* these on the fly instead of shipping real
// equirectangular photo maps (the way matteodante/portfolio-cockpit does with
// its `public/textures/planets/*.jpg`). That keeps qingmingriver true to its
// "pure HTML / CSS / ES-module JS, no third-party CDN, no large binary assets"
// deployment story while still giving each planet a recognisable surface.
//
// Each builder returns a THREE.CanvasTexture sized 1024x512 (2:1, latitude is
// the Y axis) suitable for use as a `map` on a SphereGeometry.

import * as THREE from "../vendor/three/build/three.module.js";

const TEX_W = 1024;
const TEX_H = 512;

// ---------- noise helpers (deterministic, seeded by planet id) ----------

function hash2D(x, y, seed) {
  const h = Math.sin(x * 127.1 + y * 311.7 + seed * 91.3) * 43758.5453;
  return h - Math.floor(h);
}

function smooth(t) { return t * t * (3 - 2 * t); }

function valueNoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const a = hash2D(xi,     yi,     seed);
  const b = hash2D(xi + 1, yi,     seed);
  const c = hash2D(xi,     yi + 1, seed);
  const d = hash2D(xi + 1, yi + 1, seed);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x, y, seed, octaves = 5, lacunarity = 2.0, gain = 0.5) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 13) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

// ---------- color helpers ----------

function mixColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function hexToRgb(hex) {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function rgbStr([r, g, b], a = 1) { return `rgba(${r},${g},${b},${a})`; }

// Pick a colour from an ordered gradient stop list `[ [t, [r,g,b]], ... ]`.
function sampleGradient(stops, t) {
  if (t <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0);
      return mixColor(c0, c1, k);
    }
  }
  return stops[stops.length - 1][1];
}

// Per-pixel canvas filler. `colorAt(u, v, n)` returns [r,g,b].
//   u: longitude  0..1
//   v: latitude   0..1   (0 = north pole, 1 = south pole)
//   n: noise sample in 0..1 (precomputed multi-octave)
function fillCanvas(ctx, seed, colorAt, noiseScale = 4) {
  const img = ctx.createImageData(TEX_W, TEX_H);
  const data = img.data;
  for (let y = 0; y < TEX_H; y++) {
    const v = y / (TEX_H - 1);
    for (let x = 0; x < TEX_W; x++) {
      const u = x / (TEX_W - 1);
      // Sample noise in spherical-ish coords so seams line up at u=0 vs u=1.
      const theta = u * Math.PI * 2;
      const nx = Math.cos(theta) * noiseScale;
      const nz = Math.sin(theta) * noiseScale;
      const n = fbm(nx + 17, v * noiseScale * 2 + nz * 0.0, seed);
      const [r, g, b] = colorAt(u, v, n);
      const i = (y * TEX_W + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function makeCanvas() {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  return c;
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// ---------- per-planet generators ----------

function buildSun() {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  const hot  = hexToRgb(0xfff4c4);
  const mid  = hexToRgb(0xffb84a);
  const cool = hexToRgb(0xb84a14);
  fillCanvas(ctx, 7, (_u, _v, n) => {
    // Hot core dots over a banded warm field.
    if (n > 0.72) return mixColor(hot, mid, (n - 0.72) / 0.28);
    if (n > 0.45) return mixColor(mid, hot, (n - 0.45) / 0.27 * 0.4);
    return mixColor(cool, mid, n / 0.45);
  }, 5);
  return toTexture(c);
}

function buildMercury() {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  const base = [
    [0.00, hexToRgb(0x4d4338)],
    [0.45, hexToRgb(0x8a7a66)],
    [0.75, hexToRgb(0xb6a48c)],
    [1.00, hexToRgb(0xd9c7af)],
  ];
  fillCanvas(ctx, 11, (_u, _v, n) => sampleGradient(base, n), 6);
  // Sprinkle craters.
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * TEX_W;
    const y = Math.random() * TEX_H;
    const r = 4 + Math.random() * 14;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(40,32,24,0.55)");
    grd.addColorStop(0.6, "rgba(80,68,56,0.25)");
    grd.addColorStop(1, "rgba(80,68,56,0)");
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  return toTexture(c);
}

function buildVenus() {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  const stops = [
    [0.00, hexToRgb(0x8a5a1f)],
    [0.40, hexToRgb(0xc89a4c)],
    [0.75, hexToRgb(0xe8c98a)],
    [1.00, hexToRgb(0xf5e3b0)],
  ];
  fillCanvas(ctx, 19, (_u, _v, n) => sampleGradient(stops, n), 3);
  return toTexture(c);
}

function buildEarth() {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  const ocean    = hexToRgb(0x113b6b);
  const shallow  = hexToRgb(0x1f6fa5);
  const sand     = hexToRgb(0xc9b27a);
  const land     = hexToRgb(0x2e7d3b);
  const forest   = hexToRgb(0x1f5d2b);
  const ice      = hexToRgb(0xeaf4ff);
  fillCanvas(ctx, 23, (_u, v, n) => {
    // Polar caps weighted by |latitude|.
    const polar = Math.pow(Math.abs(v - 0.5) * 2, 4);
    if (n + polar * 0.35 > 0.78) return mixColor(ice, sand, 0.1);
    // Continents from noise threshold.
    if (n > 0.55) {
      if (n > 0.68) return mixColor(forest, land, (0.78 - n) / 0.10);
      return mixColor(sand, land, (n - 0.55) / 0.13);
    }
    if (n > 0.50) return mixColor(shallow, sand, (n - 0.50) / 0.05);
    return mixColor(ocean, shallow, n / 0.50);
  }, 4);
  return toTexture(c);
}

function buildEarthClouds() {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(TEX_W, TEX_H);
  const data = img.data;
  for (let y = 0; y < TEX_H; y++) {
    const v = y / (TEX_H - 1);
    for (let x = 0; x < TEX_W; x++) {
      const u = x / (TEX_W - 1);
      const theta = u * Math.PI * 2;
      const n = fbm(Math.cos(theta) * 5 + 3, v * 5 + Math.sin(theta) * 1.5, 41, 5);
      // Stretch clouds along bands.
      const banded = n * 0.7 + Math.abs(Math.sin(v * Math.PI * 6)) * 0.3;
      const a = Math.max(0, Math.min(1, (banded - 0.55) * 2.4));
      const i = (y * TEX_W + x) * 4;
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

function buildMars() {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  const stops = [
    [0.00, hexToRgb(0x4a1607)],
    [0.40, hexToRgb(0x8f3a1a)],
    [0.70, hexToRgb(0xc16a3a)],
    [0.90, hexToRgb(0xe19872)],
    [1.00, hexToRgb(0xf2d6c0)],
  ];
  fillCanvas(ctx, 29, (_u, v, n) => {
    const polar = Math.pow(Math.abs(v - 0.5) * 2, 6);
    if (polar > 0.55) return mixColor([240, 240, 240], hexToRgb(0xe19872), 1 - polar);
    return sampleGradient(stops, n);
  }, 5);
  return toTexture(c);
}

// Banded gas-giant generator. `bands` is an ordered list of latitude colour
// stops in [0,1] (north pole -> south pole). Noise warps the band boundaries
// so they look turbulent rather than perfectly horizontal.
function buildGasGiant(bands, seed, warp = 0.10, noiseScale = 6) {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  fillCanvas(ctx, seed, (_u, v, n) => {
    const warped = Math.max(0, Math.min(1, v + (n - 0.5) * warp));
    return sampleGradient(bands, warped);
  }, noiseScale);
  return toTexture(c);
}

function buildJupiter() {
  return buildGasGiant([
    [0.00, hexToRgb(0xc9a978)],
    [0.18, hexToRgb(0xe5cfa3)],
    [0.30, hexToRgb(0x8b5a3c)],
    [0.45, hexToRgb(0xe8d2a8)],
    [0.55, hexToRgb(0xb37648)],
    [0.70, hexToRgb(0xead2a4)],
    [0.85, hexToRgb(0x8f5e3a)],
    [1.00, hexToRgb(0xc8a47a)],
  ], 37, 0.12, 7);
}

function buildSaturn() {
  return buildGasGiant([
    [0.00, hexToRgb(0xc8a868)],
    [0.30, hexToRgb(0xe6d3a3)],
    [0.55, hexToRgb(0xf3e2b8)],
    [0.80, hexToRgb(0xd9bd84)],
    [1.00, hexToRgb(0xa88746)],
  ], 53, 0.08, 6);
}

function buildUranus() {
  return buildGasGiant([
    [0.00, hexToRgb(0x7fc3c8)],
    [0.50, hexToRgb(0xa8e0e6)],
    [1.00, hexToRgb(0x6da7ad)],
  ], 67, 0.04, 4);
}

function buildNeptune() {
  return buildGasGiant([
    [0.00, hexToRgb(0x2f4a9e)],
    [0.40, hexToRgb(0x4e74d1)],
    [0.55, hexToRgb(0x1e346f)],
    [0.70, hexToRgb(0x5d8bdc)],
    [1.00, hexToRgb(0x2c4a9c)],
  ], 79, 0.10, 6);
}

function buildPluto() {
  const c = makeCanvas();
  const ctx = c.getContext("2d");
  const stops = [
    [0.00, hexToRgb(0x4a3a2c)],
    [0.50, hexToRgb(0x8b7460)],
    [0.85, hexToRgb(0xbfa28a)],
    [1.00, hexToRgb(0xe8d8c4)],
  ];
  fillCanvas(ctx, 89, (_u, _v, n) => sampleGradient(stops, n), 5);
  return toTexture(c);
}

// ---------- public API ----------

const BUILDERS = {
  sun:     buildSun,
  mercury: buildMercury,
  venus:   buildVenus,
  earth:   buildEarth,
  mars:    buildMars,
  jupiter: buildJupiter,
  saturn:  buildSaturn,
  uranus:  buildUranus,
  neptune: buildNeptune,
  pluto:   buildPluto,
};

const cache = new Map();

// Lazily build (and cache) the color map for the given reference-body id.
// Returns null if the id has no known builder so callers can fall back to a
// flat color.
export function getPlanetTexture(id) {
  if (!BUILDERS[id]) return null;
  if (!cache.has(id)) cache.set(id, BUILDERS[id]());
  return cache.get(id);
}

let earthCloudsCache = null;
export function getEarthCloudsTexture() {
  if (!earthCloudsCache) earthCloudsCache = buildEarthClouds();
  return earthCloudsCache;
}
