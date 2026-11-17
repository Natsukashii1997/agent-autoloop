// Failure mode: concurrent configuration writers share config.json.tmp, lose the rename, or publish partial JSON.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { setup } from "./helpers.ts";

const home = setup("config-concurrency");

test("并发配置写入不共用临时文件，每次成功写入都发布完整 JSON", async () => {
  const module = new URL("../host/config.ts", import.meta.url).href;
  const barrier = join(home, "go");
  const jobs = Array.from({ length: 6 }, (_, writer) => {
    const script = `
      import { existsSync } from 'node:fs';
      import { writeConfig } from ${JSON.stringify(module)};
      while (!existsSync(${JSON.stringify(barrier)})) await new Promise(r => setTimeout(r, 5));
      for (let i = 0; i < 25; i++) writeConfig({ url: 'https://hub.test', owner: '${writer}:' + 'x'.repeat(65536) });
    `;
    const child = spawn(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, AGENT_AUTOLOOP_HOME: home },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let error = "";
    child.stderr.on("data", (part) => (error += part));
    return new Promise<{ code: number | null; error: string }>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, error }));
    });
  });
  writeFileSync(barrier, "go");
  const results = await Promise.all(jobs);
  assert.deepEqual(
    results.filter(({ code }) => code !== 0),
    [],
  );
  const config = JSON.parse(readFileSync(join(home, "config.json"), "utf8"));
  assert.equal(config.url, "https://hub.test");
  assert.match(config.owner, /^[0-5]:x{65536}$/);
});
