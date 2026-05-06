# 人造天体浏览器 · Artificial Celestial Bodies 3D Viewer

一个基于 [three.js](https://threejs.org/) 的网页应用，用三维方式浏览人造天体（旅行者号、詹姆斯·韦伯空间望远镜、火星车、空间站等），支持自由 3D 浏览、点击飞近查看、关键词搜索，以及中 / 英 / 日多语言。

A Three.js single-page application for exploring human-made spacecraft and probes — Voyagers, JWST, Mars rovers, space stations, and more — with free 3D navigation, click-to-fly, search, and 中文 / English / 日本語 UI.

## ✨ Features

- **3D 浏览 / 3D navigation** — orbit-style controls (drag, zoom, pan).
- **点击飞近 / Click-to-fly** — smooth eased camera tween to any object.
- **搜索 / Search** — fuzzy match across names, locations and operators in all three languages.
- **多语言 / i18n** — 中文、English、日本語 切换；自动检测浏览器语言。
- **科幻视觉 / Sci-fi look** — glassmorphism HUD, glow sprites, starfield, log-scaled distances so deep-space probes and Earth-orbit hardware fit one frame.
- **静态部署 / Static** — pure HTML / CSS / ES-module JS, Three.js loaded from CDN via `importmap`.

## 🚀 Local preview

Any static file server works, e.g.:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## 🛰️ Included spacecraft (excerpt)

Voyager 1 / 2 · Pioneer 10 / 11 · New Horizons · James Webb · Hubble · Gaia · Euclid · ISS · 天宫 Tiangong · Starlink · SOHO · DSCOVR · Parker Solar Probe · Solar Orbiter · BepiColombo · Akatsuki · OSIRIS-APEX · DART · Curiosity · Perseverance · Ingenuity · 祝融 Zhurong · 天问一号 · MRO · LRO · 玉兔二号 · 嫦娥六号 · Chandrayaan-3 · Apollo 11 · Juno · Europa Clipper · JUICE · Cassini · Lucy

## 🌐 Deploy to GitHub Pages

The included workflow at `.github/workflows/deploy.yml` deploys the repository root to GitHub Pages on every push to `main`.

1. In repository **Settings → Pages**, set *Source* to **GitHub Actions**.
2. Push to `main` — the site will be available at `https://<owner>.github.io/<repo>/`.
