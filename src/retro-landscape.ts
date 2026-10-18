import { type GameMap, tileAt, elevationAt } from "./maps.ts";

// Original low-resolution artwork. Every mark lies on the logical pixel grid.
const seed = (x: number, y: number) => {
  let n = Math.imul(x + 167, 374761393) ^ Math.imul(y + 59, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
};
export function meadow(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  forest: boolean,
  density: number,
) {
  const n = seed(x, y);
  c.fillStyle = forest ? "#539b70" : "#64b783";
  c.fillRect(0, 0, 16, 16);
  const count = forest ? 4 : density === 2 ? 2 : n % 4 === 0 ? 1 : 0;
  for (let i = 0; i < count; i++) {
    const h = seed(x * 7 + i, y * 11),
      xx = 3 + (h % 10),
      yy = 5 + ((h >>> 8) % 9);
    c.fillStyle = forest ? "#387e57" : "#4c9e6f";
    c.fillRect(xx, yy - 3, 1, 3);
    c.fillRect(xx - 2, yy - 2, 1, 2);
    c.fillRect(xx + 2, yy - 2, 1, 2);
    c.fillStyle = forest ? "#77b67d" : "#83c68c";
    c.fillRect(xx - 1, yy, 3, 1);
  }
}
export function ocean(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  px: number,
  py: number,
  time: number,
) {
  c.fillStyle = "#6054da";
  c.fillRect(px, py, 16, 16);
  // Continuous wave fronts cross tile boundaries; the foam advances in four frames.
  const frame = Math.floor(time / 5) % 4;
  for (let col = 0; col < 16; col++) {
    const wx = x * 16 + col,
      ripple = [0, 0, 1, 1, 2, 2, 1, 1][Math.floor((wx + frame * 2) / 2) % 8];
    for (let row = 0; row < 16; row++) {
      const wy = y * 16 + row,
        band = (wy + ripple + frame) % 24;
      if (band > 5) continue;
      c.fillStyle = band < 2 ? "#b7d6ed" : band < 4 ? "#879eeb" : "#7770df";
      c.fillRect(px + col, py + row, 1, 1);
    }
  }
  const n = seed(x, y);
  if (n % 3 === 0) {
    c.fillStyle = "#aaa9ef";
    c.fillRect(px + 3, py + 10, 2, 1);
    c.fillRect(px + 6, py + 9, 3, 1);
  }
}
export function escarpment(
  c: CanvasRenderingContext2D,
  map: GameMap,
  x: number,
  y: number,
  px: number,
  py: number,
) {
  c.fillStyle = "#6d6948";
  c.fillRect(px, py, 16, 16);
  // Broad limestone faces, narrow shaded cracks and irregular vertical streaks.
  for (let col = 0; col < 16; col++) {
    const wx = x * 16 + col,
      face = ((wx % 13) + 13) % 13;
    c.fillStyle = [
      "#494b35",
      "#8b8660",
      "#c4bf87",
      "#ded59d",
      "#e4dda5",
      "#d1cc92",
      "#d1cc92",
      "#c4bd85",
      "#bbb47b",
      "#b4ad76",
      "#a49c6b",
      "#a49c6b",
      "#797653",
    ][face];
    c.fillRect(px + col, py, 1, 16);
    const n = seed(Math.floor(wx / 3), y);
    if (n % 4 === 0) {
      c.fillStyle = face < 3 ? "#8c895f" : "#e2dba1";
      c.fillRect(px + col, py + 3 + (n % 9), 1, 3);
    }
  }
  const upper = tileAt(map, x, y - 1),
    lower = tileAt(map, x, y + 1);
  if (
    upper !== "cliff" &&
    upper !== "stairs" &&
    elevationAt(map, x, y - 1) >= elevationAt(map, x, y)
  ) {
    c.fillStyle = "#293f30";
    c.fillRect(px, py, 16, 3);
    for (let i = 0; i < 16; i++) {
      const edge = 2 + (seed(x * 16 + i, 3) % 3);
      c.fillStyle = "#64b783";
      c.fillRect(px + i, py, 1, edge - 1);
      c.fillStyle = "#314d34";
      c.fillRect(px + i, py + edge - 1, 1, 1);
    }
  }
  if (lower !== "cliff") {
    c.fillStyle = "#78764f";
    c.fillRect(px, py + 14, 16, 1);
    c.fillStyle = "#404c36";
    for (let i = 0; i < 16; i++)
      c.fillRect(
        px + i,
        py + 15 - (seed(x * 16 + i, 5) % 3 === 0 ? 1 : 0),
        1,
        1,
      );
  }
}
