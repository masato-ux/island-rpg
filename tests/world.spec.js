import { readFileSync } from "node:fs";
import {
  maps,
  compactPoint,
  villagePoint,
  safePosition,
  tileAt,
} from "../src/maps.ts";
import { test, expect } from "@playwright/test";
import { Session } from "../src/session.ts";
import { SaveStore } from "../src/save.ts";
function fixture(map = "VIL", x = 264, y = 488) {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.inventory = { 魂の楔: 1, 紙とペン: 1, 魔法の袋: 1 };
  s.world.mapId = map;
  const scaled =
    map === "NORTH"
      ? { x: maps.NORTH.width * 8, y: 128 }
      : compactPoint(map, x, y);
  Object.assign(s.world, safePosition(maps[map], scaled.x, scaled.y));
  s.clock = 10 * 3600;
  s.life.data.money = 2000;
  return s;
}
async function load(page, s) {
  const raw = new SaveStore({ getItem: () => null, setItem: () => {} }).export(
    s.snapshot(),
  );
  await page.goto("/island.html");
  await page.locator("#import-save").setInputFiles({
    name: "world-save.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await expect(page.locator("#world")).toHaveAttribute("data-screen", "field");
}
async function inspect(page) {
  await page.getByRole("button", { name: "調べる", exact: true }).click();
}
test("会話から任意メモと人物情報、削除で消える", async ({ page }) => {
  await load(page, fixture());
  await inspect(page);
  await page.locator('[data-life="topic"][data-id="N07-0"]').click();
  await page.getByRole("button", { name: "いいえ", exact: true }).click();
  await page.keyboard.press("j");
  await expect(page.locator("#detail")).not.toContainText("ダン・畜産家");
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await inspect(page);
  await page.locator('[data-life="topic"][data-id="N07-0"]').click();
  await page.getByRole("button", { name: "はい", exact: true }).click();
  await page.keyboard.press("j");
  await expect(page.locator("#detail")).toContainText("ダン・畜産家");
  await page.getByRole("button", { name: "このメモを削除" }).click();
  await expect(page.locator("#detail")).not.toContainText("ダン・畜産家");
});
test("自宅の試作・睡眠・能力回復・保存", async ({ page }) => {
  const s = fixture("HOME", 88, 56);
  s.hp = 30;
  s.mp = 0;
  s.inventory["薬草"] = 2;
  s.inventory["水"] = 1;
  await load(page, s);
  await inspect(page);
  await page.getByText("材料を選んで試作する", { exact: true }).click();
  const panel = page.locator("#interaction-panel");
  await panel
    .locator("label")
    .filter({ hasText: "薬草" })
    .locator("input")
    .fill("2");
  await panel
    .locator("label")
    .filter({ hasText: "水" })
    .locator("input")
    .fill("1");
  await page.getByRole("button", { name: "試作する", exact: true }).click();
  await expect(page.locator("#action-info")).toContainText("風邪薬");
  await page.getByRole("button", { name: "7時間眠る", exact: true }).click();
  await expect(page.locator("#stats")).toContainText("HP 120/120");
  await expect(page.locator("#stats")).toContainText("MP 160/160");
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("button", { name: "魂の楔で保存" }).click();
  await expect(page.locator("#action-info")).toContainText("保存した");
});
test("草原の資源採集・工具消失・地図の詳細/全体切替", async ({ page }) => {
  const s = fixture("SFOREST");
  const node = s.life.nodeList("SFOREST").find((n) => n.def.item === "木材");
  s.world.x = node.x;
  s.world.y = node.y;
  for (const e of s.enemies) {
    e.hp = 0;
    e.respawnAt = 1e9;
  }
  s.life.gain("石斧");
  s.life.data.gear.at(-1).durability = 1;
  await load(page, s);
  await inspect(page);
  await page.getByRole("button", { name: "石斧で採る" }).click();
  await expect(page.locator("#action-info")).toContainText("壊れて消えた", {
    timeout: 6000,
  });
  await page.keyboard.press("m");
  await expect(page.locator("#detail canvas")).toHaveAttribute(
    "aria-label",
    "現在エリアの探索記録",
  );
  await page.getByRole("button", { name: "島全体図へ" }).click();
  await expect(page.locator("#detail canvas")).toHaveAttribute(
    "aria-label",
    "島全体の探索記録",
  );
});
test("釣りの餌消費と結果を確認", async ({ page }) => {
  const s = fixture("VIL", 552, 568);
  s.life.gain("木竿");
  s.life.gain("ミミズ", 3);
  s.rngSeed = 1;
  await load(page, s);
  await inspect(page);
  await page.getByRole("button", { name: "木竿＋ミミズ" }).click();
  await expect(page.locator("#action-info")).toContainText("釣れた", {
    timeout: 6000,
  });
  await page.getByRole("button", { name: "やめる", exact: true }).click();
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await expect(page.locator("#inventory")).toContainText("ミミズ ×2");
});
for (const [name, choice] of [
  ["呪いを解く", "released"],
  ["声のないまま生きる", "silent"],
])
  test(`祭壇の結末「${name}」後も保存と探索が可能`, async ({ page }) => {
    const s = fixture("NORTH", 896, 128);
    for (const e of s.enemies) {
      e.hp = 0;
      e.respawnAt = 1e9;
    }
    await load(page, s);
    await inspect(page);
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("#action-info")).toContainText("暮らし");
    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByRole("button", { name: "魂の楔で保存" }).click();
    const saved = await page.evaluate(
      () =>
        [
          localStorage.getItem("silent-castaway.v1.A"),
          localStorage.getItem("silent-castaway.v1.B"),
        ]
          .filter(Boolean)
          .map((v) => JSON.parse(v))
          .sort((a, b) => b.generation - a.generation)[0].data,
    );
    expect(saved.life.ending).toBe(choice);
    await expect(page.locator("#world")).toHaveAttribute(
      "data-screen",
      "field",
    );
  });
test("初回キャッシュ後はネットワークなしで再起動・移動できる", async ({
  page,
  context,
}) => {
  await page.goto("/island.html");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "最初から", exact: true }).click();
  const before = Number(
    await page.locator("#world").getAttribute("data-player-x"),
  );
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");
  expect(
    Number(await page.locator("#world").getAttribute("data-player-x")),
  ).toBeGreaterThan(before);
  await context.setOffline(false);
});
test("店の購入・まとめ売り・委託と開始前取消し", async ({ page }) => {
  const s = fixture("VIL", 344, 408);
  s.inventory["木材"] = 10;
  s.inventory["鉄鉱石"] = 2;
  await load(page, s);
  await inspect(page);
  await page.getByText("商品・委託・受け取り", { exact: true }).click();
  await page.locator('[data-life="buy"][data-id="木剣"]').click();
  await expect(page.locator("#action-info")).toContainText("木剣を購入した");
  await page.locator('[data-life="craft"][data-id="craft-木盾"]').click();
  await expect(page.locator("#action-info")).toContainText("委託");
  await page.locator('[data-life="craft"][data-id="craft-木盾"]').click();
  await page.locator('[data-life="cancel-job"]').last().click();
  await page
    .getByRole("button", { name: "まとめて売る（確認画面へ）" })
    .click();
  await page
    .locator("#detail label")
    .filter({ hasText: "鉄鉱石" })
    .locator("input")
    .fill("2");
  await expect(page.locator("#sale-total")).toHaveText("総額 72銅貨");
  await page.getByRole("button", { name: "この総額で売却する" }).click();
  await expect(page.locator("#action-info")).toContainText("72銅貨で売却");
});
test("装備の強化・属性付与・MP消費と保存", async ({ page }) => {
  const s = fixture();
  s.life.data.gear[0].durability = 1;
  await load(page, s);
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("button", { name: "装備・魔法", exact: true }).click();
  await expect(page.locator("#detail .danger")).toContainText("耐久1/30");
  await page.locator('[data-life="boost"][data-id="driftwood"]').click();
  await expect(page.locator("#stats")).toContainText("MP 145/160");
  await page.locator('[data-life="element"][data-id="driftwood|fire"]').click();
  await expect(page.locator("#stats")).toContainText("MP 135/160");
  await page.getByRole("button", { name: "魂の楔で保存" }).click();
  await expect(page.locator("#action-info")).toContainText("保存した");
});
test("ゲームパッド入力を読み、切断すると移動が止まる", async ({ page }) => {
  await page.addInitScript(() => {
    window.testPad = null;
    Object.defineProperty(navigator, "getGamepads", {
      value: () => [window.testPad],
    });
  });
  await page.goto("/island.html");
  await page.getByRole("button", { name: "最初から", exact: true }).click();
  const before = Number(
    await page.locator("#world").getAttribute("data-player-x"),
  );
  await page.evaluate(() => {
    window.testPad = {
      connected: true,
      axes: [1, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
    };
  });
  await page.waitForTimeout(250);
  expect(
    Number(await page.locator("#world").getAttribute("data-player-x")),
  ).toBeGreaterThan(before);
  await page.evaluate(() => {
    window.testPad = null;
  });
  await page.waitForTimeout(80);
  const stopped = await page.locator("#world").getAttribute("data-player-x");
  await page.waitForTimeout(200);
  expect(await page.locator("#world").getAttribute("data-player-x")).toBe(
    stopped,
  );
});
test("採集中でも保存し、途中経過から再開できる", async ({ page }) => {
  const s = fixture("MOUNT");
  const node = s.life.nodeList("MOUNT").find((n) => n.def.item === "希少鉱石");
  s.world.x = node.x;
  s.world.y = node.y;
  for (const e of s.enemies) {
    e.hp = 0;
    e.respawnAt = 1e9;
  }
  s.life.gain("名工ツルハシ");
  await load(page, s);
  await inspect(page);
  await page.getByRole("button", { name: "名工ツルハシで採る" }).click();
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("button", { name: "魂の楔で保存" }).click();
  await expect(page.locator("#action-info")).toContainText("保存した");
  const activity = await page.evaluate(
    () =>
      JSON.parse(
        localStorage.getItem("silent-castaway.v1.B") ||
          localStorage.getItem("silent-castaway.v1.A"),
      ).data.activity,
  );
  expect(activity.action.kind).toBe("gather");
  await page.reload();
  await page.getByRole("button", { name: "続きから", exact: true }).click();
  await expect(page.locator("#action-info")).toContainText("採った", {
    timeout: 6000,
  });
});
test("住人から離れると会話が閉じ、釣り場を離れても餌を失わない", async ({
  page,
}) => {
  await load(page, fixture("VIL", 344, 408));
  await inspect(page);
  await expect(page.locator("#interaction-panel")).toContainText("ガルム");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(900);
  await page.keyboard.up("ArrowDown");
  await expect(page.locator("#interaction-panel")).toBeHidden();
  const s = fixture("VIL", 552, 568);
  s.life.gain("木竿");
  s.life.gain("ミミズ", 2);
  await load(page, s);
  await inspect(page);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1000);
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "木竿＋ミミズ" }).click();
  await expect(page.locator("#action-info")).toContainText("釣り場の近く");
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await expect(page.locator("#inventory")).toContainText("ミミズ ×2");
});
test("試作で選んだ魚だけを調理し、取得順の別の魚を残す", async ({ page }) => {
  const s = fixture("HOME", 88, 56);
  s.life.gain("アジ・小");
  s.life.gain("タイ・大");
  s.life.gain("木の枝");
  await load(page, s);
  await inspect(page);
  await page.getByText("材料を選んで試作する", { exact: true }).click();
  for (const [name, n] of [
    ["タイ・大", 1],
    ["木の枝", 1],
  ])
    await page
      .locator("#interaction-panel label")
      .filter({ hasText: name })
      .locator("input")
      .fill(String(n));
  await page.getByRole("button", { name: "試作する", exact: true }).click();
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await expect(page.locator("#inventory")).toContainText("アジ・小 ×1");
  await expect(page.locator("#inventory")).toContainText("焼き魚・大 ×1");
  await expect(page.locator("#inventory")).not.toContainText("タイ・大");
});
test("詳細地図は発見した建物だけを表示する", async ({ page }) => {
  const s = fixture("VIL", 344, 408);
  s.life.reveal();
  await load(page, s);
  await page.keyboard.press("m");
  await expect(page.locator("#detail")).toContainText("発見済みの目印：");
  await expect(page.locator("#detail")).toContainText("鍛冶屋");
  await expect(page.locator("#detail")).not.toContainText("村長宅");
});
test("ゲームパッドだけでタイトル開始と会話の選択・取消しができる", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.testPad = {
      connected: true,
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
    };
    Object.defineProperty(navigator, "getGamepads", {
      value: () => [window.testPad],
    });
  });
  const press = async (n) => {
    await page.evaluate((n) => {
      window.testPad.buttons[n].pressed = true;
    }, n);
    await page.waitForTimeout(100);
    await page.evaluate((n) => {
      window.testPad.buttons[n].pressed = false;
    }, n);
    await page.waitForTimeout(100);
  };
  await page.goto("/island.html");
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  await press(0);
  await expect(page.locator("#world")).toHaveAttribute("data-screen", "field");
  await load(page, fixture());
  await press(0);
  await expect(page.locator("#interaction-panel")).toContainText("ダン");
  await press(13);
  await press(0);
  await expect(page.locator("#interaction-panel")).toContainText(
    "メモを取りますか",
  );
  await press(1);
  await expect(page.locator("#interaction-panel")).toBeHidden();
});
test("ゲームのJS読込失敗でも再読み込みの案内が出る", async ({ page }) => {
  await page.route("**/assets/*.js", (route) => route.abort());
  await page.goto("/island.html");
  await expect(page.locator("#notice")).toContainText(
    "ゲームのファイルを読み込めませんでした",
  );
});
test("階段で村の高台に上り、保存と再読込後も上に立てる", async ({ page }) => {
  await load(page, fixture("VIL", 552, 552));
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(950);
  await page.keyboard.up("ArrowUp");
  const y = Number(await page.locator("#world").getAttribute("data-player-y"));
  expect(y).toBeLessThan(villagePoint(0, 512).y);
  expect(y).toBeGreaterThan(villagePoint(0, 448).y);
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("button", { name: "魂の楔で保存" }).click();
  await expect(page.locator("#action-info")).toContainText("保存した");
  await page.reload();
  await page.getByRole("button", { name: "続きから", exact: true }).click();
  expect(
    Number(await page.locator("#world").getAttribute("data-player-y")),
  ).toBeCloseTo(y, 1);
  await expect(page.locator(".badge")).toContainText("FIELD 22");
});
test("旧セーブを縮小した村へ移しても進行を保って読込できる", async ({
  page,
}) => {
  const raw = readFileSync(
    new URL("./fixtures/field03-save.json", import.meta.url),
  );
  await page.goto("/island.html");
  await page.locator("#import-save").setInputFiles({
    name: "old-field.json",
    mimeType: "application/json",
    buffer: raw,
  });
  await expect(page.locator("#world")).toHaveAttribute("data-screen", "field");
  expect(
    Number(await page.locator("#world").getAttribute("data-player-x")),
  ).not.toBe(600);
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await expect(page.locator("#inventory")).toContainText("薬草 ×7");
});

