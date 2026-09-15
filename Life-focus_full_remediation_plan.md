# Life-focus 全量问题整改执行方案

> 仓库：`xiaohongfa/Life-focus`  
> 适用对象：Coding Agent / Claude Code / Codex / Cursor Agent  
> 目标：**在不破坏现有产品功能与视觉风格的前提下，系统性解决当前已识别的安全性、数据一致性、运行可靠性、测试覆盖、架构可维护性、文档一致性与发布工程问题。**
>
> 本文不是产品需求文档，而是**可直接执行的工程整改任务单**。

---

# 0. 当前项目判断

当前 Life-focus 已经具备可用产品形态：

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Flow / `@xyflow/react`
- Tauri 2
- Rust
- SQLite / `rusqlite`
- 本地持久化
- 多 Life 空间
- Focus DAG
- Trait 系统
- Stability
- Archive
- Snapshot
- Essay
- Staff / AI 参谋系统
- LLM Rust 代理
- Browser Mock
- Rust Domain Tests

当前项目**不是“不能用”**，主要问题是：

1. 安全设计仍有真实漏洞
2. 部分重构没有完全闭环
3. 前端 Mock 与真实 Rust Backend 已发生行为漂移
4. 错误状态与异步状态管理不够完整
5. 若继续快速加功能，巨型文件会迅速提高回归概率
6. 测试与 CI 还不足以约束大型 Agent 改动
7. README、注释、实现、测试之间存在少量不一致

整改目标不是推倒重写，而是：

```text
修安全漏洞
→ 修数据一致性
→ 修运行时状态问题
→ 修 Mock/真实实现漂移
→ 补自动测试
→ 建 CI
→ 再做有限、可验证的结构拆分
→ 校正文档与发布脚本
```

---

# 1. 总体执行原则

Agent 必须遵守以下规则。

## 1.1 禁止破坏性重构

不得：

- 重写整个前端
- 重写整个 Rust backend
- 替换 SQLite
- 替换 Tauri
- 引入不必要的大型状态管理框架
- 删除现有业务能力
- 改变产品核心交互逻辑
- 改变军事战略 / HOI 风格 UI
- 为了“代码洁癖”进行全仓格式化
- 修改旧 migration 内容来修线上/旧库
- 使用删库重建作为 migration 修复手段

---

## 1.2 旧 Migration 不得修改

已经存在：

```text
001_initial_schema.sql
002_sub_focus.sql
003_integrity_hardening.sql
```

原则：

```text
已发布 migration = immutable
```

如果 schema 需要继续修正：

```text
004_xxx.sql
005_xxx.sql
...
```

不得回头修改历史 migration。

---

## 1.3 每个 P0 / P1 必须有自动测试

禁止：

```text
只改 UI
只改注释
只改 README
只靠人工点一下
```

至少需要：

```text
Rust unit/integration test
或
TypeScript unit/component test
```

---

# 2. 开工前基线

先执行：

```bash
git status
git rev-parse HEAD
git log -5 --oneline
```

然后：

```bash
pnpm install --frozen-lockfile
pnpm build
```

Rust：

```bash
cd src-tauri

cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test

cd ..
```

如果 baseline 本身失败：

```text
记录原始失败
再开始修改
```

不要把旧错误误判成新改动导致。

---

# 3. P0 —— 安全与数据正确性

---

# P0-SEC-01：修复 LLM localhost URL 校验绕过

## 当前问题

Rust 后端的 URL 安全判断使用字符串前缀逻辑。

类似：

```rust
trimmed.starts_with("http://localhost")
trimmed.starts_with("http://127.0.0.1")
```

这种判断不是 URL host 校验。

可能误放行：

```text
http://localhost.evil.com
http://localhost@evil.com
http://127.0.0.1.evil.com
```

最终可能把：

```text
Authorization: Bearer <API_KEY>
```

通过 HTTP 发送给远程主机。

---

## 目标实现

增加 URL Parser 依赖：

```toml
url = "2"
```

或者使用 `reqwest::Url`。

实现：

```rust
pub fn validate_url_security(url_str: &str) -> Result<(), String>
```

逻辑：

### HTTPS

所有合法 HTTPS：

```text
https://...
```

允许。

### HTTP

仅允许 host 精确等于：

```text
localhost
127.0.0.1
::1
```

端口不限。

### 其他协议

拒绝：

```text
ftp://
file://
ws://
javascript:
data:
```

---

## 必须新增测试

