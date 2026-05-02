import { TileType, TileMetadata } from './types';

interface Feature {
  properties: Record<string, any>;
  geometry: any;
}

export interface ClassificationResult {
  type: TileType;
  meta: TileMetadata;
}

const PRIORITY_STACK: TileType[] = [
  'WATER',
  'BUILDING_HIGH',
  'BUILDING_MID',
  'BUILDING_LOW',
  'ROAD_MAJOR',
  'ROAD_MINOR',
  'PATH',
  'BRIDGE',
  'PARK',
  'FOREST',
  'FARMLAND',
  'ROUGH',
  'PAVED_LOT',
  'WALL',
  'GROUND',
];

function classifyBuilding(levels?: any): TileType {
  if (!levels) return 'BUILDING_LOW';
  const numLevels = parseInt(String(levels), 10);
  if (numLevels >= 6) return 'BUILDING_HIGH';
  if (numLevels >= 3) return 'BUILDING_MID';
  return 'BUILDING_LOW';
}

function classifyRoad(highway?: any): TileType {
  if (!highway) return 'ROAD_MINOR';
  const hw = String(highway).toLowerCase();
  if (['motorway', 'trunk', 'primary'].includes(hw)) return 'ROAD_MAJOR';
  return 'ROAD_MINOR';
}

function getFeatureType(feature: Feature): TileType | null {
  const props = feature.properties;

  if (props.class === 'water' || props.water === 'yes') return 'WATER';
  if (props.class === 'building') return classifyBuilding(props['building:levels'] || props.levels);
  if (props.class === 'road' || props.highway) return classifyRoad(props.highway);
  if (props.class === 'path' || props.footway === 'yes') return 'PATH';
  if (props.class === 'bridge') return 'BRIDGE';
  if (props.class === 'park' || props.landuse === 'park') return 'PARK';
  if (props.class === 'forest' || props.landuse === 'forest') return 'FOREST';
  if (props.landuse === 'farmland') return 'FARMLAND';
  if (props.landuse === 'grass' || props.class === 'grass') return 'ROUGH';
  if (props.landuse === 'parking' || props.class === 'parking') return 'PAVED_LOT';
  if (props.barrier === 'wall') return 'WALL';

  return null;
}

export function classifyFeatures(features: Feature[]): ClassificationResult {
  let bestType: TileType | null = null;
  let bestPriority = PRIORITY_STACK.length;
  let bestMeta: TileMetadata = {};

  for (const feature of features) {
    const type = getFeatureType(feature);
    if (!type) continue;

    const priority = PRIORITY_STACK.indexOf(type);
    if (priority < bestPriority) {
      bestPriority = priority;
      bestType = type;
      bestMeta = {
        osm_id: feature.properties.id,
        ...extractMetadata(feature, type),
      };
    }
  }

  return {
    type: bestType || 'GROUND',
    meta: bestMeta,
  };
}

function extractMetadata(feature: Feature, type: TileType): TileMetadata {
  const props = feature.properties;
  const meta: TileMetadata = {};

  if (type.startsWith('BUILDING_')) {
    meta.levels = parseInt(String(props['building:levels'] || props.levels || 1), 10);
  }

  if (type.includes('ROAD')) {
    meta.highway = props.highway;
  }

  return meta;
}
