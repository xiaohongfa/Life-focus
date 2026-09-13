-- 25. 子国策 (FocusSubItem) - 属于国策之下的可执行阶段行动/清单
CREATE TABLE IF NOT EXISTS focus_sub_item (
    id TEXT PRIMARY KEY,
    life_id TEXT NOT NULL REFERENCES life(id) ON DELETE CASCADE,
    focus_id TEXT NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_md TEXT,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'canceled')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_focus_sub_item_focus ON focus_sub_item(focus_id, sort_order ASC);
