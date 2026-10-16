import type { Session } from "./session.ts";
import { people, items, recipes, resources, type Slot } from "./data.ts";
import { maps, tileAt, outdoors, type MapId } from "./maps.ts";
import dialogues from "./data/dialogues.json" with { type: "json" };
function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
export class Interface {
  private getSession: () => Session;
  private signature = "";
  private tab = "bag";
  private view = "local";
  private filter = "all";
  private sale: Record<string, number> = {};
  private seller = "";
  constructor(getSession: () => Session) {
    this.getSession = getSession;
    document.addEventListener("click", (event) => {
      const b = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-life]",
      );
      if (!b || b.disabled) return;
      this.act(b.dataset.life!, b.dataset.id || "");
      this.signature = "";
      this.render();
    });
  }
  private button(
    parent: HTMLElement,
    label: string,
    action: string,
    id = "",
    disabled = false,
  ) {
    const button = element("button", label);
    button.dataset.life = action;
    button.dataset.id = id;
    button.disabled = disabled;
    parent.append(button);
    return button;
  }
  private paragraph(parent: HTMLElement, text: string) {
    parent.append(element("p", text));
  }
  private act(action: string, id: string) {
    const s = this.getSession(),
      l = s.life,
      d = l.data,
      p = people.find((p) => p.id === l.interaction?.id);
    if (action === "tab") {
      this.tab = id;
      this.sale = {};
      return;
    }
    if (action === "close") {
      l.interaction = null;
      l.pendingMemo = null;
      return;
    }
    if (action === "gesture") {
      l.gesture = { kind: id, until: s.clock + 20 };
      s.message = `${id}で気持ちを伝えた。`;
    }
    if (action === "topic") l.topic(p!.id, id);
    if (action === "memo") l.memo(id === "yes");
    if (action === "delete-note") l.removeNote(Number(id));
    if (action === "filter") this.filter = id;
    if (action === "offer") l.offer(p!.id);
    if (action === "accept") l.accept(p!.id);
    if (action === "deliver") l.deliver(p!.id);
    if (action === "decline") l.decline(p!.id);
    if (action === "gift") l.gift(p!.id, id);
    if (action === "play") l.playWith(p!.id, id as "tag" | "hide");
    if (action === "stop-play") l.play = null;
    if (action === "buy") l.buy(p!.id, id);
    if (action === "sale") {
      this.seller = p!.id;
      this.sale = {};
      this.tab = "sell";
      document.querySelector<HTMLElement>("#menu-panel")!.hidden = false;
      l.interaction = null;
    }
    if (action === "trial") {
      l.cookTrial(this.sale);
      this.sale = {};
    }
    if (action === "sell-confirm") {
      l.sell(this.seller, this.sale);
      this.sale = {};
    }
    if (action === "craft") l.craft(id);
    if (action === "collect") l.collectJob(Number(id));
    if (action === "cancel-job") l.cancelJob(Number(id));
    if (action === "equip") l.equip(id);
    if (action === "boost") l.boost(id);
    if (action === "element") {
      const [gear, type] = id.split("|");
      l.boost(gear, type as "fire" | "water" | "thunder");
    }
    if (action === "repair") l.repair(id);
    if (action === "eat") l.eat(id);
    if (action === "medicine") l.medicine(id);
    if (action === "enter") l.enter(id as MapId);
    if (action === "sleep") l.sleep(Number(id));
    if (action === "water") l.water();
    if (action === "leave") l.leave();
    if (action === "gather") {
      const [node, tool] = id.split("|");
      l.gather(node, tool || undefined);
    }
    if (action === "fish") {
      const [tool, bait] = id.split("|");
      l.fish(tool, bait);
    }
    if (action === "cancel-action") l.cancelAction();
    if (action === "place-stake") l.placeStake();
    if (action === "teleport") l.teleport(id);
    if (action === "ending") l.end(id as "released" | "silent");
    if (action === "map-view")
      this.view = this.view === "local" ? "island" : "local";
    if (action === "identify") l.identify(p!.id);
  }
  render() {
    const s = this.getSession(),
      l = s.life,
      d = l.data,
      interaction = document.querySelector<HTMLElement>("#interaction-panel")!,
      detail = document.querySelector<HTMLElement>("#detail")!,
      menu = document.querySelector<HTMLElement>("#menu-panel")!;
    const signature = JSON.stringify([
      menu.hidden,
      l.interaction,
      l.pendingMemo,
      !!l.action,
      !!l.play,
      menu.hidden,
      s.screen,
      s.battle?.enemyId,
      this.tab,
      this.view,
      this.filter,
      s.inventory,
      d.money,
      d.gear,
      d.social,
      d.known,
      s.hp,
      s.mp,
      d.equipment,
      d.notes,
      d.quests,
      d.jobs.map((j) => [j.id, j.state, Math.ceil(j.remaining)]),
      d.hunger.toFixed(0),
      d.cold,
      d.levels,
      d.ending,
      d.stakes,
      Math.floor(s.clock / 60),
    ]);
    if (signature === this.signature) return;
    this.signature = signature;
    const typing =
      document.activeElement instanceof HTMLInputElement &&
      interaction.contains(document.activeElement);
    if (typing) return;
    const focused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusAction = focused?.dataset.life;
    const focusId = focused?.dataset.id;
    const focusScope =
      focused && interaction.contains(focused)
        ? interaction
        : focused && detail.contains(focused)
          ? detail
          : null;
    const restoreFocus = () => {
      if (!focusScope || !focusAction) return;
      const target = [
        ...focusScope.querySelectorAll<HTMLElement>("[data-life]"),
      ].find(
        (el) =>
          el.dataset.life === focusAction &&
          el.dataset.id === focusId &&
          !(el instanceof HTMLButtonElement && el.disabled),
      );
      target?.focus({ preventScroll: true });
    };
    const expanded = new Set(
      [...interaction.querySelectorAll("details[open]")].map(
        (n) => n.querySelector("summary")?.textContent,
      ),
    );
    interaction.replaceChildren();
    interaction.hidden =
      s.screen !== "field" || (!l.interaction && !l.pendingMemo && !l.action);
    if (l.pendingMemo) {
      this.paragraph(interaction, "メモを取りますか？");
      this.button(interaction, "はい", "memo", "yes");
      this.button(interaction, "いいえ", "memo", "no");
    } else if (l.action) {
      this.paragraph(
        interaction,
        l.action.kind === "gather" ? "採集中…" : "釣り中…",
      );
      this.button(interaction, "中断する", "cancel-action");
    } else if (l.interaction) {
      const current = l.interaction;
      interaction.append(element("h2", current.title));
      this.paragraph(interaction, current.text);
      if (current.kind === "person") {
        const p = people.find((p) => p.id === current.id)!,
          social = d.social[p.id];
        for (const topic of l.availableTopics(p.id))
          this.button(
            interaction,
            topic.text.slice(0, 18) + "…",
            "topic",
            topic.id,
          );
        for (const gesture of [
          "うなずく",
          "首を振る",
          "指差す",
          "お辞儀",
          "手を振る",
          "首をかしげる",
        ])
          this.button(interaction, gesture, "gesture", gesture);
        if (p.child) {
          this.button(interaction, "鬼ごっこ", "play", "tag");
          this.button(interaction, "かくれんぼ", "play", "hide");
        } else {
          const quest = d.quests.find(
            (q) => q.giver === p.id && q.state === "accepted",
          );
          if (quest) {
            this.button(interaction, "依頼を再確認", "offer");
            this.button(interaction, "全量を納品", "deliver");
            this.button(interaction, "受諾済み依頼を辞退", "decline");
          } else {
            this.paragraph(
              interaction,
              `依頼：${p.quest} ×${p.quantity}／期限 ${l.date(l.deadline(p))}／${p.reward}銅貨`,
            );
            this.button(interaction, "依頼を受ける", "accept");
          }
        }
        const gift = element("details");
        gift.append(element("summary", "贈り物を選ぶ"));
        for (const [name, n] of Object.entries(s.inventory))
          if (n && items[name]?.category !== "key")
            this.button(gift, name, "gift", name, social.giftDay === l.day);
        interaction.append(gift);
        const home = maps.VIL.buildings.find((b) => b.interior === p.home);
        if (
          s.world.mapId === "VIL" &&
          home &&
          Math.hypot(
            s.world.x - (home.x + home.w / 2) * 16 - 8,
            s.world.y - (home.y + home.h) * 16 - 8,
          ) < 48
        )
          this.button(
            interaction,
            home.name + "に入る",
            "enter",
            home.interior,
          );
        if (p.shop) {
          this.paragraph(
            interaction,
            l.available(p)
              ? `営業中 ${p.open}–${p.close}時／所持 ${d.money}銅貨`
              : "営業時間外・会話と依頼報告のみ",
          );
          const shop = element("details");
          shop.append(element("summary", "商品・委託・受け取り"));
          for (const name of p.shop) {
            const item = items[name];
            this.button(
              shop,
              `${name} ${item.price}銅貨（残${d.stocks[`${p.id}:${name}`] ?? l.stock(name)}）`,
              "buy",
              name,
              !l.available(p),
            );
          }
          this.button(
            shop,
            "まとめて売る（確認画面へ）",
            "sale",
            "",
            !l.available(p),
          );
          for (const r of recipes.filter(
            (r) =>
              r.crafter === p.id &&
              (r.price < 100 ||
                social.trust >= 25 ||
                Object.keys(r.ingredients).some(
                  (name) =>
                    l.count(name) > 0 || d.known.includes(`seen-item:${name}`),
                )),
          )) {
            this.paragraph(
              shop,
              `${r.name}：${Object.entries(r.ingredients)
                .map(([name, n]) => `${name}×${n}`)
                .join(" ")} + ${r.price}銅貨／${r.minutes}分`,
            );
            this.button(shop, "委託する", "craft", r.id, !l.available(p));
          }
          for (const job of d.jobs.filter((j) => j.npc === p.id)) {
            this.paragraph(
              shop,
              `${job.result}：${job.state === "ready" ? "完成" : job.state === "queued" ? "未着手" : "作業中"}／残${Math.ceil(job.remaining)}分／予定${l.jobEstimate(p.id)}`,
            );
            if (job.state === "ready")
              this.button(
                shop,
                "受け取る",
                "collect",
                String(job.id),
                !l.available(p),
              );
            if (job.state === "queued")
              this.button(
                shop,
                "取消し・全額返却",
                "cancel-job",
                String(job.id),
                !l.available(p),
              );
          }
          if (p.id === "N10")
            for (const g of d.gear) {
              const quote = l.repairQuote(g.id);
              if (quote)
                this.button(
                  shop,
                  `${g.name}を修理（${quote.cost}銅貨＋${quote.material}1）`,
                  "repair",
                  g.id,
                  !l.available(p),
                );
            }
          if (["N01", "N10", "N11"].includes(p.id))
            this.button(shop, "全量を無料鑑定", "identify");
          interaction.append(shop);
        }
      }
      if (current.kind === "home") {
        for (let h = 1; h <= 7; h++)
          this.button(interaction, `${h}時間眠る`, "sleep", String(h));
        this.button(interaction, "飲み水をくむ", "water");
        for (const r of recipes.filter(
          (r) => r.crafter === "HOME" && d.known.includes(r.name),
        ))
          this.button(
            interaction,
            `${r.name}（${Object.entries(r.ingredients)
              .map(([k, n]) => `${k}×${n}`)
              .join(" ")}）`,
            "craft",
            r.id,
          );
        const trial = element("details");
        trial.append(element("summary", "材料を選んで試作する"));
        for (const [name, n] of Object.entries(s.inventory).filter(
          ([name]) => items[name]?.category === "material",
        )) {
          const row = element("label", l.displayName(name) + " "),
            input = element("input");
          input.type = "number";
          input.min = "0";
          input.max = String(n);
          input.value = String(this.sale[name] || 0);
          input.addEventListener("input", () => {
            const value = Math.floor(Number(input.value));
            this.sale[name] = Math.max(
              0,
              Math.min(n, Number.isFinite(value) ? value : 0),
            );
          });
          row.append(input);
          trial.append(row);
        }
        this.button(trial, "試作する", "trial");
        interaction.append(trial);
        this.button(interaction, "外へ出る", "leave");
      }
      if (current.kind === "resource") {
        const def = resources[Number(current.id.split(":")[1])];
        this.paragraph(
          interaction,
          `必要：${{ axe: "斧", pick: "ツルハシ", sickle: "鎌", rod: "釣り竿" }[def.tool || "axe"] && def.tool ? { axe: "斧", pick: "ツルハシ", sickle: "鎌", rod: "釣り竿" }[def.tool] : "手採り"} 段階${def.tier}／${def.minutes}分`,
        );
        if (!def.tool)
          this.button(interaction, "手で採る", "gather", current.id);
        for (const g of d.gear.filter((g) => items[g.name].tool === def.tool))
          this.button(
            interaction,
            g.name + "で採る",
            "gather",
            `${current.id}|${g.id}`,
          );
      }
      if (current.kind === "fishing") {
        const stock = l.fishStock(current.id);
        this.paragraph(
          interaction,
          stock.stock < 2 ? "魚影が薄い。" : "魚影が見える。",
        );
        for (const g of d.gear.filter((g) => items[g.name].tool === "rod"))
          for (const bait of ["ミミズ", "虫", "小魚", "エビ"])
            if (l.count(bait))
              this.button(
                interaction,
                `${g.name}＋${bait}`,
                "fish",
                `${g.id}|${bait}`,
              );
      }
      if (current.kind === "stake")
        for (const id of Object.keys(d.stakes))
          this.button(interaction, maps[id as MapId].name, "teleport", id);
      if (current.kind === "altar") {
        this.button(interaction, "呪いを解く", "ending", "released");
        this.button(interaction, "声のないまま生きる", "ending", "silent");
      }
      this.button(interaction, "やめる", "close");
    }
    for (const node of interaction.querySelectorAll("details"))
      if (expanded.has(node.querySelector("summary")?.textContent))
        node.open = true;
    const tools = document.querySelector<HTMLElement>("#battle-tools")!;
    tools.replaceChildren();
    if (s.battle) {
      for (const name of ["回復薬", "風邪薬"])
        if (l.count(name))
          this.button(tools, name + "を使う", "medicine", name);
      for (const g of d.gear.filter((g) =>
        Object.values(d.equipment).includes(g.id),
      ))
        this.button(tools, g.name + "を強化", "boost", g.id);
    }
    if (menu.hidden) {
      restoreFocus();
      return;
    }
    const focus = document.activeElement;
    if (focus instanceof HTMLInputElement && detail.contains(focus)) return;
    detail.replaceChildren();
    const nav = element("div", "", "panel-buttons");
    for (const [id, label] of [
      ["bag", "所持品"],
      ["gear", "装備・魔法"],
      ["stats", "能力"],
      ["map", "地図"],
      ["notes", "メモ"],
      ["settings", "設定"],
    ])
      this.button(nav, label, "tab", id);
    detail.append(nav);
    if (this.tab === "bag") {
      this.paragraph(
        detail,
        `${d.money}銅貨／満腹 ${Math.floor(d.hunger)}／風邪 ${d.cold}／疲労 ${l.fatigue ? "あり" : "なし"}`,
      );
      for (const [name, n] of Object.entries(s.inventory)) {
        this.paragraph(detail, `${l.displayName(name)} ×${n}`);
        if (items[name]?.food)
          this.button(detail, "食べる（15分）", "eat", name);
        if (items[name]?.category === "medicine")
          this.button(detail, "薬を使う", "medicine", name);
      }
      if (l.count("転移杭"))
        this.button(detail, "ここに転移杭を設置", "place-stake");
    }
    if (this.tab === "gear") {
      for (const g of d.gear) {
        const item = items[g.name],
          row = element(
            "div",
            "",
            "gear-row" +
              (g.durability / item.durability! <= 0.25 ? " danger" : ""),
          );
        this.paragraph(
          row,
          `${Object.values(d.equipment).includes(g.id) ? "装備中 " : ""}${g.name} 耐久${g.durability}/${item.durability}${g.enhancedUntil > s.clock ? " ★" : ""}${g.element ? " " + { fire: "火", water: "水", thunder: "雷" }[g.element] : ""}`,
        );
        if (item.slot) this.button(row, "装備", "equip", g.id);
        this.button(row, "通常強化", "boost", g.id);
        if (["weapon", "body", "shield"].includes(item.slot || ""))
          for (const [type, label] of [
            ["fire", "火"],
            ["water", "水"],
            ["thunder", "雷"],
          ])
            this.button(row, `${label}付与`, "element", `${g.id}|${type}`);
        detail.append(row);
      }
    }
    if (l.play) {
      this.paragraph(detail, "子供と遊んでいる。制限30ゲーム分。");
      this.button(detail, "遊びを途中終了（信頼変化なし）", "stop-play");
    }
    if (this.tab === "stats") {
      this.paragraph(
        detail,
        `HP ${s.hp}/${l.maxHp} MP ${s.mp}/${l.maxMp} ATK ${l.stat("atk").toFixed(1)} DEF ${l.stat("def").toFixed(1)} SPD ${l.stat("spd").toFixed(1)}`,
      );
      this.paragraph(
        detail,
        `剣術Lv${d.levels.sword} 魔法制御Lv${d.levels.magic}／起床後${l.awakeHours.toFixed(1)}時間／濡れ${Math.floor(d.wet / 60)}分／風邪段階${d.cold}`,
      );
    }
    if (this.tab === "notes") {
      const filters = element("div", "", "panel-buttons");
      this.button(filters, "全員", "filter", "all");
      for (const p of people) this.button(filters, p.name, "filter", p.id);
      detail.append(filters);
      for (const note of d.notes.filter(
        (n) => this.filter === "all" || n.npc === this.filter,
      )) {
        const p = people.find((p) => p.id === note.npc),
          q = d.quests.find((q) => q.id === note.quest);
        this.paragraph(
          detail,
          `${p?.name || note.npc} ${l.date(note.at)}：${note.text}${q ? `［${{ accepted: "受諾中", completed: "完了", failed: "期限切れ", declined: "辞退" }[q.state]}：${l.count(q.item)}/${q.quantity}］` : ""}`,
        );
        this.button(detail, "このメモを削除", "delete-note", String(note.id));
      }
      this.paragraph(
        detail,
        "人物情報（残っているメモが根拠）：" +
          l.personInfo.map((p) => `${p.name}・${p.role}`).join("／"),
      );
    }
    if (this.tab === "map") {
      this.button(
        detail,
        this.view === "local" ? "島全体図へ" : "現在地詳細図へ",
        "map-view",
      );
      this.drawMap(detail, s, this.view === "island");
    }
    if (this.tab === "settings")
      this.paragraph(
        detail,
        "音声なしで遊べます。操作：矢印/WASD、Shift走る、Alt忍び足、Z/Enter調べる、Cメニュー、M地図、Jメモ、Tab身振り。セーブはこの端末内です。ブラウザデータ削除前にJSONを書き出してください。",
      );
    if (this.tab === "sell") {
      this.paragraph(
        detail,
        "売る個数を選び、総額を確認して確定してください。",
      );
      let total = 0;
      for (const [name, n] of [
        ...Object.entries(s.inventory),
        ...d.gear.map((g) => ["@" + g.id, 1] as [string, number]),
      ]) {
        const price = l.sellPrice(this.seller, name);
        if (price === null) continue;
        const row = element(
            "label",
            `${name.startsWith("@") ? d.gear.find((g) => g.id === name.slice(1))!.name : name}：単価${price}銅貨 `,
          ),
          input = element("input");
        input.type = "number";
        input.min = "0";
        input.max = String(n);
        input.value = String(this.sale[name] || 0);
        input.addEventListener("input", () => {
          const value = Math.floor(Number(input.value));
          this.sale[name] = Math.max(
            0,
            Math.min(n, Number.isFinite(value) ? value : 0),
          );
          const total = Object.entries(this.sale).reduce(
            (sum, [name, n]) => sum + (l.sellPrice(this.seller, name) || 0) * n,
            0,
          );
          document.querySelector("#sale-total")!.textContent =
            `総額 ${total}銅貨`;
        });
        row.append(input);
        detail.append(row);
        total += (this.sale[name] || 0) * price;
      }
      detail.append(
        Object.assign(element("p", `総額 ${total}銅貨`), { id: "sale-total" }),
      );
      this.button(detail, "この総額で売却する", "sell-confirm");
    }
    restoreFocus();
  }
  open(tab: string) {
    this.tab = tab;
    this.signature = "";
    document.querySelector<HTMLElement>("#menu-panel")!.hidden = false;
    this.render();
  }
  private drawMap(parent: HTMLElement, s: Session, island: boolean) {
    const canvas = element("canvas");
    canvas.width = island ? 320 : s.world.map.width * 2;
    canvas.height = island ? 240 : s.world.map.height * 2;
    canvas.style.width = "100%";
    canvas.style.maxWidth = "640px";
    canvas.setAttribute(
      "aria-label",
      island ? "島全体の探索記録" : "現在エリアの探索記録",
    );
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#102c30";
    c.fillRect(0, 0, canvas.width, canvas.height);
    const labels: string[] = [];
    if (island) {
      const points: Record<string, [number, number]> = {
        VIL: [160, 220],
        GRASS: [160, 190],
        SFOREST: [160, 160],
        CFOREST: [160, 120],
        WEST: [80, 100],
        EAST: [240, 100],
        MOUNT: [160, 65],
        NORTH: [160, 25],
      };
      for (const m of outdoors) {
        const discovered = s.life.data.fog[m.id]?.includes("1");
        if (!discovered) continue;
        const [x, y] = points[m.id];
        const mask = s.life.data.fog[m.id] || "";
        c.fillStyle = "#9bb073";
        for (let row = 0; row < m.height; row++)
          for (let col = 0; col < m.width; col++)
            if (mask[row * m.width + col] === "1")
              c.fillRect(
                x - 28 + (col / m.width) * 56,
                y - 10 + (row / m.height) * 20,
                Math.max(1, 56 / m.width),
                Math.max(1, 20 / m.height),
              );
        c.fillStyle = "#dbe5c4";
        c.font = "8px sans-serif";
        c.textAlign = "center";
        c.fillText(m.name, x, y + 19);
        const stake = s.life.data.stakes[m.id];
        if (stake) {
          c.fillStyle = "#e9ab75";
          c.fillRect(
            x - 28 + (stake.x / (m.width * 16)) * 56,
            y - 10 + (stake.y / (m.height * 16)) * 20,
            3,
            3,
          );
          labels.push(m.name + "の転移杭");
        }
        if (s.world.mapId === m.id) {
          c.fillStyle = "#efc06d";
          c.fillRect(
            x - 28 + (s.world.x / (m.width * 16)) * 56 - 1,
            y - 10 + (s.world.y / (m.height * 16)) * 20 - 1,
            3,
            3,
          );
        }
      }
    } else {
      const m = s.world.map,
        mask = s.life.data.fog[m.id] || "";
      for (let y = 0; y < m.height; y++)
        for (let x = 0; x < m.width; x++)
          if (mask[y * m.width + x] === "1" || m.interior) {
            const tile = tileAt(m, x, y);
            c.fillStyle = ["water"].includes(tile)
              ? "#4c9ba9"
              : ["tree", "rock", "house"].includes(tile)
                ? "#47634e"
                : "#9bb073";
            c.fillRect(x * 2, y * 2, 2, 2);
          }
      const landmarks = [
        ...m.buildings.map((b) => ({
          x: b.x + b.w / 2,
          y: b.y + b.h,
          name: b.name,
        })),
        ...(["SFOREST", "EAST"].includes(m.id)
          ? [
              {
                x: m.width / 2 + 7,
                y: Math.floor(m.height / 2),
                name: "橋・浅瀬",
              },
            ]
          : []),
        ...(m.id === "NORTH"
          ? [{ x: m.width / 2, y: 8, name: "沈黙の祭壇" }]
          : []),
      ];
      for (const at of landmarks) {
        if (mask[Math.floor(at.y) * m.width + Math.floor(at.x)] !== "1")
          continue;
        c.fillStyle = "#d6c7ad";
        c.fillRect(at.x * 2 - 2, at.y * 2 - 2, 4, 4);
        labels.push(at.name);
      }
      c.fillStyle = "#fff0b3";
      c.fillRect(s.world.x / 8 - 2, s.world.y / 8 - 2, 4, 4);
      for (const stake of Object.entries(s.life.data.stakes).filter(
        ([id]) => id === m.id,
      )) {
        c.fillStyle = "#e9ab75";
        c.fillRect(stake[1].x / 8 - 1, stake[1].y / 8 - 1, 2, 2);
      }
    }
    parent.append(canvas);
    this.paragraph(
      parent,
      "発見済みの目印：" + (labels.join("／") || "まだありません"),
    );
    this.paragraph(
      parent,
      "未踏部分は暗く表示。敵・採集地点は表示されません。地図中も時間は進みます。",
    );
  }
}
