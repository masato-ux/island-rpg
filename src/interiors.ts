import type { MapId } from "./maps.ts";
export type FurnitureKind =
  | "bed"
  | "table"
  | "shelf"
  | "hearth"
  | "plant"
  | "barrel"
  | "anvil"
  | "counter"
  | "stool"
  | "hay"
  | "crate"
  | "rack"
  | "desk";
export interface Furniture {
  kind: FurnitureKind;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
}
export interface Room {
  description: string;
  title?: string;
  theme?: "cottage" | "hall" | "farm" | "ranch" | "forge" | "herbal";
  floor: string;
  rug: string;
  furniture: Furniture[];
}
const f = (
  kind: FurnitureKind,
  x: number,
  y: number,
  w: number,
  h: number,
  color?: string,
): Furniture => ({ kind, x, y, w, h, color });
// Coordinates describe the footprint on the floor, not the raised sprite.
// The central passage and south doorway remain open in every home.
const field05Rooms: Partial<Record<MapId, Room>> = {
  HOME: {
    description: "干し草の香りがする小屋。寝床、調理台、飲み水の樽がある。",
    floor: "#a78b65",
    rug: "#7c9470",
    furniture: [
      f("bed", 24, 32, 24, 32, "#b9be90"),
      f("counter", 112, 32, 24, 16),
      f("hearth", 112, 56, 24, 16),
      f("barrel", 24, 88, 16, 16),
      f("hay", 48, 96, 16, 12),
      f("shelf", 64, 24, 32, 10),
    ],
  },
  CHIEF: {
    description: "村長の家。大きな食卓と家族の寝床、村の記録が並ぶ本棚。",
    floor: "#b09a77",
    rug: "#947b72",
    furniture: [
      f("bed", 24, 32, 24, 32, "#8299a5"),
      f("table", 112, 48, 24, 16),
      f("stool", 120, 80, 12, 12),
      f("shelf", 64, 24, 32, 10),
      f("plant", 24, 88, 12, 14),
      f("counter", 112, 24, 24, 12),
    ],
  },
  FARM: {
    description: "農家の住まい。収穫した野菜や種、家族の食器が置かれている。",
    floor: "#ad916a",
    rug: "#9a9c67",
    furniture: [
      f("bed", 24, 32, 24, 32, "#b9a268"),
      f("table", 112, 48, 24, 16),
      f("shelf", 64, 24, 32, 10),
      f("barrel", 24, 88, 16, 16),
      f("plant", 120, 88, 14, 14),
      f("counter", 112, 24, 24, 12),
    ],
  },
  RANCH: {
    description:
      "牧畜家の家。道具棚、干し草、暖炉。家族の寝床には毛織りの掛け布団。",
    floor: "#a89070",
    rug: "#9b7963",
    furniture: [
      f("bed", 24, 32, 24, 32, "#b78f78"),
      f("hay", 24, 88, 24, 16),
      f("hearth", 112, 32, 24, 16),
      f("table", 112, 80, 24, 16),
      f("shelf", 64, 24, 32, 10),
      f("barrel", 120, 56, 16, 16),
    ],
  },
  SMITH: {
    description: "鍛冶屋の工房。赤く燃える炉、金床、工具棚と作業台。",
    floor: "#8e8b7d",
    rug: "#75766d",
    furniture: [
      f("hearth", 24, 32, 24, 24),
      f("anvil", 32, 80, 24, 16),
      f("counter", 112, 32, 24, 24),
      f("shelf", 64, 24, 32, 10),
      f("barrel", 120, 88, 16, 16),
    ],
  },
  APOTHECARY: {
    description: "薬師の家。色とりどりの薬瓶、薬草の鉢、調合机と休息用の寝台。",
    floor: "#a89c7f",
    rug: "#7d9d91",
    furniture: [
      f("bed", 24, 32, 24, 32, "#c6cfba"),
      f("counter", 112, 32, 24, 24, "#789b8e"),
      f("shelf", 64, 24, 32, 10),
      f("plant", 24, 88, 14, 16),
      f("plant", 120, 88, 14, 16),
    ],
  },
};
export const rooms: Partial<Record<MapId, Room>> = {
  HOME: {
    ...field05Rooms.HOME!,
    title: "漂流者の小屋",
    theme: "cottage",
    floor: "#a48257",
    rug: "#6f8561",
    furniture: [
      f("bed", 24, 32, 24, 32, "#6f997f"),
      f("counter", 112, 32, 24, 16),
      f("hearth", 112, 56, 24, 16),
      f("barrel", 24, 88, 16, 16),
      f("crate", 48, 96, 16, 12),
    ],
  },
  CHIEF: {
    ...field05Rooms.CHIEF!,
    title: "村長の応接室",
    theme: "hall",
    floor: "#94704f",
    rug: "#89505a",
    furniture: [
      f("bed", 112, 32, 24, 30, "#7484ac"),
      f("desk", 24, 32, 34, 20),
      f("shelf", 24, 88, 32, 12),
      f("plant", 120, 92, 12, 14),
      f("shelf", 64, 24, 32, 10),
    ],
  },
  FARM: {
    ...field05Rooms.FARM!,
    title: "農家の台所",
    theme: "farm",
    floor: "#bba17d",
    rug: "#b49c67",
    furniture: [
      f("bed", 24, 82, 24, 24, "#c6ab6c"),
      f("counter", 24, 32, 34, 16),
      f("crate", 112, 32, 24, 20),
      f("barrel", 120, 88, 16, 16),
      f("plant", 112, 58, 14, 12),
    ],
  },
  RANCH: {
    ...field05Rooms.RANCH!,
    title: "牧畜家の居間",
    theme: "ranch",
    floor: "#9b805d",
    rug: "#876b4c",
    furniture: [
      f("bed", 112, 82, 24, 24, "#ad7b63"),
      f("hay", 24, 88, 32, 16),
      f("hearth", 24, 32, 24, 24),
      f("rack", 112, 32, 24, 16),
      f("barrel", 56, 24, 16, 16),
    ],
  },
  SMITH: {
    ...field05Rooms.SMITH!,
    title: "鍛冶屋の仕事場",
    theme: "forge",
    floor: "#676e72",
    rug: "#474e52",
    furniture: [
      f("hearth", 24, 32, 32, 28),
      f("anvil", 32, 84, 24, 16),
      f("counter", 112, 84, 24, 20),
      f("rack", 112, 32, 24, 20),
      f("crate", 64, 24, 32, 10),
    ],
  },
  APOTHECARY: {
    ...field05Rooms.APOTHECARY!,
    title: "薬師の調合室",
    theme: "herbal",
    floor: "#adbcab",
    rug: "#658a86",
    furniture: [
      f("bed", 112, 32, 24, 30, "#dfd4bd"),
      f("counter", 24, 32, 32, 20, "#729b91"),
      f("plant", 24, 86, 16, 18),
      f("shelf", 48, 94, 24, 12),
      f("plant", 120, 88, 14, 16),
      f("shelf", 64, 24, 32, 10),
    ],
  },
};
export function field05FurnitureBlocks(id: MapId, x: number, y: number) {
  return [
    [-5, -5],
    [5, -5],
    [-5, 5],
    [5, 5],
  ].some(([dx, dy]) =>
    field05Rooms[id]?.furniture.some(
      (p) =>
        x + dx >= p.x &&
        x + dx < p.x + p.w &&
        y + dy >= p.y &&
        y + dy < p.y + p.h,
    ),
  );
}
export function furnitureAt(id: MapId, x: number, y: number) {
  if (rooms[id] && y < 28) return true;
  return (
    rooms[id]?.furniture.some(
      (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h,
    ) || false
  );
}
export function furnitureBlocks(id: MapId, x: number, y: number) {
  return [
    [-5, -5],
    [5, -5],
    [-5, 5],
    [5, 5],
  ].some(([dx, dy]) => furnitureAt(id, x + dx, y + dy));
}
