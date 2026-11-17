# agent-autoloop 安全审计 11-18

本轮目标是审计、隔离复现、修复获授权的高危及小范围中危、提交分支并创建 PR；不合并、不部署。审计发现不代表已发生线上攻击。已复现行为、静态疑点、修复验证和真实运行采用分别记录。

## 基线、权限与当前交付

- 仓库：`Natsukashii1997/agent-autoloop`，本轮核实为私人仓库；上游链接仅用于说明来源，不向上游提交本报告。
- 按明确要求从 `origin/main` 创建 `codex/audit-fix-1118`，基线 `8e96e1c8faa5238f873b4ab3721c281a2d13338e`。仓库默认分支是 `dt`，本 PR 明确以 `main` 为目标，不采用默认分支。
- 独立 worktree：`~/Sandbox/2026-11-17-codex-quota/wt/agent-autoloop`。主目录原为 `dt`，初始 HEAD `d3a44ca`，初始工作区干净；未改其文件、分支或运行配置。
- 已读项目 `AGENTS.md`、`README.md`、`SECURITY.md`、`CONTRIBUTING.md`、协议、架构及全局 G-01/G-03/G-04。要求中的 `CURRENT.md`、`docs/LESSONS.md` 实际不存在，未伪造或补建。
- 项目“审计先交清单、不默认当批全修”由本轮明确修复授权覆盖；“清临时分支”等批次收尾规则由本轮“保留分支、不合并”的明确要求覆盖。
- 测试仅用临时 HOME、随机回环端口、虚构密钥、假 CLI、本地 Git 资料。`npm ci --ignore-scripts --no-audit --no-fund` 只写本次 worktree 的开发依赖，没有安装服务、激活 Skill 或执行安装钩子。
- 本轮未连接真实飞书监听、读取真实业务资料、启动模型 CLI、修改本机运行配置或重启服务；GitHub 写入仅限指定分支和本 PR。

## 结论

确认 **9 项：高 2、中 7、低 0**。修复 **4 项（高 1、中 3）**；其余 **5 项（高 1、中 4）** 因需改变现有行为或策略，按原简报保留到“需常浩决定”。另有 5 项待核实，不混入确认数量。未修高危 H-02 单独保留，不能称“高危全部清零”或“安全验收通过”。

| 编号 | 严重度 | 发现 | 本轮处理 |
|---|---|---|---|
| H-01 | 高 | 被通道范围排除的身份可伪造送达并回答卡片 | 已修复，红绿测试 |
| H-02 | 高 | 命令父进程退出后，存活子进程失去跟踪 | 需决定，未修 |
| M-01 | 中 | HTTP 200 无效确认被当成结果已接收 | 已修复，红绿测试 |
| M-02 | 中 | 飞书 CLI 失败将正文和命令参数复制到日志 | 已修复，红绿测试 |
| M-03 | 中 | 异常邮箱分页被当成完整读取 | 需决定，未修 |
| M-04 | 中 | 完整检查不验证预期矩阵成员齐全 | 需决定，未修 |
| M-05 | 中 | 交付轮询读取失败输出成功空结果 | 需决定，未修 |
| M-06 | 中 | 审查凭据未绑定 main 审查要求内容 | 需决定，未修 |
| M-07 | 中 | 并发写配置共用临时文件，互相干扰 | 已修复，红绿测试 |

## 已确认发现与修复证据

以下文件行号以基线为准；修后文件位于审计分支。所有证据相对目录均为 `evidence/agent-autoloop/`，与本报告同在 audits 目录下。

### H-01 高：通道越过限定范围伪造送达并代答

**位置**：`kernel/decide.ts:816` 的 delivered，及 `:519` 的 answer；`nextCard` 在 `:559` 已应用范围限制。

