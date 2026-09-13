# Life-focus 全仓整改执行说明（给 Coding Agent）

> 仓库：`xiaohongfa/Life-focus`  
> 审计分支：`main`  
> 静态审计基线：`177a7d754028e9d0b37f7b2a458deebc8d6566c1`  
> 基线提交：`chore: update release packaging script for green portable pure edition`  
> 文档目的：给自动 Coding Agent / Codex / Claude Code 等直接执行整改，不是产品需求脑暴稿。

---

## 0. 执行总则

你正在维护一个 **React 19 + TypeScript + Vite + Tailwind + Tauri 2 + Rust + SQLite(rusqlite)** 的本地桌面应用。

本轮目标不是增加新功能，而是完成一次“安全性、数据一致性、真实性、可维护性、发布可靠性”的系统整改。

### 必须遵守

1. **开始修改前先同步最新 `main`**。如果 HEAD 已不是本文件记录的 `177a7d7...`，先查看新增 diff，并判断下面的问题是否已被修复或被新实现影响。
2. 建议新建分支：`fix/full-audit-remediation`。
3. **不得直接修改已经发布过的 `001_initial_schema.sql`、`002_sub_focus.sql` 来修老数据库。**
   - 任何 schema 修正都必须新增迁移，例如 `003_integrity_hardening.sql`。
4. 不允许通过“删库重建”解决迁移问题。
5. 不允许为了方便而删除现有功能。
6. 保留现有军事战略 / HOI 风格视觉主题；本轮只清除“伪造的用户事实”和明显错误。
7. P0/P1 的每个问题必须配测试；不能只改 UI。
8. 所有安全敏感信息：
   - 不得写入 `localStorage`
   - 不得写入导出文件
   - 不得写日志
   - 不得通过前端 JS 暴露完整 secret
9. 后端领域约束必须由 Rust/SQLite 保证，前端校验只作为 UX，不能成为唯一防线。
10. 每完成一个阶段，执行并记录：
   - `pnpm build`
   - `cargo fmt --check`
   - `cargo clippy --all-targets --all-features -- -D warnings`
   - `cargo test`
11. 如果现有代码使上述命令暂时无法全部通过，先记录 baseline，再修到通过。
12. 不要把“没有报错”当成验收；必须增加针对具体 bug 的自动测试。

---

# 1. 开工前基线检查

先运行：

```bash
git status
git pull --ff-only
git rev-parse HEAD

pnpm install --frozen-lockfile
pnpm build

cd src-tauri
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cd ..
```

Windows 条件允许时再跑：

```bash
pnpm tauri build
```

把结果记录到 PR / 最终报告里。

---

# 2. P0 —— 必须优先修复

## P0-SEC-01：API Key 不能继续存 `localStorage`

### 当前问题

涉及：

- `src/components/SettingsModal.tsx`
- `src/services/llmService.ts`

目前配置：

```ts
localStorage.setItem(
  'life_strategy_llm_config',
  JSON.stringify({ provider, baseUrl, apiKey, model })
)
```

UI 却把它描述为“本机安全存储”“安全持久化”。

这是错误安全承诺。

### 目标实现

优先采用：

```text
Renderer
  ↓ 只传一次 secret
Tauri command
  ↓
OS Keychain / Stronghold / 可靠 secret store
```

前端正常运行期间只得到：

```ts
{
  provider,
  baseUrl,
  model,
  hasApiKey: true,
  maskedKey?: "sk-****1234"
}
```

而不是完整 API Key。

如果采用 `provider_config.secret_ref`，需要保证：

- `secret_ref` 只是引用，不是 secret 本身。
- secret 本体存在 OS 安全存储。
- JSON/Markdown 导出不包含 secret。
- 日志不输出 secret。
- Rust error 不回显完整 Authorization header。

### 兼容迁移

旧版本用户可能已经在：

```text
localStorage.life_strategy_llm_config
```

存有 key。

实现一次性迁移：

1. 启动设置页或应用时检测旧配置。
2. 将 secret 交给 Tauri 后端安全保存。
3. 保存成功后删除旧 localStorage 中的 raw key。
4. 非敏感 provider/baseUrl/model 可存 AppSetting 或普通配置。
5. 迁移失败不能先删旧值，避免用户丢配置。
6. 后续版本不能再把 raw key 写回 localStorage。

### 验收

必须增加测试/检查：

```text
grep 项目源码，不应再出现把 apiKey 写入 localStorage 的逻辑
```

---

## P0-SEC-02：LLM 网络调用移出 Renderer

### 当前问题

`src/services/llmService.ts` 直接在 WebView 中：

```ts
fetch(endpoint, {
  headers: {
    Authorization: `Bearer ${apiKey}`
  }
})
```

这让 renderer 必须拿到完整 secret，也让 CSP 很难收紧。

### 目标架构

建议：

```text
src/services/llm/
  client.ts              // 前端 invoke 封装
  types.ts

src-tauri/src/llm/
  mod.rs
  provider.rs
  openai_compatible.rs
  gemini.rs
  config.rs
```

前端：

```ts
invoke('llm_chat', { request })
```

Rust 后端：

- 从安全 secret store 读取 key
- 构造 provider-specific HTTP 请求
- 执行 HTTP
- 返回规范化文本/结构化结果

### 额外要求

Custom endpoint：

- 默认只允许 `https://`
- 可特例允许 `http://127.0.0.1` / `http://localhost` 用于本地模型
- 非 localhost 的 `http://` 必须拒绝，避免明文泄漏 secret

---

## P0-AI-01：Gemini Provider 当前是“假支持”，必须修正

### 当前问题

Settings 中有：

```text
DeepSeek
OpenAI
Gemini
Custom
```

选择 Gemini 后默认：

```text
https://generativelanguage.googleapis.com/v1beta
gemini-1.5-pro
```

但 `llmService.ts` 对所有 provider 都统一拼：

