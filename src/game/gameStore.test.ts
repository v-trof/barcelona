import { describe, it, expect, beforeEach } from 'vitest';
import { createGameStore, type GameStore } from './gameStore';
import type { Position, TileType } from './types';

// Helper to create position
const pos = (sbRow: number, sbCol: number, cellRow: number, cellCol: number): Position => ({
  superblockRow: sbRow,
  superblockCol: sbCol,
  cellRow,
  cellCol,
});

// Helper to prefill cells
const prefill = (store: GameStore, cells: Array<{ pos: Position; tile: TileType }>) => {
  for (const { pos: p, tile } of cells) {
    store.setCell(p, tile);
  }
};

describe('Upgrade System', () => {
  let store: GameStore;

  beforeEach(() => {
    store = createGameStore();
    // Clear the deck and grid
    store.deck = [];
    for (let sbr = 0; sbr < 3; sbr++) {
      for (let sbc = 0; sbc < 3; sbc++) {
        for (let i = 0; i < 9; i++) {
          store.grid[sbr][sbc][i] = null;
        }
      }
    }
    store.score = 0;
    store.turn = 0;
  });

  describe('Residential Upgrades', () => {
    it('should upgrade to Slums when R >= 4 and no L or E in block', () => {
      // Place 3 houses in block (0,0)
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'house' },
        { pos: pos(0, 0, 0, 1), tile: 'house' },
        { pos: pos(0, 0, 0, 2), tile: 'house' },
      ]);

      // Add R to deck and place 4th house
      store.deck = ['R'];
      store.placeTile(pos(0, 0, 1, 0));

      // All 4 should become slums
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('slums');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('slums');
      expect(store.getCell(pos(0, 0, 0, 2))).toBe('slums');
      expect(store.getCell(pos(0, 0, 1, 0))).toBe('slums');
      expect(store.score).toBe(-6 * 4); // -6 per slum
    });

    it('should bounce back Slums to House when Leisure is added', () => {
      // Place 4 slums (from previous slums condition)
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'slums' },
        { pos: pos(0, 0, 0, 1), tile: 'slums' },
        { pos: pos(0, 0, 0, 2), tile: 'slums' },
        { pos: pos(0, 0, 1, 0), tile: 'slums' },
      ]);

      // Add L to deck and place yard
      store.deck = ['L'];
      store.placeTile(pos(0, 0, 1, 1));

      // Slums should revert to house
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('house');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('house');
      expect(store.getCell(pos(0, 0, 0, 2))).toBe('house');
      expect(store.getCell(pos(0, 0, 1, 0))).toBe('house');
      expect(store.getCell(pos(0, 0, 1, 1))).toBe('yard');
    });

    it('should bounce back Slums to House when Education is added', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'slums' },
        { pos: pos(0, 0, 0, 1), tile: 'slums' },
        { pos: pos(0, 0, 0, 2), tile: 'slums' },
        { pos: pos(0, 0, 1, 0), tile: 'slums' },
      ]);

      store.deck = ['E'];
      store.placeTile(pos(0, 0, 1, 1));

      // Slums should revert to house
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('house');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('house');
    });

    it('should upgrade to Villa when adjacent to Leisure and not near road', () => {
      // Place yard at (0,1) - edge of superblock
      // House at (1,1) - center, not near road, adjacent to yard at (0,1)
      prefill(store, [
        { pos: pos(0, 0, 0, 1), tile: 'yard' },
      ]);

      store.deck = ['R'];
      store.placeTile(pos(0, 0, 1, 1)); // center, not near road, adjacent to yard

      expect(store.getCell(pos(0, 0, 1, 1))).toBe('villa');
      expect(store.score).toBe(18);
    });

    it('should NOT upgrade to Villa when near road', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 1), tile: 'yard' },
      ]);

      store.deck = ['R'];
      store.placeTile(pos(0, 0, 0, 0)); // corner, near road

      expect(store.getCell(pos(0, 0, 0, 0))).toBe('house'); // stays house
    });

    it('should upgrade to Hotel when C >= 3 and R < 3', () => {
      // Place 3 shops NOT near road or not connected to avoid shopping center
      // Actually, we need isolated shops to avoid shopping center trigger
      // Put them in different spots that aren't connected
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'shop' },
        { pos: pos(0, 0, 0, 2), tile: 'shop' }, // not adjacent to (0,0)
        { pos: pos(0, 0, 2, 1), tile: 'shop' }, // not adjacent to either
      ]);

      store.deck = ['R'];
      store.placeTile(pos(0, 0, 1, 1)); // center

      expect(store.getCell(pos(0, 0, 1, 1))).toBe('hotel');
      expect(store.score).toBe(14);
    });

    it('should upgrade to Tier-2 Residential when R >= 3, L >= 1, C >= 1, E >= 1', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'house' },
        { pos: pos(0, 0, 0, 1), tile: 'house' },
        { pos: pos(0, 0, 0, 2), tile: 'yard' },
        { pos: pos(0, 0, 1, 0), tile: 'shop' },
        { pos: pos(0, 0, 1, 1), tile: 'school' },
      ]);

      // Place 3rd residential
      store.deck = ['R'];
      store.placeTile(pos(0, 0, 1, 2));

      // All houses should become tier2_residential
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('tier2_residential');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('tier2_residential');
      expect(store.getCell(pos(0, 0, 1, 2))).toBe('tier2_residential');
      expect(store.score).toBe(12 * 3);
    });

    it('should NOT upgrade to Tier-2 without Commercial', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'house' },
        { pos: pos(0, 0, 0, 1), tile: 'house' },
        { pos: pos(0, 0, 0, 2), tile: 'yard' },
        { pos: pos(0, 0, 1, 1), tile: 'school' },
      ]);

      store.deck = ['R'];
      store.placeTile(pos(0, 0, 1, 0));

      // Should stay as house (no commercial)
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('house');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('house');
      expect(store.getCell(pos(0, 0, 1, 0))).toBe('house');
    });
  });

  describe('Leisure Upgrades', () => {
    it('should upgrade to Playground when adjacent to Education', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'school' },
      ]);

      store.deck = ['L'];
      store.placeTile(pos(0, 0, 0, 1));

      expect(store.getCell(pos(0, 0, 0, 1))).toBe('playground');
      expect(store.score).toBe(4);
    });

    it('should upgrade to Sports when >= 2 adjacent Leisure (priority over Playground)', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'yard' },
        { pos: pos(0, 0, 1, 1), tile: 'yard' },
        { pos: pos(0, 0, 0, 2), tile: 'school' }, // has education adjacent too
      ]);

      store.deck = ['L'];
      store.placeTile(pos(0, 0, 0, 1)); // adjacent to 2 leisure AND education

      // Should be sports (priority over playground)
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('sports');
      expect(store.score).toBe(8);
    });

    it('should upgrade to Plaza when part of 2x2 Leisure square', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'yard' },
        { pos: pos(0, 0, 0, 1), tile: 'yard' },
        { pos: pos(0, 0, 1, 0), tile: 'yard' },
      ]);

      store.deck = ['L'];
      store.placeTile(pos(0, 0, 1, 1));

      // All 4 should become plaza
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('plaza');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('plaza');
      expect(store.getCell(pos(0, 0, 1, 0))).toBe('plaza');
      expect(store.getCell(pos(0, 0, 1, 1))).toBe('plaza');
    });

    it('should upgrade to Park when L >= 7 in block', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'yard' },
        { pos: pos(0, 0, 0, 1), tile: 'yard' },
        { pos: pos(0, 0, 0, 2), tile: 'yard' },
        { pos: pos(0, 0, 1, 0), tile: 'yard' },
        { pos: pos(0, 0, 1, 1), tile: 'yard' },
        { pos: pos(0, 0, 1, 2), tile: 'yard' },
      ]);

      store.deck = ['L'];
      store.placeTile(pos(0, 0, 2, 0));

      // All should become park
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('park');
      expect(store.getCell(pos(0, 0, 2, 0))).toBe('park');
    });

    it('should upgrade to Cinema when adjacent to Shopping Center', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'shopping_center' },
      ]);

      store.deck = ['L'];
      store.placeTile(pos(0, 0, 0, 1));

      expect(store.getCell(pos(0, 0, 0, 1))).toBe('cinema');
      expect(store.score).toBe(10);
    });
  });

  describe('Commercial Upgrades', () => {
    it('should upgrade to Shopping Center when 3+ connected Commercial touch road', () => {
      // Place 2 shops at edge (near road)
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'shop' }, // corner, near road
        { pos: pos(0, 0, 0, 1), tile: 'shop' }, // edge, near road
      ]);

      store.deck = ['C'];
      store.placeTile(pos(0, 0, 0, 2)); // edge, near road, 3rd connected shop

      // All 3 should become shopping center
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('shopping_center');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('shopping_center');
      expect(store.getCell(pos(0, 0, 0, 2))).toBe('shopping_center');
    });

    it('should upgrade to Shopping Center when adjacent to existing Shopping Center', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'shopping_center' },
      ]);

      store.deck = ['C'];
      store.placeTile(pos(0, 0, 0, 1));

      expect(store.getCell(pos(0, 0, 0, 1))).toBe('shopping_center');
    });

    it('should upgrade to Restaurant when has adjacent C and total R >= 10', () => {
      // Fill adjacent superblocks with residential (need 10 total)
      prefill(store, [
        // Block (0,0) - 5 residential
        { pos: pos(0, 0, 0, 0), tile: 'house' },
        { pos: pos(0, 0, 0, 1), tile: 'house' },
        { pos: pos(0, 0, 0, 2), tile: 'house' },
        { pos: pos(0, 0, 1, 0), tile: 'house' },
        { pos: pos(0, 0, 1, 1), tile: 'house' },
        // Block (0,1) - 5 more residential
        { pos: pos(0, 1, 0, 0), tile: 'house' },
        { pos: pos(0, 1, 0, 1), tile: 'house' },
        { pos: pos(0, 1, 0, 2), tile: 'house' },
        { pos: pos(0, 1, 1, 0), tile: 'house' },
        { pos: pos(0, 1, 1, 1), tile: 'house' },
        // Add a shop in block (0,0)
        { pos: pos(0, 0, 2, 0), tile: 'shop' },
      ]);

      store.deck = ['C'];
      store.placeTile(pos(0, 0, 2, 1)); // adjacent to shop

      expect(store.getCell(pos(0, 0, 2, 1))).toBe('restaurant');
    });

    it('should upgrade to Bank when >= 4 Tier-2 Residential in adjacent blocks', () => {
      prefill(store, [
        // Block (0,1) - 4 tier2 residential
        { pos: pos(0, 1, 0, 0), tile: 'tier2_residential' },
        { pos: pos(0, 1, 0, 1), tile: 'tier2_residential' },
        { pos: pos(0, 1, 0, 2), tile: 'tier2_residential' },
        { pos: pos(0, 1, 1, 0), tile: 'tier2_residential' },
      ]);

      store.deck = ['C'];
      store.placeTile(pos(0, 0, 0, 0)); // block (0,0), adjacent to (0,1)

      expect(store.getCell(pos(0, 0, 0, 0))).toBe('bank');
      expect(store.score).toBe(30);
    });
  });

  describe('Education Upgrades', () => {
    it('should upgrade to Highschool when school + 20 R in adj blocks + school in adj blocks', () => {
      // Block (0,0) is at corner, adjacent blocks are only: (0,1) and (1,0)
      // Need 20 residential total in these two adjacent blocks
      prefill(store, [
        // Block (0,1) - school + 8 residential = 8 R
        { pos: pos(0, 1, 0, 0), tile: 'school' },
        { pos: pos(0, 1, 0, 1), tile: 'house' },
        { pos: pos(0, 1, 0, 2), tile: 'house' },
        { pos: pos(0, 1, 1, 0), tile: 'house' },
        { pos: pos(0, 1, 1, 1), tile: 'house' },
        { pos: pos(0, 1, 1, 2), tile: 'house' },
        { pos: pos(0, 1, 2, 0), tile: 'house' },
        { pos: pos(0, 1, 2, 1), tile: 'house' },
        { pos: pos(0, 1, 2, 2), tile: 'house' }, // 8 houses in (0,1)
        // Block (1,0) - 9 residential (full block of houses)
        { pos: pos(1, 0, 0, 0), tile: 'house' },
        { pos: pos(1, 0, 0, 1), tile: 'house' },
        { pos: pos(1, 0, 0, 2), tile: 'house' },
        { pos: pos(1, 0, 1, 0), tile: 'house' },
        { pos: pos(1, 0, 1, 1), tile: 'house' },
        { pos: pos(1, 0, 1, 2), tile: 'house' },
        { pos: pos(1, 0, 2, 0), tile: 'house' },
        { pos: pos(1, 0, 2, 1), tile: 'house' },
        { pos: pos(1, 0, 2, 2), tile: 'house' }, // 9 houses in (1,0)
        // Total: 8 + 9 = 17 R, need 3 more. Use tier2_residential which count as 4 each
        // Replace 3 houses in (1,0) with tier2_residential
      ]);

      // Replace some houses with tier2_residential to get 20+ value
      // Actually, the count is just count, not value. Let me add 3 more houses elsewhere
      // Wait, I already have all 9 slots in (1,0) filled
      // Let me use block (1,1) which is NOT adjacent to (0,0)
      // Actually, I need to use a different placement position that has more adjacent blocks
      
      // Let me use block (1,1) which has 4 adjacent blocks: (0,1), (1,0), (1,2), (2,1)
      // Fill (0,1) and (1,0) with residential + schools
      
      // Actually simpler: just make sure one adjacent block is full of residential
      // Block (0,1): 8 houses + 1 school = 8 R
      // Block (1,0): 9 houses = 9 R
      // Total = 17, need 3 more
      // I can replace some with tier2_residential but the condition counts tiles not value
      
      // Let me just add to block (1,0) by replacing school requirement
      // Or I can place at (1,1) which has 4 adjacent blocks
      
      // Rewrite: place school at (1,1) which is center block, has 4 adjacent blocks
      store.grid[0][1][0] = null; // remove school from (0,1)
      store.setCell(pos(0, 1, 0, 0), 'house'); // replace with house
      
      // Add 3 more houses in (0,1) to fill all 9 slots
      // Already have 9 tiles there, let me just add school to (0,1)
      store.setCell(pos(0, 1, 1, 1), 'school'); // add school back somewhere else
      
      // Now (0,1) has 8 houses + 1 school = 8 R
      // (1,0) has 9 houses = 9 R
      // For block (0,0), adjacent = (0,1) and (1,0) = 8 + 9 = 17 R
      // Still not enough. Let's place at (1,1) instead
      
      // Clear and redo properly
      for (let sbr = 0; sbr < 3; sbr++) {
        for (let sbc = 0; sbc < 3; sbc++) {
          for (let i = 0; i < 9; i++) {
            store.grid[sbr][sbc][i] = null;
          }
        }
      }
      
      // Block (1,1) is center, adjacent to (0,1), (1,0), (1,2), (2,1) - 4 blocks
      // Fill them with houses + add yard/school to prevent slums
      prefill(store, [
        // Block (0,1) - school + 5 houses + yard to prevent slums
        { pos: pos(0, 1, 0, 0), tile: 'school' }, // school for highschool condition
        { pos: pos(0, 1, 0, 1), tile: 'house' },
        { pos: pos(0, 1, 0, 2), tile: 'house' },
        { pos: pos(0, 1, 1, 0), tile: 'house' },
        { pos: pos(0, 1, 1, 1), tile: 'house' },
        { pos: pos(0, 1, 1, 2), tile: 'house' },
        { pos: pos(0, 1, 2, 0), tile: 'yard' }, // prevent slums
        // Block (1,0) - 8 houses + yard to prevent slums
        { pos: pos(1, 0, 0, 0), tile: 'house' },
        { pos: pos(1, 0, 0, 1), tile: 'house' },
        { pos: pos(1, 0, 0, 2), tile: 'house' },
        { pos: pos(1, 0, 1, 0), tile: 'house' },
        { pos: pos(1, 0, 1, 1), tile: 'house' },
        { pos: pos(1, 0, 1, 2), tile: 'house' },
        { pos: pos(1, 0, 2, 0), tile: 'house' },
        { pos: pos(1, 0, 2, 1), tile: 'house' },
        { pos: pos(1, 0, 2, 2), tile: 'yard' }, // prevent slums (8 R here)
        // Block (1,2) - 6 houses + yard to prevent slums
        { pos: pos(1, 2, 0, 0), tile: 'house' },
        { pos: pos(1, 2, 0, 1), tile: 'house' },
        { pos: pos(1, 2, 0, 2), tile: 'house' },
        { pos: pos(1, 2, 1, 0), tile: 'house' },
        { pos: pos(1, 2, 1, 1), tile: 'house' },
        { pos: pos(1, 2, 1, 2), tile: 'house' },
        { pos: pos(1, 2, 2, 0), tile: 'yard' }, // prevent slums (6 R here)
        // Total: 5 + 8 + 6 = 19 R in adjacent blocks
        // Need 1 more house
        { pos: pos(0, 1, 2, 1), tile: 'house' }, // 6 houses in (0,1) now = 20 total
      ]);

      // Place school in center block (1,1)
      store.deck = ['E'];
      store.placeTile(pos(1, 1, 0, 0));

      expect(store.getCell(pos(1, 1, 0, 0))).toBe('highschool');
      expect(store.score).toBe(18);
    });

    it('should upgrade to University when 4+ Education in same block', () => {
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'school' },
        { pos: pos(0, 0, 0, 1), tile: 'school' },
        { pos: pos(0, 0, 0, 2), tile: 'school' },
      ]);

      store.deck = ['E'];
      store.placeTile(pos(0, 0, 1, 0));

      // All should become university
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('university');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('university');
      expect(store.getCell(pos(0, 0, 0, 2))).toBe('university');
      expect(store.getCell(pos(0, 0, 1, 0))).toBe('university');
    });
  });

  describe('Cascade Upgrades', () => {
    it('should cascade: placing L near slums should revert them, then check for tier2', () => {
      prefill(store, [
        // 3 slums + shop + school (just missing leisure for tier2)
        // Note: need at least 3 R for tier2, so 3 slums is enough
        { pos: pos(0, 0, 0, 0), tile: 'slums' },
        { pos: pos(0, 0, 0, 1), tile: 'slums' },
        { pos: pos(0, 0, 0, 2), tile: 'slums' },
        { pos: pos(0, 0, 1, 0), tile: 'shop' },
        { pos: pos(0, 0, 1, 1), tile: 'school' },
      ]);

      store.deck = ['L'];
      store.placeTile(pos(0, 0, 1, 2));

      // Slums should revert to house, then upgrade to tier2
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('tier2_residential');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('tier2_residential');
      expect(store.getCell(pos(0, 0, 0, 2))).toBe('tier2_residential');
    });

    it('should cascade: shopping center + adjacent leisure = cinema', () => {
      // Place 2 shops connected near road
      prefill(store, [
        { pos: pos(0, 0, 0, 0), tile: 'shop' },
        { pos: pos(0, 0, 0, 1), tile: 'shop' },
        { pos: pos(0, 0, 1, 1), tile: 'yard' }, // adjacent to where 3rd shop will go
      ]);

      // Place 3rd shop to trigger shopping center
      store.deck = ['C'];
      store.placeTile(pos(0, 0, 0, 2));

      // 3 shops should become shopping center
      expect(store.getCell(pos(0, 0, 0, 0))).toBe('shopping_center');
      expect(store.getCell(pos(0, 0, 0, 1))).toBe('shopping_center');
      expect(store.getCell(pos(0, 0, 0, 2))).toBe('shopping_center');
      
      // Yard adjacent to shopping center should become cinema
      expect(store.getCell(pos(0, 0, 1, 1))).toBe('cinema');
    });
  });
});
