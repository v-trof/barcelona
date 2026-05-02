import { describe, it, expect, beforeEach } from 'vitest';
import { GameStore } from './gameStore';
import { BattleMap } from './types';

const createTestMap = (): BattleMap => ({
  meta: {
    cols: 3,
    rows: 3,
    cellSizeMeters: 5,
    center: { lat: 0, lng: 0 },
    zoom: 15,
    rotation: 0,
  },
  tiles: [
    [
      { type: 'GROUND', meta: {} },
      { type: 'GROUND', meta: {} },
      { type: 'GROUND', meta: {} },
    ],
    [
      { type: 'GROUND', meta: {} },
      { type: 'GROUND', meta: {} },
      { type: 'GROUND', meta: {} },
    ],
    [
      { type: 'GROUND', meta: {} },
      { type: 'GROUND', meta: {} },
      { type: 'GROUND', meta: {} },
    ],
  ],
});

describe('GameStore', () => {
  let store: GameStore;

  beforeEach(() => {
    store = new GameStore();
  });

  describe('loadMap', () => {
    it('should load a map and initialize history', () => {
      const map = createTestMap();
      store.loadMap(map);

      expect(store.map).not.toBeNull();
      expect(store.map?.meta.cols).toBe(3);
      expect(store.map?.meta.rows).toBe(3);
      expect(store.history.length).toBe(1);
      expect(store.historyIndex).toBe(0);
    });

    it('should set rotation from map metadata', () => {
      const map = createTestMap();
      map.meta.rotation = 45;
      store.loadMap(map);

      expect(store.rotation).toBe(45);
    });
  });

  describe('selectTile', () => {
    it('should set the selected tile type', () => {
      store.selectTile('WATER');
      expect(store.selectedTile).toBe('WATER');

      store.selectTile('BUILDING_HIGH');
      expect(store.selectedTile).toBe('BUILDING_HIGH');
    });
  });

  describe('paintTile', () => {
    it('should change tile type and add to history', () => {
      const map = createTestMap();
      store.loadMap(map);
      store.selectTile('WATER');

      expect(store.map?.tiles[0][0].type).toBe('GROUND');
      store.paintTile(0, 0);
      expect(store.map?.tiles[0][0].type).toBe('WATER');
      expect(store.history.length).toBe(2);
    });

    it('should not paint outside grid bounds', () => {
      const map = createTestMap();
      store.loadMap(map);
      store.selectTile('WATER');

      store.paintTile(10, 10);
      expect(store.history.length).toBe(1);
    });
  });

  describe('selectCell', () => {
    it('should set selected cell coordinates', () => {
      store.selectCell(1, 2);
      expect(store.selectedCol).toBe(1);
      expect(store.selectedRow).toBe(2);
    });
  });

  describe('setRotation', () => {
    it('should set rotation and normalize to 0-360', () => {
      store.setRotation(45);
      expect(store.rotation).toBe(45);

      store.setRotation(360);
      expect(store.rotation).toBe(0);

      store.setRotation(450);
      expect(store.rotation).toBe(90);
    });

    it('should update map metadata rotation', () => {
      const map = createTestMap();
      store.loadMap(map);
      store.setRotation(90);

      expect(store.map?.meta.rotation).toBe(90);
    });
  });

  describe('undo/redo', () => {
    it('should undo and redo changes', () => {
      const map = createTestMap();
      store.loadMap(map);
      store.selectTile('WATER');

      store.paintTile(0, 0);
      expect(store.map?.tiles[0][0].type).toBe('WATER');

      store.undo();
      expect(store.map?.tiles[0][0].type).toBe('GROUND');

      store.redo();
      expect(store.map?.tiles[0][0].type).toBe('WATER');
    });

    it('should limit history to 50 entries', () => {
      const map = createTestMap();
      store.loadMap(map);
      store.selectTile('WATER');

      for (let i = 0; i < 60; i++) {
        store.paintTile(0, 0);
        store.selectTile(store.selectedTile === 'WATER' ? 'GROUND' : 'WATER');
      }

      expect(store.history.length).toBeLessThanOrEqual(51);
    });

    it('should report canUndo and canRedo correctly', () => {
      const map = createTestMap();
      store.loadMap(map);
      store.selectTile('WATER');

      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);

      store.paintTile(0, 0);
      expect(store.canUndo()).toBe(true);
      expect(store.canRedo()).toBe(false);

      store.undo();
      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(true);
    });
  });

  describe('exportJSON/importJSON', () => {
    it('should export map as JSON string', () => {
      const map = createTestMap();
      store.loadMap(map);
      const json = store.exportJSON();

      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed.meta.cols).toBe(3);
      expect(parsed.tiles.length).toBe(3);
    });

    it('should import JSON and load map', () => {
      const map = createTestMap();
      store.loadMap(map);
      const json = store.exportJSON();

      const store2 = new GameStore();
      store2.importJSON(json);

      expect(store2.map?.meta.cols).toBe(3);
      expect(store2.map?.tiles[0][0].type).toBe('GROUND');
    });

    it('should handle invalid JSON gracefully', () => {
      store.importJSON('invalid json');
      expect(store.map).toBeNull();
    });
  });
});
