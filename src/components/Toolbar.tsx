import { observer } from 'mobx-react-lite';
import { gameStore } from '../game/gameStore';
import { BattleMap } from '../game/types';
import sampleMapRaw from '../game/sample.json';

export const Toolbar = observer(() => {
  const handleLoadSample = () => {
    const sampleMap = sampleMapRaw as BattleMap;
    gameStore.loadMap(sampleMap);
  };

  const handleSaveJSON = () => {
    const json = gameStore.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'battlemap.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          gameStore.importJSON(event.target.result);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'battlemap.png';
    link.click();
  };

  const handleUndo = () => {
    gameStore.undo();
  };

  const handleRedo = () => {
    gameStore.redo();
  };

  return (
    <div className="bg-gray-800 text-white p-4 flex items-center gap-2 flex-wrap">
      <button
        onClick={handleLoadSample}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium text-sm"
      >
        Load Sample
      </button>

      <button
        onClick={handleLoadJSON}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium text-sm"
      >
        Load JSON
      </button>

      <button
        onClick={handleSaveJSON}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-medium text-sm"
      >
        Save JSON
      </button>

      <button
        onClick={handleExportPNG}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-medium text-sm"
      >
        Export PNG
      </button>

      <div className="flex-1" />

      <button
        onClick={handleUndo}
        disabled={!gameStore.canUndo()}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 rounded font-medium text-sm"
        title="Ctrl+Z"
      >
        Undo
      </button>

      <button
        onClick={handleRedo}
        disabled={!gameStore.canRedo()}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 rounded font-medium text-sm"
        title="Ctrl+Y"
      >
        Redo
      </button>
    </div>
  );
});
