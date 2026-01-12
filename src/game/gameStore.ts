import { observable, computed, action, makeObservable } from 'mobx';
import type { Position, TileType, BaseCategory, Cell, UpgradeResult } from './types';
import { categoryToDefaultTile, tileToCategory, upgradeScores } from './types';
import { getUpgradesForTile, upgradePriority, type GameStateAccessor } from './tiles';

const SUPERBLOCK_SIZE = 3;
const GRID_SIZE = 3;
const TOTAL_CELLS = SUPERBLOCK_SIZE * SUPERBLOCK_SIZE * GRID_SIZE * GRID_SIZE; // 81
const DECK_SIZE = 5;
const MAX_UPGRADES = 10000;

// Create the game state accessor for upgrade checks
function createGameAccessor(store: GameStore): GameStateAccessor {
  return {
    getCell: (pos: Position) => store.getCell(pos),

    getAdjacentCells: (pos: Position) => {
      const adjacent: { pos: Position; tile: TileType | null }[] = [];
      const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1], // N, S, W, E
      ];

      for (const [dr, dc] of directions) {
        const newRow = pos.cellRow + dr;
        const newCol = pos.cellCol + dc;

        // Stay within same superblock
        if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
          const newPos: Position = {
            ...pos,
            cellRow: newRow,
            cellCol: newCol,
          };
          adjacent.push({ pos: newPos, tile: store.getCell(newPos) });
        }
      }

      return adjacent;
    },

    getSuperblockCells: (sbRow: number, sbCol: number) => {
      const cells: { pos: Position; tile: TileType | null }[] = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const pos: Position = {
            superblockRow: sbRow,
            superblockCol: sbCol,
            cellRow: r,
            cellCol: c,
          };
          cells.push({ pos, tile: store.getCell(pos) });
        }
      }
      return cells;
    },

    getAdjacentSuperblocks: (sbRow: number, sbCol: number) => {
      const adjacent: { sbRow: number; sbCol: number }[] = [];
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

      for (const [dr, dc] of directions) {
        const newRow = sbRow + dr;
        const newCol = sbCol + dc;
        if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
          adjacent.push({ sbRow: newRow, sbCol: newCol });
        }
      }

      return adjacent;
    },

    isNearRoad: (pos: Position) => {
      // Near road = at edge of superblock
      return pos.cellRow === 0 || pos.cellRow === 2 || pos.cellCol === 0 || pos.cellCol === 2;
    },

    countInSuperblock: (sbRow: number, sbCol: number, category: BaseCategory) => {
      let count = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const tile = store.getCell({
            superblockRow: sbRow,
            superblockCol: sbCol,
            cellRow: r,
            cellCol: c,
          });
          if (tile && tileToCategory[tile] === category) {
            count++;
          }
        }
      }
      return count;
    },

    countTileTypeInSuperblock: (sbRow: number, sbCol: number, tileType: TileType) => {
      let count = 0;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const tile = store.getCell({
            superblockRow: sbRow,
            superblockCol: sbCol,
            cellRow: r,
            cellCol: c,
          });
          if (tile === tileType) {
            count++;
          }
        }
      }
      return count;
    },

    countInAdjacentSuperblocks: (sbRow: number, sbCol: number, category: BaseCategory) => {
      const adjacent = createGameAccessor(store).getAdjacentSuperblocks(sbRow, sbCol);
      let count = 0;
      for (const { sbRow: r, sbCol: c } of adjacent) {
        count += createGameAccessor(store).countInSuperblock(r, c, category);
      }
      return count;
    },

    countTileTypeInAdjacentSuperblocks: (sbRow: number, sbCol: number, tileType: TileType) => {
      const adjacent = createGameAccessor(store).getAdjacentSuperblocks(sbRow, sbCol);
      let count = 0;
      for (const { sbRow: r, sbCol: c } of adjacent) {
        count += createGameAccessor(store).countTileTypeInSuperblock(r, c, tileType);
      }
      return count;
    },

    countResidentialValueInAdjacentSuperblocks: (sbRow: number, sbCol: number) => {
      const accessor = createGameAccessor(store);
      const adjacent = accessor.getAdjacentSuperblocks(sbRow, sbCol);
      let value = 0;

      for (const { sbRow: r, sbCol: c } of adjacent) {
        for (let cr = 0; cr < 3; cr++) {
          for (let cc = 0; cc < 3; cc++) {
            const tile = store.getCell({
              superblockRow: r,
              superblockCol: c,
              cellRow: cr,
              cellCol: cc,
            });
            if (tile && tileToCategory[tile] === 'R') {
              // tier2_residential and highrise count as 4
              if (tile === 'tier2_residential' || tile === 'highrise') {
                value += 4;
              } else {
                value += 1;
              }
            }
          }
        }
      }

      return value;
    },
  };
}