```text
https://api.openai.com/v1              allow
https://api.deepseek.com               allow

http://localhost:11434                 allow
http://127.0.0.1:8000                  allow
http://[::1]:11434                     allow

http://localhost.evil.com              reject
http://localhost@evil.com              reject
http://127.0.0.1.evil.com              reject
http://evil.com                         reject
ftp://localhost                         reject
```

---

# P0-SEC-02：API Key 不得继续以“安全存储”名义明文落盘

## 当前问题

当前 Rust `KeyStore` 将：

```text
provider
base_url
model
api_key
```

整体序列化到：

```text
llm_credentials.json
```

这是普通文件，不属于真正的 Secret Store。

---

## 目标

正式桌面环境中：

```text
Renderer
    ↓
Tauri command
    ↓
Secret Store
```

推荐优先级：

```text
1. OS Credential Manager / Keychain / Secret Service
2. Tauri Stronghold
3. 经过明确安全评估的 secret store
```

普通 JSON 只能保存：

```json
{
  "provider": "...",
  "baseUrl": "...",
  "model": "...",
  "secretRef": "..."
}
```

不能保存完整 API Key。

---

## 兼容迁移

必须兼容以下历史来源：

```text
localStorage.life_strategy_llm_config
data/llm_credentials.json
```

迁移策略：

1. 读取旧 key
2. 写入 Secret Store
3. Secret Store 成功后再删除旧 secret
4. 保留非敏感配置
5. 失败时不能先删除旧 key
6. 完成后不得再次把 raw key 写回旧存储

---

## API 设计

Renderer 正常只能看到：

```ts
interface LlmConfigView {
  provider: string
  baseUrl: string
  model: string
  hasApiKey: boolean
  maskedKey?: string | null
}
```

禁止返回：

```text
raw apiKey
Authorization Header
secret store content
```

---

## 验收

全仓搜索：

```text
apiKey
Authorization
localStorage
llm_credentials
```

确保：

- Desktop Tauri 路径不把 raw key 写入 localStorage
- raw key 不写普通 JSON
- raw key 不写日志
- 导出功能不包含 raw key

---

# P0-SEC-03：Browser 模式禁止伪装成安全生产实现

## 当前问题

Browser Preview fallback 仍然：

```text
localStorage 保存 apiKey
renderer fetch LLM
```

对于开发调试可以接受，但不能和桌面安全实现混淆。

---

## 目标

明确 Browser Preview 是：

```text
Development-only insecure mock
```

推荐两种方案任选一种：

### 方案 A

Browser Mock 不允许真实 LLM 调用：

```text
pnpm dev
→ 使用 fake response
```

这样最安全。

### 方案 B

允许 Browser Dev 真实调用，但必须：

- 明确开发模式
- UI 标记“不安全开发预览”
- 不宣传安全存储
- production build 不走该路径

---

# P0-DATA-01：彻底修复 Trait `icon` / `equip_state` 混用

## 当前问题

Migration 003 已经新增：

```text
equip_state
```

目的是停止借用：

```text
icon = active
icon = benched
```

但 repository 中部分逻辑仍然双写。

这会覆盖真实图标。

---

## 正确领域模型

```text
icon
→ UI 图标

equip_state
→ active
→ benched
→ unequipped
```

---

## 必须修改

至少检查：

```text
Repository::create_trait
Repository::update_trait
Repository::set_active_trait_stage
Repository::set_trait_equipped
Repository::resolve_active_equipped_traits
get_world_overview
Browser Mock resolveActiveEquippedTraits
LeaderView
相关 Trait UI
```

运行时逻辑必须只读写：

```text
equip_state
```

除 migration 兼容代码外，禁止再依赖：

```text
icon == "active"
icon == "benched"
```

---

## 数据兼容

由于 Migration 003 已经迁移：

```text
icon active/benched
→ equip_state
→ icon NULL
```

新代码不应再次把旧值写回。

---

## 测试

至少增加：

```text
创建 icon="brain"
→ equip trait
→ icon 仍是 "brain"
→ equip_state == "active"

bench trait
→ icon 仍是 "brain"
→ equip_state == "benched"

再次 active
→ icon 仍是 "brain"
```

---

# P0-DATA-02：Trait Group 操作必须事务化

## 当前问题

类似：

```rust
for tid in group_trait_ids {
    conn.execute(...)
}
```

如果中途执行失败：

```text
前几条成功
后几条失败
```

可能得到部分状态更新。

---

## 目标

涉及批量领域状态更新时：

```text
transaction
```

包括：

```text
set_active_trait_stage
set_trait_equipped
```

全部成功：

```text
commit
```

任意失败：

