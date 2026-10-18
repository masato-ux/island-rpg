import { readController } from "./controller.ts";
import { Interface } from "./ui.ts";
import { WIDTH, HEIGHT, type Direction } from "./constants.ts";
import { Session, species } from "./session.ts";
import { SaveStore } from "./save.ts";
import { Renderer } from "./renderer.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const notice = document.querySelector<HTMLElement>("#notice")!;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
function fail(error: unknown) {
  notice.hidden = false;
  notice.textContent = `ゲームを起動できませんでした。ページを再読み込みしてください。 ${error instanceof Error ? error.message : String(error)}`;
}
try {
  canvas.width = WIDTH * 2;
  canvas.height = HEIGHT * 2;
  function resize() {
    const available = canvas.parentElement!.clientWidth;
    const scale =
      available < WIDTH ? available / WIDTH : Math.floor(available / WIDTH);
    canvas.style.width = `${WIDTH * scale}px`;
    canvas.style.height = `${HEIGHT * scale}px`;
  }
  resize();
  addEventListener("resize", resize);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2Dを初期化できませんでした。");
  let session = new Session();
  const ui = new Interface(() => session);
  const renderer = new Renderer(ctx),
    held = new Set<Direction>(),
    keyboard = new Set<Direction>(),
    pointers = new Map<number, Direction>();
  const store = new SaveStore({
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  });
  const keys: Record<string, Direction> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-dir]"),
  ];
  let shift = false,
    alt = false,
    last: number | null = null,
    touchMode: "walk" | "run" | "sneak" = "walk";
  let hasSave = false,
    previousBattle = false;
  let padDirections = new Set<Direction>(),
    padButtons = new Set<number>();
  function refresh() {
    held.clear();
    for (const d of keyboard) held.add(d);
    for (const d of pointers.values()) held.add(d);
    for (const d of padDirections) held.add(d);
    buttons.forEach((b) =>
      b.classList.toggle("active", held.has(b.dataset.dir as Direction)),
    );
  }
  function clear() {
    keyboard.clear();
    pointers.clear();
    padDirections.clear();
    padButtons.clear();
    shift = false;
    alt = false;
    refresh();
    last = null;
  }
  function storageError(error: unknown) {
    session.message = `保存データを扱えませんでした。JSON書き出しでバックアップしてください。 ${error instanceof Error ? error.message : String(error)}`;
  }
  function checkSave() {
    try {
      hasSave = store.load() !== null;
    } catch (error) {
      hasSave = false;
      storageError(error);
    }
  }
  function toggleMenu() {
    if (session.screen !== "field") return;
    $("#menu-panel").hidden = !$("#menu-panel").hidden;
    clear();
  }
  function back() {
    if (!$("#menu-panel").hidden) $("#menu-panel").hidden = true;
    else if (session.life.action) session.life.cancelAction();
    else {
      session.life.interaction = null;
      session.life.memo(false);
    }
    clear();
  }
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return;
    if (e.key === "Escape" || e.key.toLowerCase() === "x") {
      back();
      return;
    }
    if (e.key.toLowerCase() === "m") {
      e.preventDefault();
      if (session.screen === "field") ui.open("map");
      clear();
      return;
    }
    if (e.key.toLowerCase() === "j") {
      e.preventDefault();
      if (session.screen === "field") ui.open("notes");
      clear();
      return;
    }
    if (
      e.key === "Tab" &&
      session.screen === "field" &&
      e.target === document.body
    ) {
      e.preventDefault();
      session.life.nearest();
      return;
    }
    if (e.key.toLowerCase() === "c") {
      if (!e.repeat) toggleMenu();
      return;
    }
    if (e.key.toLowerCase() === "z" || e.key === "Enter") {
      if (
        !e.repeat &&
        session.screen === "field" &&
        $("#menu-panel").hidden &&
        !(e.target instanceof HTMLButtonElement)
      ) {
        e.preventDefault();
        session.interact();
      }
      return;
    }
    const dir = keys[e.key] || keys[e.key.toLowerCase()];
    if (dir) {
      e.preventDefault();
      keyboard.add(dir);
      refresh();
    }
    if (e.key === "Shift") shift = true;
    if (e.key === "Alt") {
      e.preventDefault();
      alt = true;
    }
  });
  addEventListener("keyup", (e) => {
    const dir = keys[e.key] || keys[e.key.toLowerCase()];
    if (dir) {
      keyboard.delete(dir);
      refresh();
    }
    if (e.key === "Shift") shift = false;
    if (e.key === "Alt") alt = false;
  });
  buttons.forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (e.isTrusted) b.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, b.dataset.dir as Direction);
      refresh();
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(event, (e) => {
        pointers.delete((e as PointerEvent).pointerId);
        refresh();
      });
    b.addEventListener("contextmenu", (e) => e.preventDefault());
  });
  addEventListener("blur", clear);
  document.addEventListener("visibilitychange", clear);
  $("#reset").hidden = !import.meta.env.DEV;
  $("#reset").addEventListener("click", () => {
    if (session.battle || session.screen !== "field") return;
    clear();
    session.world.reset();
    render();
  });
  $("#mode").addEventListener("click", () => {
    touchMode =
      touchMode === "walk" ? "run" : touchMode === "run" ? "sneak" : "walk";
    $("#mode").textContent = { walk: "歩く", run: "走る", sneak: "忍び足" }[
      touchMode
    ];
  });
  $("#inspect").addEventListener("click", () => session.interact());
  $("#menu").addEventListener("click", toggleMenu);
  $("#close-menu").addEventListener("click", () => {
    $("#menu-panel").hidden = true;
    clear();
  });
  $("#new-game").addEventListener("click", () => {
    session = new Session();
    session.start();
    clear();
    render();
  });
  function load() {
    try {
      const saved = store.load();
      if (!saved) throw new Error("正常な保存データが見つかりません。");
      session.restore(saved);
      $("#menu-panel").hidden = true;
      clear();
      render();
    } catch (error) {
      storageError(error);
    }
  }
  $("#continue").addEventListener("click", load);
  $("#load-game").addEventListener("click", load);
  $("#save-game").addEventListener("click", () => {
    if (session.screen !== "field" || session.battle || !session.story.wedge)
      return;
    try {
      store.save(session.snapshot());
      hasSave = true;
      session.message = "魂の楔に現在の世界を保存した。";
    } catch (error) {
      storageError(error);
    }
  });
  $("#export-save").addEventListener("click", () => {
    if (!session.story.wedge || session.battle || session.screen !== "field")
      return;
    try {
      const raw = store.export(session.snapshot()),
        url = URL.createObjectURL(
          new Blob([raw], { type: "application/json" }),
        );
      const link = document.createElement("a");
      link.href = url;
      link.download = "silent-castaway-save.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      session.message = "JSONを書き出した。安全な場所へ保管してください。";
    } catch (error) {
      storageError(error);
    }
  });
  $("#import-save").addEventListener("change", async (event) => {
    const input = event.target as HTMLInputElement,
      file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_000_000)
        throw new Error("1MB以下のJSONを選んでください。");
      const data = store.import(await file.text());
      session.restore(data);
      hasSave = true;
      $("#menu-panel").hidden = true;
      clear();
      render();
    } catch (error) {
      storageError(error);
    } finally {
      input.value = "";
    }
  });
  $("#return-title").addEventListener("click", () => {
    session.screen = "title";
    session.battle = null;
    $("#menu-panel").hidden = true;
    clear();
    checkSave();
    render();
  });
  $("#revive").addEventListener("click", () => {
    if (!session.story.wedge) {
      session.restore(session.checkpoint);
      session.message = "漂着した時点からやり直す。";
      clear();
    } else load();
  });
  $("#death-title").addEventListener("click", () => {
    session.screen = "title";
    clear();
    checkSave();
    render();
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-command]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        session.command(
          button.dataset.command as "attack" | "defend" | "escape",
        ),
      ),
    );
  function text(selector: string, value: string) {
    const element = $(selector);
    if (element.textContent !== value) element.textContent = value;
  }
  function render() {
    const world = session.world;
    if (session.battle && !previousBattle) {
      $("#menu-panel").hidden = true;
      session.life.interaction = null;
      session.life.pendingMemo = null;
      clear();
    }
    previousBattle = !!session.battle;
    renderer.draw(world, session);
    canvas.dataset.playerX = world.x.toFixed(2);
    canvas.dataset.playerY = world.y.toFixed(2);
    canvas.dataset.map = world.mapId;
    canvas.dataset.screen = session.screen;
    text(
      "#position",
      `満腹 ${Math.floor(session.life.data.hunger)}${session.life.data.cold ? "・風邪" : ""}${session.life.fatigue ? "・疲労" : ""}`,
    );
    text("#map-name", world.map.name);
    $("#room-guide").hidden = !world.map.interior || session.screen !== "field";
    $("#room-exit").toggleAttribute("disabled", !session.life.canInteract());
    text(".location", `${world.mapId} / ${world.map.name}`);
    text(
      "#clock",
      `${session.timeLabel} · ${{ clear: "晴", rain: "雨", fog: "霧" }[session.life.data.weather]}`,
    );
    text(
      "#stats",
      `HP ${Math.floor(session.hp)}/${session.life.maxHp} · MP ${Math.floor(session.mp)}/${session.life.maxMp}`,
    );
    text("#action-info", session.message);
    text(
      "#objective",
      `${session.objective} ｜ 満腹${Math.floor(session.life.data.hunger)}${session.life.data.cold ? "・風邪" : ""}${session.life.fatigue ? "・疲労" : ""}`,
    );
    $("#title-panel").hidden = session.screen !== "title";
    $("#death-panel").hidden = session.screen !== "dead";
    $("#battle-panel").hidden = !session.battle;
    $<HTMLButtonElement>("#continue").disabled = !hasSave;
    $<HTMLButtonElement>("#load-game").disabled = !hasSave || !!session.battle;
    $<HTMLButtonElement>("#revive").disabled = session.story.wedge && !hasSave;
    const blocked =
      session.screen !== "field" ||
      !!session.battle ||
      session.gathering > 0 ||
      !!session.life.action;
    for (const button of buttons) button.disabled = blocked;
    $<HTMLButtonElement>("#inspect").disabled = blocked;
    $<HTMLButtonElement>("#reset").disabled = blocked;
    const cannotSave =
      session.screen !== "field" || !!session.battle || !session.story.wedge;
    $<HTMLButtonElement>("#save-game").disabled = cannotSave;
    $<HTMLButtonElement>("#export-save").disabled = cannotSave;
    text(
      "#save-hint",
      session.story.wedge
        ? "戦闘中は保存できません。採集や遊びの途中経過も保存されます。"
        : "ダンの案内を終え、村長から魂の楔を受け取ると保存できます。",
    );
    text(
      "#inventory",
      Object.entries(session.inventory)
        .map(([name, n]) => `${name} ×${n}`)
        .join(" ／ "),
    );
    ui.render();
    if (session.battle) {
      const enemy = session.enemy!;
      text(
        "#enemy-status",
        `${species[enemy.kind].name} · HP ${enemy.hp}/${species[enemy.kind].hp}${session.battle.members.filter((id) => session.enemies.find((e) => e.id === id)!.hp > 0).length > 1 ? "（群れ" + session.battle.members.filter((id) => session.enemies.find((e) => e.id === id)!.hp > 0).length + "体）" : ""}`,
      );
      document
        .querySelectorAll<HTMLButtonElement>("[data-command]")
        .forEach((b) => (b.disabled = session.battle!.inputTimer > 0));
    }
  }
  checkSave();
  render();
  const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
  if (!pixels.some((v, i) => i % 4 !== 3 && v > 0))
    throw new Error("描画結果を確認できませんでした。");
  notice.hidden = true;
  canvas.dataset.ready = "true";
  if (import.meta.env.PROD && "serviceWorker" in navigator)
    navigator.serviceWorker
      .register(new URL("sw.js", location.href))
      .catch(() => {
        console.warn(
          "オフライン用キャッシュを準備できませんでした。オンラインでは引き続き遊べます。",
        );
      });
  function frame(now: number) {
    try {
      const dt =
        last === null ? 0 : Math.max(0, Math.min((now - last) / 1000, 0.1));
      last = now;
      const pad = readController(
        !document.hidden && document.hasFocus()
          ? (Array.from(navigator.getGamepads?.() || []).find(
              (p) => p?.connected,
            ) ?? null)
          : null,
      );
      const panel = [
        $("#title-panel"),
        $("#death-panel"),
        $("#menu-panel"),
        $("#interaction-panel"),
        $("#battle-panel"),
      ].find((p) => !p.hidden);
      const choices = panel
        ? [
            ...panel.querySelectorAll<HTMLElement>(
              "button:not(:disabled), summary, input",
            ),
          ].filter((el) => el.getClientRects().length > 0)
        : [];
      if (choices.length) {
        const direction = [...pad.directions].find(
          (d) => !padDirections.has(d),
        );
        if (direction) {
          const current = choices.indexOf(
            document.activeElement as HTMLElement,
          );
          const step = direction === "up" || direction === "left" ? -1 : 1;
          choices[
            current < 0 ? 0 : (current + step + choices.length) % choices.length
          ].focus();
        }
        if (pad.pressed.has(0) && !padButtons.has(0)) {
          const active = document.activeElement;
          (choices.includes(active as HTMLElement)
            ? (active as HTMLElement)
            : choices[0]
          ).click();
        }
      } else if (
        session.screen === "field" &&
        pad.pressed.has(0) &&
        !padButtons.has(0)
      )
        session.interact();
      const previousDirections = padDirections;
      padDirections = pad.directions;
      refresh();
      if (choices.length)
        for (const dir of previousDirections) held.delete(dir);
      if (choices.length) for (const dir of padDirections) held.delete(dir);
      if (session.screen === "field") {
        if (pad.pressed.has(1) && !padButtons.has(1)) back();
        if (pad.pressed.has(2) && !padButtons.has(2)) toggleMenu();
        if (pad.pressed.has(3) && !padButtons.has(3)) ui.open("map");
      }
      padButtons = pad.pressed;
      session.world.mode =
        alt || pad.sneak ? "sneak" : shift || pad.run ? "run" : touchMode;
      session.update(
        dt,
        $("#menu-panel").hidden ? held : new Set(),
        document.hidden,
      );
      render();
      requestAnimationFrame(frame);
    } catch (error) {
      fail(error);
    }
  }
  requestAnimationFrame(frame);
} catch (error) {
  fail(error);
}
