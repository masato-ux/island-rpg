import {
  FADE_SECONDS,
  RADIUS,
  SPEED,
  TILE,
  vectors,
  type Direction,
} from "./constants.ts";
import { maps, isBlocked, tileAt, villagePoint, type MapId } from "./maps.ts";
interface Transition {
  to: MapId;
  x: number;
  y: number;
  switched: boolean;
}
export class World {
  mapId: MapId = "VIL";
  x = villagePoint(392, 552).x;
  y = villagePoint(392, 552).y;
  facing: Direction = "down";
  moving = false;
  animation = 0;
  mode: "walk" | "run" | "sneak" = "walk";
  transition = 0;
  private next: Transition | null = null;
  get map() {
    return maps[this.mapId];
  }
  reset() {
    this.mapId = "VIL";
    this.x = villagePoint(392, 552).x;
    this.y = villagePoint(392, 552).y;
    this.next = null;
    this.transition = 0;
    this.moving = false;
    this.facing = "down";
  }
  canStand(x: number, y: number) {
    return [
      [-RADIUS, -RADIUS],
      [RADIUS, -RADIUS],
      [-RADIUS, RADIUS],
      [RADIUS, RADIUS],
    ].every(
      ([dx, dy]) =>
        !isBlocked(
          this.map,
          Math.floor((x + dx) / TILE),
          Math.floor((y + dy) / TILE),
        ),
    );
  }
  travel(to: MapId, x: number, y: number) {
    if (this.next) return;
    this.next = { to, x, y, switched: false };
    this.transition = 0;
  }
  update(seconds: number, held: ReadonlySet<Direction>, speedMultiplier = 1) {
    const dt = Math.max(0, Math.min(seconds, 0.1));
    this.moving = false;
    if (this.next) {
      this.transition += dt;
      if (this.transition >= FADE_SECONDS / 2 && !this.next.switched) {
        this.mapId = this.next.to;
        this.x = this.next.x;
        this.y = this.next.y;
        this.next.switched = true;
      }
      if (this.transition >= FADE_SECONDS) {
        this.next = null;
        this.transition = 0;
      }
      return;
    }
    let dx = 0,
      dy = 0;
    for (const dir of held) {
      dx += vectors[dir][0];
      dy += vectors[dir][1];
      this.facing = dir;
    }
    const norm = Math.hypot(dx, dy) || 1,
      wet =
        tileAt(this.map, Math.floor(this.x / 16), Math.floor(this.y / 16)) ===
        "wet"
          ? 0.7
          : 1,
      speed =
        SPEED *
        (this.mode === "run" ? 1.6 : this.mode === "sneak" ? 0.5 : 1) *
        wet *
        speedMultiplier;
    const count = Math.max(1, Math.ceil((speed * dt) / 3)),
      beforeX = this.x,
      beforeY = this.y;
    for (let i = 0; i < count; i++) {
      const nx = this.x + ((dx / norm) * speed * dt) / count,
        ny = this.y + ((dy / norm) * speed * dt) / count;
      if (this.canStand(nx, this.y)) this.x = nx;
      if (this.canStand(this.x, ny)) this.y = ny;
      for (const [side, exit] of Object.entries(this.map.exits)) {
        const vertical = side === "up" || side === "down",
          cross = vertical
            ? Math.abs(this.x - (this.map.width / 2) * 16) < 24
            : Math.abs(this.y - Math.floor(this.map.height / 2) * 16) < 24;
        const edge =
          side === "up"
            ? this.y < 16
            : side === "down"
              ? this.y > (this.map.height - 1) * 16
              : side === "left"
                ? this.x < 16
                : this.x > (this.map.width - 1) * 16;
        if (cross && edge) {
          const m = maps[exit.to],
            x =
              exit.side === "left"
                ? 24
                : exit.side === "right"
                  ? (m.width - 1.5) * 16
                  : (m.width / 2 + 0.5) * 16,
            y =
              exit.side === "up"
                ? 24
                : exit.side === "down"
                  ? (m.height - 1.5) * 16
                  : (Math.floor(m.height / 2) + 0.5) * 16;
          this.travel(m.id, x, y);
          break;
        }
      }
      if (this.next) break;
    }
    this.moving = this.x !== beforeX || this.y !== beforeY;
    if (this.moving) this.animation += dt;
  }
  get transitioning() {
    return this.next !== null;
  }
  get fade() {
    return this.next
      ? 1 - Math.abs(this.transition / (FADE_SECONDS / 2) - 1)
      : 0;
  }
}
