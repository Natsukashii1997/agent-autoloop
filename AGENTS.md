# agent-autoloop 协作约定（Codex / Claude 必读）

Agent 自动化中台：收事件、按规则派给 Agent、在通道里问人、记下每一步。这是常浩自己的项目，自己深度开发、自己使用；代码源自 KKKKhazix/agent-autoloop（见 [NOTICE](NOTICE)），2026-11-20 起不再与上游同步。进入顺序：本文件 → [CURRENT.md](CURRENT.md)（当前状态与唯一下一步）。设计以 [docs/protocol.md](docs/protocol.md) 和[架构图](docs/architecture.svg)为准。所有面向用户的文字用简体中文。本文件前半是入口和导航，后半「维护约定」起是这个仓库原有的开发规矩，照常适用。

## 做什么事之前读哪份

| 要做的事 | 先读 |
|---|---|
| 改协议、内核、插件约定 | [docs/protocol.md](docs/protocol.md)、[docs/state-machines.md](docs/state-machines.md)、[docs/plugins.md](docs/plugins.md)，再看下面「维护约定」 |
| 排障、改脚本、装 launchd 或定时任务 | 先 `grep -n 关键词 docs/LESSONS.md`，再搜全局坑 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/LESSONS.md` |
| 开需求、拆任务、实现、审查 | 下面「Agent skills」一节 |
| 写交接、验收别人的交接 | [docs/templates/handoff.md](docs/templates/handoff.md) 骨架；[OPERATIONS](docs/OPERATIONS.md)「交接写法」「报告与验收」 |
| 改命令行输出、通知文案、配置格式，或判断某处算不算已定 | [docs/DECIDED.md](docs/DECIDED.md) 已定内容登记表 |

## 运行

```sh
npm ci                                   # 先装开发依赖（类型、格式检查）
npm run format:check && npm run typecheck && npm run test:quick   # 快速检查，约 2 分钟
npm test                                 # 全量，含 20 万步模拟与穷举，见「怎么改」
node --test tests/*.test.mjs             # 交接格式 + 通用规则 + 钩子（含自测）
node ~/Library/Application\ Support/agent-kit/runtime/git-hooks/check-rules.mjs .   # 只跑通用规则检查（共用实现在 agent-kit git-hooks/，本仓库设置在 scripts/hooks.json）
git config core.hooksPath scripts/hooks  # 装提交、推送前的必经检查（每个克隆、每台电脑各一次；不用 --no-verify 绕过）；钩子只转发到 agent-kit 共用实现，本机先在 agent-kit 跑 node tools/install.mjs --apply
```

推送前钩子跑规则检查、格式、类型、快速测试和 `.mjs` 测试，不过就不推；全量 `npm test` 不在钩子里，按「怎么改」在合并前跑。`main` 有分支保护，合并前必须通过 `check (ubuntu-latest)`。

## Agent skills

开发流程用 Matt Pocock skills（`~/.agents/skills/`）：大活走 `to-spec` → `to-tickets` → `implement` / `tdd` → `code-review` → PR；小改（一张 issue、一天内做完）跳过 `to-spec`。Claude 用 `/技能名`，Codex 用 `$技能名`；这几个技能只在点名时加载，不会自动触发。

- Issue tracker：需求、规格与任务用本仓库 GitHub Issues，见 `docs/agents/issue-tracker.md`。
- Triage labels：五个默认分流标签，见 `docs/agents/triage-labels.md`。
- Domain docs：single-context，根目录 `GLOSSARY.md` 与 `docs/adr/`，用到时再建，见 `docs/agents/domain.md`。

改动怎么走、分支怎么起名、交接写在哪、怎么合并：见 `/Users/nat/Documents/ChatGPT/个人/work/agent-kit/工程流程.md`。

## 证据与交接

- 验证用的备份、日志等证据放 `~/Library/Application Support/agent-autoloop/evidence/`，不放 `/tmp`（全局坑 G-01）；私人数据、真实配置和完整日志不进仓库。本机中台的数据目录是 `~/.agent-autoloop`，测试一律用临时 `AGENT_AUTOLOOP_HOME`（见「验证范围」）。
- 新增依赖先改 `scripts/hooks.json` 的 `checkRules.allowedDeps`，并在交接里说明理由（`check-rules` 会查；本项目没有运行时依赖，见「原则」）。
- 每轮完成后，在 CURRENT.md 顶部新增一节（旧节保留在下面，过长时归档到 `docs/history/`），骨架照抄 [docs/templates/handoff.md](docs/templates/handoff.md)；`tests/handoff-format.test.mjs` 会检查顶部一节有没有日期、「时间：开工」「测试：」「验证环境：」「外部前提与实测：」「本轮新坑：」五行，新坑编号在 LESSONS 里要存在。每一行怎么写、报告与验收的防伪造五条见 [OPERATIONS](docs/OPERATIONS.md)「交接写法」「报告与验收」；没做就写「未做」。

## 维护约定

先读 [docs/protocol.md](docs/protocol.md) 和 [架构图](docs/architecture.svg)：它们说明最终实现。

## 原则

- **内核只收、只分、只派、只记。** `kernel/` 不主动连接任何东西，不知道任何产品的名字。`tests/purity.test.ts` 守着这几条，也守着 host、protocol、worker 不认识具体产品。新的产品、新的连接方式都是外面的插件。
- **没有界面。** 中台只有口子：事件插件、接单程序、通道、本人。总览页、大屏都是别人用这些口子做的客户端，不进这个仓库。唯一的页面是卡片链接：一个不跑脚本的表单，给只会发文字的通道用。
- **协议是产品。** 改协议就是改所有插件的约定：先核对 `docs/protocol.md` 与现有行为测试，改了要写清兼容。
- **文字是资料，规则才是指令。** 事件里的字不进提示词，也影响不了交给谁、在哪、用什么权限。
- **一轮不等人。** 要问人就结束这一轮。不加任何让 Agent 阻塞等待的东西。
- **没有运行时依赖。** Node 24 自带的够用。`package.json` 不写 `dependencies`。
- 代码只写现在需要的。加锁、重试、兜底，要有真实事故或接口文档作依据。

## 怎么改

- 测试写在实现之前，每个测试文件开头先写它防的失败方式；修 bug 先写复现它的失败测试。一个行为一条测试，边角情况不单写，不补复述实现的测试。
- `npm test`、`npm run typecheck` 和 `npm run format:check` 都要过。没动 `kernel/`、`protocol/`、`sim/` 时，`npm run test:quick` 跳过模拟和穷举，其余测试照跑。
- `main` 合并前必须通过 Ubuntu 的 `check`，核对 PR 的最终提交。macOS 平时不跑，改安装、后台服务或进程处理这类可能因系统而异的地方时，合并前手动跑一次（`gh workflow run check.yml --ref <分支> -f os=macos-latest`）。Windows 不在 CI 里跑。
- CI 由 `scripts/ci-scope.sh` 按改动范围分流：纯文档全部跳过；其他代码的 PR 跳过模拟和穷举；`kernel/`、`protocol/` 和模拟本身的 PR 另跑 2 万步模拟（`npm run test:sim`）；只有改 `tests/simulation.test.ts`、`sim/enumerate.ts` 的 PR 跑完整检查，别处跑不到它们。合进 main 后都再跑一遍快速测试和安装冒烟，跑起来的这一遍不会被后面的推送取消；还在排队的由更新的那一遍接替，它覆盖前面所有提交。`nightly` 工作流每周日跑一次 20 万步模拟、穷举、强杀和变异，并用最新的 Node 跑快速测试和安装冒烟；改 `sim/` 或它自己的 PR 只跑强杀和变异。让测试读取某份文档时，同步改这个脚本。
- `npm test` 跑固定种子的 20 万步模拟与有界穷举；涉及日志、到期表或并发时还跑 `npm run test:nightly`。变异必须先证明原版测试实际执行且通过，不拿语法错误当检出；漏过任何一处都算失败。
- 升级不写数据迁移。事实日志是唯一的权威状态；投影及索引在同一事务内持久化，正常启动复用，格式指纹变化时从日志逐条重建；查询视图的列写在 `host/state.ts`，每次启动重建，不按版本加迁移文件。
- 面向用户的字用中文大白话；代码注释用英文，只写代码看不出来的原因。

## 外部贡献

- 这是常浩自用的项目：仓库公开，但不征集外部贡献；不同步上游，也不向上游提 PR（见 [NOTICE](NOTICE)）。
- 有人提了 Issue 或 PR：用得上的，由维护者照本仓库规矩自己改好再合，提交写 `Fixes #编号`，用 `Co-authored-by: <编号>+<账号>@users.noreply.github.com` 署上对方；用不上的说明原因后关闭。

## 审查要点

改 `kernel/`、`worker/`、`protocol/`、`host/` 的 PR，合并前让一个没写这段代码的 Agent 审一遍：只给它代码，不给作者的结论。它要回答三句：改的函数还有谁在用；接外部程序的有没有真实运行记录；同类问题别处还有没有。把对应的提交号和审查结论记在 PR 的「如何验证」里，代码差异有变化就重新审。涉及安装、后台服务或接外部程序的改动，一起记下真机环境、跑到的步骤和结果。

PR 一开出来就开审查，几个 PR 同时审，不排队。审查报的问题只修必须修的。必须修只算两种：真实用户大概率会碰到的，或者踩了下面这份清单的。几个罕见条件凑在一起才发生的记下来，有人碰到再修，不排进下一批；假程序复现不等于事故，不能当加兜底的依据。

审计只审真有人在用的功能，结果先交清单，不默认当批全修。

这些算出错：

- 没有密钥、拿错种类的密钥也能进门；一个来源能以别的来源的名义发事件；一轮的 token 能碰别的轮次；通道的回答没核对回答者和原消息。
- 事件里别人写的文字进了提示词，或者能影响交给谁、在哪个目录、用什么权限。
- 同一条事件被记两次或派两次；同一组同时跑起超过规定的轮数；没跑成的活丢了、马上重派、或没和期间新来的同一事项的事件合在一起。
- 回答没叫醒提问的事项，或者一张卡片的回答被算了两次；回答和结案都改变了同一张卡片。
- 回执写错导致业务重做。
- 接单程序丢了跑完的结果、把还在跑的当成跑完、把接上原会话后断了的一轮换新会话重做、停止时留下子进程。
- 内核里出现了对外请求、产品名字或界面。
- 卡片页面把别人写的字当成标记显示，或者打开链接就算回答。
- 老插件、规则或配置不改就跑不了，这一版却不是第一位版本（见[协议](docs/protocol.md#版本与兼容)）。

## 一批怎么收尾

改动按批做。开工时定下这批的清单，中途的新发现记到下一批。这些都做完才算完：

- `main` 的检查和 nightly 检查都过。
- 相关 Issue 的状态都说对了。
- 工作树和临时分支清掉。
- 让 Codex 审一遍这批的全部改动，查出的问题留在这一批修。第一个改内核或测试的 PR 合并后就跑一遍 nightly 检查和这次审查，不放到最后。

一批做完不跟着打版本标签；本机中台什么时候升级，见「怎么发版」。

## 怎么发版

- 本机中台从本地仓库安装（`~/.agent-autoloop/app` 的来源是本机主目录），`agent-autoloop update` 直接拉本地 `main`，不看版本标签。改动合进 `main` 后要不要升级本机、什么时候升，单独问常浩；升级前完整备份到证据目录，写好回滚步骤，升级后核对 `/healthz` 的提交号、`status --json` 和 `doctor` 与升级前一致。
- 版本标签只给一键安装和从本仓库装的别的副本用：`install.sh`、`install.ps1` 和 `update` 只认正式发布地址上的 `v*` 标签。打不打、什么时候打由常浩定，仓库公开，版本号对外可见。现有标签到 v1.8.5 为止，都来自上游。
- 要打标签时：版本号怎么加见[协议](docs/protocol.md#版本与兼容)，版本号只写在 tag 上，不进任何文件。选一个 `main` 的检查已经通过、真实跑过并核实过的提交，在它上面跑 nightly 检查（`gh workflow run nightly.yml --ref main -f commit=<完整提交号>`，20 万步模拟和穷举也在里面），过了再把 tag 打在它上面，写清这一版改了什么。发出去的 tag 不挪不删。

## 内核边界

`decide(view, input, now, environment)` 只能产生事实；判断和提交在同一事务中，视图按索引读取，判断只保留这次的改动；`evolve` 独占持久投影写入，`commit` 独占日志追加。内核不读时钟、不取随机数、不读环境或文件。时间、规则变更、主密钥和请求从外壳传入；`host/http.ts` 只把 Node 请求变成 Request。视图随时从日志重建，不能绕过日志改业务数据。规则版本、回答、回执都能用 `why` 和 `/v1/stream` 读到。

## 插件与交付边界

- 内置与第三方插件统一为 `plugins/<名字>/{agent,channel,source}.ts`，安装目录优先，内核不导入插件。命令行在 `cli/`，接单程序在 `worker/`；不要再加另一套发现路径。
- 外部事件只能带资料。Agent、目录、权限、交付仓库、审查命令由可信规则与项目 main 决定。回执事件继承 hops，超过 8 层留记录但不继续派发。
- 交付进程不能检出或运行 PR 的代码、测试、配置、hooks；只能把裸 Git 对象变成文字快照。默认 Codex 审查忽略用户配置与记忆，保留快照只读沙箱。
- 队列、并发和重派属于中台。交付插件按 GitHub 状态确定这一轮该做什么，托付给中台的复查记录交付重试次数；应急单次运行复用同一流程。
- `ops/delivery.json`、四个交付标签和 `delivery` 状态保持约定，审查状态、审查命令和各 Agent 的审查器可配置。Ship 判断放本仓库 Action，依赖的 GitHub Action 固定到完整 SHA。
- 必须保住的事故逻辑，只收真实运行或真实用户碰到过的：设置只来自 main；分支自己的改动才审查；冲突解决保留；草稿检查不放行；提交或 main 变化不合并；自动合并确认关闭；丢失的合并响应读回；Ship 成功与健康版本一起验证；后续文档提交不掩盖未发布代码；已完成的交付不被后续发布倒退。
- 交付的其他约定，没有事故依据，要调整时直接改：发现问题的提交不再审第二次；看不到内容的章鱼合并不放行；只审查的 PR 不因清标签失败被合并；目标分支改了不合并；来源声明用提交状态 `delivery-agent/<PR 编号>`。共用策略可以为一个 Agent 指定多位审查器，每轮只在全部完成后登记。
- 改同一个约定时一起检查代码、协议、示例、两份 README、INSTALL、SKILL、SECURITY 和架构图。搜索旧路径、旧名称、旧数量和旧的能力限制。设计直接写进协议和维护约定。

## 验证范围

现有测试是行为规格，不为迁就实现改预期；本地什么时候跑模拟、穷举、强杀和变异见「怎么改」，不扩写验证框架。性能只记录实测，不设达标线，不作为发布门槛；不为加速模拟保留另一套内核。实测采用 README 和协议的口径：空闲内存与千连接内存分开，持久化写入不换成批量提交。不写守数字的测试（行数、内存、检查条数）：边界用查越没越界的测试守，长了多少写进汇报让人判断。

真机脚本在 `scripts/real-agents.ts`、`scripts/real-protocols.ts` 和 `scripts/delivery-e2e.ts`。真实交付脚本要求 `owner/name --run`，会创建并删除指定私有测试仓库；只有用户明确要求运行时才执行。其他测试使用临时 `AGENT_AUTOLOOP_HOME` 和随机端口。飞书用假 CLI；不能拿已在线的应用再开一个事件监听。通道用本地假 HTTP 服务，不发真消息。

本机用 `init --no-service` 准备验收时，先从临时 `config.json` 和 `rules.json` 的 `channels` 移除 `desktop` 再启动 `up`。验收桌面通道时才保留 `desktop`，并用放在 PATH 最前面的假命令接收通知。后台启动时记下这次进程的 PID，正常结束、失败和中断时都等该进程退出后再删临时目录。

`scripts/install-smoke.sh` 在临时 HOME 里走一遍从安装到卸载，装的是已提交的代码，CI 在 Ubuntu 上跑，macOS 手动触发时跑。Windows 用 `scripts/install-smoke-windows.ts`，共用行为和原生进程检查用 `npm run test:windows`，CI 不跑，在 Windows 本机手动跑。Unix shell、Homebrew 与服务模拟仍在 Unix 验证，Windows 原生安装、通知和进程树由专用测试覆盖。登录服务在真实桌面会话验证，CI 不注册用户任务。
