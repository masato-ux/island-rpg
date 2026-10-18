import type { MapId, OutdoorId } from "./maps.ts";
export interface Person {
  id: string;
  name: string;
  role: string;
  open: number;
  close: number;
  home: MapId;
  x: number;
  y: number;
  child?: boolean;
  shop?: string[];
  quest: string;
  quantity: number;
  days: number;
  reward: number;
  likes: string;
}
export const people: Person[] = [
  {
    id: "N01",
    name: "ロアン",
    role: "村長",
    open: 7,
    close: 19,
    home: "CHIEF",
    x: 29,
    y: 17,
    shop: [],
    quest: "木材",
    quantity: 3,
    days: 3,
    reward: 80,
    likes: "魔力結晶",
  },
  {
    id: "N02",
    name: "ミレナ",
    role: "村長の妻",
    open: 6.5,
    close: 20,
    home: "CHIEF",
    x: 31,
    y: 17,
    quest: "野菜",
    quantity: 2,
    days: 1,
    reward: 30,
    likes: "野菜スープ",
  },
  {
    id: "N03",
    name: "リッカ",
    role: "村長の娘",
    open: 9,
    close: 17,
    home: "CHIEF",
    x: 28,
    y: 18,
    child: true,
    quest: "遊び",
    quantity: 1,
    days: 1,
    reward: 0,
    likes: "貝殻",
  },
  {
    id: "N04",
    name: "ベルド",
    role: "農家",
    open: 6,
    close: 18,
    home: "FARM",
    x: 33,
    y: 25,
    quest: "木の枝",
    quantity: 3,
    days: 1,
    reward: 25,
    likes: "焼き魚",
  },
  {
    id: "N05",
    name: "ナナ",
    role: "農家の妻",
    open: 7,
    close: 18,
    home: "FARM",
    x: 36,
    y: 25,
    shop: ["野菜", "種", "肥料", "野菜スープ"],
    quest: "薬草",
    quantity: 3,
    days: 1,
    reward: 35,
    likes: "きのこ",
  },
  {
    id: "N06",
    name: "トト",
    role: "農家の子供",
    open: 9,
    close: 17,
    home: "FARM",
    x: 34,
    y: 26,
    child: true,
    quest: "遊び",
    quantity: 1,
    days: 1,
    reward: 0,
    likes: "貝殻",
  },
  {
    id: "N07",
    name: "ダン",
    role: "畜産家",
    open: 5.5,
    close: 18,
    home: "RANCH",
    x: 16,
    y: 30,
    quest: "草",
    quantity: 5,
    days: 0,
    reward: 20,
    likes: "焼き魚",
  },
  {
    id: "N08",
    name: "エマ",
    role: "畜産家の妻",
    open: 6,
    close: 18,
    home: "RANCH",
    x: 12,
    y: 25,
    shop: ["獣肉", "皮", "飼料", "焼き肉"],
    quest: "きのこ",
    quantity: 2,
    days: 1,
    reward: 30,
    likes: "きのこ炒め",
  },
  {
    id: "N09",
    name: "ルル",
    role: "畜産家の子供",
    open: 9,
    close: 17,
    home: "RANCH",
    x: 15,
    y: 25,
    child: true,
    quest: "遊び",
    quantity: 1,
    days: 1,
    reward: 0,
    likes: "貝殻",
  },
  {
    id: "N10",
    name: "ガルム",
    role: "鍛冶屋",
    open: 8,
    close: 18,
    home: "SMITH",
    x: 21,
    y: 25,
    shop: [
      "木剣",
      "鉄剣",
      "鋼剣",
      "布帽",
      "革帽",
      "布服",
      "革鎧",
      "旅靴",
      "革靴",
      "木盾",
      "鉄盾",
      "石斧",
      "鉄斧",
      "名工斧",
      "石ツルハシ",
      "鉄ツルハシ",
      "名工ツルハシ",
      "草刈り鎌",
      "鉄鎌",
      "名工鎌",
      "鉄鉱石",
    ],
    quest: "鉄鉱石",
    quantity: 2,
    days: 3,
    reward: 100,
    likes: "希少鉱石",
  },
  {
    id: "N11",
    name: "セラ",
    role: "薬屋",
    open: 9,
    close: 17,
    home: "APOTHECARY",
    x: 28,
    y: 25,
    shop: ["薬草", "回復薬", "風邪薬"],
    quest: "薬草",
    quantity: 5,
    days: 1,
    reward: 50,
    likes: "湿地草",
  },
  {
    id: "N12",
    name: "ヨハン",
    role: "漁師",
    open: 4.5,
    close: 13,
    home: "HOME",
    x: 31,
    y: 35,
    shop: ["ミミズ", "虫", "小魚", "エビ", "木竿", "丈夫な竿", "名工竿"],
    quest: "魚",
    quantity: 2,
    days: 1,
    reward: 45,
    likes: "タイ・大",
  },
];
export type Slot = "weapon" | "head" | "body" | "shoes" | "shield";
export interface Item {
  price: number;
  category: "material" | "food" | "medicine" | "bait" | "gear" | "key";
  food?: number;
  slot?: Slot;
  atk?: number;
  def?: number;
  spd?: number;
  durability?: number;
  tool?: "axe" | "pick" | "sickle" | "rod";
  tier?: number;
}
export const items: Record<string, Item> = {};
function add(
  names: string[],
  price: number,
  category: Item["category"] = "material",
) {
  for (const name of names) items[name] = { price, category };
}
add(["草", "木の枝", "貝殻", "水"], 5);
add(
  [
    "薬草",
    "きのこ",
    "木材",
    "石",
    "粘液",
    "小さな皮",
    "鉄くず",
    "皮",
    "獣肉",
    "鱗",
    "野菜",
    "種",
    "肥料",
    "飼料",
  ],
  20,
);
add(["硬木", "鉄鉱石", "湿地草", "上質な皮"], 60);
add(["希少鉱石", "魔力結晶", "遺物"], 150);
add(["空き瓶", "古靴", "流木", "金属片"], 8);
add(["ミミズ", "虫", "小魚", "エビ"], 5, "bait");
add(["回復薬", "風邪薬"], 35, "medicine");
add(["紙とペン", "魔法の袋", "魂の楔"], 0, "key");
add(["転移杭"], 80, "material");
for (const [name, price, food] of [
  ["焼き魚", 40, 25],
  ["焼き肉", 45, 30],
  ["きのこ炒め", 30, 18],
  ["野菜スープ", 30, 20],
  ["保存食", 55, 35],
  ["失敗料理", 1, 8],
] as const)
  items[name] = { price, category: "food", food };
