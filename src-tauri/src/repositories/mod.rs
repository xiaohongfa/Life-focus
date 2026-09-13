use rusqlite::{params, Connection, Result};
use uuid::Uuid;
use crate::models::*;

fn custom_err(msg: impl Into<String>) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::other(msg.into())))
}

pub struct Repository;

impl Repository {
    // ==================== LIFE REPOSITORY ====================
    pub fn list_lives(conn: &Connection) -> Result<Vec<Life>> {
        let mut stmt = conn.prepare("SELECT id, name, created_at, updated_at FROM life ORDER BY created_at ASC")?;
        let rows = stmt.query_map([], |row| {
            Ok(Life {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_life(conn: &Connection, life_id: &str) -> Result<Option<Life>> {
        let mut stmt = conn.prepare("SELECT id, name, created_at, updated_at FROM life WHERE id = ?1")?;
        let mut rows = stmt.query_map([life_id], |row| {
            Ok(Life {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;
        match rows.next() {
            Some(res) => res.map(Some),
            None => Ok(None),
        }
    }

    pub fn create_life(conn: &mut Connection, name: &str) -> Result<Life> {
        let life_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO life (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
            params![life_id, name, now],
        )?;

        // 初始化单例对象 (Leader, Situation, Philosophy, Stability)
        let leader_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO leader (id, life_id, name, portrait_attachment_id, body_md, created_at, updated_at)
             VALUES (?1, ?2, '最高统帅', NULL, '自述你的战略思维模式与特质。', ?3, ?3)",
            params![leader_id, life_id, now],
        )?;

        let situation_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO situation (id, life_id, body_md, created_at, updated_at)
             VALUES (?1, ?2, '记录你当下的整体境况、战略要务与外在挑战。', ?3, ?3)",
            params![situation_id, life_id, now],
        )?;

        let philosophy_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO philosophy (id, life_id, body_md, created_at, updated_at)
             VALUES (?1, ?2, '# 核心原则与底层哲学\n\n在此记录长期奉行的价值观与根本决策基石。', ?3, ?3)",
            params![philosophy_id, life_id, now],
        )?;

        tx.execute(
            "INSERT INTO stability (life_id, current_value, updated_at) VALUES (?1, NULL, ?2)",
            params![life_id, now],
        )?;

        tx.commit()?;

        Ok(Life {
            id: life_id,
            name: name.to_string(),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn rename_life(conn: &Connection, life_id: &str, name: &str) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE life SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, life_id],
        )?;
        Ok(())
    }

    pub fn delete_life(conn: &mut Connection, life_id: &str) -> Result<()> {
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM life WHERE id = ?1", params![life_id])?;
        tx.commit()?;
        Ok(())
    }

    // ==================== STABILITY REPOSITORY ====================
    pub fn get_stability(conn: &Connection, life_id: &str) -> Result<Stability> {
        let mut stmt = conn.prepare("SELECT current_value, updated_at FROM stability WHERE life_id = ?1")?;
        let mut rows = stmt.query_map([life_id], |row| {
            Ok(Stability {
                life_id: life_id.to_string(),
                current_value: row.get(0)?,
                updated_at: row.get(1)?,
            })
        })?;
        match rows.next() {
            Some(res) => res,
            None => Ok(Stability {
                life_id: life_id.to_string(),
                current_value: None,
                updated_at: chrono::Utc::now().to_rfc3339(),
            }),
        }
    }

    pub fn set_stability(
        conn: &mut Connection,
        life_id: &str,
        new_value: f64,
        reason: Option<&str>,
        source_type: Option<&str>,
        source_id: Option<&str>,
    ) -> Result<StabilityChange> {
        let now = chrono::Utc::now().to_rfc3339();
        let change_id = Uuid::new_v4().to_string();

        let tx = conn.transaction()?;

        let before_value: Option<f64> = tx
            .query_row(
                "SELECT current_value FROM stability WHERE life_id = ?1",
                params![life_id],
                |row| row.get(0),
            )
            .unwrap_or(None);

        let delta = before_value.map(|b| new_value - b);

        tx.execute(
            "INSERT INTO stability (life_id, current_value, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(life_id) DO UPDATE SET current_value = ?2, updated_at = ?3",
            params![life_id, new_value, now],
        )?;

        tx.execute(
            "INSERT INTO stability_change (id, life_id, before_value, after_value, delta, occurred_at, recorded_at, reason, source_type, source_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?8, ?9)",
            params![change_id, life_id, before_value, new_value, delta, now, reason, source_type, source_id],
        )?;

        tx.commit()?;

        Ok(StabilityChange {
            id: change_id,
            life_id: life_id.to_string(),
            before_value,
            after_value: new_value,
            delta,
            occurred_at: now.clone(),
            recorded_at: now,
            reason: reason.map(String::from),
            source_type: source_type.map(String::from),
            source_id: source_id.map(String::from),
        })
    }

    pub fn get_stability_history(conn: &Connection, life_id: &str, limit: i64) -> Result<Vec<StabilityChange>> {
        let mut stmt = conn.prepare(
            "SELECT id, before_value, after_value, delta, occurred_at, recorded_at, reason, source_type, source_id
             FROM stability_change WHERE life_id = ?1 ORDER BY occurred_at DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![life_id, limit], |row| {
            Ok(StabilityChange {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                before_value: row.get(1)?,
                after_value: row.get(2)?,
                delta: row.get(3)?,
                occurred_at: row.get(4)?,
                recorded_at: row.get(5)?,
                reason: row.get(6)?,
                source_type: row.get(7)?,
                source_id: row.get(8)?,
            })
        })?;
        rows.collect()
    }

    // ==================== FOCUS REPOSITORY ====================
    pub fn get_foci(conn: &Connection, life_id: &str) -> Result<Vec<Focus>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, body_md, icon, image_attachment_id, status, position_x, position_y, created_at, updated_at
             FROM focus WHERE life_id = ?1 ORDER BY created_at ASC",
        )?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(Focus {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                image_attachment_id: row.get(4)?,
                status: row.get(5)?,
                position_x: row.get(6)?,
                position_y: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        rows.collect()
    }

    pub fn get_focus_relations(conn: &Connection, life_id: &str) -> Result<Vec<FocusRelation>> {
        let mut stmt = conn.prepare(
            "SELECT id, source_focus_id, target_focus_id, relation_type, note
             FROM focus_relation WHERE life_id = ?1",
        )?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(FocusRelation {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                source_focus_id: row.get(1)?,
                target_focus_id: row.get(2)?,
                relation_type: row.get(3)?,
                note: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_focus(
        conn: &mut Connection,
        life_id: &str,
        title: &str,
        body_md: &str,
        icon: Option<&str>,
        image_attachment_id: Option<&str>,
        status: &str,
        pos_x: f64,
        pos_y: f64,
    ) -> Result<Focus> {
        let focus_id = Uuid::new_v4().to_string();
        let history_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO focus (id, life_id, title, body_md, icon, image_attachment_id, status, position_x, position_y, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
            params![focus_id, life_id, title, body_md, icon, image_attachment_id, status, pos_x, pos_y, now],
        )?;

        tx.execute(
            "INSERT INTO focus_status_history (id, life_id, focus_id, from_status, to_status, occurred_at, recorded_at, reason)
             VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?5, '初始创建')",
            params![history_id, life_id, focus_id, status, now],
        )?;

        tx.commit()?;

        Ok(Focus {
            id: focus_id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            icon: icon.map(String::from),
            image_attachment_id: image_attachment_id.map(String::from),
            status: status.to_string(),
            position_x: pos_x,
            position_y: pos_y,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_focus_status(
        conn: &mut Connection,
        life_id: &str,
        focus_id: &str,
        new_status: &str,
        reason: Option<&str>,
        source_type: Option<&str>,
        source_id: Option<&str>,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        let history_id = Uuid::new_v4().to_string();

        let tx = conn.transaction()?;

        let current_status: String = tx.query_row(
            "SELECT status FROM focus WHERE id = ?1 AND life_id = ?2",
            params![focus_id, life_id],
            |row| row.get(0),
        )?;

        if current_status != new_status {
            tx.execute(
                "UPDATE focus SET status = ?1, updated_at = ?2 WHERE id = ?3 AND life_id = ?4",
                params![new_status, now, focus_id, life_id],
            )?;

            tx.execute(
                "INSERT INTO focus_status_history (id, life_id, focus_id, from_status, to_status, occurred_at, recorded_at, reason, source_type, source_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?8, ?9)",
                params![history_id, life_id, focus_id, current_status, new_status, now, reason, source_type, source_id],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    pub fn update_focus_position(
        conn: &Connection,
        life_id: &str,
        focus_id: &str,
        pos_x: f64,
        pos_y: f64,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE focus SET position_x = ?1, position_y = ?2, updated_at = ?3 WHERE id = ?4 AND life_id = ?5",
            params![pos_x, pos_y, now, focus_id, life_id],
        )?;
        Ok(())
    }

    pub fn update_focus_content(
        conn: &Connection,
        life_id: &str,
        focus_id: &str,
        title: &str,
        body_md: &str,
        icon: Option<&str>,
        image_attachment_id: Option<&str>,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE focus SET title = ?1, body_md = ?2, icon = ?3, image_attachment_id = ?4, updated_at = ?5
             WHERE id = ?6 AND life_id = ?7",
            params![title, body_md, icon, image_attachment_id, now, focus_id, life_id],
        )?;
        Ok(())
    }

    pub fn delete_focus(conn: &mut Connection, life_id: &str, focus_id: &str) -> Result<()> {
        let tx = conn.transaction()?;
        tx.execute(
            "DELETE FROM focus_relation WHERE life_id = ?1 AND (source_focus_id = ?2 OR target_focus_id = ?2)",
            params![life_id, focus_id],
        )?;
        tx.execute(
            "DELETE FROM focus_status_history WHERE life_id = ?1 AND focus_id = ?2",
            params![life_id, focus_id],
        )?;
        tx.execute(
            "DELETE FROM focus WHERE id = ?1 AND life_id = ?2",
            params![focus_id, life_id],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn add_focus_relation(
        conn: &Connection,
        life_id: &str,
        source_id: &str,
        target_id: &str,
        relation_type: &str,
        note: Option<&str>,
    ) -> Result<FocusRelation> {
        if source_id == target_id {
            return Err(custom_err("Focus relation cannot connect a node to itself"));
        }

        let valid: bool = conn.query_row(
            "SELECT (SELECT COUNT(*) FROM focus WHERE id = ?1 AND life_id = ?3) = 1 AND (SELECT COUNT(*) FROM focus WHERE id = ?2 AND life_id = ?3) = 1",
            params![source_id, target_id, life_id],
            |row| row.get(0),
        )?;
        if !valid {
            return Err(custom_err("Source and target focus nodes must belong to the specified life_id"));
        }

        let (eff_source, eff_target) = if relation_type == "mutually_exclusive" {
            if source_id < target_id {
                (source_id, target_id)
            } else {
                (target_id, source_id)
            }
        } else {
            (source_id, target_id)
        };

        if relation_type == "prerequisite" {
            let mut visited = std::collections::HashSet::new();
            let mut queue = std::collections::VecDeque::new();
            queue.push_back(eff_target.to_string());
            visited.insert(eff_target.to_string());

            let mut stmt = conn.prepare(
                "SELECT target_focus_id FROM focus_relation WHERE life_id = ?1 AND relation_type = 'prerequisite' AND source_focus_id = ?2",
            )?;

            let mut has_cycle = false;
            while let Some(curr) = queue.pop_front() {
                if curr == eff_source {
                    has_cycle = true;
                    break;
                }
                let next_nodes = stmt.query_map(params![life_id, curr], |r| r.get::<_, String>(0))?;
                for next in next_nodes {
                    let n = next?;
                    if !visited.contains(&n) {
                        visited.insert(n.clone());
                        queue.push_back(n);
                    }
                }
            }

            if has_cycle {
                return Err(custom_err("Cannot add prerequisite relation: would create a circular dependency cycle"));
            }
        }

        let existing: Option<String> = conn.query_row(
            "SELECT id FROM focus_relation WHERE life_id = ?1 AND source_focus_id = ?2 AND target_focus_id = ?3 AND relation_type = ?4",
            params![life_id, eff_source, eff_target, relation_type],
            |row| row.get(0),
        ).ok();
        if let Some(existing_id) = existing {
            return Ok(FocusRelation {
                id: existing_id,
                life_id: life_id.to_string(),
                source_focus_id: eff_source.to_string(),
                target_focus_id: eff_target.to_string(),
                relation_type: relation_type.to_string(),
                note: note.map(String::from),
            });
        }

        let rel_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO focus_relation (id, life_id, source_focus_id, target_focus_id, relation_type, note)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![rel_id, life_id, eff_source, eff_target, relation_type, note],
        )?;

        Ok(FocusRelation {
            id: rel_id,
            life_id: life_id.to_string(),
            source_focus_id: eff_source.to_string(),
            target_focus_id: eff_target.to_string(),
            relation_type: relation_type.to_string(),
            note: note.map(String::from),
        })
    }

    pub fn delete_focus_relation(conn: &Connection, life_id: &str, relation_id: &str) -> Result<()> {
        conn.execute(
            "DELETE FROM focus_relation WHERE id = ?1 AND life_id = ?2",
            params![relation_id, life_id],
        )?;
        Ok(())
    }

    pub fn get_focus_history(conn: &Connection, life_id: &str, focus_id: Option<&str>) -> Result<Vec<FocusStatusHistory>> {
        if let Some(fid) = focus_id {
            let mut stmt = conn.prepare(
                "SELECT id, focus_id, from_status, to_status, occurred_at, recorded_at, reason, source_type, source_id
                 FROM focus_status_history WHERE life_id = ?1 AND focus_id = ?2 ORDER BY occurred_at DESC",
            )?;
            let rows = stmt.query_map(params![life_id, fid], |row| {
                Ok(FocusStatusHistory {
                    id: row.get(0)?,
                    life_id: life_id.to_string(),
                    focus_id: row.get(1)?,
                    from_status: row.get(2)?,
                    to_status: row.get(3)?,
                    occurred_at: row.get(4)?,
                    recorded_at: row.get(5)?,
                    reason: row.get(6)?,
                    source_type: row.get(7)?,
                    source_id: row.get(8)?,
                })
            })?;
            rows.collect()
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, focus_id, from_status, to_status, occurred_at, recorded_at, reason, source_type, source_id
                 FROM focus_status_history WHERE life_id = ?1 ORDER BY occurred_at DESC LIMIT 50",
            )?;
            let rows = stmt.query_map(params![life_id], |row| {
                Ok(FocusStatusHistory {
                    id: row.get(0)?,
                    life_id: life_id.to_string(),
                    focus_id: row.get(1)?,
                    from_status: row.get(2)?,
                    to_status: row.get(3)?,
                    occurred_at: row.get(4)?,
                    recorded_at: row.get(5)?,
                    reason: row.get(6)?,
                    source_type: row.get(7)?,
                    source_id: row.get(8)?,
                })
            })?;
            rows.collect()
        }
    }

    // ==================== WORLD OBJECTS REPOSITORY ====================
    pub fn get_leader(conn: &Connection, life_id: &str) -> Result<Option<Leader>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, portrait_attachment_id, body_md, created_at, updated_at FROM leader WHERE life_id = ?1",
        )?;
        let mut rows = stmt.query_map([life_id], |row| {
            Ok(Leader {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                name: row.get(1)?,
                portrait_attachment_id: row.get(2)?,
                body_md: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        match rows.next() {
            Some(res) => res.map(Some),
            None => Ok(None),
        }
    }

    pub fn update_leader(
        conn: &Connection,
        life_id: &str,
        name: &str,
        body_md: &str,
        portrait_attachment_id: Option<&str>,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE leader SET name = ?1, body_md = ?2, portrait_attachment_id = ?3, updated_at = ?4 WHERE life_id = ?5",
            params![name, body_md, portrait_attachment_id, now, life_id],
        )?;
        Ok(())
    }

    pub fn get_situation(conn: &Connection, life_id: &str) -> Result<Option<Situation>> {
        let mut stmt = conn.prepare("SELECT id, body_md, created_at, updated_at FROM situation WHERE life_id = ?1")?;
        let mut rows = stmt.query_map([life_id], |row| {
            Ok(Situation {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                body_md: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;
        match rows.next() {
            Some(res) => res.map(Some),
            None => Ok(None),
        }
    }

    pub fn update_situation(conn: &Connection, life_id: &str, body_md: &str) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE situation SET body_md = ?1, updated_at = ?2 WHERE life_id = ?3",
            params![body_md, now, life_id],
        )?;
        Ok(())
    }

    pub fn get_philosophy(conn: &Connection, life_id: &str) -> Result<Option<Philosophy>> {
        let mut stmt = conn.prepare("SELECT id, body_md, created_at, updated_at FROM philosophy WHERE life_id = ?1")?;
        let mut rows = stmt.query_map([life_id], |row| {
            Ok(Philosophy {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                body_md: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?;
        match rows.next() {
            Some(res) => res.map(Some),
            None => Ok(None),
        }
    }

    pub fn update_philosophy(conn: &Connection, life_id: &str, body_md: &str) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE philosophy SET body_md = ?1, updated_at = ?2 WHERE life_id = ?3",
            params![body_md, now, life_id],
        )?;
        Ok(())
    }

    pub fn get_traits(conn: &Connection, life_id: &str, include_archived: bool) -> Result<Vec<Trait>> {
        let sql = if include_archived {
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at, equip_state FROM trait WHERE life_id = ?1 ORDER BY created_at ASC"
        } else {
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at, equip_state FROM trait WHERE life_id = ?1 AND archived_at IS NULL ORDER BY created_at ASC"
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(Trait {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                archived_at: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                equip_state: row.get(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_trait(conn: &Connection, life_id: &str, title: &str, body_md: &str, icon: Option<&str>) -> Result<Trait> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO trait (id, life_id, title, body_md, icon, equip_state, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'unequipped', ?6, ?6)",
            params![id, life_id, title, body_md, icon, now],
        )?;
        Ok(Trait {
            id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            icon: icon.map(String::from),
            equip_state: Some("unequipped".to_string()),
            archived_at: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_trait(conn: &Connection, life_id: &str, trait_id: &str, title: &str, body_md: &str, icon: Option<&str>) -> Result<Trait> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE trait SET title = ?1, body_md = ?2, icon = ?3, updated_at = ?4 WHERE id = ?5 AND life_id = ?6",
            params![title, body_md, icon, now, trait_id, life_id],
        )?;
        let mut stmt = conn.prepare(
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at, equip_state FROM trait WHERE id = ?1 AND life_id = ?2",
        )?;
        let mut rows = stmt.query_map([trait_id, life_id], |row| {
            Ok(Trait {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                archived_at: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
                equip_state: row.get(7)?,
            })
        })?;
        match rows.next() {
            Some(res) => res,
            None => Err(rusqlite::Error::QueryReturnedNoRows),
        }
    }

    pub fn set_active_trait_stage(conn: &Connection, life_id: &str, group_trait_ids: &[String], active_trait_id: &str) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        for tid in group_trait_ids {
            let (equip_state, icon_val) = if tid == active_trait_id {
                ("active", Some("active"))
            } else {
                ("unequipped", None)
            };
            conn.execute(
                "UPDATE trait SET equip_state = ?1, icon = ?2, updated_at = ?3 WHERE id = ?4 AND life_id = ?5",
                params![equip_state, icon_val, now, tid, life_id],
            )?;
        }
        Ok(())
    }

    pub fn set_trait_equipped(
        conn: &Connection,
        life_id: &str,
        trait_ids: &[String],
        equip: bool,
        target_active_id: Option<&str>,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        if !equip {
            for tid in trait_ids {
                conn.execute(
                    "UPDATE trait SET equip_state = 'benched', icon = 'benched', updated_at = ?1 WHERE id = ?2 AND life_id = ?3",
                    params![now, tid, life_id],
                )?;
            }
        } else {
            let active_id = target_active_id
                .map(|s| s.to_string())
                .or_else(|| trait_ids.first().cloned())
                .unwrap_or_default();
            for tid in trait_ids {
                let (equip_state, icon_val) = if tid == &active_id {
                    ("active", Some("active"))
                } else {
                    ("unequipped", None)
                };
                conn.execute(
                    "UPDATE trait SET equip_state = ?1, icon = ?2, updated_at = ?3 WHERE id = ?4 AND life_id = ?5",
                    params![equip_state, icon_val, now, tid, life_id],
                )?;
            }
        }
        Ok(())
    }

    pub fn resolve_active_equipped_traits(traits: &[Trait], relations: &[TraitRelation]) -> Vec<Trait> {
        if traits.is_empty() {
            return Vec::new();
        }

        use std::collections::{HashMap, HashSet, VecDeque};

        let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();
        for r in relations {
            adj.entry(&r.predecessor_id).or_default().push(&r.successor_id);
            adj.entry(&r.successor_id).or_default().push(&r.predecessor_id);
        }

        let trait_map: HashMap<&str, &Trait> = traits.iter().map(|t| (t.id.as_str(), t)).collect();
        let mut visited: HashSet<&str> = HashSet::new();
        let mut active_traits: Vec<Trait> = Vec::new();

        for t in traits {
            if visited.contains(t.id.as_str()) {
                continue;
            }

            let mut component_ids: Vec<&str> = Vec::new();
            let mut queue = VecDeque::new();
            queue.push_back(t.id.as_str());
            visited.insert(t.id.as_str());

            while let Some(curr_id) = queue.pop_front() {
                component_ids.push(curr_id);
                if let Some(neighbors) = adj.get(curr_id) {
                    for &neighbor in neighbors {
                        if trait_map.contains_key(neighbor) && !visited.contains(neighbor) {
                            visited.insert(neighbor);
                            queue.push_back(neighbor);
                        }
                    }
                }
            }

            let component_traits: Vec<&Trait> = component_ids
                .into_iter()
                .filter_map(|id| trait_map.get(id).copied())
                .collect();

            if component_traits.is_empty() {
                continue;
            }

            let is_benched = |t: &Trait| -> bool {
                t.equip_state.as_deref() == Some("benched") || t.icon.as_deref() == Some("benched")
            };
            let is_active = |t: &Trait| -> bool {
                t.equip_state.as_deref() == Some("active") || t.icon.as_deref() == Some("active")
            };

            if component_traits.len() == 1 {
                let single = component_traits[0];
                if !is_benched(single) {
                    active_traits.push(single.clone());
                }
            } else {
                if let Some(act) = component_traits.iter().find(|item| is_active(item)) {
                    active_traits.push((*act).clone());
                } else {
                    let has_benched = component_traits.iter().any(|item| is_benched(item));
                    if !has_benched {
                        let successors: HashSet<&str> = relations.iter().map(|r| r.successor_id.as_str()).collect();
                        let root_trait = component_traits
                            .iter()
                            .find(|item| !successors.contains(item.id.as_str()))
                            .copied()
                            .unwrap_or(component_traits[0]);
                        active_traits.push(root_trait.clone());
                    }
                }
            }
        }

        active_traits
    }

    pub fn archive_trait(conn: &Connection, life_id: &str, trait_id: &str, archive: bool) -> Result<()> {
        let now = if archive { Some(chrono::Utc::now().to_rfc3339()) } else { None };
        conn.execute(
            "UPDATE trait SET archived_at = ?1 WHERE id = ?2 AND life_id = ?3",
            params![now, trait_id, life_id],
        )?;
        Ok(())
    }

    pub fn delete_trait(conn: &mut Connection, life_id: &str, trait_id: &str) -> Result<()> {
        let tx = conn.transaction()?;
        tx.execute(
            "DELETE FROM trait_relation WHERE life_id = ?1 AND (predecessor_id = ?2 OR successor_id = ?2)",
            params![life_id, trait_id],
        )?;
        tx.execute(
            "DELETE FROM trait WHERE id = ?1 AND life_id = ?2",
            params![trait_id, life_id],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn get_trait_relations(conn: &Connection, life_id: &str) -> Result<Vec<TraitRelation>> {
        let mut stmt = conn.prepare(
            "SELECT id, predecessor_id, successor_id, occurred_at, note FROM trait_relation WHERE life_id = ?1",
        )?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(TraitRelation {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                predecessor_id: row.get(1)?,
                successor_id: row.get(2)?,
                occurred_at: row.get(3)?,
                note: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn add_trait_relation(
        conn: &Connection,
        life_id: &str,
        pred_id: &str,
        succ_id: &str,
        note: Option<&str>,
    ) -> Result<TraitRelation> {
        if pred_id == succ_id {
            return Err(custom_err("Trait relation cannot connect a trait to itself"));
        }

        let valid: bool = conn.query_row(
            "SELECT (SELECT COUNT(*) FROM trait WHERE id = ?1 AND life_id = ?3) = 1 AND (SELECT COUNT(*) FROM trait WHERE id = ?2 AND life_id = ?3) = 1",
            params![pred_id, succ_id, life_id],
            |row| row.get(0),
        )?;
        if !valid {
            return Err(custom_err("Predecessor and successor traits must belong to the specified life_id"));
        }

        // DAG cycle detection
        let mut visited = std::collections::HashSet::new();
        let mut queue = std::collections::VecDeque::new();
        queue.push_back(succ_id.to_string());
        visited.insert(succ_id.to_string());

        let mut stmt = conn.prepare(
            "SELECT successor_id FROM trait_relation WHERE life_id = ?1 AND predecessor_id = ?2",
        )?;

        let mut has_cycle = false;
        while let Some(curr) = queue.pop_front() {
            if curr == pred_id {
                has_cycle = true;
                break;
            }
            let next_nodes = stmt.query_map(params![life_id, curr], |r| r.get::<_, String>(0))?;
            for next in next_nodes {
                let n = next?;
                if !visited.contains(&n) {
                    visited.insert(n.clone());
                    queue.push_back(n);
                }
            }
        }

        if has_cycle {
            return Err(custom_err("Cannot add trait relation: would create a circular dependency cycle"));
        }

        let existing: Option<String> = conn.query_row(
            "SELECT id FROM trait_relation WHERE life_id = ?1 AND predecessor_id = ?2 AND successor_id = ?3",
            params![life_id, pred_id, succ_id],
            |row| row.get(0),
        ).ok();
        if let Some(existing_id) = existing {
            return Ok(TraitRelation {
                id: existing_id,
                life_id: life_id.to_string(),
                predecessor_id: pred_id.to_string(),
                successor_id: succ_id.to_string(),
                occurred_at: chrono::Utc::now().to_rfc3339(),
                note: note.map(String::from),
            });
        }

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO trait_relation (id, life_id, predecessor_id, successor_id, occurred_at, note)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, life_id, pred_id, succ_id, now, note],
        )?;
        Ok(TraitRelation {
            id,
            life_id: life_id.to_string(),
            predecessor_id: pred_id.to_string(),
            successor_id: succ_id.to_string(),
            occurred_at: now,
            note: note.map(String::from),
        })
    }

    pub fn delete_trait_relation(
        conn: &Connection,
        life_id: &str,
        relation_id: &str,
    ) -> Result<()> {
        conn.execute(
            "DELETE FROM trait_relation WHERE id = ?1 AND life_id = ?2",
            params![relation_id, life_id],
        )?;
        Ok(())
    }

    pub fn delete_trait_relation_by_nodes(
        conn: &Connection,
        life_id: &str,
        pred_id: &str,
        succ_id: &str,
    ) -> Result<()> {
        conn.execute(
            "DELETE FROM trait_relation WHERE predecessor_id = ?1 AND successor_id = ?2 AND life_id = ?3",
            params![pred_id, succ_id, life_id],
        )?;
        Ok(())
    }

    pub fn get_ideologies(conn: &Connection, life_id: &str, include_archived: bool) -> Result<Vec<Ideology>> {
        let sql = if include_archived {
            "SELECT id, title, body_md, icon, sort_order, archived_at, created_at, updated_at FROM ideology WHERE life_id = ?1 ORDER BY sort_order ASC, created_at ASC"
        } else {
            "SELECT id, title, body_md, icon, sort_order, archived_at, created_at, updated_at FROM ideology WHERE life_id = ?1 AND archived_at IS NULL ORDER BY sort_order ASC, created_at ASC"
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(Ideology {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                archived_at: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_ideology(conn: &Connection, life_id: &str, title: &str, body_md: &str, icon: Option<&str>) -> Result<Ideology> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO ideology (id, life_id, title, body_md, icon, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            params![id, life_id, title, body_md, icon, now],
        )?;
        Ok(Ideology {
            id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            icon: icon.map(String::from),
            sort_order: 0,
            archived_at: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn archive_ideology(conn: &Connection, life_id: &str, ideology_id: &str, archive: bool) -> Result<()> {
        let now = if archive { Some(chrono::Utc::now().to_rfc3339()) } else { None };
        conn.execute(
            "UPDATE ideology SET archived_at = ?1 WHERE id = ?2 AND life_id = ?3",
            params![now, ideology_id, life_id],
        )?;
        Ok(())
    }

    pub fn update_ideology(conn: &Connection, life_id: &str, ideology_id: &str, title: &str, body_md: &str, icon: Option<&str>) -> Result<Ideology> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE ideology SET title = ?1, body_md = ?2, icon = ?3, updated_at = ?4 WHERE id = ?5 AND life_id = ?6",
            params![title, body_md, icon, now, ideology_id, life_id],
        )?;
        let mut stmt = conn.prepare(
            "SELECT id, title, body_md, icon, sort_order, archived_at, created_at, updated_at FROM ideology WHERE id = ?1 AND life_id = ?2",
        )?;
        let mut rows = stmt.query_map([ideology_id, life_id], |row| {
            Ok(Ideology {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                archived_at: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })?;
        match rows.next() {
            Some(res) => res,
            None => Err(rusqlite::Error::QueryReturnedNoRows),
        }
    }

    pub fn delete_ideology(conn: &Connection, life_id: &str, ideology_id: &str) -> Result<()> {
        conn.execute(
            "DELETE FROM ideology WHERE id = ?1 AND life_id = ?2",
            params![ideology_id, life_id],
        )?;
        Ok(())
    }

    pub fn get_national_spirits(conn: &Connection, life_id: &str, include_archived: bool) -> Result<Vec<NationalSpirit>> {
        let sql = if include_archived {
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at FROM national_spirit WHERE life_id = ?1 ORDER BY created_at ASC"
        } else {
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at FROM national_spirit WHERE life_id = ?1 AND archived_at IS NULL ORDER BY created_at ASC"
        };
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(NationalSpirit {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                archived_at: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_national_spirit(conn: &Connection, life_id: &str, title: &str, body_md: &str, icon: Option<&str>) -> Result<NationalSpirit> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO national_spirit (id, life_id, title, body_md, icon, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            params![id, life_id, title, body_md, icon, now],
        )?;
        Ok(NationalSpirit {
            id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            icon: icon.map(String::from),
            archived_at: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn archive_national_spirit(conn: &Connection, life_id: &str, spirit_id: &str, archive: bool) -> Result<()> {
        let now = if archive { Some(chrono::Utc::now().to_rfc3339()) } else { None };
        conn.execute(
            "UPDATE national_spirit SET archived_at = ?1 WHERE id = ?2 AND life_id = ?3",
            params![now, spirit_id, life_id],
        )?;
        Ok(())
    }

    pub fn update_national_spirit(conn: &Connection, life_id: &str, spirit_id: &str, title: &str, body_md: &str, icon: Option<&str>) -> Result<NationalSpirit> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE national_spirit SET title = ?1, body_md = ?2, icon = ?3, updated_at = ?4 WHERE id = ?5 AND life_id = ?6",
            params![title, body_md, icon, now, spirit_id, life_id],
        )?;
        let mut stmt = conn.prepare(
            "SELECT id, title, body_md, icon, archived_at, created_at, updated_at FROM national_spirit WHERE id = ?1 AND life_id = ?2",
        )?;
        let mut rows = stmt.query_map([spirit_id, life_id], |row| {
            Ok(NationalSpirit {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                icon: row.get(3)?,
                archived_at: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?;
        match rows.next() {
            Some(res) => res,
            None => Err(rusqlite::Error::QueryReturnedNoRows),
        }
    }

    pub fn delete_national_spirit(conn: &Connection, life_id: &str, spirit_id: &str) -> Result<()> {
        conn.execute(
            "DELETE FROM national_spirit WHERE id = ?1 AND life_id = ?2",
            params![spirit_id, life_id],
        )?;
        Ok(())
    }

    pub fn get_events(conn: &Connection, life_id: &str) -> Result<Vec<Event>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, body_md, kind, occurred_on, image_attachment_id, quote, snapshot_id, created_at, updated_at
             FROM event WHERE life_id = ?1 ORDER BY occurred_on DESC, created_at DESC",
        )?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(Event {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                kind: row.get(3)?,
                occurred_on: row.get(4)?,
                image_attachment_id: row.get(5)?,
                quote: row.get(6)?,
                snapshot_id: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_event(
        conn: &Connection,
        life_id: &str,
        title: &str,
        body_md: &str,
        kind: &str,
        occurred_on: &str,
        image_attachment_id: Option<&str>,
        quote: Option<&str>,
        snapshot_id: Option<&str>,
    ) -> Result<Event> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO event (id, life_id, title, body_md, kind, occurred_on, image_attachment_id, quote, snapshot_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
            params![id, life_id, title, body_md, kind, occurred_on, image_attachment_id, quote, snapshot_id, now],
        )?;
        Ok(Event {
            id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            kind: kind.to_string(),
            occurred_on: occurred_on.to_string(),
            image_attachment_id: image_attachment_id.map(String::from),
            quote: quote.map(String::from),
            snapshot_id: snapshot_id.map(String::from),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn get_essays(conn: &Connection, life_id: &str) -> Result<Vec<Essay>> {
        let mut stmt = conn.prepare(
            "SELECT id, title, body_md, created_at, updated_at FROM essay WHERE life_id = ?1 ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(Essay {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                title: row.get(1)?,
                body_md: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_essay(conn: &Connection, life_id: &str, title: &str, body_md: &str) -> Result<Essay> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO essay (id, life_id, title, body_md, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
            params![id, life_id, title, body_md, now],
        )?;
        Ok(Essay {
            id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_essay(conn: &Connection, life_id: &str, id: &str, title: &str, body_md: &str) -> Result<Essay> {
        let now = chrono::Utc::now().to_rfc3339();
        let affected = conn.execute(
            "UPDATE essay SET title = ?1, body_md = ?2, updated_at = ?3 WHERE id = ?4 AND life_id = ?5",
            params![title, body_md, now, id, life_id],
        )?;
        if affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }

        let mut stmt = conn.prepare(
            "SELECT id, life_id, title, body_md, created_at, updated_at FROM essay WHERE id = ?1 AND life_id = ?2",
        )?;
        stmt.query_row(params![id, life_id], |row| {
            Ok(Essay {
                id: row.get(0)?,
                life_id: row.get(1)?,
                title: row.get(2)?,
                body_md: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })
    }

    pub fn delete_essay(conn: &Connection, life_id: &str, id: &str) -> Result<()> {
        let affected = conn.execute("DELETE FROM essay WHERE id = ?1 AND life_id = ?2", params![id, life_id])?;
        if affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    // ==================== ARCHIVE FEED (统一查询聚合展示层 §10) ====================
    pub fn get_archive_feed(conn: &Connection, life_id: &str, filter_type: Option<&str>) -> Result<Vec<ArchiveItem>> {
        let mut items = Vec::new();

        // 1. 事件 (普通与超事件)
        if filter_type.is_none() || filter_type == Some("event") || filter_type == Some("super_event") {
            let mut stmt = conn.prepare(
                "SELECT id, kind, title, body_md, occurred_on, quote FROM event WHERE life_id = ?1 ORDER BY occurred_on DESC",
            )?;
            let rows = stmt.query_map([life_id], |row| {
                let kind: String = row.get(1)?;
                let quote: Option<String> = row.get(5)?;
                Ok(ArchiveItem {
                    id: row.get(0)?,
                    item_type: if kind == "super" { "super_event".to_string() } else { "event".to_string() },
                    title: row.get(2)?,
                    summary: row.get(3)?,
                    occurred_at: row.get(4)?,
                    source_id: row.get(0)?,
                    extra_badge: quote.or_else(|| if kind == "super" { Some("超事件".to_string()) } else { Some("历史事件".to_string()) }),
                })
            })?;
            for item in rows { items.push(item?); }
        }

        // 2. 世界快照
        if filter_type.is_none() || filter_type == Some("snapshot") {
            let mut stmt = conn.prepare(
                "SELECT id, name, description, created_at FROM world_snapshot WHERE life_id = ?1 ORDER BY created_at DESC",
            )?;
            let rows = stmt.query_map([life_id], |row| {
                Ok(ArchiveItem {
                    id: row.get(0)?,
                    item_type: "snapshot".to_string(),
                    title: format!("世界快照: {}", row.get::<_, String>(1)?),
                    summary: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                    occurred_at: row.get(3)?,
                    source_id: row.get(0)?,
                    extra_badge: Some("存档".to_string()),
                })
            })?;
            for item in rows { items.push(item?); }
        }

        // 3. 随笔
        if filter_type.is_none() || filter_type == Some("essay") {
            let mut stmt = conn.prepare(
                "SELECT id, title, body_md, updated_at FROM essay WHERE life_id = ?1 ORDER BY updated_at DESC",
            )?;
            let rows = stmt.query_map([life_id], |row| {
                Ok(ArchiveItem {
                    id: row.get(0)?,
                    item_type: "essay".to_string(),
                    title: format!("随笔: {}", row.get::<_, String>(1)?),
                    summary: row.get(2)?,
                    occurred_at: row.get(3)?,
                    source_id: row.get(0)?,
                    extra_badge: Some("随笔".to_string()),
                })
            })?;
            for item in rows { items.push(item?); }
        }

        // 4. 国策状态流转历史
        if filter_type.is_none() || filter_type == Some("focus_history") {
            let mut stmt = conn.prepare(
                "SELECT h.id, f.title, h.to_status, h.reason, h.occurred_at, h.focus_id
                 FROM focus_status_history h
                 JOIN focus f ON f.id = h.focus_id
                 WHERE h.life_id = ?1
                 ORDER BY h.occurred_at DESC LIMIT 50",
            )?;
            let rows = stmt.query_map([life_id], |row| {
                let to_status: String = row.get(2)?;
                let status_zh = match to_status.as_str() {
                    "active" => "开始进行",
                    "completed" => "宣布完成",
                    "paused" => "暂时搁置",
                    "revoked" => "正式撤销",
                    _ => "状态变更",
                };
                Ok(ArchiveItem {
                    id: row.get(0)?,
                    item_type: "focus_history".to_string(),
                    title: format!("国策 [{}] {}", row.get::<_, String>(1)?, status_zh),
                    summary: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                    occurred_at: row.get(4)?,
                    source_id: row.get(5)?,
                    extra_badge: Some("国策动向".to_string()),
                })
            })?;
            for item in rows { items.push(item?); }
        }

        // 5. 参谋会议纪要
        if filter_type.is_none() || filter_type == Some("meeting") {
            let mut stmt = conn.prepare(
                "SELECT id, topic, confirmed_minutes_md, created_at FROM staff_meeting WHERE life_id = ?1 ORDER BY created_at DESC LIMIT 50",
            )?;
            let rows = stmt.query_map([life_id], |row| {
                Ok(ArchiveItem {
                    id: row.get(0)?,
                    item_type: "meeting".to_string(),
                    title: format!("参谋部会议：{}", row.get::<_, String>(1)?),
                    summary: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                    occurred_at: row.get(3)?,
                    source_id: row.get(0)?,
                    extra_badge: Some("参谋纪要".to_string()),
                })
            })?;
            for item in rows { items.push(item?); }
        }

        // 按时间倒序排序
        items.sort_by(|a, b| b.occurred_at.cmp(&a.occurred_at));

        Ok(items)
    }

    // ==================== SNAPSHOT REPOSITORY ====================
    pub fn create_world_snapshot(
        conn: &Connection,
        life_id: &str,
        name: &str,
        description: Option<&str>,
        payload_json: &str,
    ) -> Result<WorldSnapshot> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO world_snapshot (id, life_id, name, description, snapshot_schema_version, payload_json, created_at)
             VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
            params![id, life_id, name, description, payload_json, now],
        )?;
        Ok(WorldSnapshot {
            id,
            life_id: life_id.to_string(),
            name: name.to_string(),
            description: description.map(String::from),
            snapshot_schema_version: 1,
            payload_json: payload_json.to_string(),
            created_at: now,
        })
    }

    pub fn list_world_snapshots(conn: &Connection, life_id: &str) -> Result<Vec<WorldSnapshot>> {
        let mut stmt = conn.prepare(
            "SELECT id, name, description, snapshot_schema_version, payload_json, created_at
             FROM world_snapshot WHERE life_id = ?1 ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map([life_id], |row| {
            Ok(WorldSnapshot {
                id: row.get(0)?,
                life_id: life_id.to_string(),
                name: row.get(1)?,
                description: row.get(2)?,
                snapshot_schema_version: row.get(3)?,
                payload_json: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn delete_world_snapshot(conn: &Connection, life_id: &str, snapshot_id: &str) -> Result<()> {
        conn.execute(
            "DELETE FROM world_snapshot WHERE id = ?1 AND life_id = ?2",
            params![snapshot_id, life_id],
        )?;
        Ok(())
    }

    // ==================== AGGREGATED WORLD OVERVIEW (首页仪表盘聚合) ====================
    pub fn get_world_overview(conn: &Connection, life_id: &str) -> Result<Option<WorldOverview>> {
        let life = match Self::get_life(conn, life_id)? {
            Some(l) => l,
            None => return Ok(None),
        };
        let leader = Self::get_leader(conn, life_id)?;
        let situation = Self::get_situation(conn, life_id)?;
        let philosophy = Self::get_philosophy(conn, life_id)?;
        let stability = Self::get_stability(conn, life_id)?;
        let all_traits = Self::get_traits(conn, life_id, false)?;
        let relations = Self::get_trait_relations(conn, life_id)?;
        let traits = Self::resolve_active_equipped_traits(&all_traits, &relations);
        let ideologies = Self::get_ideologies(conn, life_id, false)?;
        let national_spirits = Self::get_national_spirits(conn, life_id, false)?;

        let mut foci_stmt = conn.prepare(
            "SELECT id, title, body_md, icon, image_attachment_id, status, position_x, position_y, created_at, updated_at
             FROM focus WHERE life_id = ?1 AND status = 'active' ORDER BY updated_at DESC",
        )?;
        let active_foci: Vec<Focus> = foci_stmt
            .query_map([life_id], |row| {
                Ok(Focus {
                    id: row.get(0)?,
                    life_id: life_id.to_string(),
                    title: row.get(1)?,
                    body_md: row.get(2)?,
                    icon: row.get(3)?,
                    image_attachment_id: row.get(4)?,
                    status: row.get(5)?,
                    position_x: row.get(6)?,
                    position_y: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        let mut evt_stmt = conn.prepare(
            "SELECT id, title, body_md, kind, occurred_on, image_attachment_id, quote, snapshot_id, created_at, updated_at
             FROM event WHERE life_id = ?1 ORDER BY occurred_on DESC LIMIT 5",
        )?;
        let recent_events: Vec<Event> = evt_stmt
            .query_map([life_id], |row| {
                Ok(Event {
                    id: row.get(0)?,
                    life_id: life_id.to_string(),
                    title: row.get(1)?,
                    body_md: row.get(2)?,
                    kind: row.get(3)?,
                    occurred_on: row.get(4)?,
                    image_attachment_id: row.get(5)?,
                    quote: row.get(6)?,
                    snapshot_id: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(Some(WorldOverview {
            life,
            leader,
            situation,
            philosophy,
            stability,
            traits,
            ideologies,
            national_spirits,
            active_foci,
            recent_events,
        }))
    }

    // ==================== SUB-FOCUS REPOSITORY ====================
    pub fn get_sub_foci(conn: &Connection, life_id: &str, focus_id: &str) -> Result<Vec<FocusSubItem>> {
        let mut stmt = conn.prepare(
            "SELECT id, life_id, focus_id, title, body_md, status, sort_order, created_at, updated_at
             FROM focus_sub_item
             WHERE life_id = ?1 AND focus_id = ?2
             ORDER BY sort_order ASC, created_at ASC",
        )?;
        let rows = stmt.query_map(params![life_id, focus_id], |row| {
            Ok(FocusSubItem {
                id: row.get(0)?,
                life_id: row.get(1)?,
                focus_id: row.get(2)?,
                title: row.get(3)?,
                body_md: row.get(4)?,
                status: row.get(5)?,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;
        rows.collect()
    }

    pub fn list_all_sub_foci(conn: &Connection, life_id: &str) -> Result<Vec<FocusSubItem>> {
        let mut stmt = conn.prepare(
            "SELECT id, life_id, focus_id, title, body_md, status, sort_order, created_at, updated_at
             FROM focus_sub_item
             WHERE life_id = ?1
             ORDER BY sort_order ASC, created_at ASC",
        )?;
        let rows = stmt.query_map(params![life_id], |row| {
            Ok(FocusSubItem {
                id: row.get(0)?,
                life_id: row.get(1)?,
                focus_id: row.get(2)?,
                title: row.get(3)?,
                body_md: row.get(4)?,
                status: row.get(5)?,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_sub_focus(
        conn: &Connection,
        life_id: &str,
        focus_id: &str,
        title: &str,
        body_md: Option<&str>,
    ) -> Result<FocusSubItem> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let next_sort: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM focus_sub_item WHERE life_id = ?1 AND focus_id = ?2",
                params![life_id, focus_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        conn.execute(
            "INSERT INTO focus_sub_item (id, life_id, focus_id, title, body_md, status, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 'todo', ?6, ?7, ?7)",
            params![id, life_id, focus_id, title, body_md, next_sort, now],
        )?;

        Ok(FocusSubItem {
            id,
            life_id: life_id.to_string(),
            focus_id: focus_id.to_string(),
            title: title.to_string(),
            body_md: body_md.map(String::from),
            status: "todo".to_string(),
            sort_order: next_sort,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_sub_focus_status(conn: &Connection, life_id: &str, sub_id: &str, status: &str) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE focus_sub_item SET status = ?1, updated_at = ?2 WHERE id = ?3 AND life_id = ?4",
            params![status, now, sub_id, life_id],
        )?;
        Ok(())
    }

    pub fn delete_sub_focus(conn: &Connection, life_id: &str, sub_id: &str) -> Result<()> {
        conn.execute(
            "DELETE FROM focus_sub_item WHERE id = ?1 AND life_id = ?2",
            params![sub_id, life_id],
        )?;
        Ok(())
    }

    // ==================== STAFF / CABINET REPOSITORY (§12.4) ====================
    pub fn get_staff_members(conn: &Connection, life_id: &str) -> Result<Vec<StaffMember>> {
        let mut stmt = conn.prepare(
            "SELECT id, life_id, name, role, prompt, provider_config_id, model, enabled, sort_order, created_at, updated_at
             FROM staff_member
             WHERE life_id = ?1
             ORDER BY sort_order ASC, created_at ASC",
        )?;
        let rows = stmt.query_map(params![life_id], |row| {
            Ok(StaffMember {
                id: row.get(0)?,
                life_id: row.get(1)?,
                name: row.get(2)?,
                role: row.get(3)?,
                prompt: row.get(4)?,
                provider_config_id: row.get(5)?,
                model: row.get(6)?,
                enabled: row.get::<_, i64>(7)? != 0,
                sort_order: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?;
        let members: Vec<StaffMember> = rows.collect::<Result<Vec<_>>>()?;

        if members.is_empty() {
            Self::init_default_staff_members(conn, life_id)
        } else {
            Ok(members)
        }
    }

    pub fn init_default_staff_members(conn: &Connection, life_id: &str) -> Result<Vec<StaffMember>> {
        let defaults = [
            ("战略参谋长", "首席长期战略顾问", "从宏观战略、路线演进与终局思维出发，推演各项重大国策的长远得失与可行节奏，拒绝短期短视。"),
            ("财政与资源总监", "财务与精力分配顾问", "关注时间、精力与财务资本的分配效率，严格计算投入产出比，防止盲目扩张导致的财政或能量透支。"),
            ("身心体魄总管", "精力管理与健康顾问", "关注最高统帅的精力槽、睡眠与精神状态，在面临高压决策时警惕身心耗竭，确保战略持续力。"),
            ("批判反对者", "战略挑刺官与盲区副官", "专门寻找计划中的逻辑漏洞、未预料的意外风险与自我欺骗，提出尖锐的反向质询。"),
            ("哲学与意识形态宗师", "底层价值观与定力导师", "从核心人生哲学与伦理信念出发，评估行动是否背离初心，确保战略与自我认知高度统一。"),
        ];

        let now = chrono::Utc::now().to_rfc3339();
        let mut created = Vec::new();
        for (i, (name, role, prompt)) in defaults.iter().enumerate() {
            let id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO staff_member (id, life_id, name, role, prompt, provider_config_id, model, enabled, sort_order, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, NULL, NULL, 1, ?6, ?7, ?7)",
                params![id, life_id, name, role, prompt, i as i32, now],
            )?;
            created.push(StaffMember {
                id,
                life_id: life_id.to_string(),
                name: name.to_string(),
                role: role.to_string(),
                prompt: prompt.to_string(),
                provider_config_id: None,
                model: None,
                enabled: true,
                sort_order: i as i32,
                created_at: now.clone(),
                updated_at: now.clone(),
            });
        }
        Ok(created)
    }

    pub fn create_staff_member(
        conn: &Connection,
        life_id: &str,
        name: &str,
        role: &str,
        prompt: &str,
        model: Option<&str>,
    ) -> Result<StaffMember> {
        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let sort_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM staff_member WHERE life_id = ?1",
                params![life_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        conn.execute(
            "INSERT INTO staff_member (id, life_id, name, role, prompt, provider_config_id, model, enabled, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, 1, ?7, ?8, ?8)",
            params![id, life_id, name, role, prompt, model, sort_order, now],
        )?;

        Ok(StaffMember {
            id,
            life_id: life_id.to_string(),
            name: name.to_string(),
            role: role.to_string(),
            prompt: prompt.to_string(),
            provider_config_id: None,
            model: model.map(String::from),
            enabled: true,
            sort_order,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_staff_member(
        conn: &Connection,
        life_id: &str,
        member_id: &str,
        name: &str,
        role: &str,
        prompt: &str,
        enabled: bool,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE staff_member SET name = ?1, role = ?2, prompt = ?3, enabled = ?4, updated_at = ?5
             WHERE id = ?6 AND life_id = ?7",
            params![name, role, prompt, if enabled { 1 } else { 0 }, now, member_id, life_id],
        )?;
        Ok(())
    }

    pub fn delete_staff_member(conn: &Connection, life_id: &str, member_id: &str) -> Result<()> {
        conn.execute(
            "DELETE FROM staff_member WHERE id = ?1 AND life_id = ?2",
            params![member_id, life_id],
        )?;
        Ok(())
    }

    pub fn get_staff_meetings(conn: &Connection, life_id: &str) -> Result<Vec<StaffMeeting>> {
        let mut stmt = conn.prepare(
            "SELECT id, life_id, topic, confirmed_minutes_md, context_module_names, rounds, status, created_at
             FROM staff_meeting
             WHERE life_id = ?1
             ORDER BY created_at DESC",
        )?;
        let rows = stmt.query_map(params![life_id], |row| {
            Ok(StaffMeeting {
                id: row.get(0)?,
                life_id: row.get(1)?,
                topic: row.get(2)?,
                confirmed_minutes_md: row.get(3)?,
                context_module_names: row.get(4)?,
                rounds: row.get(5)?,
                status: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn create_staff_meeting(
        conn: &mut Connection,
        life_id: &str,
        topic: &str,
        confirmed_minutes_md: &str,
        context_module_names: &str,
        rounds: i32,
        messages: Vec<(String, i32, String)>,
    ) -> Result<StaffMeeting> {
        let meeting_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO staff_meeting (id, life_id, topic, confirmed_minutes_md, context_module_names, rounds, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'confirmed', ?7)",
            params![meeting_id, life_id, topic, confirmed_minutes_md, context_module_names, rounds, now],
        )?;

        for (speaker, r_idx, content) in messages {
            let msg_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO staff_message (id, life_id, meeting_id, speaker_label, round_index, confirmed_content, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![msg_id, life_id, meeting_id, speaker, r_idx, content, now],
            )?;
        }

        tx.commit()?;

        Ok(StaffMeeting {
            id: meeting_id,
            life_id: life_id.to_string(),
            topic: topic.to_string(),
            confirmed_minutes_md: Some(confirmed_minutes_md.to_string()),
            context_module_names: context_module_names.to_string(),
            rounds,
            status: "confirmed".to_string(),
            created_at: now,
        })
    }

    // ==================== EXPORT DATA (§16) ====================
    pub fn export_life_markdown(conn: &Connection, life_id: &str) -> Result<String> {
        let overview = match Self::get_world_overview(conn, life_id)? {
            Some(o) => o,
            None => return Ok(String::from("# 未找到人生世界")),
        };

        let mut md = String::new();
        md.push_str(&format!("# 人生战略档案：{}\n\n", overview.life.name));
        md.push_str(&format!("- 导出时间：{}\n", chrono::Utc::now().to_rfc3339()));
        md.push_str(&format!("- 当前战略稳定度：{:?}\n\n", overview.stability.current_value));

        if let Some(leader) = &overview.leader {
            md.push_str(&format!("## 最高统帅：{}\n\n{}\n\n", leader.name, leader.body_md));
        }

        if let Some(situation) = &overview.situation {
            md.push_str(&format!("## 当前战略局势\n\n{}\n\n", situation.body_md));
        }

        if let Some(philosophy) = &overview.philosophy {
            md.push_str(&format!("## 根本人生哲学\n\n{}\n\n", philosophy.body_md));
        }

        md.push_str("## 特质谱系\n\n");
        for t in &overview.traits {
            md.push_str(&format!("- **{}**：{}\n", t.title, t.body_md));
        }
        md.push('\n');

        md.push_str("## 意识形态\n\n");
        for i in &overview.ideologies {
            md.push_str(&format!("- **{}**：{}\n", i.title, i.body_md));
        }
        md.push('\n');

        md.push_str("## 国家精神\n\n");
        for s in &overview.national_spirits {
            md.push_str(&format!("- **{}**：{}\n", s.title, s.body_md));
        }
        md.push('\n');

        md.push_str("## 正在进行的重点国策\n\n");
        for f in &overview.active_foci {
            md.push_str(&format!("### 国策：{}\n\n{}\n\n", f.title, f.body_md));
        }



        Ok(md)
    }

    pub fn export_life_json(conn: &Connection, life_id: &str) -> Result<String> {
        let overview = Self::get_world_overview(conn, life_id)?;
        let all_foci = Self::get_foci(conn, life_id)?;
        let focus_relations = Self::get_focus_relations(conn, life_id)?;
        let all_traits = Self::get_traits(conn, life_id, true)?;
        let trait_relations = Self::get_trait_relations(conn, life_id)?;
        let essays = Self::get_essays(conn, life_id)?;
        let events = Self::get_events(conn, life_id)?;
        let sub_foci = Self::list_all_sub_foci(conn, life_id)?;
        let staff_members = Self::get_staff_members(conn, life_id)?;
        let staff_meetings = Self::get_staff_meetings(conn, life_id)?;
        let stability_history = Self::get_stability_history(conn, life_id, 1000)?;

        let data = serde_json::json!({
            "version": 2,
            "exported_at": chrono::Utc::now().to_rfc3339(),
            "life_id": life_id,
            "world_overview": overview,
            "all_foci": all_foci,
            "focus_relations": focus_relations,
            "all_traits": all_traits,
            "trait_relations": trait_relations,
            "essays": essays,
            "events": events,
            "sub_foci": sub_foci,
            "staff_members": staff_members,
            "staff_meetings": staff_meetings,
            "stability_history": stability_history,
        });

        Ok(serde_json::to_string_pretty(&data).unwrap_or_default())
    }
}
