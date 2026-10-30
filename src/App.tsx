import { useState } from 'react';
import { BrushSettings } from './components/BrushSettings';
import { DrawingCanvas } from './components/DrawingCanvas';
import { LayersPanel } from './components/LayersPanel';
import { NavBar } from './components/NavBar';
import { ToolRail } from './components/ToolRail';
import { VariantsDrawer } from './components/VariantsDrawer';
import { StoreProvider } from './store';

export default function App() {
  const [layersOpen, setLayersOpen] = useState(true);
  return (
    <StoreProvider>
      <div className="app">
        <NavBar layersOpen={layersOpen} onToggleLayers={() => setLayersOpen((o) => !o)} />
        <div className="workspace">
          <div className="tools">
            <ToolRail />
            <BrushSettings />
          </div>
          <main className="stage">
            <div className="canvas-area">
              <DrawingCanvas />
            </div>
            <VariantsDrawer />
          </main>
          {layersOpen && <LayersPanel />}
        </div>
      </div>
    </StoreProvider>
  );
}