```text
/chat/completions
Authorization: Bearer ...
```

这是 OpenAI-compatible 协议，不是 Gemini 原生调用方式。

### 两种可接受方案

优先方案：

实现 Provider Adapter：

```rust
trait LlmProvider {
    async fn chat(...);
    async fn test_connection(...);
}
```

至少：

```text
OpenAICompatibleProvider
GeminiProvider
```

DeepSeek 可复用 OpenAI-compatible provider。

Custom 默认使用 OpenAI-compatible 语义，并在 UI 说明。

如果本轮不准备真正实现 Gemini：

- 暂时从 UI 移除 Gemini 选项
- 不允许保留一个实际不可用的按钮

### 验收

为每个 provider 做 mock HTTP 测试：

- URL
- auth
- request body
- response parse

---

## P0-SEC-03：配置 CSP

### 当前问题

`src-tauri/tauri.conf.json`：

```json
"security": {
  "csp": null
}
```

### 要求

在 LLM HTTP 请求迁移至 Rust 后，给 renderer 配置严格 CSP。

至少控制：

- `default-src`
- `script-src`
- `style-src`
- `img-src`
- `connect-src`
- `font-src`

如果头像仍暂时支持 data URL，需要显式考虑：

```text
img-src 'self' data:
```

不要直接用超宽泛：

```text
*
unsafe-eval
```

除非有明确技术原因并记录。

---

# 3. P1 —— 数据正确性与用户数据安全

## P1-DATA-01：Life 隔离必须从“约定”升级成后端硬约束

### 已确认的问题

多数实体以 `life_id` 隔离，但部分写操作并未完整绑定 Life。

最明确案例：

```text
src/api/client.ts
updateEssay(_lifeId, id, ...)
deleteEssay(_lifeId, id)
```

实际上没有把 `lifeId` 发给 Rust。

Rust Repository：

```sql
UPDATE essay ... WHERE id = ?
DELETE FROM essay WHERE id = ?
```

而不是：

```sql
WHERE id = ? AND life_id = ?
```

### 必须修改

所有 life-scoped entity 的：

- get
- update
- delete
- relation create
- status change

统一采用：

```text
life_id + object_id
```

作为授权/隔离边界。

至少系统性审查：

```text
Essay
Focus
FocusRelation
FocusSubItem
Trait
TraitRelation
Ideology
NationalSpirit
Event
WorldSnapshot
StaffMember
StaffMeeting
```

### 测试

创建：

```text
Life A
Life B
Essay A
```

然后尝试：

```text
updateEssay(lifeB, essayA)
deleteEssay(lifeB, essayA)
```

必须失败或返回 NotFound，且 Essay A 保持不变。

---

## P1-DATA-02：关系表存在跨 Life 关联漏洞

### 当前 schema

例如：

```text
focus_relation.life_id -> life
focus_relation.source_focus_id -> focus
focus_relation.target_focus_id -> focus
```

这些 FK 单独成立，但 SQLite 不会自动保证：

```text
source_focus.life_id == relation.life_id
target_focus.life_id == relation.life_id
```

TraitRelation、FocusSubItem 也有相似问题。

### 修复策略

至少在 Repository/domain 层：

建立 relation/sub-item 前先查询两端对象，并验证属于当前 `life_id`。

更强方案：

后续 migration 设计 composite uniqueness / FK：

```text
UNIQUE(life_id, id)
FOREIGN KEY(life_id, source_focus_id)
  REFERENCES focus(life_id, id)
```

注意 SQLite 表重建迁移的兼容性，不要草率破坏老数据。

### 测试

必须覆盖：

```text
Life A Focus A
Life B Focus B

add_focus_relation(lifeA, A, B)
=> reject
```

TraitRelation、SubFocus 同理。

---

## P1-DATA-03：Graph invariant 不得只靠 UI

### 当前问题

LeaderView 有前端环检测；测试脚本却可以直接 API 构造：

```text
Trait1 -> Trait2
Trait2 -> Trait1
```

FocusCanvas 只在前端阻止：

```ts
source === target
```

后端并未形成统一 invariant。

### 需要明确领域规则

#### Trait 演化

如果它的语义是演化谱系 DAG：

- 禁止 self-loop
- 禁止有向 cycle
- 后端 `add_trait_relation` 必须检查

#### Focus prerequisite

如果“前置关系”是 DAG：

- 禁止 self-loop
- 禁止 prerequisite cycle

#### mutually_exclusive

语义上是对称关系：

```text
A mutex B == B mutex A
```

不能允许：

```text
A -> B
B -> A
```

被当成两个独立互斥关系。

规范化存储：

```text
(min(idA,idB), max(idA,idB))
```

或 backend duplicate check。

### 验收

加入 Rust domain tests。

---

## P1-DATA-04：Migration checksum 机制需要重做

### 当前问题

`src-tauri/src/db/migrations.rs`

使用：

```rust
DefaultHasher
```

作为持久化 checksum。

并且：

```rust
query_row(...).ok()
```

会把“没找到 migration”和“查询真的报错”混在一起。

checksum mismatch 只：

```rust
log::warn!
```

然后继续启动。

### 修复

1. 使用稳定 hash，例如 SHA-256。
2. `QueryReturnedNoRows` 单独表示“尚未执行”。
3. 其他 SQLite error 必须向上传递。
4. 已执行 migration checksum mismatch：
   - 默认 fail fast
   - 给出清楚错误提示
   - 不允许默默继续
5. 已发布 migration 一旦落地，不再编辑原 SQL。

### 注意

如果从旧 `DefaultHasher` checksum 迁到 SHA-256，需要设计向后兼容：

- 新增 checksum algorithm/version 字段，或
- migration engine 识别旧记录并安全升级 checksum 元数据

不要让老数据库全部因 hash 算法变化无法启动。

---

## P1-DATA-05：World Snapshot 目前不是“世界快照”

### 当前实现

