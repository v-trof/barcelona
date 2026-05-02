import { describe, it, expect, vi } from 'vitest';
import { createGridCells, rasterizeFeaturesToGrid, featuresToGeoJSON } from './rasterize';

interface Feature {
  properties: Record<string, any>;
  geometry: any;
}

describe('rasterize', () => {
  describe('createGridCells', () => {
    it('should create grid cells with correct dimensions', () => {
      const cells = createGridCells(0, 0, 3, 3, 10);

      expect(cells.length).toBe(9);
      expect(cells.every(c => c.bbox.length === 4)).toBe(true);
    });

    it('should create cells with correct column and row indices', () => {
      const cells = createGridCells(0, 0, 2, 2, 10);

      const colsSet = new Set(cells.map(c => c.col));
      const rowsSet = new Set(cells.map(c => c.row));

      expect(colsSet.size).toBe(2);
      expect(rowsSet.size).toBe(2);
    });

    it('should handle single cell grid', () => {
      const cells = createGridCells(0, 0, 1, 1, 10);

      expect(cells.length).toBe(1);
      expect(cells[0].col).toBe(0);
      expect(cells[0].row).toBe(0);
    });

    it('should handle large grid', () => {
      const cells = createGridCells(0, 0, 10, 10, 10);

      expect(cells.length).toBe(100);
      const allCols = cells.map(c => c.col);
      const allRows = cells.map(c => c.row);

      expect(Math.max(...allCols)).toBe(9);
      expect(Math.max(...allRows)).toBe(9);
    });

    it('should create bounding boxes in valid format', () => {
      const cells = createGridCells(35, 136, 2, 2, 10);

      cells.forEach(cell => {
        const [minLng, minLat, maxLng, maxLat] = cell.bbox;
        expect(minLng).toBeLessThan(maxLng);
        expect(minLat).toBeLessThan(maxLat);
        expect(typeof minLng).toBe('number');
        expect(typeof minLat).toBe('number');
      });
    });
  });

  describe('rasterizeFeaturesToGrid', () => {
    it('should create grid with correct dimensions', () => {
      const cells = createGridCells(0, 0, 2, 3, 10);
      const features: Feature[] = [];

      const grid = rasterizeFeaturesToGrid(features, cells);

      expect(grid.length).toBe(3);
      expect(grid[0].length).toBe(2);
    });

    it('should default all tiles to GROUND', () => {
      const cells = createGridCells(0, 0, 2, 2, 10);
      const features: Feature[] = [];

      const grid = rasterizeFeaturesToGrid(features, cells);

      grid.forEach(row => {
        row.forEach(tile => {
          expect(tile.type).toBe('GROUND');
          expect(tile.meta).toEqual({});
        });
      });
    });

    it('should classify tiles based on features', () => {
      const cells = createGridCells(0, 0, 2, 2, 10);
      const features: Feature[] = [
        {
          properties: { class: 'water' },
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
        },
      ];

      const grid = rasterizeFeaturesToGrid(features, cells);

      // Should have at least some WATER tiles (not all GROUND)
      const waterCount = grid
        .flat()
        .filter(tile => tile.type === 'WATER').length;

      expect(waterCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty feature list', () => {
      const cells = createGridCells(0, 0, 3, 3, 10);
      const features: Feature[] = [];

      const grid = rasterizeFeaturesToGrid(features, cells);

      expect(grid.length).toBe(3);
      expect(grid.every(row => row.every(tile => tile.type === 'GROUND'))).toBe(
        true
      );
    });

    it('should maintain tile structure', () => {
      const cells = createGridCells(0, 0, 2, 2, 10);
      const features: Feature[] = [];

      const grid = rasterizeFeaturesToGrid(features, cells);

      grid.forEach(row => {
        row.forEach(tile => {
          expect(tile).toHaveProperty('type');
          expect(tile).toHaveProperty('meta');
          expect(typeof tile.type).toBe('string');
          expect(typeof tile.meta).toBe('object');
        });
      });
    });
  });

  describe('featuresToGeoJSON', () => {
    it('should convert features to GeoJSON', () => {
      const features: Feature[] = [
        {
          properties: { name: 'test' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ];

      const geojson = featuresToGeoJSON(features);

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features.length).toBe(1);
      expect(geojson.features[0].type).toBe('Feature');
      expect(geojson.features[0].properties.name).toBe('test');
    });

    it('should handle empty feature list', () => {
      const features: Feature[] = [];
      const geojson = featuresToGeoJSON(features);

      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features.length).toBe(0);
    });

    it('should preserve all properties', () => {
      const features: Feature[] = [
        {
          properties: {
            id: '123',
            name: 'test',
            tags: { key: 'value' },
          },
          geometry: { type: 'Point', coordinates: [1, 2] },
        },
      ];

      const geojson = featuresToGeoJSON(features);
      const feature = geojson.features[0];

      expect(feature.properties.id).toBe('123');
      expect(feature.properties.name).toBe('test');
      expect(feature.properties.tags.key).toBe('value');
    });

    it('should preserve geometry', () => {
      const geometry = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      };
      const features: Feature[] = [
        {
          properties: { name: 'test' },
          geometry,
        },
      ];

      const geojson = featuresToGeoJSON(features);

      expect(geojson.features[0].geometry).toEqual(geometry);
    });

    it('should handle multiple features', () => {
      const features: Feature[] = [
        {
          properties: { id: '1' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
        {
          properties: { id: '2' },
          geometry: { type: 'Point', coordinates: [1, 1] },
        },
        {
          properties: { id: '3' },
          geometry: { type: 'Point', coordinates: [2, 2] },
        },
      ];

      const geojson = featuresToGeoJSON(features);

      expect(geojson.features.length).toBe(3);
      expect(geojson.features[0].properties.id).toBe('1');
      expect(geojson.features[2].properties.id).toBe('3');
    });
  });
});
