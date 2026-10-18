/** Deliberately coarse pixels: a readable silhouette at the game's native size. */
export function paintHero(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  step: number,
  facing: string,
) {
  c.save();
  c.translate(x, y);
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  const ink = "#243039",
    hair = "#292e3a",
    lightHair = "#485363",
    skin = "#e8b58a",
    shade = "#bb7b60",
    coat = "#35586a",
    light = "#557f88";

  const stride = step ? (step % 2 ? 1 : -1) : 0;
  // Short travelling coat, separate boots and a sheathed blade.
  r(-5, -10, 10, 11, ink);
  r(-4, -9, 8, 8, coat);
  r(-4, -8, 2, 6, light);
  r(-4, -1, 3, 3 + stride, "#3b414b");
  r(1, -1, 3, 3 - stride, "#3b414b");
  r(-5, 1 + stride, 4, 2, ink);
  r(1, 1 - stride, 4, 2, ink);
  if (facing === "left" || facing === "right") {
    const direction = facing === "right" ? 1 : -1;
    c.scale(direction, 1);
    r(-5, -9, 3, 9, "#293e50");
    r(-4, -8, 1, 6, "#4a6878");
    r(-3, -21, 8, 11, ink);
    r(-2, -20, 7, 9, skin);
    r(4, -16, 2, 3, skin);
    r(0, -11, 4, 1, shade);
    r(-4, -22, 7, 4, hair);
    r(-5, -20, 4, 7, hair);
    r(-2, -20, 7, 2, hair);
    r(-3, -21, 4, 1, lightHair);
    r(3, -17, 2, 1, ink);
    r(4, -16, 1, 2, ink);
    r(-1, -15, 2, 2, shade);
    r(0, -15, 1, 1, skin);
    r(-2, -11, 7, 2, "#c28b61");
    r(1, -9, 3, 5, "#537888");
    r(2, -4, 2, 2, skin);
    r(1, -8, 3, 2, "#9eafb0");
  } else {
    // Angular chin and swept fringe replace the former round, cluttered face.
    r(-6, -20, 12, 8, ink);
    r(-5, -21, 10, 11, ink);
    r(-3, -10, 6, 1, ink);
    if (facing === "up") {
      r(-5, -20, 10, 9, hair);
      r(-4, -21, 7, 3, lightHair);
      r(-5, -18, 8, 5, hair);
      r(-3, -12, 6, 2, hair);
      r(-4, -10, 8, 2, "#b78b67");
      r(-3, -8, 6, 7, "#2f485b");
      r(-3, -8, 1, 6, "#54727d");
      r(2, -7, 1, 6, "#243848");
      r(-2, -1, 5, 1, "#71908f");
    } else {
      r(-5, -19, 10, 7, skin);
      r(-4, -12, 8, 2, skin);
      r(-2, -10, 4, 1, shade);
      r(-6, -16, 1, 3, shade);
      r(5, -16, 1, 3, shade);
      r(-3, -16, 2, 1, "#775b50");
      r(2, -16, 2, 1, "#775b50");
      r(-3, -15, 1, 2, ink);
      r(3, -15, 1, 2, ink);
      r(0, -13, 1, 1, shade);
      r(0, -11, 2, 1, "#986b58");
      r(-5, -22, 10, 3, hair);
      r(-3, -23, 6, 1, hair);
      r(-6, -20, 4, 4, hair);
      r(-3, -20, 4, 2, hair);
      r(1, -20, 4, 1, hair);
      r(4, -19, 1, 4, hair);
      r(-3, -22, 5, 1, lightHair);
      r(-5, -20, 3, 1, "#3b4655");
      r(-4, -10, 8, 2, "#c69b70");
      r(2, -8, 2, 4, "#ae7855");
      r(-3, -8, 1, 6, "#a17b55");
      r(-4, -3, 8, 1, "#513e36");
      r(0, -3, 2, 1, "#d2b57b");
      r(3, -8, 3, 2, "#acb9b7");
      r(4, -6, 2, 3, coat);
      r(-6, -7, 2, 4, coat);
      r(-6, -3, 2, 2, skin);
      r(4, -3, 2, 2, skin);
    }
    // One quiet accessory, kept away from the face.
    r(-7, -5, 1, 7, "#504a44");
    r(-8, -6, 3, 1, "#b9b8a0");
  }
  c.restore();
}