`SnapshotsView.tsx`：

```ts
const overview = await api.getWorldOverview(lifeId);
const payloadJson = JSON.stringify(overview || {});
```

但 `WorldOverview` 只是首页摘要：

- 当前 leader
- situation/philosophy/stability
- active traits
- active foci
- recent events
- etc.

它不是完整 Life 状态。

因此快照遗漏：

- 非 active 的全部 foci
- focus relations
- focus history
- 全部 essays
- 全部 events
- archived traits/ideologies/spirits
- staff messages
- 其他结构化信息

### 修复

新增后端：

```text
create_world_snapshot_from_current_state(life_id, name, description)
```

在 Rust 端以一致性事务生成完整 payload。

定义明确版本：

```json
{
  "schemaVersion": 2,
  "life": {},
  "leader": {},
  "situation": {},
  ...
}
```

Snapshot 应由 backend 生成，而不是前端拼装。

### 读取安全

当前：

```ts
JSON.parse(inspectingSnapshot.payload_json)
```

直接在 render 路径运行。

旧/坏 payload 会导致页面 crash。

必须安全 parse，并显示：

```text
“该快照损坏或版本不兼容”
```

---

## P1-DATA-06：JSON Export 不是完整备份，却被描述成结构化数据包

### 当前 `export_life_json`

主要只导出：

```text
world_overview
sub_foci
staff_members
staff_meetings
```

这不是完整 Life 数据。

### 修复

定义正式 export schema，例如：

```json
{
  "format": "life-focus-export",
  "schemaVersion": 2,
  "exportedAt": "...",
  "life": {},
  "leader": {},
  "situation": {},
  "philosophy": {},
  "stability": {},
  "stabilityHistory": [],
  "traits": [],
  "traitRelations": [],
  "ideologies": [],
  "nationalSpirits": [],
  "foci": [],
  "focusRelations": [],
  "focusHistory": [],
  "subFoci": [],
  "events": [],
  "essays": [],
  "worldSnapshots": [],
  "staffMembers": [],
  "staffMeetings": [],
  "staffMessages": []
}
```

Secret 永远不能包含。

如果“数据携带/迁移”是产品承诺，后续应加 import；本轮至少先把 export 诚实地做完整。

---

## P1-DATA-07：Avatar 字段语义错误

### 当前问题

数据库字段名：

```text
portrait_attachment_id
```

schema 也有：

```text
attachment
attachment_link
```

但 `LeaderView.tsx` 上传头像时：

```ts
FileReader.readAsDataURL(file)
```

然后把整个 base64 data URL 当作 `portrait_attachment_id` 保存。

### 风险

- 字段语义错误
- SQLite 行会膨胀
- 大图片可能严重增加 DB
- 无文件大小限制
- 无 MIME 校验
- Attachment 表形同虚设

### 修复

优先真正实现 managed attachment：

```text
Tauri command:
import_attachment(life_id, file)
→ 写入 app data attachments/
→ hash
→ attachment row
→ 返回 attachment ID
```

Leader 只存 ID。

至少限制：

- image MIME
- 最大体积
- 最大尺寸

如果本轮不实现 attachment 管理，则必须重命名字段和 schema，不要继续冒充 attachment ID；但考虑已有 schema，建议直接实现正确模型。

---

## P1-DATA-08：Trait 的 `icon` 被滥用为业务状态

当前逻辑把：

```text
icon = "active"
icon = "benched"
```

作为“上阵/待命”状态。

但 `icon` 原本语义是图标。

这是数据模型污染。

### 修复建议

新增 migration：

```text
trait.equip_state
```

例如：

```text
active
benched
null/default
```

或者更清晰：

```text
is_equipped
stage_state
```

根据现有产品语义决定。

迁移旧值：

```text
icon == 'active'  -> equip_state='active', icon=NULL
icon == 'benched' -> equip_state='benched', icon=NULL
```

如果已有真正图标值必须保留。

这属于结构性修复，可以在 P0/P1 稳定后单独 commit。

---

# 4. P1 —— 真实数据与功能可达性

## P1-UI-01：彻底清理伪造的用户事实

项目近期已经删掉“虚构士气/储备”等指标，但仍残留多处。

### Header

`src/components/Header.tsx`

当前：

```ts
const stabVal = stability?.current_value ?? 70;
```

这会把“未设定”伪造成 `70%`。

必须显示：

```text
未设定
```

不能默认 70。

### Dashboard

`src/features/dashboard/DashboardView.tsx`

存在：

```text
张伟
ZHANG WEI
少将 (MAJOR GENERAL)
Active
```

作为缺省用户档案。

这些都是伪造事实。

必须改成中性 placeholder：

```text
未设定统帅姓名
未设定军衔/不显示军衔
```

如果产品根本没有 rank 字段，就不要显示真实感“少将”。

### 装饰文案

如：

```text
绝密 256
```

如果明确只是 UI 装饰，可保留，但不能看起来像真实用户 ID / 等级 / 数据。

更稳妥改成纯装饰：

```text
TOP SECRET
CLASSIFIED
```

### Trait 自动英文标签

Dashboard 根据数组 index 生成：

```text
DECISIVE
VETERAN
RESTRAINED
STEADFAST
```

如果这些不是数据库真实属性，应删除或标为纯装饰，而不要暗示系统判断了用户人格。

---

## P1-UI-02：Decision 模块属于已决定删除的旧功能，必须彻底清理

### 产品决策

`Decision / 战略决议` 不是“页面不可达”的 bug，而是已经明确决定删除的功能。

当前仓库仍残留：

```text
src/features/decisions/DecisionView.tsx
App.tsx 中 decisions 分支
Decision / DecisionOccurrence / DecisionStatusHistory 类型
相关 API client 方法
Rust commands / repositories / models
SQLite schema / archive 聚合 / export / snapshot 相关引用
AI recommendDecisions 等逻辑
README / 文案 / 测试脚本中的 Decision 相关描述
```