**条件**：持有有效的另一个通道密钥，知道或猜中卡片序号；该通道被 `defaultChannels` 或规则的 `channels` 排除。不是无凭据远程攻击。answer 只核对该通道提供的 ref 与其送达记录，但 delivered 原来允许任意通道为任意已有卡片创建记录。

**复现**：新增 `tests/channel-scope.test.ts`，将默认通道限定为 chat，plain 领不到卡片；通过生产 HTTP handler 用 plain 密钥先提交 delivered，再以同一伪造 ref 回答。首次未修实现结果原样为：

```text
actual: { delivery: 200, answer: 200, state: 'decided' }
expected: { delivery: 401, answer: 401, state: 'open' }
ℹ tests 1
ℹ pass 0
ℹ fail 1
```

**影响**：不在该卡片范围的通道可代答，可能触发后续操作，破坏人工决策入口。未实际执行危险业务操作。

**修法**：共用通道范围判断；没有既有投递记录、且被当前范围排除的 delivered 返回 401，不写事实。保留已领取的在途回报，避免规则调整后丢失正常送达。未改变字段、有效请求或已在途行为，也不把通道密钥升级成本人权限。

**验证**：`channel-scope-red.log` 留首败；`channel-scope-final.log` 为 3/3 通过，覆盖默认范围、规则范围优先和在途回报。`channel-scope-green.log` 是同时回归 cards/http 的 52/52 通过。

### H-02 高：父进程退出后仍活着的子进程失去跟踪

**位置**：`worker/worker.ts:469`、`:472` 直接 conclude；`:516` 至 `:528` 接收确认后删除 entry。

**条件**：普通 command 启动同进程组子进程，父进程退出而子进程继续运行。不是停止路径：停止路径已有 groupAlive 与 TERM/KILL。

**复现**：`plugins/probe.mjs` 启动无害 Node 父子进程，父打印完成并退出；真实 createWorker 与 command 插件实际结果：

```json
{"result":{"outcome":"done","summary":"本地父进程完成"},"remainingEntries":0,"childAliveAfterResult":true,"childInRunGroup":true}
```

**影响**：完成已上报、跟踪入口已删除，残留进程仍可能写文件或持有资源；同事项后续任务可能并发。生产发生频率未知。探针产生的进程已结束清理。

**建议修法**：普通退出也核实进程组，保留结果，确认收尾后再删除跟踪；无法确认时保留未知状态。需要决定后台任务是否允许脱离一轮，见后文。本轮未改 Worker。

**证据**：`plugins/output.json`、`plugins/REPORT.md`，原脚本 `plugins/probe.mjs`。当前脚本会同时检验其他插件，复查基线行为时请在基线 checkout 运行，避免覆盖原始 output。

### M-01 中：无效 HTTP 成功响应导致结果未确认即丢弃

**位置**：`protocol/client.ts:24` 至 `:31`；传播到 `worker/worker.ts:516` 至 `:528`。

**条件**：代理、错误中台或链路返回 HTTP 200，但正文是 HTML、空内容、null 或没有回执确认字段的 JSON。原 client 忽略 JSON 解析错误返回 null，worker 对无异常返回即按接收处理。无需伪造真正中台状态即可制造“确认”假象；正常 HTTPS 与受信地址可降低触发面。

**复现**：`tests/client-response.test.ts` 用随机回环 HTTP 服务返回这些响应，调用真实 hubClient.result。首败 `client-response-red.log` 原样 `AssertionError [ERR_ASSERTION]: Missing expected rejection.`；进一步的空对象确认缺失由 `client-ack-red.log` 单独先失败验证。

**影响**：本地已保存结果可能被删除，而服务端没有接受，或 CLI 对错误页误报成功。尚未证明真实部署存在这样的代理。

**修法**：成功响应必须是有效 JSON 结构（保留 why 的合法数组），提交结果还必须是含 rejected 数组的对象；否则抛可重试的 HubError(502)，沿用 Worker 已有的保留结果分支。错误不回显响应正文。有效确认仍正常返回；不修改服务端协议。

