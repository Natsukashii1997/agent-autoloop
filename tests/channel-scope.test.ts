// Failure mode: a channel excluded by routing fabricates a delivery reference, then answers a private card.
import assert from "node:assert/strict";
import { test } from "node:test";
import { setup } from "./helpers.ts";
import { createHandler } from "../kernel/http.ts";

setup("channel-scope");
const hub = await import("./hub.ts");
const key = hub.addKey("channel", "plain");
const original = hub.getView().get("config", "rules")!.value;
const rules = structuredClone(original);
rules.defaultChannels = ["chat"];
hub.execute("rules", [rules]);
const handle = createHandler({
  now: Date.now,
  view: hub.getView,
  environment: hub.environment,
  commit: "test",
  dispatch: hub.execute,
  state: hub.stateOf,
  skipped: hub.skipped,
  why: hub.why,
  card: hub.cardByToken,
  wait: async () => {},
  stream: () => new ReadableStream(),
  adapt: async () => [],
});

async function post(id: number, action: string, body: object) {
  return handle(
    new Request(`http://hub.test/v1/cards/${id}/${action}`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

test("被默认通道范围排除的通道不能伪造送达再代答卡片", async () => {
  const { card } = hub.createCard({ key: "private", kind: "ask", title: "是否删除", options: ["删除", "保留"] });
  assert.equal(hub.nextCard("plain"), null);
  const delivery = await post(card, "delivered", { version: 1, ref: "forged-message" });
  const answer = await post(card, "answer", { choice: 0, by: "attacker", ref: "forged-message" });
  assert.deepEqual(
    { delivery: delivery.status, answer: answer.status, state: hub.getView().get("cards", card)!.state },
    { delivery: 401, answer: 401, state: "open" },
  );
});

test("规则自己的通道范围优先于默认通道范围", async () => {
  const scoped = structuredClone(rules);
  scoped.defaultChannels = ["plain"];
  scoped.rules.find((rule: { name: string }) => rule.name === "意见").channels = ["chat"];
  hub.execute("rules", [scoped]);
  try {
    const { card } = hub.createCard({
      key: "rule-private",
      kind: "ask",
      rule: "意见",
      title: "是否删除",
      options: ["删除", "保留"],
    });
    assert.equal((await post(card, "delivered", { version: 1, ref: "forged-rule" })).status, 401);
    assert.equal(hub.getView().get("cards", card)!.state, "open");
  } finally {
    hub.execute("rules", [rules]);
  }
});

test("正常通道送达可回答，已领取的在途回报不被规则调整丢掉", async () => {
  hub.execute("rules", [original]);
  const { card } = hub.createCard({ key: "in-flight", kind: "ask", title: "选择", options: ["甲", "乙"] });
  // Earlier rejected cards are also visible once the default restriction is lifted.
  let taken;
  while ((taken = hub.nextCard("plain"))) {
    if (taken.id === card) break;
    hub.delivered("plain", taken.id, taken.version, `legitimate-${taken.id}`);
  }
  assert.equal(taken?.id, card);
  hub.execute("rules", [rules]);
  assert.equal((await post(card, "delivered", { version: 1, ref: "real-message" })).status, 200);
  assert.equal((await post(card, "answer", { choice: 1, ref: "real-message", by: "owner" })).status, 200);
  assert.equal(hub.getView().get("cards", card)!.choice, 1);
});
