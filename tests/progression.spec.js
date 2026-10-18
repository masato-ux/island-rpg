import { maps, villagePoint, compactPoint } from "../src/maps.ts";
import { Session } from "../src/session.ts";
import { SaveStore } from "../src/save.ts";
import { test, expect } from "@playwright/test";
async function start(page) {
  await page.goto("/island.html");
  await page.getByRole("button", { name: "最初から", exact: true }).click();
}
async function walk(page, axis, target) {
  if ((await page.locator("#world").getAttribute("data-map")) === "VIL")
    target =
      axis === "x" ? villagePoint(target, 0).x : villagePoint(0, target).y;
  const attribute = axis === "x" ? "data-player-x" : "data-player-y",
    current = Number(await page.locator("#world").getAttribute(attribute));
  if (Math.abs(current - target) < 5) return;
  const key =
    axis === "x"
      ? target > current
        ? "ArrowRight"
        : "ArrowLeft"
      : target > current
        ? "ArrowDown"
        : "ArrowUp";
  await page.keyboard.down("Shift");
  await page.keyboard.down(key);
  await page.waitForFunction(
    ({ attribute, target, forward }) => {
      const value = Number(
        document.querySelector("canvas").getAttribute(attribute),
      );
      return forward ? value >= target - 3 : value <= target + 3;
    },
    { attribute, target, forward: target > current },
    { timeout: 10000 },
  );
  await page.keyboard.up(key);
  await page.keyboard.up("Shift");
}
async function inspect(page) {
  await page.getByRole("button", { name: "調べる", exact: true }).click();
}
test("導入を操作で完走し、楔で保存→再読込→JSON書出し", async ({ page }) => {
  test.setTimeout(60000);
  await start(page);
  await inspect(page);
  await expect(page.locator("#action-info")).toContainText("紙とペン");
  await walk(page, "y", 488);
  await inspect(page);
  await expect(page.locator("#action-info")).toContainText("採っている");
  await expect(page.locator("#objective")).toContainText("模擬戦", {
    timeout: 5000,
  });
  await walk(page, "x", 280);
  await inspect(page);
  await expect(page.locator("#battle-panel")).toBeVisible();
  for (
    let n = 0;
    n < 20 && (await page.locator("#battle-panel").isVisible());
    n++
  ) {
    const attack = page.getByRole("button", { name: "攻撃", exact: true });
    await expect(attack).toBeEnabled();
    await attack.click();
    await page.waitForTimeout(430);
  }
  await expect(page.locator("#battle-panel")).toBeHidden();
  await expect(page.locator("#objective")).toContainText("ロアン");
  await walk(page, "x", 392);
  await walk(page, "y", 450);
  await walk(page, "x", 360);
  await walk(page, "y", 385);
  await walk(page, "x", 392);
  await walk(page, "y", 280);
  await walk(page, "x", 456);
  await inspect(page);
  await expect(page.locator("#action-info")).toContainText("魂の楔");
  await walk(page, "x", 392);
  await walk(page, "y", 385);
  await walk(page, "x", 360);
  await walk(page, "y", 450);
  await walk(page, "x", 392);
  await walk(page, "y", 488);
  const home = maps.VIL.buildings.find((b) => b.interior === "HOME");
  await walk(page, "y", (((home.y + home.h) * 16 + 8) * 40) / 34);
  await walk(page, "x", (((home.x + home.w / 2) * 16 + 8) * 48) / 40);
  await inspect(page);
  await expect(page.locator("#world")).toHaveAttribute("data-map", "HOME");
  await walk(page, "y", 56);
  await inspect(page);
  await page.getByRole("button", { name: "1時間眠る", exact: true }).click();
  await expect(page.locator("#action-info")).toContainText("1時間休んだ");
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("button", { name: "魂の楔で保存" }).click();
  await expect(page.locator("#action-info")).toContainText("保存した");
  const stored = await page.evaluate(() =>
    [
      localStorage.getItem("silent-castaway.v1.A"),
      localStorage.getItem("silent-castaway.v1.B"),
    ].filter(Boolean),
  );
  expect(stored).toHaveLength(1);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON書き出し" }).click();
  expect((await download).suggestedFilename()).toBe(
    "silent-castaway-save.json",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "続きから", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "続きから", exact: true }).click();
  await expect(page.locator("#world")).toHaveAttribute("data-screen", "field");
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await expect(page.locator("#inventory")).toContainText("魂の楔");
  await expect(page.locator("#inventory")).toContainText("紙とペン");
  await page.screenshot({
    path: `test-results/progression-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("タイトルでは時計停止、メニュー中は進行、保存前の続きは無効", async ({
  page,
}) => {
  await page.goto("/island.html");
  await expect(
    page.getByRole("button", { name: "続きから", exact: true }),
  ).toBeDisabled();
  const titleClock = await page.locator("#clock").textContent();
  await page.waitForTimeout(400);
  expect(await page.locator("#clock").textContent()).toBe(titleClock);
  await page.getByRole("button", { name: "最初から", exact: true }).click();
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "魂の楔で保存" }),
  ).toBeDisabled();
  await expect(page.locator("#clock")).not.toHaveText(titleClock, {
    timeout: 8000,
  });
});
test("保存機能を拒否されても起動・移動可能、壊れたJSONは説明を表示", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await start(page);
  await expect(page.locator("#world")).toHaveAttribute("data-ready", "true");
  const initial = Number(
    await page.locator("#world").getAttribute("data-player-x"),
  );
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowRight");
  expect(
    Number(await page.locator("#world").getAttribute("data-player-x")),
  ).toBeGreaterThan(initial);
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
  await page.getByRole("button", { name: "タイトルへ戻る" }).click();
  await page.locator("#import-save").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await expect(page.locator("#action-info")).toContainText(
    "保存データを扱えませんでした",
  );
});
test("JSON読込から通常戦闘・死亡・保存への復元", async ({ page }) => {
  const fixture = new Session();
  fixture.start();
  fixture.story = { rescued: true, gathered: true, trained: true, wedge: true };
  fixture.inventory["魂の楔"] = 1;
  fixture.inventory["魔法の袋"] = 1;
  fixture.hp = 1;
  fixture.world.mapId = "GRASS";
  const point = compactPoint("GRASS", 584, 808);
  Object.assign(fixture.world, point);
  Object.assign(fixture.enemies[0], point);
  fixture.rngSeed = 1;
  const raw = new SaveStore({ getItem: () => null, setItem: () => {} }).export(
    fixture.snapshot(),
  );
  await page.goto("/island.html");
  await page.locator("#import-save").setInputFiles({
    name: "combat-save.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await expect(page.locator("#battle-panel")).toBeVisible();
  await expect(page.locator("#enemy-status")).toContainText("野ネズミ");
  await expect(page.locator("#save-game")).toBeDisabled();
  await expect(page.locator("#battle-panel")).toHaveAttribute("role", "dialog");
  await page.waitForTimeout(600);
  await expect(page.locator("#death-panel")).toBeHidden();
  await page.getByRole("button", { name: "防御", exact: true }).click();
  await expect(page.locator("#death-panel")).toBeVisible({ timeout: 10000 });
  const stopped = await page.locator("#clock").textContent();
  await page.waitForTimeout(300);
  expect(await page.locator("#clock").textContent()).toBe(stopped);
  await page.getByRole("button", { name: "魂を戻す", exact: true }).click();
  await expect(page.locator("#world")).toHaveAttribute("data-screen", "field");
  await expect(page.locator("#stats")).toContainText("HP 1/120");
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("silent-castaway.v1.A")).data,
  );
  expect(saved.clock).toBe(fixture.clock);
  expect(saved.enemies[0].hp).toBe(18);
  expect(saved.hp).toBe(1);
});
