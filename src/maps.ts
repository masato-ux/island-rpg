import { furnitureBlocks } from "./interiors.ts";
import * as previous from "./legacy-maps.ts";
export type {
  MapId,
  OutdoorId,
  GameMap,
  Building,
  Exit,
  Terrace,
} from "./legacy-maps.ts";
import type { MapId, GameMap, Terrace } from "./legacy-maps.ts";

export type Tile = previous.Tile | "cavefloor" | "cavewall";
export const TERRAIN_VERSION = 8;
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
// Freeze the compact FIELD 04–06 footprint for save validation.
export const field06Village: GameMap = {
  ...maps.VIL,
  buildings: maps.VIL.buildings.map((b) => ({ ...b })),
};
const homes: Record<string, [number, number, number, number]> = {
  CHIEF: [26, 3, 10, 8],
  FARM: [30, 16, 9, 7],
  RANCH: [2, 11, 10, 7],
  HOME: [2, 22, 9, 6],
  SMITH: [13, 14, 6, 6],
  APOTHECARY: [22, 16, 7, 5],
};
for (const b of maps.VIL.buildings) {
  const [x, y, w, h] = homes[b.interior];
  Object.assign(b, { x, y, w, h });
}
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
  if (
    map.id === "VIL" &&
    map.buildings.some(
      (b) =>
        y === b.y + b.h &&
        x >= Math.min(b.x + b.w / 2, 20) &&
        x <= Math.max(b.x + b.w / 2, 20),
    )
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
export type Biome = "草原" | "沿岸" | "崖の高台" | "森林" | "沼地" | "洞窟";
export const biomeSites: { name: Biome; x: number; y: number }[] = [
  { name: "草原", x: 24, y: 31 },
  { name: "沿岸", x: 8, y: 28 },
  { name: "崖の高台", x: 10, y: 9 },
  { name: "森林", x: 30, y: 25 },
  { name: "沼地", x: 38, y: 32 },
  { name: "洞窟", x: 37, y: 9 },
];
export function biomeAt(map: GameMap, x: number, y: number): Biome | undefined {
  if (map.id !== "GRASS") return undefined;
  if (x >= 31 && y <= 17) return "洞窟";
  if (x >= 32 && y >= 29) return "沼地";
  if (x >= 29 && y >= 19) return "森林";
  if (x <= 14 && y >= 22) return "沿岸";
  if (elevationAt(map, x, y) > 0 || (x <= 16 && y <= 16)) return "崖の高台";
  return "草原";
}
function northernTile(x: number, y: number): Tile | undefined {
  // A real cave room and passage on the same map: no loading screen or hidden teleport.
  if (x >= 31 && x <= 44 && y >= 3 && y <= 15) {
    const doorway = x >= 36 && x <= 38 && y >= 13;
    if (doorway) return "cavefloor";
    const left = 31 + (y <= 6 || y >= 12 ? 1 : 0) + (y === 8 ? 1 : 0),
      right = 44 - (y <= 6 ? 2 : y >= 12 ? 1 : 0);
    if (
      x <= left ||
      x >= right ||
      y <= 4 ||
      y >= 14 ||
      (x === 34 && y === 7) ||
      (x === 41 && y === 11)
    )
      return "cavewall";
    return "cavefloor";
  }
  if (x >= 36 && x <= 38 && y >= 16 && y <= 19) return "path";
  // Branch trails reach the shore, forest, marsh and cave while keeping the main route.
  if (y >= 18 && y <= 19 && x >= 24 && x <= 38) return "path";
  if (y >= 27 && y <= 28 && x >= 7 && x <= 39) return "path";
  if (x >= 37 && x <= 39 && y >= 28 && y <= 34) return "path";
  if (x >= 30 && x <= 31 && y >= 20 && y <= 28) return "path";
  if (x >= 2 && x <= 14 && y >= 22 && y <= 35) {
    const edge = 4 + Math.round(Math.sin(y * 0.65) * 2);
    if (x < edge) return "water";
    if (x <= edge + 3) return "sand";
  }
  if (x >= 32 && x <= 44 && y >= 29 && y <= 35) {
    if ((x * 5 + y * 3) % 19 === 0) return "water";
    return "wet";
  }
  if (x >= 29 && x <= 44 && y >= 20 && y <= 26 && (x + y) % 3 === 0)
    return "tree";
  return undefined;
}
function raw(map: GameMap, x: number, y: number): Tile {
  const old = previous.maps[map.id],
    p = source(map, x, y),
    base = previous.tileAt(old, p.x, p.y);
  if (map.interior) return base;
  if (map.id === "VIL" && !protectedVillage(x, y)) {
    const left = 1 + Math.round((Math.sin(y * 0.62) + 1) * 1.3),
      right = map.width - 2 - Math.round((Math.sin(y * 0.47 + 1) + 1) * 1.2);
    if (
      (x < left || x > right) &&
      !map.buildings.some(
        (b) =>
          x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h + 1,
      )
    )
      return "water";
  }
  if (map.id === "GRASS") {
    const special = northernTile(x, y);
    if (special) return special;
  }
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
  return ["water", "tree", "house", "rock", "cliff", "cavewall"].includes(
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
        !["water", "tree", "house", "rock", "cliff", "cavewall"].includes(
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
