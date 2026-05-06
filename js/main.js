import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { BODIES, REFERENCE_BODIES, pos } from "./data.js";
import { I18N, detectLang } from "./i18n.js";

// ---------- State ----------
let lang = detectLang();
const state = {
  bodyMeshes: [],   // { data, group, lod, hit, sprite, core, label, labelEl, color, importance }
  refMeshes: [],    // reference (Sun + planets) for context
  selected: null,
  hoveredId: null,
  flyTween: null,
  labelClusters: [], // { el, css2d } pool
};

const CATEGORY_COLOR = {
  earth: 0x4fc3ff,
  moon:  0xc9d6e6,
  mars:  0xff7a59,
  inner: 0xffd166,
  outer: 0xb388ff,
  deep:  0x00ffa3,
};

// ---------- Scene setup ----------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.fog = null;

const camera = new THREE.PerspectiveCamera(
  55, window.innerWidth / window.innerHeight, 0.1, 5000
);
camera.position.set(60, 80, 220);

// CSS2D label renderer (for HTML labels overlaid on canvas)
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "fixed";
labelRenderer.domElement.style.inset = "0";
labelRenderer.domElement.style.pointerEvents = "none";
labelRenderer.domElement.style.zIndex = "5";
document.body.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 1.5;
controls.maxDistance = 1500;
controls.zoomSpeed = 0.9;
controls.rotateSpeed = 0.6;

// ---------- Starfield ----------
function makeStarfield(count = 4000, radius = 1800) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Uniform direction
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.6 + Math.random() * 0.4);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const tint = 0.6 + Math.random() * 0.4;
    const cool = Math.random() < 0.3;
    colors[i * 3]     = tint * (cool ? 0.7 : 1.0);
    colors[i * 3 + 1] = tint * 0.95;
    colors[i * 3 + 2] = tint * (cool ? 1.0 : 0.85);
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 1.6, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.9, depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  return points;
}
scene.add(makeStarfield());

// ---------- Distance reference rings ----------
function makeOrbitRing(au, color = 0x1d3050, opacity = 0.45) {
  const r = Math.log10(au + 1) * 80; // matches data.SCALE
  const segments = 256;
  const geo = new THREE.BufferGeometry();
  const pts = new Float32Array((segments + 1) * 3);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts[i * 3]     = r * Math.cos(a);
    pts[i * 3 + 1] = 0;
    pts[i * 3 + 2] = r * Math.sin(a);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Line(geo, mat);
}
[0.39, 0.72, 1, 1.52, 5.2, 9.58, 19.2, 30.1, 60, 165].forEach(au => {
  scene.add(makeOrbitRing(au));
});

