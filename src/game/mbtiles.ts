import Database from 'better-sqlite3';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';

interface MBTilesTile {
  z: number;
  x: number;
  y: number;
  data: Buffer;
}

export class MBTilesReader {
  private db: Database.Database;

  constructor(filePath: string) {
    this.db = new Database(filePath);
  }

  getTile(z: number, x: number, y: number): VectorTile | null {
    try {
      const stmt = this.db.prepare(
        'SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?'
      );
      const row = stmt.get(z, x, y) as { tile_data: Buffer } | undefined;
      if (!row) return null;

      const pbf = new Pbf(row.tile_data);
      return new VectorTile(pbf);
    } catch (e) {
      console.error(`Failed to get tile ${z}/${x}/${y}:`, e);
      return null;
    }
  }

  getTilesInBbox(z: number, minX: number, minY: number, maxX: number, maxY: number): MBTilesTile[] {
    try {
      const stmt = this.db.prepare(
        `SELECT zoom_level, tile_column, tile_row, tile_data
         FROM tiles
         WHERE zoom_level = ?
         AND tile_column >= ? AND tile_column <= ?
         AND tile_row >= ? AND tile_row <= ?`
      );
      const rows = stmt.all(z, minX, maxX, minY, maxY) as Array<{
        zoom_level: number;
        tile_column: number;
        tile_row: number;
        tile_data: Buffer;
      }>;

      return rows.map(row => ({
        z: row.zoom_level,
        x: row.tile_column,
        y: row.tile_row,
        data: row.tile_data,
      }));
    } catch (e) {
      console.error('Failed to query tiles in bbox:', e);
      return [];
    }
  }

  close(): void {
    this.db.close();
  }

  getLayerNames(z: number, x: number, y: number): string[] {
    const tile = this.getTile(z, x, y);
    if (!tile) return [];
    return Object.keys(tile.layers);
  }
}
