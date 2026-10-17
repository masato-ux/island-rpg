import {
  villagePoint as vp,
  compactPoint as cp,
  maps as fieldMaps,
} from "../src/maps.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Session } from "../src/session.ts";
import { people } from "../src/data.ts";
function game() {
  const s = new Session();
  s.start();
  s.story = { rescued: true, gathered: true, trained: true, wedge: true };
  s.clock = 10 * 3600;
  return s;
}
function meet(s: Session, id: string) {
  const p = people.find((p) => p.id === id)!;
  const pos = s.life.position(p);
  Object.assign(s.world, { mapId: pos.map, x: pos.x, y: pos.y });
}
test("遠隔で会話・受注・辞退・贈り物・再質問の状態を変えられない", () => {
  const s = game(),
    l = s.life;
  meet(s, "N04");
  l.accept("N04");
  l.memo(false);
  l.interaction = { kind: "person", id: "N04", title: "ベルド", text: "" };
  s.world.mapId = "GRASS";
  s.world.x = 584;
  s.world.y = 872;
  s.inventory["草"] = 3;
  const before = structuredClone({
    quests: l.data.quests,
    social: l.data.social,
    inventory: s.inventory,
    known: l.data.known,
  });
  l.offer("N04");
  l.decline("N04");
  l.accept("N11");
  l.gift("N04", "草");
  l.topic("N04", "N04-0");
  assert.deepEqual(
    {
      quests: l.data.quests,
      social: l.data.social,
      inventory: s.inventory,
      known: l.data.known,
    },
    before,
  );
  assert.equal(l.pendingMemo, null);
});
test("釣り場を離れた操作では餌や竿を消費せず、釣り場なら開始", () => {
  const s = game(),
    l = s.life;
  l.gain("木竿");
  l.gain("ミミズ", 2);
  const rod = l.data.gear.at(-1)!;
  l.fish(rod.id, "ミミズ");
  assert.equal(l.action, null);
  assert.equal(l.count("ミミズ"), 2);
  assert.equal(rod.durability, 40);
  Object.assign(s.world, vp(552, 568));
  l.fish(rod.id, "ミミズ");
  assert.equal(l.action!.kind, "fish");
  assert.equal(l.count("ミミズ"), 1);
});
test("調理済みのサイズ付き魚は生魚の材料や数量に含めない", () => {
  const s = game(),
    l = s.life;
  s.world.mapId = "HOME";
  s.inventory["焼き魚・大"] = 1;
  s.inventory["木の枝"] = 2;
  assert.equal(l.count("魚"), 0);
  l.craft("cook-fish");
  assert.equal(l.count("焼き魚・大"), 1);
  assert.equal(l.count("木の枝"), 2);
  l.gain("アジ・小");
  assert.equal(l.count("魚"), 1);
  l.craft("cook-fish");
  assert.equal(l.count("魚"), 0);
  assert.equal(l.count("焼き魚・大"), 1);
  assert.equal(l.count("焼き魚・小"), 1);
});
test("開いた入口の操作を離れた場所で再使用しても入室できない", () => {
  const s = game();
  s.life.enter("HOME");
  assert.equal(s.world.transitioning, false);
  Object.assign(s.world, vp(200, 488));
  s.life.enter("HOME");
  assert.equal(s.world.transitioning, true);
});
test("NPCが帰宅したときと、プレイヤーが離れたときは会話を終了する", () => {
  const s = game(),
    l = s.life;
  meet(s, "N10");
  l.nearest();
  assert.equal(l.interaction!.id, "N10");
  s.world.x += 80;
  s.update(0.1, new Set());
  assert.equal(l.interaction, null);
  meet(s, "N10");
  l.nearest();
  s.clock = 18 * 3600;
  s.update(0.1, new Set());
  assert.equal(l.interaction, null);
});
