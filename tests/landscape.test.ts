import { readFileSync } from "node:fs";
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
  terracesFor,
  villagePoint,
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
  assert.ok(terracesFor(maps.MOUNT).some((t) => t.level === 2));
});
test("崖へは進めず、階段から高台へ上り下りできる", () => {
  const w = new World();
  let cliff: { x: number; y: number } | undefined;
  for (let y = 1; y < maps.VIL.height && !cliff; y++)
    for (let x = 2; x < maps.VIL.width && !cliff; x++)
      if (tileAt(maps.VIL, x, y) === "cliff" && !isBlocked(maps.VIL, x - 1, y))
        cliff = { x, y };
  assert.ok(cliff);
  w.x = (cliff.x - 1) * 16 + 8;
  w.y = cliff.y * 16 + 8;
  for (let i = 0; i < 20; i++) w.update(0.1, new Set(["right"]));
  assert.ok(w.x < cliff.x * 16 - 4);
  Object.assign(w, villagePoint(552, 552));
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
  assert.equal(tileAt(maps.VIL, 17, 6), "path");
  assert.notEqual(tileAt(maps.VIL, 20, 6), "path");
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
      assert.ok(
        ["path", "wet", "shallow", "sand", "stairs"].includes(
          tileAt(map, x, y),
        ),
        `${map.id}:${x},${y}`,
      );
      assert.ok(seen.has(`${x},${y}`));
    }
  }
  const seen = reached(maps.VIL);
  for (const b of maps.VIL.buildings)
    assert.ok(seen.has(`${Math.floor(b.x + b.w / 2)},${b.y + b.h}`));
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
  ]) {
    const p = villagePoint(x, y);
    assert.ok(canStandOn(maps.VIL, p.x, p.y));
  }
});
test("旧地形の保存位置・探索霧を縮小し、進行を保持して再保存する", () => {
  const raw = readFileSync(
    new URL("./fixtures/field03-save.json", import.meta.url),
    "utf8",
  );
  const original = JSON.parse(raw).data;
  const store = new SaveStore({ getItem: () => null, setItem: () => {} }),
    data = store.import(raw);
  assert.equal(data.terrainVersion, TERRAIN_VERSION);
  assert.ok(canStandOn(maps.VIL, data.x, data.y));
  assert.ok(data.x < original.x);
  assert.ok(data.y < original.y);
  assert.equal(data.inventory["薬草"], 7);
  assert.equal(data.life.money, 123);
  assert.equal(data.clock, original.clock);
  assert.equal(data.life.fog.VIL.length, maps.VIL.width * maps.VIL.height);
  assert.ok(data.life.fog.VIL.includes("1"));
  assert.ok(
    canStandOn(maps.VIL, data.life.stakes.VIL.x, data.life.stakes.VIL.y),
  );
  assert.deepEqual(store.import(store.export(data)), data);
});
test("現在版の障害物内保存と未知の地形版を拒否し、正常な保存を完全復元する", () => {
  const s = game(),
    v = s.snapshot();
  assert.deepEqual(validateSnapshot(v), v);
  assert.throws(() => validateSnapshot({ ...v, terrainVersion: 99 }));
  let cliff: { x: number; y: number } | undefined;
  for (let y = 0; y < maps.VIL.height && !cliff; y++)
    for (let x = 0; x < maps.VIL.width && !cliff; x++)
      if (tileAt(maps.VIL, x, y) === "cliff") cliff = { x, y };
  assert.ok(cliff);
  assert.throws(() =>
    validateSnapshot({ ...v, x: cliff.x * 16 + 8, y: cliff.y * 16 + 8 }),
  );
  assert.equal(legacyTileAt(maps.VIL, 28, 30), "grass");
  for (const e of s.enemies)
    assert.ok(canStandOn(maps[e.mapId || "GRASS"], e.x, e.y));
});
test("村と各屋外の実寸を縮小し、地形版のない保存も引き継げる", () => {
  const old = JSON.parse(
    readFileSync(
      new URL("./fixtures/field03-save.json", import.meta.url),
      "utf8",
    ),
  ).data;
  delete old.terrainVersion;
  const migrated = validateSnapshot(old);
  assert.equal(maps.VIL.width, 40);
  assert.equal(maps.VIL.height, 34);
  assert.equal(maps.GRASS.width, 48);
  assert.equal(maps.CFOREST.width, 80);
  assert.equal(migrated.terrainVersion, TERRAIN_VERSION);
  assert.ok(canStandOn(maps.VIL, migrated.x, migrated.y));
  assert.equal(migrated.inventory["薬草"], 7);
  assert.equal(migrated.life.money, 123);
});

test("拡張した6軒は人物に対して十分な幅があり、導入の人物・草・釣り場を塞がない", () => {
  for (const b of maps.VIL.buildings) {
    assert.ok(b.w >= 5);
    assert.ok(b.h >= 5);
  }
  for (const [x, y] of [
    [392, 552],
    [408, 552],
    [264, 488],
    [392, 488],
    [472, 280],
    [552, 568],
  ]) {
    const p = villagePoint(x, y);
    assert.ok(canStandOn(maps.VIL, p.x, p.y), `${x},${y}`);
  }
});
