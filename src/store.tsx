import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { readPixels, writePixels } from './layerStore';
import { seedDoc, type Doc, type Tool } from './model';

export interface BrushSettings {
  tool: Tool;
  color: string;
  size: number; // 0–1
  opacity: number; // 0–1
}

/** Document metadata plus the pixels of any layers the change touched, captured before it. */
interface HistoryEntry {
  doc: Doc;
  pixels: [string, ImageData][];
}

const HISTORY_LIMIT = 30;

interface Store {
  doc: Doc;
  brush: BrushSettings;
  setBrush: (patch: Partial<BrushSettings>) => void;
  /** Bumped whenever layer pixels change outside of `doc`, so thumbnails redraw. */
  pixelVersion: number;
  /** An undoable change. `paint` runs after the touched layers are snapshotted. */
  commit: (update: (doc: Doc) => Doc, opts?: { touched?: string[]; paint?: () => void }) => void;
  /** A change that isn't recorded in history (selection, switching variants). */
  navigate: (update: (doc: Doc) => Doc) => void;
  recordStroke: (layerId: string, before: ImageData) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [doc, setDocState] = useState(seedDoc);
  const docRef = useRef(doc);
  const setDoc = useCallback((d: Doc) => {
    docRef.current = d;
    setDocState(d);
  }, []);

  const [brush, setBrushState] = useState<BrushSettings>({ tool: 'pen', color: '#1D1B19', size: 0.3, opacity: 0.9 });
  const setBrush = useCallback((patch: Partial<BrushSettings>) => setBrushState((b) => ({ ...b, ...patch })), []);

  const [pixelVersion, setPixelVersion] = useState(0);
  const bumpPixels = useCallback(() => setPixelVersion((v) => v + 1), []);

  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });
  const syncHistory = () => setHistorySize({ undo: undoStack.current.length, redo: redoStack.current.length });

  const push = useCallback((entry: HistoryEntry) => {
    undoStack.current.push(entry);
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
    redoStack.current = [];
    syncHistory();
  }, []);

  const commit = useCallback<Store['commit']>(
    (update, { touched = [], paint } = {}) => {
      const prev = docRef.current;
      const pixels = touched.map((id): [string, ImageData] => [id, readPixels(id)]);
      const next = update(prev);
      paint?.();
      if (next === prev && !paint) return;
      push({ doc: prev, pixels });
      setDoc(next);
      if (paint) bumpPixels();
    },
    [push, setDoc, bumpPixels],
  );

  const navigate = useCallback((update: (doc: Doc) => Doc) => setDoc(update(docRef.current)), [setDoc]);

  const recordStroke = useCallback(
    (layerId: string, before: ImageData) => {
      push({ doc: docRef.current, pixels: [[layerId, before]] });
      bumpPixels();
    },
    [push, bumpPixels],
  );

  const step = useCallback(
    (from: MutableRefObject<HistoryEntry[]>, to: MutableRefObject<HistoryEntry[]>) => {
      const entry = from.current.pop();
      if (!entry) return;
      to.current.push({ doc: docRef.current, pixels: entry.pixels.map(([id]) => [id, readPixels(id)]) });
      for (const [id, data] of entry.pixels) writePixels(id, data);
      setDoc(entry.doc);
      bumpPixels();
      syncHistory();
    },
    [setDoc, bumpPixels],
  );
  const undo = useCallback(() => step(undoStack, redoStack), [step]);
  const redo = useCallback(() => step(redoStack, undoStack), [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const value = useMemo<Store>(
    () => ({
      doc,
      brush,
      setBrush,
      pixelVersion,
      commit,
      navigate,
      recordStroke,
      undo,
      redo,
      canUndo: historySize.undo > 0,
      canRedo: historySize.redo > 0,
    }),
    [doc, brush, setBrush, pixelVersion, commit, navigate, recordStroke, undo, redo, historySize],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