```text
rollback
```

---

# P0-DATA-03：所有跨 Life 写操作必须后端强约束

项目已经对部分 Focus / Trait relation 做了 Life 校验，这是正确的。

需要全仓系统检查：

```text
UPDATE
DELETE
relation creation
snapshot
staff
event
essay
sub-focus
archive action
```

所有修改型 repository 方法必须至少满足：

```sql
WHERE id = ? AND life_id = ?
```

或者等价的所属关系校验。

禁止仅凭前端传入 id 直接更新。

---

# P0-DATA-04：关系型领域数据必须阻止跨 Life 关联

需要检查：

```text
FocusRelation
TraitRelation
SubFocus
StaffMessage/StaffMeeting
Event snapshot_id
AttachmentLink
ObjectLink
```

外键存在并不自动保证：

```text
两个对象属于同一个 Life
```

必要时：

- repository 先验证
- 或增加 composite FK / trigger / constraint

尤其关系创建接口必须明确拒绝：

```text
Life A object -> Life B object
```

---

# P0-DATA-05：Focus / Trait DAG 校验补全边界测试

当前已有 DAG cycle prevention，是优点。

补测试：

```text
A -> A                       reject
A -> B -> C -> A             reject
cross-life                   reject
duplicate prerequisite       idempotent / reject，行为必须明确
mutual exclusion A-B
mutual exclusion B-A         不得重复
```

---

# P0-DATA-06：输入领域值在后端做枚举校验

前端 TypeScript union 不能代替 Rust 后端验证。

需要检查：

```text
FocusStatus
FocusRelationType
SubFocus status
Event kind
Trait equip_state
Staff meeting status
```

Rust command / repository 必须拒绝非法字符串。

不要完全依赖 SQLite CHECK，因为：

- command 错误信息差
- 某些字段没有 CHECK
- Mock 可能绕过

---

# 4. P1 —— 运行可靠性

---

# P1-APP-01：App 初始化失败不能无限显示 Loading

## 当前问题

初始化异常时：

```text
console.error
loading = false
currentLife = null
```

但 UI 仍通过：

```text
loading || !currentLife
```

显示加载中。

---

## 目标

建立：

```ts
type InitState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string }
```

或等价实现。

错误 UI：

```text
初始化失败
错误摘要
重新尝试
```

---

# P1-APP-02：Life 切换时禁止旧数据污染新 Life

## 当前问题

切换 Life 后：

```text
currentLife = B
overview/stability/essays 仍可能暂时是 A
```

---

## 修复

切换开始：

```ts
setOverview(null)
setStability(null)
setEssays([])
```

并维护：

```text
loadingLifeId
```

只有：

```text
response.lifeId == currentLifeId
```

才允许提交状态。

已有 race guard 要保留。

---

# P1-APP-03：所有页面异步请求检查 stale response

需要检查：

```text
FocusCanvasView
LeaderView
CabinetView
ArchiveView
SnapshotsView
IdeologyPhilosophyView
NationalSpiritView
SettingsModal
StabilityModal
EssayModal
```

风险：

```text
组件 lifeId 改变
旧请求晚返回
覆盖新 life 数据
```

推荐：

```text
request version
AbortController（Web fetch 场景）
mounted flag
lifeId ref guard
```

至少保证写 state 前校验当前 lifeId。

---

# P1-APP-04：保存操作增加明确失败状态

不要只有：

```text
console.error
```

对于用户主动触发：

```text
Save
Delete
Create
Rename
Generate
Export
```

需要用户可见反馈：

```text
保存失败
重试
```

至少不能 silently fail。

---

# P1-APP-05：删除 Life 时清理当前界面状态

删除当前 Life 时，应确保：

```text
modal close
editing object reset
old life async response invalidated
active feature state reset
```

避免删除后旧 modal 继续操作已不存在的 life。

---

# P1-APP-06：ErrorBoundary 只负责 render error，不承担 async error

明确职责：

```text
React ErrorBoundary
→ render / lifecycle error

async command error
→ local error state / toast / result UI
```

禁止误以为 ErrorBoundary 能捕获：

```text
await api.xxx()
```

错误。

---

# 5. P1 —— LLM 系统可靠性

---

# P1-LLM-01：统一 Provider endpoint 生成逻辑

当前：

```text
OpenAI compatible
Gemini
Browser fallback
test connection
normal chat
```

可能各自拼 endpoint。

需要抽：

```rust
build_openai_endpoint(...)
build_gemini_endpoint(...)
```

或统一 provider abstraction。

避免：

