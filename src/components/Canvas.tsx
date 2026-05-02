import { useEffect, useRef, useState } from 'react';
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

export const Canvas = observer(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<{ col: number; row: number } | null>(null);

  const map = gameStore.map;

  if (!map) {
    return <div className="w-full h-full flex items-center justify-center text-gray-500">Load a map to start</div>;
  }

  const TILE_SIZE = 40;
  const GRID_WIDTH = map.meta.cols * TILE_SIZE;
  const GRID_HEIGHT = map.meta.rows * TILE_SIZE;

  const draw = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = GRID_WIDTH + 20;
    canvas.height = GRID_HEIGHT + 20;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const offsetX = 10;
    const offsetY = 10;

    for (let row = 0; row < map.tiles.length; row++) {
      for (let col = 0; col < map.tiles[row].length; col++) {
        const tile = map.tiles[row][col];
        const x = offsetX + col * TILE_SIZE;
        const y = offsetY + row * TILE_SIZE;

        ctx.fillStyle = TILE_COLORS[tile.type];
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.strokeStyle = '#CCCCCC';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

        if (gameStore.selectedCol === col && gameStore.selectedRow === row) {
          ctx.strokeStyle = '#FF6B6B';
          ctx.lineWidth = 3;
          ctx.strokeRect(x - 1, y - 1, TILE_SIZE + 2, TILE_SIZE + 2);
        }

        if (hoveredTile && hoveredTile.col === col && hoveredTile.row === row) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    draw(ctx);
  }, [map, gameStore.selectedCol, gameStore.selectedRow, hoveredTile]);

  const getTileAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - 10;
    const y = clientY - rect.top - 10;

    if (x < 0 || y < 0) return null;

    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);

    if (row >= 0 && row < map.tiles.length && col >= 0 && col < map.tiles[0].length) {
      return { col, row };
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const tile = getTileAt(e.clientX, e.clientY);
    setHoveredTile(tile);

    if (isDragging && tile) {
      gameStore.paintTile(tile.col, tile.row);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const tile = getTileAt(e.clientX, e.clientY);
    if (tile) {
      if (e.button === 0) {
        setIsDragging(true);
        gameStore.selectCell(tile.col, tile.row);
        gameStore.paintTile(tile.col, tile.row);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setHoveredTile(null);
    setIsDragging(false);
  };

  return (
    <div
      ref={containerRef}
      className="flex justify-center items-center w-full h-full bg-gray-100 overflow-auto"
      style={{
        transform: `rotate(${gameStore.rotation}deg)`,
        transformOrigin: 'center',
        transition: 'transform 0.2s ease-out',
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        className="bg-white shadow-lg cursor-crosshair"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
});
