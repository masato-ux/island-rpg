import { test } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/session.ts";
import { World } from "../src/state.ts";
import { people } from "../src/data.ts";
import { villagePoint } from "../src/maps.ts";

test("歩行・走行・斜め移動で杭を通過せず、側方へ回り込める", () => {
  for (const mode of ["walk", "run"] as const) {
    const w = new World(),
      body = { ...villagePoint(392, 488), radius: 7 };
    Object.assign(w, { x: body.x, y: body.y + 32, mode });
    for (let i = 0; i < 40; i++) w.update(0.1, new Set(["up"]), 1, [body]);
    assert.ok(w.y >= body.y + 12);
    for (let i = 0; i < 6; i++)
      w.update(0.1, new Set(["up", "left"]), 1, [body]);
    assert.ok(Math.hypot(w.x - body.x, w.y - body.y) >= 12);
    assert.ok(w.x < body.x - 12);
  }
});
test("開始直後のダンに接触して止まり、離れてから回り込める", () => {
  const s = new Session();
  s.start();
  const dan = s.life.position(people.find((p) => p.id === "N07")!);
  for (let i = 0; i < 20; i++) s.update(0.05, new Set(["right"]));
  assert.ok(s.world.x <= dan.x - 10);
  assert.ok(s.world.x > villagePoint(392, 552).x);
  for (let i = 0; i < 8; i++) s.update(0.05, new Set(["down"]));
  for (let i = 0; i < 12; i++) s.update(0.05, new Set(["right"]));
  assert.ok(s.world.x > dan.x + 10);
});
test("旧セーブ・新設杭・移動してきた住人との重なりから外へ離れられる", () => {
  const w = new World(),
    body = { ...villagePoint(392, 488), radius: 7 };
  Object.assign(w, body);
  for (let i = 0; i < 5; i++) w.update(0.1, new Set(["down"]), 1, [body]);
  assert.ok(w.y >= body.y + 12);
  const before = w.y;
  for (let i = 0; i < 20; i++) w.update(0.1, new Set(["up"]), 1, [body]);
  assert.ok(w.y >= body.y + 12 && w.y < before);
});
test("転移は杭の中心ではなく、接触せず操作できる近傍へ着地する", () => {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  const stake = s.life.data.stakes.VIL;
  Object.assign(s.world, { x: stake.x, y: stake.y + 16 });
  s.life.teleport("VIL");
  assert.ok(s.world.transitioning);
  for (let i = 0; i < 6; i++) s.update(0.1, new Set());
  assert.ok(Math.hypot(s.world.x - stake.x, s.world.y - stake.y) >= 12);
  assert.ok(Math.hypot(s.world.x - stake.x, s.world.y - stake.y) <= 36);
  assert.ok(s.world.canStand(s.world.x, s.world.y));
});
