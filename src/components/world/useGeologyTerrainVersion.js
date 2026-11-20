import { useEffect, useRef, useState } from 'react';
import { useWorldStore } from '../../systems/world/worldStore';
import { boundsIntersect, geologyBounds, unionBounds } from '../../systems/geology/geologyDefinition';

export function useGeologyTerrainVersion({minX, maxX, minZ, maxZ}) {
  const [version, setVersion] = useState(0);
  const previous = useRef(null);
  useEffect(() => {
    previous.current = useWorldStore.getState().world.geology?.features;
    const update = event => {
      const next = useWorldStore.getState().world.geology?.features;
      if (previous.current === next) return;
      let changed = event.detail?.bounds;
      if (!changed) for (const id of new Set([...Object.keys(previous.current ?? {}), ...Object.keys(next ?? {})])) {
        if (previous.current?.[id] === next?.[id]) continue;
        if (previous.current?.[id]) changed = unionBounds(changed, geologyBounds(previous.current[id]));
        if (next?.[id]) changed = unionBounds(changed, geologyBounds(next[id]));
      }
      previous.current = next;
      if (changed && boundsIntersect(changed, {minX, maxX, minZ, maxZ})) setVersion(value => value + 1);
    };
    window.addEventListener('geology-terrain-changed', update);
    window.addEventListener('tg-world-replaced', update);
    return () => { window.removeEventListener('geology-terrain-changed', update); window.removeEventListener('tg-world-replaced', update); };
  }, [minX, maxX, minZ, maxZ]);
  return version;
}
