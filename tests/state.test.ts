import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "../src/state.ts";
import { maps, isBlocked, villagePoint, tileAt } from "../src/maps.ts";
test("村と草原の往復、ゲート座標、安全な出現", () => {
  const w = new World();
  w.x = maps.VIL.width * 8 + 8;
  w.y = 17;
  w.update(0.1, new Set(["up"]));
  w.update(0.1, new Set());
  w.update(0.1, new Set());
  assert.equal(w.mapId, "GRASS");
  assert.ok(w.canStand(w.x, w.y));
  w.update(0.1, new Set());
  w.update(0.1, new Set());
  w.update(0.1, new Set(["down"]));
  w.update(0.1, new Set(["down"]));
  w.update(0.1, new Set());
  w.update(0.1, new Set());
  assert.equal(w.mapId, "VIL");
  assert.ok(w.canStand(w.x, w.y));
});
test("半径5pxの衝突、走る/忍び足、遅延フレーム上限", () => {
  const w = new World();
  w.y = villagePoint(392, 36 * 16).y;
  for (let i = 0; i < 100; i++) w.update(0.1, new Set(["down"]));
  assert.ok(w.y < maps.VIL.height * 16 - 5);
  assert.ok(w.canStand(w.x, w.y));
  w.reset();
  const start = w.y;
  w.update(100, new Set(["up"]));
  assert.ok(start - w.y <= 6.41);
  w.reset();
  w.mode = "run";
  w.update(0.1, new Set(["up"]));
  const run = villagePoint(392, 552).y - w.y;
  w.reset();
  w.mode = "sneak";
  w.update(0.1, new Set(["up"]));
  assert.ok(run > 3 * (villagePoint(392, 552).y - w.y));
  for (const b of maps.VIL.buildings)
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++)
        assert.ok(isBlocked(maps.VIL, x, y));
  assert.equal(maps.GRASS.width, 48);
  assert.equal(maps.VIL.height, 34);
});
test("南海岸から北口まで主道で徒歩到達", () => {
  const w = new World();
  for (let i = 0; i < 1000 && w.mapId === "VIL"; i++)
    w.update(0.1, new Set(["up"]));
  assert.equal(w.mapId, "GRASS");
});
