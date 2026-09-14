-- 004_trait_equip_state_constraints.sql
-- 完整性加固与核心联合索引

-- 为 equip_state 增加校验触发器，约束必须是 'active' | 'benched' | 'unequipped'
CREATE TRIGGER IF NOT EXISTS trg_trait_equip_state_insert
BEFORE INSERT ON trait
FOR EACH ROW
WHEN NEW.equip_state NOT IN ('active', 'benched', 'unequipped')
BEGIN
    SELECT RAISE(ABORT, 'Invalid equip_state: must be active, benched, or unequipped');
END;

CREATE TRIGGER IF NOT EXISTS trg_trait_equip_state_update
BEFORE UPDATE OF equip_state ON trait
FOR EACH ROW
WHEN NEW.equip_state NOT IN ('active', 'benched', 'unequipped')
BEGIN
    SELECT RAISE(ABORT, 'Invalid equip_state: must be active, benched, or unequipped');
END;

-- 高频查询联合索引 (§P1-DB-03)
CREATE INDEX IF NOT EXISTS idx_focus_life_status ON focus(life_id, status);
CREATE INDEX IF NOT EXISTS idx_event_life_occurred ON event(life_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_essay_life_updated ON essay(life_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_focus_history_life_occurred ON focus_status_history(life_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_trait_rel_pred ON trait_relation(life_id, predecessor_id);
CREATE INDEX IF NOT EXISTS idx_trait_rel_succ ON trait_relation(life_id, successor_id);
