import { test } from "node:test";
import assert from "node:assert/strict";
import { Session, type Enemy } from "../src/session.ts";
import { maps, safePosition } from "../src/maps.ts";
const idle = new Set<never>();
function run(s: Session, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / 0.05); i++) s.update(0.05, idle);
}
function arena() {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.world.mapId = "GRASS";
  const p = safePosition(maps.GRASS, 384, 488)!;
  Object.assign(s.world, p);
  s.enemies = [];
  s.random = () => 0.25;
  const enemy = (id: string, kind: Enemy["kind"], dx = 0, dy = 0): Enemy => ({
    id,
    kind,
    x: p.x + dx,
    y: p.y + dy,
    hp: 100,
    respawnAt: 0,
    heading: 0,
    aiTimer: 10,
    spawnX: p.x + dx,
    spawnY: p.y + dy,
  });
  return { s, enemy };
}
test("接触で戦闘へ入り、プレイヤーは止まるが選択中も別の魔物が移動する", () => {
  const { s, enemy } = arena();
  const first = enemy("first", "slime"),
    other = enemy("other", "rat", 32);
  s.enemies = [first, other];
  run(s, 0.1);
  assert.ok(s.battle);
  const before = { x: other.x, y: other.y },
    hero = { x: s.world.x, y: s.world.y },
    hp = s.hp;
  for (let i = 0; i < 20; i++) s.update(0.05, new Set(["right"]));
  assert.deepEqual({ x: s.world.x, y: s.world.y }, hero);
  assert.notDeepEqual({ x: other.x, y: other.y }, before);
  assert.equal(s.hp, hp);
});
test("近くの異種の敵が援軍として参加し、遠い敵と壁の向こうの敵は加わらない", () => {
  const { s, enemy } = arena();
  const first = enemy("first", "slime"),
    near = enemy("near", "dog", 12),
    far = enemy("far", "wolf", 180);
  s.enemies = [first, near, far];
  s.beginBattle(first);
  run(s, 3);
  assert.ok(s.battle!.members.includes("near"));
  assert.ok(!s.battle!.members.includes("far"));
  assert.ok(s.battle!.log.some((t) => t.includes("援軍")));
  const blocked = arena();
  const b = blocked.enemy("wall", "goblin", 12);
  blocked.s.enemies = [blocked.enemy("a", "slime"), b];
  blocked.s.beginBattle(blocked.s.enemies[0]);
  // Put a wall between the player and the enemy using an existing cave wall.
  const map = maps.GRASS;
  let wall: { x: number; y: number } | null = null;
  for (let y = 4; y < 16 && !wall; y++)
    for (let x = 31; x < 44 && !wall; x++) {
      if (safePosition(map, x * 16 + 8, y * 16 + 8)?.x !== x * 16 + 8) continue;
      if (
        !blocked.s.world.canStand(x * 16 + 8 + 16, y * 16 + 8) &&
        blocked.s.world.canStand(x * 16 + 8 + 32, y * 16 + 8)
      )
        wall = { x: x * 16 + 8, y: y * 16 + 8 };
    }
  assert.ok(wall);
  Object.assign(blocked.s.world, wall);
  Object.assign(b, {
    x: wall.x + 32,
    y: wall.y,
    spawnX: wall.x + 32,
    spawnY: wall.y,
    heading: Math.PI,
  });
  run(blocked.s, 3);
  assert.ok(Math.hypot(b.x - blocked.s.world.x, b.y - blocked.s.world.y) < 48);
  assert.ok(!blocked.s.battle!.members.includes("wall"));
});
test("敵ターン中の新規援軍は次のターンから行動し、同時参加は最大4体", () => {
  const { s, enemy } = arena();
  const first = enemy("first", "slime");
  s.enemies = [
    first,
    ...Array.from({ length: 6 }, (_, i) => enemy(`add-${i}`, "dog", i)),
  ];
  s.beginBattle(first);
  s.battle!.reinforcementTimer = 0.1;
  s.command("defend");
  run(s, 0.15);
  assert.equal(s.battle!.pending.length, 1);
  assert.equal(s.battle!.members.length, 4);
  run(s, 0.4);
  assert.equal(s.battle!.phase, "player");
  assert.equal(s.battle!.turn, 2);
  s.command("defend");
  assert.equal(s.battle!.pending.length, 4);
  assert.equal(s.command("attack"), false);
});
test("対象を選んで攻撃し、薬・魔法も1行動を消費する。非表示中は援軍も停止", () => {
  const { s, enemy } = arena();
  const a = enemy("a", "wolf"),
    b = enemy("b", "wolf", 2);
  s.enemies = [a, b];
  s.beginBattle(a);
  s.selectBattleTarget("b");
  s.command("attack");
  assert.ok(b.hp < 100);
  assert.equal(a.hp, 100);
  const elapsed = s.battle!.elapsed,
    position = b.x;
  s.update(1, idle, true);
  assert.equal(s.battle!.elapsed, elapsed);
  assert.equal(b.x, position);
  run(s, 1);
  s.life.gain("回復薬");
  s.hp = 50;
  s.life.medicine("回復薬");
  assert.equal(s.hp, 90);
  assert.equal(s.battle!.phase, "enemy");
  assert.equal(s.command("attack"), false);
  run(s, 1);
  const mp = s.mp;
  s.life.boost("driftwood");
  assert.ok(s.mp < mp);
  assert.equal(s.battle!.phase, "enemy");
});
