# 🏙️ Barcelona - City Builder Puzzle

A high-score, roguelike city puzzle on a fixed board of 9 superblocks (3×3 macro grid). Each superblock contains 9 cells (3×3), for a total of 81 cells. Place 1×1 tiles offered each turn. Placements trigger local upgrade rules (adjacency + within-block composition + cross-block conditions). One placement can cause cascading upgrades ("rebuild phase"), producing combo score bursts.

## 🎮 How to Play

1. Click on any empty cell to place the current tile from the deck
2. Hover over placed tiles to see possible upgrades and conditions (Popper tooltip)
3. Watch as cascade upgrades trigger based on the rules below
4. Maximize your score before filling all 81 cells!

## 📐 Board & Terminology

| Term | Description |
|------|-------------|
| **City Grid** | 3×3 superblocks (macro level) |
| **Superblock** | Each is a 3×3 mini-grid (micro level) |
| **Cell** | A single tile slot |
| **Adjacent** | Orthogonal neighbors (N/E/S/W) on the micro grid (no diagonals) |
| **In Block** | Within the same superblock |
| **Adjacent Blocks** | Orthogonally neighboring superblocks in the macro grid (max 4) |
| **Near Road** | At the edge of a superblock |

## 🏗️ Tile Types

### Base Categories (Player Places)
- **R** - Residential (default: House 🏠) - spawn rate: 1.0
- **L** - Leisure (default: Yard 🌿) - spawn rate: 1.0
- **C** - Commercial (default: Shop 🏪) - spawn rate: 0.4
- **E** - Education (default: School 🏫) - spawn rate: 0.2

### Upgrades

#### Residential Upgrades
| Upgrade | Points | Condition |
|---------|--------|-----------|
| **Slums** 🏚️ | -6 | Block has R ≥ 4 AND no L or E (bounces back to House when L/E added) |
| **Hotel** 🏨 | +14 | Block has C ≥ 3 AND R < 3 |
| **Villa** 🏡 | +18 | Adjacent to L AND not near road |
| **Tier-2 Res** 🏢 | +12 | Block has R ≥ 3, L ≥ 1, C ≥ 1, E ≥ 1 |
| **Highrise** 🏙️ | +40 | Tier-2 Res + Shopping Center in adj blocks + 20+ residential value in adj blocks + E ≥ 1 + L ≥ 3 in block |

#### Leisure Upgrades
| Upgrade | Points | Condition |
|---------|--------|-----------|
| **Playground** 🎠 | +4 | Adjacent to E |
| **Sports** ⚽ | +8 | ≥ 2 adjacent L (priority over Playground) |
| **Plaza** 🎪 | +14 | Part of 2×2 L square |
| **Park** 🌳 | +24 | Block has L ≥ 7 |
| **Cinema** 🎬 | +10 | Adjacent to Shopping Center |

#### Commercial Upgrades
| Upgrade | Points | Condition |
|---------|--------|-----------|
| **Shop** 🏪 | 0 | Default (no upgrade needed) |
| **Shopping Center** 🛒 | +16 | 3+ connected Commercial with any touching road (DFS), OR adjacent to existing Shopping Center |
| **Restaurant** 🍽️ | +20 | Has adj C + total R in block + adj blocks ≥ 10 |
| **Bank** 🏦 | +30 | ≥ 4 Tier-2 Residential in adjacent blocks |

#### Education Upgrades
| Upgrade | Points | Condition |
|---------|--------|-----------|
| **High School** 🎓 | +18 | School + ≥ 20 Residential in adjacent blocks + another school in adjacent blocks |
| **University** 🏛️ | +35 | ≥ 4 Education tiles in same block |

## 🔄 Turn Loop

1. **Offer**: Player is offered 1 tile from the deck
2. **Place**: Player clicks any empty cell to place the tile
3. **Rebuild Phase (Cascade)**:
   - BFS-style upgrade propagation starting from placed cell
   - Each cell checks if it can upgrade
   - Upgrades trigger neighbors to re-check
   - Slums bounce back to House when L or E is added to block
   - Continues until no more upgrades possible
   - Maximum 10,000 upgrades per turn (safety limit)

## 💡 Strategy Tips

- **Avoid Slums**: Don't cluster 4+ Residential without Leisure or Education (they bounce back when you add L/E)
- **Build Shopping Centers**: Connect 3+ shops with any touching the road, they enable Cinemas and Highrises
- **Plan Tier-2 Districts**: R + L + C + E in same block = Tier-2 Residential
- **Create Leisure Squares**: 2×2 Leisure blocks become Plazas
- **Edge Placement**: Road-adjacent (edge) cells needed for Shopping Centers
- **Education Clusters**: 4 schools in a block = University (+35 points!)
- **Sports over Playground**: Sports has priority, so 2+ adjacent L will become Sports even with E nearby

## 🛠️ Technical Implementation

### Stack
- **TypeScript** - Type-safe code
- **React 19** - UI rendering (no React state used for game state)
- **MobX 6** - All game state management via observable objects
- **React Popper** - Tooltip positioning
- **Vite** - Build tooling

### Architecture
- `src/game/types.ts` - Type definitions, tile categories, display info, scores
- `src/game/tiles.ts` - Upgrade condition checkers with DFS for Shopping Center
- `src/game/gameStore.ts` - MobX store with all game logic
- `src/App.tsx` - React components (all use `observer()`)
- `src/index.css` - Styling with CSS variables

### Key Design Decisions
- **MobX Objects, Not Classes**: Using `observable({})` pattern
- **No React State for Game Logic**: All state lives in MobX store
- **Computed Upgrade Conditions**: Each upgrade returns conditions with `met` boolean and description
- **BFS Cascade**: Upgrades propagate via breadth-first search
- **DFS for Connected Components**: Shopping Center uses DFS to find connected commercial tiles
- **Slums Bounce Back**: Slums revert to House when L or E is added (handled in upgrade priority)
- **Popper Tooltips**: Tooltips positioned with react-popper to avoid UI jumping

## 🚀 Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## 📜 License

MIT