```text
/chat/completions/chat/completions
/v1/v1
```

这类 endpoint 重复拼接。

---

# P1-LLM-02：LLM response parsing 增加结构错误处理

当前直接读取：

```text
choices[0].message.content
candidates[0].content.parts[0].text
```

要对：

```text
empty choices
content null
provider error body
safety block
rate limit
malformed JSON
```

提供清晰错误。

---

# P1-LLM-03：限制错误响应体长度

禁止把服务端超长错误完整返回 Renderer。

例如最多：

```text
2 KB ~ 4 KB
```

避免：

- 巨型错误体
- HTML 页面
- 上游返回敏感调试信息

---

# P1-LLM-04：API Key 脱敏要覆盖 URL query

Gemini 当前可能：

```text
...?key=<API_KEY>
```

如果 reqwest 错误包含 URL，就可能泄露 key。

必须确保：

```text
sanitize_error
```

对：

```text
header secret
URL query secret
raw key
```

统一脱敏。

最好避免把 key 放 query，如果 provider API 强制如此，则错误日志必须脱敏。

---

# P1-LLM-05：连接测试不能写入配置

测试连接：

```text
temporary provider/baseUrl/model/key
```

只能测试，不应隐式覆盖已保存配置。

保存和测试是两个独立动作。

---

# 6. P1 —— 数据库与 Migration

---

# P1-DB-01：Migration checksum 机制保留

现有 SHA-256 migration checksum 思路是好的。

需要补：

```text
migration checksum mismatch test
migration applied once test
migration sequential upgrade test
```

---

# P1-DB-02：新增 Migration 校验 equip_state

建议新增：

```text
004_trait_equip_state_constraints.sql
```

根据 SQLite 可行性加入：

```text
CHECK equip_state IN ('active','benched','unequipped')
```

如果 SQLite ALTER TABLE 限制导致难以直接添加：

- rebuild table
- copy data
- rename
- transaction

必须兼容已有数据库。

---

# P1-DB-03：增加关键索引

检查常用查询：

```text
life_id
created_at
occurred_at
status
archived_at
focus_id
meeting_id
```

针对高频查询补索引，例如：

```text
focus(life_id, status)
event(life_id, occurred_on)
essay(life_id, updated_at)
focus_status_history(life_id, occurred_at)
trait_relation(life_id, predecessor_id)
trait_relation(life_id, successor_id)
```

必须通过实际 query 使用情况判断，不要盲目加几十个索引。

---

# P1-DB-04：所有复合写操作使用 transaction

检查：

```text
create life
delete life
focus status + history
trait batch update
meeting + messages
snapshot creation
event + link
```

原则：

> 一个用户动作对应多个 SQL mutation 时，应尽量原子化。

---

# P1-DB-05：UPDATE / DELETE 后检查 affected rows

例如：

```rust
conn.execute(...)
```

若更新 0 行，现在有些方法仍可能返回：

```text
Ok(())
```

这会制造“保存成功但其实对象不存在”。

关键更新操作应：

```text
affected == 1
```

否则返回：

```text
Not Found / Domain Error
```

---

# 7. P1 —— Browser Mock 与真实 Backend 一致性

---

# P1-MOCK-01：同步 Trait equip_state

Browser Mock 必须改为：

```text
equip_state
```

不再使用：

```text
icon active/benched
```

---

# P1-MOCK-02：Mock 返回结构必须与 Rust 一致

系统检查：

```text
snake_case / camelCase
nullable fields
default values
enum values
sort order
timestamps
```

Mock 不应该返回 Rust backend 永远不会返回的结构。

---

# P1-MOCK-03：Mock 不要复制复杂领域算法

如果同一领域规则在：

```text
Rust
TypeScript Mock
UI
```

重复实现 3 次，必然漂移。

至少把 TypeScript 侧共享逻辑抽到：

```text
src/domain/
```

Browser Mock 和 UI 共用。

Rust 与 TS 无法直接共享代码时：

- 用测试数据契约保证一致
- 不要再复制额外版本

---

# 8. P1 —— TypeScript API 层整理

---

# P1-API-01：拆分巨大 `src/api/client.ts`

当前 client 体积已经过大。

建议拆成：

```text
src/api/
  core.ts
  life.ts
  focus.ts
  trait.ts
  world.ts
  archive.ts
  staff.ts
  snapshot.ts
  essay.ts
  index.ts
  types.ts
```

保持外部调用方式：

```ts
api.life.list()
api.focus.create()
```

或兼容现有：

```ts
api.listLives()
```

短期可用 re-export 防止全仓大改。

