import {
  biomeAt,
  elevationAt,
  tileAt,
  type GameMap,
  type Tile,
} from "./maps.ts";

// Small original pixel tiles are painted once and reused. Decoration never changes collision.
const hash = (x: number, y: number, salt = 0) =>
  (Math.imul(x + 701, 374761393) ^
    Math.imul(y + 313, 668265263) ^
    Math.imul(salt + 1, 1274126177)) >>>
  0;
export class Terrain {
  private tiles = new Map<string, HTMLCanvasElement>();
  private sprite(
    key: string,
    width: number,
    height: number,
    paint: (c: CanvasRenderingContext2D) => void,
  ) {
    let canvas = this.tiles.get(key);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      paint(canvas.getContext("2d")!);
      this.tiles.set(key, canvas);
    }
    return canvas;
  }
  ground(
    c: CanvasRenderingContext2D,
    map: GameMap,
    x: number,
    y: number,
    px: number,
    py: number,
    time: number,
  ) {
    const tile = tileAt(map, x, y),
      variant = hash(x, y) % 8,
      biome = biomeAt(map, x, y);
    const image = this.sprite(
      `${tile}:${variant}:${elevationAt(map, x, y)}:${biome || ""}`,
      16,
      16,
      (ctx) => {
        const palette: Record<Tile, string[]> = {
          grass:
            biome === "森林"
              ? ["#698f65", "#82a16b", "#5c805e", "#a5b67c"]
              : elevationAt(map, x, y) > 0
                ? ["#97b96e", "#a5c47b", "#8aac68", "#b6ca86"]
                : ["#84ad68", "#90b571", "#7ea662", "#9dbb78"],
          cavefloor: ["#505a66", "#747d80", "#414f5e", "#89908b"],
          cavewall: ["#3f4e5b", "#68747b", "#303e4b", "#8b9392"],
          cliff: ["#678982", "#83a49b", "#4d6f73", "#a8b7a0"],
          stairs: ["#99aa8b", "#b8bea0", "#667f79", "#ccd0ad"],
          tree: ["#84ad68", "#90b571", "#7ea662", "#9dbb78"],
          rock: ["#84ad68", "#90b571", "#7ea662", "#9dbb78"],
          house: ["#b5a17a", "#c5b38c", "#a18d6b", "#cfbf97"],
          path: ["#c9bc88", "#d4c996", "#bdae7e", "#e0d4a1"],
          sand: ["#d8cb93", "#e9dba7", "#c4b984", "#f2e3b0"],
          wet: ["#6e9980", "#81aa8b", "#5c8876", "#a0b794"],
          water: ["#355678", "#3a5b7e", "#335476", "#426484"],
          floor: ["#ad9270", "#bda17b", "#927a5c", "#ccb18a"],
        };
        const colors = palette[tile];
        ctx.fillStyle = colors[0];
        ctx.fillRect(0, 0, 16, 16);
        for (let i = 0; i < (tile === "water" ? 3 : 6); i++) {
          const seed = hash(i, variant, tile.length),
            xx = seed % 16,
            yy = (seed >>> 8) % 16;
          ctx.fillStyle = colors[1 + ((seed >>> 16) % 3)];
          ctx.fillRect(xx, yy, 1 + (seed % 2), 1);
        }
        if (tile === "cavefloor") {
          ctx.fillStyle = "#4c545f";
          ctx.fillRect(2, 9, 9, 1);
          ctx.fillRect(10, 3, 1, 5);
          ctx.fillStyle = "#aaa28c";
          ctx.fillRect(4, 3, 2, 1);
          ctx.fillRect(12, 13, 2, 1);
        }
        if (tile === "cavewall") {
          ctx.fillStyle = "#283946";
          ctx.fillRect(0, 10, 16, 6);
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i % 2 ? "#687b85" : "#536874";
            ctx.fillRect(i * 6, 1, 5, 10 + i);
            ctx.fillStyle = "#95a09a";
            ctx.fillRect(i * 6, 1, 4, 1);
          }
          if (variant % 3 === 0) {
            ctx.fillStyle = "#769fba";
            ctx.fillRect(5, 5, 2, 5);
            ctx.fillStyle = "#b7d5d0";
            ctx.fillRect(5, 5, 1, 3);
          }
        }
        if (tile === "floor") {
          ctx.fillStyle = colors[2];
          ctx.fillRect(0, 15, 16, 1);
          ctx.fillRect(variant % 2 ? 12 : 4, 0, 1, 15);
        }
        if (
          (tile === "grass" || tile === "wet" || tile === "tree") &&
          variant % 3 === 0
        ) {
          const xx = 3 + variant,
            yy = 7 + (variant % 4);
          ctx.fillStyle = tile === "wet" ? "#527e66" : "#648d57";
          ctx.fillRect(xx, yy, 1, 3);
          ctx.fillRect(xx - 2, yy - 1, 1, 2);
          ctx.fillRect(xx + 2, yy, 1, 2);
          if (variant === 3) {
            ctx.fillStyle = "#e1d69c";
            ctx.fillRect(12, 4, 2, 1);
            ctx.fillStyle = "#d5dfc0";
            ctx.fillRect(4, 11, 1, 1);
          }
        }
      },
    );
    c.drawImage(image, px, py);
    if (map.id === "GRASS" && tile === "path" && biome === "沼地") {
      c.fillStyle = "#685b42";
      c.fillRect(px + 1, py, 14, 16);
      for (let yy = 0; yy < 16; yy += 4) {
        c.fillStyle = "#b4a078";
        c.fillRect(px + 2, py + yy, 12, 3);
        c.fillStyle = "#d5bc88";
        c.fillRect(px + 2, py + yy, 12, 1);
      }
    }
    if (tile === "cliff") {
      const level = elevationAt(map, x, y),
        lower = (dx: number, dy: number) =>
          elevationAt(map, x + dx, y + dy) < level;
      const fill = (
        xx: number,
        yy: number,
        w: number,
        h: number,
        color: string,
      ) => {
        c.fillStyle = color;
        c.fillRect(px + xx, py + yy, w, h);
      };
      fill(0, 0, 16, 16, "#97b96e");
      if (lower(0, 1)) {
        fill(0, 3, 16, 13, "#466975");
        // Connected uneven rock columns, without a rectangular frame around every tile.
        for (let col = 0; col < 3; col++) {
          const xx = col * 6 - 1,
            n = hash(x, y, col),
            top = 3 + (n % 3);
          fill(xx, top, 6, 11 - top, "#789c96");
          fill(xx + 1, top, 4, 2, "#a4b9a5");
          fill(xx + 1, top + 2, 5, 5, "#86a69b");
          fill(xx + 2, 12 - (n % 2), 4, 2, "#567e83");
          fill(xx + 5, top + 4, 1, 5, "#3c6370");
        }
        fill(0, 0, 16, 2, "#4b7552");
        fill(1, 0, 14, 1, "#c0d28d");
        fill(0, 1, 16, 2, "#82a65e");
        for (let n = 0; n < 4; n++)
          fill(n * 4, 2 + ((n + variant) % 2), 2, 2, "#6f9658");
      } else {
        if (lower(0, -1)) {
          fill(0, 0, 16, 2, "#456b56");
          fill(1, 2, 14, 1, "#b5cd88");
        }
        if (lower(-1, 0)) {
          fill(0, 0, 3, 16, "#4f7680");
          fill(3, 1, 1, 14, "#b9ce8b");
          fill(1, 3, 1, 9, "#90afa0");
        }
        if (lower(1, 0)) {
          fill(12, 0, 4, 16, "#4d737b");
          fill(12, 1, 1, 14, "#b4c98a");
          fill(14, 2, 1, 10, "#86a79c");
        }
        fill(5, 7, 2, 1, "#adc57c");
        fill(9, 12, 1, 2, "#82a565");
      }
      return;
    }
    if (tile === "stairs") {
      c.fillStyle = "#4e6d68";
      c.fillRect(px, py, 16, 16);
      for (let row = 0; row < 4; row++) {
        c.fillStyle = "#c1c8a7";
        c.fillRect(px + 2, py + row * 4, 12, 1);
        c.fillStyle = "#96a98f";
        c.fillRect(px + 2, py + row * 4 + 1, 12, 2);
        c.fillStyle = "#627f77";
        c.fillRect(px + 2, py + row * 4 + 3, 12, 1);
      }
      return;
    }
    if (tile === "water") {
      const phase = Math.floor(time / 6),
        n = hash(x, y, phase);
      if (n % 4 === 0) {
        c.fillStyle = "#587c99";
        c.fillRect(px + 3, py + 5 + (n % 6), 5, 1);
        c.fillStyle = "#7395ac";
        c.fillRect(px + 4, py + 4 + (n % 6), 2, 1);
      }
      const land = (dx: number, dy: number) =>
        tileAt(map, x + dx, y + dy) !== "water";
      c.fillStyle = "#75a5ac";
      if (land(0, -1)) c.fillRect(px, py, 16, 2);
      if (land(0, 1)) c.fillRect(px, py + 14, 16, 2);
      if (land(-1, 0)) c.fillRect(px, py, 2, 16);
      if (land(1, 0)) c.fillRect(px + 14, py, 2, 16);
      c.fillStyle = "#d0e7cf";
      for (let i = 0; i < 4; i++) {
        const n = (i * 5 + phase) % 16;
        if (land(0, -1)) c.fillRect(px + n, py + 1, 2, 1);
        if (land(0, 1)) c.fillRect(px + n, py + 14, 2, 1);
        if (land(-1, 0)) c.fillRect(px + 1, py + n, 1, 2);
        if (land(1, 0)) c.fillRect(px + 14, py + n, 1, 2);
      }
      return;
    }
    if (map.interior) return;
    const water = (dx: number, dy: number) =>
      tileAt(map, x + dx, y + dy) === "water";
    const path = (dx: number, dy: number) =>
      tileAt(map, x + dx, y + dy) === "path";
    // The grassy lip, rock face and foam follow adjacent water tiles, rather than a square overlay.
    const edge = (
      xx: number,
      yy: number,
      w: number,
      h: number,
      color: string,
    ) => {
      c.fillStyle = color;
      c.fillRect(px + xx, py + yy, w, h);
    };
    if (water(0, 1)) {
      if (tile !== "sand") {
        edge(0, 10, 16, 5, "#4d7470");
        edge(0, 10, 16, 1, "#b5c88d");
        for (let n = 2; n < 16; n += 5) edge(n, 12, 1, 3, "#72928b");
      }
      edge(0, 15, 16, 1, "#d3ead6");
      edge(2, 14, 3, 1, "#9bcbbd");
      edge(10, 14, 4, 1, "#9bcbbd");
    }
    if (water(0, -1)) {
      edge(0, 0, 16, 1, "#c4dfc6");
      edge(1, 1, 14, 1, tile === "sand" ? "#ece0ad" : "#afc77e");
    }
    if (water(-1, 0)) {
      edge(0, 0, 1, 16, "#d3ead6");
      edge(1, 1, 1, 14, tile === "sand" ? "#ece0ad" : "#587f6b");
    }
    if (water(1, 0)) {
      edge(15, 0, 1, 16, "#d3ead6");
      edge(14, 1, 1, 14, tile === "sand" ? "#ece0ad" : "#587f6b");
    }
    if (tile === "grass" || tile === "wet") {
      if (path(-1, 0)) edge(0, 0, 1, 16, "#b2be7c");
      if (path(1, 0)) edge(15, 0, 1, 16, "#b2be7c");
      if (path(0, -1)) edge(0, 0, 16, 1, "#b2be7c");
      if (path(0, 1)) edge(0, 15, 16, 1, "#b2be7c");
    }
    // A wooden crossing is visual decoration on the existing safe corridor.
    if (
      tile === "path" &&
      ["SFOREST", "EAST"].includes(map.id) &&
      x > map.width / 2 + 4 &&
      x < map.width / 2 + 11 &&
      Math.abs(y - Math.floor(map.height / 2)) <= 1
    ) {
      edge(0, 0, 16, 16, "#997d56");
      edge(1, 0, 1, 16, "#695d48");
      edge(3, 0, 1, 16, "#bda476");
      edge(9, 1, 1, 14, "#ac9367");
      if (y === Math.floor(map.height / 2) - 1) {
        edge(0, 0, 16, 2, "#d0b788");
        edge(3, 0, 2, 4, "#6b6049");
      }
      if (y === Math.floor(map.height / 2) + 1) {
        edge(0, 14, 16, 2, "#6b6049");
        edge(3, 11, 2, 4, "#d0b788");
      }
    }
  }
  object(
    c: CanvasRenderingContext2D,
    map: GameMap,
    x: number,
    y: number,
    px: number,
    py: number,
  ) {
    const tile = tileAt(map, x, y);
    if (tile === "grass" || tile === "wet") {
      const n = hash(x, y, 6);
      const rect = (
        xx: number,
        yy: number,
        w: number,
        h: number,
        color: string,
      ) => {
        c.fillStyle = color;
        c.fillRect(px + xx, py + yy, w, h);
      };
      if (n % 13 === 0) {
        rect(2, 9, 11, 4, "#476d52");
        rect(1, 8, 13, 2, "#476d52");
        rect(3, 5, 8, 6, "#729b57");
        rect(5, 4, 5, 2, "#a8bf6e");
        rect(3, 7, 3, 2, "#91ad61");
        rect(10, 8, 2, 3, "#577f51");
      } else if (n % 19 === 0) {
        for (let i = 0; i < 5; i++) {
          const xx = 2 + i * 2,
            yy = 6 + ((n >>> i) % 5);
          rect(xx, yy, 1, 5, "#477551");
          rect(xx - 1, yy - 1, 2, 1, "#9fba71");
        }
      } else if (n % 61 === 0) {
        rect(3, 10, 9, 3, "#4a7477");
        rect(4, 7, 6, 4, "#8bada0");
        rect(5, 6, 4, 1, "#bed0af");
        rect(9, 9, 3, 3, "#638b88");
      }
      return;
    }
    if (tile !== "tree" && tile !== "rock") return;
    const variant = hash(x, y) % 4;
    const image = this.sprite(`object:${tile}:${variant}`, 32, 40, (ctx) => {
      const rect = (
        x: number,
        y: number,
        w: number,
        h: number,
        color: string,
      ) => {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
      };
      if (tile === "tree") {
        // Stepped silhouettes and fixed dither clusters keep the art sharp at integer scales.
        rect(5, 33, 23, 3, "rgba(38,70,51,.18)");
        rect(9, 31, 16, 5, "rgba(38,70,51,.12)");
        rect(15, 21, 4, 16, "#485b49");
        rect(16, 22, 3, 14, "#c1b78d");
        rect(17, 24, 1, 10, "#e0cea0");
        rect(12, 36, 3, 2, "#d1c399");
        rect(19, 35, 2, 3, "#a39d76");
        const autumn = variant === 3;
        const colors = autumn
          ? ["#4b7050", "#6c8e52", "#9eac59", "#c8bf67", "#e0ce7b"]
          : ["#3d6650", "#4f8053", "#72a15d", "#9fbd6e", "#c3ce83"];
        const disk = (
          cx: number,
          cy: number,
          rx: number,
          ry: number,
          color: string,
        ) => {
          for (let row = -ry; row <= ry; row++) {
            const w = Math.round(
              rx * Math.sqrt(Math.max(0, 1 - (row * row) / (ry * ry))),
            );
            rect(cx - w, cy + row, w * 2 + 1, 1, color);
          }
        };
        disk(16, 20, 14, 12, colors[0]);
        disk(10, 17, 9, 10, colors[1]);
        disk(22, 17, 8, 10, colors[1]);
        disk(15, 12, 10, 10, colors[2]);
        disk(10, 10, 6, 7, colors[3]);
        disk(18, 7, 6, 6, colors[3]);
        for (let i = 0; i < 70; i++) {
          const seed = hash(i, variant),
            xx = 4 + (seed % 24),
            yy = 4 + ((seed >>> 8) % 26);
          if ((xx - 15) ** 2 / 145 + (yy - 17) ** 2 / 155 > 1) continue;
          rect(xx, yy, 2, 1, colors[yy < 12 ? 3 + (i % 2) : i % 3]);
        }
        rect(10, 6, 3, 1, colors[4]);
        rect(8, 13, 2, 1, colors[3]);
      } else {
        rect(8, 33, 18, 3, "#64855b");
        rect(7, 22, 18, 10, "#415c63");
        rect(5, 21, 21, 7, "#587a7a");
        rect(8, 16, 15, 13, "#71938b");
        rect(10, 14, 10, 3, "#a0b5a0");
        rect(6, 20, 4, 6, "#a0b5a0");
        rect(10, 17, 10, 5, "#93ac9c");
        rect(19, 22, 5, 8, "#4c6d71");
        rect(11, 26, 7, 4, "#83a090");
        rect(13, 15, 6, 1, "#c1c8a4");
        rect(12, 20, 1, 4, "#64877f");
        rect(13, 23, 3, 1, "#64877f");
      }
    });
    c.drawImage(image, px - 8, py - 22);
  }
}
