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
  | "floor";
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
export function tileAt(map: GameMap, x: number, y: number): Tile {
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
    if (y >= 37 || x < 2 || x >= 46) return "water";
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
    )
      return "water";
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
export function isBlocked(map: GameMap, x: number, y: number) {
  return ["water", "tree", "house", "rock"].includes(tileAt(map, x, y));
}
