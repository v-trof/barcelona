// Base tile categories that player can place
export type BaseCategory = 'R' | 'L' | 'C' | 'E';

// All possible tile states
export type TileType =
  // Residential
  | 'house' // default R
  | 'slums'
  | 'hotel'
  | 'villa'
  | 'tier2_residential'
  | 'highrise'
  // Leisure
  | 'yard' // default L
  | 'sports'
  | 'plaza'
  | 'park'
  | 'playground'
  | 'cinema'
  // Commercial
  | 'shop' // default C
  | 'shopping_center'
  | 'restaurant'
  | 'bank'
  // Education
  | 'school' // default E
  | 'highschool'
  | 'university';

// Map tile type to its base category
export const tileToCategory: Record<TileType, BaseCategory> = {
  // Residential
  house: 'R',
  slums: 'R',
  hotel: 'R',
  villa: 'R',
  tier2_residential: 'R',
  highrise: 'R',
  // Leisure
  yard: 'L',
  sports: 'L',
  plaza: 'L',
  park: 'L',
  playground: 'L',
  cinema: 'L',
  // Commercial
  shop: 'C',
  shopping_center: 'C',
  restaurant: 'C',
  bank: 'C',
  // Education
  school: 'E',
  highschool: 'E',
  university: 'E',
};

// Default tile for each category when placed
export const categoryToDefaultTile: Record<BaseCategory, TileType> = {
  R: 'house',
  L: 'yard',
  C: 'shop',
  E: 'school',
};

// Visual display info for tiles
export const tileDisplay: Record<TileType, { label: string; color: string; emoji: string }> = {
  // Residential - blue shades
  house: { label: 'House', color: '#4a90d9', emoji: '🏠' },
  slums: { label: 'Slums', color: '#6b7280', emoji: '🏚️' },
  hotel: { label: 'Hotel', color: '#9333ea', emoji: '🏨' },
  villa: { label: 'Villa', color: '#22d3ee', emoji: '🏡' },
  tier2_residential: { label: 'Tier-2 Res', color: '#3b82f6', emoji: '🏢' },
  highrise: { label: 'Highrise', color: '#1e40af', emoji: '🏙️' },
  // Leisure - green shades
  yard: { label: 'Yard', color: '#22c55e', emoji: '🌿' },
  sports: { label: 'Sports', color: '#f97316', emoji: '⚽' },
  plaza: { label: 'Plaza', color: '#a3e635', emoji: '🎪' },
  park: { label: 'Park', color: '#15803d', emoji: '🌳' },
  playground: { label: 'Playground', color: '#84cc16', emoji: '🎠' },
  cinema: { label: 'Cinema', color: '#dc2626', emoji: '🎬' },
  // Commercial - yellow/orange shades
  shop: { label: 'Shop', color: '#eab308', emoji: '🏪' },
  shopping_center: { label: 'Mall', color: '#f59e0b', emoji: '🛒' },
  restaurant: { label: 'Restaurant', color: '#ef4444', emoji: '🍽️' },
  bank: { label: 'Bank', color: '#fbbf24', emoji: '🏦' },
  // Education - purple
  school: { label: 'School', color: '#a855f7', emoji: '🏫' },
  highschool: { label: 'High School', color: '#7c3aed', emoji: '🎓' },
  university: { label: 'University', color: '#5b21b6', emoji: '🏛️' },
};

// Score points for upgrades
export const upgradeScores: Partial<Record<TileType, number>> = {
  slums: -6,
  hotel: 14,
  villa: 18,
  tier2_residential: 12,
  highrise: 40,
  sports: 8,
  plaza: 14,
  park: 24,
  shopping_center: 16,
  restaurant: 20,
  bank: 30,
  playground: 4,
  cinema: 10,
  highschool: 18,
  university: 35,
};

// Condition result for upgrade checks
export type ConditionResult = {
  met: boolean;
  desc: string;
};

export type UpgradeResult =
  | { verdict: 'cannot_upgrade' }
  | { verdict: 'can_upgrade'; conditions: ConditionResult[] };

// Position in the grid
export type Position = {
  superblockRow: number; // 0-2
  superblockCol: number; // 0-2
  cellRow: number; // 0-2
  cellCol: number; // 0-2
};

// Cell state
export type Cell = {
  position: Position;
  tile: TileType | null;
};
