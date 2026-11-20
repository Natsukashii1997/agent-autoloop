# 当前状态

更新：2026-11-20。agent-autoloop 已转为常浩自己的项目，刚铺好协作骨架。唯一下一步：常浩决定批 4（`agent-autoloop update`、一键安装和文档里的链接指向谁）。

## 转为自有项目，铺协作骨架（2026-11-20，Claude，常浩回「改，转自有」并在问题卡里逐项选定分支四项；本节 PR 未合并、无需发布）

- 时间：开工 `2026-11-20 15:15`（`date '+%F %H:%M'` 记录）。来由：跨项目复盘挂起 3（返工最多的仓库没有钩子、LESSONS 和分支保护）；常浩同日改定这个仓库不再跟上游，像驿窗一样自己深度开发、自己使用。
- 改了哪些文件：
  - 新建 `NOTICE`（出处 v1.8.5 `d3a44ca`，MIT，不再同步上游）、`CURRENT.md`（本文件）、`docs/LESSONS.md`（L-01～L-06，从本月返工提炼）、`docs/DECIDED.md`（登记 11-20 改定）、`docs/OPERATIONS.md`、`docs/templates/handoff.md`、`docs/agents/`（issue 看板、分流标签、领域文档）、`scripts/check-rules.mjs` 与 `tests/check-rules.test.mjs`、`scripts/hooks/`（commit-msg、pre-push）与 `tests/hooks.test.mjs`、`tests/handoff-format.test.mjs`。这些都来自 project-starter 0.5.0（my-skills `7930db2`），网页基线截图三件不适用，没铺。
  - `AGENTS.md`：最前面加入口、导航表、运行、Agent skills、证据与交接；原来的开发规矩放在「维护约定」下面，原文没改。
  - `scripts/check-rules.mjs` 按本项目改：扫描目录改成 `bin cli host kernel plugins protocol worker`；依赖白名单改成 `@types/node`、`prettier`、`typescript`；不用骨架的「只监听 127.0.0.1」「入口校验来源」两条（中台可按配置部署到服务器，入口靠密钥鉴权）；G-08 那条不报文件里赋过值的变量（原来在 `scripts/ci-scope.sh`、`scripts/install-smoke.sh` 误报 4 处）。`tests/check-rules.test.mjs` 的样本跟着改。
  - `scripts/hooks/pre-push`：测试命令改成 `npm run format:check && npm run typecheck && npm run test:quick && node --test tests/*.test.mjs`。
  - `tests/channels.test.ts` 第 305 行：飞书 U+2028 用例等点击的上限从 2 秒改为 20 秒（全量并发跑时两次卡在 2 秒失败，会拦住每次推送，见 L-06）。
  - `.github/workflows/check.yml`：每次都先跑 `node scripts/check-rules.mjs && node --test tests/*.test.mjs`（文档改动也跑，因为交接格式和 LESSONS 检查读的就是文档）。
- 测试：`npm run format:check && npm run typecheck` 退出码 0；`npm run test:quick` 原样结果 `ℹ tests 808` / `ℹ pass 787` / `ℹ fail 0` / `ℹ skipped 21`（改上限前 `ℹ fail 1`）；`node --test tests/*.test.mjs` `ℹ pass 11` / `ℹ fail 0`；`node scripts/check-rules.mjs` 输出「通用规则检查通过」。日志在 `~/Library/Application Support/agent-autoloop/evidence/2026-11-20-starter/`。
- 验证环境：真实，本机 macOS（检查和测试在本 worktree 里跑；钩子从 worktree 真推一次，见 PR）；CI 结果以 PR 检查为准。
- 外部前提与实测：GitHub 分支保护的检查名是 job 名加系统矩阵（`check (ubuntu-latest)`），只写 `check` 等不到；已在 #3 和 main 的检查记录里核对。
- 截图：无。
- 发布与回读：无需发布；本机中台仍是 v1.8.5 `d3a44ca`，没动。
- 与授权不一致之处、遗留问题、范围外发现：批 4 未做：`cli/update.ts`、`install.sh`、`install.ps1` 的 `PUBLISHED`、`package.json` 的 repository、README、INSTALL、SECURITY、CONTRIBUTING、issue 模板、`skills/agent-autoloop/SKILL.md` 里的链接仍指向上游，AGENTS「社区贡献」「怎么发版」两节仍是上游写法，这些都待常浩定。远端还留着未合并的 `codex/audit-fix-1118`（#1，安全审计修复，关闭未合并）。
- 本轮新坑：L-06。
