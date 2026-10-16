import { people, items, recipes, resources, fishByMap } from "./data.ts";
import { defaults } from "./life.ts";
import { maps } from "./maps.ts";
import type { Snapshot } from "./session.ts";
import { Session, species } from "./session.ts";
import { World } from "./state.ts";
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
interface RecordData {
  generation: number;
  checksum: string;
  data: Snapshot;
}
const PREFIX = "silent-castaway.v1.";
function object(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function number(v: unknown, min: number, max: number) {
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
}
export function checksum(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}
type Rule = string | { [key: string]: Rule } | Rule[];
function shape(value: unknown, rule: Rule): boolean {
  if (typeof rule === "string")
    return rule === "number"
      ? typeof value === "number" && Number.isFinite(value)
      : rule === "nullableString"
        ? value === null || typeof value === "string"
        : typeof value === rule;
  if (Array.isArray(rule))
    return (
      Array.isArray(value) &&
      value.length < 10000 &&
      value.every((v) => shape(v, rule[0]))
    );
  if (!object(value)) return false;
  if ("*" in rule)
    return (
      Object.keys(value).length < 20000 &&
      Object.values(value).every((v) => shape(v, rule["*"]))
    );
  return Object.entries(rule).every(([k, r]) => shape(value[k], r));
}
const lifeRule: Rule = {
  money: "number",
  hunger: "number",
  awakeSince: "number",
  wet: "number",
  cold: "number",
  coldAt: "number",
  protectedUntil: "number",
  weather: "string",
  weatherUntil: "number",
  social: {
    "*": {
      trust: "number",
      giftDay: "number",
      categories: ["string"],
      seen: ["string"],
    },
  },
  notes: [{ id: "number", npc: "string", at: "number", text: "string" }],
  quests: [
    {
      id: "string",
      giver: "string",
      item: "string",
      quantity: "number",
      deadline: "number",
      reward: "number",
      state: "string",
      wasMemoed: "boolean",
      reaskedOnce: "boolean",
    },
  ],
  gear: [
    {
      id: "string",
      name: "string",
      durability: "number",
      enhancedUntil: "number",
      element: "nullableString",
      elementUntil: "number",
    },
  ],
  equipment: { "*": "string" },
  nextId: "number",
  nodes: { "*": { left: "number", respawnAt: "number" } },
  fish: { "*": { stock: "number", at: "number" } },
  jobs: [
    {
      id: "number",
      npc: "string",
      recipe: "string",
      remaining: "number",
      state: "string",
      ingredients: { "*": "number" },
      price: "number",
      result: "string",
    },
  ],
  stocks: { "*": "number" },
  stockDay: "number",
  known: ["string"],
  fog: { "*": "string" },
  stakes: { "*": { x: "number", y: "number" } },
  xp: { "*": "number" },
  levels: { "*": "number" },
  shoeMinutes: "number",
  ending: "nullableString",
  gamePlayed: { "*": "number" },
};
export function validateSnapshot(v: unknown): Snapshot {
  if (
    !object(v) ||
    ![1, 2].includes(Number(v.version)) ||
    !Number.isInteger(v.rngSeed) ||
    !number(v.rngSeed, 0, 4294967295) ||
    !number(v.clock, 0, 1e12) ||
    !number(v.escapeGrace, 0, 3) ||
    !Object.hasOwn(maps, String(v.mapId)) ||
    !["up", "down", "left", "right"].includes(String(v.facing)) ||
    !number(v.x, 0, 1920) ||
    !number(v.y, 0, 1664)
  )
    throw new Error("保存データの形式・バージョンが正しくありません。");
  if (!object(v.story)) throw new Error("物語データが不正です。");
  const flags = v.story;
  if (
    !["rescued", "gathered", "trained", "wedge"].every((k) => flags[k] === true)
  )
    throw new Error("魂の楔の取得前のデータは保存できません。");
  if (
    !object(v.inventory) ||
    Object.keys(v.inventory).length > 1000 ||
    !Object.values(v.inventory).every(
      (n) => Number.isInteger(n) && number(n, 0, 1e6),
    ) ||
    v.inventory["魂の楔"] !== 1
  )
    throw new Error("所持品データが不正です。");
  const life = v.version === 1 ? defaults() : v.life;
  if (!shape(life, lifeRule))
    throw new Error("生活・人物・探索の保存データが不正です。");
  const systems = life as Snapshot["life"];
  if (
    !number(systems.money, 0, 1e9) ||
    !number(systems.hunger, 0, 100) ||
    !["clear", "rain", "fog"].includes(systems.weather) ||
    !["sword", "magic", "hp", "mp"].every(
      (k) =>
        Number.isInteger(systems.levels[k]) &&
        number(systems.levels[k], 1, 30) &&
        number(systems.xp[k], 0, 1e9),
    ) ||
    !Object.keys(defaults().social).every(
      (k) => systems.social[k] && number(systems.social[k].trust, -50, 100),
    )
  )
    throw new Error("生活データの数値が不正です。");
  const peopleIds = new Set(people.map((p) => p.id)),
    gearIds = new Set(systems.gear.map((g) => g.id));
  if (
    gearIds.size !== systems.gear.length ||
    systems.gear.some(
      (g) =>
        !items[g.name] ||
        items[g.name].category !== "gear" ||
        !Number.isInteger(g.durability) ||
        !number(g.durability, 1, items[g.name].durability!) ||
        !number(g.enhancedUntil, 0, 1e12) ||
        !number(g.elementUntil, 0, 1e12) ||
        !["fire", "water", "thunder", null].includes(g.element),
    )
  )
    throw new Error("装備データが不正です。");
  if (
    Object.entries(systems.equipment).some(
      ([slot, id]) =>
        !["weapon", "head", "body", "shoes", "shield"].includes(slot) ||
        !gearIds.has(id) ||
        items[systems.gear.find((g) => g.id === id)!.name].slot !== slot,
    )
  )
    throw new Error("装備部位が不正です。");
  if (
    systems.notes.some(
      (n) =>
        !peopleIds.has(n.npc) ||
        n.text.length > 10000 ||
        !number(n.at, 0, 1e12),
    ) ||
    systems.quests.some(
      (q) =>
        !peopleIds.has(q.giver) ||
        (!Object.hasOwn(items, q.item) && q.item !== "アジ") ||
        !Number.isInteger(q.quantity) ||
        !number(q.quantity, 1, 1e6) ||
        !number(q.deadline, 0, 1e12) ||
        !["accepted", "completed", "failed", "declined"].includes(q.state),
    )
  )
    throw new Error("メモ・依頼データが不正です。");
  if (
    systems.jobs.some(
      (j) =>
        !peopleIds.has(j.npc) ||
        !items[j.result] ||
        !["queued", "working", "ready"].includes(j.state) ||
        !number(j.remaining, 0, 1e6) ||
        (j.gear && !gearIds.has(j.gear)),
    )
  )
    throw new Error("作業データが不正です。");
  for (const [map, mask] of Object.entries(systems.fog))
    if (
      !Object.hasOwn(maps, map) ||
      mask.length !==
        maps[map as keyof typeof maps].width *
          maps[map as keyof typeof maps].height ||
      !/^[01]*$/.test(mask)
    )
      throw new Error("探索地図データが不正です。");
  for (const [map, stake] of Object.entries(systems.stakes)) {
    if (!Object.hasOwn(maps, map) || maps[map as keyof typeof maps].interior)
      throw new Error("転移杭データが不正です。");
    const w = new World();
    w.mapId = map as keyof typeof maps;
    if (!w.canStand(stake.x, stake.y))
      throw new Error("転移杭の位置が不正です。");
  }
  for (const [key, node] of Object.entries(systems.nodes)) {
    const [map, index] = key.split(":");
    if (
      !Object.hasOwn(maps, map) ||
      !resources[Number(index)] ||
      !Number.isInteger(node.left) ||
      !number(node.left, 0, 3) ||
      !number(node.respawnAt, 0, 1e12)
    )
      throw new Error("資源データが不正です。");
  }
  if (
    !number(v.hp, 1, 120 + 8 * (systems.levels.hp - 1)) ||
    !number(v.mp, 0, 160 + 10 * (systems.levels.mp - 1))
  )
    throw new Error("能力値が不正です。");
  if (
    !Array.isArray(v.enemies) ||
    v.enemies.length < 6 ||
    v.enemies.length > 100
  )
    throw new Error("魔物データが不正です。");
  const ids = new Set();
  for (const e of v.enemies) {
    if (
      !object(e) ||
      !Object.hasOwn(species, String(e.kind)) ||
      e.kind === "fowl" ||
      (e.mapId !== undefined &&
        (!Object.hasOwn(maps, String(e.mapId)) ||
          maps[e.mapId as keyof typeof maps].interior)) ||
      typeof e.id !== "string" ||
      ids.has(e.id) ||
      !number(e.x, 0, 1920) ||
      !number(e.y, 0, 1664) ||
      !number(e.hp, 0, species[e.kind as keyof typeof species].hp) ||
      !number(e.respawnAt, 0, 1e12) ||
      !number(e.heading, -100, 100) ||
      !number(e.aiTimer, -1, 10)
    )
      throw new Error("魔物データが不正です。");
    ids.add(e.id);
  }
  const result = structuredClone({
    ...v,
    version: 2,
    life: systems,
  }) as unknown as Snapshot;
  if (v.version === 1) {
    result.enemies.push(...new Session().enemies.slice(6));
    delete result.inventory["流木"];
  }
  const activity = object(v.activity)
    ? v.activity
    : { action: null, play: null, pendingMemo: null, interaction: null };
  if (activity.action !== null) {
    const a = activity.action;
    if (
      !object(a) ||
      !["gather", "fish"].includes(String(a.kind)) ||
      typeof a.id !== "string" ||
      !number(a.remaining, 0, 3600) ||
      !number(a.minutes, 3, 60) ||
      typeof a.enhanced !== "boolean" ||
      (a.tool !== undefined && !gearIds.has(String(a.tool)))
    )
      throw new Error("行動中の保存データが不正です。");
  }
  if (
    activity.play !== null &&
    (!shape(activity.play, {
      npc: "string",
      kind: "string",
      until: "number",
      x: "number",
      y: "number",
    }) ||
      !people.some(
        (p) => p.id === (activity.play as { npc: string }).npc && p.child,
      ))
  )
    throw new Error("遊びの保存データが不正です。");
  if (
    activity.pendingMemo !== null &&
    !shape(activity.pendingMemo, { npc: "string", text: "string" })
  )
    throw new Error("会話の保存データが不正です。");
  if (
    activity.interaction !== null &&
    !shape(activity.interaction, {
      kind: "string",
      id: "string",
      title: "string",
      text: "string",
    })
  )
    throw new Error("会話の保存データが不正です。");
  if (object(activity.action)) {
    const a = activity.action;
    if (a.kind === "gather") {
      const [map, index] = String(a.id).split(":");
      if (!Object.hasOwn(maps, map) || !resources[Number(index)])
        throw new Error("採集中の対象が不正です。");
    } else if (!Object.hasOwn(fishByMap, String(a.id)))
      throw new Error("釣り場が不正です。");
  }
  if (object(activity.interaction)) {
    const i = activity.interaction;
    if (
      !["person", "resource", "fishing", "home", "stake", "altar"].includes(
        String(i.kind),
      ) ||
      (i.kind === "person" && !peopleIds.has(String(i.id)))
    )
      throw new Error("会話相手が不正です。");
  }
  if (
    object(activity.pendingMemo) &&
    !peopleIds.has(String(activity.pendingMemo.npc))
  )
    throw new Error("メモの話者が不正です。");
  result.activity = structuredClone(
    activity,
  ) as unknown as Snapshot["activity"];
  const w = new World();
  w.mapId = result.mapId;
  if (!w.canStand(result.x, result.y))
    throw new Error("保存位置が通行できない場所です。");
  return result;
}

function parse(raw: string): RecordData {
  if (raw.length > 1_000_000) throw new Error("保存データが大きすぎます。");
  const record: unknown = JSON.parse(raw);
  if (
    !object(record) ||
    !Number.isSafeInteger(record.generation) ||
    !number(record.generation, 1, Number.MAX_SAFE_INTEGER) ||
    typeof record.checksum !== "string" ||
    record.checksum !== checksum(JSON.stringify(record.data))
  )
    throw new Error("保存データのチェックサムが一致しません。");
  return {
    generation: record.generation as number,
    checksum: record.checksum,
    data: validateSnapshot(record.data),
  };
}
export class SaveStore {
  private storage: StorageLike;
  constructor(storage: StorageLike) {
    this.storage = storage;
  }
  private entries() {
    return ["A", "B"]
      .map((slot) => {
        const raw = this.storage.getItem(PREFIX + slot);
        if (!raw) return null;
        try {
          return { slot, record: parse(raw) };
        } catch {
          return null;
        }
      })
      .filter((e) => e !== null)
      .sort((a, b) => b.record.generation - a.record.generation);
  }
  load() {
    const data = this.entries()[0]?.record.data;
    if (data) return data;
    if (["A", "B"].some((slot) => this.storage.getItem(PREFIX + slot) !== null))
      throw new Error(
        "保存データが破損しています。正常なJSONを読み込んでください。",
      );
    return null;
  }
  save(snapshot: Snapshot) {
    const data = validateSnapshot(snapshot),
      previous = this.entries()[0];
    const generation = (previous?.record.generation ?? 0) + 1;
    const raw = JSON.stringify({
      generation,
      checksum: checksum(JSON.stringify(data)),
      data,
    });
    // Write the older slot; never overwrite the newest valid generation first.
    const slot = previous?.slot === "A" ? "B" : "A";
    this.storage.setItem(PREFIX + slot, raw);
    return data;
  }
  export(snapshot: Snapshot) {
    const data = validateSnapshot(snapshot);
    return JSON.stringify(
      { generation: 1, checksum: checksum(JSON.stringify(data)), data },
      null,
      2,
    );
  }
  import(raw: string) {
    const data = parse(raw).data;
    this.save(data);
    return data;
  }
}
