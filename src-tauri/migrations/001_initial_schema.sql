-- 001_initial_schema.sql
-- 人生战略游戏初始数据库架构 (SQLite 3)
-- 严格遵守 LIFE_STRATEGY_GAME_SPEC_FINAL_zh.md §14.2 逻辑表清单

PRAGMA foreign_keys = ON;

-- 1. 人生空间 (Life)
CREATE TABLE IF NOT EXISTS life (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. 领导人 (Leader) - 每个 Life 唯一
CREATE TABLE IF NOT EXISTS leader (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL UNIQUE REFERENCES life(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    portrait_attachment_id TEXT,
    body_md TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 3. 当前局势 (Situation) - 每个 Life 唯一
CREATE TABLE IF NOT EXISTS situation (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL UNIQUE REFERENCES life(id) ON DELETE CASCADE,
    body_md TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 4. 人生哲学 (Philosophy) - 每个 Life 唯一一篇长期 Markdown 文档
CREATE TABLE IF NOT EXISTS philosophy (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL UNIQUE REFERENCES life(id) ON DELETE CASCADE,
    body_md TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 5. 特质 (Trait)
CREATE TABLE IF NOT EXISTS trait (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    icon TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 6. 特质演化谱系 (TraitRelation: A -> B 前身-后继)
CREATE TABLE IF NOT EXISTS trait_relation (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    predecessor_id TEXT NOT NULL REFERENCES trait(id) ON DELETE CASCADE,
    successor_id TEXT NOT NULL REFERENCES trait(id) ON DELETE CASCADE,
    occurred_at TEXT NOT NULL,
    note TEXT,
    CONSTRAINT uq_trait_rel UNIQUE (life_id, predecessor_id, successor_id)
);

-- 7. 意识形态 (Ideology)
CREATE TABLE IF NOT EXISTS ideology (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 8. 国家精神 (NationalSpirit) - 无正负分类，无自动 modifier
CREATE TABLE IF NOT EXISTS national_spirit (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    icon TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 9. 稳定度 (Stability) - 真实主观数值，每个 Life 唯一，初始可为 NULL
CREATE TABLE IF NOT EXISTS stability (
    life_id TEXT PRIMARY KEY REFERENCES life(id) ON DELETE CASCADE,
    current_value REAL,
    updated_at TEXT NOT NULL
);

-- 10. 稳定度变更历史 (StabilityChange)
CREATE TABLE IF NOT EXISTS stability_change (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    before_value REAL,
    after_value REAL NOT NULL,
    delta REAL,
    occurred_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    reason TEXT,
    source_type TEXT,
    source_id TEXT
);

-- 11. 国策 (Focus) - 单大画布自由节点，四状态
CREATE TABLE IF NOT EXISTS focus (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    icon TEXT,
    image_attachment_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused', 'revoked')),
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 12. 国策关系 (FocusRelation: 前置 prerequisite / 互斥 mutually_exclusive)
CREATE TABLE IF NOT EXISTS focus_relation (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    source_focus_id TEXT NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
    target_focus_id TEXT NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('prerequisite', 'mutually_exclusive')),
    note TEXT,
    CONSTRAINT uq_focus_rel UNIQUE (life_id, source_focus_id, target_focus_id, relation_type)
);

-- 13. 国策状态历史 (FocusStatusHistory)
CREATE TABLE IF NOT EXISTS focus_status_history (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    focus_id TEXT NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL CHECK (to_status IN ('active', 'completed', 'paused', 'revoked')),
    occurred_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    reason TEXT,
    source_type TEXT,
    source_id TEXT
);

-- 14. 决议 (Decision) - 独立待办事项，不挂国策
CREATE TABLE IF NOT EXISTS decision (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    category TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('one_off', 'repeatable')),
    status TEXT NOT NULL CHECK (status IN ('open', 'completed', 'abandoned')),
    target_time TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 15. 决议执行记录 (DecisionOccurrence) - 重复决议无限次完成
CREATE TABLE IF NOT EXISTS decision_occurrence (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    decision_id TEXT NOT NULL REFERENCES decision(id) ON DELETE CASCADE,
    occurred_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    note TEXT,
    voided_at TEXT,
    void_reason TEXT
);

-- 16. 决议状态历史 (DecisionStatusHistory)
CREATE TABLE IF NOT EXISTS decision_status_history (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    decision_id TEXT NOT NULL REFERENCES decision(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL CHECK (to_status IN ('open', 'completed', 'abandoned')),
    occurred_at TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    reason TEXT
);

-- 17. 事件与超事件 (Event) - 普通与超事件，无自动效果
CREATE TABLE IF NOT EXISTS event (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL CHECK (kind IN ('normal', 'super')),
    occurred_on TEXT NOT NULL,
    image_attachment_id TEXT,
    quote TEXT,
    snapshot_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 18. 随笔 (Essay)
CREATE TABLE IF NOT EXISTS essay (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 19. 对象泛型关联 (ObjectLink)
CREATE TABLE IF NOT EXISTS object_link (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'reference',
    created_at TEXT NOT NULL
);

-- 20. 世界快照 (WorldSnapshot) - 独立命名冻结世界
CREATE TABLE IF NOT EXISTS world_snapshot (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    snapshot_schema_version INTEGER NOT NULL DEFAULT 1,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 21. 文本快照 (TextSnapshot) - 主动留存文本版本
CREATE TABLE IF NOT EXISTS text_snapshot (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    body_md TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 22. 总参谋部成员 (StaffMember)
CREATE TABLE IF NOT EXISTS staff_member (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    prompt TEXT NOT NULL,
    provider_config_id TEXT,
    model TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 23. 总参谋部会议 (StaffMeeting)
CREATE TABLE IF NOT EXISTS staff_meeting (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    confirmed_minutes_md TEXT,
    context_module_names TEXT NOT NULL,
    rounds INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'aborted')),
    created_at TEXT NOT NULL
);

-- 24. 总参谋部发言 (StaffMessage - 仅在用户选择保留讨论记录时存储)
CREATE TABLE IF NOT EXISTS staff_message (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    meeting_id TEXT NOT NULL REFERENCES staff_meeting(id) ON DELETE CASCADE,
    speaker_label TEXT NOT NULL,
    round_index INTEGER NOT NULL,
    confirmed_content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 25. 受管理附件 (Attachment)
CREATE TABLE IF NOT EXISTS attachment (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    hash TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

-- 26. 附件引用关联 (AttachmentLink)
CREATE TABLE IF NOT EXISTS attachment_link (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    attachment_id TEXT NOT NULL REFERENCES attachment(id) ON DELETE CASCADE,
    owner_type TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 27. 模型连接配置 (ProviderConfig - 应用级配置，不归属特定 Life，不存敏感 Key)
CREATE TABLE IF NOT EXISTS provider_config (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    endpoint TEXT,
    secret_ref TEXT NOT NULL,
    default_model TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 28. 应用全局设置 (AppSetting)
CREATE TABLE IF NOT EXISTS app_setting (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 29. 迁移记录表 (_migrations)
CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    checksum TEXT NOT NULL
);

-- 30. 索引优化 (用于加速以 life_id 维度的查询和按时间倒序排列表现)
CREATE INDEX IF NOT EXISTS idx_trait_life ON trait(life_id);
CREATE INDEX IF NOT EXISTS idx_ideology_life ON ideology(life_id);
CREATE INDEX IF NOT EXISTS idx_spirit_life ON national_spirit(life_id);
CREATE INDEX IF NOT EXISTS idx_stability_change_life ON stability_change(life_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_life ON focus(life_id);
CREATE INDEX IF NOT EXISTS idx_focus_history_life ON focus_status_history(life_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_life ON decision(life_id);
CREATE INDEX IF NOT EXISTS idx_decision_occ_life ON decision_occurrence(life_id, decision_id);
CREATE INDEX IF NOT EXISTS idx_event_life ON event(life_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_essay_life ON essay(life_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_life ON world_snapshot(life_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_text_snap_life ON text_snapshot(life_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_meeting_life ON staff_meeting(life_id, created_at DESC);
