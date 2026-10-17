import { test } from "node:test";
import assert from "node:assert/strict";
import {
  maps,
  outdoors,
  tileAt,
  legacyTileAt,
  elevationAt,
  isBlocked,
  canStandOn,
  TERRAIN_VERSION,
} from "../src/maps.ts";
import { World } from "../src/state.ts";
import { Session } from "../src/session.ts";
import { validateSnapshot, SaveStore } from "../src/save.ts";
function game() {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.inventory = { 魂の楔: 1 };
  return s;
}
function reached(map: typeof maps.VIL) {
  const x = Math.floor(map.width / 2),
    y = Math.floor(map.height / 2),
    queue = [[x, y]],
    seen = new Set([`${x},${y}`]);
  for (let i = 0; i < queue.length; i++)
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = queue[i][0] + dx,
        yy = queue[i][1] + dy,
        key = `${xx},${yy}`;
      if (!seen.has(key) && !isBlocked(map, xx, yy)) {
        seen.add(key);
        queue.push([xx, yy]);
      }
    }
  return seen;
}
test("全高台の通行可能セルに階段を経由して到達でき、山岳は二段になる", () => {
  for (const map of outdoors) {
    const seen = reached(map);
    let top = 0,
      stairs = 0;
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++) {
        if (tileAt(map, x, y) === "stairs") stairs++;
        if (elevationAt(map, x, y) > 0 && !isBlocked(map, x, y)) {
          assert.ok(seen.has(`${x},${y}`), `${map.id}:${x},${y}`);
          top++;
        }
      }
    assert.ok(top > 20);
    assert.ok(stairs >= 3);
  }
  assert.equal(elevationAt(maps.MOUNT, 45, 38), 2);
});
test("崖へは進めず、階段から高台へ上り下りできる", () => {
  const w = new World();
  w.x = 27 * 16 + 8;
  w.y = 30 * 16 + 8;
  assert.equal(tileAt(maps.VIL, 28, 30), "cliff");
  for (let i = 0; i < 20; i++) w.update(0.1, new Set(["right"]));
  assert.ok(w.x < 28 * 16 - 4);
  w.x = 34 * 16 + 8;
  w.y = 34 * 16 + 8;
  for (let i = 0; i < 12; i++) w.update(0.1, new Set(["up"]));
  assert.ok(elevationAt(w.map, Math.floor(w.x / 16), Math.floor(w.y / 16)) > 0);
  assert.ok(w.canStand(w.x, w.y));
  for (let i = 0; i < 12; i++) w.update(0.1, new Set(["down"]));
  assert.equal(
    elevationAt(w.map, Math.floor(w.x / 16), Math.floor(w.y / 16)),
    0,
  );
});
test("道は中央の直線から曲がり、ゲートと各建物の入口へ通れる", () => {
  assert.equal(tileAt(maps.VIL, 20, 7), "path");
  assert.notEqual(tileAt(maps.VIL, 24, 7), "path");
  for (const map of outdoors) {
    const seen = reached(map);
    for (const side of Object.keys(map.exits)) {
      const x =
        side === "left" ? 0 : side === "right" ? map.width - 1 : map.width / 2;
      const y =
        side === "up"
          ? 0
          : side === "down"
            ? map.height - 1
            : Math.floor(map.height / 2);
      assert.equal(tileAt(map, x, y), "path");
      assert.ok(seen.has(`${x},${y}`));
    }
  }
  const seen = reached(maps.VIL);
  for (const b of maps.VIL.buildings)
    assert.ok(seen.has(`${b.x + b.w / 2},${b.y + b.h}`));
});
test("海岸は複数の位置で折れ、旧海岸の保存位置も安全を保つ", () => {
  const edges = new Set<number>();
  for (let y = 5; y < 80; y++) {
    let x = 0;
    while (tileAt(maps.WEST, x, y) === "water" && x < maps.WEST.width) x++;
    edges.add(x);
  }
  assert.ok(edges.size >= 3);
  for (const [x, y] of [
    [392, 552],
    [552, 568],
    [264, 488],
  ])
    assert.ok(canStandOn(maps.VIL, x, y));
});
test("旧地形の保存位置・転移杭・魔物を新しい崖から安全に補正し、進行を保持する", () => {
  const s = game();
  s.world.mapId = "GRASS";
  const map = maps.GRASS;
  let point: { x: number; y: number } | undefined;
  for (let y = 1; y < map.height && !point; y++)
    for (let x = 1; x < map.width && !point; x++)
      if (
        tileAt(map, x, y) === "cliff" &&
        canStandOn(map, x * 16 + 8, y * 16 + 8, true)
      )
        point = { x: x * 16 + 8, y: y * 16 + 8 };
  assert.ok(point);
  s.world.x = point.x;
  s.world.y = point.y;
  s.life.data.stakes.GRASS = { ...point };
  s.inventory["薬草"] = 7;
  s.life.data.money = 123;
  const v = s.snapshot();
  delete v.terrainVersion;
  v.enemies[0].x = point.x;
  v.enemies[0].y = point.y;
  const data = validateSnapshot(v);
  assert.equal(data.terrainVersion, TERRAIN_VERSION);
  assert.ok(canStandOn(map, data.x, data.y));
  assert.notDeepEqual({ x: data.x, y: data.y }, point);
  assert.ok(
    canStandOn(map, data.life.stakes.GRASS.x, data.life.stakes.GRASS.y),
  );
  assert.ok(canStandOn(map, data.enemies[0].x, data.enemies[0].y));
  assert.equal(data.inventory["薬草"], 7);
  assert.equal(data.life.money, 123);
  assert.equal(data.clock, v.clock);
  assert.deepEqual(v.life.stakes.GRASS, point);
  const store = new SaveStore({ getItem: () => null, setItem: () => {} });
  assert.deepEqual(store.import(store.export(data)), data);
});
test("現在版の障害物内保存と未知の地形版を拒否し、正常な保存を完全復元する", () => {
  const s = game(),
    v = s.snapshot();
  assert.deepEqual(validateSnapshot(v), v);
  assert.throws(() => validateSnapshot({ ...v, terrainVersion: 99 }));
  assert.throws(() =>
    validateSnapshot({ ...v, x: 28 * 16 + 8, y: 30 * 16 + 8 }),
  );
  assert.equal(legacyTileAt(maps.VIL, 28, 30), "grass");
  for (const e of s.enemies)
    assert.ok(canStandOn(maps[e.mapId || "GRASS"], e.x, e.y));
});