// Game store using MobX observable objects
export function createGameStore() {
  const store = observable({
    // Grid state: 3D array [superblockRow][superblockCol][cellIndex]
    grid: Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () =>
        Array.from({ length: 9 }, () => null as TileType | null)
      )
    ),

    // Deck of upcoming tiles
    deck: [] as BaseCategory[],

    // Current score
    score: 0,

    // Turn number
    turn: 0,

    // Hovered cell for showing upgrade info
    hoveredCell: null as Position | null,

    // Get cell at position
    getCell(pos: Position): TileType | null {
      const cellIndex = pos.cellRow * 3 + pos.cellCol;
      return this.grid[pos.superblockRow][pos.superblockCol][cellIndex];
    },

    // Set cell at position
    setCell(pos: Position, tile: TileType | null) {
      const cellIndex = pos.cellRow * 3 + pos.cellCol;
      this.grid[pos.superblockRow][pos.superblockCol][cellIndex] = tile;
    },

    // Generate a random tile category
    generateRandomCategory(): BaseCategory {
      const categories: BaseCategory[] = ['R', 'L', 'C', 'E'];
      // Weighted distribution: R:1, L:1, C:0.4, E:0.2 (normalized)
      // Total: 2.6, so R:38.5%, L:38.5%, C:15.4%, E:7.7%
      const weights = [1, 1, 0.4, 0.2];
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;

      for (let i = 0; i < categories.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          return categories[i];
        }
      }
      return 'R';
    },

    // Fill deck to DECK_SIZE
    fillDeck() {
      while (this.deck.length < DECK_SIZE) {
        this.deck.push(this.generateRandomCategory());
      }
    },

    // Initialize the game
    init() {
      // Reset grid
      for (let sbr = 0; sbr < 3; sbr++) {
        for (let sbc = 0; sbc < 3; sbc++) {
          for (let i = 0; i < 9; i++) {
            this.grid[sbr][sbc][i] = null;
          }
        }
      }
      this.score = 0;
      this.turn = 0;
      this.deck = [];
      this.fillDeck();
    },

    // Place a tile at position
    placeTile(pos: Position) {
      if (this.getCell(pos) !== null) {
        return false; // Cell already occupied
      }

      if (this.deck.length === 0) {
        return false; // No tiles to place
      }

      const category = this.deck.shift()!;
      const tile = categoryToDefaultTile[category];

      this.setCell(pos, tile);
      this.turn++;

      // Run rebuild phase (cascade upgrades)
      this.runRebuildPhase(pos);

      // Refill deck
      this.fillDeck();

      return true;
    },

    // Run the rebuild phase starting from placed position
    runRebuildPhase(startPos: Position) {
      const accessor = createGameAccessor(this);
      let upgradeCount = 0;

      // BFS queue of positions to check
      // Start with all cells in the superblock (placement can affect block-level conditions)
      const queue: Position[] = [];
      
      // Add all cells in the starting superblock
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          queue.push({
            superblockRow: startPos.superblockRow,
            superblockCol: startPos.superblockCol,
            cellRow: r,
            cellCol: c,
          });
        }
      }

      const visited = new Set<string>();

      const posKey = (p: Position) =>
        `${p.superblockRow},${p.superblockCol},${p.cellRow},${p.cellCol}`;

      while (queue.length > 0) {
        if (upgradeCount >= MAX_UPGRADES) {
          throw new Error(`Maximum upgrade limit (${MAX_UPGRADES}) reached!`);
        }

        const pos = queue.shift()!;
        const key = posKey(pos);

        // Skip if already visited in this wave
        if (visited.has(key)) {
          continue;
        }

        const currentTile = this.getCell(pos);
        if (!currentTile) {
          visited.add(key);
          continue;
        }

        // Get all possible upgrades for this tile
        const upgrades = getUpgradesForTile(currentTile, pos, accessor);

        // Find the best upgrade that can be applied (by priority)
        let appliedUpgrade: TileType | null = null;

        for (const upgradeTile of upgradePriority) {
          // Skip if trying to "upgrade" to the same tile type
          if (upgradeTile === currentTile) {
            continue;
          }
          
          const result = upgrades[upgradeTile];
          if (result && result.verdict === 'can_upgrade') {
            const allMet = result.conditions.every((c) => c.met);
            if (allMet) {
              appliedUpgrade = upgradeTile;
              break;
            }
          }
        }

        if (appliedUpgrade) {
          // Apply the upgrade
          this.setCell(pos, appliedUpgrade);
          upgradeCount++;

          // Add score
          const points = upgradeScores[appliedUpgrade] || 0;
          this.score += points;

          // Clear visited so cells can be re-checked after this change
          visited.clear();

          // Add neighbors to queue for cascade
          const neighbors = accessor.getAdjacentCells(pos);
          for (const { pos: nPos } of neighbors) {
            queue.push(nPos);
          }

          // Also add all cells in the superblock (for block-level conditions)
          for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
              queue.push({
                superblockRow: pos.superblockRow,
                superblockCol: pos.superblockCol,
                cellRow: r,
                cellCol: c,
              });
            }
          }

          // Also check adjacent superblocks for macro-level conditions
          const adjSuperblocks = accessor.getAdjacentSuperblocks(
            pos.superblockRow,
            pos.superblockCol
          );
          for (const { sbRow, sbCol } of adjSuperblocks) {
            for (let r = 0; r < 3; r++) {
              for (let c = 0; c < 3; c++) {
                queue.push({
                  superblockRow: sbRow,
                  superblockCol: sbCol,
                  cellRow: r,
                  cellCol: c,
                });
              }
            }
          }

          // Re-add current position to check for further upgrades
          queue.push(pos);
        } else {
          visited.add(key);
        }
      }
    },

    // Get upgrade info for hovered cell
    getUpgradeInfo(pos: Position): Record<string, UpgradeResult> | null {
      const tile = this.getCell(pos);
      if (!tile) {
        return null;
      }

      const accessor = createGameAccessor(this);
      return getUpgradesForTile(tile, pos, accessor);
    },

    // Set hovered cell
    setHoveredCell(pos: Position | null) {
      this.hoveredCell = pos;
    },

    // Computed: total cells filled
    get cellsFilled(): number {
      let count = 0;
      for (let sbr = 0; sbr < 3; sbr++) {
        for (let sbc = 0; sbc < 3; sbc++) {
          for (let i = 0; i < 9; i++) {
            if (this.grid[sbr][sbc][i] !== null) {
              count++;
            }
          }
        }
      }
      return count;
    },

    // Computed: game over (all cells filled)
    get isGameOver(): boolean {
      return this.cellsFilled >= TOTAL_CELLS;
    },
  });

  // Initialize the game
  store.init();

  return store;
}

export type GameStore = ReturnType<typeof createGameStore>;

// Singleton game store
export const gameStore = createGameStore();
