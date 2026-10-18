// Seeded patches stay fixed while walking, reloading and restoring a save.
function value(x: number, y: number, salt: number) {
  return (
    ((Math.imul(x + 113, 374761393) ^
      Math.imul(y + 227, 668265263) ^
      Math.imul(salt + 1, 1274126177)) >>>
      0) /
    4294967295
  );
}
function noise(x: number, y: number, size: number, salt: number) {
  const gx = Math.floor(x / size),
    gy = Math.floor(y / size),
    tx = x / size - gx,
    ty = y / size - gy;
  const sx = tx * tx * (3 - 2 * tx),
    sy = ty * ty * (3 - 2 * ty);
  const a = value(gx, gy, salt) * (1 - sx) + value(gx + 1, gy, salt) * sx;
  const b =
    value(gx, gy + 1, salt) * (1 - sx) + value(gx + 1, gy + 1, salt) * sx;
  return a * (1 - sy) + b * sy;
}
export function grassDensity(map: string, x: number, y: number): 0 | 1 | 2 {
  const salt = [...map].reduce((s, c) => s + c.charCodeAt(0), 0);
  const n = noise(x, y, 5, salt) * 0.7 + noise(x, y, 11, salt + 7) * 0.3;
  return n < 0.4 ? 0 : n < 0.58 ? 1 : 2;
}
