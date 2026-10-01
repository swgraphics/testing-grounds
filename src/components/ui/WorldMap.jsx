import { useEffect, useMemo, useRef, useState } from "react";
import { getTerrainHeightAt } from "../../systems/terrain/terrainHeight";
import { useWorldStore } from "../../systems/world/worldStore";

const SIZE = 300;
const CONTOUR_STEP = 5;
const MAP_MIN_BASE = -2;
const MAP_MAX_BASE = 3;
const MAP_STEP = 148;



function getTerrainMapBounds(chunks) {
  let minX = -250;
  let maxX = 250;
  let minZ = -250;
  let maxZ = 250;

  Object.values(chunks ?? {}).forEach((chunk) => {
    const x = Number(chunk?.position?.[0]);
    const z = Number(chunk?.position?.[2]);
    if (![x, z].every(Number.isFinite)) return;
    minX = Math.min(minX, x - 50);
    maxX = Math.max(maxX, x + 50);
    minZ = Math.min(minZ, z - 50);
    maxZ = Math.max(maxZ, z + 50);
  });

  return { minX, maxX, minZ, maxZ };
}

function getMapBounds(chunks) {
  let minX = MAP_MIN_BASE;
  let maxX = MAP_MAX_BASE;
  let minY = MAP_MIN_BASE;
  let maxY = MAP_MAX_BASE;
  Object.values(chunks ?? {}).forEach((chunk) => {
    if (!Array.isArray(chunk.mapPosition)) return;
    const x = Number(chunk.mapPosition[0]);
    const y = Number(chunk.mapPosition[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x - 1);
    maxX = Math.max(maxX, x + 1);
    minY = Math.min(minY, y - 1);
    maxY = Math.max(maxY, y + 1);
  });
  return { minX, maxX, minY, maxY };
}

function buildMapSlots(chunks, bounds) {
  const byPosition = new Map();
  Object.values(chunks ?? {}).forEach((chunk) => {
    if (!Array.isArray(chunk.mapPosition)) return;
    const x = Number(chunk.mapPosition[0]);
    const y = Number(chunk.mapPosition[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    byPosition.set(`${x},${y}`, chunk);
  });

  const cells = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const chunk = byPosition.get(`${x},${y}`) ?? null;
      cells.push({ x, y, chunk });
    }
  }
  return cells;
}

export default function WorldMap({ onAddChunk, onSelectChunk }) {
  const canvasRef = useRef(null);
  const baseMapRef = useRef(null);
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const edgePanFrameRef = useRef(null);
  const lastPointerRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const chunks = useWorldStore((state) => state.world.chunks);
  const currentChunkId = useWorldStore((state) => state.world.currentChunkId);
  const world = useWorldStore((state) => state.world);
  const currentChunk = world.chunks?.[currentChunkId];
  const mapBounds = useMemo(() => getMapBounds(chunks), [chunks]);
  const terrainMapBounds = useMemo(() => getTerrainMapBounds(chunks), [chunks]);
  const cells = useMemo(() => buildMapSlots(chunks, mapBounds), [chunks, mapBounds]);
  const mapColumns = mapBounds.maxX - mapBounds.minX + 1;
  const mapRows = mapBounds.maxY - mapBounds.minY + 1;
  const mapWidth = mapColumns * MAP_STEP;
  const mapHeight = mapRows * MAP_STEP;
  const occupiedCount = cells.filter((cell) => cell.chunk).length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const heights = new Float32Array(SIZE * SIZE);
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    for (let py = 0; py < SIZE; py += 1) {
      for (let px = 0; px < SIZE; px += 1) {
        const x = terrainMapBounds.minX + (px / (SIZE - 1)) * (terrainMapBounds.maxX - terrainMapBounds.minX);
        const z = terrainMapBounds.minZ + (py / (SIZE - 1)) * (terrainMapBounds.maxZ - terrainMapBounds.minZ);
        const h = getTerrainHeightAt(x, z);
        heights[py * SIZE + px] = h;
        minHeight = Math.min(minHeight, h);
        maxHeight = Math.max(maxHeight, h);
      }
    }

    const image = ctx.createImageData(SIZE, SIZE);
    const range = Math.max(1, maxHeight - minHeight);
    for (let py = 0; py < SIZE; py += 1) {
      for (let px = 0; px < SIZE; px += 1) {
        const h = heights[py * SIZE + px];
        const normalized = (h - minHeight) / range;
        const shade = Math.round(22 + normalized * 115);
        const index = (py * SIZE + px) * 4;
        image.data[index] = shade;
        image.data[index + 1] = shade + 4;
        image.data[index + 2] = shade + 8;
        image.data[index + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    ctx.lineWidth = 1.15;
    for (
      let level = Math.ceil(minHeight / CONTOUR_STEP) * CONTOUR_STEP;
      level <= maxHeight;
      level += CONTOUR_STEP
    ) {
      ctx.beginPath();
      for (let py = 1; py < SIZE; py += 1) {
        for (let px = 1; px < SIZE; px += 1) {
          const a = heights[(py - 1) * SIZE + (px - 1)];
          const b = heights[(py - 1) * SIZE + px];
          const c = heights[py * SIZE + px];
          const d = heights[py * SIZE + (px - 1)];
          const highA = a >= level;
          const highB = b >= level;
          const highC = c >= level;
          const highD = d >= level;
          const points = [];
          if (highA !== highB) points.push([px - 0.5, py - 1]);
          if (highB !== highC) points.push([px, py - 0.5]);
          if (highC !== highD) points.push([px - 0.5, py]);
          if (highD !== highA) points.push([px - 1, py - 0.5]);
          if (points.length === 2) {
            ctx.moveTo(points[0][0], points[0][1]);
            ctx.lineTo(points[1][0], points[1][1]);
          }
        }
      }
      ctx.strokeStyle = "rgba(235, 242, 248, 0.62)";
      ctx.stroke();
    }

    baseMapRef.current = ctx.getImageData(0, 0, SIZE, SIZE);
  }, [
    world.schemaVersion,
    JSON.stringify(world.chunks ?? {}),
    JSON.stringify(world.terrainVertexEdits ?? {}),
    world.chunks?.[world.currentChunkId]?.terrain?.terrainEditVersion ?? 0,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !baseMapRef.current) return;
    ctx.putImageData(baseMapRef.current, 0, 0);
  }, []);

  function moveBy(dx, dy) {
    setOffset((current) => ({ x: current.x + dx, y: current.y + dy }));
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    const target = event.target;
    if (target.closest("button")) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    if (dragRef.current?.pointerId === event.pointerId) {
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      if (dx || dy) moveBy(dx, dy);
      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport || edgePanFrameRef.current) return;
    const rect = viewport.getBoundingClientRect();
    const edge = 48;
    let dx = 0;
    let dy = 0;
    if (event.clientX - rect.left < edge) dx = 4;
    else if (rect.right - event.clientX < edge) dx = -4;
    if (event.clientY - rect.top < edge) dy = 4;
    else if (rect.bottom - event.clientY < edge) dy = -4;
    if (!dx && !dy) return;

    const tick = () => {
      edgePanFrameRef.current = null;
      if (!lastPointerRef.current) return;
      moveBy(dx, dy);
      handlePointerMove({ ...event, clientX: lastPointerRef.current.x, clientY: lastPointerRef.current.y });
    };
    edgePanFrameRef.current = window.requestAnimationFrame(tick);
  }

  function handlePointerUp(event) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    event.currentTarget.classList.remove("is-dragging");
  }

  function handlePointerLeave() {
    lastPointerRef.current = null;
    if (edgePanFrameRef.current) {
      window.cancelAnimationFrame(edgePanFrameRef.current);
      edgePanFrameRef.current = null;
    }
  }

  useEffect(() => () => {
    if (edgePanFrameRef.current) window.cancelAnimationFrame(edgePanFrameRef.current);
  }, []);

  return (
    <div className="tg-world-map-shell">
      <div className="tg-world-map-heading">
        <span>WORLD MAP</span>
        <small>{occupiedCount} CHUNKS // WORLD GRID // DRAG TO PAN</small>
      </div>

      <div
        ref={viewportRef}
        className="tg-world-map-viewport"
        aria-label="World chunk map"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <div
          className="tg-world-map-space"
          style={{
            width: `${mapWidth}px`,
            height: `${mapHeight}px`,
            transform: `translate3d(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px), 0)`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="tg-world-map-terrain"
            aria-hidden="true"
          />

          <div
            className="tg-world-map-grid-surface"
            style={{ gridTemplateColumns: `repeat(${mapColumns}, 1fr)`, gridTemplateRows: `repeat(${mapRows}, 1fr)` }}
            aria-hidden="true"
          >
            {cells.map((cell) => {
              const occupied = Boolean(cell.chunk);
              const active = cell.chunk?.id === currentChunkId;
              return (
                <button
                  key={`${cell.x},${cell.y}`}
                  type="button"
                  className={`tg-world-map-grid-cell ${occupied ? "occupied" : "empty"} ${active ? "active" : ""}`}
                  onClick={() => occupied ? onSelectChunk?.(cell.chunk) : onAddChunk?.(null, [cell.x, cell.y])}
                  aria-label={occupied
                    ? `Select ${cell.chunk.grid} ${cell.chunk.name}`
                    : `Add world chunk at map position ${cell.x}, ${cell.y}`}
                >
                  {occupied ? (
                    <span className="tg-world-map-major-label" aria-hidden="true">{cell.chunk.mapLabel ?? "?"}</span>
                  ) : (
                    <span className="tg-world-map-empty-add" aria-hidden="true">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="tg-world-map-pan-hint">DRAG MAP // MOVE CURSOR TO EDGE TO PAN</div>
      </div>

      <div className="tg-world-map-footer">
        <span>ACTIVE</span>
        <strong>{currentChunk?.mapLabel ?? "—"} // {currentChunk?.grid ?? "—"} // {currentChunk?.name ?? "NO CHUNK"}</strong>
        <span className="tg-world-map-hint">EMPTY REGION = NEW CHUNK</span>
      </div>
    </div>
  );
}
