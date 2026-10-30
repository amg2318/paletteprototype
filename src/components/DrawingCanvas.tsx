import { useEffect, useRef, type PointerEvent } from 'react';
import { brushes, sizeToWidth, type Pt, type StrokeState } from '../brushes';
import { compositeDoc, createCanvas, ctx2d, DOC_H, DOC_W, getLayerCanvas } from '../layerStore';
import { findActiveLayer } from '../model';
import { useStore } from '../store';

interface Stroke {
  pointerId: number;
  layerId: string;
  state: StrokeState;
}

/**
 * Strokes are painted at full strength into a buffer, then merged onto a copy
 * of the layer taken at pen-down, so overlapping segments don't build up
 * opacity within a single stroke.
 */
export function DrawingCanvas() {
  const { doc, brush, pixelVersion, recordStroke } = useStore();
  const view = useRef<HTMLCanvasElement>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const scratch = useRef<{ before: HTMLCanvasElement; buffer: HTMLCanvasElement }>();
  const stroke = useRef<Stroke | null>(null);
  const frame = useRef(0);
  const penSeen = useRef(false);

  const render = () => compositeDoc(docRef.current, ctx2d(view.current!));

  useEffect(render, [doc, pixelVersion]);

  const buffers = () => (scratch.current ??= { before: createCanvas(), buffer: createCanvas() });

  const merge = () => {
    const s = stroke.current;
    if (!s) return;
    const { before, buffer } = buffers();
    const ctx = ctx2d(getLayerCanvas(s.layerId));
    ctx.clearRect(0, 0, DOC_W, DOC_H);
    ctx.drawImage(before, 0, 0);
    ctx.globalAlpha = brush.opacity * brushes[brush.tool].alpha;
    ctx.globalCompositeOperation = brush.tool === 'erase' ? 'destination-out' : 'source-over';
    ctx.drawImage(buffer, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    render();
  };

  const scheduleMerge = () => {
    if (!frame.current) {
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        merge();
      });
    }
  };

  const toPoint = (e: PointerEvent | globalThis.PointerEvent): Pt => {
    const r = view.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * DOC_W,
      y: ((e.clientY - r.top) / r.height) * DOC_H,
      p: e.pointerType === 'pen' ? e.pressure || 0.5 : 0.7,
    };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'pen') penSeen.current = true;
    // Palm rejection: once a stylus is in use, fingers don't paint.
    if (e.pointerType === 'touch' && penSeen.current) return;
    if (stroke.current) return;
    const target = findActiveLayer(docRef.current);
    if (!target || !target.layer.visible || target.group?.visible === false) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    const { before, buffer } = buffers();
    const beforeCtx = ctx2d(before);
    beforeCtx.clearRect(0, 0, DOC_W, DOC_H);
    beforeCtx.drawImage(getLayerCanvas(target.layer.id), 0, 0);
    const bufCtx = ctx2d(buffer);
    bufCtx.clearRect(0, 0, DOC_W, DOC_H);

    const state: StrokeState = { ctx: bufCtx, color: brush.color, width: sizeToWidth(brush.size), last: null, carry: 0 };
    stroke.current = { pointerId: e.pointerId, layerId: target.layer.id, state };
    const pt = toPoint(e);
    brushes[brush.tool].begin(state, pt);
    state.last = pt;
    scheduleMerge();
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = stroke.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events.length ? events : [e.nativeEvent]) brushes[brush.tool].move(s.state, toPoint(ev));
    scheduleMerge();
  };

  const onPointerEnd = (e: PointerEvent<HTMLCanvasElement>) => {
    const s = stroke.current;
    if (!s || s.pointerId !== e.pointerId) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    merge();
    stroke.current = null;
    recordStroke(s.layerId, ctx2d(buffers().before).getImageData(0, 0, DOC_W, DOC_H));
  };

  return (
    <canvas
      ref={view}
      className="drawing-canvas"
      width={DOC_W}
      height={DOC_H}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    />
  );
}
