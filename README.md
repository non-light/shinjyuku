# 新宿さんぽ / Shinjuku Station Walk

A mobile-first, buildless Three.js walking model of Shinjuku Station. Walk through
27 named gate groups, between the JR platforms and concourses, and out to the East
Exit plaza toward Kabukicho. The model covers B7 through 2F. Geometry, heights,
stair positions and interiors are original, simplified illustrations.

## Gates and connections

| Gate group | Distinct locations |
| --- | ---: |
| JR East, including two Odakyu transfer gates and one Keio transfer gate | 13 |
| Odakyu public gates | 3 |
| Keio Line public gates | 5 |
| Shared Keio New Line / Toei Shinjuku Line public gates | 2 |
| Toei Oedo Line public gates | 2 |
| Tokyo Metro Marunouchi Line public gates | 2 |

The gate directory supports railway and destination searches. Select a gate to see
its floor, nearby destinations and approach point. Transfer gates connect paid
areas directly. The East–West Passage remains outside the gates. Keio's Plaza and
Temporary gates allow exit only. Posted hours are informational in this walking
model, which keeps time-limited gates available to explore.

Floor plans, gate banks, fare boundaries and stair openings in the 3D scene and
map share a layout. All 51 staircases can be walked up and down. Separate
facilities include the Keio/Odakyu underground and ground-level platforms, the
Marunouchi Line, the Keio New/Toei Shinjuku platform at B5, the Oedo platform at
B7 and the inside-fare transfer at B4. Seibu-Shinjuku, Shinjuku-nishiguchi and
Shinjuku-sanchome are separate stations outside this model.

## Finding and using station facilities

The upper-right north-up minimap shows the walker with a red dot, white rim and
a translucent sector pointing in the viewing direction. The marker keeps its
on-screen size on phones. A floor map uses the same locator and the stacked map
projects the heading into its angled view.

Open the map and select **設備** to find three locker banks, four vending machines
and five benches. Their positions are representative placements in this model.
Select one to see its floor and jump to its walkable approach. Face the fixture
and tap the action button or press E. Locker door 09 opens and closes, a water
bottle can be dispensed and collected, and benches offer a seated view. Move
or use the action button to stand or leave a locker.

## Run locally

The application is served from dist with no build step. Three.js 0.180.0 (MIT)
is vendored for offline asset loading. From the repository root run

```sh
python3 -m http.server 8000 --directory dist
```

Open [the local app](http://localhost:8000). Drag the touch stick to walk and
drag the scene to look around. Desktop controls include WASD and the arrow keys.
The 3D walk requires WebGL 2. The maps and gate directory also work in 2D.

Run the navigation tests with `node --test test/navigation.test.mjs`. They check
each gate in both directions, stair landings, headroom and openings, and walking
reachability from the west concourse to both sides of all gates and every
destination. The platform-to-Kabukicho test walks through the east gate and up
the exterior stairs.

[Open the hosted app](https://shinjuku-station-walk-non.coatedant.chatgpt.site)

## Railway references

Gate names and connections are based on the operators' station guides. The model
uses original geometry and artwork and is intended for exploration. Consult the
official diagrams for on-site navigation and current opening times.

- [JR East station diagrams](https://www.jreast.co.jp/estation/stations/866.html)
- [JR gate groups in the station profile](https://www.jeki.co.jp/transit_ad/pdf/jml_data_004.pdf)
- [JR route to the Kabukicho side](https://media.jreast.co.jp/articles/5642)
- [Odakyu station diagrams](https://www.odakyu.jp/station/shinjuku/homeview/)
- [Keio Line floor map](https://www.keio.co.jp/train/station/station_map/pdf/ko01_shinjuku_floor_map.pdf)
- [Keio New Line floor map](https://www.keio.co.jp/train/station/station_map/pdf/ko01_newline_shinjuku_floor_map.pdf)
- [Toei Subway station diagram](https://www.kotsu.metro.tokyo.jp/subway/stations/shinjuku.html)
- [Tokyo Metro station diagram](https://www.tokyometro.jp/station/shinjuku/yardmap/index_print.html)

See `dist/vendor/THREE-LICENSE.txt` for the renderer license.
