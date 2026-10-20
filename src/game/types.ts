export type TileType = 'void' | 'empty' | 'grass' | 'forest' | 'village' | 'city';

export type Position = {
  x: number;
  y: number;
};

export type PrerequisiteResult = {
  passed: boolean;
  explanation: string;
};

export type Tile = {
  type: TileType;
  previousType: TileType | null;
};