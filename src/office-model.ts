export type Rect = { x: number; y: number; w: number; h: number };
export type OfficeObject = Rect & {
  kind: string;
  name: string;
  detail: string;
  person?: number;
};
export const OFFICE_W = 960,
  OFFICE_H = 624;
export const walls: Rect[] = [
  { x: 8, y: 16, w: 944, h: 30 },
  { x: 8, y: 16, w: 12, h: 592 },
  { x: 940, y: 16, w: 12, h: 592 },
  { x: 8, y: 596, w: 466, h: 12 },
  { x: 526, y: 596, w: 426, h: 12 },
  { x: 228, y: 46, w: 14, h: 96 },
  { x: 228, y: 190, w: 14, h: 84 },
  { x: 16, y: 260, w: 124, h: 14 },
  { x: 174, y: 260, w: 196, h: 14 },
  { x: 402, y: 260, w: 146, h: 14 },
  { x: 528, y: 46, w: 14, h: 110 },
  { x: 528, y: 206, w: 14, h: 54 },
  { x: 730, y: 46, w: 14, h: 258 },
  { x: 730, y: 368, w: 14, h: 56 },
  { x: 730, y: 474, w: 14, h: 122 },
  { x: 788, y: 300, w: 152, h: 14 },
];
export const objects: OfficeObject[] = [];
const put = (
  kind: string,
  name: string,
  x: number,
  y: number,
  w: number,
  h: number,
  detail: string,
  person?: number,
) => objects.push({ kind, name, x, y, w, h, detail, person });
put(
  "desk",
  "相談用デスク",
  52,
  110,
  76,
  44,
  "ノートとマグカップがある。ここがどこか、まだわからない。",
);
put(
  "meeting",
  "会議テーブル",
  282,
  100,
  188,
  68,
  "八人掛けの会議テーブル。窓から午後の光が差し込んでいる。",
);
for (const [x, y] of [
  [560, 174],
  [650, 174],
  [770, 110],
  [862, 110],
])
  put(
    "desk",
    "個室のデスク",
    x,
    y,
    70,
    42,
    "薄い板が光っている。魔法の道具ではないらしい。",
  );
for (let row = 0; row < 2; row++)
  for (let col = 0; col < 6; col++)
    put(
      "desk",
      `${row ? "南" : "北"}列 ${col + 1}番デスク`,
      42 + col * 112,
      354 + row * 142,
      76,
      42,
      "キーボードとモニター。画面には見慣れない文字が並んでいる。",
      (row * 6 + col) % 4 === 0 ? undefined : row * 6 + col + 1,
    );
put(
  "vending",
  "自動販売機",
  884,
  340,
  42,
  90,
  "色とりどりの飲み物が並んでいる。今は小銭を持っていない。",
);
put(
  "table",
  "休憩テーブル",
  784,
  432,
  68,
  52,
  "小さな観葉植物と丸い椅子。ここなら少し落ち着けそうだ。",
);
put(
  "kitchen",
  "給湯カウンター",
  772,
  546,
  154,
  42,
  "コーヒーメーカー、流し台、食器棚。温かい香りがする。",
);
put(
  "water",
  "ウォーターサーバー",
  906,
  57,
  24,
  46,
  "水の入った透明なタンク。喉を潤しても、声は戻らなかった。",
);
for (const [x, y] of [
  [35, 570],
  [905, 574],
  [490, 66],
  [168, 66],
])
  put(
    "plant",
    "観葉植物",
    x,
    y,
    20,
    22,
    "青々とした葉。知らない世界にも、見覚えのある緑がある。",
  );
export const chairs: Rect[] = [];
for (const o of objects) {
  if (o.kind === "desk")
    chairs.push({ x: o.x + o.w / 2 - 9, y: o.y + o.h + 8, w: 18, h: 18 });
  if (o.kind === "meeting")
    for (let i = 0; i < 4; i++)
      for (const dy of [-22, 76])
        chairs.push({ x: o.x + 13 + i * 43, y: o.y + dy, w: 22, h: 20 });
  if (o.kind === "table")
    for (const [dx, dy] of [
      [7, -18],
      [40, -18],
      [7, 58],
      [40, 58],
    ])
      chairs.push({ x: o.x + dx, y: o.y + dy, w: 18, h: 18 });
}
export const coworkers = objects
  .filter((o) => o.person !== undefined)
  .map((o) => ({
    x: o.x + o.w / 2,
    y: o.y + o.h + 23,
    style: o.person!,
    name: [
      "結衣",
      "蓮",
      "美咲",
      "蒼",
      "陽菜",
      "拓海",
      "律",
      "真央",
      "誠",
      "杏",
      "楓",
      "悠",
    ][o.person! % 12],
  }));
export const spawn = { x: 500, y: 562 };
export function canOccupy(x: number, y: number, r = 8) {
  if (x < 22 + r || x > 938 - r || y < 49 + r || y > 594 - r) return false;
  return ![
    ...walls,
    ...objects,
    ...chairs,
    { x: 180, y: 113, w: 16, h: 14 },
    { x: 857, y: 165, w: 16, h: 14 },
  ].some((b) => {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w)),
      ny = Math.max(b.y, Math.min(y, b.y + b.h));
    return (x - nx) ** 2 + (y - ny) ** 2 < r * r;
  });
}
export function moveOffice(
  p: { x: number; y: number },
  dx: number,
  dy: number,
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 3));
  for (let i = 0; i < steps; i++) {
    if (canOccupy(p.x + dx / steps, p.y)) p.x += dx / steps;
    if (canOccupy(p.x, p.y + dy / steps)) p.y += dy / steps;
  }
}
