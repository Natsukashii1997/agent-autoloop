// CLI failures, API errors and malformed output must not copy private cards, command arguments or CLI output into
// logs or failure reports. Real local stand-ins exercise the channel boundary without contacting Feishu.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Card } from "../host/channels.ts";
import feishu from "../plugins/feishu/channel.ts";

const PRIVATE = "PRIVATE_CARD_SECURITY_SENTINEL";
const OUTPUT = "PRIVATE_CLI_OUTPUT_SENTINEL";
const directory = process.env.FEISHU_SECURITY_EVIDENCE ?? tmpdir();
mkdirSync(directory, { recursive: true });

async function exercise(mode: string, ref: string | null = null) {
  const folder = mkdtempSync(join(directory, "feishu-security-"));
  // Windows doesn't read a #! line: there the stand-in is a script behind a .cmd shim, which is how npm ships lark-cli.
  const windows = process.platform === "win32";
  const program = join(folder, windows ? "fake-lark.cmd" : "fake-lark");
  if (windows) writeFileSync(program, '@ECHO off\r\nnode "%~dp0fake-lark.mjs" %*\r\n');
  writeFileSync(
    windows ? join(folder, "fake-lark.mjs") : program,
    `${windows ? "" : `#!${process.execPath}`}
const mode = ${JSON.stringify(mode)};
const output = ${JSON.stringify(OUTPUT)};
const args = process.argv.slice(2);
if (args[0] === 'event') {
  if (mode === 'listener') {
    console.error(output);
    console.log(output + ' not JSON');
    console.log(JSON.stringify({operator_id:'ou_security_fixture',message_id:'om_security',action_value:JSON.stringify({card:71,choice:0})}));
  }
  setInterval(() => {}, 1000);
} else if (mode === 'exit') {
  console.log(output);
  console.error(output);
  process.exit(7);
} else if (mode === 'signal') {
  console.error(output);
  process.kill(process.pid, 'SIGTERM');
} else if (mode === 'json') {
  console.log(JSON.stringify({ok:false, error:{code:99991663, message:output, detail:args}}));
} else if (mode === 'json-string-code') {
  console.log(JSON.stringify({ok:false, error:{code:output, message:output}}));
} else if (mode === 'malformed') {
  console.log(output + ' not JSON');
} else if (mode === 'null') {
  console.log('null');
} else {
  process.stdin.resume();
  process.stdin.on('end', () => console.log(JSON.stringify({ok:true,data:{message_id:'om_security'}})));
}
`,
    { mode: 0o700 },
  );
  const stop = new AbortController();
  const logs: string[] = [];
  const failures: unknown[][] = [];
  const delivered: unknown[][] = [];
  const answers: unknown[][] = [];
  const card: Card = {
    id: 71,
    version: 1,
    ref,
    kind: "ask",
    state: "open",
    title: PRIVATE,
    text: PRIVATE,
    options: [PRIVATE],
    recommend: 0,
    choice: null,
    answer: null,
    result: null,
    link: null,
  };
  let supplied = false;
  try {
    await feishu({
      options: { user: "ou_security_fixture", lark: program },
      signal: AbortSignal.any([stop.signal, AbortSignal.timeout(5_000)]),
      log: (line) => logs.push(line),
      hub: {
        async nextCard() {
          if (!supplied) {
            supplied = true;
            return { card };
          }
          if (mode === "listener") {
            for (let i = 0; i < 100 && !answers.length; i++) {
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
          stop.abort();
          return { card: null };
        },
        async failed(...args) {
          failures.push(args);
          return {};
        },
        async delivered(...args) {
          delivered.push(args);
          return {};
        },
        async answer(...args) {
          answers.push(args);
          return { changed: true };
        },
      },
    });
    const observed = { logs, failures, delivered, answers };
    writeFileSync(join(folder, "observed.json"), JSON.stringify(observed, null, 2));
    return observed;
  } finally {
    stop.abort();
    if (!process.env.FEISHU_SECURITY_EVIDENCE) rmSync(folder, { recursive: true, force: true });
  }
}

test("飞书命令退出失败时保留操作名与退出码，不泄露私密参数和输出", async () => {
  const observed = await exercise("exit");
  assert.equal(observed.failures.length, 1);
  assert.deepEqual(observed.delivered, []);
  assert.doesNotMatch(JSON.stringify(observed), new RegExp(`${PRIVATE}|${OUTPUT}|--content|--user-id|fake-lark`));
  assert.match(String(observed.failures[0][2]), /im \+messages-send/);
  assert.match(String(observed.failures[0][2]), /7/);
});

for (const [mode, name] of [
  ["json", "接口错误"],
  ["json-string-code", "接口错误码含私密文字"],
  ["malformed", "响应格式无效"],
  ["null", "响应为空对象值"],
  ["signal", "进程被信号终止"],
]) {
  test(`飞书${name}时仅报告安全状态，并继续向中台上报失败`, async () => {
    const observed = await exercise(mode);
    assert.equal(observed.failures.length, 1);
    assert.deepEqual(observed.delivered, []);
    assert.doesNotMatch(JSON.stringify(observed), new RegExp(`${PRIVATE}|${OUTPUT}|--content|--user-id|fake-lark`));
    const failure = String(observed.failures[0][2]);
    assert.match(failure, /im \+messages-send/);
    if (mode === "json") assert.match(failure, /code=99991663/);
    // Windows has no signals: a program that ends itself there is seen as one that left with a code.
    if (mode === "signal" && process.platform !== "win32") assert.match(failure, /signal=SIGTERM/);
  });
}

test("飞书更新失败时不回显卡片输入和命令诊断内容", async () => {
  const observed = await exercise("exit", "om_security");
  assert.equal(observed.failures.length, 1);
  assert.deepEqual(observed.delivered, []);
  assert.doesNotMatch(JSON.stringify(observed), new RegExp(`${PRIVATE}|${OUTPUT}|--data|fake-lark`));
  assert.match(String(observed.failures[0][2]), /im messages patch/);
});

test("飞书监听诊断不回显原始输出，正常回调和发送继续生效", async () => {
  const observed = await exercise("listener");
  assert.deepEqual(observed.failures, []);
  assert.deepEqual(observed.delivered, [[71, 1, "om_security"]]);
  assert.deepEqual(observed.answers, [[71, { by: "ou_security_fixture", ref: "om_security", choice: 0 }]]);
  assert.ok(observed.logs.some((line) => line.includes("event consume")));
  assert.doesNotMatch(JSON.stringify(observed), new RegExp(`${PRIVATE}|${OUTPUT}|fake-lark`));
});
