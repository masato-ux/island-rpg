import { test } from "node:test";
import assert from "node:assert/strict";
import { rooms, furnitureBlocks } from "../src/interiors.ts";
import { Session } from "../src/session.ts";
import { maps, canStandOn, TERRAIN_VERSION } from "../src/maps.ts";
import { validateSnapshot } from "../src/save.ts";
import { people } from "../src/data.ts";
function game() {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.inventory = { 魂の楔: 1 };
  return s;
}
test("6軒の入口から入って歩き、南側の戸口から元の家の前へ帰れる", () => {
  for (const b of maps.VIL.buildings) {
    const s = game(),
      x = (b.x + b.w / 2) * 16 + 8,
      y = (b.y + b.h) * 16 + 8;
    Object.assign(s.world, { x, y, facing: "up" });
    assert.equal(s.life.nearest(), true);
    for (let i = 0; i < 4; i++) s.world.update(0.1, new Set());
    assert.equal(s.world.mapId, b.interior);
    assert.ok(s.world.canStand(s.world.x, s.world.y));
    s.world.update(0.1, new Set(["up"]));
    assert.ok(s.world.y < 96);
    Object.assign(s.world, { x: 88, y: 104 });
    s.life.nearest();
    for (let i = 0; i < 4; i++) s.world.update(0.1, new Set());
    assert.equal(s.world.mapId, "VIL");
    assert.equal(s.world.x, x);
    assert.equal(s.world.y, y);
  }
});
test("各室内の家具を避けて歩ける。帰宅した12人も通行可能な位置に立つ", () => {
  const signatures = new Set<string>();
  for (const b of maps.VIL.buildings) {
    const s = game();
    s.world.mapId = b.interior;
    const room = rooms[b.interior]!;
    signatures.add(JSON.stringify(room.furniture));
    for (const p of room.furniture) {
      assert.ok(furnitureBlocks(b.interior, p.x + p.w / 2, p.y + p.h / 2));
      assert.equal(s.world.canStand(p.x + p.w / 2, p.y + p.h / 2), false);
    }
    // Flood fill with the same player radius as movement. Every walkable spot has an exit route.
    const queue = [[88, 96]],
      seen = new Set(["88,96"]);
    for (let i = 0; i < queue.length; i++)
      for (const [dx, dy] of [
        [2, 0],
        [-2, 0],
        [0, 2],
        [0, -2],
      ]) {
        const x = queue[i][0] + dx,
          y = queue[i][1] + dy,
          key = `${x},${y}`;
        if (!seen.has(key) && s.world.canStand(x, y)) {
          seen.add(key);
          queue.push([x, y]);
        }
      }
    for (let y = 22; y <= 106; y += 2)
      for (let x = 22; x <= 138; x += 2)
        if (s.world.canStand(x, y))
          assert.ok(seen.has(`${x},${y}`), `${b.interior}: ${x},${y}`);
  }
  assert.equal(signatures.size, 6);
  const s = game();
  s.clock = 20 * 3600;
  for (const p of people) {
    const pos = s.life.position(p);
    assert.ok(canStandOn(maps[pos.map], pos.x, pos.y), p.id);
  }
});
test("FIELD 04の家具上セーブは進行を保って移動し、屋外は再縮小しない", () => {
  const s = game();
  s.world.mapId = "HOME";
  s.world.x = 32;
  s.world.y = 40;
  const old = s.snapshot();
  old.terrainVersion = 4;
  const migrated = validateSnapshot(old);
  assert.ok(canStandOn(maps.HOME, migrated.x, migrated.y));
  assert.notEqual(migrated.x, 32);
  assert.equal(migrated.terrainVersion, TERRAIN_VERSION);
  s.world.reset();
  const outside = s.snapshot();
  outside.terrainVersion = 4;
  const restored = validateSnapshot(outside);
  assert.equal(restored.x, outside.x);
  assert.equal(restored.y, outside.y);
});
