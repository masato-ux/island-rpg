import {
  newOfficeLife,
  parseOfficeLife,
  returnHome,
  nextOfficeDay,
  weekday,
  homeSpawn,
  canOccupyHome,
  moveHome,
} from "./office-life.ts";
import { makeOffice, makeHome, person, paintCoworkers } from "./office-art.ts";
import {
  OFFICE_W,
  OFFICE_H,
  spawn,
  canOccupy,
  moveOffice,
  objects,
  coworkers,
} from "./office-model.ts";
const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const canvas = $<HTMLCanvasElement>("#office"),
  notice = $("#office-notice");
try {
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Canvas 2Dを利用できません");
  let life = newOfficeLife();
  const homeScene = makeHome();
  const scene = makeOffice(),
    p = { ...spawn };
  let facing = "up",
    walking = 0,
    active = false,
    last = performance.now(),
    full = innerWidth >= 700;
  let viewW = 960,
    viewH = 624,
    scale = 1,
    camX = 0,
    camY = 0;
  const keys = new Set<string>(),
    pointers = new Map<number, string>(),
    SAVE = "office-rebirth-save-v1";
  const story = [
    [
      "魔王城。最後の詠唱。",
      "あなたは勇者一行の魔法使い。魔王に挑んだその瞬間、呪いが喉と身体を貫いた。声が出ない。呼びかけても、魔力はひとかけらも応えなかった。",
    ],
    [
      "「今度は、君が生きる番だ」",
      "倒れたあなたを抱え、勇者は自分に残るありったけの魔力を注いだ。世界を渡る、たった一度の転生魔法。白い光の向こうで、勇者の声が遠ざかる。",
    ],
    [
      "知らない天井。聞き慣れない音。",
      "目を開けると、蛍光灯、机、光る画面。ここは現代のオフィス。声も魔力も戻らないまま、魔法使いの二度目の人生が始まる。",
    ],
  ];
  let chapter = -1;
  function clear() {
    keys.clear();
    pointers.clear();
    document
      .querySelectorAll("[data-move]")
      .forEach((b) => b.removeAttribute("data-held"));
  }
  function message(text: string) {
    $("#office-message").textContent = text;
  }
  function resize() {
    viewW = full ? 960 : 480;
    viewH = full ? 624 : Math.min(480, Math.max(300, innerHeight * 0.43));
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.aspectRatio = `${viewW}/${viewH}`;
    scale = dpr;
    $("#view-mode").textContent = full ? "拡大して追従" : "全体表示";
  }
  function enter() {
    active = true;
    $("#office-story").hidden = true;
    chapter = -1;
    clear();
    requestAnimationFrame(() =>
      $(".office-game").scrollIntoView({ block: "start" }),
    );
    message("声は出ない。まずはこのオフィスを歩いて、何があるのか確かめよう。");
  }
  function readSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE) || "null");
      return s?.version === 1 &&
        Number.isFinite(s.x) &&
        Number.isFinite(s.y) &&
        parseOfficeLife(s.life) &&
        (parseOfficeLife(s.life)!.place === "home"
          ? canOccupyHome(s.x, s.y)
          : canOccupy(s.x, s.y))
        ? { ...s, life: parseOfficeLife(s.life)! }
        : null;
    } catch {
      return null;
    }
  }
  $("#office-continue").toggleAttribute("disabled", !readSave());
  $("#office-start").onclick = () => {
    active = false;
    clear();
    chapter++;
    if (chapter >= story.length) {
      life = newOfficeLife();
      Object.assign(p, spawn);
      enter();
      return;
    }
    $("#story-title").textContent = story[chapter][0];
    $("#story-text").textContent = story[chapter][1];
    $("#office-start").textContent =
      chapter === 2 ? "オフィスで目を覚ます" : "次へ";
  };
  $("#office-skip").onclick = () => {
    life = newOfficeLife();
    Object.assign(p, spawn);
    enter();
  };
  $("#office-continue").onclick = () => {
    const s = readSave();
    if (s) {
      life = s.life;
      p.x = s.x;
      p.y = s.y;
      enter();
      message(
        life.place === "home"
          ? "自宅での記録から再開した。回復済みの体力を引き継いでいます。"
          : "このオフィスでの記録から再開した。",
      );
    }
  };
  $("#office-intro").onclick = () => {
    active = false;
    clear();
    chapter = -1;
    $("#office-story").hidden = false;
    $("#story-title").textContent = "勇者がくれた、もう一度の人生。";
    $("#story-text").textContent =
      "声と魔力を失った魔法使いを救うため、勇者はすべての魔力を転生魔法に託した。";
    $("#office-start").textContent = "物語を始める";
  };
  $("#office-save").onclick = () => {
    if (!active) {
      message("オフィスで目を覚ましてから記録できます。");
      return;
    }
    try {
      localStorage.setItem(
        SAVE,
        JSON.stringify({ version: 1, x: p.x, y: p.y, life }),
      );
      $("#office-continue").removeAttribute("disabled");
      message("この端末に現在地を記録しました。");
    } catch {
      message("このブラウザでは記録できません。探索は続けられます。");
    }
  };
  function interact() {
    if (!active || !$("#office-dialog").hidden) return;
    clear();
    if (life.place === "home") {
      $("#dialog-name").textContent = "自宅での休息";
      $("#dialog-text").textContent =
        `${life.fridayRest ? "金曜日の特別な休息" : "帰宅後の休息"}で体力が${life.recovered.toFixed(0)}回復した。翌日は${weekday(life.day + 1)}曜日。「翌日、出社する」でオフィスへ向かおう。`;
      $("#office-dialog").hidden = false;
      $("#dialog-close").focus();
      return;
    }
    let title = "声のない魔法使い",
      text =
        "話そうとしても、声は出ない。勇者の最後の言葉だけが、胸に残っている。";
    let d = 64;
    for (const o of objects) {
      const dx = Math.max(o.x - p.x, 0, p.x - o.x - o.w),
        dy = Math.max(o.y - p.y, 0, p.y - o.y - o.h),
        dist = Math.hypot(dx, dy);
      if (dist < d) {
        d = dist;
        title = o.name;
        text = o.detail;
      }
    }
    for (const npc of coworkers) {
      if (Math.hypot(p.x - npc.x, p.y - npc.y) < 48) {
        title = npc.name;
        text =
          "「大丈夫？ 顔色が悪いけど……」\n声を返せず、小さくうなずいた。相手は椅子を引き、ゆっくり休むよう促してくれた。";
        break;
      }
    }
    if (p.y > 558 && Math.abs(p.x - 500) < 44) {
      title = "エントランス";
      text = `退勤して自宅へ帰ると体力が回復する。${weekday(life.day) === "金" ? "今日は金曜日。回復量は50。" : "通常の回復量は25。"}「退勤して自宅へ」を押すか、南の出口まで歩こう。`;
    }
    $("#dialog-name").textContent = title;
    $("#dialog-text").textContent = text;
    $("#office-dialog").hidden = false;
    $("#dialog-close").focus();
  }
  function commute() {
    if (!active) return;
    if (life.place === "office") {
      if (!(p.y > 558 && Math.abs(p.x - 500) < 44)) return;
      if (!returnHome(life)) return;
      Object.assign(p, homeSpawn);
      message(
        `${life.day}日目（${weekday(life.day)}）の退勤。自宅で${life.fridayRest ? "金曜日の特別休息" : "休息"}を取り、体力が${life.recovered.toFixed(0)}回復した。翌日、出社できます。`,
      );
    } else {
      nextOfficeDay(life);
      Object.assign(p, spawn);
      message(
        `${life.day}日目（${weekday(life.day)}）の出社。体力 ${Math.floor(life.stamina)}/100。今日も声は戻らない。`,
      );
    }
    $("#office-dialog").hidden = true;
    clear();
    requestAnimationFrame(() =>
      $(".office-game").scrollIntoView({ block: "start" }),
    );
  }
  $("#commute").onclick = commute;
  $("#office-interact").onclick = interact;
  $("#dialog-close").onclick = () => {
    $("#office-dialog").hidden = true;
    clear();
  };
  $("#view-mode").onclick = () => {
    full = !full;
    resize();
  };
  const mappings: Record<string, string> = {
    ArrowUp: "up",
    w: "up",
    ArrowDown: "down",
    s: "down",
    ArrowLeft: "left",
    a: "left",
    ArrowRight: "right",
    d: "right",
  };
  addEventListener("keydown", (e) => {
    if (mappings[e.key]) {
      e.preventDefault();
      keys.add(mappings[e.key]);
    }
    if (e.key === "Shift") keys.add("run");
    if (
      (e.key === "e" ||
        (e.key === " " &&
          !(document.activeElement instanceof HTMLButtonElement))) &&
      !e.repeat
    ) {
      e.preventDefault();
      interact();
    }
    if (e.key === "Escape") {
      $("#office-dialog").hidden = true;
      clear();
    }
  });
  addEventListener("keyup", (e) => {
    keys.delete(mappings[e.key] || e.key);
    if (e.key === "Shift") keys.delete("run");
  });
  for (const el of document.querySelectorAll<HTMLButtonElement>(
    "[data-move]",
  )) {
    const release = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      el.removeAttribute("data-held");
    };
    el.onpointerdown = (e) => {
      e.preventDefault();
      if (e.isTrusted) el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, el.dataset.move!);
      el.dataset.held = "true";
    };
    el.onpointerup = release;
    el.onpointercancel = release;
    el.onlostpointercapture = release;
  }
  addEventListener("blur", clear);
  document.addEventListener("visibilitychange", () => {
    clear();
    last = performance.now();
  });
  addEventListener("resize", () => {
    clear();
    resize();
  });
  resize();
  notice.hidden = true;
  let lastPadAction = false;
  function frame(now: number) {
    try {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      let dx = 0,
        dy = 0;
      const held = new Set([...keys, ...pointers.values()]);
      let padAction = false;
      if (!document.hidden) {
        const pad = navigator.getGamepads?.().find((g) => g?.connected);
        if (pad) {
          if ((pad.axes[0] || 0) < -0.25 || pad.buttons[14]?.pressed)
            held.add("left");
          if ((pad.axes[0] || 0) > 0.25 || pad.buttons[15]?.pressed)
            held.add("right");
          if ((pad.axes[1] || 0) < -0.25 || pad.buttons[12]?.pressed)
            held.add("up");
          if ((pad.axes[1] || 0) > 0.25 || pad.buttons[13]?.pressed)
            held.add("down");
          padAction = !!pad.buttons[0]?.pressed;
          if (padAction && !lastPadAction) interact();
        }
      }
      lastPadAction = padAction;
      if (active && $("#office-dialog").hidden && !document.hidden) {
        dx = Number(held.has("right")) - Number(held.has("left"));
        dy = Number(held.has("down")) - Number(held.has("up"));
        if (dx || dy) {
          facing =
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
                ? "down"
                : "up";
          walking += dt;
          const speed = held.has("run") ? 168 : 112,
            n = Math.hypot(dx, dy);
          const beforeX = p.x,
            beforeY = p.y;
          if (life.place === "home")
            moveHome(p, (dx / n) * speed * dt, (dy / n) * speed * dt);
          else moveOffice(p, (dx / n) * speed * dt, (dy / n) * speed * dt);
          if (life.place === "office")
            life.stamina = Math.max(
              0,
              life.stamina - Math.hypot(p.x - beforeX, p.y - beforeY) / 100,
            );
          if (life.place === "office" && p.y >= 582 && Math.abs(p.x - 500) < 26)
            commute();
          else if (
            life.place === "home" &&
            p.y >= 526 &&
            Math.abs(p.x - 500) < 26
          )
            commute();
        }
      }
      camX = full
        ? 0
        : Math.max(0, Math.min(OFFICE_W - viewW, p.x - viewW / 2));
      camY = full
        ? 0
        : Math.max(0, Math.min(OFFICE_H - viewH, p.y - viewH / 2));
      c!.setTransform(scale, 0, 0, scale, 0, 0);
      c!.imageSmoothingEnabled = false;
      c!.fillStyle = "#213436";
      c!.fillRect(0, 0, viewW, viewH);
      c!.save();
      c!.translate(-Math.round(camX), -Math.round(camY));
      c!.drawImage(
        life.place === "home" ? homeScene : scene,
        0,
        0,
        OFFICE_W,
        OFFICE_H,
      );
      if (life.place === "office") paintCoworkers(c!);
      person(
        c!,
        Math.round(p.x),
        Math.round(p.y),
        0,
        true,
        dx || dy ? Math.floor(walking / 0.16) % 2 : 0,
        facing,
      );
      c!.restore();
      canvas.dataset.playerX = p.x.toFixed(2);
      canvas.dataset.playerY = p.y.toFixed(2);
      canvas.dataset.screen = active ? life.place : "prologue";
      canvas.dataset.day = String(life.day);
      canvas.dataset.stamina = life.stamina.toFixed(2);
      $("#workday").textContent = `${life.day}日目（${weekday(life.day)}）`;
      $("#stamina").textContent = `体力 ${Math.floor(life.stamina)}/100`;
      $("#scene-name").textContent =
        life.place === "home"
          ? "●　自宅 · 休息"
          : "●　あおばオフィス・執務フロア";
      $("#commute").hidden =
        !active ||
        (life.place === "office" && !(p.y > 558 && Math.abs(p.x - 500) < 44));
      $("#commute").textContent =
        life.place === "home"
          ? `翌日（${weekday(life.day + 1)}）、出社する`
          : "退勤して自宅へ";
      canvas.dataset.view = full ? "full" : "follow";
      $("#office-location").textContent =
        life.place === "home"
          ? "自宅 · 玄関から翌日の出社"
          : p.y < 280
            ? p.x < 242
              ? "応接室"
              : p.x < 530
                ? "会議室"
                : p.x < 744
                  ? "個室"
                  : "北東の執務室"
            : p.x > 744
              ? "休憩・給湯スペース"
              : p.y > 550
                ? "南側エントランス"
                : "執務エリア";
      requestAnimationFrame(frame);
    } catch (error) {
      notice.hidden = false;
      notice.textContent =
        "描画を続けられませんでした。ページを再読み込みしてください。";
      console.error(error);
    }
  }
  requestAnimationFrame(frame);
  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register("./sw.js").catch(() => {});
} catch (error) {
  notice.hidden = false;
  notice.textContent =
    "オフィスを表示できませんでした。ブラウザを更新して再読み込みしてください。";
  console.error(error);
}
