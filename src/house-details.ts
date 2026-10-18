import { roundedBox } from "./rounded-box.ts";
import type { Building } from "./maps.ts";

/** Fixed quarter-pixel material detail, baked into each house's cached sprite. */
export class HouseDetails {
  constructor(private c: CanvasRenderingContext2D) {}
  private r(x: number, y: number, w: number, h: number, color: string) {
    roundedBox(
      this.c,
      Math.round(x * 4) / 4,
      Math.round(y * 4) / 4,
      w,
      h,
      color,
      0.5,
    );
  }
  private line(points: number[][], color: string, width = 0.5) {
    const c = this.c;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  private oval(x: number, y: number, rx: number, ry: number, color: string) {
    const c = this.c;
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  roof(b: Building, x: number, y: number, w: number, eave: number) {
    const r = this.r.bind(this),
      line = this.line.bind(this),
      oval = this.oval.bind(this);
    // Different roofing trades: split cedar, straw, slate, weathered moss.
    for (let row = 0; row < Math.ceil((eave + 7) / 2); row++) {
      const yy = -6 + row * 2,
        t = (yy + 8) / (eave + 8),
        left = 13 - 17 * t,
        right = w - 16 + 20 * t;
      for (let xx = left + 1; xx < right - 2; xx += 3) {
        const n = (Math.floor(xx * 17) + row * 31) % 19;
        const straw = b.interior === "FARM",
          slate = b.interior === "SMITH";
        r(
          x + xx,
          y + yy,
          0.5,
          1.5,
          straw
            ? "rgba(239,215,146,.55)"
            : slate
              ? "rgba(202,214,208,.15)"
              : "rgba(238,215,165,.11)",
        );
        r(x + xx + 1, y + yy + 1.5, 1, 0.5, "rgba(37,37,32,.14)");
        if (straw)
          line(
            [
              [x + xx, y + yy],
              [x + xx - 0.5, y + yy + 3],
            ],
            n % 2 ? "#cfb376" : "#94814f",
          );
        // Hairline splits and mineral specks at the finer house resolution.
        line(
          [
            [x + xx + 0.75, y + yy + 0.25],
            [x + xx + 1, y + yy + 0.75],
            [x + xx + 0.75, y + yy + 1.25],
          ],
          "rgba(29,34,31,.24)",
          0.25,
        );
        r(x + xx + 1.5, y + yy + 0.75, 0.25, 0.25, "rgba(246,230,190,.4)");
        if (n === 0)
          line(
            [
              [x + xx, y + yy + 0.5],
              [x + xx + 0.5, y + yy + 1],
              [x + xx, y + yy + 1.5],
            ],
            "rgba(41,43,38,.45)",
          );
        if ((b.interior === "RANCH" || b.interior === "APOTHECARY") && n < 3) {
          r(x + xx, y + yy + 1, 2, 0.5, "#71865a");
          r(x + xx + 0.5, y + yy + 0.5, 0.5, 0.5, "#acac77");
        }
      }
    }
    // A raised dormer changes the silhouette, not just the tint of the roof.
    if (b.interior === "CHIEF" || b.interior === "FARM") {
      const cx = x + w / 2,
        bottom = y + eave - 3,
        top = bottom - 25;
      r(cx - 13, top + 8, 26, 18, "#604a36");
      r(cx - 11, top + 9, 22, 16, "#b28a5c");
      for (let yy = top + 10; yy < bottom; yy += 3) {
        r(cx - 11, yy, 22, 0.5, "#d5b17b");
        r(cx - 11, yy + 2, 22, 0.5, "#77563b");
      }
      const c = this.c;
      c.fillStyle = b.interior === "CHIEF" ? "#684437" : "#877044";
      c.beginPath();
      c.moveTo(cx - 17, top + 9);
      c.lineTo(cx, top - 2);
      c.lineTo(cx + 17, top + 9);
      c.closePath();
      c.fill();
      line(
        [
          [cx - 17, top + 9],
          [cx, top - 2],
          [cx + 17, top + 9],
        ],
        "#dbbd85",
        1,
      );
      oval(cx, top + 16, 6, 6, "#4d4535");
      oval(
        cx,
        top + 16,
        4.5,
        4.5,
        b.interior === "CHIEF" ? "#c5bc92" : "#3c4d43",
      );
      if (b.interior === "CHIEF") {
        line(
          [
            [cx, top + 13],
            [cx, top + 16],
            [cx + 2, top + 17],
          ],
          "#4b5b55",
          0.75,
        );
        for (const [dx, dy] of [
          [0, -3],
          [3, 0],
          [0, 3],
          [-3, 0],
        ])
          r(cx + dx, top + 16 + dy, 0.5, 0.5, "#655740");
      } else
        for (let dx = -3; dx <= 3; dx += 2)
          r(cx + dx, top + 12, 1, 8, "#c2a36e");
    }
    if (b.interior === "SMITH") {
      r(x + 7, y - 20, 13, 26, "#4b5352");
      for (let yy = -18; yy < 6; yy += 3)
        for (let xx = 8; xx < 19; xx += 5) {
          r(x + xx, y + yy, 4.5, 2.5, "#8b8a78");
          r(x + xx, y + yy, 4, 0.5, "#b6ad92");
        }
      r(x + 5, y - 21, 17, 3, "#393e3d");
      r(x + 7, y - 20, 13, 0.5, "#a6a18c");
      r(x + 9, y - 21, 9, 1, "#242e32");
    }
    if (b.interior === "HOME") {
      // Low barn roof with an open louvred ridge vent.
      r(x + w / 2 - 16, y - 13, 32, 7, "#4c4c38");
      for (let xx = -14; xx < 15; xx += 3)
        r(x + w / 2 + xx, y - 12, 1, 5, "#b9a077");
      r(x + w / 2 - 19, y - 15, 38, 2, "#7c6646");
      r(x + w / 2 - 19, y - 15, 38, 0.5, "#ceb585");
    }
  }
  wall(x: number, y: number, w: number, h: number, eave: number) {
    const r = this.r.bind(this);
    // Fine grain never repeats at the same position on adjacent logs.
    for (let yy = eave + 5; yy < h - 8; yy += 2.5)
      for (let xx = 10; xx < w - 10; xx += 3.5) {
        const n = Math.floor(xx * 23 + yy * 11) % 23;
        r(
          x + xx,
          y + yy + (n % 3) * 0.5,
          0.5 + (n % 3),
          0.5,
          n % 2 ? "rgba(37,29,22,.21)" : "rgba(249,224,177,.25)",
        );
      }
    // Uneven, curved fibres follow the grain rather than making a regular grid.
    const c = this.c;
    c.lineWidth = 0.25;
    for (let yy = eave + 5; yy < h - 8; yy += 3.75)
      for (let xx = 12; xx < w - 12; xx += 9.5) {
        const n = Math.floor(xx * 11 + yy * 7) % 13;
        c.strokeStyle = n % 2 ? "rgba(41,31,24,.3)" : "rgba(249,223,175,.34)";
        c.beginPath();
        c.moveTo(x + xx, y + yy);
        c.bezierCurveTo(
          x + xx + 2,
          y + yy - 0.75,
          x + xx + 4,
          y + yy + 0.75,
          x + xx + 7,
          y + yy,
        );
        c.stroke();
        if (n < 2) {
          this.oval(x + xx + 3, y + yy, 0.9, 0.4, "rgba(57,39,27,.5)");
          this.oval(
            x + xx + 2.75,
            y + yy - 0.25,
            0.4,
            0.2,
            "rgba(218,183,127,.65)",
          );
        }
      }
  }
  facade(
    b: Building,
    x: number,
    y: number,
    w: number,
    h: number,
    eave: number,
    door: number,
  ) {
    const r = this.r.bind(this),
      line = this.line.bind(this),
      oval = this.oval.bind(this);
    const box = (bx: number, by: number, bw: number) => {
      r(bx, by, bw, 7, "#695039");
      r(bx, by, bw, 1, "#c2a073");
      for (let dx = 2; dx < bw; dx += 3) r(bx + dx, by + 1, 0.5, 5, "#9c794d");
      r(bx + 1, by + 6, bw - 2, 0.5, "#3e4939");
    };
    const flowers = (bx: number, by: number, bw: number) => {
      box(bx, by, bw);
      for (let i = 0; i < bw - 2; i += 2) {
        r(bx + 1 + i, by - 3 - (i % 3), 0.5, 4, "#4b7245");
        oval(
          bx + 1 + i,
          by - 3 - (i % 3),
          1,
          0.75,
          i % 3 ? "#c1a87c" : "#b87d72",
        );
      }
    };
    const barrel = (bx: number, by: number) => {
      oval(bx, by + 2, 5, 2, "#473d30");
      r(bx - 5, by - 10, 10, 12, "#8e6d47");
      for (let dx = -3; dx < 5; dx += 2) r(bx + dx, by - 9, 0.5, 10, "#c09a63");
      for (const yy of [-7, -1]) r(bx - 5, by + yy, 10, 1, "#515d55");
      oval(bx, by - 10, 5, 2, "#c1a075");
      oval(bx, by - 10, 3.5, 1, "#776043");
    };
    // Fine frame bevels, glass scratches, cut nails and stone granules.
    const windows: [number, number][] = [];
    if (!["RANCH", "SMITH"].includes(b.interior)) windows.push([20, h - 31]);
    if (w > 110) windows.push([w - 40, h - 31]);
    if (b.interior === "CHIEF" || b.interior === "FARM")
      windows.push(
        [24, eave + 12],
        [w - 43, eave + 12],
        [w / 2 - 8, eave + 12],
      );
    for (const [wx, wy] of windows) {
      line(
        [
          [x + wx + 0.75, y + wy + 13],
          [x + wx + 0.75, y + wy + 0.75],
          [x + wx + 15, y + wy + 0.75],
        ],
        "rgba(219,238,212,.55)",
        0.25,
      );
      for (let i = 0; i < 4; i++)
        r(x + wx + 2.25 + i * 3, y + wy + 14.75, 0.25, 0.5, "#79694b");
      line(
        [
          [x + wx + 10, y + wy + 2],
          [x + wx + 12.5, y + wy + 4.5],
        ],
        "rgba(234,244,220,.35)",
        0.25,
      );
      line(
        [
          [x + wx + 10.5, y + wy + 2],
          [x + wx + 13, y + wy + 4.5],
        ],
        "rgba(234,244,220,.22)",
        0.25,
      );
    }
    for (let xx = 7; xx < w - 8; xx += 2.75) {
      r(x + xx, y + h - 5.25, 0.25, 0.5, "rgba(53,65,57,.45)");
      r(x + xx + 0.5, y + h - 4.5, 0.5, 0.25, "rgba(234,225,193,.45)");
    }
    if (b.interior === "CHIEF") {
      // Carved balcony and a pair of long village pennants.
      const by = y + eave + 34;
      r(x + 20, by, w - 40, 3, "#61452f");
      r(x + 20, by, w - 40, 0.5, "#ddbb83");
      for (let xx = 22; xx < w - 20; xx += 5) {
        r(x + xx, by - 7, 1, 7, "#9b754c");
        r(x + xx, by - 7, 0.5, 6, "#d3b27c");
      }
      r(x + 19, by - 8, w - 38, 1, "#c2a375");
      for (const dx of [10, w - 18]) {
        r(x + dx, y + eave + 8, 8, 21, "#6a474a");
        r(x + dx + 1, y + eave + 8, 1, 20, "#c7996c");
        line(
          [
            [x + dx + 4, y + eave + 11],
            [x + dx + 6, y + eave + 15],
            [x + dx + 4, y + eave + 19],
            [x + dx + 2, y + eave + 15],
            [x + dx + 4, y + eave + 11],
          ],
          "#d3b67c",
        );
      }
      flowers(x + 19, y + h - 13, 18);
      flowers(x + w - 41, y + h - 13, 20);
    } else if (b.interior === "FARM") {
      // Harvest drying under the eaves, crates and a rain barrel.
      line(
        [
          [x + 12, y + eave + 4],
          [x + w - 12, y + eave + 4],
        ],
        "#5f5940",
      );
      for (let dx = 16; dx < w - 12; dx += 11)
        for (let i = 0; i < 3; i++) {
          line(
            [
              [x + dx, y + eave + 4],
              [x + dx - 2 + i * 2, y + eave + 13],
            ],
            "#c9b178",
          );
          r(x + dx - 2 + i * 2, y + eave + 8, 1, 5, "#d5bb7d");
          r(x + dx - 2 + i * 2, y + eave + 9, 0.5, 3, "#f0d79a");
        }
      box(x + 43, y + h - 9, 15);
      box(x + 46, y + h - 15, 10);
      barrel(x + w - 13, y + h - 3);
    } else if (b.interior === "RANCH") {
      // Open stable hatch with split shutters and a hay-filled feeding rack.
      r(x + 18, y + h - 33, 21, 18, "#343f35");
      for (const dx of [15, 36]) {
        r(x + dx, y + h - 34, 5, 20, "#786244");
        for (let yy = h - 32; yy < h - 15; yy += 3)
          r(x + dx + 0.5, y + yy, 4, 0.5, "#b59b69");
      }
      box(x + 17, y + h - 13, 23);
      for (let i = 0; i < 18; i++)
        line(
          [
            [x + 18 + i, y + h - 12],
            [x + 16 + i, y + h - 17 - (i % 4)],
          ],
          i % 2 ? "#b9a66a" : "#ddd095",
        );
      barrel(x + w - 14, y + h - 3);
      // Leather tack hangs beside the main door.
      oval(x + door + 16, y + h - 23, 3, 5, "#4a4232");
      oval(x + door + 16, y + h - 24, 2, 3.5, "#ac8958");
    } else if (b.interior === "HOME") {
      // A practical livestock shed: heavy cross-braced door and stacked firewood.
      line(
        [
          [x + door - 6, y + h - 29],
          [x + door + 6, y + h - 9],
          [x + door - 6, y + h - 9],
          [x + door + 6, y + h - 29],
        ],
        "#c7a16a",
        1,
      );
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 4 - (row % 2); col++) {
          const bx = x + 43 + col * 4 + (row % 2) * 2,
            by = y + h - 3 - row * 3;
          oval(bx, by, 2, 1.5, "#5c4833");
          oval(bx - 0.5, by - 0.5, 1.3, 0.9, "#c6a36e");
          r(bx - 0.5, by - 0.5, 0.5, 0.5, "#785d3c");
        }
      box(x + w - 40, y + h - 11, 19);
      for (let i = 0; i < 14; i++)
        line(
          [
            [x + w - 39 + i, y + h - 11],
            [x + w - 40 + i, y + h - 15 - (i % 3)],
          ],
          "#bdad76",
        );
    } else if (b.interior === "SMITH") {
      // Arched forge alcove glows behind an iron grille.
      r(x + 15, y + h - 35, 25, 23, "#4c4c44");
      r(x + 17, y + h - 33, 21, 19, "#272e30");
      oval(x + 27, y + h - 25, 9, 7, "#4a352a");
      oval(x + 27, y + h - 23, 6, 4, "#a96c3b");
      r(x + 22, y + h - 22, 10, 2, "#e0ac59");
      for (let dx = 18; dx < 38; dx += 4)
        r(x + dx, y + h - 32, 1, 18, "#444e4b");
      r(x + 16, y + h - 15, 23, 2, "#9c9982");
      // Anvil and tools sit against the facade, inside its existing footprint.
      r(x + w - 22, y + h - 10, 12, 7, "#6d5138");
      r(x + w - 25, y + h - 14, 17, 2, "#a5afaa");
      r(x + w - 22, y + h - 12, 10, 2, "#596a6c");
      r(x + w - 20, y + h - 10, 6, 1, "#3a4b50");
      line(
        [
          [x + w - 12, y + h - 34],
          [x + w - 12, y + h - 22],
        ],
        "#bb955e",
        1,
      );
      r(x + w - 16, y + h - 35, 8, 3, "#71837f");
    } else if (b.interior === "APOTHECARY") {
      // Striped shop canopy and herbs drying from the rafters.
      r(x + 13, y + h - 40, w - 26, 5, "#46665c");
      for (let dx = 14; dx < w - 14; dx += 5)
        r(x + dx, y + h - 39, 4, 4, dx % 10 ? "#b7bda0" : "#678b79");
      for (let dx = 14; dx < w - 14; dx += 5)
        r(x + dx, y + h - 35, 4, 2, dx % 10 ? "#cbd0af" : "#7c9b83");
      flowers(x + 17, y + h - 13, 20);
      for (const dx of [w - 30, w - 22, w - 14]) {
        line(
          [
            [x + dx, y + eave + 4],
            [x + dx, y + eave + 12],
          ],
          "#b3a57b",
        );
        for (let i = 0; i < 5; i++) {
          oval(x + dx - 1 + (i % 2) * 2, y + eave + 10 + i, 1.5, 1, "#6e8858");
        }
      }
      r(x + w - 40, y + h - 10, 24, 8, "#957954");
      for (const [dx, color] of [
        [w - 35, "#97b0a1"],
        [w - 28, "#a88e68"],
        [w - 21, "#a4a0b6"],
      ] as const) {
        r(x + dx, y + h - 15, 4, 5, color);
        r(x + dx + 1, y + h - 17, 2, 2, color);
        r(x + dx + 0.5, y + h - 14, 0.5, 3, "#dbe0c5");
      }
    }
  }
}
