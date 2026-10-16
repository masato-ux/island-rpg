import { test } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/session.ts";
import { people, items, recipes } from "../src/data.ts";
import { maps, outdoors, isBlocked } from "../src/maps.ts";
import { SaveStore, validateSnapshot } from "../src/save.ts";
import dialogues from "../src/data/dialogues.json" with { type: "json" };
const idle = new Set<never>();
function game() {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.inventory["魂の楔"] = 1;
  return s;
}
function meet(s: Session, id: string) {
  const p = people.find((p) => p.id === id)!;
  const pos = s.life.position(p);
  s.world.mapId = pos.map;
  s.world.x = pos.x;
  s.world.y = pos.y;
  return p;
}
test("会話96話題・メモ任意・削除で人物情報再計算・未記録依頼は一度だけ再質問", () => {
  assert.equal(dialogues.length, 96);
  const s = game(),
    l = s.life;
  meet(s, "N07");
  l.topic("N07", "N07-0");
  assert.equal(l.data.notes.length, 0);
  l.memo(false);
  assert.equal(l.data.notes.length, 0);
  l.topic("N07", "N07-0");
  l.memo(true);
  assert.equal(l.personInfo[0].name, "ダン");
  l.removeNote(l.data.notes[0].id);
  assert.equal(l.personInfo.length, 0);
  meet(s, "N04");
  l.accept("N04");
  l.memo(false);
  l.offer("N04");
  assert.equal(l.data.quests[0].reaskedOnce, true);
  assert.equal(l.pendingMemo, null);
  l.offer("N04");
  assert.match(s.message, /済んで/);
  assert.equal(l.data.notes.length, 0);
});
test("依頼期限・直接納品・メモ連動・贈り物の上限と複数カテゴリ", () => {
  const s = game(),
    l = s.life;
  meet(s, "N04");
  l.accept("N04");
  l.memo(true);
  s.inventory["木の枝"] = 3;
  const before = l.data.money;
  l.deliver("N04");
  assert.equal(l.data.quests[0].state, "completed");
  assert.equal(l.data.money, before + 25);
  assert.equal(l.data.notes[0].quest, l.data.quests[0].id);
  l.data.social.N04.trust = 58;
  l.data.social.N04.categories = ["gift"];
  l.trust("N04", 4, "gift");
  assert.equal(l.data.social.N04.trust, 59);
  l.trust("N04", 8, "quest");
  assert.equal(l.data.social.N04.trust, 67);
  meet(s, "N11");
  l.accept("N11");
  s.advance(3 * 86400);
  assert.equal(l.data.quests[1].state, "failed");
});
test("NPC日課：12人の勤務・帰宅・睡眠、閉店後の受取不可と依頼報告", () => {
  const s = game(),
    l = s.life;
  assert.equal(people.length, 12);
  s.clock = 10 * 3600;
  for (const p of people) {
    assert.equal(l.position(p).map, "VIL");
    assert.equal(
      isBlocked(
        maps.VIL,
        Math.floor(l.position(p).x / 16),
        Math.floor(l.position(p).y / 16),
      ),
      false,
    );
  }
  s.clock = 22 * 3600;
  assert.ok(people.every((p) => l.position(p).sleeping));
  s.clock = 19 * 3600;
  const p = meet(s, "N10");
  assert.equal(l.available(p), false);
  assert.equal(l.available(p, false), true);
});
test("室内睡眠はMP回復、眠っていても空腹低下、空腹睡眠で死亡", () => {
  const s = game(),
    l = s.life;
  s.world.mapId = "HOME";
  s.world.x = 88;
  s.world.y = 56;
  s.mp = 0;
  s.hp = 1;
  l.sleep(7);
  assert.equal(s.hp, 120);
  assert.equal(s.mp, 160);
  assert.ok(l.data.hunger < 50);
  assert.equal(s.screen, "field");
  l.data.hunger = 0;
  l.sleep(2);
  assert.equal(s.screen, "dead");
});
test("全8エリアが往復接続・全ゲートから主道を歩ける", () => {
  const seen = new Set<string>(),
    queue = ["VIL"];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const map = maps[id as keyof typeof maps];
    for (const [side, exit] of Object.entries(map.exits)) {
      assert.ok(maps[exit.to].exits[exit.side]?.to === id);
      queue.push(exit.to);
      const x =
          side === "left"
            ? 0
            : side === "right"
              ? map.width - 1
              : map.width / 2,
        y =
          side === "up"
            ? 0
            : side === "down"
              ? map.height - 1
              : Math.floor(map.height / 2);
      assert.equal(isBlocked(map, x, y), false);
    }
  }
  assert.equal(seen.size, 8);
  assert.equal(outdoors.length, 8);
});
test("採集の成功/中断/強化終了時の必要段階再判定、強化では数量が増えない", () => {
  const s = game(),
    l = s.life;
  for (const enemy of s.enemies) {
    enemy.x = 24;
    enemy.y = 24;
  }
  s.world.mapId = "GRASS";
  const node = l.nodeList("GRASS")[0];
  s.world.x = node.x;
  s.world.y = node.y;
  l.gather(node.id);
  assert.ok(l.action);
  l.actionUpdate(3);
  assert.ok(l.count("草") >= 1);
  assert.equal(l.action, null);
  const n = l.nodeList("GRASS")[2];
  l.gain("石斧");
  const g = l.data.gear.at(-1)!;
  s.world.x = n.x;
  s.world.y = n.y;
  l.gather(n.id, g.id);
  l.cancelAction();
  assert.equal(g.durability, 40);
  s.world.mapId = "MOUNT";
  const rare = l.nodeList("MOUNT")[0];
  s.world.x = rare.x;
  s.world.y = rare.y;
  g.name = "石ツルハシ";
  g.enhancedUntil = s.clock + 1;
  l.gather(rare.id, g.id);
  assert.ok(l.action);
  s.clock += 2;
  l.actionUpdate(0.1);
  assert.equal(l.action, null);
  assert.equal(g.durability, 40);
});
test("釣り中断・失敗時の餌/耐久、魔法強化と耐久1の成功後消失", () => {
  const s = game(),
    l = s.life;
  l.gain("木竿");
  l.gain("ミミズ", 3);
  const rod = l.data.gear.at(-1)!;
  s.world.x = 552;
  s.world.y = 568;
  l.fish(rod.id, "ミミズ");
  assert.equal(l.count("ミミズ"), 2);
  l.cancelAction();
  assert.equal(rod.durability, 40);
  rod.durability = 1;
  l.fish(rod.id, "ミミズ");
  l.actionUpdate(3);
  assert.equal(
    l.data.gear.some((g) => g.id === rod.id),
    false,
  );
  assert.equal(l.count("ミミズ"), 1);
  l.gain("石斧");
  const g = l.data.gear.at(-1)!;
  l.boost(g.id);
  assert.ok(g.enhancedUntil > s.clock);
  assert.equal(s.mp, 145);
});
test("工房FIFO・営業時間跨ぎ・未着手返金・完成品無期限保持・修理", () => {
  const s = game(),
    l = s.life;
  s.clock = 17.5 * 3600;
  meet(s, "N10");
  l.data.money = 1000;
  s.inventory["木材"] = 20;
  l.craft("craft-木剣");
  l.craft("craft-木盾");
  assert.equal(l.data.jobs.length, 2);
  s.advance(3600);
  assert.equal(l.data.jobs[0].remaining, 90);
  assert.equal(l.data.jobs[1].state, "queued");
  s.clock = 19 * 3600;
  meet(s, "N10");
  l.cancelJob(l.data.jobs[1].id);
  assert.equal(l.data.jobs.length, 2);
  s.clock = 9 * 3600;
  meet(s, "N10");
  l.cancelJob(l.data.jobs[1].id);
  assert.equal(l.data.jobs.length, 1);
  s.advance(2 * 3600);
  assert.equal(l.data.jobs[0].state, "ready");
  s.advance(86400);
  assert.equal(l.data.jobs[0].state, "ready");
});
test("購入数リセット・まとめ売り・各店の買い取り制限", () => {
  const s = game(),
    l = s.life;
  s.clock = 10 * 3600;
  meet(s, "N12");
  l.data.money = 500;
  l.buy("N12", "木竿");
  assert.equal(l.data.stocks["N12:木竿"], 0);
  l.buy("N12", "木竿");
  assert.equal(l.data.gear.filter((g) => g.name === "木竿").length, 1);
  l.gain("アジ・大", 2);
  const before = l.data.money;
  l.sell("N12", { "アジ・大": 2 });
  assert.equal(l.data.money, before + 64);
  assert.equal(l.count("アジ・大"), 0);
  assert.equal(l.sellPrice("N05", "鉄鉱石"), null);
  s.advance(86400);
  assert.deepEqual(l.data.stocks, {});
});
test("転移杭・全世界保存・探索霧・結末後も生活継続", () => {
  const s = game(),
    l = s.life;
  s.world.mapId = "SFOREST";
  s.world.x = 776;
  s.world.y = 584;
  l.gain("転移杭");
  l.placeStake();
  assert.ok(l.data.stakes.SFOREST);
  l.reveal();
  assert.ok(l.data.fog.SFOREST.includes("1"));
  const memory = new Map<string, string>(),
    store = new SaveStore({
      getItem: (k) => memory.get(k) || null,
      setItem: (k, v) => {
        memory.set(k, v);
      },
    });
  const before = s.snapshot();
  store.save(before);
  l.data.money = 0;
  l.data.notes.push({ id: 44, npc: "N07", at: 0, text: "temp" });
  s.restore(store.load()!);
  assert.deepEqual(s.snapshot(), before);
  s.life.interaction = { kind: "altar", id: "altar", title: "", text: "" };
  s.life.end("silent");
  assert.equal(s.life.data.ending, "silent");
  assert.equal(s.screen, "field");
  assert.throws(() =>
    validateSnapshot({
      ...s.snapshot(),
      life: { ...s.life.data, levels: { sword: 999 } },
    }),
  );
});
test("全エリアの各ゲートまで地形を歩いて往復できる", () => {
  for (const map of outdoors) {
    const sx = Math.floor(map.width / 2),
      sy = Math.floor(map.height / 2),
      queue = [[sx, sy]],
      seen = new Set([`${sx},${sy}`]);
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = x + dx,
          yy = y + dy,
          key = `${xx},${yy}`;
        if (!seen.has(key) && !isBlocked(map, xx, yy)) {
          seen.add(key);
          queue.push([xx, yy]);
        }
      }
    }
    for (const side of Object.keys(map.exits)) {
      const x = side === "left" ? 0 : side === "right" ? map.width - 1 : sx,
        y = side === "up" ? 0 : side === "down" ? map.height - 1 : sy;
      assert.ok(seen.has(`${x},${y}`), `${map.id} ${side}`);
    }
  }
});
test("睡眠で0に達した後の次区間で死亡、生活状態の完全巻戻し", () => {
  const s = game(),
    l = s.life;
  s.world.mapId = "HOME";
  s.world.x = 88;
  s.world.y = 56;
  l.data.hunger = 1;
  l.sleep(1);
  assert.equal(s.screen, "field");
  assert.equal(l.data.hunger, 0);
  l.sleep(1);
  assert.equal(s.screen, "dead");
  const t = game();
  t.life.data.weather = "rain";
  t.life.data.weatherUntil = 1e9;
  t.advance(3600);
  assert.equal(t.life.data.cold, 1);
  t.life.medicine("風邪薬"); // No stock, so the cold must remain.
  assert.equal(t.life.data.cold, 1);
});
test("強化期限の通知は使用中だけ、魚種重みは強化の有無で変えない", () => {
  const s = game(),
    l = s.life;
  l.gain("木剣");
  const g = l.data.gear.at(-1)!;
  g.enhancedUntil = s.clock + 2;
  s.message = "keep";
  s.advance(3);
  assert.equal(s.message, "keep");
  l.equip(g.id);
  g.enhancedUntil = s.clock + 2;
  s.advance(3);
  assert.match(s.message, /切れた/);
});
test("料理試作・魚サイズ反映・装備売却は耐久比・修理待ち品は売却不可", () => {
  const s = game(),
    l = s.life;
  s.world.mapId = "HOME";
  s.inventory["薬草"] = 2;
  s.inventory["水"] = 1;
  l.cookTrial({ 薬草: 2, 水: 1 });
  assert.equal(l.count("風邪薬"), 1);
  assert.ok(l.data.known.includes("風邪薬"));
  s.inventory["アジ・大"] = 1;
  s.inventory["木の枝"] = 1;
  l.cookTrial({ "アジ・大": 1, 木の枝: 1 });
  assert.equal(l.count("焼き魚・大"), 1);
  l.gain("鉄剣");
  const sword = l.data.gear.at(-1)!;
  sword.durability = 35;
  assert.equal(l.sellPrice("N10", "@" + sword.id), 48);
  sword.durability = 0;
  assert.equal(l.sellPrice("N10", "@" + sword.id), null);
});
test("通常と強化した竿は同じ成功シードで魚種・サイズが同一", () => {
  let compared = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const result = [];
    for (const boost of [false, true]) {
      const s = game(),
        l = s.life;
      l.gain("木竿");
      l.gain("ミミズ");
      const g = l.data.gear.at(-1)!;
      if (boost) g.enhancedUntil = s.clock + 3600;
      s.rngSeed = seed;
      s.world.x = 552;
      s.world.y = 568;
      l.fish(g.id, "ミミズ");
      l.actionUpdate(3);
      result.push(
        Object.fromEntries(
          Object.entries(s.inventory).filter(
            ([name]) => name !== "魂の楔" && name !== "ミミズ",
          ),
        ),
      );
    }
    if (Object.keys(result[0]).length && Object.keys(result[1]).length) {
      assert.deepEqual(result[0], result[1]);
      compared++;
    }
  }
  assert.ok(compared > 10);
});
test("旧v1保存は新規世界状態を補完して読める", () => {
  const s = game(),
    v = s.snapshot();
  const legacy = {
    ...v,
    version: 1,
    enemies: v.enemies.slice(0, 6),
    inventory: { ...v.inventory, 流木: 1 },
  };
  delete (legacy as { life?: unknown }).life;
  const migrated = validateSnapshot(legacy);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.life.money, 30);
  assert.ok(migrated.enemies.length > 6);
  assert.equal(migrated.inventory["流木"], undefined);
});
test("群れは最大3体、敵の個別攻撃タイマーが進む", () => {
  const s = game();
  s.world.mapId = "MOUNT";
  s.world.x = 960;
  s.world.y = 672;
  const wolves = s.enemies.filter((e) => e.mapId === "MOUNT");
  for (const [i, e] of wolves.entries()) {
    e.x = 980 + i;
    e.y = 672;
  }
  s.beginBattle(wolves[0]);
  assert.equal(s.battle!.members.length, 3);
  const old = structuredClone(s.battle!.timers);
  s.update(0.1, new Set());
  for (const id of s.battle!.members) assert.ok(s.battle!.timers[id] < old[id]);
});
test("非戦闘の行動・遊び・メモ選択も途中から保存して再開", () => {
  const s = game(),
    l = s.life;
  s.world.mapId = "GRASS";
  const node = l.nodeList("GRASS")[0];
  s.world.x = node.x;
  s.world.y = node.y;
  l.gather(node.id);
  l.actionUpdate(0.1);
  l.pendingMemo = { npc: "N07", text: "途中のメモ" };
  const before = s.snapshot();
  const valid = validateSnapshot(before);
  s.restore(valid);
  assert.deepEqual(s.life.snapshotActivity(), before.activity);
  assert.ok(s.life.action!.remaining < 300);
  s.life.cancelAction();
  s.world.mapId = "VIL";
  s.clock = 10 * 3600;
  meet(s, "N03");
  s.life.playWith("N03", "hide");
  const playing = validateSnapshot(s.snapshot());
  s.restore(playing);
  assert.equal(s.life.play!.kind, "hide");
});