---

# P1-API-02：tauriInvoke 统一错误类型

不要全项目到处：

```text
catch(any)
String(err)
```

定义：

```ts
interface AppError {
  code?: string
  message: string
  details?: string
}
```

Rust command 后续可逐渐返回结构化错误。

---

# P1-API-03：统一命名规范

目前：

```text
Rust snake_case
TS camelCase args
database snake_case fields
```

这是正常的，但需要明确边界。

推荐：

```text
DB model serialized fields：snake_case
Tauri command args：camelCase 或 snake_case 二选一
UI state：camelCase
```

不要同一层混用两套命名。

---

# 9. P2 —— 前端结构拆分

这一阶段必须在 P0/P1 通过后进行。

---

# P2-FE-01：拆 `LeaderView.tsx`

目标：

```text
features/leader/
  LeaderView.tsx
  components/
    LeaderProfile.tsx
    TraitList.tsx
    TraitEditor.tsx
    TraitGraph.tsx
    TraitStageControls.tsx
  hooks/
    useLeaderData.ts
    useTraits.ts
  domain/
    traitGraph.ts
```

原则：

```text
View 负责布局
Hook 负责数据
Domain 负责纯逻辑
Component 负责局部 UI
```

---

# P2-FE-02：拆 `FocusCanvasView.tsx`

建议：

```text
features/focus/
  FocusCanvasView.tsx
  FocusNode.tsx
  hooks/
    useFocusGraph.ts
    useFocusMutations.ts
    useFocusSelection.ts
  components/
    FocusEditor.tsx
    FocusToolbar.tsx
    FocusRelationEditor.tsx
    FocusAIPanel.tsx
  domain/
    focusGraph.ts
```

---

# P2-FE-03：拆 `CabinetView.tsx`

建议：

```text
features/cabinet/
  CabinetView.tsx
  hooks/
    useStaff.ts
    useMeeting.ts
  components/
    StaffList.tsx
    StaffEditor.tsx
    MeetingPanel.tsx
    MeetingHistory.tsx
```

---

# P2-FE-04：拆 `SettingsModal.tsx`

设置页通常容易堆积。

拆成：

```text
settings/
  GeneralSettings.tsx
  LlmSettings.tsx
  ExportSettings.tsx
  DangerZone.tsx
```

---

# P2-FE-05：纯逻辑不得藏在 JSX 组件中

以下类型逻辑应该抽离：

```text
图算法
状态转换
数据排序
关系归一化
LLM response normalization
export data transform
```

好处：

```text
可单测
不依赖 DOM
减少组件复杂度
```

---

# 10. P2 —— Rust Backend 模块化

---

# P2-RUST-01：拆 `repositories/mod.rs`

建议：

```text
repositories/
  mod.rs
  life.rs
  stability.rs
  focus.rs
  trait_repo.rs
  ideology.rs
  spirit.rs
  archive.rs
  snapshot.rs
  essay.rs
  staff.rs
  event.rs
```

`mod.rs` 只做：

```rust
pub use ...
```

---

# P2-RUST-02：拆 `commands/mod.rs`

对应：

```text
commands/
  life.rs
  stability.rs
  focus.rs
  trait_cmd.rs
  archive.rs
  staff.rs
  llm.rs
```

---

# P2-RUST-03：引入明确 Domain Error

当前大量：

```text
Result<_, String>
```

建议逐步改为：

```rust
enum AppError {
    NotFound(...)
    Validation(...)
    Conflict(...)
    Database(...)
    Network(...)
    Security(...)
}
```

然后 Tauri 层序列化。

不要一次重写所有错误；可从 P0/P1 涉及模块开始。

---

# 11. P2 —— LLM Service 拆分

当前 `llmService.ts` 体积过大。

建议：

```text
services/llm/
  config.ts
  client.ts
  context.ts
  parser.ts
  focusGeneration.ts
  cabinet.ts
  fallbacks.ts
  types.ts
  index.ts
```

职责：

```text
config
→ 配置读取/保存

client
→ llm_chat invoke

context
→ system context

parser
→ JSON 提取与 schema 校验

focusGeneration
→ focus prompt

cabinet
→ staff meeting prompt

fallbacks
→ 无 LLM 模式算法
```

---

# 12. P2 —— LLM 输出必须做 Schema Validation

不要：

```ts
JSON.parse(...)
然后直接 item.title
```

建议使用：

```text
zod
```

或轻量手写 validator。

例如 Focus proposal：

```text
direction string
title string
bodyMd string
status enum
relationType enum
```

