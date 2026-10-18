import { tileAt, type GameMap, type Tile } from "./maps.ts";
const soft = (tile: Tile) => ["grass", "sand", "wet", "path"].includes(tile);
/** Corners only soften into walkable ground; cliffs and water retain their boundary. */
export function roadCorners(map: GameMap, x: number, y: number) {
  const t = (dx: number, dy: number) => tileAt(map, x + dx, y + dy);
  return [
    [-1, 0, 0, -1],
    [1, 0, 0, -1],
    [1, 0, 0, 1],
    [-1, 0, 0, 1],
  ].map(([ax, ay, bx, by]) => {
    const a = t(ax, ay),
      b = t(bx, by);
    return a !== "path" && b !== "path" && soft(a) && soft(b) ? 8 : 0;
  });
}
export function roundRoad(c: CanvasRenderingContext2D, radii: number[]) {
  const [tl, tr, br, bl] = radii;
  c.beginPath();
  c.moveTo(tl, 0);
  c.lineTo(16 - tr, 0);
  c.quadraticCurveTo(16, 0, 16, tr);
  c.lineTo(16, 16 - br);
  c.quadraticCurveTo(16, 16, 16 - br, 16);
  c.lineTo(bl, 16);
  c.quadraticCurveTo(0, 16, 0, 16 - bl);
  c.lineTo(0, tl);
  c.quadraticCurveTo(0, 0, tl, 0);
  c.closePath();
}
