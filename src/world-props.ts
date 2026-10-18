import { DepthArt } from "./depth-art.ts";
export class WorldProps {
  private art: DepthArt;
  constructor(private c: CanvasRenderingContext2D) {
    this.art = new DepthArt(c);
  }
  resource(x: number, y: number, item: string, depleted: boolean) {
    const a = this.art,
      r = a.rect.bind(a),
      e = a.ellipse.bind(a),
      p = a.polygon.bind(a);
    a.shadow(x, y + 2, 13, 8);
    e(x, y + 2, 6, 1.5, "rgba(33,45,35,.22)");
    if (depleted) {
      r(x - 4, y, 8, 2, "#8c8060");
      r(x - 2, y - 1, 1, 2, "#b4a17a");
      r(x + 2, y - 2, 1, 3, "#61774b");
      return;
    }
    if (item === "きのこ") {
      for (const [dx, dy, scale] of [
        [-3, 1, 1],
        [4, -2, 0.7],
      ]) {
        r(x + dx - 1, y + dy - 5, 2, 6, "#e4d0a3");
        e(x + dx, y + dy - 6, 4 * scale, 3 * scale, "#654638");
        e(x + dx, y + dy - 7, 4 * scale, 2 * scale, "#b57653");
        r(x + dx - 2, y + dy - 8, 1, 1, "#e3bd85");
        r(x + dx + 1, y + dy - 7, 1, 1, "#e8d7ac");
      }
      return;
    }
    if (["石", "鉄鉱石", "希少鉱石", "魔力結晶"].includes(item)) {
      const crystal = item === "魔力結晶",
        rare = item === "希少鉱石";
      p(
        [
          [x - 8, y + 1],
          [x - 6, y - 5],
          [x - 1, y - 9],
          [x + 5, y - 7],
          [x + 8, y - 1],
          [x + 5, y + 3],
          [x - 5, y + 3],
        ],
        "#596c73",
      );
      p(
        [
          [x - 6, y - 4],
          [x - 1, y - 8],
          [x + 5, y - 6],
          [x + 2, y - 1],
          [x - 4, y],
        ],
        "#a5b3aa",
      );
      p(
        [
          [x + 2, y - 1],
          [x + 5, y - 6],
          [x + 7, y - 1],
          [x + 4, y + 2],
        ],
        "#7a8a8c",
      );
      if (crystal || rare) {
        for (const dx of [-3, 3]) {
          p(
            [
              [x + dx - 2, y - 2],
              [x + dx - 1, y - 11],
              [x + dx + 2, y - 13],
              [x + dx + 3, y - 3],
            ],
            crystal ? "#72b8b8" : "#aea0bd",
          );
          r(x + dx, y - 10, 1, 7, crystal ? "#d7f0d2" : "#ede1c4");
        }
      } else if (item === "鉄鉱石") {
        r(x - 3, y - 5, 3, 2, "#b28c63");
        r(x + 3, y - 2, 2, 2, "#d0aa75");
      }
      return;
    }
    if (["木の枝", "木材", "硬木"].includes(item)) {
      for (const [dx, dy] of [
        [-3, -2],
        [3, 1],
      ]) {
        r(x + dx - 6, y + dy - 3, 12, 4, "#6c5138");
        r(x + dx - 5, y + dy - 3, 10, 1, "#b99a66");
        r(x + dx - 3, y + dy - 1, 6, 1, "#8d704a");
        e(x + dx + 6, y + dy - 1, 2.3, 2.3, "#d0b381");
        e(x + dx + 6, y + dy - 1, 1.2, 1.2, "#967449");
      }
      return;
    }
    if (item === "ミミズ" || item === "虫") {
      r(x - 5, y, 11, 2, "#84704f");
      r(x - 3, y - 2, 7, 2, "#b2986a");
      if (item === "ミミズ") {
        r(x - 3, y - 3, 4, 1, "#caa089");
        r(x, y - 5, 1, 3, "#ab7c6a");
        r(x, y - 5, 3, 1, "#d3ad90");
      } else {
        e(x, y - 4, 2.5, 2, "#637849");
        r(x - 3, y - 5, 1, 1, "#adb67a");
        r(x + 2, y - 3, 2, 1, "#364d39");
      }
      return;
    }
    // Herb rosettes and grass blades have a recognizable base and individual leaves.
    const herb = item === "薬草",
      wet = item === "湿地草";
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * 2,
        top = -3 - ((i * 3) % 5);
      r(x + dx, y + top, 1, -top + 1, wet ? "#587c59" : "#487044");
      p(
        [
          [x + dx, y + top + 2],
          [x + dx - 3, y + top - 1],
          [x + dx - 2, y + top - 3],
          [x + dx + 1, y + top],
        ],
        herb ? "#91b565" : "#799d53",
      );
      p(
        [
          [x + dx, y + top + 3],
          [x + dx + 3, y + top],
          [x + dx + 2, y + top - 2],
          [x + dx, y + top],
        ],
        "#a8bf76",
      );
      if (herb) r(x + dx, y + top - 3, 1, 1, "#ddce8f");
    }
  }
  stake(x: number, y: number, time: number) {
    const a = this.art,
      r = a.rect.bind(a),
      e = a.ellipse.bind(a),
      p = a.polygon.bind(a);
    a.shadow(x, y + 3, 12, 20);
    e(x, y + 3, 6, 2, "#6c7660");
    r(x - 4, y - 1, 8, 4, "#97947a");
    p(
      [
        [x - 3, y + 1],
        [x - 3, y - 19],
        [x + 1, y - 21],
        [x + 4, y - 18],
        [x + 4, y + 1],
      ],
      "#725437",
    );
    r(x - 2, y - 18, 2, 19, "#bd9b64");
    r(x + 1, y - 18, 1, 18, "#997442");
    r(x + 2, y - 15, 1, 13, "#4e4e38");
    for (const yy of [-14, -6]) {
      r(x - 4, y + yy, 9, 2, "#637c78");
      r(x - 3, y + yy, 7, 0.5, "#b6c4aa");
      r(x + 2, y + yy, 1, 1, "#d1cd9c");
    }
    p(
      [
        [x, y - 29],
        [x + 4, y - 24],
        [x + 2, y - 19],
        [x - 3, y - 20],
        [x - 4, y - 25],
      ],
      "#477f8c",
    );
    p(
      [
        [x, y - 28],
        [x + 1, y - 21],
        [x - 3, y - 22],
      ],
      "#aadbd0",
    );
    r(x - 1, y - 26, 1, 4, "#e8edb9");
    const glow = 0.1 + 0.06 * Math.sin(time / 15);
    e(x, y - 24, 6, 6, `rgba(129,218,206,${glow})`);
    r(x - 1, y - 12, 2, 4, "#d5c591");
    r(x - 2, y - 10, 4, 0.5, "#d5c591");
  }
  fishing(
    x: number,
    y: number,
    time: number,
    water?: { x: number; y: number },
  ) {
    const a = this.art,
      r = a.rect.bind(a),
      e = a.ellipse.bind(a),
      p = a.polygon.bind(a),
      c = this.c;
    a.shadow(x, y + 3, 22, 8);
    // A worn landing, coiled rope, creel and rod identify the usable spot.
    r(x - 12, y, 25, 7, "#64583e");
    for (let i = 0; i < 4; i++) {
      r(x - 11 + i * 6, y, 5, 5, "#aa9063");
      r(x - 10 + i * 6, y, 1, 5, "#d4b77d");
      r(x - 9 + i * 6, y + 3, 1, 1, "#65563e");
    }
    for (const dx of [-11, 11]) {
      r(x + dx, y - 5, 2, 13, "#705b3d");
      r(x + dx, y - 5, 2, 1, "#c2a371");
    }
    e(x - 8, y - 1, 3, 1.8, "#cfbb8a");
    e(x - 8, y - 1, 1.7, 0.8, "#75694a");
    p(
      [
        [x + 5, y - 1],
        [x + 4, y - 7],
        [x + 11, y - 7],
        [x + 12, y - 1],
      ],
      "#96794d",
    );
    r(x + 5, y - 7, 6, 1, "#d5ba84");
    for (let dx = 6; dx < 11; dx += 2) r(x + dx, y - 6, 0.5, 4, "#d2ad72");
    c.strokeStyle = "#775b3b";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x - 2, y - 1);
    c.lineTo(x + 10, y - 19);
    c.stroke();
    if (water) {
      const fx = water.x,
        fy = water.y,
        bob = Math.sin(time / 9) * 0.6;
      c.strokeStyle = "#c8d6bb";
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(x + 10, y - 19);
      c.quadraticCurveTo((x + fx) / 2 + 8, (y + fy) / 2 - 7, fx, fy - 2);
      c.stroke();
      e(fx, fy + 1, 5, 1.5, "rgba(178,216,204,.45)");
      r(fx - 1, fy - 4 + bob, 2, 3, "#bd6b54");
      r(fx - 1, fy - 1 + bob, 2, 2, "#e2d6ad");
      e(fx + 8, fy + 7, 5, 1, "rgba(43,79,83,.23)");
      p(
        [
          [fx + 4, fy + 7],
          [fx + 8, fy + 5],
          [fx + 12, fy + 7],
          [fx + 8, fy + 9],
        ],
        "rgba(63,101,101,.5)",
      );
    } else {
      e(x - 2, y - 1, 2, 1, "#d9cba1");
      r(x + 5, y - 6, 3, 1, "#66583e");
    }
  }
}