模型输出不满足：

```text
拒绝
fallback
```

不要 silently 接受畸形结构。

---

# 13. P2 —— UI / UX 一致性

---

# P2-UX-01：Loading 状态统一

统一设计：

```text
页面首次加载
局部保存
删除
AI 生成
切换 Life
```

不要每个组件自己发明 loading 文案与逻辑。

---

# P2-UX-02：危险操作统一确认

例如：

```text
删除 Life
删除 Focus
删除 Trait
删除 Snapshot
清空 API Key
```

必须：

```text
明确对象名
明确不可逆性
确认按钮
```

不要只靠 browser confirm。

---

# P2-UX-03：空状态统一

例如：

```text
无 Essay
无 Snapshot
无 Staff
无 Focus
无 Trait
```

空状态要说明：

```text
目前为空
可以做什么
```

---

# 14. 测试体系

---

# 14.1 Rust 必测领域

至少覆盖：

```text
Life isolation
Focus DAG
Trait DAG
Trait equip_state
Stability history
Archive aggregation
Migration
Cross-life mutation rejection
Delete cascade
LLM URL security
LLM error sanitization
```

---

# 14.2 TypeScript Unit Tests

建议引入：

```text
Vitest
```

优先测纯函数：

```text
resolveActiveEquippedTraits
LLM response parsing
config normalization
focus proposal normalization
graph helpers
```

---

# 14.3 Component Tests

建议：

```text
React Testing Library
```

最低覆盖：

```text
App initialization error
Life switching stale data
Settings LLM config
Trait equip UI
```

---

# 14.4 E2E

后续可考虑：

```text
Playwright
```

但不作为本轮阻塞项。

---

# 15. CI

新增：

```text
.github/workflows/ci.yml
```

至少：

