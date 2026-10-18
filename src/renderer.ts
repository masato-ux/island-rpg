import { WorldProps } from "./world-props.ts";
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
  private props: WorldProps;
  private fishingTargets = new Map<
    string,
    { x: number; y: number } | undefined
  >();
  constructor(private ctx: CanvasRenderingContext2D) {
    ctx.setTransform(4, 0, 0, 4, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.art = new DepthArt(ctx);
    this.props = new WorldProps(ctx);
  }
  draw(world: World, session?: Session) {
    const shadows: (() => void)[] = [];
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
    rect(0, 0, WIDTH, HEIGHT, world.map.interior ? "#283a32" : "#6054da");
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
          shadows.push(() =>
            this.terrain.object(
              ctx,
              world.map,
              x,
              y,
              x * 16 - camX,
              y * 16 - camY,
              true,
            ),
          );
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
      shadows.push(() =>
        this.art.building(b, b.x * 16 - camX, b.y * 16 - camY, true),
      );
      add((b.y + b.h) * 16, () => {
        this.art.building(b, b.x * 16 - camX, b.y * 16 - camY);
        ctx.font = "7px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff3ce";
        ctx.fillText(b.name, (b.x + b.w / 2) * 16 - camX, b.y * 16 - 9 - camY);
      });
    }
    if (world.mapId === "GRASS")
      add(16 * 16, () => this.art.caveEntry(37.5 * 16 - camX, 16 * 16 - camY));
    for (const p of rooms[world.mapId]?.furniture || [])
      add(p.y + p.h, () => this.art.furniture(p, camX, camY));
    if (session) {
      const label = (x: number, y: number, name: string, color: string) => {
        if (x < -20 || x > WIDTH + 20 || y < -20 || y > HEIGHT + 20) return;
        shadows.push(() =>
          this.art.person(
            x,
            y,
            color,
            people.findIndex((p) => p.name === name) + 1,
            0,
            "down",
            true,
          ),
        );
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
        shadows.push(() =>
          this.props.resource(
            grass.x - camX,
            grass.y - camY,
            "草",
            session.story.gathered,
            true,
          ),
        );
        add(grass.y, () =>
          this.props.resource(
            grass.x - camX,
            grass.y - camY,
            "草",
            session.story.gathered,
          ),
        );
        ctx.textAlign = "center";
        ctx.font = "7px sans-serif";
        ctx.fillStyle = "#f9efc9";
        ctx.fillText("草", grass.x - camX, grass.y - 23 - camY);
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
          shadows.push(() =>
            this.props.resource(
              node.x - camX,
              node.y - camY,
              node.def.item,
              depleted,
              true,
            ),
          );
          add(node.y, () =>
            this.props.resource(
              node.x - camX,
              node.y - camY,
              node.def.item,
              depleted,
            ),
          );
        }
      const fishingSpot = session.life.fishingSpot();
      if (fishingSpot) {
        const fx = fishingSpot.x,
          fy = fishingSpot.y;
        const key = `${world.mapId}:${fx}:${fy}`;
        if (!this.fishingTargets.has(key)) {
          let target: { x: number; y: number } | undefined,
            distance = 64;
          for (
            let yy = Math.floor(fy / 16) - 4;
            yy <= Math.floor(fy / 16) + 4;
            yy++
          )
            for (
              let xx = Math.floor(fx / 16) - 4;
              xx <= Math.floor(fx / 16) + 4;
              xx++
            ) {
              if (
                xx < 0 ||
                yy < 0 ||
                xx >= world.map.width ||
                yy >= world.map.height
              )
                continue;
              if (!["water", "shallow"].includes(tileAt(world.map, xx, yy)))
                continue;
              const x = xx * 16 + 8,
                y = yy * 16 + 8,
                d = Math.hypot(x - fx, y - fy);
              if (d < distance) {
                distance = d;
                target = { x, y };
              }
            }
          this.fishingTargets.set(key, target);
        }
        const target = this.fishingTargets.get(key);
        shadows.push(() =>
          this.props.fishing(
            fx - camX,
            fy - camY,
            session.clock,
            undefined,
            true,
          ),
        );
        add(fy + 3, () =>
          this.props.fishing(
            fx - camX,
            fy - camY,
            session.clock,
            target ? { x: target.x - camX, y: target.y - camY } : undefined,
          ),
        );
        ctx.font = "7px sans-serif";
        ctx.fillStyle = "#fff3ce";
        ctx.textAlign = "center";
        ctx.fillText("釣り場", fx - camX, fy - 25 - camY);
      }
      const stake = session.life.data.stakes[world.mapId];
      if (stake) {
        shadows.push(() =>
          this.props.stake(stake.x - camX, stake.y - camY, session.clock, true),
        );
        add(stake.y, () =>
          this.props.stake(stake.x - camX, stake.y - camY, session.clock),
        );
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
        shadows.push(() =>
          this.art.monster(x, y, enemy.kind, session.clock, true),
        );
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
    shadows.push(() =>
      this.art.person(x, y, "#58778a", 0, step, world.facing, true),
    );
    add(world.y, () => {
      this.art.person(x, y, "#58778a", 0, step, world.facing);
      if (gesture === "手を振る" || gesture === "指差す")
        rect(x + 6, y - 10 + motion * 2, 2, 6, "#e2b58a");
    });
    {
      ctx.save();
      const hour = session ? (session.clock / 3600) % 24 : 12;
      ctx.globalAlpha =
        hour < 6 || hour >= 20 ? 0.2 : hour < 8 || hour >= 18 ? 0.65 : 1;
      if (
        session?.life.data.weather === "rain" ||
        session?.life.data.weather === "fog"
      )
        ctx.globalAlpha *= 0.5;
      if (world.map.interior) ctx.globalAlpha = 0.4;
      shadows.forEach((paint) => paint());
      ctx.restore();
    }
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
