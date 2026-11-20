# 当前状态

更新：2026-11-20。agent-autoloop 已转为常浩自己的项目。唯一下一步：常浩决定合不合 #8（回答核版本）和 #9（重新送）的两个 PR，先 #8 后 #9；合了之后升级本机中台另行单独问。此前挂着的另一件：常浩决定批 4（`agent-autoloop update`、一键安装和文档里的链接指向谁）。

## 本人入口「重新送」：放弃送达的卡片一条命令恢复（2026-11-20，Claude，常浩在会话「数字分身｜框架对照与路径评审」回「按计划开工」；已提交、PR 未合并、无需发布）

- 时间：开工 `2026-11-20 18:15`（这一批开工时没有单独跑 `date`；按批 A 那次 `date '+%T'` 输出 `18:14:46` 的进度检查之后才开始写批 B 的测试推定）。来由：数字分身「引擎自有后可解开的限制」第 2 项，本仓库 #9。卡片在一个通道上试满 9 次（约 57 分钟）就永久放弃，提问卡没有恢复入口。本分支接在 #8 的分支上（改同一批文件），#8 先合。
- 改了哪些文件：
  - `kernel/decide.ts`：加输入 `redeliver`。清零那几行从 `tell` 里抽成 `tryAgain`，两处共用；`nextCard` 里「还值不值得发」的判断抽成 `worthSending`，`redeliver` 用它和 `reachesChannel` 只挑还会发的放弃通道。`tell` 再说一遍照旧清全部。放弃的规则没动。
  - `kernel/http.ts`：`POST /v1/cards/<编号>/redeliver`，只认本人的密钥，不读请求内容。
  - `protocol/client.ts`：`redeliver(card)`。`protocol/conformance.ts`：门清单加一行（别的钥匙都是 401）。
  - `cli/main.ts`：帮助、参数表、`redeliver` 命令；`resolve` 的注释留在它上面。没加进 `cli/mcp.ts`。
  - `tests/cards.test.ts`、`tests/http.test.ts`（含真命令行子进程）、`tests/cli-flags.test.ts`、`tests/hub.ts`。
  - `docs/protocol.md`（通道、本人、谁能做什么）、`docs/state-machines.md`、`skills/agent-autoloop/SKILL.md`、`docs/DECIDED.md`。
- 测试：先写的三处测试在实现前失败（`不认识的输入：redeliver` 等），实现后通过。在 `9240abe`（变基后是 `890800d`，内容相同）上：`npm run format:check`、`npm run typecheck` 退出码 0；`npm test` 原样结果 `ℹ tests 818` / `ℹ pass 797` / `ℹ fail 0` / `ℹ skipped 21`；`npm run test:nightly`（含 `test:deep` 和基准）`ℹ pass 2` / `ℹ fail 0`，`{"total":34,"killed":34,"survived":[],"invalid":[],"ratio":1}`，基准里 20 万步模拟跑完；`node --test tests/*.test.mjs` `ℹ pass 12` / `ℹ fail 0`；`node scripts/check-rules.mjs` 输出「通用规则检查通过」。之后的 `b4bd77c` 只改了命令行一句文案和协议文字，重跑 `tests/http.test.ts tests/cards.test.ts tests/cli-flags.test.ts` `ℹ pass 90` / `ℹ fail 0`，没有重跑全量。日志在 `~/Library/Application Support/agent-autoloop/evidence/2026-11-20-redeliver/`。加本节之后的检查结果见 PR。
- 验证环境：替身（测试夹具：临时 `AGENT_AUTOLOOP_HOME`、本机回环上的真 HTTP 服务、对着它跑的真命令行子进程、内存里的模拟）；未在真实环境验证：本机在跑的中台没升级、没碰，没有拿一张真的放弃了的卡片和真实通道试过重新送。
- 外部前提与实测：无。「合盖睡一夜、醒来就超窗放弃」是读代码的推断，没有实测。
- 截图：无。
- 发布与回读：无需发布；本机中台仍是 v1.8.5 `d3a44ca`，没动。
- 与授权不一致之处、遗留问题、范围外发现：授权内；有一处是实施时我收窄的，常浩没单独定过：重新送只重启还会发的放弃通道，不会发的（卡片已答完又从没送到过、仅告知过了一天、通道已不在卡片范围）不清也不报「重新送了」，否则命令会说在重新送、实际永远不发。独立审查两轮（没写这段代码的 Claude 子 agent，审的是 `fb52344` 和 `9240abe`，变基后是 `a1bbf01`、`890800d`）结论都是「可以合并，无必须修」，顺手能改的已改。记下来、没在这批动的：重新送之后 `doctor` 在通道领走前会显示「试了 0 次」（清零时没清上次的失败原因，清了 `doctor` 就不提这张卡了）；`doctor` 每个通道只报编号最大的那张没送到的卡，更早放弃的看不出来；`delivered` 不清放弃标记，迟到的送达报告会留下「已送到但仍标放弃」的记录，这时重新送会回 `changed: true` 但当下没东西可发（原有行为，重新送之后卡片再变化就能发出）；`doctor` 的提示没有带上 `redeliver` 这条命令（改 `doctor` 输出是改已有行为，没动）。已登记 DECIDED.md。
- 本轮新坑：无。