**验证**：`client-response-final.log` 为 1/1 通过，覆盖 8 种无效确认及有效确认。拒收的仅是协议无效响应。

### M-02 中：飞书失败日志带出完整卡片正文

**位置**：`plugins/feishu/channel.ts:107` 至 `:110` 直接传播 execFile 错误，`:128` 至 `:131` 参数含正文，`:163` 至 `:165` 写日志及 hub.failed。

**条件**：发送或更新 CLI 非零退出、被信号终止，或 CLI 的 JSON 错误/畸形输出回显资料。Node 的进程错误自带命令和参数。事件监听 stderr 和解析失败也存在原文传播路径。

**复现**：本地假 lark-cli 只打印 FAKE_FAILURE 并退出 1；真实通道把虚构正文 FAKE_PRIVATE_CARD_TEXT 写入日志和失败报告。`plugins/output.json` 确认 `privateTextInLog=true`、`privateTextInFailure=true`。新增专项测试在未修实现上先失败。

**影响**：标题、正文、选项、身份标识及可能含敏感参数的 URL 被额外复制到运维日志和中台失败记录。内核 failed 只截断 300 字，不能作为脱敏，host/state 会展示最近失败。未声称读取到真实 token，也未将本地私有日志等同于公开泄露。

**修法**：只保留可信操作名、有限结构化退出码和信号；不传播 Error.message、argv、stdout/stderr、API 错误正文或畸形 JSON。发送、更新、监听、回调和失败上报保持原调用方式，不引入 CLI 新参数。

**验证**：`plugins/feishu-security-red.log` 留首败；`plugins/feishu-security-green-final.log`（含既有通道回归 21/21 通过）及 `independent-validation/final-targeted-green.log`（13 项新增测试加 why 共 16/16 通过），最终全量结果见验证节。覆盖退出码、信号、JSON 错误、畸形输出、更新失败与正常回调。没有调用真实飞书服务。

### M-03 中：邮箱异常分页误报完整或无邮件

**位置**：`examples/recipes/inbox-triage/collect.ts:106` 至 `:114`。

**条件**：has_more=true，但页面为空或缺少有效 page_token。

**复现与结果**：`plugins/probe.mjs` 的假 lark-cli 分别返回空页+下一页、空页+缺 token，均退出 0 并打印“没事可做：24 小时内没有需要看的邮件”；一封虚构邮件+has_more=true+缺 token 时，退出 0、发 inbox.ready，scanned={"summaries":1,"complete":true}。

**影响**：不完整的上游结果被解释成完整或没有新邮件。没有证据说明当前真实接口常返回这种异常。

**建议修法**：只有可信分页终止条件才标 complete；异常分页保留不完整状态或明确失败。现有实现注释明确规定空页终止，既有测试还接受重复 token 到扫描上限，因此需确定兼容策略，本轮未改。证据 `plugins/output.json`、`plugins/REPORT.md`。

### M-04 中：完整检查不核对预期矩阵完整性

**位置**：`plugins/delivery/delivery.ts:83` 至 `:109`，重点 `:105`；项目三系统要求见 AGENTS.md 和 `.github/workflows/check.yml:17`。

**条件**：同 SHA 的成功 pull_request workflow，jobs 只有成功的 check (ubuntu-latest)，缺 macOS/Windows。函数只要求匹配名称的 jobs 非空且全部成功。

**复现**：`delivery/probe.mjs` 调用生产 fullCheck，实际 `F1 single of three OS jobs: passed`。

**影响**：项目原定检查被削减后，插件仍可进入合并判断。利用需要 PR/交付权限，并受审查和 GitHub 平台规则影响；不是匿名直接合并。

**建议修法**：在可信 main 配置绑定完整 required jobs 集合，逐项核对；必要时平台 required workflows 配合。涉及新配置和现有单 job 项目兼容，本轮不硬编码三个系统。证据 `delivery/results-verified.txt`、`delivery/AUDIT.md`。

