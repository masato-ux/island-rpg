/** One light source above-left. Project the opaque artwork onto the ground plane. */
const masks = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
export function castShadow(
  c: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  footX: number,
  footY: number,
) {
  let mask = masks.get(sprite);
  if (!mask) {
    mask = document.createElement("canvas");
    mask.width = sprite.width;
    mask.height = sprite.height;
    const m = mask.getContext("2d")!;
    m.drawImage(sprite, 0, 0);
    const pixels = m.getImageData(0, 0, mask.width, mask.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const opaque = pixels.data[i + 3] >= 200;
      pixels.data[i] = 24;
      pixels.data[i + 1] = 38;
      pixels.data[i + 2] = 43;
      pixels.data[i + 3] = opaque ? 255 : 0;
    }
    m.putImageData(pixels, 0, 0);
    masks.set(sprite, mask);
  }
  c.save();
  c.translate(x + footX, y + footY);
  c.globalAlpha *= 0.27;
  c.transform(1, 0, -0.65, -0.32, 0, 0);
  c.drawImage(mask, -footX, -footY, width, height);
  c.restore();
}
