import type { Direction } from "./constants.ts";
export interface ControllerState {
  directions: Set<Direction>;
  pressed: Set<number>;
  run: boolean;
  sneak: boolean;
}
export function readController(
  pad: Pick<Gamepad, "axes" | "buttons"> | null,
): ControllerState {
  const directions = new Set<Direction>(),
    pressed = new Set<number>();
  if (!pad) return { directions, pressed, run: false, sneak: false };
  pad.buttons.forEach((b, i) => {
    if (b.pressed) pressed.add(i);
  });
  const [x = 0, y = 0] = pad.axes;
  if (x < -0.35 || pressed.has(14)) directions.add("left");
  if (x > 0.35 || pressed.has(15)) directions.add("right");
  if (y < -0.35 || pressed.has(12)) directions.add("up");
  if (y > 0.35 || pressed.has(13)) directions.add("down");
  return { directions, pressed, run: pressed.has(5), sneak: pressed.has(4) };
}
