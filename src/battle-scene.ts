import { DepthArt } from "./depth-art.ts";
import { species, type Session } from "./session.ts";
import { biomeAt, isBlocked } from "./maps.ts";
export class BattleScene {
  private art: DepthArt;
  constructor(private c: CanvasRenderingContext2D) {
    c.setTransform(4, 0, 0, 4, 0, 0);
    c.imageSmoothingEnabled = false;
    this.art = new DepthArt(c);
  }
  draw(s: Session) {
    const c = this.c,
      b = s.battle;
    if (!b) return;
    const biome = biomeAt(
      s.world.map,
      Math.floor(s.world.x / 16),
      Math.floor(s.world.y / 16),
    );
    const cave = biome === "洞窟",
      night = s.clock % 86400 >= 19 * 3600 || s.clock % 86400 < 6 * 3600;
    c.fillStyle = cave ? "#202e3c" : night ? "#23364e" : "#668c99";
    c.fillRect(0, 0, 320, 120);
    c.fillStyle = cave ? "#394857" : night ? "#354d52" : "#8aa89c";
    c.beginPath();
    c.moveTo(0, 65);
    for (let x = 0; x <= 320; x += 20) c.lineTo(x, 45 + Math.sin(x / 37) * 12);
    c.lineTo(320, 120);
    c.lineTo(0, 120);
    c.fill();
    c.fillStyle = cave
      ? "#454d55"
      : biome === "沿岸"
        ? "#aeab7c"
        : biome === "沼地"
          ? "#4c6c60"
          : "#66845c";
    c.fillRect(0, 66, 320, 54);
    for (let i = 0; i < 95; i++) {
      c.fillStyle = i % 2 ? "rgba(207,213,163,.18)" : "rgba(21,43,35,.16)";
      c.fillRect((i * 47) % 320, 69 + ((i * 13) % 49), 2 + (i % 3), 0.5);
    }
    const members = b.members
      .map((id) => s.enemies.find((e) => e.id === id)!)
      .filter((e) => e.hp > 0);
    members.forEach((enemy, i) => {
      const x = 160 + (i - (members.length - 1) / 2) * 68,
        y = 88;
      c.save();
      c.translate(x, y);
      c.scale(
        enemy.kind === "dragon" ? 1.3 : 2,
        enemy.kind === "dragon" ? 1.3 : 2,
      );
      this.art.monster(0, 0, enemy.kind, b.elapsed);
      c.restore();
      if (b.enemyId === enemy.id) {
        c.fillStyle = "#f4da9b";
        c.beginPath();
        c.moveTo(x - 3, 101);
        c.lineTo(x + 3, 101);
        c.lineTo(x, 97);
        c.fill();
      }
      c.font = "6px sans-serif";
      c.fillStyle = "#fff1ce";
      c.textAlign = "center";
      c.fillText(species[enemy.kind].name, x, 112);
    });
    // These dots use the live field positions, including enemies still outside battle.
    c.fillStyle = "rgba(12,27,32,.8)";
    c.fillRect(253, 4, 63, 37);
    c.font = "5px sans-serif";
    c.textAlign = "left";
    c.fillStyle = "#d2dfbd";
    c.fillText("周辺の気配", 257, 11);
    for (let y = -3; y <= 3; y++)
      for (let x = -6; x <= 6; x++)
        if (
          isBlocked(
            s.world.map,
            Math.floor(s.world.x / 16) + x,
            Math.floor(s.world.y / 16) + y,
          )
        ) {
          c.fillStyle = "#526364";
          c.fillRect(284 + x * 4, 26 + y * 2, 3, 1);
        }
    for (const e of s.activeEnemies)
      if (e.hp > 0 && !b.members.includes(e.id)) {
        const dx = (e.x - s.world.x) / 4,
          dy = (e.y - s.world.y) / 6;
        if (Math.abs(dx) > 28 || Math.abs(dy) > 12) continue;
        c.fillStyle = "#dc9778";
        c.fillRect(284 + dx, 26 + dy, 1.5, 1.5);
      }
    c.fillStyle = "#e5daa1";
    c.fillRect(283, 25, 2, 2);
  }
}
