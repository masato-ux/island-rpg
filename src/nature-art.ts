/** Original vegetation and rock families, with a shared foot anchor at (20, 44). */
export function paintNature(
  c: CanvasRenderingContext2D,
  tile: "tree" | "rock",
  seed: number,
  forest: boolean,
) {
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  const e = (x: number, y: number, rx: number, ry: number, color: string) => {
    const outlined = rx > 5 && ry > 5;
    for (let row = -Math.floor(ry); row <= Math.floor(ry); row++) {
      const width = Math.floor(
        rx * Math.sqrt(Math.max(0, 1 - (row * row) / (ry * ry))),
      );
      if (!width) continue;
      c.fillStyle = outlined ? "#294b39" : color;
      c.fillRect(Math.round(x) - width, Math.round(y) + row, width * 2 + 1, 1);
      if (outlined && Math.abs(row) < Math.floor(ry) - 1) {
        c.fillStyle = color;
        c.fillRect(
          Math.round(x) - width + 1,
          Math.round(y) + row,
          Math.max(1, width * 2 - 1),
          1,
        );
      }
    }
  };
  const p = (points: number[][], color: string) => {
    c.fillStyle = color;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
    c.strokeStyle = "#354b36";
    c.lineWidth = 1;
    c.stroke();
  };
  const rand = (i: number) => {
    let n = Math.imul(seed + 71, 374761393) ^ Math.imul(i + 41, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  e(21, 43, 12, 2.7, "rgba(25,44,35,.24)");
  if (tile === "rock") {
    const family = seed % 5,
      width = family === 1 ? 8 : family === 2 ? 15 : 11,
      height = family === 1 ? 24 : family === 2 ? 12 : 18;
    const palettes = [
      ["#4c6269", "#7a8d8b", "#b3bbaa"],
      ["#6c6355", "#9b8c70", "#c7b492"],
      ["#59616c", "#89919b", "#c0c2b5"],
      ["#4f6b62", "#7b9580", "#b4bca0"],
    ];
    const colors = palettes[Math.floor(seed / 5) % palettes.length],
      top = 43 - height;
    const outline = [
      [20 - width, 41],
      [19 - width, top + height * 0.45],
      [15 - width * 0.3, top + 1],
      [22 + width * 0.25, top],
      [20 + width, top + height * 0.45],
      [19 + width, 42],
      [20, 44],
    ];
    p(outline, colors[0]);
    p(
      [
        [19 - width, top + height * 0.45],
        [15 - width * 0.3, top + 1],
        [22 + width * 0.25, top],
        [23, top + height * 0.55],
        [16, 39],
      ],
      colors[1],
    );
    p(
      [
        [15 - width * 0.3, top + 1],
        [22 + width * 0.25, top],
        [24 + width * 0.4, top + 4],
        [17, top + 6],
      ],
      colors[2],
    );
    c.strokeStyle = colors[0];
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(20, top + 4);
    c.lineTo(18, top + 9);
    c.lineTo(21, top + 12);
    c.stroke();
    for (let i = 0; i < 24; i++) {
      const xx = 20 - width + rand(i) * width * 2,
        yy = top + 4 + rand(i + 71) * (height - 6);
      if (
        ((xx - 20) / width) ** 2 +
          ((yy - (top + height * 0.55)) / (height * 0.55)) ** 2 >
        1
      )
        continue;
      r(xx, yy, 0.5 + (i % 2) * 0.5, 0.5, i % 3 ? colors[2] : colors[0]);
    }
    if (seed % 3 !== 0)
      for (let i = 0; i < 7; i++)
        e(12 + rand(i + 90) * 16, 39 + rand(i + 100) * 4, 1.5, 1, "#7d8d54");
    if (family === 3) {
      e(9, 43, 4, 2.5, colors[0]);
      e(8, 42, 3, 2, colors[1]);
      e(31, 42, 3, 2, colors[1]);
    }
    return;
  }
  const family = seed % 5;
  const palettes = forest
    ? [
        ["#284b40", "#3f6b48", "#688a50", "#91a669"],
        ["#354e43", "#587450", "#81975e", "#b1b578"],
        ["#304d4d", "#4b7666", "#78a084", "#a7ba94"],
        ["#46563e", "#72834c", "#a1a15e", "#c5b477"],
      ]
    : [
        ["#3e6146", "#658950", "#91ad62", "#c1c581"],
        ["#445c41", "#788a4a", "#adb268", "#d6cc8b"],
        ["#355f51", "#53866b", "#83ac82", "#b2ca9a"],
        ["#62583b", "#98844e", "#baaa68", "#d7c68a"],
      ];
  const colors = palettes[Math.floor(seed / 5) % palettes.length];
  const birch = family === 2,
    trunk = birch ? "#d3cbb0" : "#8b7250";
  r(18, 24, 4, 19, "#4c503c");
  r(18.5, 24, 2, 18, trunk);
  c.strokeStyle = birch ? "#596254" : "#c0a477";
  c.lineWidth = 0.5;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(18, 27 + i * 3);
    c.lineTo(21, 28 + i * 3);
    c.stroke();
  }
  p(
    [
      [18, 40],
      [14, 44],
      [18, 43],
      [20, 41],
      [23, 44],
      [25, 44],
      [22, 40],
    ],
    birch ? "#b5b196" : "#7b6c4b",
  );
  if (family === 1) {
    // Cedar: layers of drooping needles, rather than the same rounded crown.
    for (let layer = 0; layer < 4; layer++) {
      const yy = 8 + layer * 6,
        w = 7 + layer * 2.5;
      p(
        [
          [20, yy - 6],
          [20 - w, yy + 8],
          [18, yy + 5],
          [20 + w, yy + 8],
        ],
        colors[layer % 2],
      );
      p(
        [
          [20, yy - 5],
          [20 - w + 2, yy + 6],
          [19, yy + 3],
          [20 + w - 3, yy + 5],
        ],
        colors[2],
      );
      r(17 - layer, yy + 2, 5 + layer * 2, 0.5, colors[3]);
    }
  } else {
    const narrow = family === 2,
      old = family === 3,
      top = narrow ? 7 : old ? 16 : 10;
    e(20, 25, narrow ? 10 : old ? 18 : 15, narrow ? 16 : 12, colors[0]);
    e(12, 23, narrow ? 6 : 10, 10, colors[1]);
    e(27, 24, narrow ? 6 : 11, 10, colors[1]);
    e(20, top + 7, narrow ? 9 : 12, narrow ? 13 : 11, colors[2]);
    e(15, top + 4, 7, 7, colors[3]);
    if (old) {
      e(7, 27, 6, 7, colors[1]);
      e(32, 27, 7, 8, colors[0]);
    }
    if (family === 4) {
      e(27, 14, 7, 6, colors[2]);
      e(10, 17, 6, 7, colors[1]);
    }
    for (let i = 0; i < 66; i++) {
      const xx = 5 + rand(i) * 31,
        yy = top - 2 + rand(i + 97) * 25;
      if (
        ((xx - 20) / (narrow ? 10 : 15)) ** 2 + ((yy - (top + 10)) / 14) ** 2 >
        1
      )
        continue;
      e(
        xx,
        yy,
        0.6 + rand(i + 160),
        0.45 + rand(i + 200) * 0.6,
        colors[yy < top + 8 ? 2 + (i % 2) : i % 3],
      );
    }
  }
  if (seed % 7 === 0)
    for (let i = 0; i < 6; i++)
      r(12 + rand(i + 89) * 16, 39 + rand(i + 130) * 5, 1, 0.5, colors[2]);
}
export function groundMood(mapId: string, wx: number, wy: number) {
  const salt = Array.from(mapId).reduce((n, s) => n + s.charCodeAt(0), 0);
  const value = (x: number, y: number) =>
    ((Math.imul(x + salt, 374761393) ^ Math.imul(y + 51, 668265263)) >>> 0) /
    4294967295;
  const noise = (spacing: number) => {
    const x = wx / spacing,
      y = wy / spacing,
      ix = Math.floor(x),
      iy = Math.floor(y),
      u = x - ix,
      v = y - iy;
    const tx = u * u * (3 - 2 * u),
      ty = v * v * (3 - 2 * v);
    return (
      value(ix, iy) * (1 - tx) * (1 - ty) +
      value(ix + 1, iy) * tx * (1 - ty) +
      value(ix, iy + 1) * (1 - tx) * ty +
      value(ix + 1, iy + 1) * tx * ty
    );
  };
  return (noise(116) - 0.5) * 1.3 + (noise(43) - 0.5) * 0.35;
}