### M-05 中：交付标签读取失败输出成功空扫描

**位置**：`plugins/delivery/poll.ts:55` 至 `:64`。

**条件**：--dispatch 模式一个或全部仓库的 gh 读取失败。

**复现**：PATH 首位的假 gh 退出 1，运行真实 poll.ts --dispatch example/app。原样结果：

~~~text
F2 exit: 0
stdout: 看过了，0 件待处理

```agent-autoloop
{"events":[]}
```

stderr: example/app 的交付标签暂时读不到，下轮再查
~~~

**影响**：上游回执无法区分“扫描失败”和“没有任务”，可能漏派与误报健康。本模块未见推进持久游标的证据。

**建议修法**：成功仓库继续产出，失败仓库结构化记 unknown；全部失败应明确失败。本仓库当前明确使用逐仓库失败不影响其他仓库的策略，改变退出语义会影响重试和通知，列需决定。证据同 delivery 目录。

### M-06 中：审查凭据未绑定最新审查要求

**位置**：`plugins/delivery/review.ts:134` 至 `:147`、`:268` 至 `:282`，关联 `review-policy.ts:78` 至 `:96`。

**条件**：PR 已审过，main 的 review.points 内容变化，但审查器命令、模型和深度不变，PR 没有新增待审提交。

**复现**：隔离 Git 仓库和无害假审查器；第一次 production reviewDelivery 返回 []，只改 main 的 AGENTS.md 审查要点，再 verifyOnly 仍返回 []，审查器累计调用 1 次。

**影响**：新增安全要求无法触发旧 PR 按新标准重审。现有 main 配置仍被读取，但旧结果可复用；未证明真实 PR 已因此误合并。

**建议修法**：将可信审查要求和相关策略摘要绑定凭据，变化后重审完整 PR 差异。当前约定按提交增量审、避免重复审且有三轮限制，改变缓存键与重审规则涉及成本/行为决定，本轮不改。证据同 delivery 目录。

### M-07 中：配置并发写入复用同一个临时文件

**位置**：`host/config.ts:47` 至 `:50`。

**条件**：多个进程同时调用 writeConfig 写同一隔离 HOME。同步函数仅阻止单进程重入，不能隔离不同进程。

**复现**：`tests/config-concurrency.test.ts` 启动 6 个本地写入者，每个 25 次发布含虚构标记的配置。未修实现实际多个子进程退出 1：`Error: ENOENT: no such file or directory, rename '.../config.json.tmp' -> '.../config.json'`。

**影响**：一个写入者会搬走另一人的临时文件，后者失败；共享临时文件还会使发布者与内容对应关系不可靠。未证明当前业务有频繁并发调用，也未把本地可写配置视为远程入口。

**修法**：每次使用随机独立临时文件，以 wx/0600 创建；写完同目录 rename，finally 清理自己的临时文件。不加全局锁，不改配置结构，仍是最后完成的写入生效。未声称做到多文件事务或断电持久性。

**验证**：`config-concurrency-red.log` 先失败，`config-concurrency-green.log` 1/1 通过；终态 JSON 完整且只包含一个写入者的完整标记。

## 需常浩决定（未修项，不阻止本轮提交审计 PR）

1. **H-02，优先处理**：推荐父进程退出后收尾同组子进程，确认结束再上报完成。代价是目前依赖普通 command 启动后台任务后退出的规则会被终止。备选是明确允许脱离的可信规则配置，但要定义谁负责停止和追踪。需要决定允许哪种生命周期，不能直接一刀切。
2. **M-03**：推荐异常分页直接失败并保留旧快照；如允许空页继续翻，需要分页 token 的真实文档或脱敏响应证明，以及循环/终止定义。会改变现有“空页结束”的行为。
3. **M-04**：推荐可信 main 显式列 required jobs，不把本仓库的三系统矩阵强加所有使用方。需要决定配置形式与历史项目兼容方式。
4. **M-05**：推荐保留成功仓库事件、失败仓库记未知，全部读取失败才报失败。需要决定混合成功时的结果与告警方式，以免因一个仓库权限故障重复派发其他仓库。
5. **M-06**：推荐审查要点摘要变化使旧凭据失效；需要决定是否重置轮次上限以及对存量 PR 的重审成本。

