import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { gameStore } from './game/gameStore';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { TilePanel } from './components/TilePanel';
import './index.css';

const TILE_TYPE_SHORTCUTS: Record<string, any> = {
  '1': 'WATER',
  '2': 'BUILDING_HIGH',
  '3': 'ROAD_MAJOR',
  '4': 'PARK',
  '5': 'FOREST',
  '6': 'GROUND',
  '7': 'PAVED_LOT',
  '8': 'PATH',
  '9': 'WALL',
};

export const App = observer(() => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        gameStore.undo();
      }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        gameStore.redo();
      }
      if (TILE_TYPE_SHORTCUTS[e.key]) {
        gameStore.selectTile(TILE_TYPE_SHORTCUTS[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <Canvas />
        </div>
        <TilePanel />
      </div>
    </div>
  );
});
