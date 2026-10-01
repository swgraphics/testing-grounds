import { useMemo, useState } from "react";
import { useWorldStore } from "../../systems/world/worldStore";
import { columnToLetter, getGridCells, gridToWorldPosition } from "../../systems/world/worldGrid";
import { terrainSettings } from "../../systems/terrain/terrainSettings";

function getPlayerChunkTarget(position) {
  const [x, , z] = Array.isArray(position) ? position : [0, 0, 0];
  if (![x, z].every(Number.isFinite)) return null;

  // The authored starting terrain is 600m wide, centered on the origin.
  // New creator chunks are 100m tiles and are snapped around the player's
  // current world position so the new terrain appears directly beneath them.
  const centerX = Math.floor(Number(x) / 100) * 100 + 50;
  const centerZ = Math.floor(Number(z) / 100) * 100 + 50;
  const outsideBase =
    centerX - 50 >= 300 || centerX + 50 <= -300 ||
    centerZ - 50 >= 300 || centerZ + 50 <= -300;

  if (!outsideBase) return null;

  const column = Math.round((centerX + 250) / 100);
  const row = Math.round((centerZ + 250) / 100) + 1;
  if (column < 0 || row < 1) return null;

  return {
    grid: `${columnToLetter(column)}${row}`,
    position: [centerX, 0, centerZ],
  };
}

export default function ChunkCreationDialog({ onClose, initialGrid = "", initialMapPosition = null, playerPosition = [0, 0, 0] }) {
  const chunks = useWorldStore((state) => state.world.chunks);
  const createChunk = useWorldStore((state) => state.createChunk);
  const cells = useMemo(() => getGridCells(), []);
  const occupied = useMemo(
    () => new Set(Object.values(chunks ?? {}).map((chunk) => String(chunk.grid ?? "").toUpperCase())),
    [chunks]
  );
  const firstAvailableGrid = useMemo(() => cells.find((cell) => !occupied.has(cell)) ?? "", [cells, occupied]);
  const playerTarget = useMemo(() => getPlayerChunkTarget(playerPosition), [playerPosition]);
  const targetGrid = playerTarget?.grid ?? "";
  const [grid, setGrid] = useState(initialGrid || targetGrid || firstAvailableGrid);
  const effectiveGrid = playerTarget?.grid ?? grid;
  const [name, setName] = useState("");

  function handleCreate(event) {
    event.preventDefault();
    const createGrid = effectiveGrid;
    if (!createGrid || occupied.has(createGrid)) return;
    const position = playerTarget?.position ?? gridToWorldPosition(createGrid);
    const id = createChunk({
      grid: createGrid,
      name: name.trim() || `CHUNK ${createGrid}`,
      position,
      mapPosition: initialMapPosition,
      terrain: { ...terrainSettings },
    });
    if (id) onClose();
  }

  return (
    <div className="tg-chunk-dialog-backdrop" role="presentation" onPointerDown={onClose}>
      <form className="tg-chunk-dialog" onSubmit={handleCreate} onPointerDown={(event) => event.stopPropagation()}>
        <div className="tg-chunk-dialog-title">ADD WORLD CHUNK</div>
        <div className="tg-chunk-dialog-copy">{playerTarget ? "A new 100M terrain chunk will appear around the player at the current world edge." : "Choose the grid location first. World position is derived from the grid."}</div>

        <label>
          <span>GRID COORDINATE</span>
          <select value={effectiveGrid} onChange={(event) => setGrid(event.target.value)} required disabled={Boolean(playerTarget)}>
            <option value="">SELECT EMPTY CELL</option>
            {playerTarget && (
              <option value={targetGrid}>{targetGrid} — PLAYER EDGE</option>
            )}
            {cells.map((cell) => (
              <option key={cell} value={cell} disabled={occupied.has(cell)}>
                {cell}{occupied.has(cell) ? " — OCCUPIED" : ""}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>{playerTarget ? "NEW TERRAIN CHUNK AT PLAYER" : "CHUNK NAME"}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={grid ? `CHUNK ${grid}` : "CREATOR NAME"}
            maxLength={32}
          />
        </label>

        <div className="tg-chunk-dialog-actions">
          <button type="button" onClick={onClose}>CANCEL</button>
          <button type="submit" disabled={!grid}>CREATE CHUNK</button>
        </div>
      </form>
    </div>
  );
}
