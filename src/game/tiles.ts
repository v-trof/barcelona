import type { TileType, UpgradeResult, Position, BaseCategory } from './types';
import { tileToCategory } from './types';

// Helper type for game state access
export type GameStateAccessor = {
  getCell: (pos: Position) => TileType | null;
  getAdjacentCells: (pos: Position) => { pos: Position; tile: TileType | null }[];
  getSuperblockCells: (sbRow: number, sbCol: number) => { pos: Position; tile: TileType | null }[];
  getAdjacentSuperblocks: (sbRow: number, sbCol: number) => { sbRow: number; sbCol: number }[];
  isNearRoad: (pos: Position) => boolean;
  countInSuperblock: (sbRow: number, sbCol: number, category: BaseCategory) => number;
  countTileTypeInSuperblock: (sbRow: number, sbCol: number, tileType: TileType) => number;
  countInAdjacentSuperblocks: (sbRow: number, sbCol: number, category: BaseCategory) => number;
  countTileTypeInAdjacentSuperblocks: (sbRow: number, sbCol: number, tileType: TileType) => number;
  countResidentialValueInAdjacentSuperblocks: (sbRow: number, sbCol: number) => number;
};

// Define upgrade check functions for each tile type
export type UpgradeChecker = (pos: Position, game: GameStateAccessor) => Record<string, () => UpgradeResult>;

// DFS to find connected commercial tiles and check if cluster touches road
function findConnectedCommercialCluster(
  startPos: Position,
  game: GameStateAccessor
): { size: number; touchesRoad: boolean } {
  const visited = new Set<string>();
  const posKey = (p: Position) => `${p.superblockRow},${p.superblockCol},${p.cellRow},${p.cellCol}`;

  let clusterSize = 0;
  let touchesRoad = false;

  const dfs = (pos: Position) => {
    const key = posKey(pos);
    if (visited.has(key)) return;

    const tile = game.getCell(pos);
    if (!tile || tileToCategory[tile] !== 'C') return;

    visited.add(key);
    clusterSize++;

    if (game.isNearRoad(pos)) {
      touchesRoad = true;
    }

    // Visit all adjacent cells (DFS)
    const adjacent = game.getAdjacentCells(pos);
    for (const { pos: adjPos } of adjacent) {
      dfs(adjPos);
    }
  };

  dfs(startPos);
  return { size: clusterSize, touchesRoad };
}

// Residential upgrade checks
export const residentialUpgrades: UpgradeChecker = (pos, game) => ({
  slums: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'house') {
      return { verdict: 'cannot_upgrade' };
    }

    const rCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'R');
    const lCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'L');
    const eCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'E');

    const conditions = [
      { met: rCount >= 4, desc: `Residential ≥ 4 in block (${rCount}/4)` },
      { met: lCount === 0 && eCount === 0, desc: `No Leisure or Education in block (L:${lCount}, E:${eCount})` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  hotel: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'house') {
      return { verdict: 'cannot_upgrade' };
    }

    const cCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'C');
    const rCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'R');

    const conditions = [
      { met: cCount >= 3, desc: `Commercial ≥ 3 in block (${cCount}/3)` },
      { met: rCount < 3, desc: `Residential < 3 in block (${rCount}/3)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  villa: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'house') {
      return { verdict: 'cannot_upgrade' };
    }

    const adjacent = game.getAdjacentCells(pos);
    const hasAdjacentLeisure = adjacent.some(
      (a) => a.tile && tileToCategory[a.tile] === 'L'
    );
    const nearRoad = game.isNearRoad(pos);

    const conditions = [
      { met: hasAdjacentLeisure, desc: `Adjacent to Leisure` },
      { met: !nearRoad, desc: `Not near road (edge of superblock)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  tier2_residential: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'house' && currentTile !== 'slums') {
      return { verdict: 'cannot_upgrade' };
    }

    const rCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'R');
    const lCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'L');
    const cCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'C');
    const eCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'E');

    const conditions = [
      { met: rCount >= 3, desc: `Residential ≥ 3 in block (${rCount}/3)` },
      { met: lCount >= 1, desc: `Leisure ≥ 1 in block (${lCount}/1)` },
      { met: cCount >= 1, desc: `Commercial ≥ 1 in block (${cCount}/1)` },
      { met: eCount >= 1, desc: `Education ≥ 1 in block (${eCount}/1)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  highrise: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'tier2_residential') {
      return { verdict: 'cannot_upgrade' };
    }

    const hasShoppingCenter = game.countTileTypeInAdjacentSuperblocks(
      pos.superblockRow,
      pos.superblockCol,
      'shopping_center'
    ) > 0;
    const residentialValue = game.countResidentialValueInAdjacentSuperblocks(
      pos.superblockRow,
      pos.superblockCol
    );
    const eCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'E');
    const lCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'L');

    const conditions = [
      { met: hasShoppingCenter, desc: `Shopping Center in adjacent blocks` },
      { met: residentialValue >= 20, desc: `≥ 20 residential value in adjacent blocks (${residentialValue}/20)` },
      { met: eCount >= 1, desc: `Education ≥ 1 in block (${eCount}/1)` },
      { met: lCount >= 3, desc: `Leisure ≥ 3 in block (${lCount}/3)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },
});

