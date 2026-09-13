-- 003_integrity_hardening.sql
-- 数据完整性加固：为特质增加独立装备状态字段 equip_state，修复历史借用 icon 字段的问题
ALTER TABLE trait ADD COLUMN equip_state TEXT NOT NULL DEFAULT 'unequipped';

-- 将旧数据中存放在 icon 字段的 'active' / 'benched' 状态平滑迁移至 equip_state
UPDATE trait SET equip_state = 'active' WHERE icon = 'active';
UPDATE trait SET equip_state = 'benched' WHERE icon = 'benched';
UPDATE trait SET icon = NULL WHERE icon IN ('active', 'benched');

-- 为 equip_state 创建多列索引加速佩戴特质过滤
CREATE INDEX IF NOT EXISTS idx_trait_equip_state ON trait(life_id, equip_state);
