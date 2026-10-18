import test from "node:test";
import assert from "node:assert/strict";
import { canOccupy, moveOffice, spawn, objects } from "../src/office-model.ts";
test("オフィス入口から応接室・会議室・個室・休憩室へ通路を歩いて到達する", () => {
  const step = 4,
    start = { x: 500, y: 562 },
    seen = new Set<string>(),
    queue = [start];
  seen.add(`${start.x},${start.y}`);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ]) {
      const x = p.x + dx,
        y = p.y + dy,
        k = `${x},${y}`;
      if (!seen.has(k) && canOccupy(x, y)) {
        seen.add(k);
        queue.push({ x, y });
      }
    }
  }
  for (const [name, x, y] of [
    ["応接室", 180, 180],
    ["会議室", 490, 220],
    ["個室", 600, 240],
    ["北東室", 810, 230],
    ["休憩室", 810, 510],
  ] as const)
    assert.ok(
      queue.some((p) => Math.hypot(p.x - x, p.y - y) < 12),
      name,
    );
  assert.ok(canOccupy(spawn.x, spawn.y));
});
test("長い移動でも机・壁をすり抜けずに止まる", () => {
  const desk = objects.find((o) => o.name === "南列 1番デスク")!;
  const p = { x: desk.x + 30, y: desk.y - 20 };
  moveOffice(p, 0, 100);
  assert.ok(p.y <= desk.y - 8 + 0.01);
  assert.equal(canOccupy(desk.x + 10, desk.y + 10), false);
  const wall = { x: 50, y: 300 };
  moveOffice(wall, -500, 0);
  assert.ok(wall.x >= 30);
  assert.ok(canOccupy(wall.x, wall.y));
});
