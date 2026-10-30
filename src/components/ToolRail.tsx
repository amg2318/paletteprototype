import eraserIcon from '../assets/eraser.png';
import markerIcon from '../assets/marker.png';
import penIcon from '../assets/pen.png';
import pencilIcon from '../assets/pencil.png';
import redoIcon from '../assets/redo.png';
import softIcon from '../assets/soft.png';
import sprayIcon from '../assets/spray.png';
import undoIcon from '../assets/undo.png';
import type { Tool } from '../model';
import { useStore } from '../store';

const TOOLS: { tool: Tool; label: string; icon: string }[] = [
  { tool: 'pen', label: 'Pen', icon: penIcon },
  { tool: 'pencil', label: 'Pencil', icon: pencilIcon },
  { tool: 'marker', label: 'Marker', icon: markerIcon },
  { tool: 'soft', label: 'Soft', icon: softIcon },
  { tool: 'spray', label: 'Spray', icon: sprayIcon },
  { tool: 'erase', label: 'Erase', icon: eraserIcon },
];

/** The icon art is used as a mask so it takes the button's text colour (e.g. cream when active). */
function ToolIcon({ src }: { src: string }) {
  const mask = `url(${src}) center / contain no-repeat`;
  return <span className="tool-icon" style={{ mask, WebkitMask: mask }} />;
}

export function ToolRail() {
  const { brush, setBrush, undo, redo, canUndo, canRedo } = useStore();
  return (
    <nav className="rail tool-rail">
      {TOOLS.map(({ tool, label, icon }) => (
        <button
          key={tool}
          className={`tool ${brush.tool === tool ? 'is-active' : ''}`}
          aria-pressed={brush.tool === tool}
          onClick={() => setBrush({ tool })}
        >
          <ToolIcon src={icon} />
          {label}
        </button>
      ))}
      <button className="tool" disabled={!canUndo} onClick={undo}>
        <ToolIcon src={undoIcon} />
        Undo
      </button>
      <button className="tool" disabled={!canRedo} onClick={redo}>
        <ToolIcon src={redoIcon} />
        Redo
      </button>
    </nav>
  );
}
