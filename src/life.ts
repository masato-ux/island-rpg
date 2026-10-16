import type { Session } from "./session.ts";
import {
  people,
  items,
  recipes,
  resources,
  resourceIndices,
  fishByMap,
  fishPrices,
  type Person,
} from "./data.ts";
import dialogues from "./data/dialogues.json" with { type: "json" };
import {
  maps,
  outdoors,
  isBlocked,
  tileAt,
  type MapId,
  type OutdoorId,
} from "./maps.ts";
export interface Note {
  id: number;
  npc: string;
  at: number;
  text: string;
  quest?: string;
}
export interface Quest {
  id: string;
  giver: string;
  item: string;
  quantity: number;
  deadline: number;
  reward: number;
  state: "accepted" | "completed" | "failed" | "declined";
  wasMemoed: boolean;
  reaskedOnce: boolean;
}
export interface Social {
  trust: number;
  giftDay: number;
  categories: string[];
  seen: string[];
}
export interface Gear {
  id: string;
  name: string;
  durability: number;
  enhancedUntil: number;
  element: "fire" | "water" | "thunder" | null;
  elementUntil: number;
}
export interface NodeState {
  left: number;
  respawnAt: number;
}
export interface Job {
  id: number;
  npc: string;
  recipe: string;
  remaining: number;
  state: "queued" | "working" | "ready";
  ingredients: Record<string, number>;
  price: number;
  gear?: string;
  result: string;
}
export interface LifeData {
  money: number;
  hunger: number;
  awakeSince: number;
  wet: number;
  cold: number;
  coldAt: number;
  protectedUntil: number;
  weather: "clear" | "rain" | "fog";
  weatherUntil: number;
  social: Record<string, Social>;
  notes: Note[];
  quests: Quest[];
  gear: Gear[];
  equipment: Record<string, string>;
  nextId: number;
  nodes: Record<string, NodeState>;
  fish: Record<string, { stock: number; at: number }>;
  jobs: Job[];
  stocks: Record<string, number>;
  stockDay: number;
  known: string[];
  fog: Record<string, string>;
  stakes: Record<string, { x: number; y: number }>;
  xp: Record<string, number>;
  levels: Record<string, number>;
  shoeMinutes: number;
  ending: "released" | "silent" | null;
  gamePlayed: Record<string, number>;
}
export function defaults(): LifeData {
  return {
    money: 30,
    hunger: 100,
    awakeSince: 8 * 3600,
    wet: 0,
    cold: 0,
    coldAt: 0,
    protectedUntil: 0,
    weather: "clear",
    weatherUntil: 12 * 3600,
    social: Object.fromEntries(
      people.map((p) => [
        p.id,
        {
          trust: p.id === "N07" ? 15 : 0,
          giftDay: -1,
          categories: [],
          seen: [],
        },
      ]),
    ),
    notes: [],
    quests: [],
    gear: [
      {
        id: "driftwood",
        name: "流木",
        durability: 30,
        enhancedUntil: 0,
        element: null,
        elementUntil: 0,
      },
    ],
    equipment: { weapon: "driftwood" },
    nextId: 1,
    nodes: {},
    fish: {},
    jobs: [],
    stocks: {},
    stockDay: 0,
    known: [],
    fog: {},
    stakes: { VIL: { x: 24 * 16 + 8, y: 25 * 16 + 8 } },
    xp: { sword: 0, magic: 0, hp: 0, mp: 0 },
    levels: { sword: 1, magic: 1, hp: 1, mp: 1 },
    shoeMinutes: 0,
    ending: null,
    gamePlayed: {},
  };
}
export interface Interaction {
  kind: "person" | "resource" | "fishing" | "home" | "stake" | "altar";
  id: string;
  title: string;
  text: string;
}
export interface Action {
  kind: "gather" | "fish";
  id: string;
  remaining: number;
  minutes: number;
  tool?: string;
  bait?: string;
  required?: number;
  enhanced: boolean;
}
export interface Play {
  npc: string;
  kind: "tag" | "hide";
  until: number;
  x: number;
  y: number;
}
export interface Activity {
  action: Action | null;
  play: Play | null;
  pendingMemo: { npc: string; text: string; quest?: string } | null;
  interaction: Interaction | null;
}
export class Life {
  data = defaults();
  interaction: Interaction | null = null;
  pendingMemo: { npc: string; text: string; quest?: string } | null = null;
  action: Action | null = null;
  gesture: { kind: string; until: number } | null = null;
  play: {
    npc: string;
    kind: "tag" | "hide";
    until: number;
    x: number;
    y: number;
  } | null = null;
  private session: Session;
  private fogCell = "";
  constructor(session: Session) {
    this.session = session;
  }
  snapshotActivity(): Activity {
    return structuredClone({
      action: this.action,
      play: this.play,
      pendingMemo: this.pendingMemo,
      interaction: this.interaction,
    });
  }
  restoreActivity(value: Activity | undefined) {
    if (!value) return;
    this.action = structuredClone(value.action);
    this.play = structuredClone(value.play);
    this.pendingMemo = structuredClone(value.pendingMemo);
    this.interaction = structuredClone(value.interaction);
  }
  get day() {
    return Math.floor(this.session.clock / 86400);
  }
  get maxHp() {
    return 120 + 8 * (this.data.levels.hp - 1);
  }
  get maxMp() {
    return 160 + 10 * (this.data.levels.mp - 1);
  }
  get awakeHours() {
    return (this.session.clock - this.data.awakeSince) / 3600;
  }
  get fatigue() {
    return this.awakeHours >= 20 ? 15 : this.awakeHours >= 16 ? 5 : 0;
  }
  position(person: Person): {
    map: MapId;
    x: number;
    y: number;
    sleeping: boolean;
  } {
    if (this.play?.npc === person.id)
      return { map: "VIL", x: this.play.x, y: this.play.y, sleeping: false };
    const s = this.session,
      hour = (s.clock / 3600) % 24;
    if (person.id === "N07" && !s.story.wedge)
      return {
        ...(s.story.rescued ? { x: 264, y: 488 } : { x: 408, y: 552 }),
        map: "VIL",
        sleeping: false,
      };
    if (person.id === "N01" && !s.story.wedge)
      return { map: "VIL", x: 472, y: 280, sleeping: false };
    const sleep =
      person.id === "N12" ? hour >= 20 || hour < 3.5 : hour >= 21 || hour < 6;
    if (hour < person.open || hour >= person.close)
      return {
        map: person.home,
        x: (3 + (Number(person.id.slice(1)) % 4)) * 16 + 8,
        y: 72,
        sleeping: sleep,
      };
    // A deterministic commute along a collision-free path at the start/end of work.
    const b = maps.VIL.buildings.find((b) => b.interior === person.home),
      door = b
        ? { x: (b.x + b.w / 2) * 16 + 8, y: (b.y + b.h) * 16 + 8 }
        : { x: 392, y: 520 };
    const progress = Math.min(
      1,
      (hour - person.open) * 4,
      (person.close - hour) * 4,
    );
    const path = this.route(
      door.x,
      door.y,
      person.x * 16 + 8,
      person.y * 16 + 8,
    );
    const index = Math.min(
        path.length - 1,
        Math.floor(progress * (path.length - 1)),
      ),
      at = path[index] || { x: person.x * 16 + 8, y: person.y * 16 + 8 };
    return { map: "VIL", ...at, sleeping: false };
  }
  private routes = new Map<string, { x: number; y: number }[]>();
  private route(ax: number, ay: number, bx: number, by: number) {
    const key = `${ax},${ay},${bx},${by}`;
    const cached = this.routes.get(key);
    if (cached) return cached;
    const start = [Math.floor(ax / 16), Math.floor(ay / 16)],
      goal = `${Math.floor(bx / 16)},${Math.floor(by / 16)}`,
      queue = [start],
      previous = new Map<string, string | null>([[start.join(","), null]]);
    let found = false;
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i],
        k = `${x},${y}`;
      if (k === goal) {
        found = true;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          nk = `${nx},${ny}`;
        if (!previous.has(nk) && !isBlocked(maps.VIL, nx, ny)) {
          previous.set(nk, k);
          queue.push([nx, ny]);
        }
      }
    }
    const path: { x: number; y: number }[] = [];
    if (found) {
      let k: string | null = goal;
      while (k) {
        const [x, y] = k.split(",").map(Number);
        path.unshift({ x: x * 16 + 8, y: y * 16 + 8 });
        k = previous.get(k) ?? null;
      }
    }
    if (!path.length) path.push({ x: bx, y: by });
    this.routes.set(key, path);
    return path;
  }
  trust(npc: string, delta: number, category: string) {
    const social = this.data.social[npc];
    if (!social) return;
    if (delta > 0 && !social.categories.includes(category))
      social.categories.push(category);
    social.trust = Math.max(
      -50,
      Math.min(social.categories.length >= 2 ? 100 : 59, social.trust + delta),
    );
  }
  availableTopics(npc: string) {
    const social = this.data.social[npc],
      p = people.find((p) => p.id === npc)!,
      hour = (this.session.clock / 3600) % 24;
    return dialogues.filter(
      (d) =>
        d.speaker === npc &&
        (d.kind !== "trust25" || social.trust >= 25) &&
        (d.kind !== "trust60" || social.trust >= 60) &&
        (!d.kind.startsWith("trust") || !social.seen.includes(d.id)) &&
        (d.kind !== "time" || hour < 9 || hour >= 17) &&
        (d.kind !== "location" || this.session.world.mapId === p.home),
    );
  }
  topic(npc: string, id: string) {
    const p = people.find((p) => p.id === npc)!,
      social = this.data.social[npc],
      d = dialogues.find((d) => d.id === id && d.speaker === npc);
    if (!d || !this.availableTopics(npc).some((t) => t.id === id)) return;
    if (
      (d.kind === "trust25" && social.trust < 25) ||
      (d.kind === "trust60" && social.trust < 60)
    )
      return;
    if (d.kind.startsWith("trust") && social.seen.includes(id)) return;
    if (d.kind.startsWith("trust")) social.seen.push(id);
    const rumor = Object.entries(this.data.social).find(
      ([id, person]) => id !== npc && person.trust >= 25,
    );
    this.session.message = `${p.name}「${d.text}」${rumor ? "（" + people.find((p) => p.id === rumor[0])!.name + "から、あなたの働きを聞いたようだ）" : ""}`;
    for (const r of recipes.filter((r) => r.crafter === "HOME"))
      if (d.text.includes(r.name) && !this.data.known.includes(r.name))
        this.data.known.push(r.name);
    this.pendingMemo = { npc, text: d.memoSummary };
    this.interaction = null;
  }
  memo(yes: boolean) {
    const pending = this.pendingMemo;
    if (yes && pending) {
      this.data.notes.unshift({
        id: this.data.nextId++,
        npc: pending.npc,
        at: this.session.clock,
        text: pending.text,
        quest: pending.quest,
      });
      const quest = this.data.quests.find((q) => q.id === pending.quest);
      if (quest) quest.wasMemoed = true;
    }
    this.pendingMemo = null;
  }
  removeNote(id: number) {
    this.data.notes = this.data.notes.filter((n) => n.id !== id);
  }
  get personInfo() {
    return people.filter((p) => this.data.notes.some((n) => n.npc === p.id));
  }
  offer(npc: string) {
    const p = people.find((p) => p.id === npc)!;
    if (p.child) {
      this.session.message = "子供の依頼は遊びです。";
      return;
    }
    const existing = this.data.quests.find(
      (q) => q.giver === npc && q.state === "accepted",
    );
    if (existing) {
      if (!existing.wasMemoed && !existing.reaskedOnce) {
        existing.reaskedOnce = true;
        this.session.message = `${p.name}「${existing.item}を${existing.quantity}個。期限は${this.date(existing.deadline)}だ」`;
        this.pendingMemo = null;
      } else
        this.session.message = existing.wasMemoed
          ? "記録したメモを確認しよう。"
          : "一度だけの再確認は済んでいる。";
      return;
    }
    this.interaction = {
      kind: "person",
      id: npc,
      title: p.name,
      text: `${p.quest} ×${p.quantity}を${this.date(this.deadline(p))}まで。報酬${p.reward}銅貨。`,
    };
  }
  deadline(p: Person) {
    let time = (this.day + p.days) * 86400 + p.close * 3600;
    if (time <= this.session.clock) time += 86400;
    return time;
  }
  accept(npc: string) {
    const p = people.find((p) => p.id === npc)!;
    if (
      p.child ||
      this.data.quests.some(
        (q) =>
          q.giver === npc &&
          (q.state === "accepted" || q.id.startsWith(`${npc}-${this.day}-`)),
      )
    ) {
      this.session.message =
        "今日の依頼はすでに受けている。新しい依頼は翌日から。";
      return;
    }
    const quest: Quest = {
      id: `${npc}-${this.day}-${this.data.nextId++}`,
      giver: npc,
      item: p.quest,
      quantity: p.quantity,
      deadline: this.deadline(p),
      reward: p.reward,
      state: "accepted",
      wasMemoed: false,
      reaskedOnce: false,
    };
    this.data.quests.push(quest);
    this.pendingMemo = {
      npc,
      text: `依頼：${p.quest} ×${p.quantity}、期限${this.date(quest.deadline)}、報酬${p.reward}銅貨`,
      quest: quest.id,
    };
    this.session.message = "依頼を受けた。メモを取りますか？";
    this.interaction = null;
  }
  deliver(npc: string) {
    const q = this.data.quests.find(
      (q) => q.giver === npc && q.state === "accepted",
    );
    if (!q || this.session.clock > q.deadline) return;
    const p = people.find((p) => p.id === npc)!;
    if (!this.available(p, false)) return;
    if (!this.take(q.item, q.quantity)) {
      this.session.message = "納品数がそろっていない。";
      return;
    }
    q.state = "completed";
    this.data.money += q.reward;
    this.trust(npc, 8, "quest");
    this.session.message = `依頼を完了し${q.reward}銅貨を受け取った。`;
  }
  decline(npc: string) {
    const q = this.data.quests.find(
      (q) => q.giver === npc && q.state === "accepted",
    );
    if (q) {
      q.state = "declined";
      this.trust(npc, -2, "quest");
      this.session.message = "依頼を辞退した。";
    }
  }
  date(at: number) {
    const m = Math.floor(at / 60);
    return `${Math.floor(m / 1440) + 1}日 ${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  }
  count(name: string) {
    return Object.entries(this.session.inventory)
      .filter(
        ([id]) =>
          id === name ||
          (name === "魚" && id.includes("・")) ||
          (name === "アジ" && id.startsWith("アジ・")),
      )
      .reduce((sum, [, n]) => sum + n, 0);
  }
  take(name: string, n: number) {
    if (this.count(name) < n) return false;
    for (const id of Object.keys(this.session.inventory)) {
      if (
        id !== name &&
        !(name === "魚" && id.includes("・")) &&
        !(name === "アジ" && id.startsWith("アジ・"))
      )
        continue;
      const used = Math.min(n, this.session.inventory[id]);
      this.session.inventory[id] -= used;
      n -= used;
      if (this.session.inventory[id] === 0) delete this.session.inventory[id];
      if (n === 0) break;
    }
    return true;
  }
  gain(name: string, n = 1) {
    if (!this.data.known.includes(`seen-item:${name}`))
      this.data.known.push(`seen-item:${name}`);
    if (items[name]?.category === "gear") {
      for (let i = 0; i < n; i++)
        this.data.gear.push({
          id: `gear-${this.data.nextId++}`,
          name,
          durability: items[name].durability!,
          enhancedUntil: 0,
          element: null,
          elementUntil: 0,
        });
    } else
      this.session.inventory[name] = (this.session.inventory[name] || 0) + n;
  }
  gift(npc: string, item: string) {
    const p = people.find((p) => p.id === npc)!,
      social = this.data.social[npc];
    if (social.giftDay === this.day) {
      this.session.message = "贈り物は一日一回。";
      return;
    }
    if (items[item]?.category === "key" || !this.take(item, 1)) return;
    social.giftDay = this.day;
    this.trust(npc, item === p.likes ? 4 : 1, "gift");
    this.session.message = `${p.name}に${item}を渡した。`;
  }
  available(p: Person, shop = true) {
    const pos = this.position(p);
    return (
      !pos.sleeping &&
      pos.map === this.session.world.mapId &&
      Math.hypot(pos.x - this.session.world.x, pos.y - this.session.world.y) <
        40 &&
      (!shop ||
        ((this.session.clock / 3600) % 24 >= p.open &&
          (this.session.clock / 3600) % 24 < p.close))
    );
  }
  buy(npc: string, name: string) {
    const p = people.find((p) => p.id === npc)!;
    if (!p.shop?.includes(name) || !this.available(p)) return;
    const key = `${npc}:${name}`,
      stock = this.data.stocks[key] ?? this.stock(name),
      cost = items[name]?.price;
    if (!stock || cost === undefined || this.data.money < cost) {
      this.session.message = "在庫または銅貨が足りない。";
      return;
    }
    this.data.money -= cost;
    this.data.stocks[key] = stock - 1;
    this.gain(name);
    this.session.message = `${name}を購入した。`;
  }
  stock(name: string) {
    return items[name]?.category === "gear"
      ? 1
      : items[name]?.category === "bait"
        ? 10
        : items[name]?.category === "medicine"
          ? 3
          : 5;
  }
  sellPrice(npc: string, name: string) {
    if (name.startsWith("@")) {
      const g = this.data.gear.find((g) => g.id === name.slice(1));
      if (
        !g ||
        g.durability <= 0 ||
        this.data.jobs.some((j) => j.gear === g.id)
      )
        return null;
      const item = items[g.name];
      if (npc !== "N10" && !(npc === "N12" && item.tool === "rod")) return null;
      return Math.floor(((item.price * g.durability) / item.durability!) * 0.4);
    }
    const p = people.find((p) => p.id === npc)!,
      item = items[name];
    if (!item || item.category === "key") return null;
    const fish = name.includes("・");
    const accepts =
      npc === "N12"
        ? fish || item.tool === "rod" || item.category === "bait"
        : npc === "N10"
          ? ["gear"].includes(item.category) ||
            [
              "石",
              "鉄鉱石",
              "希少鉱石",
              "金属片",
              "鉄くず",
              "木材",
              "硬木",
            ].includes(name)
          : npc === "N11"
            ? ["薬草", "湿地草", "きのこ", "回復薬", "風邪薬"].includes(name)
            : npc === "N05"
              ? ["野菜", "種", "肥料", "草", "野菜スープ", "きのこ"].includes(
                  name,
                )
              : npc === "N08"
                ? [
                    "獣肉",
                    "皮",
                    "小さな皮",
                    "上質な皮",
                    "飼料",
                    "焼き肉",
                  ].includes(name)
                : false;
    if (!accepts) return null;
    return fish
      ? item.price
      : Math.floor(item.price * (p.shop?.includes(name) ? 0.6 : 0.4));
  }
  sell(npc: string, selection: Record<string, number>) {
    const p = people.find((p) => p.id === npc)!;
    if (!this.available(p)) return;
    let total = 0;
    for (const [name, n] of Object.entries(selection)) {
      const price = this.sellPrice(npc, name);
      if (
        price === null ||
        !Number.isInteger(n) ||
        n < 1 ||
        (name.startsWith("@") ? n !== 1 : this.count(name) < n)
      )
        return;
      total += price * n;
    }
    for (const [name, n] of Object.entries(selection)) {
      if (name.startsWith("@")) {
        const id = name.slice(1);
        this.data.gear = this.data.gear.filter((g) => g.id !== id);
        for (const slot of Object.keys(this.data.equipment))
          if (this.data.equipment[slot] === id)
            delete this.data.equipment[slot];
      } else this.take(name, n);
    }
    this.data.money += total;
    this.session.message = `選んだ品を${total}銅貨で売却した。`;
  }
  craft(id: string) {
    const r = recipes.find((r) => r.id === id);
    if (!r) return;
    if (r.crafter === "HOME" && this.session.world.mapId !== "HOME") return;
    if (r.crafter !== "HOME") {
      const p = people.find((p) => p.id === r.crafter);
      if (!p || !this.available(p)) return;
    }
    if (
      this.data.money < r.price ||
      Object.entries(r.ingredients).some(([name, n]) => this.count(name) < n)
    ) {
      this.session.message = "材料または銅貨が足りない。";
      return;
    }
    const fishUsed = Object.keys(this.session.inventory).find(
      (name) => name.includes("・") && fishPrices[name.split("・")[0]],
    );
    const material = structuredClone(r.ingredients);
    for (const [name, n] of Object.entries(material)) this.take(name, n);
    this.data.money -= r.price;
    if (r.crafter === "HOME") {
      this.gain(
        r.result === "焼き魚" && fishUsed
          ? `焼き魚・${fishUsed.split("・")[1]}`
          : r.result,
      );
      if (!this.data.known.includes(r.name)) this.data.known.push(r.name);
      this.session.message = `${r.result}を作った。`;
    } else {
      this.data.jobs.push({
        id: this.data.nextId++,
        npc: r.crafter,
        recipe: r.id,
        remaining: r.minutes,
        state: "queued",
        ingredients: material,
        price: r.price,
        result: r.result,
      });
      this.session.message = `委託を受け付けた。予定 ${this.jobEstimate(r.crafter)}。営業時間中に受け取ろう。`;
    }
  }
  jobEstimate(npc: string, extra = 0) {
    const p = people.find((p) => p.id === npc)!,
      minutes = this.data.jobs
        .filter((j) => j.npc === npc && j.state !== "ready")
        .reduce((n, j) => n + j.remaining, extra);
    let left = minutes,
      at = this.session.clock;
    for (let d = 0; d < 10000 && left > 0; d++) {
      const day = Math.floor(at / 86400),
        start = day * 86400 + p.open * 3600,
        end = day * 86400 + p.close * 3600;
      at = Math.max(at, start);
      if (at >= end) {
        at = (day + 1) * 86400 + p.open * 3600;
        continue;
      }
      const used = Math.min(left, (end - at) / 60);
      left -= used;
      at += used * 60;
      if (left) at = (day + 1) * 86400 + p.open * 3600;
    }
    return this.date(at);
  }
  cancelJob(id: number) {
    const job = this.data.jobs.find((j) => j.id === id);
    if (
      !job ||
      job.state !== "queued" ||
      !this.available(people.find((p) => p.id === job.npc)!)
    )
      return;
    for (const [name, n] of Object.entries(job.ingredients)) this.gain(name, n);
    this.data.money += job.price;
    this.data.jobs = this.data.jobs.filter((j) => j.id !== id);
  }
  collectJob(id: number) {
    const job = this.data.jobs.find((j) => j.id === id);
    if (
      !job ||
      job.state !== "ready" ||
      !this.available(people.find((p) => p.id === job.npc)!)
    )
      return;
    if (job.gear) {
      const g = this.data.gear.find((g) => g.id === job.gear);
      if (g) g.durability = items[g.name].durability!;
    } else this.gain(job.result);
    this.data.jobs = this.data.jobs.filter((j) => j.id !== id);
    this.session.message = "完成品を受け取った。";
  }
  repair(id: string) {
    const gear = this.data.gear.find((g) => g.id === id),
      p = people.find((p) => p.id === "N10")!;
    if (
      !gear ||
      gear.durability <= 0 ||
      !this.available(p) ||
      this.data.jobs.some((j) => j.gear === id)
    )
      return;
    const item = items[gear.name],
      cost = Math.max(
        5,
        Math.floor(
          item.price * (1 - gear.durability / item.durability!) * 0.25,
        ),
      ),
      material =
        item.slot === "body"
          ? "皮"
          : item.tier && item.tier > 1
            ? "鉄鉱石"
            : "木材";
    if (this.data.money < cost || !this.take(material, 1)) return;
    this.data.money -= cost;
    for (const slot of Object.keys(this.data.equipment))
      if (this.data.equipment[slot] === id) delete this.data.equipment[slot];
    this.data.jobs.push({
      id: this.data.nextId++,
      npc: "N10",
      recipe: "repair",
      remaining: 30,
      state: "queued",
      ingredients: { [material]: 1 },
      price: cost,
      gear: id,
      result: gear.name,
    });
  }
  equip(id: string) {
    const gear = this.data.gear.find((g) => g.id === id);
    if (!gear || this.data.jobs.some((j) => j.gear === id)) return;
    const slot = items[gear.name].slot;
    if (slot) this.data.equipment[slot] = id;
  }
  boost(id: string, element: "fire" | "water" | "thunder" | null = null) {
    if (this.action) return;
    const g = this.data.gear.find((g) => g.id === id);
    if (
      !g ||
      this.data.jobs.some((j) => j.gear === id) ||
      (element &&
        !["weapon", "body", "shield"].includes(items[g.name].slot || ""))
    )
      return;
    const level = this.data.levels.magic,
      stage = Math.floor(level / 10),
      cost = element
        ? 10
        : stage >= 3
          ? 9
          : stage === 2
            ? 11
            : stage === 1
              ? 13
              : 15;
    if (this.session.mp < cost) return;
    this.session.mp -= cost;
    this.xp("mp", cost / 5);
    if (element) {
      g.element = element;
      g.elementUntil = this.session.clock + 90 * 60;
    } else
      g.enhancedUntil =
        this.session.clock + [120, 180, 240, 300][Math.min(3, stage)] * 60;
    this.session.message = "無詠唱で魔力を込めた。";
  }
  multiplier(g: Gear) {
    return g.enhancedUntil > this.session.clock
      ? 1.2 + Math.min(3, Math.floor(this.data.levels.magic / 10)) * 0.1
      : 1;
  }
  stat(name: "atk" | "def" | "spd") {
    let total =
      name === "atk"
        ? this.data.levels.sword * 2
        : name === "spd"
          ? this.data.levels.sword / 3
          : 0;
    for (const id of Object.values(this.data.equipment)) {
      const g = this.data.gear.find((g) => g.id === id);
      if (g) total += (items[g.name][name] || 0) * this.multiplier(g);
    }
    return total;
  }
  wear(id: string, n = 1) {
    const g = this.data.gear.find((g) => g.id === id);
    if (!g) return;
    if (g.enhancedUntil > this.session.clock && this.session.random() < 0.25)
      return;
    g.durability -= n;
    if (g.durability <= 0) {
      this.data.gear = this.data.gear.filter((g) => g.id !== id);
      for (const slot of Object.keys(this.data.equipment))
        if (this.data.equipment[slot] === id) delete this.data.equipment[slot];
      this.session.message = `${g.name}が壊れて消えた。`;
    }
  }
  displayName(name: string) {
    if (
      ["鉄鉱石", "希少鉱石", "魔力結晶", "湿地草"].includes(name) &&
      !this.data.known.includes(name)
    )
      return name === "湿地草" ? "正体不明の薬草" : "正体不明の鉱石";
    return name;
  }
  identify(npc: string) {
    const names =
      npc === "N10"
        ? ["鉄鉱石", "希少鉱石"]
        : npc === "N11"
          ? ["薬草", "湿地草"]
          : npc === "N01"
            ? ["魔力結晶"]
            : [];
    for (const name of names)
      if (this.count(name) && !this.data.known.includes(name))
        this.data.known.push(name);
    this.session.message = "持ち込んだ素材の正体を教わった。";
  }
  cookTrial(selection: Record<string, number>) {
    if (this.session.world.mapId !== "HOME" || this.session.battle) return;
    const entries = Object.entries(selection).filter(([, n]) => n > 0);
    if (
      !entries.length ||
      entries.some(
        ([name, n]) =>
          !Number.isInteger(n) ||
          n < 1 ||
          this.count(name) < n ||
          items[name]?.category !== "material",
      )
    )
      return;
    const recipe = recipes.find(
      (r) =>
        r.crafter === "HOME" &&
        Object.keys(r.ingredients).length === entries.length &&
        entries.every(
          ([name, n]) =>
            (r.ingredients[name] ??
              (name.includes("・") ? r.ingredients["魚"] : 0)) === n,
        ),
    );
    if (recipe) {
      this.craft(recipe.id);
      return;
    }
    for (const [name, n] of entries) this.take(name, n);
    this.gain("失敗料理");
    this.session.message = "試作は失敗したが、食べられないことはなさそうだ。";
  }
  xp(track: string, amount: number) {
    this.data.xp[track] += amount;
    while (
      this.data.levels[track] < 30 &&
      this.data.xp[track] >= Math.round(20 * this.data.levels[track] ** 1.6)
    ) {
      this.data.xp[track] -= Math.round(20 * this.data.levels[track] ** 1.6);
      this.data.levels[track]++;
    }
  }
  eat(name: string) {
    if (
      this.session.battle ||
      this.action ||
      this.data.hunger >= 100 ||
      !items[name]?.food
    )
      return;
    if (
      !maps[this.session.world.mapId].interior &&
      this.session.activeEnemies.some(
        (e) =>
          e.hp > 0 &&
          Math.hypot(e.x - this.session.world.x, e.y - this.session.world.y) <
            160,
      )
    ) {
      this.session.message = "近くに魔物がいるため食べられない。";
      return;
    }
    if (!this.take(name, 1)) return;
    this.data.hunger = Math.min(100, this.data.hunger + items[name].food!);
    this.session.advance(15 * 60);
    this.session.message = `${name}を食べた。`;
  }
  medicine(name: string) {
    if (!["回復薬", "風邪薬"].includes(name) || !this.take(name, 1)) return;
    if (this.session.battle && this.session.battle.inputTimer > 0) {
      this.gain(name);
      return;
    }
    if (this.session.battle) this.session.battle.inputTimer = 0.4;
    if (name === "回復薬")
      this.session.hp = Math.min(this.maxHp, this.session.hp + 40);
    else {
      this.data.protectedUntil = this.session.clock + 6 * 3600;
      this.data.cold = this.data.cold ? Math.max(1, this.data.cold - 1) : 0;
      this.data.coldAt = this.session.clock;
    }
    this.session.message = `${name}を使った。`;
  }
  sleep(hours: number) {
    if (
      this.session.world.mapId !== "HOME" ||
      this.session.battle ||
      !Number.isInteger(hours) ||
      hours < 1 ||
      hours > 7
    )
      return;
    for (let i = 0; i < hours; i++) {
      const starving = this.data.hunger <= 0;
      this.session.advance(3600, true);
      if (this.session.screen === "dead") break;
      if (starving) {
        this.session.hp = 0;
        this.session.screen = "dead";
        this.session.message = "空腹のまま眠り、命が尽きた。";
        break;
      }
      this.session.hp = Math.min(
        this.maxHp,
        this.session.hp + this.maxHp * 0.15,
      );
      this.session.mp = Math.min(
        this.maxMp,
        this.session.mp + this.maxMp * 0.15,
      );
    }
    this.session.hp = Math.floor(this.session.hp);
    this.session.mp = Math.floor(this.session.mp);
    this.data.awakeSince =
      hours >= 7
        ? this.session.clock
        : this.session.clock - Math.max(0, this.awakeHours - hours * 2) * 3600;
    if (hours >= 7 || (hours >= 3 && this.data.cold === 1)) this.data.cold = 0;
    if (this.session.screen !== "dead")
      this.session.message = `${hours}時間休んだ。満腹度${Math.floor(this.data.hunger)}。`;
  }
  enter(interior: MapId) {
    if (interior === "HOME" && !this.session.story.rescued) return;
    this.session.world.travel(interior, 88, 96);
    this.interaction = null;
  }
  leave() {
    const b = maps.VIL.buildings.find(
      (b) => b.interior === this.session.world.mapId,
    );
    if (b)
      this.session.world.travel(
        "VIL",
        (b.x + b.w / 2) * 16 + 8,
        (b.y + b.h) * 16 + 8,
      );
    this.interaction = null;
  }
  nearest() {
    const w = this.session.world,
      near = (x: number, y: number, r = 36) => Math.hypot(w.x - x, w.y - y) < r;
    for (const p of [...people].sort((a, b) => {
      const pa = this.position(a),
        pb = this.position(b);
      return (
        Math.hypot(pa.x - w.x, pa.y - w.y) - Math.hypot(pb.x - w.x, pb.y - w.y)
      );
    })) {
      const pos = this.position(p);
      if (pos.map === w.mapId && near(pos.x, pos.y) && !pos.sleeping) {
        this.interaction = {
          kind: "person",
          id: p.id,
          title: p.name,
          text: p.child
            ? "文字は読めない。身振りで伝えよう。"
            : "紙とペンで、何を伝えよう？",
        };
        return true;
      }
    }
    if (w.map.interior) {
      if (w.y > 80) {
        this.leave();
        return true;
      }
      if (w.mapId === "HOME") {
        this.interaction = {
          kind: "home",
          id: "HOME",
          title: "家畜小屋",
          text: "寝床と台所。空腹のまま長く眠ると命を落とす。",
        };
        return true;
      }
    }
    if (w.mapId === "VIL") {
      for (const b of w.map.buildings)
        if (near((b.x + b.w / 2) * 16 + 8, (b.y + b.h) * 16 + 8)) {
          this.enter(b.interior);
          return true;
        }
    }
    const stake = this.data.stakes[w.mapId];
    if (stake && near(stake.x, stake.y)) {
      this.interaction = {
        kind: "stake",
        id: w.mapId,
        title: "転移杭",
        text: "設置済みの杭へ移動。5ゲーム分・MP0。",
      };
      return true;
    }
    if (w.mapId === "NORTH" && near(w.map.width * 8, 8 * 16, 48)) {
      this.interaction = {
        kind: "altar",
        id: "altar",
        title: "沈黙の祭壇",
        text: "呪いの痕跡が静かに揺れる。声を取り戻すか、このまま生きるか。",
      };
      return true;
    }
    for (const node of this.nodeList(w.mapId).sort(
      (a, b) =>
        Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y),
    ))
      if (near(node.x, node.y)) {
        const state = this.nodeState(node.id);
        this.interaction = {
          kind: "resource",
          id: node.id,
          title: this.displayName(node.def.item),
          text:
            state.left > 1
              ? "まだ採れそう。"
              : state.left
                ? "残り少なそう。"
                : "採取済み。時間が経つと再生する。",
        };
        return true;
      }
    if (
      fishByMap[w.mapId] &&
      near(
        w.mapId === "VIL"
          ? 34 * 16 + 8
          : w.mapId === "WEST"
            ? 8 * 16 + 8
            : w.map.width * 8 + 3 * 16,
        w.mapId === "VIL" ? 35 * 16 + 8 : w.map.height * 8,
        48,
      )
    ) {
      this.interaction = {
        kind: "fishing",
        id: w.mapId,
        title: "釣り場",
        text: "竿と餌が必要。魚影は連続試行で減る。",
      };
      return true;
    }
    return false;
  }
  nodeList(map: MapId) {
    if (maps[map].interior) return [];
    return (resourceIndices[map as OutdoorId] || []).map((index, i) => {
      const m = maps[map],
        cx = m.width / 2,
        x = (map === "VIL" ? 20 + i * 2 : cx - 3 - i * 3) * 16 + 8,
        y = (map === "VIL" ? 30 : m.height / 2 + 3) * 16 + 8;
      return { id: `${map}:${index}`, x, y, def: resources[index] };
    });
  }
  nodeState(id: string) {
    const state = (this.data.nodes[id] ??= {
      left: 1 + (Number(id.split(":")[1]) % 3),
      respawnAt: 0,
    });
    if (state.left === 0 && this.session.clock >= state.respawnAt)
      state.left = 1 + (Number(id.split(":")[1]) % 3);
    return state;
  }
  tool(id: string) {
    return this.data.gear.find(
      (g) => g.id === id && !this.data.jobs.some((j) => j.gear === id),
    );
  }
  gather(id: string, toolId?: string) {
    if (this.action || this.session.battle) return;
    const node = this.nodeList(this.session.world.mapId).find(
      (n) => n.id === id,
    );
    if (
      !node ||
      Math.hypot(node.x - this.session.world.x, node.y - this.session.world.y) >
        40 ||
      !this.nodeState(id).left
    )
      return;
    const tool = toolId ? this.tool(toolId) : undefined,
      def = node.def,
      enhanced = !!tool && tool.enhancedUntil > this.session.clock;
    if (
      def.tool &&
      (!tool ||
        items[tool.name].tool !== def.tool ||
        (items[tool.name].tier || 0) + (enhanced ? 1 : 0) < def.tier)
    ) {
      this.session.message = "必要な種類・段階の道具がない。";
      return;
    }
    const minutes = Math.max(
      3,
      def.minutes *
        (tool && (items[tool.name].tier || 0) > def.tier ? 0.8 : 1) *
        (enhanced ? 0.8 : 1),
    );
    this.action = {
      kind: "gather",
      id,
      remaining: minutes * 60,
      minutes,
      tool: toolId,
      required: def.tier,
      enhanced,
    };
    this.interaction = null;
    this.session.message = "採集中…危険な場合は中断できる。";
  }
  fish(toolId: string, bait: string) {
    if (
      this.action ||
      this.session.battle ||
      !fishByMap[this.session.world.mapId]
    )
      return;
    const tool = this.tool(toolId);
    if (
      !tool ||
      items[tool.name].tool !== "rod" ||
      items[bait]?.category !== "bait" ||
      !this.take(bait, 1)
    )
      return;
    const enhanced = tool.enhancedUntil > this.session.clock,
      minutes = 10 * (enhanced ? 0.8 : 1);
    this.action = {
      kind: "fish",
      id: this.session.world.mapId,
      remaining: minutes * 60,
      minutes,
      tool: toolId,
      bait,
      enhanced,
    };
    this.interaction = null;
    this.session.message = "釣りを始めた。餌は消費済み。中断時も戻らない。";
  }
  cancelAction() {
    if (this.action) {
      this.action = null;
      this.session.message = "行動を中断した。経過した時間は戻らない。";
    }
  }
  actionUpdate(dt: number) {
    const a = this.action;
    if (!a) return 0;
    const danger = this.session.activeEnemies.some(
        (e) =>
          e.hp > 0 &&
          Math.hypot(e.x - this.session.world.x, e.y - this.session.world.y) <
            100,
      ),
      rate = danger ? 10 : Math.max(10, (a.minutes * 60) / 3),
      elapsed = Math.min(a.remaining, dt * rate);
    a.remaining -= elapsed;
    if (a.kind === "gather") {
      const tool = a.tool ? this.tool(a.tool) : null,
        def = resources[Number(a.id.split(":")[1])];
      if (
        def.tool &&
        (!tool ||
          (items[tool.name].tier || 0) +
            (tool.enhancedUntil > this.session.clock ? 1 : 0) <
            def.tier)
      ) {
        this.cancelAction();
        this.session.message = "強化が切れ、必要な道具段階を満たせなくなった。";
        return elapsed;
      }
    }
    if (a.remaining <= 0) {
      if (a.kind === "gather") {
        const def = resources[Number(a.id.split(":")[1])],
          state = this.nodeState(a.id);
        const n =
          def.tier < 2
            ? 1 + Math.floor(this.session.random() * 2)
            : def.tier === 2
              ? 2 + Math.floor(this.session.random() * 2)
              : 3 + Math.floor(this.session.random() * 2);
        this.gain(def.item, n);
        state.left--;
        if (!state.left)
          state.respawnAt =
            this.session.clock +
            def.respawn * 60 * (Number(a.id.split(":")[1]) % 3 === 2 ? 1.5 : 1);
        this.session.message = `${this.displayName(def.item)}を${n}個採った。`;
        if (a.tool) this.wear(a.tool, Math.max(1, def.tier));
      } else {
        const tool = this.tool(a.tool!),
          tier = tool ? items[tool.name].tier || 1 : 1,
          stock = this.fishStock(a.id);
        const bonus =
            tool && tool.enhancedUntil > this.session.clock
              ? 0.1 +
                0.05 * Math.min(3, Math.floor(this.data.levels.magic / 10))
              : 0,
          chance = Math.max(
            0.1,
            Math.min(
              0.95,
              0.45 +
                tier * 0.1 +
                bonus -
                (5 - stock.stock) * 0.06 +
                (this.data.weather === "rain" ? 0.05 : 0),
            ),
          );
        if (this.session.random() < chance) {
          const pool = fishByMap[a.id as MapId]!,
            hour = (this.session.clock / 3600) % 24;
          const weights = pool.map((name, i) =>
            Math.max(
              0.1,
              (i === 0 ? 5 : i === 1 ? 3 : 1) *
                (a.bait === "小魚" && i === 2 ? 2 : 1) *
                (a.bait === "エビ" && ["VIL", "WEST"].includes(a.id)
                  ? 1.3
                  : 1) *
                (hour < 6 || hour > 18 ? (i === 1 ? 1.4 : 0.9) : 1) *
                (this.data.weather === "rain" &&
                ["EAST", "SFOREST"].includes(a.id)
                  ? 1.2
                  : 1),
            ),
          );
          let choice =
              this.session.random() * weights.reduce((a, b) => a + b, 0),
            index = 0;
          while (index < pool.length - 1 && choice >= weights[index]) {
            choice -= weights[index];
            index++;
          }
          const size = this.session.random(),
            suffix =
              size < 0.3 ? "小" : size < 0.85 || tier === 1 ? "普通" : "大";
          if (this.session.random() < 0.06) {
            const trash = [
              "空き瓶",
              "古靴",
              "流木",
              "貝殻",
              "金属片",
              "遺物",
              "布帽",
            ][Math.floor(this.session.random() * 7)];
            this.gain(trash);
            this.session.message = `${this.displayName(trash)}が釣れた。`;
          } else {
            const name = `${pool[index]}・${suffix}`;
            this.gain(name);
            this.session.message = `${name}が釣れた。`;
          }
        } else this.session.message = "魚は逃げた。";
        stock.stock = Math.max(0, stock.stock - 1);
        stock.at = this.session.clock;
        if (a.tool) this.wear(a.tool);
        this.interaction = {
          kind: "fishing",
          id: a.id,
          title: "釣り場",
          text: "もう一度釣る／道具を選び直す／やめる",
        };
      }
      if (a.enhanced) this.xp("magic", 1);
      this.action = null;
    }
    return elapsed;
  }
  fishStock(id: string) {
    const stock = (this.data.fish[id] ??= { stock: 5, at: this.session.clock });
    const n = Math.floor((this.session.clock - stock.at) / 3600);
    if (n > 0) {
      stock.stock = Math.min(5, stock.stock + n);
      stock.at += n * 3600;
    }
    return stock;
  }
  placeStake() {
    const w = this.session.world;
    if (w.map.interior || w.mapId === "VIL" || !this.take("転移杭", 1)) return;
    this.data.stakes[w.mapId] = { x: w.x, y: w.y };
    this.session.message = "転移杭を設置した。以前の位置は消えた。";
  }
  teleport(id: string) {
    if (this.session.battle || this.action) return;
    const here = this.data.stakes[this.session.world.mapId],
      there = this.data.stakes[id];
    if (
      !here ||
      !there ||
      Math.hypot(here.x - this.session.world.x, here.y - this.session.world.y) >
        36
    )
      return;
    this.session.advance(300);
    this.session.world.travel(id as MapId, there.x, there.y);
    this.interaction = null;
  }
  end(choice: "released" | "silent") {
    if (this.interaction?.kind !== "altar") return;
    this.data.ending = choice;
    this.session.message =
      choice === "released"
        ? "呪いがほどけ、失った声が戻った。島での暮らしは続いていく。"
        : "声を持たないまま、この島で生きると決めた。暮らしは続いていく。";
    this.interaction = null;
  }
  playWith(npc: string, kind: "tag" | "hide") {
    const p = people.find((p) => p.id === npc)!;
    if (!p.child || !this.available(p) || this.play) return;
    const pos = this.position(p);
    let x = pos.x + 48,
      y = pos.y + 48;
    while (
      isBlocked(maps.VIL, Math.floor(x / 16), Math.floor(y / 16)) &&
      x < 40 * 16
    )
      x += 16;
    if (kind === "hide") {
      const candidates = maps.VIL.buildings
        .flatMap((b) => [
          { x: (b.x - 1) * 16 + 8, y: (b.y + 1) * 16 + 8 },
          { x: (b.x + b.w) * 16 + 8, y: (b.y + 1) * 16 + 8 },
        ])
        .filter(
          (at) =>
            !isBlocked(
              maps.VIL,
              Math.floor(at.x / 16),
              Math.floor(at.y / 16),
            ) && !this.lineVisible(at.x, at.y),
        );
      if (candidates.length) {
        const target =
          candidates[Math.floor(this.session.random() * candidates.length)];
        x = target.x;
        y = target.y;
      }
    }
    this.play = { npc, kind, until: this.session.clock + 30 * 60, x, y };
    this.interaction = null;
    this.session.message =
      kind === "tag"
        ? "鬼ごっこ。子供を捕まえよう。魔法・装備の速さは無効。"
        : "かくれんぼ。建物の陰を探そう。";
  }
  lineVisible(x: number, y: number) {
    const w = this.session.world,
      distance = Math.hypot(w.x - x, w.y - y),
      steps = Math.ceil(distance / 8);
    for (let i = 1; i < steps; i++)
      if (
        isBlocked(
          w.map,
          Math.floor((w.x + ((x - w.x) * i) / steps) / 16),
          Math.floor((w.y + ((y - w.y) * i) / steps) / 16),
        )
      )
        return false;
    return true;
  }
  updatePlay(dt: number) {
    if (!this.play) return;
    const game = this.play,
      w = this.session.world;
    if (w.mapId !== "VIL") {
      this.play = null;
      return;
    }
    const distance = Math.hypot(game.x - w.x, game.y - w.y);
    if (distance < 18 && this.lineVisible(game.x, game.y)) {
      this.trust(game.npc, 4, "play");
      this.data.gamePlayed[game.npc] = this.day;
      this.session.message = "遊びに勝った。";
      this.play = null;
    } else if (this.session.clock >= game.until) {
      this.trust(game.npc, 1, "play");
      this.session.message = "時間切れ。次は負けないぞ。";
      this.play = null;
    } else if (game.kind === "tag") {
      const angle = Math.atan2(game.y - w.y, game.x - w.x),
        x = game.x + Math.cos(angle) * 58 * dt,
        y = game.y + Math.sin(angle) * 58 * dt;
      if (!isBlocked(maps.VIL, Math.floor(x / 16), Math.floor(y / 16))) {
        game.x = x;
        game.y = y;
      }
    }
  }
  advance(from: number, to: number, sleeping = false) {
    const elapsed = to - from,
      s = this.session,
      d = this.data;
    d.hunger = Math.max(
      0,
      d.hunger -
        (elapsed / 432) * (s.world.mode === "run" && !sleeping ? 1.2 : 1),
    );
    if (d.hunger === 0 && !sleeping)
      s.hp = Math.max(
        0,
        s.hp - (Math.floor(to / 600) - Math.floor(from / 600)) * 3,
      );
    if (to >= d.weatherUntil) {
      d.weather = (["clear", "rain", "fog"] as const)[
        Math.floor(s.random() * 3)
      ];
      d.weatherUntil = to + (3 + s.random() * 6) * 3600;
    }
    const outdoors = !s.world.map.interior;
    if (
      outdoors &&
      (d.weather === "rain" ||
        tileAt(
          s.world.map,
          Math.floor(s.world.x / 16),
          Math.floor(s.world.y / 16),
        ) === "wet")
    )
      d.wet = Math.min(3600, d.wet + elapsed);
    else if (!outdoors) d.wet = Math.max(0, d.wet - elapsed * 2);
    if (!d.cold && d.wet >= 3600) {
      d.cold = 1;
      d.coldAt = to;
    }
    if (d.cold && from < d.protectedUntil)
      d.coldAt += Math.max(0, Math.min(to, d.protectedUntil) - from);
    if (d.cold && to > d.protectedUntil) {
      d.cold =
        to - d.coldAt >= 9 * 3600 ? 3 : to - d.coldAt >= 3 * 3600 ? 2 : d.cold;
      if (d.cold === 3)
        s.hp = Math.max(
          0,
          s.hp - (Math.floor(to / 600) - Math.floor(from / 600)) * 3,
        );
    }
    if (s.world.moving && !sleeping) {
      d.shoeMinutes += elapsed / 60;
      if (d.shoeMinutes >= 100) {
        const count = Math.floor(d.shoeMinutes / 100);
        d.shoeMinutes %= 100;
        if (d.equipment.shoes) this.wear(d.equipment.shoes, count);
      }
    }
    if (this.day !== d.stockDay) {
      d.stockDay = this.day;
      d.stocks = {};
    }
    for (const q of d.quests)
      if (q.state === "accepted" && to > q.deadline) {
        q.state = "failed";
        this.trust(q.giver, -3, "quest");
      }
    for (const p of people) {
      let available = this.workMinutes(p, from, to);
      for (const job of d.jobs.filter(
        (j) => j.npc === p.id && j.state !== "ready",
      )) {
        if (available <= 0) break;
        job.state = "working";
        const used = Math.min(available, job.remaining);
        job.remaining -= used;
        available -= used;
        if (job.remaining <= 0) job.state = "ready";
      }
    }
    for (const g of d.gear) {
      if (
        g.enhancedUntil > from &&
        g.enhancedUntil <= to &&
        Object.values(d.equipment).includes(g.id)
      )
        s.message = `${g.name}の魔法強化が切れた。`;
      if (g.elementUntil <= to) g.element = null;
    }
    if (s.hp === 0) {
      s.screen = "dead";
      s.battle = null;
      s.message = "命が尽きた。";
    }
    if (!sleeping && this.awakeHours >= 24) {
      if (s.world.mapId === "VIL" || s.world.map.interior) {
        s.world.mapId = "HOME";
        s.world.x = 88;
        s.world.y = 56;
        this.sleep(7);
      } else {
        s.hp = 0;
        s.screen = "dead";
        s.message = "疲労で意識を失った。";
      }
    }
  }
  workMinutes(p: Person, from: number, to: number) {
    let minutes = 0;
    for (
      let day = Math.floor(from / 86400);
      day <= Math.floor(to / 86400);
      day++
    )
      minutes +=
        Math.max(
          0,
          Math.min(to, day * 86400 + p.close * 3600) -
            Math.max(from, day * 86400 + p.open * 3600),
        ) / 60;
    return minutes;
  }
  reveal() {
    const w = this.session.world;
    if (w.map.interior) return;
    const tx = Math.floor(w.x / 16),
      ty = Math.floor(w.y / 16),
      key = `${w.mapId}:${tx}:${ty}`;
    if (key === this.fogCell) return;
    this.fogCell = key;
    const mask = (
      this.data.fog[w.mapId] || "0".repeat(w.map.width * w.map.height)
    ).split("");
    for (
      let y = Math.max(0, ty - 6);
      y <= Math.min(w.map.height - 1, ty + 6);
      y++
    )
      for (
        let x = Math.max(0, tx - 6);
        x <= Math.min(w.map.width - 1, tx + 6);
        x++
      ) {
        if (Math.hypot(x - tx, y - ty) > 6) continue;
        let visible = true;
        const steps = Math.max(Math.abs(x - tx), Math.abs(y - ty));
        for (let i = 1; i < steps; i++) {
          const xx = Math.round(tx + ((x - tx) * i) / steps),
            yy = Math.round(ty + ((y - ty) * i) / steps);
          if (isBlocked(w.map, xx, yy)) {
            visible = false;
            break;
          }
        }
        if (visible) mask[y * w.map.width + x] = "1";
      }
    this.data.fog[w.mapId] = mask.join("");
  }
}
