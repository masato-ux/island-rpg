export type OfficeLife = {
  day: number;
  stamina: number;
  place: "office" | "home";
  recovered: number;
  fridayRest: boolean;
};
export const newOfficeLife = (): OfficeLife => ({
  day: 1,
  stamina: 65,
  place: "office",
  recovered: 0,
  fridayRest: false,
});
export function weekday(day: number) {
  return ["月", "火", "水", "木", "金", "土", "日"][(day - 1) % 7];
}
export function returnHome(life: OfficeLife) {
  if (life.place !== "office") return false;
  life.fridayRest = weekday(life.day) === "金";
  const before = life.stamina;
  life.stamina = Math.min(100, life.stamina + (life.fridayRest ? 50 : 25));
  life.recovered = life.stamina - before;
  life.place = "home";
  return true;
}
export function nextOfficeDay(life: OfficeLife) {
  if (life.place !== "home") return false;
  life.day++;
  life.place = "office";
  return true;
}
export function parseOfficeLife(raw: unknown): OfficeLife | null {
  if (raw === undefined) return newOfficeLife();
  if (!raw || typeof raw !== "object") return null;
  const l = raw as OfficeLife;
  return Number.isSafeInteger(l.day) &&
    l.day >= 1 &&
    l.day <= 100000 &&
    Number.isFinite(l.stamina) &&
    l.stamina >= 0 &&
    l.stamina <= 100 &&
    (l.place === "home" || l.place === "office") &&
    Number.isFinite(l.recovered) &&
    l.recovered >= 0 &&
    l.recovered <= 50 &&
    typeof l.fridayRest === "boolean"
    ? { ...l }
    : null;
}
export const homeSpawn = { x: 500, y: 490 };
export const homeFurniture = [
  { x: 238, y: 180, w: 112, h: 118 },
  { x: 650, y: 151, w: 92, h: 50 },
  { x: 554, y: 298, w: 90, h: 54 },
  { x: 250, y: 386, w: 124, h: 55 },
  { x: 579, y: 422, w: 134, h: 48 },
];
export function canOccupyHome(x: number, y: number, r = 8) {
  return (
    x >= 180 + r &&
    x <= 780 - r &&
    y >= 138 + r &&
    y <= 540 - r &&
    !homeFurniture.some((b) => {
      const nx = Math.max(b.x, Math.min(x, b.x + b.w)),
        ny = Math.max(b.y, Math.min(y, b.y + b.h));
      return (x - nx) ** 2 + (y - ny) ** 2 < r * r;
    })
  );
}
export function moveHome(p: { x: number; y: number }, dx: number, dy: number) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
  for (let i = 0; i < steps; i++) {
    if (canOccupyHome(p.x + dx / steps, p.y)) p.x += dx / steps;
    if (canOccupyHome(p.x, p.y + dy / steps)) p.y += dy / steps;
  }
}
