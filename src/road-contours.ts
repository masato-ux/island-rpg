import { tileAt, type Tile, type GameMap } from "./maps.ts";
type Point = [number, number];
interface Edge {
  a: Point;
  b: Point;
  used: boolean;
}
/** Trace the whole road boundary before rounding, so curves cross tile seams. */
export class RoadContours {
  private cache = new Map<string, Path2D>();
  path(map: GameMap, region: Tile | "land" = "path") {
    const key = `${map.id}:${region}`;
    const contains = (x: number, y: number) => {
      const tile = tileAt(map, x, y);
      return region === "land"
        ? !["water", "shallow"].includes(tile)
        : tile === region;
    };
    const cached = this.cache.get(key);
    if (cached) return cached;
    const edges: Edge[] = [];
    const starts = new Map<string, number[]>();
    const add = (a: Point, b: Point) => {
      const index = edges.length;
      edges.push({ a, b, used: false });
      const key = a.join(",");
      starts.set(key, [...(starts.get(key) || []), index]);
    };
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++)
        if (contains(x, y)) {
          if (!contains(x, y - 1))
            add([x * 16, y * 16], [(x + 1) * 16, y * 16]);
          if (!contains(x + 1, y))
            add([(x + 1) * 16, y * 16], [(x + 1) * 16, (y + 1) * 16]);
          if (!contains(x, y + 1))
            add([(x + 1) * 16, (y + 1) * 16], [x * 16, (y + 1) * 16]);
          if (!contains(x - 1, y))
            add([x * 16, (y + 1) * 16], [x * 16, y * 16]);
        }
    const path = new Path2D();
    for (const edge of edges) {
      if (edge.used) continue;
      const loop: Point[] = [];
      let current: Edge | undefined = edge;
      while (current && !current.used) {
        current.used = true;
        loop.push(current.a);
        const options: Edge[] = (starts.get(current.b.join(",")) || [])
          .map((i) => edges[i])
          .filter((e) => !e.used);
        // Prefer a right turn where two regions meet at only one corner.
        const dx: number = current.b[0] - current.a[0],
          dy: number = current.b[1] - current.a[1];
        current = options.sort(
          (a, b): number =>
            dx * (b.b[1] - b.a[1]) -
            dy * (b.b[0] - b.a[0]) -
            (dx * (a.b[1] - a.a[1]) - dy * (a.b[0] - a.a[0])),
        )[0];
      }
      const points = loop.filter((p, i) => {
        const a = loop[(i + loop.length - 1) % loop.length],
          b = loop[(i + 1) % loop.length];
        return (p[0] - a[0]) * (b[1] - p[1]) !== (p[1] - a[1]) * (b[0] - p[0]);
      });
      if (points.length < 3) continue;
      const corners = points.map((p, i) => {
        const a = points[(i + points.length - 1) % points.length],
          b = points[(i + 1) % points.length];
        const before = Math.hypot(p[0] - a[0], p[1] - a[1]),
          after = Math.hypot(b[0] - p[0], b[1] - p[1]);
        const radius = Math.min(20, before * 0.49, after * 0.49);
        return {
          p,
          enter: [
            p[0] + ((a[0] - p[0]) * radius) / before,
            p[1] + ((a[1] - p[1]) * radius) / before,
          ] as Point,
          exit: [
            p[0] + ((b[0] - p[0]) * radius) / after,
            p[1] + ((b[1] - p[1]) * radius) / after,
          ] as Point,
        };
      });
      path.moveTo(...corners[0].enter);
      for (const corner of corners) {
        path.lineTo(...corner.enter);
        path.quadraticCurveTo(...corner.p, ...corner.exit);
      }
      path.closePath();
    }
    this.cache.set(key, path);
    return path;
  }
}
