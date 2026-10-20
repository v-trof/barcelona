import { observable } from 'mobx';
import type { Position, PrerequisiteResult, Tile, TileType } from './types';

type EvolutionOption = {
  to: TileType;
  checkPrerequisites: (grid: Tile[][], position: Position) => PrerequisiteResult;
};

export type GameStore = {
  mapSize: number;
  grid: Tile[][];
  selectedPosition: Position | null;
  getTile: (position: Position) => Tile;
  getPossibleNextStates: (
    position: Position,
  ) => Array<EvolutionOption & { prerequisite: PrerequisiteResult }>;
  evolveTile: (position: Position, nextType: TileType) => boolean;
  setSelectedPosition: (position: Position | null) => void;
};

const MAP_SIZE = 101;
const CENTER_RADIUS = 1;

function isInBounds(position: Position): boolean {
  return position.x >= 0 && position.x < MAP_SIZE && position.y >= 0 && position.y < MAP_SIZE;
}

function getNeighborPositions(position: Position): Position[] {
  const offsets = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: -1 },
    { x: 1, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ];

  return offsets
    .map((offset) => ({ x: position.x + offset.x, y: position.y + offset.y }))
    .filter(isInBounds);
}

function countNeighborTiles(grid: Tile[][], position: Position, type: TileType): number {
  return getNeighborPositions(position).reduce((count, neighbor) => {
    return count + (grid[neighbor.y][neighbor.x].type === type ? 1 : 0);
  }, 0);
}

function countTilesOnMap(grid: Tile[][], type: TileType): number {
  return grid.reduce((count, row) => {
    return count + row.filter((tile) => tile.type === type).length;
  }, 0);
}

function createInitialGrid(): Tile[][] {
  const center = Math.floor(MAP_SIZE / 2);

  return Array.from({ length: MAP_SIZE }, (_, y) =>
    Array.from({ length: MAP_SIZE }, (_, x) => {
      const inCenter =
        Math.abs(x - center) <= CENTER_RADIUS && Math.abs(y - center) <= CENTER_RADIUS;

      return {
        type: inCenter ? 'empty' : 'void',
        previousType: null,
      };
    }),
  );
}

const evolutionTree: Record<TileType, EvolutionOption[]> = {
  void: [],
  empty: [
    {
      to: 'grass',
      checkPrerequisites: (grid, position) => {
        const emptyNeighbors = countNeighborTiles(grid, position, 'empty');
        const passed = emptyNeighbors >= 1;
        return {
          passed,
          explanation: `Needs at least 1 neighbouring empty tile.\nFound ${emptyNeighbors}.`,
        };
      },
    },
    {
      to: 'forest',
      checkPrerequisites: (grid, position) => {
        const grassOnMap = countTilesOnMap(grid, 'grass');
        const emptyNeighbors = countNeighborTiles(grid, position, 'empty');
        const passed = grassOnMap >= 5 && emptyNeighbors >= 1;
        return {
          passed,
          explanation: `Needs at least 5 grass tiles on the entire map and 1 neighbouring empty tile.\nGrass on map: ${grassOnMap}\nNeighbouring empty tiles: ${emptyNeighbors}.`,
        };
      },
    },
  ],
  grass: [
    {
      to: 'forest',
      checkPrerequisites: (grid, position) => {
        const grassNeighbors = countNeighborTiles(grid, position, 'grass');
        const passed = grassNeighbors >= 2;
        return {
          passed,
          explanation: `Needs at least 2 neighbouring grass tiles.\nFound ${grassNeighbors}.`,
        };
      },
    },
    {
      to: 'village',
      checkPrerequisites: (grid, position) => {
        const forestNeighbors = countNeighborTiles(grid, position, 'forest');
        const grassOnMap = countTilesOnMap(grid, 'grass');
        const passed = forestNeighbors >= 1 && grassOnMap >= 10;
        return {
          passed,
          explanation: `Needs at least 1 neighbouring forest and 10 grass tiles on map.\nNeighbouring forests: ${forestNeighbors}\nGrass on map: ${grassOnMap}.`,
        };
      },
    },
  ],
  forest: [
    {
      to: 'village',
      checkPrerequisites: (grid, position) => {
        const villageOnMap = countTilesOnMap(grid, 'village');
        const forestNeighbors = countNeighborTiles(grid, position, 'forest');
        const passed = villageOnMap >= 1 || forestNeighbors >= 3;
        return {
          passed,
          explanation: `Needs either 1 village on map OR 3 neighbouring forests.\nVillages on map: ${villageOnMap}\nNeighbouring forests: ${forestNeighbors}.`,
        };
      },
    },
  ],
  village: [
    {
      to: 'city',
      checkPrerequisites: (grid, position) => {
        const villageNeighbors = countNeighborTiles(grid, position, 'village');
        const villageOnMap = countTilesOnMap(grid, 'village');
        const passed = villageNeighbors >= 1 && villageOnMap >= 3;
        return {
          passed,
          explanation: `Needs at least 1 neighbouring village and 3 villages on map.\nNeighbouring villages: ${villageNeighbors}\nVillages on map: ${villageOnMap}.`,
        };
      },
    },
  ],
  city: [],
};

export function createGameStore() {
  const store = observable({
    mapSize: MAP_SIZE,
    grid: createInitialGrid(),
    selectedPosition: null as Position | null,
    getTile(position: Position) {
      return this.grid[position.y][position.x];
    },
    getPossibleNextStates(position: Position) {
      const tile = this.getTile(position);
      const options = evolutionTree[tile.type];
      return options.map((option) => ({
        ...option,
        prerequisite: option.checkPrerequisites(this.grid, position),
      }));
    },
    evolveTile(position: Position, nextType: TileType) {
      const tile = this.getTile(position);
      const option = evolutionTree[tile.type].find((candidate) => candidate.to === nextType);
      if (!option) {
        return false;
      }

      const prerequisite = option.checkPrerequisites(this.grid, position);
      if (!prerequisite.passed) {
        return false;
      }

      const previousType = tile.type;
      tile.previousType = previousType;
      tile.type = nextType;

      if (previousType === 'empty') {
        for (const neighbor of getNeighborPositions(position)) {
          const neighborTile = this.grid[neighbor.y][neighbor.x];
          if (neighborTile.type === 'void') {
            neighborTile.previousType = 'void';
            neighborTile.type = 'empty';
          }
        }
      }

      return true;
    },
    setSelectedPosition(position: Position | null) {
      this.selectedPosition = position;
    },
  });

  return store;
}

export const gameStore = createGameStore();