// ---------- Reference bodies (Sun + planets) ----------
function buildReferenceBodies() {
  REFERENCE_BODIES.forEach(b => {
    const p = pos(b.au, b.angle);
    const isSun = b.id === "sun";

    // LOD container so we can swap a real glTF model in for closeups.
    const lod = new THREE.LOD();
    const geo = new THREE.SphereGeometry(b.size, 32, 24);
    const mat = new THREE.MeshBasicMaterial({ color: b.color });
    const sphere = new THREE.Mesh(geo, mat);
    // Always-on simple sphere (mid/far level).
    lod.addLevel(sphere, 0);
    lod.position.set(p.x, p.y, p.z);
    lod.userData = { kind: "reference", id: b.id };
    scene.add(lod);

    if (b.model) {
      attachModelToLOD(lod, b.model, {
        scale: b.modelScale || b.size,
        rotation: b.modelRotation || null,
        near: 0,
      });
      // Push the simple sphere out to be the *far* level so the model is used
      // up close, falling back to the colored sphere when distant.
      // (LOD picks the highest-level whose distance threshold <= camDist; we
      //  rely on the model being added with near=0 and we re-add the sphere
      //  at a larger threshold.)
      lod.addLevel(sphere.clone(), Math.max(20, b.size * 40));
    }

    if (isSun) {
      // Sun glow
      const glowGeo = new THREE.SphereGeometry(b.size * 3.4, 32, 24);
      const glowMat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        side: THREE.BackSide,
        uniforms: { c: { value: new THREE.Color(0xffd27a) } },
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} `,
        fragmentShader: `varying vec3 vN; uniform vec3 c; void main(){ float i = pow(0.7 - dot(vN, vec3(0.0,0.0,1.0)), 2.0); gl_FragColor = vec4(c, i*0.55); }`,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      lod.add(glow);
      const light = new THREE.PointLight(0xfff2c8, 1.2, 0, 0);
      lod.add(light);
    }

    // Body label
    const div = document.createElement("div");
    div.className = "body-label";
    div.textContent = b.names[lang] || b.names.en;
    div.dataset.id = b.id;
    const labelObj = new CSS2DObject(div);
    labelObj.position.set(0, b.size + 1.3, 0);
    lod.add(labelObj);

    state.refMeshes.push({ data: b, mesh: lod, labelEl: div });
  });
}
buildReferenceBodies();

// ---------- Model loading infrastructure (PR2) ----------
// Lazy-loaded glTF models, cached by URL. Each entry resolves to the loaded
// gltf.scene Object3D. Future calls reuse the cached scene via `.clone(true)`
// so each LOD instance gets its own transform.
const _modelCache = new Map();   // url -> Promise<Object3D>
const _gltfLoader = new GLTFLoader();

function loadModel(url) {
  if (_modelCache.has(url)) return _modelCache.get(url);
  const p = new Promise((resolve, reject) => {
    _gltfLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
        if (!root) { reject(new Error("Empty glTF: " + url)); return; }
        // Bake-in some traversal-time tweaks: avoid frustum culling issues for
        // models whose bounds are hard to compute, and disable shadows.
        root.traverse(o => {
          if (o.isMesh) {
            o.castShadow = false;
            o.receiveShadow = false;
            o.frustumCulled = true;
          }
        });
        resolve(root);
      },
      undefined,
      (err) => {
        console.warn("Failed to load model", url, err);
        reject(err);
      }
    );
  });
  _modelCache.set(url, p);
  return p;
}

// Plug a loaded model into a THREE.LOD as the highest detail level. The LOD
// already has lower-detail fallbacks (sphere / sprite) in place at construction
// time, so the experience degrades gracefully if loading fails.
function attachModelToLOD(lod, url, opts = {}) {
  const { scale = 1, rotation = null, near = 0, position = null } = opts;
  loadModel(url).then(srcRoot => {
    const inst = srcRoot.clone(true);
    inst.traverse(o => {
      // Clone materials so per-instance tweaks (color, opacity) don't leak.
      if (o.isMesh && o.material) {
        o.material = Array.isArray(o.material)
          ? o.material.map(m => m.clone())
          : o.material.clone();
      }
    });
    inst.scale.setScalar(scale);
    if (rotation) inst.rotation.set(rotation[0] || 0, rotation[1] || 0, rotation[2] || 0);
    if (position) inst.position.set(position[0] || 0, position[1] || 0, position[2] || 0);
    lod.addLevel(inst, near);
  }).catch(() => { /* fallback levels remain visible */ });
}

// ---------- Spacecraft ----------
function makeCraftSprite(color, major) {
  // Build a small radial-gradient sprite texture once per color.
  const key = `${color}-${major ? 1 : 0}`;
  if (!makeCraftSprite.cache) makeCraftSprite.cache = new Map();
  if (makeCraftSprite.cache.has(key)) return makeCraftSprite.cache.get(key);

  const size = 128;
  const cnv = document.createElement("canvas");
  cnv.width = cnv.height = size;
  const ctx = cnv.getContext("2d");
  const c = new THREE.Color(color);
  const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
  const grd = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grd.addColorStop(0.0, `rgba(255,255,255,1)`);
  grd.addColorStop(0.15, `rgba(${r},${g},${b},1)`);
  grd.addColorStop(0.45, `rgba(${r},${g},${b},0.55)`);
  grd.addColorStop(1.0, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(mat);
  const s = major ? 6.5 : 4.5;
  sprite.scale.set(s, s, 1);
  makeCraftSprite.cache.set(key, sprite);
  return sprite;
}

// Each craft is a Group: invisible pickable hit-sphere + LOD with
// (near) optional glTF model, (mid) tiny solid core, (far) glow sprite.
function buildBodies() {
  BODIES.forEach(b => {
    const p = pos(b.au, b.angle, b.tilt || 0, b.jitter || null);
    const color = CATEGORY_COLOR[b.category] || 0xffffff;

    const group = new THREE.Group();
    group.position.set(p.x, p.y, p.z);

    // --- LOD: model (added async) -> core mesh -> sprite ---
    const lod = new THREE.LOD();
    // Tiny solid core for crispness (mid-detail). Always present so something
    // shows up even before any model loads.
    const coreGeo = new THREE.SphereGeometry(b.major ? 0.45 : 0.3, 12, 10);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);

    // Glow sprite (clone shared material so each can be tinted independently).
    const proto = makeCraftSprite(color, !!b.major);
    const sprite = new THREE.Sprite(proto.material);
    sprite.scale.copy(proto.scale);

    // Levels: index = camera distance threshold (must be ascending).
    // Near (0): the core / model. Mid (60): the core only. Far (300): sprite.
    lod.addLevel(core, 0);
    lod.addLevel(sprite, b.major ? 350 : 180);
    group.add(lod);

    // Always-on far halo: keeps the body visible at any distance even when the
    // LOD has switched to the sprite. The sprite itself is in the LOD too.
    // (No extra mesh needed — sprite is the far level.)

    // Async glTF model becomes a *closer* level than the core when ready.
    if (b.model) {
      attachModelToLOD(lod, b.model, {
        scale: b.modelScale || 1,
        rotation: b.modelRotation || null,
        near: 0,
      });
    }

    // Invisible larger hit sphere for easy picking
    const hitGeo = new THREE.SphereGeometry(2.2, 8, 6);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.userData = { kind: "body", id: b.id };
    group.add(hit);

    // Label
    const div = document.createElement("div");
    div.className = "craft-label" + (b.major ? " major" : "");
    div.textContent = b.names[lang] || b.names.en;
    div.dataset.id = b.id;
    const label = new CSS2DObject(div);
    label.position.set(0, 1.6, 0);
    group.add(label);

    scene.add(group);

    // Importance: hand-tuned priority used by the screen-space label LOD.
    // Higher number = wins more collision contests, shows label sooner.
    const importance = (typeof b.importance === "number")
      ? b.importance
      : (b.major ? 2 : 1);

    state.bodyMeshes.push({
      data: b, group, lod, hit, sprite, core, label, labelEl: div, color, importance
    });
  });
}
buildBodies();

// ---------- Picking ----------
const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 1 };
const pointer = new THREE.Vector2();

function getPickables() {
  return state.bodyMeshes.map(b => b.hit);
}

let pointerDown = null;
canvas.addEventListener("pointerdown", e => {
  pointerDown = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener("pointerup", e => {
  if (!pointerDown) return;
  const dx = e.clientX - pointerDown.x;
  const dy = e.clientY - pointerDown.y;
  const dt = performance.now() - pointerDown.t;
  pointerDown = null;
  // Treat as click only if minimal drag
  if (Math.hypot(dx, dy) > 6 || dt > 600) return;

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(getPickables(), false);
  if (hits.length) {
    const id = hits[0].object.userData.id;
    selectBody(id, true);
  }
});

// ---------- Fly-to camera animation ----------
function flyTo(targetVec3, distance = 12) {
  // Choose new camera position offset from target along current view direction
  const offset = camera.position.clone().sub(controls.target).normalize();
  // If degenerate, choose default
  if (offset.lengthSq() < 1e-6) offset.set(0.5, 0.4, 1).normalize();
  const newCamPos = targetVec3.clone().add(offset.multiplyScalar(distance));

  const fromCam = camera.position.clone();
  const fromTarget = controls.target.clone();
  const toTarget = targetVec3.clone();

  const duration = 1200;
  const start = performance.now();
  state.flyTween = function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    // easeInOutCubic
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(fromCam, newCamPos, e);
    controls.target.lerpVectors(fromTarget, toTarget, e);
    if (t >= 1) state.flyTween = null;
  };
}

function selectBody(id, fly = true) {
  const b = state.bodyMeshes.find(x => x.data.id === id);
  if (!b) return;
  state.selected = b.data.id;
  if (fly) {
    const v = new THREE.Vector3();
    b.group.getWorldPosition(v);
    flyTo(v, 10);
  }
  highlightSelected();
  populateInfo(b.data);
  hideSearchResults();
}

function highlightSelected() {
  state.bodyMeshes.forEach(b => {
    const isSel = b.data.id === state.selected;
    b.labelEl.style.opacity = isSel ? "1" : "";
    b.core.scale.setScalar(isSel ? 1.8 : 1.0);
  });
}

// ---------- Info panel ----------
const infoPanel = document.getElementById("info-panel");
const elName = document.getElementById("info-name");
const elCat = document.getElementById("info-category");
const elMeta = document.getElementById("info-meta");
const elDesc = document.getElementById("info-description");
const elStats = document.getElementById("info-stats");
const elLink = document.getElementById("info-link");
document.getElementById("close-info").addEventListener("click", () => {
  infoPanel.classList.add("hidden");
});

function tt(key) { return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || key; }

function populateInfo(b) {
  elName.textContent = b.names[lang] || b.names.en;
  elCat.textContent = tt("cat_" + b.category);
  elDesc.textContent = b.description[lang] || b.description.en;
  elMeta.textContent = b.location[lang] || b.location.en;
  elLink.href = b.link || "#";
  elLink.textContent = b.link ? tt("link") : "";

  const auText = b.au < 0.1
    ? `${(b.au * 1.496e8).toLocaleString()} km`
    : `${b.au.toFixed(2)} AU`;
  const stats = [
    { label: tt("label_launch"),   value: b.launch || "—" },
    { label: tt("label_agency"),   value: b.agency || "—" },
    { label: tt("label_status"),   value: tt("status_" + (b.status || "active")) },
    { label: tt("label_distance"), value: auText },
  ];
  elStats.innerHTML = stats.map(s =>
    `<div class="stat"><span class="label">${s.label}</span><span class="value">${escapeHtml(s.value)}</span></div>`
  ).join("");

  infoPanel.classList.remove("hidden");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- Search ----------
const searchInput = document.getElementById("search");
const searchResults = document.getElementById("search-results");

function searchMatches(q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  return state.bodyMeshes
    .map(b => b.data)
    .filter(b => {
      const fields = [
        b.id,
        ...Object.values(b.names),
        ...Object.values(b.location || {}),
        b.agency || "",
      ];
      return fields.some(f => String(f).toLowerCase().includes(q));
    })
    .slice(0, 30);
}

function renderSearchResults(items) {
  if (!items.length) {
    searchResults.innerHTML = `<li style="cursor:default;color:var(--text-dim)">${tt("no_results")}</li>`;
    searchResults.classList.add("open");
    return;
  }
  searchResults.innerHTML = items.map(b => {
    const c = "#" + new THREE.Color(CATEGORY_COLOR[b.category]).getHexString();
    const name = b.names[lang] || b.names.en;
    const sub = b.location ? (b.location[lang] || b.location.en) : "";
    return `<li data-id="${b.id}">
      <span class="swatch" style="background:${c};color:${c}"></span>
      <span>${escapeHtml(name)}</span>
      <small>${escapeHtml(sub)}</small>
    </li>`;
  }).join("");
  searchResults.classList.add("open");
  searchResults.querySelectorAll("li[data-id]").forEach(li => {
    li.addEventListener("click", () => {
      selectBody(li.dataset.id, true);
      searchInput.value = "";
    });
  });
}

function hideSearchResults() { searchResults.classList.remove("open"); }

searchInput.addEventListener("input", () => {
  const q = searchInput.value;
  if (!q.trim()) { hideSearchResults(); return; }
  renderSearchResults(searchMatches(q));
});
searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim()) {
    renderSearchResults(searchMatches(searchInput.value));
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-wrap")) hideSearchResults();
});
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const items = searchMatches(searchInput.value);
    if (items.length) {
      selectBody(items[0].id, true);
      searchInput.value = "";
      hideSearchResults();
    }
  } else if (e.key === "Escape") {
    searchInput.value = "";
    hideSearchResults();
  }
});

// ---------- Language switching ----------
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    el.textContent = tt(k);
  });
  document.querySelectorAll("[data-i18n-attr]").forEach(el => {
    const spec = el.getAttribute("data-i18n-attr");
    spec.split(",").forEach(pair => {
      const [attr, key] = pair.split(":").map(s => s.trim());
      if (attr && key) el.setAttribute(attr, tt(key));
    });
  });
  document.querySelectorAll(".lang-switch button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  // Update labels
  state.bodyMeshes.forEach(b => {
    b.labelEl.textContent = b.data.names[lang] || b.data.names.en;
  });
  state.refMeshes.forEach(r => {
    r.labelEl.textContent = r.data.names[lang] || r.data.names.en;
  });
  // Refresh info panel if open
  if (state.selected) {
    const b = state.bodyMeshes.find(x => x.data.id === state.selected);
    if (b) populateInfo(b.data);
  }
  // Refresh search results if open
  if (searchResults.classList.contains("open") && searchInput.value.trim()) {
    renderSearchResults(searchMatches(searchInput.value));
  }
}

document.querySelectorAll(".lang-switch button").forEach(btn => {
  btn.addEventListener("click", () => {
    lang = btn.dataset.lang;
    localStorage.setItem("aceb-lang", lang);
    applyLang();
  });
});
applyLang();

// ---------- Label LOD / screen-space collision (PR1) ----------
// Strategy:
//  1. Each frame we project every label anchor into screen space and gather
//     its bounding box, importance and depth.
//  2. We sort by (importance desc, depth asc). Higher-importance, closer
//     labels win and "occupy" their box.
//  3. Lower-priority labels overlapping an occupied box get downgraded —
//     either to the small dot ("collapsed") or fully hidden if too far.
//  4. Hidden labels in the same screen cell are tallied; if a cell ends up
//     with >= 3 hidden bodies, we spawn a cluster bubble at their centroid
//     showing the count. Clicking a cluster zooms toward the centroid.
const _vec = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _occupied = []; // array of {x0,y0,x1,y1, importance}

// Cluster pool: reuse DOM nodes / CSS2DObjects rather than churn the DOM.
function ensureClusterPool(n) {
  while (state.labelClusters.length < n) {
    const el = document.createElement("div");
    el.className = "label-cluster";
    el.style.opacity = "0";
    const obj = new CSS2DObject(el);
    obj.visible = false;
    scene.add(obj);
    el.addEventListener("click", () => {
      const cx = parseFloat(el.dataset.cx);
      const cy = parseFloat(el.dataset.cy);
      const cz = parseFloat(el.dataset.cz);
      if (!Number.isFinite(cx)) return;
      flyTo(new THREE.Vector3(cx, cy, cz), 14);
    });
    state.labelClusters.push({ el, obj });
  }
}

function rectsOverlap(a, b) {
  return !(a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0);
}

function updateLabelLayout() {
  const w = window.innerWidth, h = window.innerHeight;
  _occupied.length = 0;

  const camPos = camera.position;
  const items = [];

  // 1) Gather candidates. Selected and hovered always force visibility.
  for (const b of state.bodyMeshes) {
    b.group.getWorldPosition(_vec);
    _proj.copy(_vec).project(camera);
    // Behind camera -> hide
    if (_proj.z < -1 || _proj.z > 1) {
      b.labelEl.style.opacity = "0";
      b.labelEl.classList.remove("collapsed");
      b.label.visible = false;
      continue;
    }
    b.label.visible = true;

    const sx = (_proj.x * 0.5 + 0.5) * w;
    const sy = (1 - (_proj.y * 0.5 + 0.5)) * h;
    const depth = camPos.distanceTo(_vec);

    // Boost importance for selected / hovered so they always win contests.
    let imp = b.importance;
    const isSel = b.data.id === state.selected;
    const isHover = b.data.id === state.hoveredId;
    if (isSel) imp += 100;
    else if (isHover) imp += 50;

    // Approximate label box in pixels. Major labels are slightly larger.
    const halfW = b.data.major ? 60 : 48;
    const halfH = 11;
    items.push({
      b, sx, sy, depth, imp, isSel, isHover,
      box: { x0: sx - halfW, y0: sy - halfH, x1: sx + halfW, y1: sy + halfH, importance: imp },
      worldX: _vec.x, worldY: _vec.y, worldZ: _vec.z,
    });
  }

  // 2) Sort: selected first, then importance desc, then depth asc (closer wins).
  items.sort((a, b) => {
    if (a.isSel !== b.isSel) return a.isSel ? -1 : 1;
    if (b.imp !== a.imp) return b.imp - a.imp;
    return a.depth - b.depth;
  });

  // 3) Walk in priority order, occupying boxes; collapsed losers tallied per cell.
  const cellSize = 80;
  const cellHidden = new Map(); // key "cx,cy" -> { count, sumX, sumY, sumWX, sumWY, sumWZ }
  const camDist = camera.position.distanceTo(controls.target);

  for (const it of items) {
    const { b, box, isSel, isHover, depth } = it;
    const el = b.labelEl;
    el.classList.toggle("selected", isSel);

    // Distance-based hard cull: tiny minor labels disappear when far away.
    const distanceCull =
      !isSel && !isHover && !b.data.major &&
      (camDist > 600 || depth > 400);

    let collide = false;
    if (!isSel && !isHover) {
      for (let i = 0; i < _occupied.length; i++) {
        if (rectsOverlap(box, _occupied[i])) { collide = true; break; }
      }
    }

    if (distanceCull || (collide && !b.data.major)) {
      // Hide minor lost labels into clusters
      el.style.opacity = "0";
      el.classList.remove("collapsed");
      const cx = Math.floor(it.sx / cellSize);
      const cy = Math.floor(it.sy / cellSize);
      const key = cx + "," + cy;
      let c = cellHidden.get(key);
      if (!c) { c = { count: 0, sumX: 0, sumY: 0, sumWX: 0, sumWY: 0, sumWZ: 0 }; cellHidden.set(key, c); }
      c.count++;
      c.sumX += it.sx; c.sumY += it.sy;
      c.sumWX += it.worldX; c.sumWY += it.worldY; c.sumWZ += it.worldZ;
      continue;
    }

    if (collide && b.data.major) {
      // Major labels collapse to a small dot rather than disappear.
      el.classList.add("collapsed");
      el.style.opacity = "0.85";
      // Don't occupy any space — the dot is small.
      continue;
    }

    // Visible at full size: occupy its box and unhide.
    el.classList.remove("collapsed");
    el.style.opacity = isSel ? "1" : (b.data.major ? "1" : (camDist > 250 ? "0.7" : "0.95"));
    _occupied.push(box);
  }

  // 4) Render clusters for cells with >=3 hidden labels.
  const clusters = [];
  for (const [, c] of cellHidden) {
    if (c.count < 3) continue;
    clusters.push(c);
  }
  ensureClusterPool(clusters.length);
  for (let i = 0; i < state.labelClusters.length; i++) {
    const slot = state.labelClusters[i];
    const cluster = clusters[i];
    if (!cluster) {
      slot.obj.visible = false;
      slot.el.style.opacity = "0";
      continue;
    }
    const wx = cluster.sumWX / cluster.count;
    const wy = cluster.sumWY / cluster.count;
    const wz = cluster.sumWZ / cluster.count;
    slot.obj.position.set(wx, wy, wz);
    slot.obj.visible = true;
    slot.el.textContent = "+" + cluster.count;
    slot.el.dataset.cx = wx;
    slot.el.dataset.cy = wy;
    slot.el.dataset.cz = wz;
    slot.el.style.opacity = "1";
  }
}

// Reference body labels: simple distance fade (they rarely overlap).
function updateReferenceLabels() {
  const camDist = camera.position.distanceTo(controls.target);
  for (const r of state.refMeshes) {
    // Always visible but fade slightly when very far.
    r.labelEl.style.opacity = camDist > 1200 ? "0.4" : "1";
  }
}

// Hover detection on the canvas to boost a label's importance.
canvas.addEventListener("pointermove", (e) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(getPickables(), false);
  state.hoveredId = hits.length ? hits[0].object.userData.id : null;
});

// ---------- Resize ----------
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}
window.addEventListener("resize", onResize);

// ---------- Animation loop ----------
let _loadingDismissed = false;
function tick() {
  requestAnimationFrame(tick);
  if (state.flyTween) state.flyTween(performance.now());
  controls.update();

  // Drive THREE.LOD level switches based on camera distance.
  for (const b of state.bodyMeshes) {
    if (b.lod && b.lod.update) b.lod.update(camera);
  }
  for (const r of state.refMeshes) {
    if (r.mesh && r.mesh.isLOD && r.mesh.update) r.mesh.update(camera);
  }

  // Screen-space label LOD / collision (replaces previous simple fade).
  updateLabelLayout();
  updateReferenceLabels();

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);

  // Hide loading overlay on the first rendered frame. Doing this here (rather
  // than in a `window.load` listener) means we don't block on the browser
  // finishing every CDN sub-resource — the scene is already set up and we've
  // just produced a frame, so the user can start interacting immediately.
  if (!_loadingDismissed) {
    _loadingDismissed = true;
    const ld = document.getElementById("loading");
    if (ld) {
      ld.classList.add("fade");
      setTimeout(() => { if (ld.parentNode) ld.remove(); }, 700);
    }
  }
}
tick();
