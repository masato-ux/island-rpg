import { people } from "./data.ts";
import { WIDTH, HEIGHT, TILE } from "./constants.ts";
import { tileAt } from "./maps.ts";
import { species, type Session } from "./session.ts";
import { World } from "./state.ts";
export class Renderer {
  constructor(private ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = false;
  }
  draw(world: World, session?: Session) {
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
    rect(0, 0, WIDTH, HEIGHT, world.map.interior ? "#283a32" : "#4c9ba9");
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
        if (tile === "water") {
          if (world.map.interior) continue;
          if ((x + y) % 3 === 0) rect(px + 3, py + 7, 8, 1, "#7ac0be");
          continue;
        }
        rect(
          px,
          py,
          TILE,
          TILE,
          tile === "sand"
            ? "#e3ce91"
            : tile === "floor"
              ? "#b3a17e"
              : tile === "wet"
                ? "#708e78"
                : tile === "path"
                  ? "#c3b37c"
                  : (x + y) % 3
                    ? "#96ad63"
                    : "#8fa65d",
        );
        if (tile === "grass" && (x * 7 + y * 3) % 5 === 0) {
          rect(px + 3, py + 6, 1, 3, "#698b50");
          rect(px + 5, py + 5, 1, 4, "#698b50");
        }
        if (tile === "tree") {
          rect(px + 7, py + 7, 3, 8, "#766144");
          rect(px + 1, py, 14, 11, "#426e4c");
          rect(px + 4, py - 4, 9, 12, "#528350");
          rect(px + 5, py - 2, 4, 5, "#69964f");
        }
        if (tile === "rock") {
          rect(px + 2, py + 3, 12, 11, "#7c8986");
          rect(px + 4, py + 1, 8, 7, "#a6aaa0");
        }
        if (tile === "house") {
          rect(px, py, 16, 16, "#b6a17b");
          rect(px, py, 16, 6, "#79584c");
          rect(px + 5, py + 9, 6, 6, "#3b5556");
        }
      }
    for (const b of world.map.buildings) {
      const bx = b.x * TILE - camX,
        by = b.y * TILE - camY,
        bw = b.w * TILE,
        bh = b.h * TILE;
      if (bx + bw < 0 || bx > WIDTH || by + bh < 0 || by > HEIGHT) continue;
      rect(bx + 2, by + 22, bw - 4, bh - 22, "#bda582");
      rect(bx + 2, by + bh - 5, bw - 4, 5, "#887455");
      for (let step = 0; step < 6; step++)
        rect(
          bx + 10 - step * 2,
          by + step * 4,
          bw - 20 + step * 4,
          4,
          step % 2 ? "#80604c" : "#967047",
        );
      rect(bx + bw / 2 - 5, by + bh - 18, 10, 18, "#65543e");
      rect(bx + 12, by + 32, 12, 10, "#567473");
      rect(bx + bw - 24, by + 32, 12, 10, "#567473");
      rect(bx + 17, by + 32, 2, 10, "#c4b38f");
      rect(bx + bw - 19, by + 32, 2, 10, "#c4b38f");
      ctx.font = "7px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff3ce";
      ctx.fillText(b.name, bx + bw / 2, by + 13);
    }
    if (session) {
      const label = (x: number, y: number, name: string, color: string) => {
        if (x < -20 || x > WIDTH + 20 || y < -20 || y > HEIGHT + 20) return;
        rect(x - 4, y - 8, 8, 9, color);
        rect(x - 3, y - 13, 6, 5, "#e5bb85");
        rect(x - 4, y + 1, 3, 3, "#41463d");
        rect(x + 1, y + 1, 3, 3, "#41463d");
        ctx.textAlign = "center";
        ctx.font = "7px sans-serif";
        ctx.fillStyle = "#fff8d8";
        ctx.fillText(name, x, y - 17);
      };
      if (world.mapId === "VIL" && !session.story.wedge) {
        const dan = session.story.rescued ? { x: 16, y: 30 } : { x: 25, y: 34 };
        label(dan.x * 16 + 8 - camX, dan.y * 16 + 8 - camY, "ダン", "#a06d4e");
        label(29 * 16 + 8 - camX, 17 * 16 + 8 - camY, "ロアン", "#687a9a");
        rect(
          24 * 16 + 2 - camX,
          30 * 16 + 4 - camY,
          12,
          8,
          session.story.gathered ? "#9b885d" : "#4d7850",
        );
        ctx.textAlign = "center";
        ctx.font = "7px sans-serif";
        ctx.fillStyle = "#f9efc9";
        ctx.fillText("草", 24 * 16 + 8 - camX, 30 * 16 - camY);
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
      if (world.map.interior) {
        rect(28 - camX, 26 - camY, 22, 30, "#c3bc90");
        rect(110 - camX, 24 - camY, 28, 18, "#896e54");
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
      if (["VIL", "SFOREST", "WEST", "EAST"].includes(world.mapId)) {
        const fx =
            world.mapId === "VIL"
              ? 34 * 16 + 8
              : world.mapId === "WEST"
                ? 8 * 16 + 8
                : world.map.width * 8 + 48,
          fy = world.mapId === "VIL" ? 35 * 16 + 8 : world.map.height * 8;
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
        if (enemy.kind === "slime") {
          rect(x - 7, y - 4, 14, 8, "#6cb7a3");
          rect(x - 4, y - 7, 8, 4, "#8fd3b5");
        } else {
          rect(
            x - 6,
            y - 4,
            12,
            7,
            enemy.kind === "rat" ? "#967e75" : "#efe3b4",
          );
          rect(x + 3, y - 8, 4, 5, "#a2877c");
        }
        rect(x - 3, y - 3, 1, 2, "#243e3b");
        rect(x + 2, y - 3, 1, 2, "#243e3b");
        if (session.battle?.enemyId === enemy.id) {
          ctx.textAlign = "center";
          ctx.font = "7px sans-serif";
          ctx.fillStyle = "#fff3ce";
          ctx.fillText(species[enemy.kind].name, x, y - 12);
        }
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
    rect(x - 6, y + 2, 12, 4, "#718450");
    rect(x - 4, y - 3, 8, 6, "#344e67");
    rect(x - 4, y + 3, 3, 3 + step, "#3d4141");
    rect(x + 1, y + 3, 3, 4 - step, "#3d4141");
    rect(x - 5, y - 9, 10, 7, "#edbe88");
    rect(x - 6, y - 12, 12, 4, "#684d39");
    rect(x - 4, y - 14, 8, 3, "#82603d");
    rect(x - 6, y - 3, 2, 5, "#dfac75");
    rect(
      x + 4,
      y -
        3 +
        (gesture === "手を振る"
          ? -4 + motion * 2
          : gesture === "指差す"
            ? -2
            : 0),
      gesture === "指差す" ? 4 : 2,
      5,
      "#dfac75",
    );
    rect(x - 4, y - 2, 8, 2, "#c7d3ab");
    if (world.facing === "up") {
      rect(x - 4, y - 8, 8, 4, "#684d39");
    } else if (world.facing === "down") {
      rect(x - 3, y - 7, 1, 2, "#35403c");
      rect(x + 2, y - 7, 1, 2, "#35403c");
    } else {
      rect(x + (world.facing === "left" ? -4 : 3), y - 7, 1, 2, "#35403c");
    }
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
