import { observer } from 'mobx-react-lite';
import { useState, useCallback } from 'react';
import { usePopper } from 'react-popper';
import { gameStore } from './game/gameStore';
import type { Position, TileType } from './game/types';
import './index.css';


export const App = observer(() => {
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [menuMousePosition, setMenuMousePosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'right-start',
    modifiers: [
      { name: 'offset', options: { offset: [8, 8] } },
      { name: 'preventOverflow', options: { padding: 12 } },
      { name: 'flip', options: { fallbackPlacements: ['left-start', 'bottom-start'] } },
    ],
  });

  const handleTileContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, position: Position) => {
      event.preventDefault();
      gameStore.setSelectedPosition(position);
      setMenuMousePosition({
        x: event.clientX,
        y: event.clientY,
      });
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    gameStore.setSelectedPosition(null);
    setMenuMousePosition(null);
  }, []);

  const handleEvolve = useCallback((position: Position, nextType: TileType) => {
    gameStore.evolveTile(position, nextType);
  }, []);

  const selectedPosition = gameStore.selectedPosition;
  const selectedTile = selectedPosition ? gameStore.getTile(selectedPosition) : null;
  const nextStates = selectedPosition ? gameStore.getPossibleNextStates(selectedPosition) : [];

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100" onClick={closeContextMenu}>
      <div className="h-full w-full overflow-auto p-3">
        <div
          className="grid gap-[1px] bg-slate-800 p-[1px]"
          style={{
            gridTemplateColumns: `repeat(${gameStore.mapSize}, minmax(48px, 48px))`,
            width: 'max-content',
          }}
        >
          {gameStore.grid.map((row, y) =>
            row.map((tile, x) => (
              <div
                key={`${x}-${y}`}
                onContextMenu={(event) => handleTileContextMenu(event, { x, y })}
                className="select-none border border-slate-700 bg-slate-900 p-1 text-center text-[10px] leading-tight hover:bg-slate-700"
              >
                {tile.type}
              </div>
            )),
          )}
        </div>
      </div>

      {menuMousePosition ? (
        <div
          ref={setReferenceElement}
          style={{
            position: 'fixed',
            left: menuMousePosition.x,
            top: menuMousePosition.y,
            width: 0,
            height: 0,
          }}
        />
      ) : null}

      {selectedPosition && selectedTile ? (
        <div
          ref={setPopperElement}
          style={styles.popper}
          {...attributes.popper}
          onClick={(event) => event.stopPropagation()}
          className="z-20 max-w-sm rounded border border-slate-600 bg-slate-900 p-3 text-xs shadow-2xl"
        >
          <div className="mb-2 font-semibold">
            Tile ({selectedPosition.x}, {selectedPosition.y})
          </div>
          <div className="mb-1">
            Type: <span className="font-medium">{selectedTile.type}</span>
          </div>
          <div className="mb-2">
            Previous: <span className="font-medium">{selectedTile.previousType ?? 'none'}</span>
          </div>

          <div className="mb-1 font-semibold">Possible next states</div>
          {nextStates.length === 0 ? (
            <div>None</div>
          ) : (
            <div className="space-y-2">
              {nextStates.map((state) => (
                <div key={state.to} className="rounded border border-slate-700 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span>{state.to}</span>
                    <span className={state.prerequisite.passed ? 'text-emerald-300' : 'text-rose-300'}>
                      {state.prerequisite.passed ? 'passed' : 'failed'}
                    </span>
                  </div>
                  <div className="mb-2 whitespace-pre-wrap text-slate-300">
                    {state.prerequisite.explanation}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEvolve(selectedPosition, state.to)}
                    disabled={!state.prerequisite.passed}
                    className="rounded border border-slate-600 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Evolve to {state.to}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
});