## 回答卡片可以带上看到的版本，对不上就拒绝（2026-11-20，Claude，常浩在会话「数字分身｜框架对照与路径评审」回「按计划开工」；已提交、PR 未合并、无需发布）

- 时间：开工 `2026-11-20 17:57`（`date '+%F %H:%M'` 记录）。来由：数字分身「引擎自有后可解开的限制」第 1 项，本仓库 #8。开着的卡片版本今天恒为 1，这一改堵不住正在发生的问题，换来的是接口保证。
- 改了哪些文件：
  - `kernel/decide.ts`：`answer` 里加版本核对。顺序是：卡片存在 → 通道核对回答人和消息号（401）→ `version` 格式（400）→ 卡片不开着回 `changed: false` → 版本不一致（409）→ 其余照旧。被拒的不写事实。
  - `kernel/http.ts`：通道和本人两条路把请求里的 `version` 转给内核；卡片链接不转。
  - `protocol/client.ts`、`protocol/schema.json`：`answer` 多一个可选的 `version`。`protocol/conformance.ts`：多问一张卡，专门验 409、400 和带对版本算数；原来不带版本的那几步没动。
  - `sim/mutate.ts`：加变异 `answer-version`。
  - `tests/cards.test.ts`、`tests/http.test.ts`：各加一条；`tests/hub.ts` 的类型跟着加。
  - `docs/protocol.md`（通道、本人两节）、`docs/plugins.md`、`docs/state-machines.md`、`docs/DECIDED.md`。
  - 没动 `kernel/evolve.ts`、`cli/`、`plugins/`：命令行、MCP、自带飞书通道、卡片链接都不带版本，行为不变（MCP 的工具参数不认识 `version`，会直接拒掉）。
- 测试：先写的两条测试在实现前失败（`Missing expected exception (Conflict)`、`200 !== 409`），实现后通过。在 `c7d7289` 上：`npm run format:check`、`npm run typecheck` 退出码 0；`npm test` 原样结果 `ℹ tests 815` / `ℹ pass 794` / `ℹ fail 0` / `ℹ skipped 21`；`npm run test:deep` `ℹ pass 2` / `ℹ fail 0`，其中 `answer-version: 抓到`，`{"total":34,"killed":34,"survived":[],"invalid":[],"ratio":1}`；`node --test tests/*.test.mjs` `ℹ pass 12` / `ℹ fail 0`；`node scripts/check-rules.mjs` 输出「通用规则检查通过」。日志在 `~/Library/Application Support/agent-autoloop/evidence/2026-11-20-answer-version/`（`interrupted-1801/` 是被应用重启打断的那次，不算数）。加本节之后只重跑了 `.mjs` 测试和规则检查，结果见 PR。
- 验证环境：替身（测试夹具：临时 `AGENT_AUTOLOOP_HOME`、本机回环上的真 HTTP 服务、内存里的模拟）；未在真实环境验证：本机在跑的中台没升级、没碰，真实飞书通道和数字分身的回答路径都没带着版本跑过。
- 外部前提与实测：无。使用方要注意的一条：老中台不认识 `version`，会当没带一样照答，所以数字分身带版本之前要先升中台。
- 截图：无。
- 发布与回读：无需发布；本机中台仍是 v1.8.5 `d3a44ca`，没动。
- 与授权不一致之处、遗留问题、范围外发现：授权内。独立审查（没写这段代码的 Claude 子 agent，审的是 `1e988e0`）结论「可以合并，无必须修」，它提的两条跟进已在 `c7d7289` 做了。记下来、没在这批动的：`delivered`、`failed` 对 `version` 只查是不是整数，0 和负数也放行，和 schema 的 `minimum: 1` 不一致（原有）；`tell` 再说一遍会换内容但不涨版本（只影响创建即结案的仅告知通知）；本人 `resolve` 不核版本（范围外）。已登记 DECIDED.md。
- 本轮新坑：无。

