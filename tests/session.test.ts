import { test } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/session.ts";
import { SaveStore, validateSnapshot } from "../src/save.ts";
const idle = new Set<never>();
function advance(s: Session, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / 0.1); i++) s.update(0.1, idle);
}
function completed() {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  Object.assign(s.inventory, { 紙とペン: 1, 草: 1, 魂の楔: 1, 魔法の袋: 1 });
  return s;
}
function memory() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

test("時計：タイトル/非表示/死亡中停止、通常/戦闘中進行、休止フレームを制限", () => {
  const s = new Session(),
    initial = s.clock;
  s.update(10, idle);
  assert.equal(s.clock, initial);
  s.start();
  s.update(10, idle);
  assert.equal(s.clock, initial + 1);
  s.update(0.1, idle, true);
  assert.equal(s.clock, initial + 1);
  s.beginBattle(s.enemies[0]);
  s.update(0.1, idle);
  assert.equal(s.clock, initial + 2);
  s.screen = "dead";
  s.update(0.1, idle);
  assert.equal(s.clock, initial + 2);
  s.screen = "field";
  s.clock = 86399;
  s.update(0.1, idle);
  assert.equal(s.timeLabel, "DAY 2 00:00");
});
test("戦闘：連打を抑制、時間経過で敵が攻撃、防御は1回だけ", () => {
  const s = new Session();
  s.start();
  s.beginBattle(s.enemies[1]);
  const enemy = s.enemy!;
  assert.equal(s.command("defend"), true);
  assert.equal(s.command("attack"), false);
  const hp = enemy.hp;
  advance(s, 0.5);
  assert.equal(s.command("attack"), true);
  assert.ok(enemy.hp <= hp);
  const playerHp = s.hp;
  advance(s, 4);
  assert.ok(s.hp < playerHp);
  assert.equal(s.battle!.defending, false);
});
test("撃破で素材のみ入手、遠方の敵停止、再出現は時刻に従う", () => {
  const s = new Session();
  s.start();
  const e = s.enemies[1];
  e.hp = 1;
  s.beginBattle(e);
  // Find a deterministic successful hit without changing combat assertions.
  s.rngSeed = 1;
  assert.equal(s.command("attack"), true);
  assert.equal(s.battle, null);
  assert.equal(s.inventory["粘液"], 1);
  assert.ok(e.respawnAt > s.clock + 29 * 60);
  assert.equal(s.inventory["銅貨"], undefined);
  const before = structuredClone(s.enemies);
  advance(s, 2);
  assert.deepEqual(s.enemies, before);
  s.world.mapId = "GRASS";
  s.world.x = 584;
  s.world.y = 870;
  s.clock = e.respawnAt;
  s.update(0.1, idle);
  assert.equal(e.hp, 24);
});
test("家禽だけ気絶、通常敵では死亡し時計停止", () => {
  const training = completed();
  training.story.trained = false;
  training.story.wedge = false;
  training.story.gathered = true;
  training.world.x = 16 * 16 + 8;
  training.world.y = 30 * 16 + 8;
  training.interact();
  assert.equal(training.enemy!.kind, "fowl");
  training.hp = 1;
  training.rngSeed = 1;
  advance(training, 10);
  assert.equal(training.story.trained, true);
  assert.equal(training.hp, 120);
  assert.equal(training.screen, "field");
  const s = new Session();
  s.start();
  s.hp = 1;
  s.beginBattle(s.enemies[1]);
  s.rngSeed = 1;
  advance(s, 5);
  assert.equal(s.screen, "dead");
  const clock = s.clock;
  advance(s, 1);
  assert.equal(s.clock, clock);
});
test("プロローグの順序と楔の入手、採集は時間を圧縮して処理", () => {
  const s = new Session();
  s.start();
  s.world.x = 29 * 16 + 8;
  s.world.y = 17 * 16 + 8;
  s.interact();
  assert.equal(s.story.wedge, false);
  s.world.x = 25 * 16 + 8;
  s.world.y = 34 * 16 + 8;
  s.interact();
  assert.equal(s.inventory["紙とペン"], 1);
  s.world.x = 24 * 16 + 8;
  s.world.y = 30 * 16 + 8;
  const start = s.clock;
  s.interact();
  assert.equal(s.story.gathered, false);
  s.update(0.1, idle, true);
  assert.equal(s.gathering, 2);
  advance(s, 2);
  assert.equal(s.story.gathered, true);
  assert.ok(Math.abs(s.clock - start - 300) < 1e-6);
  s.story.trained = true;
  s.world.x = 29 * 16 + 8;
  s.world.y = 17 * 16 + 8;
  s.interact();
  assert.equal(s.story.wedge, true);
  assert.equal(s.inventory["魂の楔"], 1);
});
test("保存→時刻/乱数/位置/HP/素材/物語/討伐敵をすべて巻き戻す", () => {
  const s = completed(),
    storage = memory(),
    store = new SaveStore(storage);
  const saved = s.snapshot();
  store.save(saved);
  s.hp = 5;
  s.clock += 400;
  s.inventory["粘液"] = 9;
  s.story.wedge = false;
  s.world.x = 100;
  s.enemies[0].hp = 0;
  s.random();
  s.restore(store.load()!);
  assert.deepEqual(s.snapshot(), saved);
  const expected = s.random();
  s.restore(saved);
  assert.equal(s.random(), expected);
});
test("A/B：破損した最新世代を避け、書込失敗でも最後の正常世代を保持", () => {
  const s = completed(),
    storage = memory(),
    store = new SaveStore(storage);
  store.save(s.snapshot());
  const first = s.clock;
  s.clock += 60;
  store.save(s.snapshot());
  assert.equal(store.load()!.clock, first + 60);
  storage.map.set("silent-castaway.v1.B", "corrupt");
  assert.equal(store.load()!.clock, first);
  const failing = new SaveStore({
    getItem: storage.getItem,
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
  });
  assert.throws(() => failing.save(s.snapshot()));
  assert.equal(failing.load()!.clock, first);
});
test("JSON往復、不正/異版/欠損/障害物内データを拒否", () => {
  const s = completed(),
    store = new SaveStore(memory()),
    raw = store.export(s.snapshot());
  assert.deepEqual(store.import(raw), s.snapshot());
  assert.throws(() => store.import(raw.replace("120", "119")));
  assert.throws(() => store.import("{"));
  for (const change of [
    { version: 999 },
    { hp: NaN },
    { mapId: "OTHER" },
    { x: 0 },
    { enemies: [] },
    { story: {} },
    { clock: -1 },
  ])
    assert.throws(() => validateSnapshot({ ...s.snapshot(), ...change }));
  assert.throws(() => store.export(new Session().snapshot()));
});