### 修复

不要重新把 Decision 放回导航。

应执行完整删除：

```text
1. 删除前端 DecisionView 与所有入口
2. 删除前端 Decision 类型、API、AI 推荐逻辑
3. 删除 Tauri commands
4. 删除 Rust model / repository / archive projection
5. 删除 export / snapshot / world overview 中的 Decision 字段
6. 清理测试、README、Prompt、注释和无用 import
```

数据库层需要谨慎：

- 不要直接修改已发布 migration 破坏旧数据库兼容。
- 如果确认 Decision 数据未来彻底废弃，可新增 migration 删除相关表；
- 如果出于兼容/数据保留考虑暂时不 DROP table，也必须保证应用层完全不再使用，并在迁移说明中明确标记 deprecated。
- 不允许在 UI 中保留隐藏入口或“以后可能恢复”的半死代码。

### 验收

全仓搜索以下关键词：

```text
decision
决议
recommendDecisions
```

除 migration 兼容说明、历史 schema 注释或明确的 deprecated 迁移代码外，不应再有运行时功能引用。

---

## P1-UI-03：App 初始化失败会永久显示“正在载入”

### 当前

`App.tsx`：

```ts
catch (...) {
  console.error(...)
} finally {
  setLoading(false)
}
```

但：

```ts
if (loading || !currentLife) {
  return <Loading />
}
```

如果初始化失败：

```text
loading=false
currentLife=null
```

仍进入 Loading，用户永远看不到错误。

### 修复

增加：

```ts
fatalError
```

状态。

显示错误页：

```text
应用数据初始化失败
[重试]
[打开日志目录/复制错误摘要]（可选）
```

不要只 console.error。

---

## P1-UI-04：快速切换 Life 存在异步竞态

当前模式：

```ts
setCurrentLife(target)
loadLifeData(target.id)
```

多个请求并行时：

```text
用户先点 A
马上点 B

B 请求先回来
A 请求后回来
```

旧 A 数据可能覆盖 B 页面的 overview/stability/essays。

### 修复

可选：

- request generation token
- AbortController（适用于 fetch）
- centralized store/query key
- 检查返回时 lifeId 是否仍为 current

所有 feature 的 `loadData()` 也需要注意同类问题。

---

## P1-UI-05：删除非当前 Life 后不应强制跳到第一个 Life

当前 `handleDeleteLife` 重新 list 后：

```ts
const next =
  remaining.find((l) => l.id !== lifeId) || remaining[0];
```

由于已删除 ID 本来就不存在于 remaining：

```text
find(l.id !== deletedId)
```

几乎总是拿第一项。

### 正确行为

- 如果删除的是当前 Life：
  - 选择合理的下一个
- 如果删除的是别的 Life：
  - 当前 Life 保持不变

增加测试。

---

## P1-UI-06：默认 Life 创建逻辑重复

Rust `setup` 已经保证：

```text
如果没有 Life -> 创建默认 Life
```

前端 `App.initApp()` 又重复：

```text
if list empty -> createLife
```

领域 invariant 应只存在一个权威位置。

建议：

- 后端保证首次初始化
- 前端仅读取
- 如果仍返回空，视为异常或后端显式提供 `ensure_default_life`

避免未来 race / 双创建。

---

# 5. P1 —— Archive / Snapshot 内容真实性

## P1-ARCH-01：超事件回放时伪造 quote

`ArchiveView.tsx` 从 ArchiveItem 重建 Event 时写死：

```text
重大人生命运转折，由此开启新的历史篇章。
```

这不是用户真实保存的 quote。

### 修复

两种方式：

1. Archive projection 返回真实 quote；或
2. 点击回放时通过 `source_id` 获取完整 Event。

绝不能生成一个假 quote 冒充历史记录。

---

## P1-ARCH-02：Archive 点击随笔应读取 canonical Essay

当前 ArchiveItem 被重新组装成 Essay 对象。

即使现在 summary 恰好是完整 body，也形成不必要的数据副本耦合。

建议新增：

```text
get_essay(life_id, essay_id)
```

点击后读取 canonical entity，再编辑。

同理，任何历史聚合层都不应冒充主实体存储层。

---

# 6. P1 —— 发布与“绿色版”语义

## P1-PKG-01：`package_release.mjs` 不再清理发布目录

最新提交改成：

```text
Ensure target dir exists
```

而不是清空。

风险：

- 上一版本 zip / exe 残留
- 旧文件混进新版本
- 用户拿到错误版本
- “Release Ready” 仍会打印成功

### 修复

构建 release 前：

- 清理本次目标目录，或
- 使用版本化 staging 临时目录
- 原子替换最终目录

不要把旧 release artifact 当成当前输出。

---

## P1-PKG-02：发布脚本硬编码 `0.1.0`

当前 source artifact：

```text
life-strategy-game_0.1.0_x64-setup.exe
```

说明文件也写 `v0.1.0`。

目标文件名却去掉版本。

### 修复

版本只能有一个 source of truth。

从：

- `package.json`
- 或 `tauri.conf.json`

读取 version。

检查二者一致，不一致时构建失败。

---

## P1-PKG-03：缺 artifact 时必须发布失败

当前 installer 不存在时：

```js
console.error(...)
```

然后继续生成其余内容，最后仍打印 Release Ready。

必须：

```text
process.exitCode = 1
```

或者直接 throw。

发布必须是 fail-fast。

---

## P1-PKG-04：“绿色便携版”宣传与真实存储行为冲突

### 当前程序

Rust 使用：

```text
app.path().app_data_dir()
```

数据库写在系统 AppData。

### 当前发布说明却说

```text
绿色免安装
U 盘随身携带
不留垃圾残留
```

二者不是一回事。

exe 可以免安装，但数据不随 exe 移动。

### 必须二选一

#### A. 诚实的免安装版

命名：

```text
免安装版
```

