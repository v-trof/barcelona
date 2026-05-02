# TTRPG Battlemap Generator

A TypeScript/React battlemap editor that converts OpenStreetMap vector data into editable 2D tile grids for tabletop RPGs.

## Features

### Frontend Editor
- **Interactive Canvas** — Render grid as HTML5 Canvas with color-coded tile types
- **Click to Edit** — Click individual tiles to select and paint
- **Brush Tool** — Hold and drag to paint multiple tiles
- **Keyboard Shortcuts** — Number keys 1-9 for quick tile type selection, Ctrl+Z/Y for undo/redo
- **Grid Rotation** — Rotate the entire grid 0-360° (visual CSS transform)
- **50-Step History** — Full undo/redo support
- **Load/Save JSON** — Export and import maps as JSON
- **Export to PNG** — Render canvas to image file
- **Tile Metadata** — View OSM properties and tags for selected tiles
- **Tile Legend** — Visual reference for all 15 tile types

### Backend Pipeline
- **MBTiles Reader** — SQLite-based decoder for vector tile sets
- **PBF Decoder** — Protocol Buffer decoding for Mapbox Vector Tile format
- **Feature Classification** — Priority-stacked OSM tag → tile type mapping
- **Grid Rasterization** — Geometry intersection with turf.js
- **Metadata Extraction** — Preserve OSM IDs and attributes

### Tile Types
```
WATER               BUILDING_HIGH     BUILDING_MID       BUILDING_LOW
ROAD_MAJOR          ROAD_MINOR        PATH                BRIDGE
PARK                FOREST            FARMLAND            ROUGH
PAVED_LOT           WALL              GROUND
```

## Quick Start

### Installation
```bash
pnpm install
```

### Development
```bash
pnpm run dev
```
Then open http://localhost:5173

### Load Sample Map
1. Click **Load Sample** button
2. Test editing with the 8×8 sample grid
3. Use keyboard (1-9) or legend panel to change tile types
4. Save/export as needed

### Load Custom Map
1. Click **Load JSON** and select a saved battlemap
2. Or generate a new one via the pipeline (see below)

## Pipeline Usage

The pipeline converts OSM vector data from MBTiles into JSON battlemap files.

### Example (Node.js CLI - framework only, not yet implemented)
```bash
node pipeline/src/index.ts \
  --mbtiles public/osm-2020-02-10-v3.11_japan_nagoya.mbtiles \
  --lat 35.1815 \
  --lng 136.8863 \
  --zoom 15 \
  --grid 32x24 \
  --cellsize 1.5 \
  --output map.json
```

### Map Parameters
- `--lat, --lng` — Center coordinates (WGS84)
- `--zoom` — OSM zoom level (14-16 recommended for city-scale detail)
- `--grid COLSxROWS` — Grid dimensions (e.g., 32x24)
- `--cellsize METERS` — Size of each grid cell in real-world meters
- `--output FILE` — Path to write JSON battlemap

### JSON Output Format
```json
{
  "meta": {
    "cols": 32,
    "rows": 24,
    "cellSizeMeters": 1.5,
    "center": { "lat": 35.1815, "lng": 136.8863 },
    "zoom": 15,
    "rotation": 0
  },
  "tiles": [
    [
      { "type": "BUILDING_HIGH", "meta": { "osm_id": "...", "levels": 8 } },
      ...
    ]
  ]
}
```

## Data Sources

### Free Vector MBTiles
- **Protomaps** — https://protomaps.com/downloads
  - Planet or city-level extracts
  - OpenStreetMap-based, updated monthly
- **OpenMapTiles** — https://openmaptiles.org/
  - High-quality vector tiles
  - Multiple zoom levels

### Current Dataset
This project includes:
- `public/osm-2020-02-10-v3.11_japan_nagoya.mbtiles`
- Nagoya, Japan at zoom 14
- ~80 MB, covers ~15 km² at zoom 15

## Architecture

### Folders
```
src/
├── game/
│   ├── types.ts           # Shared TileType, BattleMap types
│   ├── gameStore.ts       # MobX state store (load, paint, undo/redo)
│   ├── classify.ts        # OSM tag → TileType classification
│   ├── rasterize.ts       # Grid cell rasterization + geometry
│   ├── mbtiles.ts         # SQLite MBTiles decoder
│   ├── sample.json        # Fixture for frontend development
│   └── *.test.ts          # Vitest unit tests
├── components/
│   ├── Canvas.tsx         # Grid rendering + interaction
│   ├── Toolbar.tsx        # Load/save/export buttons
│   └── TilePanel.tsx      # Legend + selected tile info
├── App.tsx                # Main layout + keyboard shortcuts
└── index.css              # Styling
```

### Data Flow
1. **Load** — JSON → gameStore.loadMap()
2. **Edit** — Canvas click → gameStore.paintTile()
3. **History** — gameStore.undo()/redo()
4. **Save** — gameStore.exportJSON() → download

## Testing

Run all tests:
```bash
pnpm test
```

Coverage:
- **gameStore** — 14 tests (load, paint, undo/redo, import/export)
- **classify** — 15 tests (all tile types, priority stacking, metadata)
- **rasterize** — 15 tests (grid generation, feature intersection, GeoJSON)
- **mbtiles** — integration tests skipped (require real MBTiles file)

**Total: 44 tests passing**

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-9` | Quick select tile type |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| Click | Select tile |
| Drag | Paint tiles (brush) |

## Editor Controls

- **Legend Panel** — Click a color to set brush type
- **Rotation Slider** — Rotate grid visually
- **Load Sample** — Load 8×8 test map
- **Load JSON** — Import saved map
- **Save JSON** — Download current map
- **Export PNG** — Render to image
- **Undo/Redo** — Revert or replay changes

## Classification Priority

When multiple OSM features overlap in a grid cell, the first matching type wins:

1. **WATER** (water/waterway)
2. **BUILDING_HIGH** (6+ levels)
3. **BUILDING_MID** (3-5 levels)
4. **BUILDING_LOW** (1-2 levels)
5. **ROAD_MAJOR** (motorway/trunk/primary)
6. **ROAD_MINOR** (residential, secondary, etc.)
7. **PATH** (footway, path)
8. **BRIDGE** (explicit bridge=yes)
9. **PARK** (leisure/park)
10. **FOREST** (landuse/forest)
11. **FARMLAND** (landuse/farmland)
12. **ROUGH** (grass, scrub, bare_rock)
13. **PAVED_LOT** (parking, paved)
14. **WALL** (barrier/wall)
15. **GROUND** (default fallback)

## Development Notes

### Hooks Rule Violation Fix
Earlier versions had a conditional early return in Canvas that violated React's Rules of Hooks. This was fixed by moving the `!map` check after all hooks are called.

### Why Canvas Instead of SVG?
- **Performance** — 1000+ tiles render smoothly at 60fps
- **Interaction** — Pixel-perfect hit detection for painting
- **Rotation** — CSS transform on container for visual rotation

### Building Levels Classification
- `building:levels` tag from OSM indicates number of stories
- Used to distinguish BUILDING_LOW/MID/HIGH for visual variety
- Falls back to BUILDING_LOW if tag missing

### Future Enhancements
- Pipeline CLI fully implemented
- Real MBTiles integration tests
- Terrain/height visualization
- Multi-floor building support
- Custom tile type definitions
- Fog of War layer
- Character token placement

## License

ISC
