import type { Building } from "./maps.ts";
import { rooms, type Furniture } from "./interiors.ts";
export class DepthArt {
  constructor(private c: CanvasRenderingContext2D) {}
  rect(x: number, y: number, w: number, h: number, color: string) {
    this.c.fillStyle = color;
    this.c.fillRect(Math.round(x), Math.round(y), w, h);
  }
  polygon(points: number[][], color: string) {
    const c = this.c;
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) =>
      i
        ? c.lineTo(Math.round(x), Math.round(y))
        : c.moveTo(Math.round(x), Math.round(y)),
    );
    c.closePath();
    c.fill();
  }
  shadow(x: number, y: number, w: number, h: number) {
    this.polygon(
      [
        [x - w / 2, y - 2],
        [x + w / 2, y - 2],
        [x + w / 2 + h * 0.6, y + h * 0.45],
        [x - w / 2 + h * 0.6, y + h * 0.45],
      ],
      "rgba(27,42,42,.20)",
    );
  }
  person(
    x: number,
    y: number,
    color: string,
    seed = 0,
    step = 0,
    facing = "down",
  ) {
    const r = this.rect.bind(this);
    this.shadow(x, y + 3, 13, 14);
    r(x - 4, y + 1, 4, 5 + step, "#344049");
    r(x + 1, y + 1, 4, 6 - step, "#26353e");
    r(x - 5, y - 8, 10, 11, "#283a3c");
    r(x - 4, y - 8, 8, 9, color);
    r(x - 4, y - 8, 3, 7, "rgba(255,245,205,.22)");
    r(x + 3, y - 7, 2, 9, "rgba(25,39,44,.35)");
    r(x - 3, y + 1, 7, 2, "#554e3f");
    r(x - 6, y - 6, 2, 7, "#b88868");
    r(x + 5, y - 5, 2, 6, "#ac785d");
    r(x - 6, y - 7, 2, 3, color);
    r(x + 5, y - 7, 2, 3, color);
    r(x - 4, y - 16, 9, 9, "#544636");
    r(x - 3, y - 14, 7, 7, "#dab18a");
    r(x - 3, y - 14, 3, 5, "#efcba0");
    r(x + 3, y - 13, 2, 5, "#b48364");
    const hair = ["#644831", "#a99573", "#493b34", "#8a543b"][seed % 4];
    r(x - 4, y - 17, 8, 4, hair);
    r(x - 5, y - 14, 2, 5, hair);
    if (facing === "up") r(x - 3, y - 14, 7, 6, hair);
    else {
      r(x + (facing === "left" ? -3 : 0), y - 11, 1, 2, "#344347");
      if (facing === "down") r(x + 3, y - 11, 1, 2, "#344347");
      r(x, y - 8, 3, 1, "#b37a61");
    }
    if (seed === 0) {
      r(x - 5, y - 17, 10, 2, "#9b7950");
      r(x - 3, y - 19, 7, 3, "#b49460");
      r(x - 6, y - 15, 12, 2, "#70563b");
      r(x - 3, y - 6, 7, 2, "#c3d0b2");
    }
  }
  monster(x: number, y: number, kind: string, time: number) {
    const r = this.rect.bind(this),
      bob = Math.sin(time * 2 + x) * 0.6;
    this.shadow(x, y + 4, kind === "dragon" ? 30 : 17, 16);
    y += bob;
    if (kind === "slime") {
      this.polygon(
        [
          [x - 9, y + 2],
          [x - 8, y - 5],
          [x - 4, y - 10],
          [x + 3, y - 11],
          [x + 8, y - 6],
          [x + 10, y + 2],
          [x + 5, y + 5],
          [x - 5, y + 5],
        ],
        "#3b7f83",
      );
      r(x - 7, y - 4, 14, 6, "#5da99b");
      r(x - 4, y - 8, 9, 5, "#87c7ae");
      r(x - 3, y - 8, 4, 2, "#c5e7c4");
      r(x - 7, y + 2, 13, 2, "#437f82");
      r(x - 3, y - 2, 2, 3, "#243e4c");
      r(x + 3, y - 2, 2, 3, "#243e4c");
      return;
    }
    if (kind === "goblin") {
      this.person(x, y, "#856f4d", 2);
      r(x - 3, y - 14, 7, 7, "#8eaa65");
      r(x - 6, y - 13, 3, 3, "#7f975b");
      r(x + 4, y - 13, 4, 3, "#6a8555");
      r(x - 2, y - 11, 2, 1, "#e7bd73");
      r(x + 2, y - 11, 2, 1, "#e7bd73");
      r(x + 8, y - 9, 2, 15, "#725c43");
      return;
    }
    if (kind === "fowl") {
      r(x - 5, y - 7, 10, 11, "#c6b99a");
      r(x - 4, y - 9, 7, 8, "#ece0ba");
      r(x + 2, y - 13, 6, 7, "#f1e2b9");
      r(x + 4, y - 15, 3, 3, "#ad6653");
      r(x + 7, y - 10, 4, 2, "#d5a464");
      r(x + 5, y - 12, 1, 2, "#283f42");
      r(x - 6, y - 5, 6, 7, "#a89a80");
      r(x - 3, y + 3, 2, 3, "#c7a55c");
      r(x + 2, y + 3, 2, 3, "#c7a55c");
      return;
    }
    const dragon = kind === "dragon",
      lizard = kind === "lizard",
      rat = kind === "rat";
    const dark = dragon
      ? "#526f69"
      : lizard
        ? "#658164"
        : rat
          ? "#756a67"
          : kind === "wolf"
            ? "#6a7b84"
            : "#9d8262";
    const light = dragon
      ? "#9eaf80"
      : lizard
        ? "#a6b478"
        : rat
          ? "#ad9988"
          : kind === "wolf"
            ? "#adbbc0"
            : "#d3b58a";
    const w = dragon ? 26 : rat ? 12 : 18;
    this.polygon(
      [
        [x - w / 2, y - 5],
        [x - w / 2 - 8, y - 8],
        [x - w / 2 - 3, y + 1],
        [x, y + 3],
      ],
      dark,
    );
    if (dragon) {
      this.polygon(
        [
          [x - 5, y - 8],
          [x - 21, y - 25],
          [x - 24, y - 6],
          [x - 10, y - 2],
        ],
        "#648b81",
      );
      this.polygon(
        [
          [x + 2, y - 8],
          [x + 15, y - 24],
          [x + 22, y - 5],
          [x + 8, y],
        ],
        "#466e6b",
      );
    }
    r(x - w / 2, y - 8, w, 11, dark);
    r(x - w / 2 + 2, y - 10, w - 3, 6, light);
    r(x - w / 2 + 1, y + 1, 4, 5, dark);
    r(x + w / 2 - 5, y + 1, 4, 5, dark);
    r(x + w / 2 - 5, y - 13, 9, 11, dark);
    r(x + w / 2 - 4, y - 13, 7, 6, light);
    r(x + w / 2 + 1, y - 6, 6, 4, light);
    r(x + w / 2, y - 10, 2, 2, "#273e44");
    if (!lizard) {
      r(x + w / 2 - 5, y - 16, 3, 5, dark);
      r(x + w / 2 + 1, y - 16, 3, 4, dark);
    } else {
      r(x - 4, y - 12, 2, 3, "#d1c594");
      r(x + 1, y - 12, 2, 3, "#d1c594");
    }
  }
  building(b: Building, x: number, y: number) {
    const r = this.rect.bind(this),
      w = b.w * 16,
      h = b.h * 16,
      door = w / 2 + 8;
    this.shadow(x + w / 2, y + h - 3, w, 36);
    r(x + 3, y + 18, w - 6, h - 18, "#d6c5a0");
    r(x + w - 11, y + 19, 9, h - 19, "#9c896d");
    r(x + 3, y + h - 7, w - 6, 7, "#756f60");
    r(x + 3, y + h - 7, w - 6, 2, "#b7b297");
    for (let yy = 29; yy < h - 8; yy += 7) {
      r(x + 4, y + yy, w - 15, 1, "#b9a37f");
      r(x + 7 + (yy % 3) * 6, y + yy + 1, 1, 5, "#c5b28f");
    }
    r(x + 4, y + 23, w - 8, 4, "rgba(55,48,40,.30)");
    r(x + 6, y + 25, 3, h - 32, "#8b7457");
    r(x + w - 15, y + 25, 3, h - 32, "#8b7457");
    const roof =
      b.interior === "APOTHECARY"
        ? ["#6c8980", "#88a18b", "#4e716d"]
        : b.interior === "SMITH"
          ? ["#65727a", "#8b9999", "#475b64"]
          : ["#9d7956", "#b99768", "#765b47"];
    this.polygon(
      [
        [x - 3, y + 25],
        [x + 9, y - 3],
        [x + w - 10, y - 3],
        [x + w + 4, y + 25],
      ],
      roof[0],
    );
    this.polygon(
      [
        [x + w - 10, y - 3],
        [x + w + 4, y + 25],
        [x + w - 7, y + 25],
        [x + w - 16, y - 3],
      ],
      roof[2],
    );
    for (let yy = 1; yy < 25; yy += 4) {
      const inset = Math.max(0, 9 - yy * 0.45);
      r(x + inset, y + yy, w - inset * 2 - 5, 1, roof[1]);
      for (let xx = 10; xx < w - 12; xx += 10)
        r(x + xx + (yy % 8 ? 0 : 4), y + yy + 1, 1, 3, roof[2]);
    }
    r(x + 10, y - 4, w - 22, 3, roof[1]);
    r(x - 3, y + 24, w + 7, 3, "#514e43");
    r(x - 2, y + 24, w + 5, 1, "#c1ab80");
    r(x + door - 7, y + h - 20, 14, 20, "#574e40");
    r(x + door - 5, y + h - 18, 10, 18, "#8b704c");
    r(x + door - 5, y + h - 18, 2, 18, "#b69a67");
    r(x + door + 2, y + h - 10, 2, 2, "#e4cd85");
    r(x + door - 8, y + h, 16, 3, "#c6bea0");
    r(x + door - 7, y + h + 3, 16, 2, "#848d7a");
    const windowX = w >= 70 ? [13, w - 25] : [10];
    for (const xx of windowX) {
      if (Math.abs(xx + 5 - door) < 12) continue;
      r(x + xx - 1, y + 30, 12, 11, "#7c6b53");
      r(x + xx, y + 31, 10, 8, "#567c83");
      r(x + xx + 1, y + 31, 7, 2, "#a1c5bc");
      r(x + xx + 4, y + 31, 1, 8, "#d3c49a");
      r(x + xx, y + 35, 10, 1, "#d3c49a");
      r(x + xx - 2, y + 40, 14, 2, "#a39c7b");
    }
    if (b.interior === "SMITH" || b.interior === "HOME") {
      r(x + w - 23, y - 9, 8, 16, "#878a7b");
      r(x + w - 24, y - 10, 10, 3, "#b6b59a");
      r(x + w - 22, y - 8, 2, 12, "#b8b59a");
    }
  }
  room(id: keyof typeof rooms, cx: number, cy: number) {
    const room = rooms[id];
    if (!room) return;
    const r = this.rect.bind(this);
    r(16 - cx, 16 - cy, 128, 96, room.floor);
    for (let y = 16; y < 112; y += 8) {
      r(16 - cx, y - cy, 128, 1, "rgba(66,53,41,.18)");
      for (let x = 16 + (y % 16 ? 0 : 16); x < 144; x += 32)
        r(x - cx, y - cy, 1, 8, "rgba(66,53,41,.16)");
    }
    r(58 - cx, 55 - cy, 49, 40, "#605d50");
    r(59 - cx, 54 - cy, 47, 40, room.rug);
    r(62 - cx, 57 - cy, 41, 34, "rgba(225,213,167,.20)");
    r(8 - cx, 8 - cy, 144, 12, "#e1ceb0");
    r(8 - cx, 20 - cy, 144, 3, "#9e8d71");
    r(8 - cx, 8 - cy, 5, 104, "#b5a084");
    r(147 - cx, 8 - cy, 5, 104, "#796e60");
    r(14 - cx, 23 - cy, 132, 5, "rgba(41,42,37,.18)");
    r(13 - cx, 23 - cy, 4, 89, "rgba(41,42,37,.15)");
    for (const x of [36, 112]) {
      r(x - cx, 9 - cy, 20, 12, "#756953");
      r(x + 2 - cx, 10 - cy, 16, 9, "#95b9b2");
      r(x + 3 - cx, 10 - cy, 12, 2, "#dce0bc");
      r(x + 9 - cx, 10 - cy, 1, 9, "#e7d5ab");
      r(x - cx, 21 - cy, 22, 2, "#b2a184");
      this.polygon(
        [
          [x + 2 - cx, 23 - cy],
          [x + 18 - cx, 23 - cy],
          [x + 48 - cx, 93 - cy],
          [x + 23 - cx, 93 - cy],
        ],
        "rgba(255,240,185,.12)",
      );
    }
    r(8 - cx, 112 - cy, 68, 8, "#d3bea0");
    r(100 - cx, 112 - cy, 52, 8, "#d3bea0");
    r(8 - cx, 120 - cy, 68, 4, "#766956");
    r(100 - cx, 120 - cy, 52, 4, "#766956");
    r(76 - cx, 112 - cy, 24, 5, "#9a876a");
  }
  furniture(p: Furniture, cx: number, cy: number) {
    const x = p.x - cx,
      y = p.y - cy,
      w = p.w,
      h = p.h,
      r = this.rect.bind(this);
    this.shadow(x + w / 2, y + h - 2, w + 2, 9);
    if (p.kind === "bed") {
      r(x, y - 3, w, h + 3, "#735b47");
      r(x + 2, y - 4, w - 4, h, "#ded5b5");
      r(x + 3, y - 2, w - 6, 8, "#eee5cc");
      r(x + 2, y + 7, w - 4, h - 12, p.color || "#89a49a");
      r(x + 3, y + 8, 3, h - 13, "rgba(255,255,225,.23)");
      r(x + w - 4, y + 7, 2, h - 12, "rgba(42,55,55,.22)");
      r(x, y + h - 3, w, 4, "#9b7a56");
      r(x, y - 7, w, 4, "#9b7a56");
      return;
    }
    if (p.kind === "plant") {
      r(x + 2, y + h - 9, w - 4, 9, "#986d4e");
      r(x + 1, y + h - 10, w - 2, 3, "#bf9a69");
      r(x + w / 2, y - 5, 2, h - 2, "#4b704b");
      r(x, y - 1, w, 4, "#628a53");
      r(x + 3, y - 7, w - 6, 9, "#83a663");
      r(x + 3, y - 7, 3, 5, "#adc17c");
      return;
    }
    if (p.kind === "hearth") {
      r(x, y - 8, w, h + 8, "#65706d");
      r(x + 2, y - 10, w - 4, 3, "#a3aa95");
      r(x + 3, y - 5, w - 6, h + 1, "#393f3e");
      r(x + 5, y + h - 9, w - 10, 7, "#c27b43");
      r(x + 8, y + h - 12, 4, 9, "#edb759");
      r(x + 12, y + h - 10, 3, 6, "#ffe09a");
      r(x, y + h - 2, w, 3, "#969b85");
      return;
    }
    if (p.kind === "barrel") {
      r(x + 1, y - 5, w - 2, h + 4, "#8c704c");
      r(x + 3, y - 7, w - 6, 4, "#b49b6d");
      r(x + 1, y - 3, w - 2, 2, "#656d62");
      r(x + 1, y + h - 5, w - 2, 2, "#656d62");
      r(x + 4, y, w - 8, 1, "#bd9c65");
      return;
    }
    if (p.kind === "hay") {
      r(x, y - 3, w, h + 3, "#a89451");
      r(x + 1, y - 5, w - 2, h, "#c2b36c");
      for (let i = 2; i < w; i += 4) r(x + i, y - 4, 1, h, "#e0ca7e");
      r(x + w / 2, y - 4, 2, h, "#8b8051");
      return;
    }
    if (p.kind === "anvil") {
      r(x + 5, y + h - 8, w - 10, 8, "#706c60");
      r(x + 7, y - 3, w - 14, h, "#52656a");
      r(x - 3, y - 6, w + 6, 5, "#71868a");
      r(x, y - 7, w, 2, "#b8c0b0");
      return;
    }
    const shelf = p.kind === "shelf",
      top = shelf ? y - 15 : y - 5;
    r(x + 2, y + h - 3, 3, 5, "#64513f");
    r(x + w - 5, y + h - 3, 3, 5, "#64513f");
    r(x, top, w, h + y - top - 3, "#8a704e");
    r(x + 1, top, w - 2, 3, p.color || "#c3a371");
    r(x + w - 3, top + 3, 3, h + y - top - 6, "#705b46");
    r(x + 2, y + h - 6, w - 5, 2, "#b59561");
    if (shelf) {
      for (let i = 3; i < w - 4; i += 5) {
        r(x + i, top + 4, 3, 8, ["#7f9b8a", "#b3aa78", "#a2806b"][i % 3]);
        r(x + i, top + 4, 1, 7, "#d4caa0");
      }
      r(x, top + 12, w, 2, "#c1a373");
    } else if (p.kind === "counter") {
      for (let i = 4; i < w - 4; i += 7) {
        r(x + i, top - 4, 4, 5, ["#7eaaa2", "#bdad78", "#977d93"][i % 3]);
        r(x + i + 1, top - 6, 2, 2, "#e2d2a0");
      }
      r(x + 3, top + 5, w - 9, h - 7, "#a28760");
    } else if (p.kind === "table") {
      r(x + 5, top + 3, 8, 4, "#e4d8b8");
      r(x + w - 8, top + 1, 4, 5, "#778b65");
    }
  }
}
