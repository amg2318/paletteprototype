import { useEffect, useRef, useState } from 'react';
import checkboxIcon from '../assets/checkbox.svg';
import plusIcon from '../assets/plus.svg';
import { drawThumbnail } from '../layerStore';
import { activeVariant, type Group, type Layer } from '../model';
import * as ops from '../ops';
import { useStore } from '../store';
import { Swipeable } from './Swipeable';

function LayerThumb({ layerId }: { layerId: string }) {
  const { pixelVersion } = useStore();
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => drawThumbnail(layerId, ref.current!), [layerId, pixelVersion]);
  return <canvas ref={ref} className="layer-thumb" width={100} height={94} />;
}

function VisibilityToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      className="visibility"
      aria-label={visible ? 'Hide' : 'Show'}
      aria-pressed={visible}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {visible ? <img src={checkboxIcon} width={16} height={16} alt="" /> : <span className="checkbox-empty" />}
    </button>
  );
}

interface SwipeProps {
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

const swipeState = (id: string, { openId, setOpenId }: SwipeProps) => ({
  open: openId === id,
  setOpen: (o: boolean) => setOpenId(o ? id : null),
});

/** A layer either at the top level (its own card) or inside a group card. */
function LayerRow({ layer, group, ...swipe }: { layer: Layer; group?: Group } & SwipeProps) {
  const { doc, commit, navigate } = useStore();
  const selected = group ? doc.activeLayerId === layer.id : doc.selectedIds.includes(layer.id);
  const actions = [
    ...(group ? [] : [{ label: 'Group', onSelect: () => commit((d) => ops.groupLayers(d, [layer.id])) }]),
    { label: 'Duplicate', onSelect: () => commit((d) => ops.duplicateLayer(d, layer.id)) },
    {
      label: 'Delete',
      disabled: ops.isLastInContainer(doc, layer.id),
      onSelect: () => commit((d) => ops.deleteLayer(d, layer.id)),
    },
  ];
  return (
    <Swipeable
      {...swipeState(layer.id, swipe)}
      className={`${group ? 'layer-in-group' : 'layer-card'} ${selected ? 'is-selected' : ''}`}
      actions={actions}
      onSwipeRight={group ? undefined : () => navigate((d) => ops.toggleSelected(d, layer.id))}
    >
      <div
        role="button"
        tabIndex={0}
        className={`layer-row ${layer.visible ? '' : 'is-hidden'}`}
        onClick={() => navigate((d) => ops.selectLayer(d, layer.id))}
      >
        <LayerThumb layerId={layer.id} />
        <span className="layer-name">{layer.name}</span>
        <VisibilityToggle visible={layer.visible} onToggle={() => commit((d) => ops.toggleLayerVisible(d, layer.id))} />
      </div>
    </Swipeable>
  );
}

function GroupCard({ group, ...swipe }: { group: Group } & SwipeProps) {
  const { commit, navigate } = useStore();
  const variant = activeVariant(group);
  const actions = group.isVariant
    ? [
        { label: 'New variant', onSelect: () => commit((d) => ops.branchVariant(d, group.id)) },
        { label: 'Duplicate', onSelect: () => commit((d) => ops.duplicateGroup(d, group.id)) },
        {
          label: group.variants.length > 1 ? 'Delete variant' : 'Delete',
          onSelect: () => commit((d) => ops.deleteVariant(d, group.id)),
        },
      ]
    : [
        { label: 'Make variant', onSelect: () => commit((d) => ops.makeVariant(d, group.id)) },
        { label: 'Duplicate', onSelect: () => commit((d) => ops.duplicateGroup(d, group.id)) },
        { label: 'Delete', onSelect: () => commit((d) => ops.deleteGroup(d, group.id)) },
      ];
  return (
    <section className={`group-card ${group.visible ? '' : 'is-hidden'}`}>
      <Swipeable {...swipeState(group.id, swipe)} actions={actions}>
        <div
          role="button"
          tabIndex={0}
          className="group-head"
          onClick={() => navigate((d) => ops.selectLayer(d, variant.layers[0]?.id ?? null))}
        >
          <span className="group-title">{group.isVariant ? `${group.name} - ${variant.name}` : group.name}</span>
          <VisibilityToggle visible={group.visible} onToggle={() => commit((d) => ops.toggleGroupVisible(d, group.id))} />
        </div>
      </Swipeable>
      {variant.layers.map((layer) => (
        <LayerRow key={layer.id} layer={layer} group={group} {...swipe} />
      ))}
      <div className="group-foot" />
    </section>
  );
}

export function LayersPanel() {
  const { doc, commit } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const swipe = { openId, setOpenId };
  return (
    <aside className="layers-panel">
      <div className="layers-head">
        <h2>Layers</h2>
        <button className="btn-plain" aria-label="New layer" onClick={() => commit(ops.addLayer)}>
          <img src={plusIcon} width={24} height={24} alt="" />
        </button>
      </div>
      <div className="layers-list">
        {doc.items.map((item) =>
          item.kind === 'group' ? (
            <GroupCard key={item.id} group={item} {...swipe} />
          ) : (
            <LayerRow key={item.id} layer={item} {...swipe} />
          ),
        )}
      </div>
      {doc.selectedIds.length > 1 && (
        <div className="layers-foot">
          <button className="btn btn-text" onClick={() => commit((d) => ops.groupLayers(d, d.selectedIds))}>
            Group layers
          </button>
        </div>
      )}
    </aside>
  );
}