// Leisure upgrade checks
export const leisureUpgrades: UpgradeChecker = (pos, game) => ({
  // Sports has priority over playground, so check it first
  sports: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'yard' && currentTile !== 'playground') {
      return { verdict: 'cannot_upgrade' };
    }

    const adjacent = game.getAdjacentCells(pos);
    const adjacentLeisureCount = adjacent.filter(
      (a) => a.tile && tileToCategory[a.tile] === 'L'
    ).length;

    const conditions = [
      { met: adjacentLeisureCount >= 2, desc: `≥ 2 adjacent Leisure (${adjacentLeisureCount}/2)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  playground: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'yard') {
      return { verdict: 'cannot_upgrade' };
    }

    const adjacent = game.getAdjacentCells(pos);
    const hasAdjacentEducation = adjacent.some(
      (a) => a.tile && tileToCategory[a.tile] === 'E'
    );

    const conditions = [
      { met: hasAdjacentEducation, desc: `Adjacent to Education` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  plaza: () => {
    const currentTile = game.getCell(pos);
    // Can only upgrade yard, sports, or playground to plaza (not park or cinema)
    if (currentTile !== 'yard' && currentTile !== 'sports' && currentTile !== 'playground') {
      return { verdict: 'cannot_upgrade' };
    }

    // Check if this tile is part of a 2x2 leisure square
    const isPartOfSquare = checkLeisureSquare(pos, game);

    const conditions = [
      { met: isPartOfSquare, desc: `Part of 2×2 Leisure square` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  park: () => {
    const currentTile = game.getCell(pos);
    // Can upgrade any leisure except cinema (which is commercial-adjacent special)
    if (!currentTile || tileToCategory[currentTile] !== 'L' || currentTile === 'cinema') {
      return { verdict: 'cannot_upgrade' };
    }

    const lCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'L');

    const conditions = [
      { met: lCount >= 7, desc: `Leisure ≥ 7 in block (${lCount}/7)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  cinema: () => {
    const currentTile = game.getCell(pos);
    // Can only upgrade yard, sports, playground, or plaza to cinema (not park)
    if (currentTile !== 'yard' && currentTile !== 'sports' && currentTile !== 'playground' && currentTile !== 'plaza') {
      return { verdict: 'cannot_upgrade' };
    }

    const adjacent = game.getAdjacentCells(pos);
    const hasAdjacentShoppingCenter = adjacent.some(
      (a) => a.tile === 'shopping_center'
    );

    const conditions = [
      { met: hasAdjacentShoppingCenter, desc: `Adjacent to Shopping Center` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },
});

// Commercial upgrade checks
export const commercialUpgrades: UpgradeChecker = (pos, game) => ({
  shopping_center: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'shop') {
      return { verdict: 'cannot_upgrade' };
    }

    // Check if adjacent to existing shopping center
    const adjacent = game.getAdjacentCells(pos);
    const hasAdjacentShoppingCenter = adjacent.some(
      (a) => a.tile === 'shopping_center'
    );

    // Use DFS to find connected commercial cluster
    const cluster = findConnectedCommercialCluster(pos, game);
    const clusterValid = cluster.size >= 3 && cluster.touchesRoad;

    const conditions = [
      {
        met: hasAdjacentShoppingCenter || clusterValid,
        desc: hasAdjacentShoppingCenter
          ? `Adjacent to Shopping Center`
          : `3+ connected Commercial touching road (size: ${cluster.size}, road: ${cluster.touchesRoad})`,
      },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  restaurant: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'shop') {
      return { verdict: 'cannot_upgrade' };
    }

    const adjacent = game.getAdjacentCells(pos);
    const hasAdjacentCommercial = adjacent.some(
      (a) => a.tile && tileToCategory[a.tile] === 'C'
    );

    const blockResidential = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'R');
    const adjacentBlocksResidential = game.countInAdjacentSuperblocks(pos.superblockRow, pos.superblockCol, 'R');
    const totalResidential = blockResidential + adjacentBlocksResidential;

    const conditions = [
      { met: hasAdjacentCommercial, desc: `Has adjacent Commercial` },
      { met: totalResidential >= 10, desc: `Total Residential ≥ 10 in block + adjacent (${totalResidential}/10)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  bank: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'shop') {
      return { verdict: 'cannot_upgrade' };
    }

    const tier2Count = game.countTileTypeInAdjacentSuperblocks(
      pos.superblockRow,
      pos.superblockCol,
      'tier2_residential'
    );

    const conditions = [
      { met: tier2Count >= 4, desc: `≥ 4 Tier-2 Residential in adjacent blocks (${tier2Count}/4)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },
});

// Education upgrade checks
export const educationUpgrades: UpgradeChecker = (pos, game) => ({
  highschool: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'school') {
      return { verdict: 'cannot_upgrade' };
    }

    // Count residential in adjacent superblocks
    const residentialInAdjBlocks = game.countInAdjacentSuperblocks(
      pos.superblockRow,
      pos.superblockCol,
      'R'
    );

    // Check for another school in adjacent superblocks
    const schoolsInAdjBlocks = game.countTileTypeInAdjacentSuperblocks(
      pos.superblockRow,
      pos.superblockCol,
      'school'
    ) + game.countTileTypeInAdjacentSuperblocks(
      pos.superblockRow,
      pos.superblockCol,
      'highschool'
    ) + game.countTileTypeInAdjacentSuperblocks(
      pos.superblockRow,
      pos.superblockCol,
      'university'
    );

    const conditions = [
      { met: residentialInAdjBlocks >= 20, desc: `≥ 20 Residential in adjacent blocks (${residentialInAdjBlocks}/20)` },
      { met: schoolsInAdjBlocks >= 1, desc: `Another school in adjacent blocks (${schoolsInAdjBlocks}/1)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },

  university: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'school' && currentTile !== 'highschool') {
      return { verdict: 'cannot_upgrade' };
    }

    // Count all education tiles in superblock
    const eCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'E');

    const conditions = [
      { met: eCount >= 4, desc: `≥ 4 Education in block (${eCount}/4)` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },
});

// Slums can revert to house when conditions are no longer met
export const slumsDowngrade: UpgradeChecker = (pos, game) => ({
  house: () => {
    const currentTile = game.getCell(pos);
    if (currentTile !== 'slums') {
      return { verdict: 'cannot_upgrade' };
    }

    const lCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'L');
    const eCount = game.countInSuperblock(pos.superblockRow, pos.superblockCol, 'E');

    // Slums revert to house if there's leisure or education in the block
    const hasLeisureOrEducation = lCount > 0 || eCount > 0;

    const conditions = [
      { met: hasLeisureOrEducation, desc: `Leisure or Education added to block (L:${lCount}, E:${eCount})` },
    ];

    return { verdict: 'can_upgrade', conditions };
  },
});

// Helper function to check if position is part of a 2x2 leisure square
function checkLeisureSquare(pos: Position, game: GameStateAccessor): boolean {
  const { cellRow, cellCol, superblockRow, superblockCol } = pos;

  // Check all 4 possible 2x2 squares this cell could be part of
  const offsets = [
    [[0, 0], [0, 1], [1, 0], [1, 1]], // top-left of square
    [[0, -1], [0, 0], [1, -1], [1, 0]], // top-right of square
    [[-1, 0], [-1, 1], [0, 0], [0, 1]], // bottom-left of square
    [[-1, -1], [-1, 0], [0, -1], [0, 0]], // bottom-right of square
  ];

  for (const square of offsets) {
    let allLeisure = true;
    for (const [dr, dc] of square) {
      const newRow = cellRow + dr;
      const newCol = cellCol + dc;

      // Must be within same superblock
      if (newRow < 0 || newRow > 2 || newCol < 0 || newCol > 2) {
        allLeisure = false;
        break;
      }

      const tile = game.getCell({
        superblockRow,
        superblockCol,
        cellRow: newRow,
        cellCol: newCol,
      });

      if (!tile || tileToCategory[tile] !== 'L') {
        allLeisure = false;
        break;
      }
    }

    if (allLeisure) {
      return true;
    }
  }

  return false;
}

// Get all possible upgrades for a tile at a position
export function getUpgradesForTile(
  tile: TileType,
  pos: Position,
  game: GameStateAccessor
): Record<string, UpgradeResult> {
  const category = tileToCategory[tile];
  let checker: UpgradeChecker;

  switch (category) {
    case 'R':
      checker = residentialUpgrades;
      break;
    case 'L':
      checker = leisureUpgrades;
      break;
    case 'C':
      checker = commercialUpgrades;
      break;
    case 'E':
      checker = educationUpgrades;
      break;
  }

  const upgrades = checker(pos, game);
  const results: Record<string, UpgradeResult> = {};

  for (const [name, checkFn] of Object.entries(upgrades)) {
    results[name] = checkFn();
  }

  // Also check for slums downgrade
  if (tile === 'slums') {
    const downgrade = slumsDowngrade(pos, game);
    for (const [name, checkFn] of Object.entries(downgrade)) {
      results[name] = checkFn();
    }
  }

  return results;
}

// Priority order for upgrades (higher priority processed first, within same tile)
// Sports has priority over playground
export const upgradePriority: TileType[] = [
  // Highest tier first
  'highrise',
  'park',
  'bank',
  'university',
  // Mid tier
  'tier2_residential',
  'shopping_center',
  'restaurant',
  'plaza',
  'cinema',
  'highschool',
  // Lower tier - Sports before playground!
  'villa',
  'hotel',
  'sports',
  'playground',
  // Slums bounce back (house is the downgrade target)
  'house',
  // Lowest tier (can be reversed by adding L/E)
  'slums',
];