```yaml
pnpm install --frozen-lockfile
pnpm build

cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

如果增加 Vitest：

```bash
pnpm test --run
```

---

# 16. README 与文档一致性

必须修正：

```text
README：tauri-plugin-sql
实际：rusqlite
```

并检查：

```text
Node version
Rust version
pnpm version
Tauri version
DB implementation
LLM provider behavior
portable mode
API key storage描述
network behavior
```

原则：

> README 只能描述已经实现的事实。

禁止使用：

```text
绝对安全
百分百安全
完全离线
绝不联网
系统级加密
```

除非实现真的满足。

---

# 17. 发布脚本问题

---

# 17.1 不要从 Windows Git Credential Manager 导出 GitHub Token 到脚本流程

当前辅助脚本通过 Windows Credential Manager 获取 token。

这不是应用运行时问题，但对发布工程不理想。

推荐正式发布：

```text
GitHub Actions
GITHUB_TOKEN
```

或者：

```text
gh release
```

避免维护：

```text
get_token.ps1
```

---

# 17.2 版本号必须单一来源

当前：

```text
package.json
Cargo.toml
tauri.conf.json
release scripts
tag
asset name
```

容易漂移。

推荐：

```text
package.json / tauri.conf
```

设定一个主版本来源。

发布脚本动态读取版本。

禁止硬编码：

```text
v0.1.0
```

到多处。

---

# 17.3 Release Asset 不应先全删再上传

如果上传中途失败：

```text
旧 asset 已删
新 asset 未完整上传
```

Release 变残缺。

更安全：

```text
先上传临时/新名称
验证成功
再删除旧 asset
```

或：

```text
GitHub Actions 原子发布
```

---

# 18. Export 安全检查

检查：

```text
export_life_json
export_life_markdown
```

必须确保不包含：

```text
API Key
Authorization
llm credential file path
secret_ref 的敏感实现细节
其他 Life 数据
```

增加测试：

```text
export Life A
不得出现 Life B
不得出现 llm secret
```

---

# 19. Portable Mode

当前 portable：

```text
--portable
portable.flag
data/
```

需要明确规则：

```text
如果 portable.flag 存在
→ DB
→ attachments
→ app config
→ secret storage（如果 secret store 不支持便携则文档说明）
```

特别注意：

如果改为 OS Keychain：

```text
portable 数据文件可随目录移动
API Key 不一定随目录移动
```

这个差异需要 README 写清楚。

如果用户要求“真正全便携凭据”，应使用：

```text
Stronghold + master password
```

而不是假装 OS Keychain 是便携存储。

---

# 20. 日志安全

检查所有：

```text
log::info!
log::error!
console.log
console.error
console.warn
```

禁止记录：

```text
API Key
Authorization Header
完整 LLM request
包含高度私密个人内容的完整 prompt
完整数据库 payload
```

错误日志建议：

```text
错误类型
provider
status code
request id
```

不要输出用户全部人生数据。

---

# 21. CSP 与网络策略

当前 Tauri CSP 应保持严格。

原则：

Renderer 不直接调用外网 LLM 后：

```text
connect-src
```

应尽可能只保留：

```text
self
ipc
```

如果 Browser Preview 不属于生产 CSP，则不要为了 Browser Dev 扩大桌面生产 CSP。

---

# 22. 数据模型一致性检查

系统检查以下 TypeScript 与 Rust struct 是否字段一致：

```text
Life
Leader
Trait
TraitRelation
Ideology
Philosophy
Situation
NationalSpirit
Stability
StabilityChange
Focus
FocusRelation
FocusStatusHistory
Event
Essay
ArchiveItem
WorldSnapshot
FocusSubItem
StaffMember
StaffMeeting
```

重点：

```text
nullable
optional
boolean/int
snake_case
enum
```

---

# 23. Archive 领域检查

Archive 是聚合视图，不应制造伪造事实。

检查：

```text
Event
Essay
FocusStatusHistory
StabilityChange
```

Archive summary 必须来源于真实数据。

禁止：

```text
系统自动生成看起来像用户经历过的事实
```

如果是 AI summary，应明确标记 AI 生成。

---

# 24. Snapshot 可靠性

WorldSnapshot：

```text
payload_json
snapshot_schema_version
```

必须：

1. snapshot schema version 有真实用途
2. parse 失败能提示
3. 删除 snapshot 不破坏其他实体
4. event.snapshot_id 如存在，应处理引用关系
5. snapshot export 不含 secret

后续如果实现 restore：

```text
必须事务化
必须版本兼容
必须确认
```

---

# 25. Staff / AI Meeting 可靠性

检查：

```text
StaffMember
StaffMeeting
StaffMessage
```

要求：

```text
create meeting + messages 原子化
round_index 合法
messages speaker 属于当前 life
disabled staff 不应自动参与
```

LLM 失败：

```text
会议不要假装 completed
```

状态应该：

```text
in_progress
completed
aborted
```

真实对应。

---

# 26. 删除行为检查

系统性检查：

```text
delete life
delete focus
delete trait
delete ideology
delete spirit
delete essay
delete snapshot
delete staff
delete sub-focus
```

要求：

```text
关联数据不会变 orphan
跨 Life 不会误删
删除不存在对象不能静默成功
```

---

# 27. 时间与排序一致性

当前大量：

```text
created_at
updated_at
occurred_at
recorded_at
```

统一规则：

```text
数据库存 UTC RFC3339
UI 层做本地化显示
```

不要混：

```text
SQLite datetime('now')
chrono RFC3339
本地时间字符串
```

Migration applied_at 除外，但建议后续也统一格式。

---

# 28. 性能问题

当前项目体量仍不算大型，不要过度优化。

只处理明显问题：

```text
重复全表扫描
React Flow 每次 render 重算图
大数组重复 map/filter
频繁写 SQLite position
```

Focus 节点拖动位置保存建议：

```text
onDragStop
```

而不是：

```text
每个 mouse move 都写 DB
```

---

# 29. React 性能与状态

检查：

```text
useEffect dependency
stale closure
useCallback
useMemo
React.lazy
```

不要机械添加：

```text
useMemo everywhere
useCallback everywhere
```

只有：

```text
昂贵计算
稳定回调真的有收益
```

才使用。

---

# 30. 可访问性基础

不要求全面 WCAG 重构，但最低：

```text
按钮有 aria-label
Modal focus management
ESC close
表单 label
disabled 状态
键盘可操作
```

特别是纯图标按钮。

---

# 31. 最终建议目录结构

前端：

```text
src/
  api/
  components/
  domain/
  features/
    archive/
    cabinet/
    dashboard/
    focus/
    ideology/
    leader/
    snapshots/
    spirit/
  services/
    llm/
  utils/
```

Rust：

```text
src-tauri/src/
  commands/
  db/
  llm/
  models/
  repositories/
  errors.rs
  lib.rs
  main.rs
