import { describe, it, expect } from 'vitest';
import { classifyFeatures } from './classify';

interface Feature {
  properties: Record<string, any>;
  geometry: any;
}

describe('classify', () => {
  describe('classifyFeatures', () => {
    it('should classify water features', () => {
      const features: Feature[] = [
        { properties: { class: 'water' }, geometry: {} },
      ];
      const result = classifyFeatures(features);
      expect(result.type).toBe('WATER');
    });

    it('should classify buildings by level count', () => {
      const highBuilding: Feature = {
        properties: { class: 'building', 'building:levels': '8' },
        geometry: {},
      };
      expect(classifyFeatures([highBuilding]).type).toBe('BUILDING_HIGH');

      const midBuilding: Feature = {
        properties: { class: 'building', 'building:levels': '4' },
        geometry: {},
      };
      expect(classifyFeatures([midBuilding]).type).toBe('BUILDING_MID');

      const lowBuilding: Feature = {
        properties: { class: 'building', 'building:levels': '2' },
        geometry: {},
      };
      expect(classifyFeatures([lowBuilding]).type).toBe('BUILDING_LOW');

      const unknownBuilding: Feature = {
        properties: { class: 'building' },
        geometry: {},
      };
      expect(classifyFeatures([unknownBuilding]).type).toBe('BUILDING_LOW');
    });

    it('should classify roads by highway tag', () => {
      const majorRoad: Feature = {
        properties: { class: 'road', highway: 'motorway' },
        geometry: {},
      };
      expect(classifyFeatures([majorRoad]).type).toBe('ROAD_MAJOR');

      const minorRoad: Feature = {
        properties: { class: 'road', highway: 'residential' },
        geometry: {},
      };
      expect(classifyFeatures([minorRoad]).type).toBe('ROAD_MINOR');
    });

    it('should classify parks', () => {
      const park: Feature = {
        properties: { landuse: 'park' },
        geometry: {},
      };
      expect(classifyFeatures([park]).type).toBe('PARK');
    });

    it('should classify forests', () => {
      const forest: Feature = {
        properties: { landuse: 'forest' },
        geometry: {},
      };
      expect(classifyFeatures([forest]).type).toBe('FOREST');
    });

    it('should classify farmland', () => {
      const farmland: Feature = {
        properties: { landuse: 'farmland' },
        geometry: {},
      };
      expect(classifyFeatures([farmland]).type).toBe('FARMLAND');
    });

    it('should classify paths', () => {
      const path: Feature = {
        properties: { class: 'path' },
        geometry: {},
      };
      expect(classifyFeatures([path]).type).toBe('PATH');
    });

    it('should classify bridges', () => {
      const bridge: Feature = {
        properties: { class: 'bridge' },
        geometry: {},
      };
      expect(classifyFeatures([bridge]).type).toBe('BRIDGE');
    });

    it('should classify walls', () => {
      const wall: Feature = {
        properties: { barrier: 'wall' },
        geometry: {},
      };
      expect(classifyFeatures([wall]).type).toBe('WALL');
    });

    it('should classify paved lots', () => {
      const lot: Feature = {
        properties: { landuse: 'parking' },
        geometry: {},
      };
      expect(classifyFeatures([lot]).type).toBe('PAVED_LOT');
    });

    it('should use priority stacking when multiple features present', () => {
      const features: Feature[] = [
        { properties: { landuse: 'grass' }, geometry: {} }, // ROUGH
        { properties: { class: 'water' }, geometry: {} }, // WATER (higher priority)
      ];
      const result = classifyFeatures(features);
      expect(result.type).toBe('WATER');
    });

    it('should default to GROUND when no features match', () => {
      const features: Feature[] = [
        { properties: { unknown: 'tag' }, geometry: {} },
      ];
      const result = classifyFeatures(features);
      expect(result.type).toBe('GROUND');
    });

    it('should extract building metadata', () => {
      const building: Feature = {
        properties: {
          class: 'building',
          'building:levels': '5',
          id: 'way:123456',
        },
        geometry: {},
      };
      const result = classifyFeatures([building]);
      expect(result.meta.levels).toBe(5);
      expect(result.meta.osm_id).toBe('way:123456');
    });

    it('should extract road metadata', () => {
      const road: Feature = {
        properties: {
          class: 'road',
          highway: 'primary',
          id: 'way:654321',
        },
        geometry: {},
      };
      const result = classifyFeatures([road]);
      expect(result.meta.highway).toBe('primary');
      expect(result.meta.osm_id).toBe('way:654321');
    });

    it('should handle empty feature list', () => {
      const result = classifyFeatures([]);
      expect(result.type).toBe('GROUND');
      expect(result.meta).toEqual({});
    });
  });
});