test("6軒すべてに入室し、室内を歩いて戸口から元の入口に戻れる", async ({
  page,
}) => {
  for (const b of maps.VIL.buildings) {
    const s = fixture(),
      x = (b.x + b.w / 2) * 16 + 8,
      y = (b.y + b.h) * 16 + 8;
    Object.assign(s.world, { x, y, facing: "up" });
    await load(page, s);
    await inspect(page);
    await expect(page.locator("#world")).toHaveAttribute(
      "data-map",
      b.interior,
    );
    await page.waitForTimeout(300);
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(260);
    await page.keyboard.up("ArrowUp");
    const inside = Number(
      await page.locator("#world").getAttribute("data-player-y"),
    );
    expect(inside).toBeLessThan(90);
    await page.keyboard.down("ArrowDown");
    await page.waitForTimeout(400);
    await page.keyboard.up("ArrowDown");
    await inspect(page);
    await expect(page.locator("#world")).toHaveAttribute("data-map", "VIL");
    await page.waitForTimeout(300);
    expect(
      Number(await page.locator("#world").getAttribute("data-player-x")),
    ).toBeCloseTo(x, 0);
  }
});

test("室内の出口案内は常時表示され、奥からでも出口ボタンで帰れる", async ({
  page,
}) => {
  await load(page, fixture("CHIEF", 88, 56));
  await expect(page.locator("#room-guide")).toBeVisible();
  await expect(page.locator("#room-guide")).toContainText("出口は南側");
  await expect(page.locator("#world")).toHaveAttribute("width", "1280");
  await expect(page.locator("#world")).toHaveAttribute("height", "720");
  await page
    .getByRole("button", { name: "外へ出る（出口）", exact: true })
    .click();
  await expect(page.locator("#world")).toHaveAttribute("data-map", "VIL");
  await expect(page.locator("#room-guide")).toBeHidden();
});