说明：

```text
程序本体无需安装，但用户数据仍保存在系统应用数据目录。
```

#### B. 真正 portable mode

支持：

```text
./data/life_strategy.db
```

随 exe 移动。

建议通过显式：

```text
portable.flag
--portable
环境变量
```

启用，不要默认改变现有用户数据位置。

如果实现 B，要测试：

- AppData DB 不被误用
- exe 目录没有写权限时给清楚错误
- 正常版与 portable DB 不互相覆盖

---

## P1-PKG-05：“完全离线 / 百分百本地”宣传必须修正

程序不配置 AI 时可以完全离线。

但配置云端 LLM 后，系统会把上下文发给模型服务商，包括可能的：

- life name
- leader profile
- situation
- philosophy
- stability
- traits
- active focuses
- 用户输入

所以 README / 设置页 / 发布说明必须改成条件式描述：

```text
核心数据默认本地存储。
如用户主动启用第三方 AI 服务，所选上下文会发送给该服务商用于生成结果。
```

首次在线调用建议显示一次隐私提示。

---

# 7. P2 —— AI 体验与上下文正确性

## P2-AI-01：不能用“有 Key”表示“大模型在线”

`AICommandModal.tsx`：

只要 `isLLMConfigured()` 返回 true，就显示：

```text
大模型在线
```

但它只检查 API key 长度。

应改成：

```text
已配置：OpenAI / xxx
```

只有经过成功 test/health check，当前 session 才可显示：

```text
连接测试通过
```

---

## P2-AI-02：Essay AI 润色缺少 Life Context

`EssayModal` 支持：

```ts
context?: StrategyContext
```

但 `App.tsx` 打开它时没有明显传入完整 context。

结果随笔 AI 可能使用 `{}`。

### 修复

从当前 overview 构造共享 StrategyContext，统一下发。

不要让每个 feature 自己重复拼一套。

---

## P2-AI-03：SubFocus AI 拆解传了空 context

`SubFocusModal.tsx`：

```ts
decomposeFocusSubItems(focus, {}, requirement)
```

这会丢掉：

- leader
- situation
- philosophy
- stability
- traits
- active foci

### 修复

传当前 Life 的真实 StrategyContext。

---

## P2-AI-04：集中建立 StrategyContext builder

目前多个 View 重复：

```ts
{
  lifeId,
  lifeName,
  leaderName,
  leaderBody,
  situation,
  philosophy,
  stability,
  traits,
  activeFoci
}
```

创建统一：

```text
src/services/strategyContext.ts
```

或 backend：

```text
get_strategy_context(life_id)
```

防止各页面字段漂移。

---

# 8. P2 —— 数据模型 / 类型安全

## P2-TYPE-01：Rust 已定义 `FocusStatus` enum，但核心 model 仍大量用 String

例如：

```rust
Focus.status: String
FocusRelation.relation_type: String
```

### 修复方向

逐步引入：

```rust
enum FocusStatus
enum FocusRelationType
enum SubFocusStatus
enum EventKind
```

在：

```text
Tauri command boundary
Repository boundary
```

就拒绝非法值。

不要依赖 SQLite CHECK 作为第一道业务校验。

---

## P2-TYPE-02：前后端类型最好生成或共享契约

当前：

```text
src/api/types.ts
src-tauri/src/models/mod.rs
```

人工同步。

短期至少写契约测试。

长期可评估：

- specta
- ts-rs
- 其他 Tauri typed command 方案

不是本轮硬性要求，但重构时避免继续复制更多类型。

---

# 9. P2 —— 子国策状态语义不完整

数据库支持：

```text
todo
in_progress
done
canceled
```

但 `SubFocusModal` 的交互实际上只有：

```text
done <-> todo
```

对于 `in_progress` / `canceled` 没有完整 UI，点击还可能直接变 `done`。

### 修复

提供明确状态操作：

```text
待办
进行中
完成
取消
```

或如果产品只需要二态，就应改 schema/类型，而不是留下四态假实现。

建议保留四态并实现 UI。

---

# 10. P2 —— 组件与模块过大

当前明显 God Files：

```text
LeaderView.tsx              ~105 KB
repositories/mod.rs          ~77 KB
FocusCanvasView.tsx          ~63 KB
CabinetView.tsx              ~59 KB
llmService.ts                ~55 KB
api/client.ts                ~44 KB
SettingsModal.tsx            ~32 KB
```

### 目标结构建议

Frontend：

```text
src/features/leader/
  LeaderView.tsx
  components/
  hooks/
  domain/
  utils/

src/features/focus/
  FocusCanvasView.tsx
  components/
  hooks/
  graph/
  undo/

src/services/llm/
  client.ts
  providers/types.ts
  context.ts
  parser.ts
  fallbackEngine.ts

src/api/
  client.ts
  desktopAdapter.ts
  mockAdapter.ts
```

Rust：

```text
src-tauri/src/repositories/
  mod.rs
  life.rs
  leader.rs
  focus.rs
  trait_repo.rs
  archive.rs
  snapshot.rs
  essay.rs
  staff.rs
```

### 要求

重构必须保持行为。

优先先加/补测试，再拆。

不要在一个巨大 commit 中同时：

```text
重构 + 改行为 + 改 schema
```

建议分阶段 commit。

---

# 11. P2 —— 浏览器 Mock 不应和生产 API Client 混成一个 44 KB 文件

当前 `src/api/client.ts` 同时负责：

- Tauri invoke
- browser detection
- production API
- 巨量 mock data
- mock business logic

### 风险

Mock 行为和 Rust 后端已经出现漂移的可能。

### 修复

拆成：

```text
api/contracts.ts
api/tauriAdapter.ts
api/mockAdapter.ts
api/index.ts
```

生产 build 中尽量不要把大量 mock domain logic 当作主路径。

Mock 应用于：

- Story/demo
- component dev
- tests

并明确其语义不是生产真相。