```

---

# 32. 推荐执行阶段

---

## Phase 1：安全

完成：

```text
P0-SEC-01
P0-SEC-02
P0-SEC-03
日志安全
Export secret 检查
```

测试全部通过再进入下一阶段。

---

## Phase 2：数据一致性

完成：

```text
equip_state
Trait transaction
cross-life
affected row
enum validation
relation constraints
```

---

## Phase 3：运行可靠性

完成：

```text
App init error
Life switching
stale async
save/delete error
modal reset
```

---

## Phase 4：Mock 与 API

完成：

```text
Browser Mock sync
client.ts split
error normalization
```

---

## Phase 5：测试与 CI

完成：

```text
Rust tests
Vitest
React Testing Library
GitHub Actions
```

---

## Phase 6：结构拆分

只拆：

```text
LeaderView
FocusCanvasView
CabinetView
SettingsModal
llmService
repositories/mod.rs
commands/mod.rs
```

不要扩散到全仓无关文件。

---

## Phase 7：文档与发布

完成：

```text
README
version sync
release flow
portable docs
security wording
```

---

# 33. 每个 Phase 验收命令

前端：

```bash
pnpm build
```

如果配置测试：

```bash
pnpm test --run
```

Rust：

```bash
cd src-tauri

cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

最后：

```bash
pnpm tauri build
```

如果当前 OS 支持。

---

# 34. Agent 每次提交规则

推荐每个 Phase 一个 commit：

```text
fix(security): harden llm endpoint and secret storage
fix(data): complete trait equip state migration
fix(app): harden life switching and init error states
refactor(api): align browser mock and split client layer
test(ci): add regression coverage and github actions
refactor(core): split oversized feature and repository modules
docs(release): align docs and publishing workflow
```

禁止：

```text
一个 commit 同时做 50 个不相关改动
```

---

# 35. 最终验收清单

完成后必须满足：

## 安全

- [ ] localhost URL 无字符串前缀绕过
- [ ] API Key 不以 raw secret 普通 JSON 持久化
- [ ] Desktop Renderer 不持有持久化 raw key
- [ ] 日志不包含 secret
- [ ] Export 不包含 secret
- [ ] CSP 未因为 LLM 放宽外网权限

## Trait

- [ ] `icon` 只用于 icon
- [ ] `equip_state` 只用于装备状态
- [ ] 批量装备事务化
- [ ] icon 不因 equip 操作丢失

## Life Isolation

- [ ] 所有 mutation 都验证 life_id
- [ ] relation 不允许跨 Life
- [ ] export 不串 Life
- [ ] async response 不串 Life

## App

- [ ] 初始化失败有 Error UI
- [ ] Life 切换不会展示旧数据
- [ ] 用户 mutation 失败有可见反馈
- [ ] 删除 Life 后旧 modal/state 不残留

## LLM

- [ ] provider endpoint 统一
- [ ] response schema 验证
- [ ] error body 限长
- [ ] error secret 脱敏
- [ ] test connection 不修改配置

## DB

- [ ] Migration immutable
- [ ] 新 schema 修复通过新 migration
- [ ] 关键批量写事务化
- [ ] affected rows 被验证

## Mock

- [ ] Mock 与 Rust enum 一致
- [ ] Mock 与 Rust字段一致
- [ ] equip_state 行为一致

## Tests

- [ ] `pnpm build`
- [ ] TS unit tests
- [ ] component tests
- [ ] `cargo fmt --check`
- [ ] `cargo clippy ... -D warnings`
- [ ] `cargo test`

## CI

- [ ] GitHub Actions 自动执行 build/test

## 架构

- [ ] `LeaderView` 已拆
- [ ] `FocusCanvasView` 已拆
- [ ] `CabinetView` 已拆
- [ ] `SettingsModal` 已拆
- [ ] `llmService` 已拆
- [ ] Rust repository/commands 已拆

## 文档与发布

- [ ] README 技术栈与实现一致
- [ ] 不再声称未实现的安全能力
- [ ] release version 单一来源
- [ ] 发布流程不依赖读取本机 GitHub Credential
- [ ] portable mode 行为文档准确

---

# 36. 最终停止条件

当以下全部满足时：

```text
所有 P0 完成
所有 P1 完成
P2 结构拆分完成
CI 通过
Build 通过
Rust clippy 通过
Rust test 通过
关键前端测试通过
README 与实现一致
```

则停止整改。

不要继续进行：

```text
无收益重命名
全仓格式重写
视觉重做
框架迁移
数据库替换
状态库替换
```

---

# 37. 最终目标

完成这份整改后，Life-focus 应达到：

```text
当前功能稳定可用
安全边界清晰
数据模型一致
Life 数据严格隔离
Mock 与生产行为一致
Agent 修改有测试约束
架构可以继续扩展
发布流程可重复
文档真实可信
```

核心原则：

> **不是为了“代码看起来高级”，而是为了让项目未来继续迭代时不会越来越脆。**