for (const [suffix, mult] of [
  ["小", 0.8],
  ["普通", 1],
  ["大", 1.5],
] as const)
  items[`焼き魚・${suffix}`] = {
    category: "food",
    price: Math.floor(40 * mult),
    food: 25 * mult,
  };
export const fishPrices: Record<string, number> = {
  イワシ: 10,
  アジ: 18,
  タイ: 55,
  フナ: 12,
  アユ: 25,
  コイ: 30,
  カサゴ: 32,
  湖の大魚: 80,
};
for (const [name, price] of Object.entries(fishPrices))
  for (const [suffix, mult] of [
    ["小", 0.7],
    ["普通", 1],
    ["大", 1.8],
  ] as const)
    items[`${name}・${suffix}`] = {
      price: Math.floor(price * mult),
      category: "material",
    };
for (const row of [
  ["流木", "weapon", 2, 0, 0, 30, 8],
  ["木剣", "weapon", 8, 0, 0, 40, 60],
  ["鉄剣", "weapon", 18, 0, 0, 70, 240],
  ["鋼剣", "weapon", 31, 0, 0, 100, 650],
  ["布帽", "head", 0, 2, 0, 35, 30],
  ["革帽", "head", 0, 5, 0, 60, 130],
  ["布服", "body", 0, 4, 0, 50, 50],
  ["革鎧", "body", 0, 12, 0, 80, 260],
  ["旅靴", "shoes", 0, 0, 3, 45, 50],
  ["革靴", "shoes", 0, 0, 7, 65, 180],
  ["木盾", "shield", 0, 6, 0, 50, 70],
  ["鉄盾", "shield", 0, 13, 0, 90, 320],
] as const) {
  const [name, slot, atk, def, spd, durability, price] = row;
  items[name] = { category: "gear", slot, atk, def, spd, durability, price };
}
for (const [tool, names] of [
  ["axe", ["石斧", "鉄斧", "名工斧"]],
  ["pick", ["石ツルハシ", "鉄ツルハシ", "名工ツルハシ"]],
  ["sickle", ["草刈り鎌", "鉄鎌", "名工鎌"]],
  ["rod", ["木竿", "丈夫な竿", "名工竿"]],
] as const)
  names.forEach(
    (name, i) =>
      (items[name] = {
        category: "gear",
        tool,
        tier: i + 1,
        durability: [40, 70, 100][i],
        price: [60, 220, 650][i],
      }),
  );
