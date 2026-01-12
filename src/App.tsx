import { observer } from 'mobx-react-lite';
import { useState, useCallback } from 'react';
import { usePopper } from 'react-popper';
import { gameStore } from './game/gameStore';
import type { Position, TileType, BaseCategory } from './game/types';
import { tileDisplay, categoryToDefaultTile, tileToCategory } from './game/types';
import './index.css';

// Cell component
const Cell = observer(({
  superblockRow,
  superblockCol,
  cellRow,
  cellCol,
  onHover,
  onLeave,
}: {
  superblockRow: number;
  superblockCol: number;
  cellRow: number;
  cellCol: number;
  onHover: (pos: Position, element: HTMLElement) => void;
  onLeave: () => void;
}) => {
  const pos: Position = { superblockRow, superblockCol, cellRow, cellCol };
  const tile = gameStore.getCell(pos);
  const isEmpty = tile === null;

  const handleClick = () => {
    if (isEmpty) {
      gameStore.placeTile(pos);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEmpty) {
      onHover(pos, e.currentTarget);
    }
  };

  const handleMouseLeave = () => {
    onLeave();
  };

  const display = tile ? tileDisplay[tile] : null;
  const category = tile ? tileToCategory[tile] : null;

  return (
    <div
      className={`cell ${isEmpty ? 'empty' : 'filled'} category-${category || 'none'}`}
      style={{
        backgroundColor: display?.color || '#2a2a3a',
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {display && (
        <>
          <span className="cell-emoji">{display.emoji}</span>
          <span className="cell-label">{display.label}</span>
        </>
      )}
    </div>
  );
});

// Superblock component
const Superblock = observer(({
  sbRow,
  sbCol,
  onHover,
  onLeave,
}: {
  sbRow: number;
  sbCol: number;
  onHover: (pos: Position, element: HTMLElement) => void;
  onLeave: () => void;
}) => {
  return (
    <div className="superblock">
      <div className="superblock-grid">
        {Array.from({ length: 3 }, (_, cellRow) =>
          Array.from({ length: 3 }, (_, cellCol) => (
            <Cell
              key={`${cellRow}-${cellCol}`}
              superblockRow={sbRow}
              superblockCol={sbCol}
              cellRow={cellRow}
              cellCol={cellCol}
              onHover={onHover}
              onLeave={onLeave}
            />
          ))
        )}
      </div>
    </div>
  );
});

// Game grid component with tooltip handling
const GameGrid = observer(() => {
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const [hoveredPos, setHoveredPos] = useState<Position | null>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'right-start',
    modifiers: [
      { name: 'offset', options: { offset: [0, 10] } },
      { name: 'preventOverflow', options: { padding: 10 } },
    ],
  });

  const handleHover = useCallback((pos: Position, element: HTMLElement) => {
    setHoveredPos(pos);
    setReferenceElement(element);
    gameStore.setHoveredCell(pos);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredPos(null);
    setReferenceElement(null);
    gameStore.setHoveredCell(null);
  }, []);

  return (
    <div className="game-grid-wrapper">
      <div className="game-grid">
        {Array.from({ length: 3 }, (_, sbRow) =>
          Array.from({ length: 3 }, (_, sbCol) => (
            <Superblock
              key={`${sbRow}-${sbCol}`}
              sbRow={sbRow}
              sbCol={sbCol}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          ))
        )}
      </div>

      {hoveredPos && (
        <div
          ref={setPopperElement}
          style={styles.popper}
          {...attributes.popper}
          className="tooltip-popper"
        >
          <UpgradeTooltip pos={hoveredPos} />
        </div>
      )}
    </div>
  );
});

// Deck card component
const DeckCard = observer(({ category, index }: { category: BaseCategory; index: number }) => {
  const defaultTile = categoryToDefaultTile[category];
  const display = tileDisplay[defaultTile];

  return (
    <div className={`deck-card ${index === 0 ? 'current' : ''}`}>
      <div
        className="deck-card-inner"
        style={{ backgroundColor: display.color }}
      >
        <span className="deck-emoji">{display.emoji}</span>
        <span className="deck-label">{display.label}</span>
      </div>
      {index === 0 && <div className="current-indicator">▶ NEXT</div>}
    </div>
  );
});

// Deck component
const Deck = observer(() => {
  return (
    <div className="deck">
      <h3 className="deck-title">Upcoming Tiles</h3>
      <div className="deck-cards">
        {gameStore.deck.map((category, index) => (
          <DeckCard key={index} category={category} index={index} />
        ))}
      </div>
    </div>
  );
});

// Upgrade tooltip content (used by Popper)
const UpgradeTooltip = observer(({ pos }: { pos: Position }) => {
  const tile = gameStore.getCell(pos);
  if (!tile) return null;

  const upgrades = gameStore.getUpgradeInfo(pos);
  if (!upgrades) return null;

  const upgradeEntries = Object.entries(upgrades).filter(
    ([, result]) => result.verdict === 'can_upgrade'
  );

  if (upgradeEntries.length === 0) {
    return (
      <div className="upgrade-tooltip">
        <div className="upgrade-header">
          <span className="current-tile">{tileDisplay[tile].emoji} {tileDisplay[tile].label}</span>
        </div>
        <p className="no-upgrades">No possible upgrades</p>
      </div>
    );
  }

  return (
    <div className="upgrade-tooltip">
      <div className="upgrade-header">
        <span className="current-tile">{tileDisplay[tile].emoji} {tileDisplay[tile].label}</span>
      </div>
      <div className="upgrade-list">
        {upgradeEntries.map(([name, result]) => {
          if (result.verdict !== 'can_upgrade') return null;
          const display = tileDisplay[name as TileType];
          const allMet = result.conditions.every(c => c.met);

          return (
            <div key={name} className={`upgrade-item ${allMet ? 'ready' : 'not-ready'}`}>
              <div className="upgrade-name">
                {allMet ? '✅' : '🔒'} {display?.emoji || '?'} → {display?.label || name}
              </div>
              <div className="upgrade-conditions">
                {result.conditions.map((cond, i) => (
                  <div key={i} className={`condition ${cond.met ? 'met' : 'unmet'}`}>
                    {cond.met ? '✓' : '✗'} {cond.desc}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// Score display
const ScoreDisplay = observer(() => {
  return (
    <div className="score-display">
      <div className="score-value">{gameStore.score}</div>
      <div className="score-label">SCORE</div>
    </div>
  );
});

// Game over overlay
const GameOver = observer(() => {
  if (!gameStore.isGameOver) return null;

  return (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h2>🏙️ City Complete!</h2>
        <div className="final-score">Final Score: {gameStore.score}</div>
        <button onClick={() => gameStore.init()}>Play Again</button>
      </div>
    </div>
  );
});

// Main App
export const App = observer(() => {
  return (
    <div className="app">
      <header className="header">
        <h1>🏙️ Barcelona</h1>
        <p className="subtitle">City Builder Puzzle</p>
      </header>

      <ScoreDisplay />

      <div className="game-container">
        <div className="board-section">
          <GameGrid />
        </div>

        <div className="sidebar">
          <Deck />
        </div>
      </div>

      <div className="turn-info">
        Turn: {gameStore.turn} | Cells: {gameStore.cellsFilled}/81
      </div>

      <GameOver />
    </div>
  );
});
