import { makeAutoObservable } from 'mobx';
import { BattleMap, TileType } from './types';

export class GameStore {
  map: BattleMap | null = null;
  selectedTile: TileType = 'GROUND';
  selectedCol: number = -1;
  selectedRow: number = -1;
  rotation: number = 0;
  history: (BattleMap | null)[] = [];
  historyIndex: number = -1;

  constructor() {
    makeAutoObservable(this);
  }

  loadMap(map: BattleMap): void {
    const mapCopy = JSON.parse(JSON.stringify(map)) as BattleMap;
    this.map = mapCopy;
    this.history = [mapCopy];
    this.historyIndex = 0;
    this.rotation = map.meta.rotation || 0;
  }

  selectTile(tileType: TileType): void {
    this.selectedTile = tileType;
  }

  paintTile(col: number, row: number): void {
    if (!this.map || row >= this.map.tiles.length || col >= this.map.tiles[0].length) return;

    const originalTile = { ...this.map.tiles[row][col] };
    this.map.tiles[row][col] = {
      type: this.selectedTile,
      meta: originalTile.meta,
    };

    this.addToHistory();
  }

  selectCell(col: number, row: number): void {
    this.selectedCol = col;
    this.selectedRow = row;
  }

  setRotation(angle: number): void {
    this.rotation = angle % 360;
    if (this.map) {
      this.map.meta.rotation = this.rotation;
    }
  }

  private addToHistory(): void {
    if (!this.map) return;

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(JSON.parse(JSON.stringify(this.map)));

    if (this.history.length > 50) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.map = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.map = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
    }
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  exportJSON(): string {
    if (!this.map) return '';
    return JSON.stringify(this.map, null, 2);
  }

  importJSON(jsonStr: string): void {
    try {
      const map = JSON.parse(jsonStr) as BattleMap;
      this.loadMap(map);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
    }
  }
}

export const gameStore = new GameStore();