test("洞窟へ歩いて入り、岩壁に止まり、同じ入口から外へ戻れる", async ({
  page,
}) => {
  const s = fixture("GRASS");
  Object.assign(s.world, { x: 37 * 16 + 8, y: 18 * 16 + 8 });
  for (const e of s.enemies.filter((e) => !e.mapId || e.mapId === "GRASS")) {
    e.hp = 0;
    e.respawnAt = s.clock + 86400;
  }
  await load(page, s);
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(1500);
  await page.keyboard.up("ArrowUp");
  await expect(page.locator(".location")).toContainText("洞窟");
  expect(
    Number(await page.locator("#world").getAttribute("data-player-y")),
  ).toBeLessThan(240);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(2000);
  await page.keyboard.up("ArrowRight");
  expect(
    Number(await page.locator("#world").getAttribute("data-player-x")),
  ).toBeLessThan(44 * 16 - 4);
  await page.keyboard.down("ArrowLeft");
  await expect
    .poll(
      async () =>
        Number(await page.locator("#world").getAttribute("data-player-x")),
      { intervals: [16], timeout: 4000 },
    )
    .toBeLessThanOrEqual(37 * 16 + 8);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(2000);
  await page.keyboard.up("ArrowDown");
  expect(
    Number(await page.locator("#world").getAttribute("data-player-y")),
  ).toBeGreaterThan(17 * 16);
  await expect(page.locator(".location")).not.toContainText("洞窟");
});

