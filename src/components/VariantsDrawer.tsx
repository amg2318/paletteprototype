import { useRef, useState } from 'react';
import plusIcon from '../assets/plus.svg';
import { usePointerDrag } from '../hooks/usePointerDrag';
import { groups, type Group } from '../model';
import * as ops from '../ops';
import { useStore } from '../store';

/** Tap or drag across the ticks to swap the group's live variant on the canvas. */
function VariantTrack({ group }: { group: Group }) {
  const { commit, navigate } = useStore();
  const ticks = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const activeIndex = group.variants.findIndex((v) => v.id === group.activeVariantId);

  const drag = usePointerDrag(
    (e) => {
      setScrubbing(true);
      let best = 0;
      let bestDist = Infinity;
      Array.from(ticks.current!.children).forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const dist = Math.abs(e.clientX - (r.left + r.width / 2));
        if (dist < bestDist) [best, bestDist] = [i, dist];
      });
      navigate((d) => ops.switchVariant(d, group.id, group.variants[best].id));
    },
    () => setScrubbing(false),
  );

  return (
    <div className="variant-row">
      <span className="variant-label">{group.name}</span>
      <div className={`variant-track ${scrubbing ? 'is-scrubbing' : ''}`} {...drag}>
        <div className="variant-ticks" ref={ticks}>
          {group.variants.map((v, i) => (
            <div key={v.id} className={`variant-tick ${i === activeIndex ? 'is-active' : ''}`} title={v.name}>
              {i === activeIndex && scrubbing && (
                <span className="variant-bubble">
                  {v.name} · {i + 1}/{group.variants.length}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <button
        className="btn btn-icon"
        aria-label={`New variant of ${group.name}`}
        onClick={() => commit((d) => ops.branchVariant(d, group.id))}
      >
        <img src={plusIcon} width={24} height={24} alt="" />
      </button>
    </div>
  );
}

export function VariantsDrawer() {
  const { doc } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const startY = useRef(0);
  const variantGroups = groups(doc).filter((g) => g.isVariant);

  return (
    <section className={`drawer ${collapsed ? 'is-collapsed' : ''}`}>
      <button
        className="drawer-handle"
        aria-label={collapsed ? 'Expand variants' : 'Collapse variants'}
        onPointerDown={(e) => (startY.current = e.clientY)}
        onPointerUp={(e) => {
          const dy = e.clientY - startY.current;
          if (dy > 20) setCollapsed(true);
          else if (dy < -20) setCollapsed(false);
          else setCollapsed((c) => !c);
        }}
      >
        <span />
      </button>
      <h2 className="drawer-title">Variants</h2>
      {!collapsed &&
        (variantGroups.length ? (
          <div className="variant-rows">
            {variantGroups.map((g) => (
              <VariantTrack key={g.id} group={g} />
            ))}
          </div>
        ) : (
          <p className="drawer-empty">No variants yet</p>
        ))}
    </section>
  );
}
