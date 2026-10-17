import { Life, defaults, type Activity, type LifeData } from "./life.ts";
import { World } from "./state.ts";
import {
  maps,
  outdoors,
  isBlocked,
  TERRAIN_VERSION,
  safePosition,
  type MapId,
  type OutdoorId,
} from "./maps.ts";
import type { Direction } from "./constants.ts";

export type Species =
  "rat" | "slime" | "fowl" | "dog" | "goblin" | "lizard" | "wolf" | "dragon";
export const species = {
  rat: {
    name: "野ネズミ",
    hp: 18,
    atk: 8,
    def: 2,
    spd: 4,
    cooldown: 1.8,
    drop: "小さな皮",
  },
  slime: {
    name: "森スライム",
    hp: 24,
    atk: 10,
    def: 3,
    spd: 2,
    cooldown: 3.8,
    drop: "粘液",
  },
  dog: {
    name: "野犬",
    hp: 42,
    atk: 17,
    def: 5,
    spd: 10,
    cooldown: 2.4,
    drop: "獣肉",
  },
  goblin: {
    name: "ゴブリン",
    hp: 65,
    atk: 23,
    def: 9,
    spd: 8,
    cooldown: 2.7,
    drop: "鉄くず",
  },
  lizard: {
    name: "湿地トカゲ",
    hp: 78,
    atk: 27,
    def: 12,
    spd: 6,
    cooldown: 3,
    drop: "鱗",
  },
  wolf: {
    name: "山狼",
    hp: 115,
    atk: 36,
    def: 15,
    spd: 15,
    cooldown: 2,
    drop: "上質な皮",
  },
  dragon: {
    name: "古竜の影",
    hp: 300,
    atk: 48,
    def: 22,
    spd: 12,
    cooldown: 3.8,
    drop: "魔力結晶",
  },
  fowl: {
    name: "家禽（模擬戦）",
    hp: 16,
    atk: 4,
    def: 1,
    spd: 2,
    cooldown: 3,
    drop: "",
  },
} as const;
export interface Enemy {
  id: string;
  kind: Species;
  x: number;
  y: number;
  hp: number;
  respawnAt: number;
  heading: number;
  aiTimer: number;
  mapId?: OutdoorId;
  spawnX?: number;
  spawnY?: number;
  state?: "wander" | "alert" | "chase" | "return" | "flee";
}
export interface Battle {
  enemyId: string;
  attackTimer: number;
  inputTimer: number;
  defending: boolean;
  elapsed: number;
  members: string[];
  timers: Record<string, number>;
}
export interface Story {
  rescued: boolean;
  gathered: boolean;
  trained: boolean;
  wedge: boolean;
}
export interface Snapshot {
  version: 2;
  terrainVersion?: number;
  activity: Activity;
  life: LifeData;
  rngSeed: number;
  clock: number;
  escapeGrace: number;
  mapId: MapId;
  x: number;
  y: number;
  facing: Direction;
  hp: number;
  mp: number;
  enemies: Enemy[];
  inventory: Record<string, number>;
  story: Story;
}
export type Command = "attack" | "defend" | "escape";
const initialEnemies = (): Enemy[] =>
  Array.from({ length: 6 }, (_, i) => ({
    id: `enemy-${i}`,
    kind: i % 2 ? "slime" : "rat",
    x: (i % 2 ? 38 : 34) * 16 + 8,
    y: (50 - i * 6) * 16 + 8,
    hp: i % 2 ? 24 : 18,
    respawnAt: 0,
    heading: 0,
    aiTimer: 0,
  }));
