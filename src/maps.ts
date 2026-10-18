import { furnitureBlocks } from "./interiors.ts";
import * as previous from "./legacy-maps.ts";
export type {
  MapId,
  OutdoorId,
  Tile,
  GameMap,
  Building,
  Exit,
  Terrace,
} from "./legacy-maps.ts";
import type { MapId, Tile, GameMap, Terrace } from "./legacy-maps.ts";

export const TERRAIN_VERSION = 5;
const sizes: Partial<Record<MapId, [number, number]>> = {
  VIL: [40, 34],
  GRASS: [48, 38],
  SFOREST: [64, 48],
  CFOREST: [80, 64],
  WEST: [70, 58],
  EAST: [70, 58],
  MOUNT: [80, 70],
  NORTH: [76, 64],
};
export const maps = Object.fromEntries(
  Object.entries(previous.maps).map(([id, m]) => {
    const [width, height] = sizes[id as MapId] || [m.width, m.height];
    return [
      id,
      {
        ...m,
        width,
        height,
        exits: { ...m.exits },
        buildings: m.buildings.map((b) => ({
          ...b,
          x: Math.round((b.x * width) / m.width),
          y: Math.round((b.y * height) / m.height),
          w: Math.max(3, Math.round((b.w * width) / m.width)),
          h: Math.max(3, Math.round((b.h * height) / m.height)),
        })),
      },
    ];
  }),
) as Record<MapId, GameMap>;
export const outdoors = Object.values(maps).filter((m) => !m.interior);
export function compactPoint(id: MapId, x: number, y: number) {
  const old = previous.maps[id],
    m = maps[id];
  return { x: (x * m.width) / old.width, y: (y * m.height) / old.height };
}
export const villagePoint = (x: number, y: number) => compactPoint("VIL", x, y);
export function terracesFor(map: GameMap): Terrace[] {
  const old = previous.maps[map.id],
    sx = map.width / old.width,
    sy = map.height / old.height;
  return previous.terracesFor(old).map((t) => ({
    ...t,
    x: Math.round(t.x * sx),
    y: Math.round(t.y * sy),
    w: Math.max(5, Math.round(t.w * sx)),
    h: Math.max(4, Math.round(t.h * sy)),
  }));
}
function inside(t: Terrace, x: number, y: number) {
  const dx = x - t.x,
    dy = y - t.y;
  if (dx < 0 || dy < 0 || dx >= t.w || dy >= t.h) return false;
  const left =
    dy === 0 || dy === t.h - 1
      ? 2
      : dy === 1
        ? 1
        : dy === Math.floor(t.h * 0.5)
          ? 1
          : 0;
  const right =
    dy === 0 || dy === t.h - 1
      ? 2
      : dy === t.h - 2
        ? 1
        : dy === Math.floor(t.h * 0.65)
          ? 1
          : 0;
  return dx >= left && dx < t.w - right;
}
export function elevationAt(map: GameMap, x: number, y: number) {
  let level = 0;
  for (const t of terracesFor(map))
    if (inside(t, x, y)) level = Math.max(level, t.level);
  return level;
}
function source(map: GameMap, x: number, y: number) {
  const old = previous.maps[map.id];
  return {
    x: Math.min(old.width - 1, Math.floor(((x + 0.5) * old.width) / map.width)),
    y: Math.min(
      old.height - 1,
      Math.floor(((y + 0.5) * old.height) / map.height),
    ),
  };
}
export function roadAt(map: GameMap, x: number, y: number) {
  if (map.interior || x < 0 || y < 0 || x >= map.width || y >= map.height)
    return false;
  const old = previous.maps[map.id],
    p = source(map, x, y);
  // Keep the gate mouths three tiles wide even after shrinking the trails.
  const cx = Math.floor(map.width / 2),
    cy = Math.floor(map.height / 2);
  if (
    ((y < 3 && map.exits.up) || (y >= map.height - 3 && map.exits.down)) &&
    Math.abs(x - cx) <= 1
  )
    return true;
  if (
    ((x < 3 && map.exits.left) || (x >= map.width - 3 && map.exits.right)) &&
    Math.abs(y - cy) <= 1
  )
    return true;
  if (previous.roadAt(old, p.x, p.y)) return true;
  // The stairs remain centered on the newly rounded plateau outline.
  return terracesFor(map).some(
    (t) =>
      Math.abs(x - (t.x + Math.floor(t.w / 2))) <= 1 &&
      y >= t.y + t.h - 3 &&
      y <= t.y + t.h + 1,
  );
}
const poi = [
  [392, 552],
  [408, 552],
  [264, 488],
  [392, 488],
  [472, 280],
  [552, 568],
  [392, 408],
  ...[
    [29, 17],
    [31, 17],
    [28, 18],
    [33, 25],
    [36, 25],
    [34, 26],
    [16, 30],
    [12, 25],
    [15, 25],
    [21, 25],
    [28, 25],
    [31, 35],
  ].map(([x, y]) => [x * 16 + 8, y * 16 + 8]),
].map(([x, y]) => villagePoint(x, y));
function protectedVillage(x: number, y: number) {
  return poi.some(
    (p) =>
      Math.abs(x - Math.floor(p.x / 16)) <= 1 &&
      Math.abs(y - Math.floor(p.y / 16)) <= 1,
  );
}
function raw(map: GameMap, x: number, y: number): Tile {
  const old = previous.maps[map.id],
    p = source(map, x, y),
    base = previous.tileAt(old, p.x, p.y);
  if (map.interior) return base;
  if (
    map.buildings.some(
      (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h,
    )
  )
    return "house";
  const level = elevationAt(map, x, y),
    road = roadAt(map, x, y);
  if (level) {
    const rim = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ].some(([dx, dy]) => elevationAt(map, x + dx, y + dy) < level);
    return rim ? (road ? "stairs" : "cliff") : road ? "path" : "grass";
  }
  if (road) return "path";
  if (map.id === "VIL") {
    for (const b of map.buildings) {
      const dx = b.x + b.w / 2,
        dy = b.y + b.h;
      if (Math.abs(x - dx) <= 1 && Math.abs(y - dy) <= 1) return "path";
    }
    if (protectedVillage(x, y))
      return base === "water"
        ? "sand"
        : base === "tree" || base === "house" || base === "cliff"
          ? "grass"
          : base;
    if (y >= Math.floor(map.height * 0.82) && x > 1 && x < map.width - 2) {
      const coast =
        map.height -
        3 +
        Math.round(Math.sin(x * 0.48) * 1.4 + Math.sin(x * 0.87) * 0.6);
      if (y >= Math.min(map.height - 1, coast)) return "water";
      return y >= map.height - 5 ? "sand" : "grass";
    }
  }
  if (base === "cliff" || base === "stairs" || base === "house") return "grass";
  // Additional trees form loose groups off the trails; a narrow unmarked central strip stays open.
  if (
    base === "grass" &&
    Math.abs(x - map.width / 2) > 2 &&
    Math.abs(y - map.height / 2) > 2 &&
    x > 2 &&
    x < map.width - 3 &&
    y > 3 &&
    y < map.height - 3 &&
    (x * 37 + y * 19) % 89 === 0
  )
    return "tree";
  return base;
}
const fields = new WeakMap<GameMap, Tile[]>();
export function tileAt(map: GameMap, x: number, y: number): Tile {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    y < 0 ||
    x >= map.width ||
    y >= map.height
  )
    return "water";
  let cells = fields.get(map);
  if (!cells) {
    cells = [];
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) cells.push(raw(map, x, y));
    fields.set(map, cells);
  }
  return cells[Math.floor(y) * map.width + Math.floor(x)];
}
export function legacyTileAt(map: GameMap, x: number, y: number): Tile {
  return previous.legacyTileAt(previous.maps[map.id], x, y);
}
export function isBlocked(map: GameMap, x: number, y: number) {
  return ["water", "tree", "house", "rock", "cliff"].includes(
    tileAt(map, x, y),
  );
}
export function canStandOn(map: GameMap, x: number, y: number, legacy = false) {
  const at = legacy ? legacyTileAt : tileAt;
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    (legacy || !furnitureBlocks(map.id, x, y)) &&
    [
      [-5, -5],
      [5, -5],
      [-5, 5],
      [5, 5],
    ].every(
      ([dx, dy]) =>
        !["water", "tree", "house", "rock", "cliff"].includes(
          at(map, Math.floor((x + dx) / 16), Math.floor((y + dy) / 16)),
        ),
    )
  );
}
export function safePosition(
  map: GameMap,
  x: number,
  y: number,
): { x: number; y: number } | null {
  if (canStandOn(map, x, y)) return { x, y };
  const tx = Math.max(1, Math.min(map.width - 2, Math.floor(x / 16))),
    ty = Math.max(1, Math.min(map.height - 2, Math.floor(y / 16)));
  for (let r = 0; r < Math.max(map.width, map.height); r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = (tx + dx) * 16 + 8,
          yy = (ty + dy) * 16 + 8;
        if (canStandOn(map, xx, yy)) return { x: xx, y: yy };
      }
  return null;
}
