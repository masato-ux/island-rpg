import { test, expect } from "@playwright/test";
import { Session, species } from "../src/session.ts";
import { maps, safePosition } from "../src/maps.ts";
import { SaveStore } from "../src/save.ts";
function fixture() {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.inventory = { 魂の楔: 1, 回復薬: 2 };
  s.world.mapId = "GRASS";
  Object.assign(s.world, safePosition(maps.GRASS, 384, 488));
  s.enemies.forEach((e) => {
    e.hp = 0;
    e.respawnAt = s.clock + 86400;
  });
  for (const [i, kind, dx, dy] of [
    [0, "slime", 0, 0],
    [1, "dog", 24, 0],
    [2, "goblin", -24, 12],
  ]) {
    Object.assign(s.enemies[i], {
      kind,
      hp: species[kind].hp,
      x: s.world.x + dx,
      y: s.world.y + dy,
      spawnX: s.world.x + dx,
      spawnY: s.world.y + dy,
      heading: 0,
      aiTimer: 10,
      respawnAt: 0,
    });
  }
  s.rngSeed = 1;
  return s;
}
async function load(page, approaching = false) {
  const s = fixture();
  if (approaching) {
    s.enemies[0].x = s.world.x + 32;
    s.enemies[0].spawnX = s.enemies[0].x;
    s.enemies[1].hp = 0;
    s.enemies[2].hp = 0;
  }
  const raw = new SaveStore({ getItem: () => null, setItem: () => {} }).export(
    s.snapshot(),
  );
  await page.goto("/");
  await page.locator("#import-save").setInputFiles({
    name: "battle.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  return s;
}
test("専用画面で待機中も援軍が加わり、対象を選んだコマンドごとに敵が行動する", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await load(page);
  await expect(
    page.getByRole("dialog", { name: "戦闘", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#battle-turn")).toContainText("TURN 1");
  await expect(page.locator("#battle-player")).toContainText("HP 120/120");
  const x = await page.locator("#world").getAttribute("data-player-x");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(200);
  await page.keyboard.up("ArrowRight");
  expect(await page.locator("#world").getAttribute("data-player-x")).toBe(x);
  await expect(page.locator("#battle-roster button")).toHaveCount(3, {
    timeout: 12000,
  });
  await expect(page.locator("#battle-player")).toContainText("HP 120/120");
  await expect(page.locator("#battle-log")).toContainText("援軍");
  await page.locator("#battle-roster button").first().focus();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(
      () => document.activeElement.closest("#battle-panel") !== null,
    ),
  ).toBe(true);
  await page.keyboard.press("m");
  await expect(page.locator("#menu-panel")).toBeHidden();
  const target = page
    .locator("#battle-roster button")
    .filter({ hasText: "ゴブリン" });
  await target.click();
  await expect(target).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "攻撃", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "攻撃", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("#battle-turn")).toContainText("TURN 2", {
    timeout: 5000,
  });
  await expect(page.locator("#battle-log")).toContainText("ゴブリンに");
  await expect(
    page.getByRole("button", { name: "攻撃", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "回復薬を使う", exact: true }).click();
  await expect(page.locator("#battle-turn")).toContainText("TURN 3", {
    timeout: 5000,
  });
  await expect(page.locator("#battle-log")).toContainText("回復薬を使った");
  await page.screenshot({
    path: `test-results/battle-${info.project.name}.png`,
  });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("button", { name: "防御", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "防御", exact: true }).click();
  await expect(page.locator("#battle-turn")).toContainText("TURN 4", {
    timeout: 5000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("戦闘の正面画面には魔物と背景が描画される", async ({ page }) => {
  await load(page);
  await expect(page.locator("#battle-panel")).toBeVisible();
  const count = await page.locator("#battle-scene").evaluate((canvas) => {
    const pixels = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    for (let i = 0; i < pixels.length; i += 16)
      if (pixels[i + 3])
        colors.add(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    return colors.size;
  });
  expect(count).toBeGreaterThan(40);
});

test("フィールドを歩いて敵に接触すると黒地・白枠の戦闘画面が開く", async ({
  page,
}) => {
  await load(page, true);
  await expect(page.locator("#world")).toHaveAttribute("data-screen", "field");
  await expect(page.locator("#battle-panel")).toBeHidden();
  await page.keyboard.down("ArrowRight");
  await expect(page.locator("#battle-panel")).toBeVisible({ timeout: 5000 });
  await page.keyboard.up("ArrowRight");
  const colors = await page.locator("#battle-panel").evaluate((e) => ({
    background: getComputedStyle(e).backgroundColor,
    border: getComputedStyle(e).borderTopColor,
  }));
  expect(colors).toEqual({
    background: "rgb(0, 0, 0)",
    border: "rgb(255, 255, 255)",
  });
  await page.getByRole("button", { name: "攻撃", exact: true }).click();
  await expect(page.locator("#battle-log")).toContainText("旅人は攻撃をした");
});
