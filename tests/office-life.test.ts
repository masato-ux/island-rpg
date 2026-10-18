import test from "node:test";
import assert from "node:assert/strict";
import {
  newOfficeLife,
  returnHome,
  nextOfficeDay,
  weekday,
  parseOfficeLife,
  canOccupyHome,
  homeSpawn,
  moveHome,
} from "../src/office-life.ts";
test("帰宅で通常25・金曜50回復し、自宅では二重回復せず翌日へ進む", () => {
  const normal = { ...newOfficeLife(), stamina: 20 };
  assert.ok(returnHome(normal));
  assert.equal(normal.stamina, 45);
  assert.equal(returnHome(normal), false);
  assert.equal(normal.stamina, 45);
  assert.equal(normal.day, 1);
  assert.ok(nextOfficeDay(normal));
  assert.equal(normal.day, 2);
  assert.equal(nextOfficeDay(normal), false);
  const friday = { ...newOfficeLife(), day: 5, stamina: 20 };
  returnHome(friday);
  assert.equal(friday.stamina, 70);
  assert.equal(friday.fridayRest, true);
  nextOfficeDay(friday);
  assert.equal(weekday(friday.day), "土");
  const cap = { ...newOfficeLife(), day: 5, stamina: 90 };
  returnHome(cap);
  assert.equal(cap.stamina, 100);
  assert.equal(cap.recovered, 10);
});
test("自宅での保存を回復せず復元し、旧保存を補完し不正な体力や日付を拒否する", () => {
  const l = newOfficeLife();
  returnHome(l);
  assert.deepEqual(parseOfficeLife(JSON.parse(JSON.stringify(l))), l);
  assert.equal(parseOfficeLife(undefined)?.day, 1);
  for (const patch of [
    { stamina: -1 },
    { stamina: 101 },
    { day: 0 },
    { day: 1.5 },
    { place: "unknown" },
    { recovered: 60 },
  ])
    assert.equal(parseOfficeLife({ ...l, ...patch }), null);
  assert.equal(weekday(8), "月");
});
test("自宅の家具と外壁を通り抜けず、玄関へ歩ける", () => {
  assert.ok(canOccupyHome(homeSpawn.x, homeSpawn.y));
  const p = { ...homeSpawn };
  moveHome(p, 0, 100);
  assert.ok(p.y >= 526 && p.y <= 532);
  assert.equal(canOccupyHome(250, 200), false);
  assert.equal(canOccupyHome(100, 100), false);
});
