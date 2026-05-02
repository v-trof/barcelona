import * as turf from '@turf/turf';
import { Tile, TileType } from './types';
import { classifyFeatures } from './classify';

interface Feature {
  properties: Record<string, any>;
  geometry: any;
}

interface GridCell {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  col: number;
  row: number;
}

function bboxToPolygon(bbox: [number, number, number, number]): any {
  return turf.bboxPolygon(bbox).geometry;
}

export function createGridCells(
  centerLat: number,
  centerLng: number,
  cols: number,
  rows: number,
  cellSizeMeters: number
): GridCell[] {
  const cells: GridCell[] = [];
  const centerPoint = turf.point([centerLng, centerLat]);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetCol = (col - cols / 2 + 0.5) * cellSizeMeters;
      const offsetRow = (row - rows / 2 + 0.5) * cellSizeMeters;

      const bearing = 90 + (Math.atan2(offsetRow, offsetCol) * 180) / Math.PI;
      const distance = Math.sqrt(offsetCol * offsetCol + offsetRow * offsetRow) / 1000;

      const offset = turf.destination(centerPoint, distance, bearing);
      const bbox = turf.bbox(
        turf.buffer(offset, cellSizeMeters / 2000, { units: 'meters' })
      ) as [number, number, number, number];

      cells.push({ bbox, col, row });
    }
  }

  return cells;
}

export function rasterizeFeaturesToGrid(
  features: Feature[],
  cells: GridCell[]
): Tile[][] {
  const maxCol = Math.max(...cells.map(c => c.col)) + 1;
  const maxRow = Math.max(...cells.map(c => c.row)) + 1;

  const grid: Tile[][] = Array(maxRow)
    .fill(null)
    .map(() =>
      Array(maxCol)
        .fill(null)
        .map(() => ({ type: 'GROUND' as TileType, meta: {} }))
    );

  for (const cell of cells) {
    const cellPolygon = bboxToPolygon(cell.bbox);

    const intersectingFeatures = features.filter(feature => {
      try {
        return turf.booleanIntersects(feature, cellPolygon);
      } catch {
        return false;
      }
    });

    const classification = classifyFeatures(intersectingFeatures);
    if (cell.row < grid.length && cell.col < grid[0].length) {
      grid[cell.row][cell.col] = {
        type: classification.type,
        meta: classification.meta,
      };
    }
  }

  return grid;
}

export function featuresToGeoJSON(features: Feature[]): any {
  return {
    type: 'FeatureCollection',
    features: features.map(f => ({
      type: 'Feature',
      properties: f.properties,
      geometry: f.geometry,
    })),
  };
}
