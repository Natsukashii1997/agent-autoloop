// Failure mode: an HTTP 200 proxy error page is treated as acceptance and the worker drops its saved result.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { HubError, hubClient } from "../protocol/client.ts";

test("中台返回成功状态但没有 JSON 确认时，结果保持可重试", async () => {
  let body = "<html>proxy unavailable</html>";
  const server = createServer((req, res) => {
    req.resume();
    res.writeHead(200, { "content-type": "application/json" }).end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const hub = hubClient(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, "fake");
    for (const invalid of [
      "<html>proxy unavailable</html>",
      "",
      "null",
      "true",
      "[]",
      "{}",
      '{"error":"proxy"}',
      '{"rejected":null}',
    ]) {
      body = invalid;
      await assert.rejects(hub.result(1, "fake-run", { outcome: "done" }), (error: unknown) => {
        assert.ok(error instanceof HubError);
        assert.equal(error.status, 502, "worker treats this as unconfirmed and keeps its saved result");
        return true;
      });
    }
    body = '{"rejected":[]}';
    assert.deepEqual(await hub.result(1, "fake-run", { outcome: "done" }), { rejected: [] });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
