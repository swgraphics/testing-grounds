export const CHUNK_SIZE = 100;
export const GRID_MIN_COLUMN = 0;
export const GRID_MAX_COLUMN = 5;
export const GRID_MIN_ROW = 1;
export const GRID_MAX_ROW = 6;
export const GRID_ORIGIN_X = -250;
export const GRID_ORIGIN_Z = -250;

export function columnToLetter(column) {
  let value = Number(column);
  if (!Number.isInteger(value) || value < 0) return null;
  let result = "";
  while (value >= 0) {
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26) - 1;
  }
  return result;
}

export function letterToColumn(letter) {
  const text = String(letter ?? "").trim().toUpperCase();
  if (!/^[A-Z]+$/.test(text)) return null;
  let result = 0;
  for (const char of text) result = result * 26 + char.charCodeAt(0) - 64;
  return result - 1;
}

export function parseGridCoordinate(grid) {
  const match = String(grid ?? "").trim().toUpperCase().match(/^([A-Z]+)([1-9][0-9]*)$/);
  if (!match) return null;
  const column = letterToColumn(match[1]);
  const row = Number(match[2]);
  if (column == null || !Number.isInteger(row)) return null;
  return { grid: `${match[1]}${row}`, column, row };
}

export function isSupportedGridCoordinate(grid) {
  const parsed = parseGridCoordinate(grid);
  return Boolean(
    parsed &&
    parsed.column >= GRID_MIN_COLUMN &&
    parsed.column <= GRID_MAX_COLUMN &&
    parsed.row >= GRID_MIN_ROW &&
    parsed.row <= GRID_MAX_ROW
  );
}

export function gridToWorldPosition(grid) {
  const parsed = parseGridCoordinate(grid);
  if (!parsed) return null;
  return [
    GRID_ORIGIN_X + parsed.column * CHUNK_SIZE,
    0,
    GRID_ORIGIN_Z + (parsed.row - GRID_MIN_ROW) * CHUNK_SIZE,
  ];
}

export function worldToGridCoordinate(x, z) {
  const column = Math.round((Number(x) - GRID_ORIGIN_X) / CHUNK_SIZE);
  const row = Math.round((Number(z) - GRID_ORIGIN_Z) / CHUNK_SIZE) + GRID_MIN_ROW;
  const grid = `${columnToLetter(column)}${row}`;
  return isSupportedGridCoordinate(grid) ? grid : null;
}

export function getGridCells() {
  const cells = [];
  for (let row = GRID_MIN_ROW; row <= GRID_MAX_ROW; row += 1) {
    for (let column = GRID_MIN_COLUMN; column <= GRID_MAX_COLUMN; column += 1) {
      cells.push(`${columnToLetter(column)}${row}`);
    }
  }
  return cells;
}
