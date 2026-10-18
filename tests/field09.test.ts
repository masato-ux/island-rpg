import { test } from "node:test";
import assert from "node:assert/strict";
import { maps, tileAt, canStandOn, isBlocked } from "../src/maps.ts";
import * as old from "../src/field08-maps.ts";
import { World } from "../src/state.ts";
import { Session } from "../src/session.ts";
import { validateSnapshot } from "../src/save.ts";
const count = (id: keyof typeof maps, tiles: string[]) => {
  const m = maps[id];
  let n = 0;
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++) if (tiles.includes(tileAt(m, x, y))) n++;
  return n / (m.width * m.height);
};
test("森林は木を密生させ、湿地と沿岸は全面で地表を描き分ける", () => {
  for (const id of ["SFOREST", "CFOREST"] as const)
    assert.ok(count(id, ["tree"]) > 0.55, id);
  assert.ok(count("EAST", ["wet", "deepmud"]) > 0.85);
  assert.ok(count("EAST", ["deepmud"]) > 0.5);
  assert.ok(count("WEST", ["sand", "shallow", "water"]) > 0.85);
  assert.ok(count("WEST", ["shallow"]) > 0.03);
});
test("深い沼を歩けず、浅いぬかるみと浅瀬は歩け、浅瀬では速度が落ちる", () => {
  let deep: number[] | undefined, shallow: number[] | undefined;
  for (let y = 1; y < maps.EAST.height - 1 && !deep; y++)
    for (let x = 1; x < maps.EAST.width - 1 && !deep; x++)
      if (tileAt(maps.EAST, x, y) === "deepmud")
        deep = [x * 16 + 8, y * 16 + 8];
  for (let y = 1; y < maps.WEST.height - 1 && !shallow; y++)
    for (let x = 1; x < maps.WEST.width - 2 && !shallow; x++)
      if (
        tileAt(maps.WEST, x, y) === "shallow" &&
        tileAt(maps.WEST, x + 1, y) === "shallow"
      )
        shallow = [x * 16 + 8, y * 16 + 8];
  assert.ok(deep && shallow);
  assert.equal(canStandOn(maps.EAST, ...(deep as [number, number])), false);
  assert.ok(canStandOn(maps.WEST, ...(shallow as [number, number])));
  const w = new World();
  w.mapId = "WEST";
  [w.x, w.y] = shallow;
  const before = w.x;
  w.update(0.1, new Set(["right"]));
  assert.ok(w.x > before);
  assert.ok(w.x - before < 6);
});
test("旧湿地の保存位置を安全な経路へ移し、通行可能な湿地は全て主道に繋がる", () => {
  const m = maps.EAST,
    queue = [[m.width / 2, 0]],
    seen = new Set([`${m.width / 2},0`]);
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
      if (!seen.has(key) && !isBlocked(m, x, y)) {
        seen.add(key);
        queue.push([x, y]);
      }
    }
  for (let y = 0; y < m.height; y++)
    for (let x = 0; x < m.width; x++)
      if (!isBlocked(m, x, y)) assert.ok(seen.has(`${x},${y}`), `${x},${y}`);
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.inventory = { 魂の楔: 1 };
  s.world.mapId = "EAST";
  let p: number[] | undefined;
  for (let y = 1; y < m.height && !p; y++)
    for (let x = 1; x < m.width && !p; x++)
      if (
        old.canStandOn(old.maps.EAST, x * 16 + 8, y * 16 + 8) &&
        !canStandOn(m, x * 16 + 8, y * 16 + 8)
      )
        p = [x * 16 + 8, y * 16 + 8];
  assert.ok(p);
  [s.world.x, s.world.y] = p;
  const data = s.snapshot();
  data.terrainVersion = 8;
  data.life.stakes.EAST = { x: p[0], y: p[1] };
  const restored = validateSnapshot(data);
  assert.ok(canStandOn(m, restored.x, restored.y));
  assert.ok(
    seen.has(`${Math.floor(restored.x / 16)},${Math.floor(restored.y / 16)}`),
  );
  assert.ok(
    canStandOn(m, restored.life.stakes.EAST.x, restored.life.stakes.EAST.y),
  );
});
