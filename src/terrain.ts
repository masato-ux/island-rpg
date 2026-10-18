import { paintNature, groundMood } from "./nature-art.ts";
import { roundedBox } from "./rounded-box.ts";
import { RoadContours } from "./road-contours.ts";
import { grassDensity } from "./surface-detail.ts";
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
  private roads = new RoadContours();
  private tiles = new Map<string, HTMLCanvasElement>();
  private sprite(
    key: string,
    width: number,
    height: number,
    paint: (c: CanvasRenderingContext2D) => void,
    resolution = 1,
  ) {
    let canvas = this.tiles.get(key);
    if (canvas) {
      this.tiles.delete(key);
      this.tiles.set(key, canvas);
    }
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = width * resolution;
      canvas.height = height * resolution;
      const context = canvas.getContext("2d")!;
      context.scale(resolution, resolution);
      paint(context);
      this.tiles.set(key, canvas);
      if (this.tiles.size > 1536)
        this.tiles.delete(this.tiles.keys().next().value!);
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
      variant = hash(x, y) % (map.id === "VIL" ? 32 : 8),
      biome = biomeAt(map, x, y),
      density = biome === "森林" ? 2 : grassDensity(map.id, x, y),
      corners =
        tile === "grass"
          ? biome === "森林"
            ? [2, 2, 2, 2]
            : [
                density,
                grassDensity(map.id, x + 1, y),
                grassDensity(map.id, x, y + 1),
                grassDensity(map.id, x + 1, y + 1),
              ]
          : [0, 0, 0, 0],
      damp =
        tile === "sand" &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) =>
          ["water", "shallow"].includes(tileAt(map, x + dx, y + dy)),
        );
    const nearRoad =
      !map.interior &&
      ["path", "grass", "sand", "wet"].includes(tile) &&
      [-1, 0, 1].some((dy) =>
        [-1, 0, 1].some((dx) => tileAt(map, x + dx, y + dy) === "path"),
      );
    const road = nearRoad ? this.roads.path(map) : undefined;
    const neighbors = [-1, 0, 1].flatMap((dy) =>
      [-1, 0, 1].map((dx) => tileAt(map, x + dx, y + dy)),
    );
    const sea = (t: Tile) => ["water", "shallow"].includes(t);
    const coastal = neighbors.some(sea) && neighbors.some((t) => !sea(t));
    const shoreline = coastal ? this.roads.path(map, "land") : undefined;
    const shaped = ["sand", "wet", "deepmud", "shallow"].includes(tile)
      ? this.roads.path(map, tile)
      : undefined;
    const blends: Tile[] =
      tile === "water"
        ? (["shallow"] as Tile[]).filter((t) => neighbors.includes(t))
        : tile === "grass"
          ? (["sand", "wet"] as Tile[]).filter((t) => neighbors.includes(t))
          : [];
    const image = this.sprite(
      `${map.id === "VIL" ? "village" : "field"}:${tile}:${variant}:${elevationAt(map, x, y)}:${biome || ""}:${corners.join(",")}:${density}:${damp}:${map.id}:${x}:${y}`,
      16,
      16,
      (ctx) => {
        const palette: Record<Tile, string[]> = {
          grass:
            biome === "森林"
              ? ["#698f65", "#82a16b", "#5c805e", "#a5b67c"]
              : density === 2
                ? ["#7e9f60", "#91ad6c", "#719355", "#adc17e"]
                : density === 0
                  ? ["#92af70", "#a5bd7e", "#86a466", "#b1c486"]
                  : elevationAt(map, x, y) > 0
                    ? ["#97b96e", "#a5c47b", "#8aac68", "#b6ca86"]
                    : ["#84ad68", "#90b571", "#7ea662", "#9dbb78"],
          deepmud: ["#3e615f", "#577a70", "#345552", "#74907a"],
          shallow: ["#72aaad", "#92c4be", "#608e9c", "#bad4bf"],
          cavefloor: ["#505a66", "#747d80", "#414f5e", "#89908b"],
          cavewall: ["#3f4e5b", "#68747b", "#303e4b", "#8b9392"],
          cliff: ["#678982", "#83a49b", "#4d6f73", "#a8b7a0"],
          stairs: ["#99aa8b", "#b8bea0", "#667f79", "#ccd0ad"],
          tree:
            biome === "森林"
              ? ["#577951", "#688d5b", "#456747", "#859a64"]
              : ["#84ad68", "#90b571", "#7ea662", "#9dbb78"],
          rock: ["#84ad68", "#90b571", "#7ea662", "#9dbb78"],
          house: ["#b5a17a", "#c5b38c", "#a18d6b", "#cfbf97"],
          path:
            biome === "森林"
              ? ["#889367", "#a7a576", "#77815b", "#b3b383"]
              : ["#c9bc88", "#d4c996", "#bdae7e", "#e0d4a1"],
          sand: damp
            ? ["#b9af89", "#d2c7a3", "#a99f7c", "#dcd0ad"]
            : ["#d8cb93", "#e9dba7", "#c4b984", "#f2e3b0"],
          wet: ["#849480", "#9fab8d", "#6d8272", "#bac0a0"],
          water: ["#355678", "#3a5b7e", "#335476", "#426484"],
          floor: ["#ad9270", "#bda17b", "#927a5c", "#ccb18a"],
        };
        const clipSurface = (path: Path2D) => {
          ctx.translate(-x * 16, -y * 16);
          ctx.clip(path);
          ctx.translate(x * 16, y * 16);
        };
        if (shoreline && !sea(tile)) {
          ctx.fillStyle = palette.water[0];
          ctx.fillRect(0, 0, 16, 16);
          ctx.save();
          clipSurface(shoreline);
        }
        if (shaped) {
          ctx.fillStyle =
            tile === "deepmud"
              ? palette.wet[0]
              : tile === "shallow"
                ? palette.water[0]
                : palette.grass[0];
          ctx.fillRect(0, 0, 16, 16);
          ctx.save();
          clipSurface(shaped);
        }
        const clipRoad = () => {
          ctx.translate(-x * 16, -y * 16);
          ctx.clip(road!);
          ctx.translate(x * 16, y * 16);
        };
        if (tile === "path") {
          // Textured grass under the globally rounded edge avoids square patches.
          ctx.fillStyle = palette.grass[0];
          ctx.fillRect(0, 0, 16, 16);
          for (let i = 0; i < 30; i++) {
            const seed = hash(i, variant, 133);
            ctx.fillStyle = i % 2 ? palette.grass[1] : palette.grass[2];
            ctx.fillRect((seed % 64) / 4, ((seed >>> 8) % 64) / 4, 0.25, 0.5);
          }
          ctx.save();
          clipRoad();
        }
        const colors = palette[tile];
        ctx.fillStyle = colors[0];
        ctx.fillRect(0, 0, 16, 16);
        if (tile === "grass" && biome !== "森林") {
          for (let sy = 0; sy < 16; sy++)
            for (let sx = 0; sx < 16; sx++) {
              const tx = sx / 16,
                ty = sy / 16,
                level =
                  corners[0] * (1 - tx) * (1 - ty) +
                  corners[1] * tx * (1 - ty) +
                  corners[2] * (1 - tx) * ty +
                  corners[3] * tx * ty;
              const t = level / 2,
                blend = (a: number, b: number) =>
                  Math.round(a * (1 - t) + b * t);
              ctx.fillStyle = `rgb(${blend(146, 126)},${blend(175, 159)},${blend(112, 96)})`;
              ctx.fillRect(sx, sy, 1, 1);
            }
        }
        for (
          let i = 0;
          i < (["water", "shallow", "deepmud"].includes(tile) ? 3 : 6);
          i++
        ) {
          const seed = hash(i, variant, tile.length),
            xx = seed % 16,
            yy = (seed >>> 8) % 16;
          ctx.fillStyle = colors[1 + ((seed >>> 16) % 3)];
          ctx.fillRect(xx, yy, 1 + (seed % 2), 1);
        }
        if (
          map.id === "VIL" &&
          ["grass", "path", "sand", "tree", "house"].includes(tile)
        ) {
          // Half-unit grains survive the 2× backing canvas. No per-frame noise.
          const earth = ["path", "house", "sand"].includes(tile);
          for (let i = 0; i < 95; i++) {
            const seed = hash(i, variant, 81);
            const xx = (seed % 32) / 2,
              yy = ((seed >>> 9) % 32) / 2;
            ctx.fillStyle = earth
              ? [
                  "rgba(108,94,64,.19)",
                  "rgba(248,230,179,.25)",
                  "rgba(152,134,87,.16)",
                ][i % 3]
              : [
                  "rgba(48,80,43,.17)",
                  "rgba(199,211,145,.22)",
                  "rgba(106,131,72,.18)",
                ][i % 3];
            ctx.fillRect(xx, yy, i % 7 ? 0.5 : 1, 0.5);
          }
          for (let i = 0; i < (earth ? 3 : 13); i++) {
            const seed = hash(i, variant, 93),
              xx = 1 + (seed % 28) / 2,
              yy = 2 + ((seed >>> 8) % 24) / 2;
            if (earth) {
              ctx.fillStyle = "#a69b79";
              ctx.fillRect(xx, yy, 1.5, 0.5);
              ctx.fillStyle = "#e1d2a4";
              ctx.fillRect(xx, yy - 0.5, 1, 0.5);
            } else {
              ctx.strokeStyle = i % 2 ? "#75985c" : "#aac17b";
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(xx, yy + 1);
              ctx.quadraticCurveTo(
                xx + 0.5,
                yy,
                xx + (i % 2 ? 1 : -1),
                yy - 1.5,
              );
              ctx.stroke();
            }
          }
          // Thin roots and shallow scuffs interrupt the otherwise uniform dirt.
          if (earth && variant % 3 === 0) {
            ctx.strokeStyle = "rgba(125,109,76,.25)";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(2, 11);
            ctx.bezierCurveTo(5, 10, 7, 12, 11, 9);
            ctx.stroke();
            ctx.strokeStyle = "rgba(237,222,176,.4)";
            ctx.beginPath();
            ctx.moveTo(3, 11.5);
            ctx.quadraticCurveTo(7, 12, 10, 10);
            ctx.stroke();
          }
        }
        if (tile === "sand") {
          for (let i = 0; i < 18; i++) {
            const seed = hash(i, variant, 18),
              xx = seed % 16,
              yy = (seed >>> 8) % 16;
            ctx.fillStyle = i % 3 ? "#e7d8a4" : "#bcb083";
            ctx.fillRect(xx, yy, 1, 1);
          }
          for (let yy = 3; yy < 16; yy += 6) {
            ctx.fillStyle = damp ? "#9f987b" : "#c4b98d";
            ctx.fillRect(1 + (variant % 3), yy, 5, 1);
            ctx.fillRect(7 + (variant % 3), yy + 1, 5, 1);
            ctx.fillStyle = damp ? "#d3c9a5" : "#eee0ac";
            ctx.fillRect(2 + (variant % 3), yy + 1, 4, 1);
          }
        }
        if (tile === "grass" && density === 2) {
          for (let i = 0; i < 11; i++) {
            const xx = (i * 7 + variant) % 16,
              yy = (i * 5 + variant) % 16;
            const tx = xx / 16,
              ty = yy / 16,
              local =
                corners[0] * (1 - tx) * (1 - ty) +
                corners[1] * tx * (1 - ty) +
                corners[2] * (1 - tx) * ty +
                corners[3] * tx * ty;
            if (local < 1.6) continue;
            ctx.fillStyle = i % 2 ? "#587c47" : "#a2b96e";
            ctx.fillRect(xx, yy, 1, 3);
            ctx.fillRect(xx - 1, yy + 1, 3, 1);
          }
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
        if (tile === "path") {
          if (biome === "森林") {
            for (let i = 0; i < 9; i++) {
              const seed = hash(i, variant, 109),
                xx = (seed % 30) / 2,
                yy = ((seed >>> 8) % 30) / 2;
              ctx.fillStyle =
                i % 2 ? "rgba(70,94,58,.4)" : "rgba(191,184,126,.35)";
              ctx.fillRect(xx, yy, 0.5, 1 + (i % 2));
            }
          }
          ctx.restore();
        } else if (road) {
          ctx.save();
          clipRoad();
          ctx.fillStyle = palette.path[0];
          ctx.fillRect(0, 0, 16, 16);
          for (let i = 0; i < 30; i++) {
            const seed = hash(i, variant, 153);
            ctx.fillStyle = i % 2 ? palette.path[1] : palette.path[2];
            ctx.fillRect(
              (seed % 64) / 4,
              ((seed >>> 8) % 64) / 4,
              0.25 + (i % 3) * 0.25,
              0.25,
            );
          }
          ctx.restore();
        }
        if (["grass", "path", "sand", "wet", "tree", "rock"].includes(tile)) {
          for (let sy = 0; sy < 16; sy += 4)
            for (let sx = 0; sx < 16; sx += 4) {
              const mood = groundMood(map.id, x * 16 + sx, y * 16 + sy),
                alpha = Math.abs(mood) * 0.32;
              ctx.fillStyle =
                mood > 0
                  ? `rgba(173,137,73,${alpha})`
                  : `rgba(32,75,66,${alpha})`;
              ctx.fillRect(sx, sy, 4, 4);
            }
        }
        if (shaped) ctx.restore();
        for (const surface of blends) {
          ctx.save();
          clipSurface(this.roads.path(map, surface));
          ctx.fillStyle = palette[surface][0];
          ctx.fillRect(0, 0, 16, 16);
          for (let i = 0; i < 24; i++) {
            const seed = hash(i, variant, 173);
            ctx.fillStyle = palette[surface][1 + (i % 2)];
            ctx.fillRect((seed % 64) / 4, ((seed >>> 8) % 64) / 4, 0.5, 0.25);
          }
          ctx.restore();
        }
        if (shoreline && !sea(tile)) ctx.restore();
        if (shoreline) {
          if (sea(tile)) {
            const ground =
              neighbors.find((t) => !sea(t) && t !== "cliff") || "grass";
            ctx.save();
            clipSurface(shoreline);
            ctx.fillStyle = palette[ground][0];
            ctx.fillRect(0, 0, 16, 16);
            ctx.restore();
          }
          ctx.save();
          ctx.translate(-x * 16, -y * 16);
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.lineWidth = 2.25;
          ctx.strokeStyle = "#78adb0";
          ctx.stroke(shoreline);
          ctx.lineWidth = 0.65;
          ctx.strokeStyle = "#d4e6ca";
          ctx.stroke(shoreline);
          ctx.restore();
        }
      },
      4,
    );
    c.drawImage(image, px, py, 16, 16);
    if (tile === "wet" || tile === "deepmud" || tile === "shallow") {
      c.fillStyle =
        tile === "deepmud" ? "#8da18a" : tile === "wet" ? "#b6bea0" : "#d1ded0";
      for (let i = 0; i < 3; i++)
        c.fillRect(px + ((i * 5 + variant) % 12), py + 3 + i * 5, 3, 1);
      if (tile !== "shallow" && variant % 2 === 0) {
        c.fillStyle = "#56724f";
        c.fillRect(px + 3, py + 2, 1, 5);
        c.fillRect(px + 5, py + 1, 1, 6);
        c.fillStyle = "#bcab75";
        c.fillRect(px + 5, py, 1, 2);
      }
    }
    if (biome === "森林" && ["grass", "tree"].includes(tile)) {
      for (let i = 0; i < 13; i++) {
        const xx = (i * 7 + variant) % 16,
          yy = (i * 5 + variant * 2) % 16;
        c.fillStyle = i % 2 ? "#82975c" : "#406747";
        c.fillRect(px + xx, py + yy, 1, 3);
        c.fillRect(px + xx - 1, py + yy + 1, 3, 1);
      }
    }
    if (tile === "cliff") {
      c.fillStyle = coastal ? "#355678" : "#84a071";
      c.fillRect(px, py, 16, 16);
      c.save();
      c.translate(px - x * 16, py - y * 16);
      c.clip(this.roads.path(map, "cliff"));
      c.translate(x * 16 - px, y * 16 - py);
      c.fillStyle = "#425e69";
      c.fillRect(px, py, 16, 16);
      for (let col = 0; col < 4; col++) {
        const xx = col * 4,
          n = hash(x, col, 3);
        c.fillStyle = ["#648287", "#728f8c", "#587781", "#80988f"][n % 4];
        roundedBox(c, px + xx, py, 3, 16, c.fillStyle as string, 1);
        c.fillStyle = "#9eaca0";
        c.fillRect(px + xx, py, 1, 16);
        c.fillStyle = "#354f60";
        c.fillRect(px + xx + 3, py, 1, 16);
        c.fillRect(px + xx + 1, py + ((y * 7 + n) % 13), 2, 1);
      }
      const above = tileAt(map, x, y - 1);
      if (
        above !== "cliff" &&
        above !== "stairs" &&
        elevationAt(map, x, y - 1) >= elevationAt(map, x, y)
      ) {
        c.fillStyle = "#50774d";
        c.fillRect(px, py, 16, 3);
        c.fillStyle = "#a2bb79";
        c.fillRect(px, py, 16, 1);
        for (let i = 1; i < 16; i += 4) c.fillRect(px + i, py + 1, 2, 2);
      }
      c.restore();
      return;
    }
    if (tile === "stairs") {
      c.fillStyle = "#4e6d68";
      c.fillRect(px, py, 16, 16);
      for (let row = 0; row < 4; row++) {
        c.fillStyle = "#c1c8a7";
        c.fillRect(px + 2, py + row * 4, 12, 1);
        c.fillStyle = "#96a98f";
        roundedBox(
          c,
          px + 2,
          py + row * 4 + 1,
          12,
          2,
          c.fillStyle as string,
          0.75,
        );
        c.fillStyle = "#627f77";
        c.fillRect(px + 2, py + row * 4 + 3, 12, 1);
      }
      return;
    }
    if (["water", "shallow", "deepmud"].includes(tile)) {
      const phase = Math.floor(time / 6),
        n = hash(x, y, phase);
      if (n % 4 === 0) {
        c.fillStyle = "#587c99";
        c.fillRect(px + 3, py + 5 + (n % 6), 5, 1);
        c.fillStyle = "#7395ac";
        c.fillRect(px + 4, py + 4 + (n % 6), 2, 1);
      }
      return;
    }
    if (map.interior) return;
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
    if (tile === "sand") {
      const n = hash(x, y, 44),
        r = (xx: number, yy: number, w: number, h: number, color: string) => {
          c.fillStyle = color;
          c.fillRect(px + xx, py + yy, w, h);
        };
      if (n % 23 === 0) {
        r(3, 9, 10, 3, "rgba(76,65,43,.18)");
        r(2, 7, 11, 2, "#937b55");
        r(3, 6, 8, 1, "#c8b186");
        r(4, 8, 5, 1, "#6f6149");
        r(10, 5, 1, 3, "#aa926b");
      } else if (n % 17 === 0) {
        r(7, 9, 5, 1, "#aaa489");
        r(7, 6, 4, 3, "#f3e6c4");
        r(8, 5, 2, 1, "#fff1cc");
        r(8, 7, 1, 2, "#c3b3a0");
      } else if (n % 31 === 0) {
        r(3, 9, 10, 1, "#8e9670");
        r(5, 7, 3, 3, "#738360");
        r(8, 8, 2, 3, "#637b5e");
        r(3, 8, 2, 1, "#a0a57d");
      } else if (n % 29 === 0) {
        r(4, 7, 3, 2, "#a49e87");
        r(9, 10, 2, 1, "#b8ad91");
      }
      return;
    }
    if (tile === "grass" || tile === "wet") {
      const n = hash(x, y, 6);
      if (tile === "grass" && grassDensity(map.id, x, y) === 2) {
        for (let i = 0; i < 3; i++) {
          const xx = 2 + ((n >>> (i * 4)) % 11),
            yy = 6 + i * 3;
          c.fillStyle = "#436d40";
          c.fillRect(px + xx, py + yy, 1, 5);
          c.fillRect(px + xx - 2, py + yy + 2, 1, 3);
          c.fillStyle = "#a9be74";
          c.fillRect(px + xx, py + yy - 1, 1, 2);
          c.fillStyle = "#6c934f";
          c.fillRect(px + xx + 2, py + yy + 1, 1, 3);
        }
      }
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
    const variant = hash(x, y, 17) % 64,
      forest = biomeAt(map, x, y) === "森林";
    const image = this.sprite(
      `nature:${tile}:${variant}:${forest}`,
      40,
      48,
      (ctx) => paintNature(ctx, tile, variant, forest),
      2,
    );
    c.drawImage(image, px - 12, py - 30, 40, 48);
  }
}
