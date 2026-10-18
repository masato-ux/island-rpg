import { test } from "node:test";
import assert from "node:assert/strict";
import {
  maps,
  tileAt,
  isBlocked,
  canStandOn,
  biomeSites,
  biomeAt,
} from "../src/maps.ts";
import { Session } from "../src/session.ts";
import { validateSnapshot } from "../src/save.ts";
import * as field07 from "../src/field07-maps.ts";
import { houseStyles } from "../src/architecture.ts";
function reachable() {
  const queue = [[24, 36]],
    seen = new Set(["24,36"]);
  for (let i = 0; i < queue.length; i++)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = queue[i][0] + dx,
        y = queue[i][1] + dy,
        key = `${x},${y}`;
      if (!seen.has(key) && !isBlocked(maps.GRASS, x, y)) {
        seen.add(key);
        queue.push([x, y]);
      }
    }
  return seen;
}
test("北側の6種類の地形へ村側から歩け、洞窟の奥へ入り戻れる", () => {
  const seen = reachable();
  for (const site of biomeSites) {
    assert.equal(biomeAt(maps.GRASS, site.x, site.y), site.name);
    assert.ok(seen.has(`${site.x},${site.y}`), site.name);
  }
  for (let y = 0; y < maps.GRASS.height; y++)
    for (let x = 0; x < maps.GRASS.width; x++)
      if (tileAt(maps.GRASS, x, y) === "cavefloor")
        assert.ok(seen.has(`${x},${y}`));
  assert.equal(tileAt(maps.GRASS, 31, 8), "cavewall");
  assert.equal(canStandOn(maps.GRASS, 31 * 16 + 8, 8 * 16 + 8), false);
  const s = new Session();
  for (const e of s.enemies.slice(0, 6)) {
    assert.ok(canStandOn(maps.GRASS, e.x, e.y));
    assert.ok(seen.has(`${Math.floor(e.x / 16)},${Math.floor(e.y / 16)}`));
  }
});
test("平屋と二階建てが混在し、家の前が揃わず、村の側面も凹凸を持つ", () => {
  assert.deepEqual(
    new Set(Object.values(houseStyles).map((s) => s.stories)),
    new Set([1, 2]),
  );
  assert.ok(new Set(maps.VIL.buildings.map((b) => b.y + b.h)).size >= 4);
  for (const side of ["left", "right"]) {
    const edges = new Set<number>();
    for (let y = 1; y < 33; y++) {
      let x = side === "left" ? 0 : 39;
      while (x >= 0 && x < 40 && tileAt(maps.VIL, x, y) === "water")
        x += side === "left" ? 1 : -1;
      edges.add(x);
    }
    assert.ok(edges.size >= 3);
  }
});
test("FIELD 07の保存と敵・杭を変化した村と北側地形へ移行できる", () => {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.inventory = { 魂の楔: 1 };
  s.world.mapId = "GRASS";
  // A former walkable cell now occupied by the cave wall.
  let point: { x: number; y: number } | undefined;
  for (let y = 3; y < 15 && !point; y++)
    for (let x = 31; x <= 44 && !point; x++)
      if (
        field07.canStandOn(field07.maps.GRASS, x * 16 + 8, y * 16 + 8) &&
        !canStandOn(maps.GRASS, x * 16 + 8, y * 16 + 8)
      )
        point = { x: x * 16 + 8, y: y * 16 + 8 };
  assert.ok(point);
  Object.assign(s.world, point);
  const data = s.snapshot();
  data.terrainVersion = 7;
  data.life.stakes.GRASS = point;
  Object.assign(data.enemies[0], point, { spawnX: point.x, spawnY: point.y });
  const result = validateSnapshot(data);
  assert.ok(canStandOn(maps.GRASS, result.x, result.y));
  assert.ok(
    canStandOn(
      maps.GRASS,
      result.life.stakes.GRASS.x,
      result.life.stakes.GRASS.y,
    ),
  );
  assert.ok(canStandOn(maps.GRASS, result.enemies[0].x, result.enemies[0].y));
  assert.equal(result.story.wedge, true);
});