export interface Recipe {
  id: string;
  name: string;
  crafter: string;
  ingredients: Record<string, number>;
  price: number;
  minutes: number;
  result: string;
}
export const recipes: Recipe[] = [
  {
    id: "cook-fish",
    name: "焼き魚",
    crafter: "HOME",
    ingredients: { 魚: 1, 木の枝: 1 },
    price: 0,
    minutes: 0,
    result: "焼き魚",
  },
  {
    id: "cook-meat",
    name: "焼き肉",
    crafter: "HOME",
    ingredients: { 獣肉: 1, 木の枝: 1 },
    price: 0,
    minutes: 0,
    result: "焼き肉",
  },
  {
    id: "cook-mushroom",
    name: "きのこ炒め",
    crafter: "HOME",
    ingredients: { きのこ: 2 },
    price: 0,
    minutes: 0,
    result: "きのこ炒め",
  },
  {
    id: "cook-soup",
    name: "野菜スープ",
    crafter: "HOME",
    ingredients: { 野菜: 2, 草: 1 },
    price: 0,
    minutes: 0,
    result: "野菜スープ",
  },
  {
    id: "cook-ration",
    name: "保存食",
    crafter: "HOME",
    ingredients: { 獣肉: 1, 草: 1 },
    price: 0,
    minutes: 0,
    result: "保存食",
  },
  {
    id: "home-cold",
    name: "風邪薬",
    crafter: "HOME",
    ingredients: { 薬草: 2, 水: 1 },
    price: 0,
    minutes: 0,
    result: "風邪薬",
  },
  {
    id: "stake",
    name: "転移杭",
    crafter: "N01",
    ingredients: { 木材: 3, 魔力結晶: 1 },
    price: 80,
    minutes: 120,
    result: "転移杭",
  },
  {
    id: "heal",
    name: "回復薬",
    crafter: "N11",
    ingredients: { 薬草: 2 },
    price: 15,
    minutes: 30,
    result: "回復薬",
  },
];
for (const [name, item] of Object.entries(items))
  if (item.category === "gear" && name !== "流木")
    recipes.push({
      id: `craft-${name}`,
      name,
      crafter: name.includes("竿") ? "N12" : "N10",
      ingredients: {
        [item.tier && item.tier > 1
          ? "鉄鉱石"
          : item.slot === "body"
            ? "皮"
            : "木材"]: item.tier || 2,
      },
      price: Math.floor(item.price * 0.5),
      minutes: 60 * (item.tier === 3 ? 4 : item.tier || 2),
      result: name,
    });
export interface ResourceDef {
  item: string;
  tool?: Item["tool"];
  tier: number;
  minutes: number;
  respawn: number;
}
export const resources: ResourceDef[] = [
  { item: "草", tier: 0, minutes: 5, respawn: 90 },
  { item: "薬草", tier: 0, minutes: 5, respawn: 90 },
  { item: "きのこ", tier: 0, minutes: 5, respawn: 90 },
  { item: "木の枝", tool: "axe", tier: 1, minutes: 5, respawn: 90 },
  { item: "木材", tool: "axe", tier: 1, minutes: 15, respawn: 180 },
  { item: "硬木", tool: "axe", tier: 2, minutes: 30, respawn: 180 },
  { item: "石", tool: "pick", tier: 1, minutes: 5, respawn: 180 },
  { item: "鉄鉱石", tool: "pick", tier: 2, minutes: 15, respawn: 180 },
  { item: "希少鉱石", tool: "pick", tier: 3, minutes: 60, respawn: 360 },
  { item: "湿地草", tool: "sickle", tier: 2, minutes: 15, respawn: 90 },
  { item: "魔力結晶", tool: "pick", tier: 3, minutes: 60, respawn: 360 },
  { item: "ミミズ", tier: 0, minutes: 5, respawn: 90 },
  { item: "虫", tier: 0, minutes: 5, respawn: 90 },
];
export const resourceIndices: Record<OutdoorId, number[]> = {
  VIL: [0, 1, 11],
  GRASS: [0, 1, 3, 12],
  SFOREST: [2, 4, 3, 11],
  CFOREST: [4, 5, 2],
  WEST: [6, 7, 8],
  EAST: [9, 1],
  MOUNT: [7, 8],
  NORTH: [10, 8],
};
export const fishByMap: Partial<Record<MapId, string[]>> = {
  VIL: ["イワシ", "アジ", "タイ"],
  SFOREST: ["フナ", "アユ"],
  WEST: ["アジ", "カサゴ", "タイ"],
  EAST: ["フナ", "コイ", "湖の大魚"],
};
