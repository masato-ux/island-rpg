import {
  walls,
  objects,
  chairs,
  coworkers,
  OFFICE_W,
  OFFICE_H,
  type OfficeObject,
} from "./office-model.ts";
const box = (
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};
function ellipse(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function poly(c: CanvasRenderingContext2D, p: number[][], color: string) {
  c.fillStyle = color;
  c.beginPath();
  p.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
function plant(c: CanvasRenderingContext2D, x: number, y: number) {
  ellipse(c, x, y + 6, 10, 4, "#35493c55");
  box(c, x - 5, y - 4, 10, 12, "#887854");
  box(c, x - 4, y - 4, 8, 3, "#c6b58e");
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4;
    ellipse(
      c,
      x + Math.sin(angle) * 7,
      y - 10 + Math.cos(angle) * 5,
      3,
      6,
      i % 2 ? "#6d8b49" : "#3b6244",
    );
  }
  box(c, x - 1, y - 13, 2, 15, "#627345");
}
function monitor(c: CanvasRenderingContext2D, x: number, y: number, on = true) {
  box(c, x - 3, y + 13, 6, 6, "#635f51");
  box(c, x - 10, y + 18, 20, 2, "#88897b");
  box(c, x - 15, y - 6, 30, 21, "#484c49");
  box(c, x - 13, y - 5, 26, 17, "#b5b5a2");
  box(c, x - 11, y - 3, 22, 13, on ? "#5191bd" : "#25353d");
  if (on) {
    box(c, x - 9, y - 1, 18, 2, "#93cae1");
    box(c, x - 8, y + 3, 7, 1, "#d3e4da");
    box(c, x - 8, y + 6, 12, 1, "#7db6d4");
  }
  box(c, x + 10, y + 13, 1, 1, "#b1d58e");
}
function desk(c: CanvasRenderingContext2D, o: OfficeObject) {
  const { x, y, w, h } = o;
  box(c, x + 5, y + h - 2, 5, 14, "#665337");
  box(c, x + w - 10, y + h - 2, 5, 14, "#665337");
  box(c, x - 1, y - 1, w + 2, h + 4, "#715638");
  box(c, x, y, w, h, "#bd8c53");
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#e2b875");
  g.addColorStop(1, "#be8d52");
  c.fillStyle = g;
  c.fillRect(x + 2, y + 1, w - 4, h - 3);
  for (let i = 0; i < 5; i++)
    box(c, x + 4, y + 7 + i * 6, w - 8, 1, "#9a73442b");
  box(c, x + 1, y + h - 3, w - 2, 2, "#e2b57a");
  monitor(
    c,
    x + w * 0.43,
    y + 5,
    (Math.floor(x / 112) + Math.floor(y / 142)) % 3 !== 0,
  );
  box(c, x + w * 0.43 - 12, y + 27, 24, 7, "#dbd9c6");
  for (let i = 0; i < 7; i++)
    box(c, x + w * 0.43 - 10 + i * 3, y + 29, 1, 2, "#aaa99a");
  box(c, x + w * 0.43 + 16, y + 29, 4, 5, "#dedbc9");
  if (x % 3 !== 0) {
    ellipse(c, x + w - 12, y + h - 10, 4, 2, "#697445");
    box(c, x + w - 15, y + h - 16, 6, 7, "#bfc393");
    box(c, x + w - 14, y + h - 16, 4, 2, "#f4edc7");
  } else {
    box(c, x + w - 20, y + 10, 13, 18, "#ece4cd");
    box(c, x + w - 18, y + 12, 9, 1, "#aaa68c");
  }
}
export function person(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: number,
  hero = false,
  step = 0,
  facing = "down",
) {
  const ink = "#2f3439",
    hair = ["#43332d", "#292d36", "#796047", "#a4a69a", "#5d3931"][style % 5],
    outfit = hero
      ? "#584e78"
      : ["#344553", "#7b4446", "#c9c2a4", "#384d60", "#34635e"][style % 5];
  const stride = step ? 2 : 0;
  poly(
    c,
    [
      [x - 5, y],
      [x + 4, y],
      [x + 17, y + 8],
      [x + 10, y + 9],
    ],
    "#263d3f40",
  );
  box(c, x - 7, y - 17, 14, 17, ink);
  box(c, x - 6, y - 16, 12, 13, outfit);
  box(c, x - 5, y - 1, 4, 4 + stride, ink);
  box(c, x + 2, y - 1, 4, 4 - stride, ink);
  box(c, x - 9, y - 14, 3, 11, "#d4a27e");
  box(c, x + 7, y - 14, 3, 11, "#d4a27e");
  if (hero) {
    box(c, x - 6, y - 16, 2, 13, "#b1a2c3");
    box(c, x + 4, y - 16, 2, 13, "#2e2943");
    box(c, x - 5, y - 3, 10, 2, "#c4ac70");
  }
  ellipse(c, x, y - 24, 9, 10, ink);
  ellipse(c, x, y - 24, 8, 9, "#ddb28e");
  box(c, x - 8, y - 31, 16, 7, hair);
  box(c, x - 6, y - 33, 11, 3, hair);
  box(c, x - 9, y - 29, 3, 8, hair);
  if (facing === "up") {
    ellipse(c, x, y - 25, 8, 8, hair);
  } else {
    box(c, x - 4, y - 24, 2, 2, "#393632");
    box(c, x + 3, y - 24, 2, 2, "#393632");
    box(c, x - 1, y - 19, 3, 1, "#aa7762");
  }
  if (style % 5 === 3 && !hero) {
    box(c, x - 7, y - 25, 6, 4, "#6c736d");
    box(c, x + 1, y - 25, 6, 4, "#6c736d");
    box(c, x - 1, y - 24, 2, 1, "#6c736d");
  }
  if (style % 5 === 1 && !hero) {
    box(c, x - 9, y - 22, 3, 12, hair);
    box(c, x + 7, y - 23, 3, 11, hair);
  }
}
export function makeOffice() {
  const canvas = document.createElement("canvas");
  canvas.width = OFFICE_W * 2;
  canvas.height = OFFICE_H * 2;
  const c = canvas.getContext("2d")!;
  c.scale(2, 2);
  c.imageSmoothingEnabled = false;
  box(c, 0, 0, OFFICE_W, OFFICE_H, "#25383b");
  box(c, 8, 22, 944, 592, "#181f2166");
  box(c, 18, 46, 922, 550, "#8f9b7f");
  const floor = c.createLinearGradient(0, 40, 960, 624);
  floor.addColorStop(0, "#a8af91");
  floor.addColorStop(1, "#7c8c76");
  c.fillStyle = floor;
  c.fillRect(20, 46, 920, 550);
  for (let y = 48; y < 596; y += 26)
    for (let x = 20; x < 940; x += 26) {
      box(c, x, y, 26, 1, "#465d4820");
      box(c, x, y, 1, 26, "#d0c9a414");
      if ((x * 3 + y) % 7 === 0) box(c, x + 5, y + 8, 1, 1, "#c2c3a1");
    }
  // Sunlight enters the high windows, casting long bands across the floor.
  for (const x of [65, 300, 425]) {
    poly(
      c,
      [
        [x, 48],
        [x + 53, 48],
        [x + 245, 596],
        [x + 165, 596],
      ],
      "#f5edbc1b",
    );
    poly(
      c,
      [
        [x + 25, 48],
        [x + 29, 48],
        [x + 209, 596],
        [x + 203, 596],
      ],
      "#3f594513",
    );
  }
  for (const b of [...objects, ...walls])
    poly(
      c,
      [
        [b.x + 4, b.y + b.h],
        [b.x + b.w, b.y + b.h],
        [b.x + b.w + 39, b.y + b.h + 38],
        [b.x + 32, b.y + b.h + 38],
      ],
      "#2a393425",
    );
  for (const chair of chairs) {
    ellipse(
      c,
      chair.x + chair.w / 2 + 3,
      chair.y + chair.h,
      11,
      4,
      "#3e493d44",
    );
    box(c, chair.x + 4, chair.y + 8, 3, chair.h, "#5b503b");
    box(c, chair.x + chair.w - 7, chair.y + 8, 3, chair.h, "#5b503b");
    ellipse(c, chair.x + chair.w / 2, chair.y + 8, chair.w / 2, 8, "#4e5b3d");
    ellipse(
      c,
      chair.x + chair.w / 2,
      chair.y + 6,
      chair.w / 2 - 1,
      7,
      "#a4a66a",
    );
    box(c, chair.x + 2, chair.y - 3, chair.w - 4, 7, "#737c4b");
    box(c, chair.x + 3, chair.y - 3, chair.w - 6, 2, "#b8b98a");
  }
  for (const o of objects) {
    const { x, y, w, h } = o;
    if (o.kind === "desk") desk(c, o);
    if (o.kind === "meeting" || o.kind === "table") {
      box(c, x + 8, y + h - 2, 5, 12, "#6e5639");
      box(c, x + w - 13, y + h - 2, 5, 12, "#6e5639");
      box(c, x - 1, y - 1, w + 2, h + 5, "#755735");
      box(c, x, y, w, h, "#c4965c");
      box(c, x + 2, y + 2, w - 4, h - 6, "#d7ac72");
      for (let i = 0; i < 6; i++)
        box(c, x + 4, y + 7 + i * 9, w - 8, 1, "#a4784428");
      plant(c, x + 15, y + h / 2 + 4);
      if (o.kind === "meeting") {
        box(c, x + w - 25, y + 12, 16, 24, "#f1e7d0");
        box(c, x + w - 23, y + 14, 12, 1, "#898b7c");
      }
    }
    if (o.kind === "plant") plant(c, x + w / 2, y + 8);
    if (o.kind === "vending") {
      box(c, x + 2, y + 3, w, h, "#4e5747");
      box(c, x, y, w, h, "#d1c598");
      box(c, x + 4, y + 4, w - 8, h - 19, "#687969");
      box(c, x + 7, y + 7, w - 14, h - 26, "#253b3f");
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 4; col++) {
          box(
            c,
            x + 9 + col * 6,
            y + 11 + row * 13,
            4,
            8,
            ["#b4b986", "#d3a268", "#8cb2af"][col % 3],
          );
          box(c, x + 9 + col * 6, y + 11 + row * 13, 4, 1, "#dfe0b6");
        }
      box(c, x + 10, y + h - 13, 22, 5, "#354443");
    }
    if (o.kind === "water") {
      box(c, x + 3, y + 8, w - 6, h - 8, "#d4d8c8");
      ellipse(c, x + w / 2, y + 5, 8, 5, "#9bb9bf");
      box(c, x + 4, y - 7, 16, 13, "#8caeb9");
      ellipse(c, x + 12, y - 7, 8, 4, "#c6d7d1");
      box(c, x + 7, y + 18, 10, 13, "#4e6568");
      box(c, x + 9, y + 19, 2, 3, "#9c5854");
    }
    if (o.kind === "kitchen") {
      box(c, x, y, w, h, "#6e5f47");
      box(c, x + 1, y + 8, w - 2, h - 10, "#b69c72");
      box(c, x, y, w, 10, "#dfd7bc");
      for (let i = 1; i < 5; i++) {
        box(c, x + i * 30, y + 11, 1, h - 14, "#7d7157");
        box(c, x + i * 30 - 7, y + 16, 4, 2, "#d9cfaa");
      }
      box(c, x + 68, y + 1, 34, 8, "#788f8c");
      box(c, x + 71, y + 2, 28, 5, "#b5c5b9");
      box(c, x + 86, y - 8, 2, 10, "#bdc5b5");
      box(c, x + 6, y - 17, 21, 24, "#444f4c");
      box(c, x + 9, y - 14, 15, 11, "#7c8981");
      ellipse(c, x + 17, y + 1, 6, 4, "#b4a27e");
      box(c, x + 117, y - 17, 30, 24, "#7c866f");
      box(c, x + 120, y - 14, 24, 16, "#bdccb5");
    }
  }
  // Tall walls: floor footprint stays aligned with collision; the wall rises above it.
  for (const w of walls) {
    box(c, w.x + 2, w.y + 5, w.w, w.h, "#64634d");
    box(c, w.x, w.y - 14, w.w, w.h + 12, "#bbaa85");
    box(c, w.x, w.y - 14, w.w, 5, "#f1e4c4");
    box(c, w.x, w.y - 9, w.w, w.h - 3, "#ddceb0");
    box(c, w.x, w.y + w.h - 3, w.w, 3, "#8d7c5e");
    if (w.w < 20) {
      box(c, w.x + w.w - 3, w.y - 9, 3, w.h + 6, "#a59473");
    }
  }
  for (const x of [64, 288, 404]) {
    box(c, x, 22, 57, 22, "#716d5a");
    box(c, x + 3, 24, 51, 17, "#e5e8ce");
    box(c, x + 5, 25, 22, 13, "#9fb9b4");
    box(c, x + 30, 25, 22, 13, "#9ab4b0");
    box(c, x + 8, 25, 4, 13, "#d6e3ce");
  }
  ellipse(c, 38, 31, 9, 9, "#736e55");
  ellipse(c, 38, 31, 7, 7, "#e8dfbc");
  box(c, 38, 26, 1, 6, "#736e55");
  box(c, 38, 31, 4, 1, "#736e55");
  box(c, 475, 595, 50, 12, "#9e956f");
  box(c, 477, 598, 46, 6, "#ccbe95");
  box(c, 483, 574, 34, 16, "#b8b28d");
  c.font = "10px sans-serif";
  c.textAlign = "center";
  c.fillStyle = "#e4e8d5";
  c.fillText("ENTRANCE", 500, 616);
  return canvas;
}
export function paintCoworkers(c: CanvasRenderingContext2D) {
  for (const p of coworkers) person(c, p.x, p.y, p.style, false, 0, "up");
  person(c, 188, 120, 5);
  person(c, 865, 172, 6);
}
