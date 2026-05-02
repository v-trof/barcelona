export type TileType =
  | 'WATER'
  | 'BUILDING_HIGH'
  | 'BUILDING_MID'
  | 'BUILDING_LOW'
  | 'ROAD_MAJOR'
  | 'ROAD_MINOR'
  | 'PATH'
  | 'BRIDGE'
  | 'PARK'
  | 'FOREST'
  | 'FARMLAND'
  | 'ROUGH'
  | 'PAVED_LOT'
  | 'WALL'
  | 'GROUND';

export interface TileMetadata {
  osm_id?: string;
  levels?: number;
  highway?: string;
  [key: string]: any;
}

export interface Tile {
  type: TileType;
  meta: TileMetadata;
}

export interface MapMeta {
  cols: number;
  rows: number;
  cellSizeMeters: number;
  center: { lat: number; lng: number };
  zoom: number;
  rotation: number;
}

export interface BattleMap {
  meta: MapMeta;
  tiles: Tile[][];
}
