import { test, expect } from "@playwright/test";
async function start(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "オフィスから始める" }).click();
  await expect(page.locator("#office")).toHaveAttribute(
    "data-screen",
    "office",
  );
}
test("新しい導入を読み、転生したオフィスで歩いて記録から再開できる", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "物語を始める", exact: true }).click();
  await expect(page.locator("#story-text")).toContainText("声が出ない");
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await expect(page.locator("#story-text")).toContainText("ありったけ");
  await page.getByRole("button", { name: "次へ", exact: true }).click();
  await expect(page.locator("#story-text")).toContainText("現代のオフィス");
  await page.getByRole("button", { name: "オフィスで目を覚ます" }).click();
  const c = page.locator("#office");
  const before = Number(await c.getAttribute("data-player-x"));
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(450);
  await page.keyboard.up("ArrowLeft");
  expect(Number(await c.getAttribute("data-player-x"))).toBeLessThan(
    before - 20,
  );
  await page.getByRole("button", { name: "記録する", exact: true }).click();
  const saved = await c.getAttribute("data-player-x");
  await page.reload();
  await page.getByRole("button", { name: "続きから", exact: true }).click();
  await expect(c).toHaveAttribute("data-player-x", saved);
  await page.screenshot({
    path: `test-results/office-${info.project.name}.png`,
  });
  expect(errors).toEqual([]);
});
test("タッチ移動・キャンセル・回転・全体表示でも黒画面にならない", async ({
  page,
}) => {
  await start(page);
  const c = page.locator("#office"),
    button = page.getByRole("button", { name: "左へ移動" }),
    before = Number(await c.getAttribute("data-player-x"));
  await button.dispatchEvent("pointerdown", {
    pointerId: 4,
    pointerType: "touch",
    bubbles: true,
  });
  await page.waitForTimeout(200);
  await button.dispatchEvent("pointercancel", {
    pointerId: 4,
    pointerType: "touch",
  });
  expect(Number(await c.getAttribute("data-player-x"))).toBeLessThan(before);
  const stopped = await c.getAttribute("data-player-x");
  await page.waitForTimeout(150);
  expect(await c.getAttribute("data-player-x")).toBe(stopped);
  await page.locator("#view-mode").click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator("#office-notice")).toBeHidden();
  expect(
    await c.evaluate((c) => {
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      const colors = new Set();
      for (let i = 0; i < d.length; i += 128)
        colors.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      return colors.size;
    }),
  ).toBeGreaterThan(80);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("入口で退勤の案内が開き、南へ歩くと自宅へ帰る", async ({ page }) => {
  await start(page);
  await page.locator("#view-mode").click();
  await page.keyboard.press("e");
  await expect(page.locator("#office-dialog")).toBeVisible();
  await expect(page.locator("#dialog-text")).toContainText("退勤して自宅へ");
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowDown");
  await expect(page.locator("#office")).toHaveAttribute("data-screen", "home");
});
test("保存を拒否されても起動でき、Canvas失敗時は説明を出す", async ({
  page,
}) => {
  await page.addInitScript(
    () =>
      (Storage.prototype.setItem = function () {
        throw new Error("unavailable");
      }),
  );
  await start(page);
  await page.getByRole("button", { name: "記録する", exact: true }).click();
  await expect(page.locator("#office-message")).toContainText(
    "探索は続けられます",
  );
  await page.addInitScript(
    () => (HTMLCanvasElement.prototype.getContext = () => null),
  );
  await page.reload();
  await expect(page.locator("#office-notice")).toContainText(
    "オフィスを表示できませんでした",
  );
});

test("初回キャッシュ後はオフラインでもオフィスを起動して歩ける", async ({
  page,
  context,
}) => {
  await start(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "オフィスから始める" }).click();
  await expect(page.locator("#office")).toHaveAttribute(
    "data-screen",
    "office",
  );
  const x = Number(await page.locator("#office").getAttribute("data-player-x"));
  await page.keyboard.down("ArrowLeft");
  await page.waitForTimeout(250);
  await page.keyboard.up("ArrowLeft");
  expect(
    Number(await page.locator("#office").getAttribute("data-player-x")),
  ).toBeLessThan(x);
  await context.setOffline(false);
});
test("ゲームの読込失敗でも真っ黒な画面で放置しない", async ({ page }) => {
  await page.route("**/assets/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#office-notice")).toContainText(
    "ゲームのファイルを読み込めませんでした",
  );
});

test("金曜退勤で自宅へ帰って50回復し、保存後も二重回復せず土曜に出社する", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("office-rebirth-save-v1"))
      localStorage.setItem(
        "office-rebirth-save-v1",
        JSON.stringify({
          version: 1,
          x: 500,
          y: 562,
          life: {
            day: 5,
            stamina: 20,
            place: "office",
            recovered: 0,
            fridayRest: false,
          },
        }),
      );
  });
  await page.goto("/");
  await page.getByRole("button", { name: "続きから", exact: true }).click();
  await expect(page.locator("#workday")).toHaveText("5日目（金）");
  await page.locator("#commute").click();
  await expect(page.locator("#office")).toHaveAttribute("data-screen", "home");
  await expect(page.locator("#stamina")).toHaveText("体力 70/100");
  await expect(page.locator("#office-message")).toContainText(
    "金曜日の特別休息",
  );
  await page.getByRole("button", { name: "記録する", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "続きから", exact: true }).click();
  await expect(page.locator("#office")).toHaveAttribute("data-screen", "home");
  await expect(page.locator("#stamina")).toHaveText("体力 70/100");
  await page.screenshot({ path: `test-results/home-${info.project.name}.png` });
  await page.locator("#commute").click();
  await expect(page.locator("#office")).toHaveAttribute(
    "data-screen",
    "office",
  );
  await expect(page.locator("#workday")).toHaveText("6日目（土）");
  await expect(page.locator("#stamina")).toHaveText("体力 70/100");
});
