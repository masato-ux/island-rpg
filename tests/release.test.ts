import {
  villagePoint as vp,
  compactPoint as cp,
  maps as fieldMaps,
  isBlocked,
} from "../src/maps.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/session.ts";
import { people } from "../src/data.ts";
import { validateSnapshot } from "../src/save.ts";
const idle = new Set<never>();
function game() {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.inventory = { 魂の楔: 1 };
  return s;
}
function safe(s: Session) {
  for (const e of s.enemies) {
    e.hp = 0;
    e.respawnAt = 1e9;
  }
}
test("料理試作は選んだ魚を消費し、別サイズの魚を残す", () => {
  const s = game();
  s.world.mapId = "HOME";
  s.life.gain("アジ・小");
  s.life.gain("タイ・大");
  s.life.gain("木の枝");
  s.life.cookTrial({ "タイ・大": 1, 木の枝: 1 });
  assert.equal(s.life.count("アジ・小"), 1);
  assert.equal(s.life.count("タイ・大"), 0);
  assert.equal(s.life.count("焼き魚・大"), 1);
});
test("魔法・薬・攻撃が共通の入力クールダウンを守り、薬の取得順も変えない", () => {
  const s = game();
  s.life.gain("回復薬");
  s.life.gain("草");
  s.beginBattle(s.enemies[1]);
  s.life.boost("driftwood");
  assert.equal(s.mp, 145);
  const before = structuredClone(s.inventory);
  s.life.medicine("回復薬");
  s.life.boost("driftwood");
  assert.deepEqual(s.inventory, before);
  assert.equal(s.mp, 145);
  assert.equal(s.command("attack"), false);
  for (let i = 0; i < 5; i++) s.update(0.1, idle);
  s.life.medicine("回復薬");
  assert.equal(s.life.count("回復薬"), 0);
  assert.equal(s.command("attack"), false);
});
test("採集完了をまたぐ早送りでも強化失効を先に判定し素材・耐久を失わない", () => {
  const s = game();
  safe(s);
  s.world.mapId = "MOUNT";
  const node = s.life.nodeList("MOUNT")[0];
  s.world.x = node.x;
  s.world.y = node.y;
  s.life.gain("石ツルハシ");
  const g = s.life.data.gear.at(-1)!;
  g.enhancedUntil = s.clock + 1.2;
  s.life.gather(node.id, g.id);
  assert.ok(s.life.action);
  s.life.action!.remaining = 1.5;
  s.update(0.1, idle);
  assert.equal(s.life.action, null);
  assert.equal(s.life.count("鉄鉱石"), 0);
  assert.equal(g.durability, 40);
  assert.match(s.message, /強化が切れ/);
});
test("使用中の工具だけ強化切れを通知し、袋内の未使用工具は通知しない", () => {
  const s = game();
  safe(s);
  s.world.mapId = "SFOREST";
  const node = s.life.nodeList("SFOREST").find((n) => n.def.item === "木材")!;
  s.world.x = node.x;
  s.world.y = node.y;
  s.life.gain("石斧");
  const g = s.life.data.gear.at(-1)!;
  g.enhancedUntil = s.clock + 2;
  s.life.gather(node.id, g.id);
  s.advance(3);
  assert.match(s.message, /石斧の魔法強化が切れた/);
  assert.ok(s.life.action);
  s.life.cancelAction();
  g.enhancedUntil = s.clock + 2;
  s.message = "keep";
  s.advance(3);
  assert.equal(s.message, "keep");
});
test("祭壇から離れた古い選択で結末を確定できず、到着すると確定できる", () => {
  const s = game();
  s.life.interaction = { kind: "altar", id: "altar", title: "", text: "" };
  s.life.end("released");
  assert.equal(s.life.data.ending, null);
  s.world.mapId = "NORTH";
  s.world.x = fieldMaps.NORTH.width * 8;
  s.world.y = 128;
  s.life.end("released");
  assert.equal(s.life.data.ending, "released");
});
test("疲労死した後は自宅へ運ばれて蘇生せず、保存を復元する必要がある", () => {
  const s = game();
  s.clock = 32 * 3600;
  s.hp = 1;
  s.life.data.hunger = 0;
  s.advance(600);
  assert.equal(s.screen, "dead");
  assert.equal(s.hp, 0);
  assert.equal(s.world.mapId, "VIL");
});
test("子供の特別な情報は信頼25から一度だけ聞ける", () => {
  const s = game();
  s.clock = 10 * 3600;
  const p = people.find((p) => p.id === "N03")!;
  const pos = s.life.position(p);
  s.world.x = pos.x;
  s.world.y = pos.y;
  assert.ok(!s.life.availableTopics(p.id).some((d) => d.kind === "info"));
  s.life.data.social.N03.trust = 25;
  const topic = s.life.availableTopics(p.id).find((d) => d.kind === "info")!;
  assert.ok(topic);
  s.life.topic(p.id, topic.id);
  s.life.memo(false);
  assert.ok(!s.life.availableTopics(p.id).some((d) => d.id === topic.id));
});
test("閉店直前に受けた依頼は帰宅後でも期限内に全量納品できる", () => {
  const s = game();
  s.clock = 17.9 * 3600;
  const p = people.find((p) => p.id === "N10")!;
  const initial = s.life.position(p);
  s.world.mapId = initial.map;
  s.world.x = initial.x;
  s.world.y = initial.y;
  s.life.accept(p.id);
  s.life.memo(true);
  s.advance(0.2 * 3600);
  const pos = s.life.position(p);
  s.world.mapId = pos.map;
  s.world.x = pos.x;
  s.world.y = pos.y;
  assert.equal(s.life.available(p), false);
  s.life.gain("鉄鉱石", 2);
  s.life.deliver(p.id);
  assert.equal(s.life.data.quests[0].state, "completed");
});
test("靴と魔法強化は歩行速度に反映し、子供の遊びでは装備速度を無効にする", () => {
  const distance = (gear: boolean, play: boolean) => {
    const s = game();
    Object.assign(s.world, vp(392, 400));
    if (gear) {
      s.life.gain("革靴");
      const g = s.life.data.gear.at(-1)!;
      s.life.equip(g.id);
      s.life.boost(g.id);
    }
    if (play)
      s.life.play = {
        npc: "N03",
        kind: "hide",
        until: s.clock + 1800,
        x: 456,
        y: 300,
      };
    const x = s.world.x;
    s.update(0.1, new Set(["right"]));
    return s.world.x - x;
  };
  assert.ok(distance(true, false) > distance(false, false));
  assert.equal(distance(true, true), distance(false, true));
});
test("保存読込は不正な資源・魚影・会話対象・生活値を拒否する", () => {
  const snapshot = game().snapshot();
  const bad = [
    { life: { ...snapshot.life, cold: 99 } },
    { life: { ...snapshot.life, fish: { VIL: { stock: -1, at: 0 } } } },
    { life: { ...snapshot.life, ending: "unknown" } },
    { inventory: { ...snapshot.inventory, unknown: 1 } },
    {
      activity: {
        ...snapshot.activity,
        interaction: { kind: "resource", id: "VIL:999", title: "", text: "" },
      },
    },
    {
      activity: {
        ...snapshot.activity,
        action: {
          kind: "gather",
          id: "VIL:8",
          remaining: 10,
          minutes: 5,
          enhanced: false,
        },
      },
    },
  ];
  for (const change of bad)
    assert.throws(() => validateSnapshot({ ...snapshot, ...change }));
  assert.deepEqual(validateSnapshot(snapshot), snapshot);
});
test("修理材料は武器・工具の材質に合い、全快品への注文を受けない", () => {
  const s = game();
  s.life.gain("鉄剣");
  const iron = s.life.data.gear.at(-1)!;
  assert.equal(s.life.repairQuote(iron.id), null);
  iron.durability = 35;
  assert.deepEqual(s.life.repairQuote(iron.id), {
    material: "鉄鉱石",
    cost: 30,
  });
  s.life.gain("革靴");
  const boots = s.life.data.gear.at(-1)!;
  boots.durability = 10;
  assert.equal(s.life.repairQuote(boots.id)!.material, "皮");
});
test("漁師の依頼は魚種を限定せず、生魚2匹で完納できる", () => {
  const s = game();
  s.clock = 10 * 3600;
  const p = people.find((p) => p.id === "N12")!;
  const pos = s.life.position(p);
  s.world.x = pos.x;
  s.world.y = pos.y;
  s.life.accept(p.id);
  s.life.memo(true);
  s.life.gain("イワシ・小");
  s.life.gain("フナ・普通");
  s.life.deliver(p.id);
  assert.equal(s.life.data.quests[0].state, "completed");
  validateSnapshot(s.snapshot());
});
function route(s: Session, side: "up" | "down", altar = false) {
  const m = s.world.map,
    sx = Math.floor(s.world.x / 16),
    sy = Math.floor(s.world.y / 16),
    tx = Math.floor(m.width / 2),
    ty = altar ? 7 : side === "up" ? 0 : m.height - 1;
  const queue = [[sx, sy]],
    previous = new Map<string, string | null>([[`${sx},${sy}`, null]]);
  for (let i = 0; i < queue.length; i++)
    for (const [dx, dy] of [
      [0, side === "up" ? -1 : 1],
      [1, 0],
      [-1, 0],
      [0, side === "up" ? 1 : -1],
    ]) {
      const x = queue[i][0] + dx,
        y = queue[i][1] + dy,
        key = `${x},${y}`;
      if (
        !previous.has(key) &&
        !isBlocked(m, x, y) &&
        s.life
          .solidBodies(m.id)
          .every(
            (b) =>
              Math.hypot(x * 16 + 8 - b.x, y * 16 + 8 - b.y) >= b.radius + 7,
          )
      ) {
        previous.set(key, queue[i].join(","));
        queue.push([x, y]);
      }
    }
  const points: number[][] = [];
  let key: string | null = `${tx},${ty}`;
  assert.ok(previous.has(key), m.id);
  while (key) {
    points.unshift(key.split(",").map((v) => Number(v) * 16 + 8));
    key = previous.get(key)!;
  }
  return points;
}
function follow(s: Session, points: number[][]) {
  while (
    points.length &&
    Math.hypot(points[0][0] - s.world.x, points[0][1] - s.world.y) < 2
  )
    points.shift();
  const p = points[0];
  if (!p) return new Set<"up" | "down" | "left" | "right">();
  const dx = p[0] - s.world.x,
    dy = p[1] - s.world.y;
  return new Set<"up" | "down" | "left" | "right">([
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? "right"
        : "left"
      : dy > 0
        ? "down"
        : "up",
  ]);
}
test("村から主道を通り祭壇に到着して結末後に保存・帰還できる", () => {
  const s = game();
  Object.assign(s.world, vp(392, 380));
  s.world.mode = "run";
  // Turn-based exploration uses equipment and recovery items; enemies remain active.
  s.life.gain("回復薬", 30);
  for (const name of ["鋼剣", "革帽", "革鎧", "革靴", "鉄盾"]) {
    s.life.gain(name);
    s.life.equip(s.life.data.gear.at(-1)!.id);
  }
  const visited = new Set([s.world.mapId]);
  let planned = "",
    points: number[][] = [];
  for (let frame = 0; frame < 30000; frame++) {
    if (
      s.world.mapId === "NORTH" &&
      s.world.y <= 136 &&
      !s.world.transitioning &&
      !s.battle
    )
      break;
    if (s.battle) {
      if (
        s.canBattleAct &&
        s.hp < s.life.maxHp * 0.65 &&
        s.life.count("回復薬")
      )
        s.life.medicine("回復薬");
      else s.command("attack");
    }
    if (!s.world.transitioning && planned !== s.world.mapId) {
      planned = s.world.mapId;
      points = route(s, "up", s.world.mapId === "NORTH");
    }
    s.update(0.025, s.world.transitioning ? new Set() : follow(s, points));
    visited.add(s.world.mapId);
    assert.equal(s.screen, "field", `route ${s.world.mapId}, HP ${s.hp}`);
  }
  assert.deepEqual(
    [...visited],
    ["VIL", "GRASS", "SFOREST", "CFOREST", "MOUNT", "NORTH"],
  );
  assert.ok(s.world.y <= 136);
  s.interact();
  s.life.end("silent");
  assert.equal(s.life.data.ending, "silent");
  validateSnapshot(s.snapshot());
  planned = "";
  points = [];
  for (let frame = 0; frame < 30000 && s.world.mapId !== "VIL"; frame++) {
    if (s.battle) {
      if (
        s.canBattleAct &&
        s.hp < s.life.maxHp * 0.65 &&
        s.life.count("回復薬")
      )
        s.life.medicine("回復薬");
      else s.command("escape");
    }
    if (!s.world.transitioning && planned !== s.world.mapId) {
      planned = s.world.mapId;
      points = route(s, "down");
    }
    s.update(0.025, s.world.transitioning ? new Set() : follow(s, points));
    assert.equal(s.screen, "field");
  }
  assert.equal(s.world.mapId, "VIL");
});