export class Session {
  life = new Life(this);
  world = new World();
  clock = 8 * 3600;
  rngSeed = 0x4137ac;
  hp = 120;
  mp = 160;
  inventory: Record<string, number> = {};
  story: Story = {
    rescued: false,
    gathered: false,
    trained: false,
    wedge: false,
  };
  enemies = initialEnemies();
  battle: Battle | null = null;
  screen: "title" | "field" | "dead" = "title";
  message = "";
  checkpoint: Snapshot;
  gathering = 0;
  private escapeGrace = 0;
  constructor() {
    for (const map of outdoors.filter(
      (m) => !["VIL", "GRASS"].includes(m.id),
    )) {
      for (let i = 0; i < 6; i++) {
        const kinds: Species[] =
          map.id === "SFOREST"
            ? ["dog", "slime"]
            : map.id === "CFOREST"
              ? ["dog", "goblin", "lizard"]
              : map.id === "WEST"
                ? ["goblin"]
                : map.id === "EAST"
                  ? ["lizard"]
                  : ["wolf"];
        const kind = kinds[i % kinds.length],
          x = (map.width / 2 + 4 + (i % 3)) * 16 + 8,
          y = (map.height / 2 - 10 + Math.floor(i / 3) * 16) * 16 + 8;
        this.enemies.push({
          id: `${map.id}-${i}`,
          mapId: map.id as OutdoorId,
          kind,
          x,
          y,
          hp: species[kind].hp,
          heading: 0,
          aiTimer: 0,
          respawnAt: 0,
          spawnX: x,
          spawnY: y,
        });
      }
    }
    this.enemies.push({
      id: "dragon",
      mapId: "NORTH",
      kind: "dragon",
      x: maps.NORTH.width * 8 + 80,
      y: 13 * 16,
      hp: 300,
      heading: 0,
      aiTimer: 0,
      respawnAt: 0,
    });
    for (const e of this.enemies) {
      const pos = safePosition(maps[e.mapId || "GRASS"], e.x, e.y);
      if (pos) {
        e.x = pos.x;
        e.y = pos.y;
        if (e.spawnX !== undefined) {
          e.spawnX = pos.x;
          e.spawnY = pos.y;
        }
      }
    }
    this.checkpoint = this.snapshot();
  }
  get activeEnemies() {
    return this.enemies.filter(
      (e) => e.kind === "fowl" || (e.mapId || "GRASS") === this.world.mapId,
    );
  }
  advance(seconds: number, sleeping = false) {
    const from = this.clock;
    this.clock += seconds;
    this.life.advance(from, this.clock, sleeping);
  }