这五项是本轮授权范围的明确例外，不擅自修、不另开大量 issue。本轮只交付可审阅 PR，不把“需决定”当成已批准实施。

## 待核实与验证边界

- **U-01：PR 正文直接进审查提示词**，`plugins/delivery/review.ts:147`、`:175`。隔离探针确认作者可控指令文本进入审查器 stdin，但没有调用真实模型，不能证明能诱导放行或执行工具。已有“资料”警示和默认只读沙箱。建议单独做不执行外部动作的对抗测试。
- **U-02：Windows 安装阶段 ACL 窗口**，`install.ps1:19`、`:28` 至 `:37`、`:48` 至 `:55`。静态上先创建目录并执行下载代码，再由程序收紧权限；共享可写安装目录可能被替换。没有 Windows 真机，默认目录 ACL 和可利用性未验证。安全文档与安装时序的差异只报告，不自行放宽规则。
- **U-03：启动与持久化 PID 之间的窗口**，`worker/worker.ts:225`、`:296` 至 `:305`。未在精确时点强杀 Worker，不能称已复现孤儿进程事故。需独立故障注入。
- **U-04：restore 多文件 rename 的崩溃窗口**，`cli/backup.ts:124` 至 `:150`。正常异常有回滚，复制阶段强杀保留旧文件；替换多个文件中途 SIGKILL 无 finally/回滚，可能留下不完整组合。没有本轮精确 kill 复现，不提高到确认发现；需决定恢复日志/事务标记设计后再测。WAL/FULL 事务保障不能外推到这些配置文件替换。
- **U-05：desktop 通道可能同样回显进程参数**，`plugins/desktop/channel.ts:69`、`:96` 至 `:97`。独立复核静态发现原始 execFile 错误流向日志/failed，argv 含卡片标题；未执行桌面通知或隔离假命令复现，作为待核实追加，不能声称飞书修复覆盖所有通道。
- Windows Job Object、Windows 原生 ACL、三平台真机、真实 GitHub 分支保护及真实飞书/模型未做本地验收；已有 CI 和模拟通过不代替这些。

## 覆盖、排除证据与供应链

- 主代理覆盖 kernel/host/protocol/cli 的 46 个源码/结构文件；清单及 SHA-256 在 `core-coverage.json`。逐模块检查入口校验、类型/字段上限、Bearer 身份隔离、运行 token、回执去重、通道身份与原消息、卡片 escaping/CSP/no-store、配置路径、进程命令、数据库写锁、投影重建、备份恢复及 MCP 身份。
- Worker/插件/场景独立审计覆盖 53 个文件、3438 行，逐文件清单与哈希在 `plugins/coverage.json`。delivery/安装/工作流独立审计覆盖 21 个文件，清单在 `delivery/AUDIT.md`。
- 未发现事件正文可直接改 agent/cwd/access/command；subject/link 限制在协议校验器，长文本只进资料。模型仍可能读到恶意资料，不承诺消灭提示注入。
- GitHub HMAC/GitLab token 在虚构密钥下拒绝未签名输入；来源由入口身份决定。插件名校验限制加载路径；插件本身是本机可信代码，不把安装插件当成沙箱。
- ACP 的 ../ 与符号链接越界探针被拒绝；会话用量文件名使用哈希；命令使用参数数组或逐参数引用；未发现事件文字直接拼 shell 的可复现路径。
- 轮次 token 由主密钥和轮次/执行序号派生，访问密钥只存哈希；stream/why 过滤 keys；主密钥坏形状拒绝启动。HTTP 有请求体上限、长轮询上限与密钥撤销复查。默认回环监听，外部监听需 HTTPS 代理。
- SQLite 使用 WAL/FULL、BEGIN IMMEDIATE，事实与投影同事务，重放不重新执行业务；并发写和恢复由现有测试验证。未把进程强杀通过等同断电恢复证明。
- delivery 只拿裸对象生成文字快照，不检出/执行 PR 代码、测试或 hooks；配置从 main 固定 SHA 读取；gh/通知通过 argv/stdin；健康请求拒绝跳转并校验版本；无复现证据支持“PR 可以直接本机 RCE”的结论。
- 没有运行时 dependencies；锁定 devDependencies，lockfile 有 registry URL 和完整性哈希。本轮 npm ci 禁用 scripts。`npm-audit.json` 实际返回 vulnerabilities total=0（high=0、critical=0），只表示该时刻 npm 公告数据库未报这些依赖漏洞，不是完整供应链安全证明。
- 工作流 permissions=contents:read，使用 pull_request，Action 固定完整 SHA。未核实组织管理员规则与 SHA 发布者身份，不据此保证平台配置正确。

