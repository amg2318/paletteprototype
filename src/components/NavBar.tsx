import arrowLeft from '../assets/arrow-left.svg';
import layersIcon from '../assets/layers.svg';
import { exportPng } from '../layerStore';
import { useStore } from '../store';

interface Props {
  layersOpen: boolean;
  onToggleLayers: () => void;
}

export function NavBar({ layersOpen, onToggleLayers }: Props) {
  const { doc } = useStore();
  return (
    <header className="nav">
      <button className="btn btn-back">
        <img src={arrowLeft} width={24} height={24} alt="" />
        Projects
      </button>
      <span className="nav-title">Project name</span>
      <div className="nav-spacer" />
      <button className="btn btn-text" onClick={() => exportPng(doc)}>
        Export PNG
      </button>
      <button className="btn btn-text">Settings</button>
      <button
        className={`btn btn-icon ${layersOpen ? 'is-on' : ''}`}
        aria-pressed={layersOpen}
        aria-label="Toggle layers"
        onClick={onToggleLayers}
      >
        <img src={layersIcon} width={24} height={24} alt="" />
      </button>
    </header>
  );
}