  random() {
    this.rngSeed = (Math.imul(1664525, this.rngSeed) + 1013904223) >>> 0;
    return this.rngSeed / 4294967296;
  }
  get timeLabel() {
    const total = Math.floor(this.clock / 60);
    return `DAY ${Math.floor(total / 1440) + 1} ${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
  get enemy() {
    return this.battle
      ? this.enemies.find((e) => e.id === this.battle!.enemyId)
      : undefined;
  }
  start() {
    this.screen = "field";
    this.message =
      "声を奪われ、南海岸へ漂着した。流木を手に取ると、無言のまま魔力が漏れた。近くの畜産家ダンを調べよう。";
  }
  update(seconds: number, held: ReadonlySet<Direction>, hidden = false) {
    if (this.screen !== "field" || hidden) return;
    const dt = Math.max(0, Math.min(seconds, 0.1));
    this.advance(dt * 10);
    if (this.screen !== "field") return;
    this.life.closeDistantConversation();
    this.life.reveal();
    this.life.updatePlay(dt);
    this.escapeGrace = Math.max(0, this.escapeGrace - dt);
    if (this.gathering > 0) {
      const progress = Math.min(dt, this.gathering);
      this.gathering -= progress;
      this.advance(progress * 140);
      if (this.gathering <= 0) {
        this.story.gathered = true;
        this.inventory["草"] = 1;
        this.message = "草を採った。ダンのところへ戻ろう。";
      }
      return;
    }
    if (this.life.action) {
      const elapsed = this.life.actionElapsed(dt);
      this.advance(Math.max(0, elapsed - dt * 10));
      if (this.screen !== "field") return;
      this.life.actionUpdate(dt);
      this.world.moving = false;
      this.updateEnemies(dt * Math.max(1, elapsed / Math.max(0.001, dt * 10)));
      return;
    }
    if (this.battle) {
      if (
        Math.floor((this.battle.elapsed + dt) / 30) >
          Math.floor(this.battle.elapsed / 30) &&
        this.battle.elapsed < 300
      )
        this.life.xp("hp", 1);
      this.world.moving = false;
      this.battle.elapsed += dt;
      this.battle.inputTimer = Math.max(0, this.battle.inputTimer - dt);
      for (const id of this.battle.members) {
        if (!this.battle) break;
        const e = this.enemies.find((e) => e.id === id);
        if (!e || e.hp <= 0) continue;
        this.battle.timers[id] -= dt;
        if (this.battle.timers[id] <= 0) {
          this.battle.timers[id] += species[e.kind].cooldown;
          this.enemyAttack(e);
        }
      }
      return;
    }
    if (this.life.play) this.world.mode = "walk";
    this.world.update(
      dt,
      held,
      this.life.play ? 1 : 1 + this.life.stat("spd") / 100,
    );
    this.updateEnemies(dt);
  }
  private updateEnemies(dt: number) {
    if (this.world.map.interior || this.world.mapId === "VIL") return;
    const w = this.world;
    for (const e of this.activeEnemies) {
      if (e.kind === "fowl") continue;
      if (e.hp <= 0) {
        if (this.clock < e.respawnAt) continue;
        e.hp = species[e.kind].hp;
        if (e.spawnX !== undefined) {
          e.x = e.spawnX;
          e.y = e.spawnY!;
        }
      }
      e.aiTimer -= dt;
      if (e.aiTimer <= 0) {
        e.heading = this.random() * Math.PI * 2;
        e.aiTimer = 1 + this.random() * 2;
      }
      const distance = Math.hypot(w.x - e.x, w.y - e.y);
      // Rats flee; slimes wander slowly. Neither sees across the map boundary.
      const visible = this.life.data.weather === "fog" ? 64 : 112,
        alert = w.mode === "run" ? 48 : w.mode === "sneak" ? -48 : 0,
        smell = ["dog", "wolf"].includes(e.kind)
          ? this.life.data.weather === "rain"
            ? 40
            : 80
          : 0;
      let sight = true;
      for (let n = 1; n < Math.ceil(distance / 16); n++) {
        const ratio = n / Math.ceil(distance / 16);
        if (
          isBlocked(
            w.map,
            Math.floor((e.x + (w.x - e.x) * ratio) / 16),
            Math.floor((e.y + (w.y - e.y) * ratio) / 16),
          )
        ) {
          sight = false;
          break;
        }
      }
      const homeDistance =
        e.spawnX === undefined
          ? 0
          : Math.hypot(e.x - e.spawnX, e.y - e.spawnY!);
      const aggressive =
        !["rat", "slime"].includes(e.kind) &&
        homeDistance < 192 &&
        ((distance < visible + alert && sight) || distance < smell);
      e.state =
        e.kind === "rat" && distance < 64
          ? "flee"
          : homeDistance > 192
            ? "return"
            : aggressive
              ? "chase"
              : distance < 144
                ? "alert"
                : "wander";
      const angle =
        e.state === "flee"
          ? Math.atan2(e.y - w.y, e.x - w.x)
          : e.state === "return"
            ? Math.atan2(e.spawnY! - e.y, e.spawnX! - e.x)
            : aggressive
              ? Math.atan2(w.y - e.y, w.x - e.x)
              : e.heading;
      const speed =
        e.kind === "rat" ? 18 : e.kind === "slime" ? 7 : aggressive ? 32 : 12;
      const nx = e.x + Math.cos(angle) * speed * dt,
        ny = e.y + Math.sin(angle) * speed * dt;
      if (
        nx > 16 &&
        nx < (w.map.width - 1) * 16 &&
        ny > 16 &&
        ny < (w.map.height - 3) * 16 &&
        !isBlocked(w.map, Math.floor(nx / 16), Math.floor(ny / 16))
      ) {
        e.x = nx;
        e.y = ny;
      }
      if (this.escapeGrace === 0 && distance < 13) {
        this.life.cancelAction();
        this.life.interaction = null;
        this.beginBattle(e);
        break;
      }
    }
  }
  beginBattle(enemy: Enemy) {
    if (this.screen !== "field" || this.battle || enemy.hp <= 0) return;
    const members = [
      enemy,
      ...this.activeEnemies.filter(
        (e) =>
          e.id !== enemy.id &&
          e.kind === enemy.kind &&
          e.hp > 0 &&
          ["dog", "goblin", "wolf"].includes(e.kind) &&
          Math.hypot(e.x - enemy.x, e.y - enemy.y) < 64,
      ),
    ]
      .slice(0, 3)
      .map((e) => e.id);
    this.battle = {
      enemyId: enemy.id,
      attackTimer: species[enemy.kind].cooldown,
      inputTimer: 0,
      defending: false,
      elapsed: 0,
      members,
      timers: Object.fromEntries(
        members.map((id, i) => [
          id,
          species[this.enemies.find((e) => e.id === id)!.kind].cooldown +
            i * 0.3,
        ]),
      ),
    };
    this.message = `${species[enemy.kind].name}と遭遇した。選択中も敵は攻撃する。`;
  }
  get dangerMultiplier() {
    const danger =
      (
        {
          VIL: 1,
          GRASS: 1,
          SFOREST: 2,
          CFOREST: 3,
          WEST: 4,
          EAST: 4,
          MOUNT: 5,
          NORTH: 6,
        } as Record<string, number>
      )[this.world.mapId] || 1;
    return [1, 1.3, 1.8, 2.5, 3.4, 5][danger - 1];
  }
  private hit(
    atk: number,
    def: number,
    spd: number,
    targetSpd: number,
    accuracyPenalty = 0,
  ) {
    if (
      this.random() * 100 >=
      Math.min(95, Math.max(55, 85 + (spd - targetSpd) * 1.5)) - accuracyPenalty
    )
      return 0;
    const critical = this.random() < 0.05 ? 1.6 : 1;
    return Math.max(
      1,
      Math.floor((atk * (0.85 + this.random() * 0.3) - def * 0.45) * critical),
    );
  }
  private enemyAttack(e: Enemy) {
    const s = species[e.kind];
    let damage = this.hit(
      s.atk,
      this.life.stat("def"),
      s.spd,
      this.life.stat("spd"),
      this.life.fatigue >= 15 ? -10 : 0,
    );
    const armor = ["body", "shield"]
      .map((slot) =>
        this.life.data.gear.find(
          (g) => g.id === this.life.data.equipment[slot],
        ),
      )
      .filter((g) => g !== undefined);
    if (armor.some((g) => g.element && g.elementUntil > this.clock))
      damage = Math.ceil(damage * 0.75);
    if (this.battle!.defending) {
      damage = Math.ceil(damage * 0.5);
      this.battle!.defending = false;
    }
    const ironWall =
      damage > 0 &&
      this.random() < (this.life.data.equipment.shield ? 0.06 : 0.04);
    if (ironWall) damage = Math.ceil(damage * 0.5);
    for (const slot of ["head", "body", "shield"])
      if (
        damage &&
        this.random() < (slot === "shield" ? 0.15 : 0.1) &&
        this.life.data.equipment[slot]
      )
        this.life.wear(this.life.data.equipment[slot]);
    if (damage && armor.some((g) => g.enhancedUntil > this.clock))
      this.life.xp("magic", this.dangerMultiplier);
    this.hp = Math.max(0, this.hp - damage);
    this.message = damage
      ? `${s.name}の攻撃。${damage}ダメージ。${ironWall ? "鉄壁の守りが発動。" : ""}`
      : `${s.name}の攻撃をかわした。`;
    if (!this.hp) {
      if (e.kind === "fowl") {
        this.hp = this.life.maxHp;
        this.finishTraining();
        this.message = "気絶した。ダンに介抱された。模擬戦はこれで終わりだ。";
      } else {
        this.battle = null;
        this.screen = "dead";
        this.message =
          "命が尽きた。魂を戻すと、最後の保存時点へすべて巻き戻る。";
      }
    }
  }
  command(command: Command) {
    if (!this.battle || this.battle.inputTimer > 0 || this.screen !== "field")
      return false;
    this.battle.inputTimer = 0.4;
    const e = this.enemy!,
      s = species[e.kind];
    if (command === "defend") {
      this.battle.defending = true;
      this.message = "次の敵の攻撃を半減する。";
      return true;
    }
    if (command === "escape") {
      const chance = Math.min(
        90,
        Math.max(
          20,
          60 +
            (this.life.stat("spd") - s.spd) * 2 +
            (e.kind === "rat" ? 10 : 0),
        ),
      );
      if (this.random() * 100 < chance) {
        if (e.kind === "fowl") this.finishTraining();
        else this.battle = null;
        this.escapeGrace = 3;
        this.message = "距離をとって離脱した。";
      } else this.message = "逃げきれなかった。";
      return true;
    }
    let damage = this.hit(
      this.life.stat("atk"),
      s.def,
      this.life.stat("spd"),
      s.spd,
      this.life.fatigue,
    );
    const weapon = this.life.data.gear.find(
      (g) => g.id === this.life.data.equipment.weapon,
    );
    if (damage && weapon?.element && weapon.elementUntil > this.clock)
      damage = Math.max(
        1,
        Math.floor(
          damage *
            (e.kind === "slime" && weapon.element === "fire"
              ? 1.3
              : e.kind === "lizard" && weapon.element === "water"
                ? 0.7
                : 1),
        ),
      );
    if (damage) {
      this.life.xp("sword", 2 * this.dangerMultiplier);
      if (weapon) {
        if (weapon.enhancedUntil > this.clock)
          this.life.xp("magic", this.dangerMultiplier);
        this.life.wear(weapon.id);
      }
    }
    e.hp = Math.max(0, e.hp - damage);
    this.message = damage ? `${s.name}に${damage}ダメージ。` : "攻撃が外れた。";
    if (!e.hp) {
      if (e.kind === "fowl") {
        this.finishTraining();
      } else {
        e.respawnAt = this.clock + (30 + Math.floor(this.random() * 61)) * 60;
        this.life.gain(s.drop, e.kind === "dragon" ? 3 : 1);
        const remaining = this.battle!.members.filter(
          (id) => id !== e.id && this.enemies.find((e) => e.id === id)!.hp > 0,
        );
        if (remaining.length && this.random() > 0.5)
          this.battle!.enemyId = remaining[0];
        else {
          for (const id of remaining) {
            const mate = this.enemies.find((e) => e.id === id)!;
            mate.state = "flee";
            mate.heading = Math.atan2(
              mate.y - this.world.y,
              mate.x - this.world.x,
            );
          }
          this.battle = null;
          this.escapeGrace = 3;
        }
        this.message = `${s.name}を倒し、${s.drop}を手に入れた。銅貨は落とさない。`;
      }
    }
    return true;
  }
  private finishTraining() {
    this.battle = null;
    this.story.trained = true;
    this.enemies = this.enemies.filter((e) => e.kind !== "fowl");
    this.message = "家禽との一度きりの模擬戦を終えた。村長ロアンに報告しよう。";
  }
  get objective() {
    return !this.story.rescued
      ? "浜辺のダンに話しかける"
      : !this.story.gathered
        ? "村の薬草畑の草を採る"
        : !this.story.trained
          ? "ダンに戻り、家禽の模擬戦へ"
          : !this.story.wedge
            ? "村長ロアンに報告する"
            : "草原へ探索に出よう。メニューから魂の楔で保存できる。";
  }
  interact() {
    if (
      this.screen !== "field" ||
      this.battle ||
      this.gathering > 0 ||
      this.life.action ||
      this.world.transitioning
    )
      return;
    const w = this.world,
      near = (x: number, y: number) =>
        Math.hypot(w.x - x * 16 - 8, w.y - y * 16 - 8) < 36;
    if (w.mapId === "VIL" && !this.story.wedge) {
      const dan = this.story.rescued ? { x: 16, y: 30 } : { x: 25, y: 34 };
      if (near(dan.x, dan.y)) {
        if (!this.story.rescued) {
          this.story.rescued = true;
          this.inventory["紙とペン"] = 1;
          this.message =
            "ダン「声が出ないのか。紙とペンを渡そう。これで筆談するといい。家畜小屋を貸そう。まずは道沿いの草を採ってみなさい」";
        } else if (!this.story.gathered)
          this.message = "ダン「小屋の東、道沿いの草を調べてみなさい」";
        else if (!this.story.trained) {
          const e: Enemy = {
            id: "training",
            kind: "fowl",
            x: w.x + 16,
            y: w.y,
            hp: 16,
            respawnAt: 0,
            heading: 0,
            aiTimer: 0,
          };
          this.enemies.push(e);
          this.beginBattle(e);
        } else this.message = "ダン「村長に居住の許可をもらっておいで」";
        return;
      }
      if (near(24, 30)) {
        if (!this.story.rescued)
          this.message = "まず近くのダンに声の代わりに身振りで話しかけよう。";
        else if (!this.story.gathered) {
          this.gathering = 2;
          this.message = "安全な村の草を採っている…（ゲーム内5分）";
        } else this.message = "草は採取済みだ。";
        return;
      }
      if (near(29, 17)) {
        if (!this.story.trained) {
          this.message = "ロアン「まずダンに島の暮らしを教わるといい」";
        } else if (!this.story.wedge) {
          this.story.wedge = true;
          this.inventory["魔法の袋"] = 1;
          this.inventory["魂の楔"] = 1;
          this.message =
            "ロアン「居住を認めよう。魔法の袋と魂の楔を授ける。楔で保存すれば、死んでも保存した時点へ戻れる」";
        } else
          this.message = "ロアン「草原へ行くなら、魂の楔で保存を忘れずに」";
        return;
      }
    }
    if (!this.life.nearest()) this.message = this.objective;
  }
  snapshot(): Snapshot {
    return structuredClone({
      version: 2,
      terrainVersion: TERRAIN_VERSION,
      activity: this.life.snapshotActivity(),
      life: this.life.data,
      rngSeed: this.rngSeed,
      clock: this.clock,
      escapeGrace: this.escapeGrace,
      mapId: this.world.mapId,
      x: this.world.x,
      y: this.world.y,
      facing: this.world.facing,
      hp: this.hp,
      mp: this.mp,
      enemies: this.enemies,
      inventory: this.inventory,
      story: this.story,
    });
  }
  restore(s: Snapshot) {
    this.life = new Life(this);
    this.life.data = structuredClone(s.life || defaults());
    this.life.restoreActivity(s.activity);
    this.world.reset();
    this.world.mapId = s.mapId;
    this.world.x = s.x;
    this.world.y = s.y;
    this.world.facing = s.facing;
    this.clock = s.clock;
    this.rngSeed = s.rngSeed;
    this.hp = s.hp;
    this.mp = s.mp;
    this.inventory = structuredClone(s.inventory);
    this.story = structuredClone(s.story);
    this.enemies = structuredClone(s.enemies);
    this.battle = null;
    this.gathering = 0;
    this.escapeGrace = s.escapeGrace;
    this.screen = "field";
    this.message = "保存時点へ戻った。";
  }
}