---

# 12. P2 —— 错误处理

大量页面当前只有：

```ts
console.error(...)
```

用户没有任何反馈。

### 建议实现

统一轻量错误机制：

```text
Toast / Inline error
ErrorBoundary
fatal startup screen
```

重点覆盖：

- 初始化 DB
- 数据保存
- 删除
- export
- snapshot
- AI
- migration/init

不要把每个失败都做 alert；按严重程度分层。

---

# 13. P2 —— Tailwind 无效 utility

`FocusNode.tsx` 出现：

```text
w-18
border-1.5
hover:scale-130
```

当前 `tailwind.config.js` 没有扩展这些 token。

Tailwind 3 默认也没有这些标准 utility。

### 修复

使用 arbitrary values：

```text
w-[4.5rem]
border-[1.5px]
hover:scale-[1.3]
```

或者在 theme 中正式扩展。

执行一次全项目 class audit，尤其检查类似：

```text
py-0.2
```

确保不是静默无效样式。

---

# 14. P2 —— Markdown 功能声明与实现不一致

`EssayModal` placeholder 声称：

```text
支持 Markdown ... 数学公式
```

但当前只有：

```text
react-markdown
remark-gfm
```

没有 math plugin / KaTeX。

### 修复

二选一：

1. 真正加入 `remark-math + rehype-katex` 并配样式；或
2. 删除“数学公式”承诺。

不要写 UI 上做不到的能力。

### 安全

继续避免开启不必要的 raw HTML。

外部链接建议自定义 renderer：

- 不在当前 Tauri WebView 直接导航陌生页面
- 用安全外链打开方式
- 加 `rel=noopener` 等

---

# 15. P2 —— Snapshot / Export / Archive 的 schema version 应统一

现在：

```text
snapshot_schema_version
export version
```

各自零散。

建议建立：

```text
CURRENT_EXPORT_SCHEMA_VERSION
CURRENT_SNAPSHOT_SCHEMA_VERSION
```

并有 parser/upgrader。

UI 遇到更高未知版本：

```text
只读提示“不支持此未来版本”
```

而不是直接 parse 后假设结构一致。

---

# 16. P2 —— `free-port.mjs` 会强杀任意占用 1420 的进程

当前：

Windows：

```text
taskkill /F /PID
```

Unix：

```text
kill -9
```

没有确认 PID 是否属于 Life-focus。

而 `package.json` 同时：

```text
predev -> free-port
dev -> free-port && vite
```

一次 `pnpm dev` 还会重复执行两次。

### 修复

推荐：

- 删除自动强杀
- `strictPort` 保留
- 检测端口被占用后打印 PID / command
- 明确提示用户手动处理

如果必须自动清理，只能清理能确认属于本项目的 child/process marker。

并删掉重复调用。

---

# 17. P2 —— E2E 测试脚本不可移植

现有多份 `scripts/test_*.mjs`：

硬编码：

```text
C:\Program Files (x86)\Microsoft\Edge\...
C:\Users\hongl\...
C:\Users\hongl\.gemini\antigravity\...
```

### 问题

- 换电脑即失败
- CI 无法运行
- 暴露本机用户名和工具目录
- screenshot 输出写到开发机专属路径
- 测试脚本通过 console 文案宣布 “PERFECTLY VERIFIED”，不等于真正 assertion

### 修复

使用正式工具：

```text
Playwright
```

或等价方案。

要求：

```text
tests/e2e/
  focus.spec.ts
  ai-settings.spec.ts
  life-isolation.spec.ts
```

测试产物写：

```text
test-results/
```

并 gitignore。

失败必须 exit non-zero。

不要依赖固定 Edge 安装路径。

---

# 18. P2 —— CI 缺失

仓库当前没有看到 `.github/workflows`。

增加：

```text
.github/workflows/ci.yml
```

至少：

### frontend job

```text
pnpm install --frozen-lockfile
pnpm build
```

如果增加 ESLint/Vitest：

```text
pnpm lint
pnpm test
```

### rust job