## 转为自有项目，铺协作骨架（2026-11-20，Claude，常浩回「改，转自有」并在问题卡里逐项选定分支四项；本节 PR 未合并、无需发布）

- 时间：开工 `2026-11-20 15:15`（`date '+%F %H:%M'` 记录）。来由：跨项目复盘挂起 3（返工最多的仓库没有钩子、LESSONS 和分支保护）；常浩同日改定这个仓库不再跟上游，像驿窗一样自己深度开发、自己使用。
- 改了哪些文件：
  - 新建 `NOTICE`（出处 v1.8.5 `d3a44ca`，MIT，不再同步上游）、`CURRENT.md`（本文件）、`docs/LESSONS.md`（L-01～L-06，从本月返工提炼）、`docs/DECIDED.md`（登记 11-20 改定）、`docs/OPERATIONS.md`、`docs/templates/handoff.md`、`docs/agents/`（issue 看板、分流标签、领域文档）、`scripts/check-rules.mjs` 与 `tests/check-rules.test.mjs`、`scripts/hooks/`（commit-msg、pre-push）与 `tests/hooks.test.mjs`、`tests/handoff-format.test.mjs`。这些都来自 project-starter 0.5.0（my-skills `7930db2`），网页基线截图三件不适用，没铺。
  - `AGENTS.md`：最前面加入口、导航表、运行、Agent skills、证据与交接；原来的开发规矩放在「维护约定」下面，原文没改。
  - `scripts/check-rules.mjs` 按本项目改：扫描目录改成 `bin cli host kernel plugins protocol worker`；依赖白名单改成 `@types/node`、`prettier`、`typescript`；不用骨架的「只监听 127.0.0.1」「入口校验来源」两条（中台可按配置部署到服务器，入口靠密钥鉴权）；G-08 那条不报文件里赋过值的变量（原来在 `scripts/ci-scope.sh`、`scripts/install-smoke.sh` 误报 4 处）。`tests/check-rules.test.mjs` 的样本跟着改。
  - `scripts/hooks/pre-push`：测试命令改成 `npm run format:check && npm run typecheck && npm run test:quick && node --test tests/*.test.mjs`；另外把 git 放进 PATH 的 libexec 和 `GIT_EXEC_PATH` 去掉（第一次真推时 3 条安装测试只在钩子里失败，见 L-07），`tests/hooks.test.mjs` 加一条复现用例。
  - `tests/channels.test.ts` 第 305 行：飞书 U+2028 用例等点击的上限从 2 秒改为 20 秒（全量并发跑时两次卡在 2 秒失败，会拦住每次推送，见 L-06）。
  - `.github/workflows/check.yml`：每次都先跑 `node scripts/check-rules.mjs && node --test tests/*.test.mjs`（文档改动也跑，因为交接格式和 LESSONS 检查读的就是文档）。
- 测试：`npm run format:check && npm run typecheck` 退出码 0；`npm run test:quick` 原样结果 `ℹ tests 808` / `ℹ pass 787` / `ℹ fail 0` / `ℹ skipped 21`（改上限前 `ℹ fail 1`）；`node --test tests/*.test.mjs` `ℹ pass 11` / `ℹ fail 0`；`node scripts/check-rules.mjs` 输出「通用规则检查通过」。日志在 `~/Library/Application Support/agent-autoloop/evidence/2026-11-20-starter/`。
- 验证环境：真实，本机 macOS（检查和测试在本 worktree 里跑；钩子从 worktree 真推一次，见 PR）；CI 结果以 PR 检查为准。
- 外部前提与实测：GitHub 分支保护的检查名是 job 名加系统矩阵（`check (ubuntu-latest)`），只写 `check` 等不到；已在 #3 和 main 的检查记录里核对。
- 截图：无。
- 发布与回读：无需发布；本机中台仍是 v1.8.5 `d3a44ca`，没动。
- 与授权不一致之处、遗留问题、范围外发现：批 4 未做：`cli/update.ts`、`install.sh`、`install.ps1` 的 `PUBLISHED`、`package.json` 的 repository、README、INSTALL、SECURITY、CONTRIBUTING、issue 模板、`skills/agent-autoloop/SKILL.md` 里的链接仍指向上游，AGENTS「社区贡献」「怎么发版」两节仍是上游写法，这些都待常浩定。远端还留着未合并的 `codex/audit-fix-1118`（#1，安全审计修复，关闭未合并）。
- 本轮新坑：L-06、L-07。