test("浅いぬかるみから深い沼へ進めず、沿岸の浅瀬は歩いて渡れる", async ({
  page,
}) => {
  let mud, sea;
  for (let y = 3; y < maps.EAST.height - 3 && !mud; y++)
    for (let x = 3; x < maps.EAST.width - 3 && !mud; x++)
      if (
        tileAt(maps.EAST, x, y) === "wet" &&
        tileAt(maps.EAST, x + 1, y) === "deepmud"
      )
        mud = { x: x * 16 + 8, y: y * 16 + 8 };
  for (let y = 3; y < maps.WEST.height - 3 && !sea; y++)
    for (let x = 3; x < maps.WEST.width - 3 && !sea; x++)
      if ([0, 1, 2].every((dx) => tileAt(maps.WEST, x + dx, y) === "shallow"))
        sea = { x: x * 16 + 8, y: y * 16 + 8 };
  expect(mud).toBeTruthy();
  expect(sea).toBeTruthy();
  for (const [map, point] of [
    ["EAST", mud],
    ["WEST", sea],
  ]) {
    const s = fixture(map);
    Object.assign(s.world, point);
    for (const e of s.enemies.filter((e) => e.mapId === map)) {
      e.hp = 0;
      e.respawnAt = s.clock + 86400;
    }
    await load(page, s);
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(400);
    await page.keyboard.up("ArrowRight");
    const delta =
      Number(await page.locator("#world").getAttribute("data-player-x")) -
      point.x;
    if (map === "EAST") expect(delta).toBeLessThan(5);
    else {
      expect(delta).toBeGreaterThan(8);
      expect(delta).toBeLessThan(25);
    }
  }
});
