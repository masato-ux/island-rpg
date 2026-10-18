import { paintHero } from "./hero-art.ts";
import { houseStyles } from "./architecture.ts";
import { appearances } from "./appearance.ts";
import type { Building } from "./maps.ts";
import { rooms, type Furniture } from "./interiors.ts";
export class DepthArt {
  constructor(private c: CanvasRenderingContext2D) {}
  rect(x: number, y: number, w: number, h: number, color: string) {
    this.c.fillStyle = color;
    this.c.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, w, h);
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
  ellipse(x: number, y: number, rx: number, ry: number, color: string) {
    const c = this.c;
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  private peopleSprites = new Map<string, HTMLCanvasElement>();
  person(
    x: number,
    y: number,
    color: string,
    seed = 0,
    step = 0,
    facing = "down",
  ) {
    const key = `${seed}:${color}:${step}:${facing}`;
    let sprite = this.peopleSprites.get(key);
    if (!sprite) {
      sprite = document.createElement("canvas");
      sprite.width = 40;
      sprite.height = 44;
      const context = sprite.getContext("2d")!;
      context.imageSmoothingEnabled = false;
      if (seed === 0) paintHero(context, 20, 32, step, facing);
      else new DepthArt(context).paintPerson(20, 32, color, seed, step, facing);
      this.peopleSprites.set(key, sprite);
    }
    this.c.drawImage(sprite, Math.round(x) - 20, Math.round(y) - 32);
  }
  private paintPerson(
    x: number,
    y: number,
    color: string,
    seed = 0,
    step = 0,
    facing = "down",
  ) {
    const bodyY = (yy: number) => (yy <= -8 ? yy + 4 : (yy + 8) * 0.6 - 4);
    const r = (xx: number, yy: number, w: number, h: number, color: string) =>
      this.rect(
        yy > -8 ? xx * 0.8 : xx,
        bodyY(yy),
        yy > -8 ? w * 0.8 : w,
        yy > -8 ? h * 0.6 : h,
        color,
      );
    const e = (xx: number, yy: number, rx: number, ry: number, color: string) =>
      this.ellipse(
        yy > -8 ? xx * 0.8 : xx,
        bodyY(yy),
        yy > -8 ? rx * 0.8 : rx,
        yy > -8 ? ry * 0.6 : ry,
        color,
      );
    const shape = (points: number[][], color: string) =>
      this.polygon(
        points.map(([xx, yy]) => [yy > -8 ? xx * 0.8 : xx, bodyY(yy)]),
        color,
      );
    const look = appearances[seed] || {
        ...appearances[4],
        outfit: color,
        detail: "monster",
        height: 0.85,
        build: 0.95,
      },
      child = look.age === "child",
      feminine = look.gender === "woman" || look.gender === "girl";
    const c = this.c;
    c.save();
    c.translate(Math.round(x * 2) / 2, Math.round(y * 2) / 2);
    c.scale(look.build, look.height);
    if (look.age === "elder") c.transform(1, 0, -0.055, 1, 0, 0);
    if (
      feminine &&
      ["long", "braid", "ponytail", "twintails", "curls"].includes(look.style)
    ) {
      e(-3, -12, 2.6, 6, look.hair);
      e(3, -12, 2.6, 6, look.hair);
    }
    if (seed === 0) {
      shape(
        [
          [-4, -12],
          [-7, -8],
          [-9, 3],
          [-4, 1],
          [-1, 4],
          [5, 2],
          [6, -9],
        ],
        "#253d4a",
      );
      shape(
        [
          [-3, -11],
          [-6, -8],
          [-6, 1],
          [-3, -1],
          [0, 2],
          [4, 1],
          [4, -9],
        ],
        "#456b76",
      );
      r(-5, -7, 0.5, 7, "#7aa0a0");
      r(3, -7, 1, 7, "#294b5b");
      shape(
        [
          [5, -9],
          [7, -9],
          [9, 7],
          [7, 8],
        ],
        "#34424b",
      );
      r(6, -5, 1, 10, "#84959b");
      r(5, -5, 5, 1, "#d2b773");
    }
    x = 0;
    y = 0;
    this.shadow(0, 4, 12, 17);
    e(0, 3, 5, 1.8, "rgba(23,33,32,.32)");
    const coat = look.outfit,
      hair = look.hair,
      ink = "#35313c",
      walk = step ? 1 : -0.5;
    // Rounded, boldly outlined silhouettes and a restrained palette.
    const blob = (
      xx: number,
      yy: number,
      rx: number,
      ry: number,
      fill: string,
    ) => {
      e(xx, yy, rx + 0.7, ry + 0.7, ink);
      e(xx, yy - 0.2, rx, ry, fill);
    };
    blob(-2.8, 3 + walk, 2.2, 1.6, "#694c3f");
    blob(2.6, 3 - walk, 2.2, 1.6, "#694c3f");
    r(-4, -1, 3, 3.5 + walk, "#4d536a");
    r(1, -1, 3, 3.5 - walk, "#4d536a");
    shape(
      [
        [-4, -11],
        [-6, -8],
        [-5, 1],
        [5, 1],
        [6, -8],
        [4, -11],
      ],
      ink,
    );
    shape(
      [
        [-3, -10],
        [-5, -7],
        [-4, 0],
        [4, 0],
        [5, -7],
        [3, -10],
      ],
      coat,
    );
    r(-3, -8, 1, 6, "rgba(255,255,220,.22)");
    r(3, -7, 1, 6, "rgba(32,28,47,.2)");
    r(-3, -3, 6, 1.5, look.accent);
    r(-1, -8, 2, 1, "#e7dbad");
    if (feminine)
      shape(
        [
          [-3, -6],
          [-5, 2],
          [5, 2],
          [3, -6],
        ],
        coat,
      );
    blob(-5.1, -3.5, 1.3, 3, coat);
    blob(5.1, -3.5, 1.3, 3, coat);
    blob(-5, -0.2, 1.3, 1.5, "#efbe91");
    blob(5, -0.2, 1.3, 1.5, "#efbe91");
    // Different cheekbones and jaw lines remain visible beside the shared eye style.
    if (look.face === "square" || look.face === "base") {
      const points =
        look.face === "square"
          ? [
              [-5, -21],
              [-6.3, -18],
              [-6, -12],
              [-4.8, -9],
              [4.8, -9],
              [6, -12],
              [6.3, -18],
              [5, -21],
            ]
          : [
              [-4.5, -21.5],
              [-6, -18],
              [-5.7, -13],
              [-3.5, -10],
              [0, -8.5],
              [3.5, -10],
              [5.7, -13],
              [6, -18],
              [4.5, -21.5],
            ];
      shape(points, ink);
      shape(
        points.map(([xx, yy]) => [xx * 0.86, -15 + (yy + 15) * 0.88]),
        "#f0c299",
      );
    } else {
      const rx = look.face === "long" ? 4.7 : look.face === "oval" ? 5.5 : 6.3,
        ry = look.face === "long" ? 7.5 : 6.8;
      e(0, -15, rx, ry, ink);
      e(0, -14.7, rx - 0.7, ry - 0.7, "#f0c299");
    }
    e(-5.7, -13.8, 1.1, 1.6, "#e5ac83");
    e(5.7, -13.8, 1.1, 1.6, "#e5ac83");
    shape(
      [
        [-5, -17],
        [-5, -19],
        [-3, -21],
        [1, -22],
        [4, -20],
        [5, -17],
        [2, -17],
        [1, -19],
        [-1, -17],
      ],
      hair,
    );
    if (facing === "up") {
      e(0, -15.5, 5.5, 5.5, hair);
      r(-4, -15, 0.8, 4, "rgba(255,232,179,.16)");
    } else {
      const side = facing === "left" ? -1 : facing === "right" ? 1 : 0;
      if (side !== 1) {
        r(-2.8, -14.8, 1.4, 2.4, ink);
        r(-2.5, -14.5, 0.5, 0.5, "#f9f1ce");
      }
      if (side !== -1) {
        r(1.8, -14.8, 1.4, 2.4, ink);
        r(2.1, -14.5, 0.5, 0.5, "#f9f1ce");
      }
      e(side * 3, -12.1, 1, 0.7, "#c58e6e");
      r(-0.7 + side, -10, 2, 0.7, "#966653");
      e(-3.7, -11.6, 1.1, 0.5, "#e6a88a");
      e(3.7, -11.6, 1.1, 0.5, "#e6a88a");
      if (look.age === "elder") {
        r(-4, -15.7, 2.5, 0.7, hair);
        r(1.7, -15.7, 2.5, 0.7, hair);
      }
    }
    if (look.detail === "shorts") {
      r(-4, -1, 3, 3, "#6e6543");
      r(1, -1, 3, 3, "#6e6543");
    }
    // Hairstyles change the silhouette, rather than just tinting the same head.
    if (look.style === "bun") {
      e(-1, -21, 3.4, 2.5, hair);
      r(-3, -21, 4, 0.5, "#aca08d");
      r(-4, -18, 8, 0.5, look.accent);
    }
    if (look.style === "twintails") {
      for (const side of [-1, 1]) {
        e(side * 5, -15, 1.8, 4.5, hair);
        r(side * 5 - 1, -18, 2, 1.5, look.accent);
      }
      r(-2, -21, 4, 1.5, look.accent);
    }
    if (look.style === "ponytail") {
      e(5, -15, 2, 4, hair);
      e(6, -12, 1.5, 3, hair);
      r(4, -18, 2, 1.5, look.accent);
    }
    if (look.style === "braid") {
      for (let i = 0; i < 6; i++)
        e(4 + (i % 2) * 0.6, -15 + i * 1.6, 1.3, 1.2, hair);
      r(4, -6, 1.5, 1.5, "#bd9155");
    }
    if (look.style === "curls") {
      for (let i = 0; i < 8; i++)
        e(-4 + i * 1.2, -18 + Math.sin(i) * 2, 1.7, 1.7, hair);
      e(-4, -14, 1.6, 3, hair);
      e(4, -14, 1.6, 3, hair);
      r(-2, -21, 4, 1, look.accent);
    }
    if (look.style === "long") {
      r(-4, -16, 1.5, 8, hair);
      r(3, -16, 2, 8, hair);
      r(3.5, -17, 0.5, 7, "#756779");
      r(-4, -18, 8, 1, "#9dab78");
      r(2, -19, 1, 2, "#d4ca89");
    }
    if (look.style === "bald") {
      e(0, -18, 3.6, 2.9, "#d5ac85");
      r(-2, -19, 3, 0.5, "#e8c59e");
      e(0, -10, 3, 2.3, hair);
      r(-2, -10, 0.5, 2, "#96775b");
    }
    if (look.age === "elder" && facing !== "up") {
      shape(
        [
          [-3, -11],
          [0, -12],
          [3, -11],
          [2, -7],
          [0, -5],
          [-2, -7],
        ],
        hair,
      );
      r(-3, -15.5, 2, 0.5, "#c5bba4");
      r(1, -15.5, 2, 0.5, "#c5bba4");
      r(-3, -12, 0.5, 1, "#a48068");
      r(2.5, -12, 0.5, 1, "#a48068");
    }
    if (look.detail === "cane") {
      r(7, -6, 1, 12, "#7d5e3b");
      e(6.5, -6, 1.5, 1, "#be9c66");
      r(7, 5, 2, 1, "#4d4d3d");
      r(-3, -7, 6, 0.7, look.accent);
      e(0, -7, 1, 1, "#d5bc7d");
    }
    if (look.detail === "straw" || look.detail === "rancher") {
      e(0, -19, look.detail === "straw" ? 7 : 6, 2, hair);
      e(0, -20, 4, 3.2, look.detail === "straw" ? "#c4a263" : "#8b6945");
      r(-4, -19.5, 8, 1, "#674a32");
      r(-6, -18.7, 12, 0.7, "#dbc28c");
      r(-3, -5, 6, 5, look.accent);
    }
    if (look.detail === "kerchief") {
      shape(
        [
          [-5, -18],
          [-2, -22],
          [3, -21],
          [5, -17],
        ],
        "#ad594f",
      );
      r(-4, -19, 7, 0.7, "#df9b7e");
      r(-3, -6, 6, 8, look.accent);
      r(-2, -3, 4, 0.5, "#f3dfb5");
    }
    if (["apron", "pinafore", "herbalist"].includes(look.detail)) {
      shape(
        [
          [-2, -8],
          [-3, 2],
          [3, 2],
          [2, -8],
        ],
        look.accent,
      );
      r(-2, -1, 4, 1, "#98a58c");
      r(-1.5, -6, 0.5, 6, "rgba(255,251,219,.4)");
    }
    if (look.detail === "brooch") {
      e(0, -8, 1.2, 1.2, "#d0b778");
      e(0, -8, 0.6, 0.7, "#6da3a0");
    }
    if (look.detail === "smith") {
      r(-4, -7, 8, 9, look.accent);
      r(-3, -8, 1, 7, "#c99c6c");
      r(2, -8, 1, 7, "#5d4033");
      r(-2, -1, 4, 2, "#684832");
      r(6, -2, 1, 7, "#b09363");
      r(4, -3, 5, 2, "#8f9c98");
      e(-5, -5, 1.5, 2, "#d7ac86");
      e(5, -5, 1.5, 2, "#ba8b69");
    }
    if (look.detail === "fisher") {
      e(0, -21, 4, 2.5, "#597781");
      r(-4, -19, 8, 1.5, "#a1b4a7");
      r(7, -16, 0.7, 22, "#9c875e");
      r(7.5, -15, 0.5, 12, "#c7d1c0");
      e(3, -4, 1, 1, "#a6b6a7");
    }
    if (seed === 0) {
      // Wind-swept hair, scarf, leather cuirass, shoulder guard and travel boots.
      shape(
        [
          [-5, -17],
          [-4, -21],
          [-1, -22],
          [1, -22],
          [3, -20.5],
          [5, -20],
          [4, -17],
          [2, -19],
          [1, -17],
          [-1, -19],
        ],
        hair,
      );
      r(-3, -21, 1.5, 0.5, "#63545a");
      r(1, -21, 1, 0.5, "#817075");
      shape(
        [
          [-4, -10],
          [-2, -7],
          [3, -8],
          [4, -11],
        ],
        look.accent,
      );
      r(-3, -9, 6, 0.7, "#9dc0ae");
      shape(
        [
          [-4, -7],
          [-5, -3],
          [-8, -1],
          [-7, -6],
        ],
        "#548b91",
      );
      r(-6, -5, 0.5, 3, "#9ab3aa");
      r(-3, -6, 6, 6, "#6d523c");
      r(-2.5, -5, 1, 4, "#a5865b");
      r(1.5, -5, 1, 4, "#463d34");
      shape(
        [
          [-5, -10],
          [-7, -8],
          [-6, -5],
          [-3, -6],
          [-3, -9],
        ],
        "#778f97",
      );
      r(-5, -9, 2, 0.7, "#c6d0b8");
      r(4, -3, 2, 3, "#6b5039");
      r(-6, -3, 2, 3, "#6b5039");
      r(-4, 2, 3, 2.5, "#4b3b30");
      r(1, 2, 3, 2.5, "#4b3b30");
      if (facing === "up") {
        shape(
          [
            [-4, -9],
            [-5, 1],
            [0, 3],
            [4, 1],
            [3, -9],
          ],
          "#3f6876",
        );
        r(-3, -8, 0.5, 8, "#8fa7a2");
      }
    }
    c.restore();
  }
  monster(x: number, y: number, kind: string, time: number) {
    const r = this.rect.bind(this),
      e = this.ellipse.bind(this),
      c = this.c;
    c.save();
    c.translate(Math.round(x * 2) / 2, Math.round(y * 2) / 2);
    x = 0;
    y = Math.sin(time * 2 + x) * 0.4;
    this.shadow(0, 4, kind === "dragon" ? 34 : 19, 16);
    e(0, 3, 8, 2, "rgba(23,36,39,.25)");
    if (kind === "slime") {
      this.polygon(
        [
          [-10, 2],
          [-9, -4],
          [-7, -9],
          [-2, -13],
          [3, -13],
          [8, -8],
          [10, -1],
          [10, 3],
          [5, 5],
          [-5, 5],
        ],
        "#244d68",
      );
      e(0, -3, 8.6, 7.8, "#3d8998");
      e(-1, -5, 6.8, 6.2, "#68bbb0");
      e(-2, -7, 4.5, 4.5, "#95d6c0");
      e(-3, -9, 2, 1.2, "#d8f0ce");
      e(4, 0, 3.2, 2.5, "#45939d");
      e(-5, -2, 1.2, 1.5, "#a8deca");
      for (let i = 0; i < 13; i++)
        r(-6 + ((i * 3.5) % 13), -6 + ((i * 2) % 9), 0.5, 0.5, "#a8d8ba");
      e(-2.8, -3, 1.1, 1.7, "#203c4b");
      e(3, -3, 1.1, 1.7, "#203c4b");
      r(-3, -4, 0.6, 0.6, "#ebf4d6");
      r(2.8, -4, 0.6, 0.6, "#ebf4d6");
      r(-1, 0, 2, 0.5, "#306a77");
    } else if (kind === "goblin") {
      this.person(0, 0, "#685d47", 13);
      e(0, -14, 4, 4, "#759259");
      e(-1, -15, 2.7, 2.6, "#a5b77c");
      this.polygon(
        [
          [-3, -16],
          [-8, -17],
          [-5, -12],
        ],
        "#6b8555",
      );
      this.polygon(
        [
          [3, -16],
          [8, -17],
          [5, -12],
        ],
        "#59764d",
      );
      r(-2.5, -14, 1.5, 1, "#d4b25e");
      r(1.5, -14, 1.5, 1, "#d4b25e");
      r(-1.8, -10.5, 0.7, 1.8, "#e1d4ac");
      r(1.8, -10.5, 0.7, 1.8, "#e1d4ac");
      r(8, -12, 1.5, 17, "#73523b");
      this.polygon(
        [
          [8, -13],
          [12, -17],
          [12, -10],
          [8, -8],
        ],
        "#9eaaa0",
      );
      r(8.5, -13, 0.5, 4, "#d9d9bd");
    } else if (kind === "fowl") {
      e(-1, -2, 6, 7, "#897c65");
      e(-1, -4, 5.4, 6, "#d2c5a2");
      e(0, -5, 4, 5, "#e9dcba");
      this.polygon(
        [
          [-5, -3],
          [-10, -9],
          [-9, -1],
          [-5, 2],
        ],
        "#a29376",
      );
      e(3, -10, 3.5, 4, "#e8dbbd");
      e(2.5, -11, 2.2, 2.7, "#fff0cb");
      e(3, -14, 1.2, 2, "#b75848");
      e(5, -13.5, 1, 1.5, "#d47c52");
      this.polygon(
        [
          [5, -10],
          [10, -8.5],
          [6, -7],
        ],
        "#d3a450",
      );
      e(4.3, -11, 0.8, 1, "#2b4148");
      e(-3, 0, 3.8, 3, "#ac9b7b");
      for (let i = 0; i < 7; i++) r(-5 + i, -2 + (i % 3), 0.5, 2, "#e3d1aa");
      r(-2, 4, 0.8, 3, "#b38a40");
      r(2, 4, 0.8, 3, "#b38a40");
      r(-3, 6, 3, 0.5, "#d8b670");
      r(1, 6, 3, 0.5, "#d8b670");
    } else {
      const dragon = kind === "dragon",
        lizard = kind === "lizard",
        rat = kind === "rat",
        wolf = kind === "wolf";
      const dark = dragon
        ? "#3c595c"
        : lizard
          ? "#4e7058"
          : rat
            ? "#655c58"
            : wolf
              ? "#4f626d"
              : "#78563d";
      const mid = dragon
        ? "#75957e"
        : lizard
          ? "#89a36e"
          : rat
            ? "#a28d7c"
            : wolf
              ? "#91a1a5"
              : "#bf9b6e";
      const light = dragon
        ? "#b5c393"
        : lizard
          ? "#bfc38b"
          : rat
            ? "#bfae93"
            : wolf
              ? "#cbd2c9"
              : "#dfc495";
      const w = dragon ? 28 : rat ? 13 : 20;
      if (dragon) {
        this.polygon(
          [
            [-4, -9],
            [-19, -29],
            [-25, -9],
            [-13, -3],
          ],
          "#486f6e",
        );
        this.polygon(
          [
            [-6, -10],
            [-18, -25],
            [-21, -12],
          ],
          "#7d9a88",
        );
        this.polygon(
          [
            [2, -10],
            [17, -29],
            [26, -8],
            [12, -2],
          ],
          "#3e6567",
        );
        for (let i = 0; i < 3; i++)
          this.polygon(
            [
              [3, -10],
              [17, -26],
              [22 - i * 4, -10],
            ],
            i % 2 ? "#729281" : "#5e8276",
          );
      }
      this.polygon(
        [
          [-w / 2, -3],
          [-w / 2 - 10, -7],
          [-w / 2 - 7, -3],
          [-w / 2 - 1, 1],
          [0, 2],
        ],
        dark,
      );
      if (rat) {
        e(-w / 2 - 5, -4, 3, 0.9, "#bc927f");
      }
      for (const lx of [-w / 2 + 3, w / 2 - 4]) {
        e(lx, 2, 2.2, 3.4, dark);
        e(lx + 0.7, 4, 2.5, 1.2, mid);
        r(lx + 0.3, 4, 2, 0.5, "#d3c4a5");
      }
      e(0, -4, w / 2, 6, dark);
      e(-1, -6, w / 2 - 1, 4.8, mid);
      e(-3, -7, w / 3, 2.5, light);
      e(w / 2 - 2, -8, 5, 6, dark);
      e(w / 2 - 2.5, -10, 4, 4.4, mid);
      e(w / 2 - 3.2, -10.5, 2.6, 3, light);
      e(w / 2 + 1, -5.5, 4, 2.4, mid);
      e(w / 2 + 3.5, -6, 1.2, 0.9, "#2c3d3e");
      if (rat) {
        e(w / 2 - 5, -13, 2.7, 3, dark);
        e(w / 2 - 5, -13, 1.8, 2, "#b88b7d");
        e(w / 2 - 1, -14, 2.3, 2.7, dark);
        e(w / 2 - 1, -14, 1.5, 1.8, "#bb9383");
      } else if (!lizard) {
        this.polygon(
          [
            [w / 2 - 6, -10],
            [w / 2 - 6, -18],
            [w / 2 - 2, -13],
          ],
          dark,
        );
        this.polygon(
          [
            [w / 2 - 1, -12],
            [w / 2 + 2, -18],
            [w / 2 + 3, -10],
          ],
          dark,
        );
        r(w / 2 - 5, -15, 1, 2, light);
      }
      e(w / 2 - 0.5, -10, 1, 1.1, "#20343c");
      r(w / 2 - 0.5, -10.5, 0.5, 0.5, "#f7e6b5");
      for (let i = 0; i < (dragon ? 46 : 22); i++) {
        const xx = -w / 2 + 2 + ((i * 3.5) % (w - 4)),
          yy = -8 + ((i * 2.5) % 9);
        r(
          xx,
          yy,
          lizard || dragon ? 1 : 0.5,
          lizard || dragon ? 0.5 : 1,
          i % 3 === 0 ? light : dark,
        );
      }
      if (dragon || lizard) {
        for (let i = 0; i < 5; i++)
          this.polygon(
            [
              [-8 + i * 4, -9],
              [-7 + i * 4, -13 - (i % 2)],
              [-5 + i * 4, -9],
            ],
            "#b8b783",
          );
        r(w / 2 + 1, -4, 2, 0.6, "#dcd7ad");
      }
      if (wolf) {
        r(w / 2 - 3, -5, 2, 3, "#e1ddd0");
        this.polygon(
          [
            [-8, -8],
            [-12, -3],
            [-7, -3],
          ],
          "#768b91",
        );
      }
    }
    c.restore();
  }
  building(b: Building, x: number, y: number) {
    const r = this.rect.bind(this),
      e = this.ellipse.bind(this),
      p = this.polygon.bind(this),
      c = this.c;
    const style = houseStyles[b.interior]!,
      w = b.w * 16,
      h = b.h * 16,
      wall = style.stories === 2 ? 82 : 46,
      eave = h - wall,
      door = w / 2 + 8;
    this.shadow(x + w / 2, y + h - 3, w, 36);
    // Stone foundation and round horizontal logs, including the cut ends.
    r(x + 4, y + eave, w - 8, wall, "#5a4938");
    r(x + 4, y + h - 7, w - 8, 7, "#747566");
    for (let xx = 5; xx < w - 7; xx += 10) {
      r(x + xx, y + h - 6, 9, 4, "#a3a08a");
      r(x + xx + 0.5, y + h - 6, 8, 0.5, "#c8bea1");
    }
    for (let yy = eave; yy < h - 7; yy += 5) {
      r(x + 3, y + yy, w - 6, 4.5, style.log);
      r(x + 4, y + yy + 0.5, w - 8, 1, style.light);
      r(x + 4, y + yy + 4, w - 8, 0.5, "#5b4535");
      for (let xx = 10; xx < w - 10; xx += 19) {
        r(x + xx, y + yy + 2, 12, 0.5, "rgba(239,209,158,.28)");
        r(x + xx + 3, y + yy + 3, 7, 0.5, "rgba(53,35,27,.20)");
      }
      for (const xx of [6, w - 7]) {
        e(x + xx, y + yy + 2, 3, 2.2, "#674a35");
        e(x + xx - 0.4, y + yy + 1.7, 2.3, 1.7, style.light);
        e(x + xx - 0.4, y + yy + 1.7, 1.3, 0.9, style.log);
        r(x + xx - 0.5, y + yy + 1.5, 0.5, 0.5, "#d2b281");
      }
    }
    // Roof pitch follows the depth of the house; one-storey homes have low walls.
    p(
      [
        [x - 5, y + eave],
        [x + 12, y - 8],
        [x + w - 15, y - 8],
        [x + w + 5, y + eave],
      ],
      "#493e35",
    );
    for (let row = 0; row < Math.ceil((eave + 8) / 4); row++) {
      const yy = -7 + row * 4,
        t = (yy + 8) / (eave + 8),
        left = 12 - 17 * t,
        right = w - 15 + 20 * t;
      for (let xx = left; xx < right - 2; xx += 6) {
        const width = Math.min(5.6, right - xx);
        r(
          x + xx,
          y + yy,
          width,
          3.7,
          (Math.floor(xx) + row) % 4 ? style.roof : style.roofLight,
        );
        r(x + xx, y + yy, width, 0.5, style.roofLight);
        r(x + xx + width - 0.5, y + yy + 0.5, 0.5, 3, "rgba(26,34,35,.28)");
        r(x + xx + 1, y + yy + 1, 0.5, 1.7, "rgba(245,227,183,.22)");
      }
    }
    r(x + 12, y - 9, w - 27, 2, style.roofLight);
    r(x - 5, y + eave, w + 10, 3, "#4d4031");
    r(x - 5, y + eave, w + 10, 0.5, "#d3b17c");
    r(x + 4, y + eave + 3, w - 8, 3, "rgba(34,30,28,.3)");
    const window = (xx: number, yy: number, shutters = true) => {
      r(x + xx - 2, y + yy - 2, 20, 19, "#5b4533");
      r(x + xx, y + yy, 16, 14, "#4d7c87");
      p(
        [
          [x + xx, y + yy],
          [x + xx + 13, y + yy],
          [x + xx, y + yy + 11],
        ],
        "#a6c8bc",
      );
      r(x + xx + 7.5, y + yy, 1, 14, "#e5c88e");
      r(x + xx, y + yy + 7, 16, 0.7, "#e5c88e");
      r(x + xx - 3, y + yy + 15, 22, 2, "#d4b07c");
      if (shutters)
        for (const sx of [-7, 19]) {
          r(x + xx + sx, y + yy - 1, 5, 15, style.roof);
          for (let i = 2; i < 14; i += 3)
            r(x + xx + sx + 0.5, y + yy + i, 4, 0.5, style.roofLight);
        }
    };
    if (style.stories === 2) {
      r(x + 7, y + eave + 39, w - 14, 3, "#63492f");
      r(x + 7, y + eave + 39, w - 14, 0.5, "#d2ae73");
      window(24, eave + 12);
      window(w - 43, eave + 12);
      window(w / 2 - 8, eave + 12, false);
    }
    window(20, h - 31);
    if (w > 110) window(w - 40, h - 31);
    r(x + door - 9, y + h - 34, 18, 34, "#483c30");
    r(x + door - 7, y + h - 32, 14, 32, "#9b754c");
    for (let xx = 0; xx < 14; xx += 3) {
      r(x + door - 7 + xx, y + h - 31, 0.5, 30, "#d5ae70");
      r(x + door - 6 + xx, y + h - 30, 0.5, 29, "#765332");
    }
    r(x + door - 7, y + h - 27, 14, 1, "#5c4b34");
    r(x + door - 7, y + h - 7, 14, 1, "#5c4b34");
    e(x + door + 4, y + h - 15, 1, 1, "#f1d284");
    if (style.porch) {
      r(x + door - 25, y + h - 42, 50, 5, "#70543a");
      r(x + door - 25, y + h - 42, 50, 1, style.light);
      for (const xx of [-23, 21]) {
        r(x + door + xx, y + h - 37, 3, 37, "#725337");
        r(x + door + xx + 0.5, y + h - 37, 0.5, 36, "#c3a16b");
      }
      r(x + door - 26, y + h, 52, 3, "#a88b60");
      for (let xx = -23; xx < 25; xx += 7)
        r(x + door + xx, y + h, 0.5, 3, "#6b573c");
    }
    r(x + door - 11, y + h + 3, 22, 2, "#b9b69a");
    r(x + door - 13, y + h + 5, 26, 2, "#879581");
    if (b.interior === "SMITH" || b.interior === "HOME") {
      r(x + w - 29, y - 16, 10, 24, "#737a70");
      for (let yy = -15; yy < 6; yy += 4) {
        r(x + w - 28, y + yy, 8, 3, "#a2a18c");
        r(x + w - 25 + (yy % 2), y + yy, 1, 3, "#5b665d");
      }
      r(x + w - 30, y - 17, 12, 2, "#c1bda2");
    }
    const sign =
      b.interior === "SMITH"
        ? "鍛"
        : b.interior === "APOTHECARY"
          ? "薬"
          : b.interior === "HOME"
            ? "宿"
            : "";
    if (sign) {
      r(x + door - 23, y + h - 26, 12, 10, "#d6b984");
      c.fillStyle = "#4b5947";
      c.font = "7px sans-serif";
      c.textAlign = "center";
      c.fillText(sign, x + door - 17, y + h - 18);
    }
  }
  caveEntry(x: number, y: number) {
    const r = this.rect.bind(this),
      e = this.ellipse.bind(this),
      p = this.polygon.bind(this);
    p(
      [
        [x - 34, y],
        [x - 32, y - 22],
        [x - 22, y - 43],
        [x - 9, y - 48],
        [x + 14, y - 45],
        [x + 31, y - 27],
        [x + 34, y],
      ],
      "#344958",
    );
    for (let i = 0; i < 7; i++) {
      const angle = Math.PI + (i / 6) * Math.PI,
        xx = x + Math.cos(angle) * 27,
        yy = y - 8 + Math.sin(angle) * 30;
      e(xx, yy, 7, 9, i % 2 ? "#71858b" : "#5c7280");
      r(xx - 3, yy - 5, 5, 1, "#a4b0a4");
    }
    this.c.fillStyle = "#263846";
    this.c.beginPath();
    this.c.arc(x, y - 13, 22, Math.PI, 0);
    this.c.lineTo(x + 22, y);
    this.c.lineTo(x - 22, y);
    this.c.closePath();
    this.c.fill();
    r(x - 22, y - 13, 44, 13, "#3f505b");
    r(x - 24, y - 12, 4, 12, "#84938c");
    r(x + 20, y - 12, 4, 12, "#60777e");
    for (const side of [-1, 1]) {
      r(x + side * 31 - 1, y - 13, 2, 9, "#71593d");
      e(x + side * 31, y - 17, 2.5, 4, "#deb16b");
      e(x + side * 31 - 0.5, y - 18, 1.2, 2, "#ffe0a0");
    }
    this.c.fillStyle = "#f4dfaa";
    this.c.font = "7px sans-serif";
    this.c.textAlign = "center";
    this.c.fillText("洞窟", x, y - 53);
  }
  room(id: keyof typeof rooms, cx: number, cy: number) {
    const room = rooms[id];
    if (!room) return;
    const r = this.rect.bind(this),
      p = this.polygon.bind(this),
      e = this.ellipse.bind(this),
      theme = room.theme;
    r(12 - cx, 12 - cy, 136, 104, "#443f36");
    r(16 - cx, 16 - cy, 128, 96, room.floor);
    if (theme === "forge" || theme === "herbal") {
      for (let yy = 16; yy < 112; yy += 12)
        for (let xx = 16; xx < 144; xx += 16) {
          r(
            xx - cx,
            yy - cy,
            15,
            11,
            theme === "forge"
              ? (xx + yy) % 3
                ? "#757b79"
                : "#81857c"
              : (xx + yy) % 3
                ? "#b5c2b1"
                : "#c6cebc",
          );
          r(xx + 0.5 - cx, yy + 0.5 - cy, 14, 0.5, "rgba(255,250,220,.26)");
          r(xx + 14 - cx, yy + 1 - cy, 0.5, 10, "rgba(33,45,43,.2)");
        }
    } else {
      for (let yy = 16; yy < 112; yy += 6)
        for (let xx = 16; xx < 144; xx += 24) {
          const off = yy % 12 ? 12 : 0,
            left = Math.max(16, xx - off),
            ww = Math.min(24, 144 - left);
          r(left - cx, yy - cy, ww - 0.5, 5.5, "rgba(66,43,26,.10)");
          r(
            left + 0.5 - cx,
            yy + 0.5 - cy,
            ww - 1,
            0.5,
            "rgba(255,224,168,.22)",
          );
          r(left + 3 - cx, yy + 3 - cy, ww - 7, 0.5, "rgba(57,40,28,.16)");
          r(left + ww - 3 - cx, yy + 1 - cy, 0.5, 0.5, "#71624b");
        }
    }
    if (theme === "hall") {
      r(66 - cx, 38 - cy, 37, 68, "#614048");
      r(68 - cx, 39 - cy, 33, 65, "#995b63");
      for (let yy = 41; yy < 103; yy += 5) {
        r(70 - cx, yy - cy, 2, 2, "#d7b77c");
        r(97 - cx, yy - cy, 2, 2, "#d7b77c");
      }
      p(
        [
          [85 - cx, 55 - cy],
          [95 - cx, 70 - cy],
          [85 - cx, 87 - cy],
          [75 - cx, 70 - cy],
        ],
        "#c49b78",
      );
    } else if (theme === "ranch") {
      p(
        [
          [58 - cx, 61 - cy],
          [68 - cx, 48 - cy],
          [92 - cx, 50 - cy],
          [105 - cx, 64 - cy],
          [100 - cx, 87 - cy],
          [86 - cx, 96 - cy],
          [63 - cx, 87 - cy],
        ],
        "#c1ae8a",
      );
      e(80 - cx, 72 - cy, 11, 13, "#8c7356");
      e(92 - cx, 80 - cy, 6, 8, "#9c8566");
    } else if (theme === "herbal") {
      r(66 - cx, 56 - cy, 38, 42, "#61837c");
      for (let yy = 58; yy < 96; yy += 3)
        r(68 - cx, yy - cy, 34, 0.5, "#9eb5a0");
    } else if (theme === "cottage") {
      r(65 - cx, 66 - cy, 39, 32, room.rug);
      for (let yy = 68; yy < 97; yy += 2)
        r(66 - cx, yy - cy, 37, 0.5, "#9ba57b");
    } else if (theme === "farm") {
      e(84 - cx, 72 - cy, 17, 22, "#bc9f68");
      for (let yy = 54; yy < 94; yy += 3)
        r(73 - cx, yy - cy, 22, 0.5, "#d3b77c");
    } else {
      e(40 - cx, 64 - cy, 18, 6, "rgba(30,36,35,.3)");
      for (let i = 0; i < 18; i++)
        r(
          25 + ((i * 7) % 32) - cx,
          62 + ((i * 3) % 15) - cy,
          1,
          0.5,
          "#535951",
        );
    }
    const wall =
      theme === "forge"
        ? "#9b9d90"
        : theme === "herbal"
          ? "#d7dfc6"
          : theme === "hall"
            ? "#d6c2a3"
            : "#c7b18b";
    r(8 - cx, 7 - cy, 144, 15, wall);
    r(8 - cx, 21 - cy, 144, 3, "#89775b");
    r(8 - cx, 7 - cy, 4, 106, "#ad9471");
    r(148 - cx, 7 - cy, 4, 106, "#695f4f");
    for (let xx = 12; xx < 148; xx += 12) {
      r(xx - cx, 9 - cy, 11, 0.5, "rgba(255,250,221,.30)");
      r(xx - cx, 20 - cy, 11, 0.5, "rgba(65,53,39,.22)");
    }
    r(13 - cx, 24 - cy, 134, 5, "rgba(34,37,32,.21)");
    r(12 - cx, 24 - cy, 4, 88, "rgba(37,35,26,.16)");
    const windows =
      theme === "forge"
        ? [72]
        : theme === "ranch"
          ? [108]
          : theme === "hall"
            ? [29, 109]
            : theme === "farm"
              ? [28, 68]
              : [36, 112];
    for (const xx of windows) {
      r(xx - cx, 9 - cy, 20, 12, "#685c46");
      r(xx + 1 - cx, 10 - cy, 18, 10, "#c2d2c2");
      r(xx + 2 - cx, 11 - cy, 16, 8, "#7fa7a4");
      p(
        [
          [xx + 2 - cx, 11 - cy],
          [xx + 16 - cx, 11 - cy],
          [xx + 2 - cx, 18 - cy],
        ],
        "#d4e1cd",
      );
      r(xx + 9.5 - cx, 10 - cy, 1, 10, "#e8d8b2");
      r(xx + 1 - cx, 15 - cy, 18, 0.5, "#e3d3b1");
      r(xx - 1 - cx, 21 - cy, 22, 1.5, "#b9a77f");
      p(
        [
          [xx + 2 - cx, 25 - cy],
          [xx + 18 - cx, 25 - cy],
          [xx + 49 - cx, 102 - cy],
          [xx + 25 - cx, 102 - cy],
        ],
        "rgba(255,236,177,.13)",
      );
    }
    if (theme === "hall") {
      r(64 - cx, 8 - cy, 30, 13, "#725c44");
      r(66 - cx, 9 - cy, 26, 10, "#e1d0a6");
      p(
        [
          [68 - cx, 17 - cy],
          [74 - cx, 12 - cy],
          [83 - cx, 15 - cy],
          [89 - cx, 11 - cy],
        ],
        "#83946b",
      );
    }
    if (theme === "farm" || theme === "herbal")
      for (let i = 0; i < 6; i++) {
        r(50 + i * 6 - cx, 22 - cy, 0.5, 5, "#846d42");
        e(
          50 + i * 6 - cx,
          29 + (i % 2) - cy,
          2,
          3,
          theme === "farm" ? "#c7a359" : "#60815a",
        );
      }
    if (theme === "ranch") {
      r(60 - cx, 11 - cy, 24, 2, "#81664b");
      for (let i = 0; i < 3; i++)
        p(
          [
            [63 + i * 7 - cx, 14 - cy],
            [61 + i * 7 - cx, 20 - cy],
            [66 + i * 7 - cx, 20 - cy],
          ],
          "#a28a63",
        );
    }
    r(8 - cx, 112 - cy, 68, 8, wall);
    r(100 - cx, 112 - cy, 52, 8, wall);
    r(8 - cx, 120 - cy, 68, 3, "#6b5a44");
    r(100 - cx, 120 - cy, 52, 3, "#6b5a44");
    // An illuminated open door, mat and arrow make the exit visible at all times.
    r(76 - cx, 106 - cy, 24, 15, "#f0d89a");
    r(78 - cx, 107 - cy, 20, 12, "#c2a36c");
    r(77 - cx, 108 - cy, 1, 10, "#ffefb3");
    r(98 - cx, 108 - cy, 1, 10, "#ffefb3");
    p(
      [
        [76 - cx, 111 - cy],
        [68 - cx, 116 - cy],
        [68 - cx, 101 - cy],
        [76 - cx, 106 - cy],
      ],
      "#7d6140",
    );
    r(69 - cx, 103 - cy, 0.5, 12, "#e0bd76");
    p(
      [
        [88 - cx, 119 - cy],
        [82 - cx, 113 - cy],
        [86 - cx, 113 - cy],
        [86 - cx, 107 - cy],
        [90 - cx, 107 - cy],
        [90 - cx, 113 - cy],
        [94 - cx, 113 - cy],
      ],
      "#fff0a7",
    );
    const c = this.c;
    c.textAlign = "center";
    c.font = "bold 7px sans-serif";
    c.fillStyle = "#f8df9a";
    c.fillText("出口 ↓", 88 - cx, 132 - cy);
    c.font = "7px sans-serif";
    c.fillStyle = "#f0e5c6";
    c.fillText(room.title || "", 80 - cx, -1 - cy);
  }
  furniture(p: Furniture, cx: number, cy: number) {
    const x = p.x - cx,
      y = p.y - cy,
      w = p.w,
      h = p.h,
      r = this.rect.bind(this);
    this.shadow(x + w / 2, y + h - 2, w + 2, 9);
    if (p.kind === "crate") {
      r(x, y - 6, w, h + 6, "#72593c");
      r(x + 1, y - 6, w - 2, h + 3, "#ad8955");
      for (let yy = -4; yy < h; yy += 3) {
        r(x + 1, y + yy, w - 2, 0.5, "#694c31");
        r(x + 2, y + yy + 1, w - 4, 0.5, "#c4a16a");
      }
      this.polygon(
        [
          [x, y - 6],
          [x + w, y + h - 3],
          [x + w, y + h],
          [x, y - 3],
        ],
        "#c1a06b",
      );
      for (const xx of [2, w - 3])
        for (const yy of [-3, h - 3]) r(x + xx, y + yy, 0.7, 0.7, "#4e5144");
      for (let i = 0; i < Math.floor(w / 5); i++) {
        this.ellipse(
          x + 3 + i * 4,
          y - 6,
          2.2,
          2.5,
          i % 2 ? "#b77743" : "#8c9a55",
        );
        r(x + 3 + i * 4, y - 9, 0.5, 2, "#617142");
      }
      return;
    }
    if (p.kind === "rack") {
      r(x, y - 17, w, h + 17, "#624f3c");
      r(x + 1, y - 16, w - 2, h + 14, "#907451");
      for (let i = 3; i < w - 3; i += 6) {
        r(x + i, y - 12, 1, 17, "#c09a61");
        r(x + i + 0.5, y - 12, 0.5, 17, "#e6c78c");
        r(x + i - 2, y - 13, 6, 3, "#6f8387");
        r(x + i - 2, y - 13, 6, 0.5, "#bdc5b6");
        r(x + i - 2, y - 12, 1, 3, "#4c6269");
      }
      r(x, y + h - 3, w, 2, "#ba9460");
      return;
    }
    if (p.kind === "desk") {
      for (const xx of [2, w - 5]) r(x + xx, y + h - 8, 3, 10, "#5b4734");
      r(x, y - 8, w, h + 4, "#775b3c");
      r(x, y - 9, w, h - 3, "#b69565");
      for (let yy = -7; yy < h - 13; yy += 3)
        r(x + 2, y + yy, w - 4, 0.5, "#cdae7c");
      r(x + 4, y - 6, 17, 11, "#eadcb7");
      r(x + 5, y - 5, 15, 0.5, "#ffedc7");
      for (let yy = -3; yy < 4; yy += 2)
        r(x + 6, y + yy, 9 + (yy % 3), 0.5, "#8b9b83");
      this.ellipse(x + w - 7, y - 2, 2, 2, "#3a4c50");
      this.polygon(
        [
          [x + w - 8, y - 3],
          [x + w - 5, y - 12],
          [x + w - 3, y - 13],
          [x + w - 6, y - 3],
        ],
        "#d6d6b5",
      );
      r(x + 3, y + h - 5, w - 6, 2, "#b59463");
      return;
    }
    if (p.kind === "bed") {
      r(x, y - 3, w, h + 3, "#735b47");
      r(x + 2, y - 4, w - 4, h, "#ded5b5");
      r(x + 3, y - 2, w - 6, 8, "#eee5cc");
      r(x + 2, y + 7, w - 4, h - 12, p.color || "#89a49a");
      r(x + 3, y + 8, 3, h - 13, "rgba(255,255,225,.23)");
      r(x + w - 4, y + 7, 2, h - 12, "rgba(42,55,55,.22)");
      r(x, y + h - 3, w, 4, "#9b7a56");
      r(x, y - 7, w, 4, "#9b7a56");
      for (let yy = 9; yy < h - 5; yy += 3) {
        r(x + 4, y + yy, w - 8, 0.5, "rgba(248,237,197,.24)");
        r(x + w - 6, y + yy, 1, 2, "rgba(41,59,61,.25)");
      }
      for (let xx = 5; xx < w - 3; xx += 5) r(x + xx, y + 1, 0.5, 3, "#d2c7a8");
      r(x + 1, y - 6, w - 2, 0.5, "#dbb77f");
      r(x + 1, y + h - 2, w - 2, 0.5, "#d1aa71");
      return;
    }
    if (p.kind === "plant") {
      this.polygon(
        [
          [x + 2, y + h - 10],
          [x + w - 2, y + h - 10],
          [x + w - 4, y + h],
          [x + 4, y + h],
        ],
        "#a27652",
      );
      r(x + 3, y + h - 9, 2, h > 14 ? 7 : 5, "#c39566");
      r(x + 2, y + h - 10, w - 4, 2, "#d4ae79");
      this.ellipse(x + w / 2, y + h - 10, w / 2 - 2, 1.6, "#655b3d");
      for (let i = 0; i < 9; i++) {
        const xx = x + w / 2 + Math.sin(i * 2.4) * w * 0.35,
          yy = y - 1 + Math.cos(i * 2.4) * 6;
        r(x + w / 2, y + 1, 1, h - 11, "#66804b");
        this.ellipse(
          xx,
          yy,
          2.4,
          3.1,
          i % 3 === 0 ? "#b0bf79" : i % 2 ? "#75945b" : "#4b7351",
        );
        r(xx - 0.5, yy - 1, 0.5, 2, "#b6c887");
      }
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
      for (let yy = -7; yy < h; yy += 4) {
        r(x, y + yy, 3, 0.5, "#b7b69e");
        r(x + w - 4, y + yy, 4, 0.5, "#4c5c5a");
      }
      r(x + 2, y - 9, w - 4, 0.5, "#cccaab");
      this.ellipse(x + w / 2, y + h - 7, w / 3, 2, "#e4a451");
      r(x + 8, y + h - 5, 4, 0.5, "#ffe6a1");
      return;
    }
    if (p.kind === "barrel") {
      r(x + 1, y - 5, w - 2, h + 4, "#8c704c");
      r(x + 3, y - 7, w - 6, 4, "#b49b6d");
      r(x + 1, y - 3, w - 2, 2, "#656d62");
      r(x + 1, y + h - 5, w - 2, 2, "#656d62");
      r(x + 4, y, w - 8, 1, "#bd9c65");
      for (let xx = 3; xx < w - 2; xx += 3)
        r(x + xx, y - 1, 0.5, h - 5, "#c2a16b");
      for (const yy of [-3, h - 5])
        for (let xx = 3; xx < w - 2; xx += 4)
          r(x + xx, y + yy, 0.5, 0.5, "#c4c5a6");
      this.ellipse(x + w / 2, y - 5, w / 2 - 3, 1.8, "#8b7350");
      return;
    }
    if (p.kind === "hay") {
      r(x, y - 3, w, h + 3, "#a89451");
      r(x + 1, y - 5, w - 2, h, "#c2b36c");
      for (let i = 2; i < w; i += 4) r(x + i, y - 4, 1, h, "#e0ca7e");
      r(x + w / 2, y - 4, 2, h, "#8b8051");
      for (let i = 0; i < w * 2; i++)
        r(
          x + ((i * 3.5) % w),
          y - 3 + ((i * 2.5) % (h - 1)),
          0.5,
          2,
          "#e1c77d",
        );
      return;
    }
    if (p.kind === "anvil") {
      r(x + 5, y + h - 8, w - 10, 8, "#706c60");
      r(x + 7, y - 3, w - 14, h, "#52656a");
      r(x - 3, y - 6, w + 6, 5, "#71868a");
      r(x, y - 7, w, 2, "#b8c0b0");
      for (let i = 0; i < 8; i++)
        r(x + 2 + ((i * 3) % w), y - 6, 0.5, 0.5, "#d8dac3");
      r(x + 8, y - 1, 1, h - 4, "#859997");
      r(x + 7, y + h - 1, w - 14, 0.5, "#a2aba0");
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
      for (let i = 3; i < w - 4; i += 5) {
        r(x + i, top + 5, 2, 0.5, "#dfd5af");
        r(x + i, top + 8, 2, 0.5, "#6c7967");
      }
      r(x + 1, top, w - 2, 0.5, "#e3be83");
    } else if (p.kind === "counter") {
      for (let i = 4; i < w - 4; i += 7) {
        r(x + i, top - 4, 4, 5, ["#7eaaa2", "#bdad78", "#977d93"][i % 3]);
        r(x + i + 1, top - 6, 2, 2, "#e2d2a0");
      }
      r(x + 3, top + 5, w - 9, h - 7, "#a28760");
      for (let i = 4; i < w - 4; i += 7) {
        r(x + i + 0.5, top - 3, 0.5, 3, "#d7e1bc");
        r(x + i, top - 1, 4, 0.7, "#d4c79d");
      }
      r(x + 4, top + 6, w - 11, 0.5, "#d4b27b");
      r(x + w / 2, top + 9, 2, 1, "#554f40");
    } else if (p.kind === "table") {
      r(x + 5, top + 3, 8, 4, "#e4d8b8");
      r(x + w - 8, top + 1, 4, 5, "#778b65");
    }
  }
}
