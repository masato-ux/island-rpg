import type { Direction } from "./constants.ts";
export type OutdoorId =
  "VIL" | "GRASS" | "SFOREST" | "CFOREST" | "WEST" | "EAST" | "MOUNT" | "NORTH";
export type MapId =
  OutdoorId | "HOME" | "CHIEF" | "FARM" | "RANCH" | "SMITH" | "APOTHECARY";
export type Tile =
  | "grass"
  | "sand"
  | "water"
  | "path"
  | "tree"
  | "house"
  | "wet"
  | "rock"
  | "floor"
  | "cliff"
  | "stairs";
export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  interior: MapId;
}
export interface Exit {
  to: MapId;
  side: Direction;
}
export interface GameMap {
  id: MapId;
  name: string;
  width: number;
  height: number;
  buildings: Building[];
  exits: Partial<Record<Direction, Exit>>;
  interior?: boolean;
}
const outdoor = (
  id: OutdoorId,
  name: string,
  width: number,
  height: number,
): GameMap => ({ id, name, width, height, buildings: [], exits: {} });
const indoor = (id: MapId, name: string): GameMap => ({
  id,
  name,
  width: 10,
  height: 8,
  buildings: [],
  exits: {},
  interior: true,
});
export const maps: Record<MapId, GameMap> = {
  VIL: outdoor("VIL", "南の村・海岸", 48, 40),
  GRASS: outdoor("GRASS", "南部草原", 72, 56),
  SFOREST: outdoor("SFOREST", "南部森林", 96, 72),
  CFOREST: outdoor("CFOREST", "中央森林", 120, 96),
  WEST: outdoor("WEST", "西の岩場・海岸", 104, 88),
  EAST: outdoor("EAST", "東の湖・湿地", 104, 88),
  MOUNT: outdoor("MOUNT", "北部山岳", 120, 104),
  NORTH: outdoor("NORTH", "最北部・祭壇", 112, 96),
  HOME: indoor("HOME", "家畜小屋・自宅"),
  CHIEF: indoor("CHIEF", "村長宅"),
  FARM: indoor("FARM", "農家"),
  RANCH: indoor("RANCH", "畜産家"),
  SMITH: indoor("SMITH", "鍛冶屋"),
  APOTHECARY: indoor("APOTHECARY", "薬屋"),
};
maps.VIL.buildings = [
  { x: 26, y: 12, w: 6, h: 4, name: "村長宅", interior: "CHIEF" },
  { x: 32, y: 20, w: 6, h: 4, name: "農家", interior: "FARM" },
  { x: 9, y: 20, w: 6, h: 4, name: "畜産家", interior: "RANCH" },
  { x: 9, y: 26, w: 6, h: 4, name: "家畜小屋", interior: "HOME" },
  { x: 19, y: 20, w: 4, h: 4, name: "鍛冶屋", interior: "SMITH" },
  { x: 26, y: 20, w: 4, h: 4, name: "薬屋", interior: "APOTHECARY" },
];
function connect(
  a: OutdoorId,
  side: Direction,
  b: OutdoorId,
  other: Direction,
) {
  maps[a].exits[side] = { to: b, side: other };
  maps[b].exits[other] = { to: a, side };
}
connect("VIL", "up", "GRASS", "down");
connect("GRASS", "up", "SFOREST", "down");
connect("SFOREST", "up", "CFOREST", "down");
connect("CFOREST", "left", "WEST", "right");
connect("CFOREST", "right", "EAST", "left");
connect("CFOREST", "up", "MOUNT", "down");
connect("WEST", "up", "MOUNT", "left");
connect("EAST", "up", "MOUNT", "right");
connect("MOUNT", "up", "NORTH", "down");
export const outdoors = Object.values(maps).filter((m) => !m.interior);
export function legacyTileAt(map: GameMap, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return "water";
  if (map.interior)
    return x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1
      ? "house"
      : "floor";
  const cx = map.width / 2,
    cy = Math.floor(map.height / 2);
  // Protected corridors connect every gate and ensure all outdoor areas are reachable.
  if (Math.abs(x - cx) <= 1 && (map.id !== "VIL" || y < 34)) return "path";
  if (map.id !== "VIL" && Math.abs(y - cy) <= 1) return "path";
  if (map.id === "VIL") {
    // Extend previously impassable sea into two grassy headlands. Existing land stays walkable.
    if (x < 2 || x >= 46) return "water";
    if (y >= 37) {
      const west =
        (y === 37 && x >= 15 && x <= 21) || (y === 38 && x >= 16 && x <= 18);
      const east =
        (y === 37 && x >= 28 && x <= 35) || (y === 38 && x >= 29 && x <= 33);
      return west || east ? "grass" : "water";
    }
    if (y >= 33) return "sand";
    if (
      map.buildings.some(
        (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h,
      )
    )
      return "house";
    if (y === 24 && x >= 8 && x <= 38) return "path";
    if (x < 5 || x > 42 || ((x * 13 + y * 7) % 43 === 0 && y < 30))
      return "tree";
  } else {
    if (x === 0 || y === 0 || x === map.width - 1 || y === map.height - 1)
      return "rock";
    if (
      ["SFOREST", "EAST"].includes(map.id) &&
      x > cx + 4 &&
      x < cx + 11 &&
      Math.abs(y - cy) < 7
    ) {
      // Trim the old rectangular water corners into stepped coves, without blocking old saves.
      const dx = x - cx,
        dy = y - cy;
      if (
        (dx === 5 && (Math.abs(dy) >= 5 || dy === -2)) ||
        (dx === 10 && Math.abs(dy) >= 4) ||
        (dy === -6 && dx <= 6)
      )
        return "grass";
      return "water";
    }
    if (map.id === "EAST" && x > map.width * 0.7 && y > 20 && y < 50)
      return "water";
    if (map.id === "WEST" && x < 5) return "water";
    if (map.id === "EAST" && (x + y) % 7 < 2) return "wet";
    if (
      (x * 17 + y * 11) % 53 === 0 ||
      ((x < 9 || x > map.width - 10) && y % 3 !== 0)
    )
      return map.id === "MOUNT" || map.id === "WEST" ? "rock" : "tree";
    if (map.id === "WEST" && x < 6) return "sand";
  }
  return "grass";
}
export const TERRAIN_VERSION = 3;
export interface Terrace {
  x: number;
  y: number;
  w: number;
  h: number;
  level: number;
}
export function terracesFor(map: GameMap): Terrace[] {
  if (map.interior) return [];
  if (map.id === "VIL") return [{ x: 28, y: 27, w: 12, h: 6, level: 1 }];
  const cx = map.width / 2,
    cy = Math.floor(map.height / 2);
  if (map.id === "MOUNT" || map.id === "NORTH")
    return [
      { x: cx - 21, y: cy - 20, w: 18, h: 16, level: 1 },
      { x: cx - 18, y: cy - 17, w: 10, h: 8, level: 2 },
      { x: cx + 14, y: cy + 8, w: 15, h: 12, level: 1 },
    ];
  return [
    { x: cx - 17, y: cy - 14, w: 12, h: 10, level: 1 },
    { x: cx + 17, y: cy + 9, w: 13, h: 9, level: 1 },
  ];
}
function insideTerrace(t: Terrace, x: number, y: number) {
  const dx = x - t.x,
    dy = y - t.y;
  if (dx < 0 || dy < 0 || dx >= t.w || dy >= t.h) return false;
  // Two stepped corners break the rectangular outline of the raised ground.
  return !(dx + dy < 2 || t.w - 1 - dx + (t.h - 1 - dy) < 2);
}
export function elevationAt(map: GameMap, x: number, y: number) {
  let level = 0;
  for (const t of terracesFor(map))
    if (insideTerrace(t, x, y)) level = Math.max(level, t.level);
  return level;
}
const roads = new WeakMap<GameMap, Uint8Array>();
export function roadAt(map: GameMap, x: number, y: number) {
  if (map.interior || x < 0 || y < 0 || x >= map.width || y >= map.height)
    return false;
  let mask = roads.get(map);
  if (!mask) {
    mask = new Uint8Array(map.width * map.height);
    const paint = (x: number, y: number) => {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < map.width && yy < map.height)
            mask![yy * map.width + xx] = 1;
        }
    };
    const line = (points: number[][]) => {
      for (let n = 1; n < points.length; n++) {
        const [ax, ay] = points[n - 1],
          [bx, by] = points[n],
          steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let i = 0; i <= steps; i++)
          paint(
            Math.round(ax + ((bx - ax) * i) / (steps || 1)),
            Math.round(ay + ((by - ay) * i) / (steps || 1)),
          );
      }
    };
    const cx = map.width / 2,
      cy = Math.floor(map.height / 2);
    if (map.id === "VIL") {
      line([
        [24, 0],
        [24, 3],
        [20, 7],
        [21, 11],
        [24, 17],
        [24, 25],
        [26, 29],
        [24, 33],
      ]);
      line([
        [8, 24],
        [16, 24],
        [18, 26],
        [24, 25],
        [31, 26],
        [35, 24],
        [39, 25],
      ]);
      line([
        [24, 18],
        [29, 17],
      ]);
      line([
        [24, 32],
        [27, 34],
        [34, 34],
        [34, 30],
      ]);
    } else {
      line([
        [cx, 0],
        [cx, 3],
        [cx - 5, 10],
        [cx - 5, Math.floor(map.height * 0.3)],
        [cx + 4, cy - 5],
        [cx + 4, cy + 7],
        [cx - 4, map.height - 12],
        [cx, map.height - 4],
        [cx, map.height - 1],
      ]);
      if (map.exits.left)
        line([
          [0, cy],
          [4, cy],
          [cx - 15, cy + 4],
          [cx, cy],
        ]);
      if (map.exits.right)
        line([
          [cx, cy],
          [cx + 15, cy - 5],
          [map.width - 5, cy],
          [map.width - 1, cy],
        ]);
      // A side trail forms a loop around the clearing instead of forcing a single route.
      line([
        [cx, cy],
        [cx + 10, cy - 4],
        [cx + 15, cy + 4],
        [cx + 6, cy + 11],
        [cx - 3, cy + 7],
        [cx, cy],
      ]);
    }
    for (const t of terracesFor(map)) {
      const x = t.x + Math.floor(t.w / 2),
        y = t.y + t.h - 1;
      line([
        [map.id === "VIL" ? 34 : cx, map.id === "VIL" ? 34 : cy],
        [x, y + 3],
        [x, y - 2],
      ]);
    }
    roads.set(map, mask);
  }
  return mask[y * map.width + x] === 1;
}
function rawTileAt(map: GameMap, x: number, y: number): Tile {
  const old = legacyTileAt(map, x, y);
  if (map.interior || old === "house") return old;
  const height = elevationAt(map, x, y);
  if (height > 0) {
    const rim = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ].some(([dx, dy]) => elevationAt(map, x + dx, y + dy) < height);
    if (rim) return roadAt(map, x, y) ? "stairs" : "cliff";
    return roadAt(map, x, y) ? "path" : "grass";
  }
  if (roadAt(map, x, y)) return "path";
  if (map.id === "WEST" && x < 5 && y > 2 && y < map.height - 2) {
    const edge = 3 + Math.floor(Math.sin(y * 0.34) + Math.sin(y * 0.13));
    return x < edge ? "water" : x === edge ? "sand" : "grass";
  }
  // Retain an unmarked walkable strip where the old straight road was, for saved positions.
  if (old === "path") return "grass";
  if (map.id === "VIL" && y >= 33 && x >= 2 && x < 46) {
    if (old === "grass") return old;
    const edge =
      37 + Math.floor((Math.sin(x * 0.48) + Math.sin(x * 0.19 + 1)) * 1.25);
    if (y >= 37 && y < Math.min(39, Math.max(37, edge)))
      return x % 9 < 5 ? "grass" : "sand";
    return old;
  }
  if ((map.id === "SFOREST" || map.id === "EAST") && old === "water") {
    const cx = map.width / 2,
      cy = Math.floor(map.height / 2);
    if (x > cx + 4 && x < cx + 11 && Math.abs(y - cy) < 7) {
      if (x === cx + 5 + (Math.floor(y / 3) % 2) && y % 4 !== 0) return "grass";
    }
    if (map.id === "EAST" && x > map.width * 0.7 && y > 20 && y < 50) {
      const edge =
        Math.floor(map.width * 0.7) +
        1 +
        Math.floor((Math.sin(y * 0.36) + 1) * 2);
      if (
        x < edge ||
        y < 23 + Math.floor(Math.sin(x * 0.6) + 1) ||
        y > 47 - Math.floor(Math.cos(x * 0.5) + 1)
      )
        return "grass";
    }
  }
  return old;
}
const fields = new WeakMap<GameMap, Tile[]>();
export function tileAt(map: GameMap, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return "water";
  let cells = fields.get(map);
  if (!cells) {
    cells = [];
    for (let yy = 0; yy < map.height; yy++)
      for (let xx = 0; xx < map.width; xx++) cells.push(rawTileAt(map, xx, yy));
    fields.set(map, cells);
  }
  return cells[Math.floor(y) * map.width + Math.floor(x)];
}
export function isBlocked(map: GameMap, x: number, y: number) {
  return ["water", "tree", "house", "rock", "cliff"].includes(
    tileAt(map, x, y),
  );
}
export function canStandOn(map: GameMap, x: number, y: number, legacy = false) {
  const at = legacy ? legacyTileAt : tileAt;
  return [
    [-5, -5],
    [5, -5],
    [-5, 5],
    [5, 5],
  ].every(
    ([dx, dy]) =>
      !["water", "tree", "house", "rock", "cliff"].includes(
        at(map, Math.floor((x + dx) / 16), Math.floor((y + dy) / 16)),
      ),
  );
}
export function safePosition(
  map: GameMap,
  x: number,
  y: number,
): { x: number; y: number } | null {
  if (canStandOn(map, x, y)) return { x, y };
  const tx = Math.floor(x / 16),
    ty = Math.floor(y / 16);
  for (let r = 1; r < Math.max(map.width, map.height); r++) {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = (tx + dx) * 16 + 8,
          yy = (ty + dy) * 16 + 8;
        if (canStandOn(map, xx, yy)) return { x: xx, y: yy };
      }
  }
  return null;
}