```text
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

Tauri 完整 bundle 可作为 Windows release workflow 单独做，不必每个 PR 都跑全平台安装包。

---

# 19. P2 —— 发布文档与实际依赖不一致

README 写：

```text
SQLite (tauri-plugin-sql)
```

实际 backend：

```text
rusqlite
```

修正 README。

README 还写“跨平台”，但当前真正的发布脚本、测试、说明明显以 Windows 为主。

建议改成：

```text
开发架构具备跨平台基础
当前已验证/发布平台：Windows 10/11 x64
macOS/Linux：尚未建立正式 release QA（如属实）
```

不要把“框架支持”写成“项目已验证支持”。

---

# 20. P2 —— MIT 声明缺 LICENSE 文件

README 声明 MIT，但根目录没有看到正式 `LICENSE`。

如果确实选择 MIT：

添加标准 MIT LICENSE，并填正确 copyright holder/year。

如果不准备 MIT：

修正 README。

---

# 21. P2 —— 全项目去除夸张化、绝对化和“假权威感”表述

这是本轮必须执行的统一文案原则，不只是 README 修饰。

项目可以保留军事战略风格，但技术描述、功能说明、安全说明、发布说明、测试输出必须准确、克制、可验证。不得为了“更有气势”而夸大能力、隐私、安全性、可靠性或用户身份。

## 必须清理的表述类型

### 1. 绝对化承诺

重点审查：

```text
百分之百安全
完全安全
绝不会
永久不会
零风险
百分百本地
完全离线
绝对可靠
万无一失
```

除非技术上能够严格证明，否则改成有范围、有条件的描述。

例如：

```text
核心业务数据默认保存在本地 SQLite。
未启用第三方 AI 服务时，不会发生 AI 云端请求。
启用云端 AI 后，相关上下文会发送给所选服务商。
```

不要写：

```text
数据百分之百归您本地所有
完全离线
绝不会上传任何内容
```

### 2. 夸张宣传词

重点审查：

```text
顶级
最高级
完美
极致
史诗级
无敌
秒发秒传
纯净无残留
真正智能
革命性
终极
绝对专业
完美验证
```

尤其不要在 README、设置页、发布说明、测试输出、安全说明里使用无法验证的宣传判断。

测试脚本中的：

```text
PERFECTLY VERIFIED
ALL ... PERFECTLY VERIFIED
```

改成客观结果，例如：

```text
E2E checks passed
All assertions passed
```

### 3. 假权威感和假客观判断

系统不得自动把不存在的事实包装成用户真实属性，例如：

```text
少将
战略大师
DECISIVE
VETERAN
STEADFAST
顶级战略家
```

如果不是用户主动填写或真实数据字段，就不能作为事实展示。

军事世界观称谓可以保留，例如：

```text
统帅
参谋部
国策
档案
战区
```

但它们只是产品视觉语言，不代表系统对用户能力、身份或专业水平做了客观认证。

### 4. 过度戏剧化的错误提示

错误提示优先说明：

```text
发生了什么
是否影响数据
用户下一步可以做什么
```

不要用“系统彻底崩溃”“世界线不可逆断裂”等戏剧化描述代替技术信息。

## 推荐文案风格

目标是：

```text
军事战略视觉语言 + 准确技术事实 + 简洁操作说明
```

示例：

```text
“启动顶级战略推演” -> “开始 AI 推演”
“大模型在线” -> “已配置 OpenAI”
“数据百分之百安全保存在本地” -> “核心数据默认保存在本地 SQLite”
“绿色纯净版，不留任何垃圾残留” -> “免安装版；数据仍按当前数据目录策略保存”
```

## 执行范围

全仓搜索并逐条审查：

```text
完美
绝对
百分百
100%
完全
顶级
最高
终极
极致
无敌
纯净
安全
永远
绝不会
革命性
史诗
PERFECT
PERFECTLY
BEST
ULTIMATE
```

注意不要机械全局替换：例如“最高统帅”属于世界观固定称谓，可以保留；“最高安全级别”“绝对可靠”这类技术判断则必须有依据，否则删除或改写。

## 验收

```text
[ ] 不虚构用户事实
[ ] 不使用未经证明的绝对化安全承诺
[ ] 不把“已配置”写成“在线”
[ ] 不把“能运行”写成“完美验证”
[ ] 不把“免安装”写成“完全无残留”
[ ] 不把第三方 AI 功能写成“完全离线”
[ ] 军事化风格仍保留，但技术描述客观
```

---

# 22. P3 —— 小问题清理

## P3-01：favicon

`index.html`：

```html
<link rel="icon" href="/vite.svg" />
```

仓库没有对应 `vite.svg`。

换成真实应用 icon 或删除。

---

## P3-02：Stability 输入空值会被吞成 0

`StabilityModal.tsx`：

```ts
parseFloat(directVal) || 0
```

用户清空 input 时会得到 0。

应该区分：

```text
empty
NaN
0
```

0 是合法值，empty 不是。

---

## P3-03：AI / DB / UI 命名中的“安全”“完整”“百分百”要谨慎

搜索以下措辞：

```text
安全存储
安全持久化
完全离线
百分之百本地
完整数据
世界冻结
完美验证
```

逐个确认技术上真的成立。

不成立就改成准确描述。

---

# 23. 建议的执行阶段

不要一口气改完所有 God File。

## Phase A —— 安全与真实性

处理：

```text
P0-SEC-01
P0-SEC-02
P0-AI-01
P0-SEC-03
P1-UI-01
P1-PKG-05
全项目去除夸张化/绝对化/假权威感表述
```

完成后跑全测试。

---

## Phase B —— 数据完整性

处理：

```text
P1-DATA-01
P1-DATA-02
P1-DATA-03
P1-DATA-04
P1-DATA-05
P1-DATA-06
P1-DATA-07
```

新增 migration 和 Rust tests。

---

## Phase C —— 功能正确性

处理：

```text
P1-UI-02
P1-UI-03
P1-UI-04
P1-UI-05
P1-UI-06
P1-ARCH-01
P1-ARCH-02
P2-AI-01..04
子国策四状态
```

---

## Phase D —— 发布工程

处理：

```text
P1-PKG-01..04
free-port
portable E2E
CI
README
LICENSE
favicon
```

---

## Phase E —— 架构拆分

在行为测试稳定后再拆：

```text
LeaderView
FocusCanvasView
CabinetView
llmService
api/client
repositories/mod.rs
SettingsModal
```

每次拆一块，不要一次全部移动。

---

# 24. 必须新增的回归测试清单

至少实现以下测试。

## Rust

### Life 隔离

```text
cross_life_essay_update_rejected
cross_life_essay_delete_rejected
cross_life_focus_relation_rejected
cross_life_trait_relation_rejected
cross_life_sub_focus_rejected
```

### Graph

```text
trait_self_loop_rejected
trait_cycle_rejected
focus_prerequisite_cycle_rejected
mutex_reverse_duplicate_rejected
```

### Migration

```text
migration_query_error_is_not_treated_as_missing
migration_checksum_mismatch_fails
legacy_checksum_upgrade_is_safe
```

### Export / Snapshot

```text
full_export_contains_all_life_entities
snapshot_contains_non_active_foci
snapshot_contains_relations_and_history
snapshot_secret_never_exported
```

### Attachment

```text
avatar_wrong_mime_rejected
avatar_too_large_rejected
attachment_belongs_to_same_life
```

---

## Frontend

推荐 Vitest + Testing Library：

```text
header_unset_stability_shows_unset
dashboard_does_not_fabricate_name_or_rank
decision_module_is_fully_removed
app_init_error_shows_retry
delete_non_current_life_keeps_current_life
stability_empty_input_is_invalid_not_zero
ai_status_says_configured_not_online_without_test
snapshot_invalid_json_does_not_crash
subfocus_supports_all_four_states
```

---

## E2E

推荐 Playwright：

```text
create/switch/delete Life
create Focus + relations
edit leader
trait evolution
archive event/essay
snapshot
export
settings AI config without leaking secret to localStorage
```

---

# 25. 安全验收 checklist

完成后手动/自动检查：

```text
[ ] localStorage 中没有 raw API Key
[ ] SQLite 导出没有 raw API Key
[ ] 日志没有 raw API Key
[ ] renderer 不需要读取完整 API Key
[ ] 非 localhost HTTP provider 被拒绝
[ ] CSP 已开启
[ ] Gemini 要么真实可用，要么 UI 中移除
[ ] 在线 AI 首次使用有明确数据外发说明
```

---

# 26. 数据验收 checklist

```text
[ ] 所有 mutation 都校验 life_id
[ ] relation 不能跨 Life
[ ] sub-focus 不能绑定别的 Life 的 focus
[ ] trait graph 不能产生非法 cycle
[ ] prerequisite graph 不能产生非法 cycle（若产品规则要求 DAG）
[ ] mutex 被当作对称关系
[ ] snapshot 真正包含完整世界状态
[ ] export 真正包含完整 Life 数据
[ ] 旧数据库可迁移，不删数据
```

---

# 27. UI 真实性与文案克制验收 checklist

全仓搜索并确认：

```text
张伟
ZHANG WEI
少将
?? 70% fallback
重大人生命运转折，由此开启新的历史篇章
```

除非它们是用户真实保存的数据或明确 demo fixture，否则 production UI 不应出现。

同时全仓审查夸张化与绝对化措辞；技术能力、隐私、安全、兼容性、测试结果必须使用可验证、有限定条件的描述。

空状态统一展示：

```text
未设定
暂无
等待用户录入
```

不要擅自编造“看起来更完整”的档案。

---

# 28. 发布验收 checklist

```text
[ ] release staging 每次干净
[ ] version 来自单一 source of truth
[ ] 缺 installer/exe 时构建失败
[ ] 文件名带明确版本，或 metadata 可追踪版本
[ ] “portable”描述与真实数据目录一致
[ ] AI 隐私说明准确
[ ] README 技术栈与代码一致
[ ] LICENSE 与 README 一致
[ ] 发布说明不存在“完全离线 / 百分百安全 / 无残留 / 完美”等未经证明的绝对化宣传
```

---

# 29. 架构目标（不是要求一次完成，但不要继续恶化）

目标依赖方向：

```text
UI Components
    ↓