## 测试、独立审查与收尾

以下状态由收尾时更新；原始输出不覆盖首败。

- 已有全量首轮：`npm test`，日志 `full-test.log`，原样 tests=811 / pass=790 / fail=0 / skipped=21。这轮已包含 H-01 最小修复，不包含后来新增的全部修复，不能作为最终版全量结论。
- 最终全量：纠正后的最终快照复验通过，见 `full-test-verified.log` 和 `full-test-verified.json`：exit_code=0、unchanged=true。原样结果如下。

```text
ℹ tests 823
ℹ suites 0
ℹ pass 802
ℹ fail 0
ℹ cancelled 0
ℹ skipped 21
ℹ todo 0
ℹ duration_ms 203649.0225
```

`full-test-final.log/json` 保留首轮最终集成失败：why 合法数组被过严校验拒绝，导致 3 项失败；已修正客户端并通过 why 专项，不修改既有测试预期。
- 夜间检查：`npm run test:nightly`，日志 `nightly.log`。强杀 1000/1000；33 项有效变异全部抓到，survived=[]、invalid=[]；基准已完成 20 万步模拟。原样 test:deep 汇总 tests=2 / pass=2 / fail=0。
- 类型、格式：`npm run typecheck` 退出 0（typecheck-final.log）；`npm run format:check` 退出 0，原样 `All matched files use Prettier code style!`（format-final.log）。`git diff --check` 通过。
- 独立审查：按 AGENTS 三问对最终 8 文件快照审查，报告 `independent-review.md`，`VERDICT: PASS`；独立基线红测、新实现绿测及 why 专项合跑 16/16 通过。审查不代替真实服务或 Windows 验收；最终提交号与结论写 PR。
- 本轮代码改动：host/config.ts、kernel/decide.ts、protocol/client.ts、plugins/feishu/channel.ts；各配新增专项测试。均属于你要求的审计修复；没有范围外顺手改动。
- 提交推送、PR 回读与 worktree 清理另在本机报告收尾记录；仓库中的本报告为审计与验证快照。本报告不把 PR 创建当合并，不把本地检查当运行副本采用。

## 最小使用说明

本次不需要安装或操作运行服务。查看 PR 的修复与未修项，优先决定 H-02 的子进程生命周期；未决定前不改现有 Worker 行为。开发复核在新的隔离 checkout 运行 `npm ci --ignore-scripts`，再执行 `npm test`、`npm run typecheck`、`npm run format:check`；涉及事实日志或并发时同时执行 `npm run test:nightly`。看到 tests=823、fail=0 是本机快照对应结果，平台差异需按 CI 实际结果判断。
