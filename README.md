# 新宿さんぽ / Shinjuku Station Walk

A mobile-first, buildless Three.js exploration prototype. All station geometry,
signage and textures are original illustrative models, **not a reconstruction of
Shinjuku Station's actual layout**. The B1 / 1F / 2F organization and platform numbering are based on the JR East
station diagrams checked on 2026-11-01. Dimensions and connection positions are
simplified. Private railways and subway platforms are not yet included.
Surveyed indoor map datasets have not been imported. Do not use this app for real-world navigation.

## Features

- Real-time 3D station interior, material textures, soft lighting and metallic surfaces.
- Touch joystick and simultaneous touch camera look; keyboard and mouse controls.
- Three connected floors, eight platform islands, ten destinations and 22 two-flight staircases.
- Layer-aware collision, matching floor/ceiling openings, handrails and landing headroom.
- A unified cutaway map plus per-floor maps generated from the same data as the 3D scene.
- Minimap, destination switching, local visit history, walking and rendering preferences.
- Optional synthesized ambient sound and footsteps; no external audio assets.
- Locally hosted Three.js 0.180.0 (MIT). No runtime CDN or map API dependencies.

## Development

The served application is `dist/`. No build is needed. Vendor Three.js files are
included for reliable serving. `npm install` is only needed when refreshing vendors.

Run navigation and connectivity checks: `node --test test/navigation.test.mjs`.
The tests traverse all 22 staircases in both directions and perform a walking
graph search from the starting point to all ten destinations and all eight platforms.
They also check render openings, headroom, floor isolation, and collision barriers.
Run syntax checks: `node --check dist/app.js` and `node --check dist/world.js`.

Serve `dist/` over HTTP for local development:\n\n```sh\npython3 -m http.server 8000 --directory dist\n```\n\nOpen http://localhost:8000/ in your browser. The application needs WebGL 2.\n\nHosted preview: https://shinjuku-station-walk-non.coatedant.chatgpt.site\n\nThis repository contains the connected B1 / 1F / 2F map (source revision `2eea64acdb662791df1205155a4e2cd81bdfd954`).

## Toward an accurate station

1. Import and version licensed indoor map geometry and floor connections.
2. Verify routes against current construction and official station diagrams.
3. Add calibrated interior models, surveyed heights, and permitted photographic assets.
4. Profile on physical iPhone and Android devices before release.
5. Wrap as an app or extend the web app after validating touch interaction.

References (floor organization only; original images are not reproduced in the app):
- https://www.jreast.co.jp/estation/stations/866.html
- https://www.mlit.go.jp/kokudoseisaku/kokudoseisaku_tk1_000108.html
- https://www.toshiseibi.metro.tokyo.lg.jp/kotsu_butsuryu/kotsuseisaku/kotsu_suishin/shinjuku_shisetsu

See `dist/vendor/THREE-LICENSE.txt` for the renderer license.