Feature hooks / application service
    ↓
Typed API contract
    ↓
Tauri commands
    ↓
Domain validation
    ↓
Repositories
    ↓
SQLite
```

AI：

```text
UI
 ↓
AI application service
 ↓
Tauri command
 ↓
Provider adapter
 ↓
Secret store + HTTP client
```

不要再让：

```text
React component
  同时负责
  UI + 网络 + domain + persistence + graph + parsing
```

---

# 30. Agent 最终交付要求

完成整改后，输出一份总结，必须包含：

## 1. 修改文件

按模块列出。

## 2. 数据库迁移

说明：

- 新增哪些 migration
- 如何兼容旧 DB
- 是否可回滚
- 是否需要备份提示

## 3. 安全变化

明确：

- API key 最终存在哪里
- renderer 是否还可访问 raw key
- AI 请求从哪里发出
- CSP 内容

## 4. 测试结果

粘贴：

```text
pnpm build
cargo fmt --check
cargo clippy ...
cargo test
frontend tests
e2e tests
```

结果摘要。

## 5. 尚未完成项

不能用“已全部解决”掩盖 leftovers。

---

# 31. 禁止的“假修复”

以下处理不接受：

```text
只把 localStorage 字段改个名字
只在 UI 隐藏 API key，但底层仍明文存
只在前端判断 cross-life
只把 Gemini 按钮改名但仍走错误协议
只删掉 migration checksum 检查
直接修改 001_initial_schema.sql 让新库正常，却不迁移旧库
把 snapshot 文案改成“摘要”但仍声称是完整备份
为了避免 race 直接加 setTimeout
为了通过测试删除测试
把 error 全 catch 掉
为了 portable 把所有用户 DB 强制迁到 exe 目录
```

---

# 32. 当前审计结论

该项目不是“功能没做完”导致的主要问题。

当前更核心的是：

```text
功能增长速度 > 架构与数据边界收敛速度
```

已经存在：

- Secret 存储不安全
- provider 协议抽象错误
- Life 隔离存在漏洞
- 关系图 invariant 依赖 UI
- snapshot/export 名称与实际完整性不符
- 真实用户数据与伪造展示混杂
- 发布说明与实际数据落盘行为冲突
- 多个超大文件逐渐形成维护瓶颈
- 自动测试与 CI 尚未形成正式体系

因此正确顺序是：

```text
安全
→ 数据一致性
→ 功能正确性
→ 发布可靠性
→ 测试/CI
→ 架构拆分
→ 再继续新增功能
```

不要反过来。

---

# 33. 审计边界说明

本整改说明基于：

```text
main @ 177a7d754028e9d0b37f7b2a458deebc8d6566c1
```

完成的是仓库级**静态审计**：

- 前端目录与关键 feature
- API client/types
- AI service / prompt store
- Tauri commands
- Rust models/repositories
- SQLite migrations
- domain tests
- Tauri config/capabilities
- build/package scripts
- README/configuration
- 手写 E2E scripts

审计环境本身没有直接完成本地 clone/build/runtime 执行，因此 Coding Agent 开工后的第一责任是：

```text
在真实仓库工作区跑完整 build/test
```

如果 runtime 结果暴露本文未覆盖的问题：

1. 不要忽略；
2. 加到当前整改分支；
3. 补相应回归测试；
4. 在最终报告中说明。

