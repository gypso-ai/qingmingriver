# Procedural 3D models

These `.glb` files are **procedurally generated** stylized 3D models for the
celestial bodies and spacecraft shown in the viewer. They are intended as
recognizable visual stand-ins (a high-gain dish + bus + RTG for Voyager, a
hex mirror + sunshield for JWST, a banded sphere with a ring for Saturn, …)
rather than physically accurate replicas.

## How they are generated

The generator lives in [`tools/build-models.mjs`](../../tools/build-models.mjs).
It uses [three.js](https://threejs.org/) primitives + `GLTFExporter` to
construct each model, then writes a binary `.glb` file here.

To rebuild after editing the generator:

```bash
cd tools
npm install
npm run build:models
```

## License

All `.glb` files in this directory are released under
[CC0 1.0 Universal (Public Domain Dedication)](https://creativecommons.org/publicdomain/zero/1.0/).
You may use, modify and redistribute them without attribution.

## Naming

Files follow the spacecraft / body id used in `js/data.js` (e.g. `voyager.glb`,
`jwst.glb`, `earth.glb`). A few models are shared between several bodies
(e.g. Voyager 1 and Voyager 2 both reference `voyager.glb`).
