import { test } from "node:test";
import assert from "node:assert/strict";
import { readController } from "../src/controller.ts";
test("ゲームパッドのデッドゾーン・十字キー・切断解除", () => {
  const buttons = Array.from({ length: 16 }, () => ({
    pressed: false,
    value: 0,
    touched: false,
  }));
  let state = readController({ axes: [0.2, -0.1], buttons });
  assert.equal(state.directions.size, 0);
  buttons[12].pressed = true;
  buttons[5].pressed = true;
  state = readController({ axes: [0.9, 0], buttons });
  assert.ok(state.directions.has("right"));
  assert.ok(state.directions.has("up"));
  assert.equal(state.run, true);
  assert.equal(readController(null).directions.size, 0);
});
