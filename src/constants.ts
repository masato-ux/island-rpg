export const TILE = 16;
export const WIDTH = 320;
export const HEIGHT = 180;
export const SPEED = 64;
export const RADIUS = 5;
export const FADE_SECONDS = 0.25;
export type Direction = "up" | "down" | "left" | "right";
export const vectors: Record<Direction, readonly [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};
