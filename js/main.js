import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

import { BODIES, REFERENCE_BODIES, pos } from "./data.js";
import { I18N, detectLang } from "./i18n.js";

// ---------- State ----------
let lang = detectLang();
const state = {
  bodyMeshes: [],   // { data, mesh, label, worldPos, color }
  refMeshes: [],    // reference (Sun + planets) for context
  selected: null,
  flyTween: null,
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
    const geo = new THREE.SphereGeometry(b.size, 32, 24);
    const mat = new THREE.MeshBasicMaterial({ color: b.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, p.y, p.z);
    mesh.userData = { kind: "reference", id: b.id };
    scene.add(mesh);

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
      mesh.add(glow);
      const light = new THREE.PointLight(0xfff2c8, 1.2, 0, 0);
      mesh.add(light);
    }

    // Body label
    const div = document.createElement("div");
    div.className = "body-label";
    div.textContent = b.names[lang] || b.names.en;
    div.dataset.id = b.id;
    const labelObj = new CSS2DObject(div);
    labelObj.position.set(0, b.size + 1.3, 0);
    mesh.add(labelObj);

    state.refMeshes.push({ data: b, mesh, labelEl: div });
  });
}
buildReferenceBodies();

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

// Each craft is a Group: invisible pickable hit-sphere + glow sprite + small core
function buildBodies() {
  BODIES.forEach(b => {
    const p = pos(b.au, b.angle, b.tilt || 0, b.jitter || null);
    const color = CATEGORY_COLOR[b.category] || 0xffffff;

    const group = new THREE.Group();
    group.position.set(p.x, p.y, p.z);

    // Glow sprite (clone shared material so each can be tinted independently)
    const proto = makeCraftSprite(color, !!b.major);
    const sprite = new THREE.Sprite(proto.material);
    sprite.scale.copy(proto.scale);
    group.add(sprite);

    // Tiny solid core for crispness
    const coreGeo = new THREE.SphereGeometry(b.major ? 0.45 : 0.3, 12, 10);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

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
    state.bodyMeshes.push({ data: b, group, hit, sprite, core, labelEl: div, color });
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
function tick() {
  requestAnimationFrame(tick);
  if (state.flyTween) state.flyTween(performance.now());
  controls.update();

  // Distance-based label fading: hide minor labels when far
  const camDist = camera.position.distanceTo(controls.target);
  state.bodyMeshes.forEach(b => {
    const isSel = b.data.id === state.selected;
    if (isSel) { b.labelEl.style.opacity = "1"; return; }
    if (b.data.major) {
      b.labelEl.style.opacity = camDist > 600 ? "0.2" : "1";
    } else {
      b.labelEl.style.opacity = camDist > 250 ? "0" : (camDist > 120 ? "0.4" : "0.85");
    }
  });

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// Hide loading then start
window.addEventListener("load", () => {
  setTimeout(() => {
    const ld = document.getElementById("loading");
    ld.classList.add("fade");
    setTimeout(() => ld.remove(), 700);
  }, 200);
});
tick();
