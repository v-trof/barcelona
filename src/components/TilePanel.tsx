import { observer } from 'mobx-react-lite';
import { gameStore } from '../game/gameStore';
import { TileType } from '../game/types';

const TILE_COLORS: Record<TileType, string> = {
  WATER: '#4A90E2',
  BUILDING_HIGH: '#2C3E50',
  BUILDING_MID: '#7F8C8D',
  BUILDING_LOW: '#BDC3C7',
  ROAD_MAJOR: '#F39C12',
  ROAD_MINOR: '#D4A574',
  PATH: '#F5DEB3',
  BRIDGE: '#95A5A6',
  PARK: '#27AE60',
  FOREST: '#1E5631',
  FARMLAND: '#A4C639',
  ROUGH: '#8B6F47',
  PAVED_LOT: '#708090',
  WALL: '#34495E',
  GROUND: '#F5F5F0',
};

const TILE_TYPES: TileType[] = [
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

export const TilePanel = observer(() => {
  const map = gameStore.map;
  const selectedTile = map && gameStore.selectedRow >= 0 && gameStore.selectedCol >= 0
    ? map.tiles[gameStore.selectedRow]?.[gameStore.selectedCol]
    : null;

  return (
    <div className="w-80 bg-white shadow-lg flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-lg font-bold mb-4">Tile Types</h2>

        <div className="space-y-2 mb-6">
          {TILE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => gameStore.selectTile(type)}
              className={`w-full flex items-center gap-3 p-3 rounded border-2 text-left transition ${
                gameStore.selectedTile === type
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className="w-6 h-6 rounded border border-gray-400 flex-shrink-0"
                style={{ backgroundColor: TILE_COLORS[type] }}
              />
              <span className="text-sm font-medium">{type}</span>
            </button>
          ))}
        </div>

        {selectedTile && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Selected Tile</h3>
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-sm mb-2">
                <strong>Type:</strong> {selectedTile.type}
              </p>
              {Object.keys(selectedTile.meta).length > 0 && (
                <div className="text-sm">
                  <strong>Metadata:</strong>
                  <ul className="ml-4 mt-1 space-y-1">
                    {Object.entries(selectedTile.meta).map(([key, value]) => (
                      <li key={key}>
                        {key}: {String(value)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <h3 className="font-semibold mb-3">Rotation</h3>
        <input
          type="range"
          min="0"
          max="360"
          value={gameStore.rotation}
          onChange={e => gameStore.setRotation(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-sm text-gray-600 mt-1">
          {gameStore.rotation}°
        </div>
      </div>
    </div>
  );
});
