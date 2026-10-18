import { DepthArt } from "./depth-art.ts";
import { rooms } from "./interiors.ts";
import { Terrain } from "./terrain.ts";
import { people } from "./data.ts";
import { WIDTH, HEIGHT, TILE } from "./constants.ts";
import { tileAt, villagePoint } from "./maps.ts";
import { species, type Session } from "./session.ts";
import { World } from "./state.ts";
export class Renderer {
  private terrain = new Terrain();
  private art: DepthArt;
  constructor(private ctx: CanvasRenderingContext2D) {
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.art = new DepthArt(ctx);
  }
  draw(world: World, session?: Session) {
    const layers: { y: number; paint: () => void }[] = [];
    const add = (y: number, paint: () => void) => layers.push({ y, paint });
    const ctx = this.ctx,
      rect = (x: number, y: number, w: number, h: number, c: string) => {
        ctx.fillStyle = c;
        ctx.fillRect(Math.round(x), Math.round(y), w, h);
      };
    const camX = world.map.interior
      ? (world.map.width * TILE - WIDTH) / 2
      : Math.max(
          0,
          Math.min(
            world.map.width * TILE - WIDTH,
            Math.round(world.x - WIDTH / 2),
          ),
        );
    const camY = world.map.interior
      ? (world.map.height * TILE - HEIGHT) / 2
      : Math.max(
          0,
          Math.min(
            world.map.height * TILE - HEIGHT,
            Math.round(world.y - HEIGHT / 2),
          ),
        );
    rect(0, 0, WIDTH, HEIGHT, world.map.interior ? "#283a32" : "#355678");
    // Only visible tiles are drawn, including one row above for tree crowns.
    for (
      let y = Math.floor(camY / TILE);
      y <= Math.ceil((camY + HEIGHT) / TILE);
      y++
    )
      for (
        let x = Math.floor(camX / TILE);
        x <= Math.ceil((camX + WIDTH) / TILE);
        x++
      ) {
        const px = x * TILE - camX,
          py = y * TILE - camY,
          tile = tileAt(world.map, x, y);
        if (world.map.interior) continue;
        this.terrain.ground(ctx, world.map, x, y, px, py, session?.clock || 0);
        if (
          tileAt(world.map, x, y - 1) === "cliff" &&
          tile !== "cliff" &&
          tile !== "stairs"
        ) {
          rect(px, py, 16, 3, "rgba(30,55,57,.22)");
          rect(px + 2, py + 3, 14, 2, "rgba(30,55,57,.09)");
        }
        if (tile === "house") {
          rect(px, py, 16, 16, "#b6a17b");
          rect(px, py, 16, 6, "#79584c");
          rect(px + 5, py + 9, 6, 6, "#3b5556");
        }
      }
    if (world.map.interior) this.art.room(world.mapId, camX, camY);
    for (
      let y = Math.floor(camY / TILE) - 1;
      y <= Math.ceil((camY + HEIGHT) / TILE) + 2;
      y++
    )
      for (
        let x = Math.floor(camX / TILE) - 1;
        x <= Math.ceil((camX + WIDTH) / TILE) + 1;
        x++
      ) {
        const tile = tileAt(world.map, x, y);
        if (tile === "tree" || tile === "rock") {
          if (tile === "tree")
            this.art.shadow(x * 16 + 8 - camX, y * 16 + 12 - camY, 22, 26);
          add(y * 16 + 12, () =>
            this.terrain.object(
              ctx,
              world.map,
              x,
              y,
              x * 16 - camX,
              y * 16 - camY,
            ),
          );
        } else
          this.terrain.object(
            ctx,
            world.map,
            x,
            y,
            x * 16 - camX,
            y * 16 - camY,
          );
      }
    for (const b of world.map.buildings) {
      if (
        (b.x + b.w) * 16 < camX ||
        b.x * 16 > camX + WIDTH ||
        (b.y + b.h) * 16 < camY ||
        b.y * 16 > camY + HEIGHT
      )
        continue;
      add((b.y + b.h) * 16, () => {
        this.art.building(b, b.x * 16 - camX, b.y * 16 - camY);
        ctx.font = "7px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff3ce";
        ctx.fillText(b.name, (b.x + b.w / 2) * 16 - camX, b.y * 16 - 9 - camY);
      });
    }
    for (const p of rooms[world.mapId]?.furniture || [])
      add(p.y + p.h, () => this.art.furniture(p, camX, camY));
    if (session) {
      const label = (x: number, y: number, name: string, color: string) => {
        if (x < -20 || x > WIDTH + 20 || y < -20 || y > HEIGHT + 20) return;
        add(y + camY, () => {
          this.art.person(
            x,
            y,
            color,
            people.findIndex((p) => p.name === name) + 1,
          );
          ctx.textAlign = "center";
          ctx.font = "7px sans-serif";
          ctx.fillStyle = "#fff8d8";
          ctx.fillText(name, x, y - 23);
        });
      };
      if (world.mapId === "VIL" && !session.story.wedge) {
        const dan = session.story.rescued ? { x: 16, y: 30 } : { x: 25, y: 34 };
        const d = villagePoint(dan.x * 16 + 8, dan.y * 16 + 8),
          chief = villagePoint(472, 280),
          grass = villagePoint(392, 488);
        label(d.x - camX, d.y - camY, "ダン", "#a06d4e");
        label(chief.x - camX, chief.y - camY, "ロアン", "#687a9a");
        rect(
          grass.x - 6 - camX,
          grass.y - 4 - camY,
          12,
          8,
          session.story.gathered ? "#9b885d" : "#4d7850",
        );
        ctx.textAlign = "center";
        ctx.font = "7px sans-serif";
        ctx.fillStyle = "#f9efc9";
        ctx.fillText("草", grass.x - camX, grass.y - 8 - camY);
      }
      if (session.story.wedge)
        for (const p of people) {
          const pos = session.life.position(p);
          if (
            pos.map === world.mapId &&
            !pos.sleeping &&
            !(
              session.life.play?.npc === p.id &&
              session.life.play.kind === "hide" &&
              (Math.hypot(pos.x - world.x, pos.y - world.y) > 96 ||
                !session.life.lineVisible(pos.x, pos.y))
            )
          )
            label(
              pos.x - camX,
              pos.y - camY,
              p.name,
              p.child ? "#b7a879" : "#a06d4e",
            );
        }
      if (session.story.wedge)
        for (const node of session.life.nodeList(world.mapId)) {
          const depleted = session.life.nodeState(node.id).left === 0;
          rect(
            node.x - 5 - camX,
            node.y - 5 - camY,
            10,
            7,
            depleted
              ? "#9b885d"
              : node.def.tool === "pick"
                ? "#89969b"
                : "#4d7850",
          );
        }
      const fishingSpot = session.life.fishingSpot();
      if (fishingSpot) {
        const fx = fishingSpot.x,
          fy = fishingSpot.y;
        rect(fx - 7 - camX, fy + 1 - camY, 14, 3, "#aa8a58");
        ctx.font = "7px sans-serif";
        ctx.fillStyle = "#fff3ce";
        ctx.textAlign = "center";
        ctx.fillText("釣り場", fx - camX, fy - 6 - camY);
      }
      const stake = session.life.data.stakes[world.mapId];
      if (stake) {
        rect(stake.x - 2 - camX, stake.y - 14 - camY, 4, 16, "#c7a866");
        rect(stake.x - 4 - camX, stake.y - 14 - camY, 8, 4, "#89c8c0");
      }
      if (world.mapId === "NORTH") {
        rect(
          world.map.width * 8 - 16 - camX,
          8 * 16 - 12 - camY,
          32,
          20,
          "#a0a4ad",
        );
      }
      for (const enemy of session.activeEnemies) {
        if (enemy.hp <= 0) continue;
        const x = enemy.x - camX,
          y = enemy.y - camY;
        if (x < -16 || x > WIDTH + 16 || y < -20 || y > HEIGHT + 20) continue;
        add(enemy.y, () => {
          this.art.monster(x, y, enemy.kind, session.clock);
          if (session.battle?.enemyId === enemy.id) {
            ctx.textAlign = "center";
            ctx.font = "7px sans-serif";
            ctx.fillStyle = "#fff3ce";
            ctx.fillText(species[enemy.kind].name, x, y - 23);
          }
        });
      }
    }
    const gesture =
        session?.life.gesture && session.life.gesture.until > session.clock
          ? session.life.gesture.kind
          : "",
      motion = session ? Math.floor(session.clock * 2) % 2 : 0;
    const x = world.x - camX + (gesture === "首を振る" ? (motion ? 1 : -1) : 0),
      y =
        world.y -
        camY +
        (["うなずく", "お辞儀"].includes(gesture) ? motion : 0),
      step = world.moving ? Math.floor(world.animation / 0.16) % 2 : 0;
    add(world.y, () => {
      this.art.person(x, y, "#58778a", 0, step, world.facing);
      if (gesture === "手を振る" || gesture === "指差す")
        rect(x + 6, y - 10 + motion * 2, 2, 6, "#e2b58a");
    });
    layers.sort((a, b) => a.y - b.y).forEach((layer) => layer.paint());
    if (session?.life.gesture && session.life.gesture.until > session.clock) {
      ctx.textAlign = "center";
      ctx.font = "7px sans-serif";
      ctx.fillStyle = "#fff3ce";
      ctx.fillText(session.life.gesture.kind, x, y - 20);
    }
    if (session?.life.data.weather === "rain" && !world.map.interior) {
      for (let i = 0; i < 20; i++)
        rect(
          (i * 37 + session.clock * 2) % WIDTH,
          (i * 29 + session.clock * 4) % HEIGHT,
          1,
          4,
          "#a2c2bd",
        );
    }
    if (session?.life.data.weather === "fog" && !world.map.interior) {
      ctx.fillStyle = "rgba(214,225,214,.16)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    if (world.fade > 0) {
      ctx.fillStyle = `rgba(20,47,50,${world.fade})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }
}
