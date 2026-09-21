use super::{custom_err, Repository};
use crate::models::{
    Focus, FocusRelation, FocusRelationType, FocusStatus, FocusStatusHistory, FocusSubItem,
    SubFocusStatus,
};
use rusqlite::{params, Connection, Result};
use std::str::FromStr;
use uuid::Uuid;

impl Repository {
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

    #[allow(clippy::too_many_arguments)]
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
        let parsed_status: FocusStatus = status.parse().map_err(|e: String| custom_err(e))?;
        let status_str = parsed_status.as_str();
        let focus_id = Uuid::new_v4().to_string();
        let history_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO focus (id, life_id, title, body_md, icon, image_attachment_id, status, position_x, position_y, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
            params![focus_id, life_id, title, body_md, icon, image_attachment_id, status_str, pos_x, pos_y, now],
        )?;

        tx.execute(
            "INSERT INTO focus_status_history (id, life_id, focus_id, from_status, to_status, occurred_at, recorded_at, reason)
             VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?5, '初始创建')",
            params![history_id, life_id, focus_id, status_str, now],
        )?;

        tx.commit()?;

        Ok(Focus {
            id: focus_id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            icon: icon.map(String::from),
            image_attachment_id: image_attachment_id.map(String::from),
            status: status_str.to_string(),
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
        let parsed_status: FocusStatus = new_status.parse().map_err(|e: String| custom_err(e))?;
        let status_str = parsed_status.as_str();
        let now = chrono::Utc::now().to_rfc3339();
        let history_id = Uuid::new_v4().to_string();

        let tx = conn.transaction()?;

        let current_status: String = match tx.query_row(
            "SELECT status FROM focus WHERE id = ?1 AND life_id = ?2",
            params![focus_id, life_id],
            |row| row.get(0),
        ) {
            Ok(s) => s,
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                return Err(custom_err("指定国策不存在或不属于当前人生世界"));
            }
            Err(e) => return Err(e),
        };

        if current_status != status_str {
            let affected = tx.execute(
                "UPDATE focus SET status = ?1, updated_at = ?2 WHERE id = ?3 AND life_id = ?4",
                params![status_str, now, focus_id, life_id],
            )?;
            if affected == 0 {
                return Err(custom_err("指定国策不存在或不属于当前人生世界"));
            }

            tx.execute(
                "INSERT INTO focus_status_history (id, life_id, focus_id, from_status, to_status, occurred_at, recorded_at, reason, source_type, source_id)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, ?7, ?8, ?9)",
                params![history_id, life_id, focus_id, current_status, status_str, now, reason, source_type, source_id],
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
        let affected = conn.execute(
            "UPDATE focus SET position_x = ?1, position_y = ?2, updated_at = ?3 WHERE id = ?4 AND life_id = ?5",
            params![pos_x, pos_y, now, focus_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("指定国策不存在或不属于当前人生世界"));
        }
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
        let affected = conn.execute(
            "UPDATE focus SET title = ?1, body_md = ?2, icon = ?3, image_attachment_id = ?4, updated_at = ?5
             WHERE id = ?6 AND life_id = ?7",
            params![title, body_md, icon, image_attachment_id, now, focus_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("指定国策不存在或不属于当前人生世界"));
        }
        Ok(())
    }

    pub fn delete_focus(conn: &mut Connection, life_id: &str, focus_id: &str) -> Result<()> {
        let tx = conn.transaction()?;
        tx.execute(
            "DELETE FROM focus_relation WHERE life_id = ?1 AND (source_focus_id = ?2 OR target_focus_id = ?2)",
            params![life_id, focus_id],
        )?;
        tx.execute(
            "DELETE FROM focus_sub_item WHERE life_id = ?1 AND focus_id = ?2",
            params![life_id, focus_id],
        )?;
        tx.execute(
            "DELETE FROM focus_status_history WHERE life_id = ?1 AND focus_id = ?2",
            params![life_id, focus_id],
        )?;
        let affected = tx.execute(
            "DELETE FROM focus WHERE id = ?1 AND life_id = ?2",
            params![focus_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("指定国策不存在或不属于当前人生世界"));
        }
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
        let _parsed_rel: FocusRelationType =
            relation_type.parse().map_err(|e: String| custom_err(e))?;
        if source_id == target_id {
            return Err(custom_err("Focus relation cannot connect a node to itself"));
        }

        let valid: bool = conn.query_row(
            "SELECT (SELECT COUNT(*) FROM focus WHERE id = ?1 AND life_id = ?3) = 1 AND (SELECT COUNT(*) FROM focus WHERE id = ?2 AND life_id = ?3) = 1",
            params![source_id, target_id, life_id],
            |row| row.get(0),
        )?;
        if !valid {
            return Err(custom_err(
                "Source and target focus nodes must belong to the specified life_id",
            ));
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
                let next_nodes =
                    stmt.query_map(params![life_id, curr], |r| r.get::<_, String>(0))?;
                for next in next_nodes {
                    let n = next?;
                    if !visited.contains(&n) {
                        visited.insert(n.clone());
                        queue.push_back(n);
                    }
                }
            }

            if has_cycle {
                return Err(custom_err(
                    "Cannot add prerequisite relation: would create a circular dependency cycle",
                ));
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

    pub fn delete_focus_relation(
        conn: &Connection,
        life_id: &str,
        relation_id: &str,
    ) -> Result<()> {
        let affected = conn.execute(
            "DELETE FROM focus_relation WHERE id = ?1 AND life_id = ?2",
            params![relation_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("国策关联不存在或不属于当前人生世界"));
        }
        Ok(())
    }

    pub fn get_focus_history(
        conn: &Connection,
        life_id: &str,
        focus_id: Option<&str>,
    ) -> Result<Vec<FocusStatusHistory>> {
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

    pub fn get_sub_foci(
        conn: &Connection,
        life_id: &str,
        focus_id: &str,
    ) -> Result<Vec<FocusSubItem>> {
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
        let focus_exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM focus WHERE id = ?1 AND life_id = ?2)",
            params![focus_id, life_id],
            |row| row.get(0),
        )?;
        if !focus_exists {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }

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

    pub fn update_sub_focus_status(
        conn: &Connection,
        life_id: &str,
        sub_id: &str,
        status: &str,
    ) -> Result<()> {
        let _ = SubFocusStatus::from_str(status).map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                e,
            )))
        })?;
        let now = chrono::Utc::now().to_rfc3339();
        let affected = conn.execute(
            "UPDATE focus_sub_item SET status = ?1, updated_at = ?2 WHERE id = ?3 AND life_id = ?4",
            params![status, now, sub_id, life_id],
        )?;
        if affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    pub fn delete_sub_focus(conn: &Connection, life_id: &str, sub_id: &str) -> Result<()> {
        let affected = conn.execute(
            "DELETE FROM focus_sub_item WHERE id = ?1 AND life_id = ?2",
            params![sub_id, life_id],
        )?;
        if affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    // ==========================================
    // Focus Mounted Essays (随笔挂载)
    // ==========================================

    pub fn get_focus_essays(
        conn: &Connection,
        life_id: &str,
        focus_id: &str,
    ) -> Result<Vec<crate::models::Essay>> {
        let mut stmt = conn.prepare(
            "SELECT e.id, e.life_id, e.title, e.body_md, e.created_at, e.updated_at
             FROM essay e
             JOIN object_link ol ON ol.target_id = e.id AND ol.target_type = 'essay'
             WHERE ol.life_id = ?1 AND ol.source_type = 'focus' AND ol.source_id = ?2
             ORDER BY e.created_at DESC",
        )?;
        let rows = stmt.query_map(params![life_id, focus_id], |row| {
            Ok(crate::models::Essay {
                id: row.get(0)?,
                life_id: row.get(1)?,
                title: row.get(2)?,
                body_md: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn attach_essay_to_focus(
        conn: &Connection,
        life_id: &str,
        focus_id: &str,
        essay_id: &str,
    ) -> Result<crate::models::ObjectLink> {
        // 校验国策是否存在
        let focus_exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM focus WHERE id = ?1 AND life_id = ?2)",
            params![focus_id, life_id],
            |row| row.get(0),
        )?;
        if !focus_exists {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }

        // 校验随笔是否存在
        let essay_exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM essay WHERE id = ?1 AND life_id = ?2)",
            params![essay_id, life_id],
            |row| row.get(0),
        )?;
        if !essay_exists {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }

        // 检查是否已挂载
        let existing = conn.query_row(
            "SELECT id, life_id, source_type, source_id, target_type, target_id, kind, created_at
             FROM object_link
             WHERE life_id = ?1 AND source_type = 'focus' AND source_id = ?2 AND target_type = 'essay' AND target_id = ?3",
            params![life_id, focus_id, essay_id],
            |row| {
                Ok(crate::models::ObjectLink {
                    id: row.get(0)?,
                    life_id: row.get(1)?,
                    source_type: row.get(2)?,
                    source_id: row.get(3)?,
                    target_type: row.get(4)?,
                    target_id: row.get(5)?,
                    kind: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        );

        if let Ok(link) = existing {
            return Ok(link);
        }

        let link_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO object_link (id, life_id, source_type, source_id, target_type, target_id, kind, created_at)
             VALUES (?1, ?2, 'focus', ?3, 'essay', ?4, 'mount', ?5)",
            params![link_id, life_id, focus_id, essay_id, now],
        )?;

        Ok(crate::models::ObjectLink {
            id: link_id,
            life_id: life_id.to_string(),
            source_type: "focus".to_string(),
            source_id: focus_id.to_string(),
            target_type: "essay".to_string(),
            target_id: essay_id.to_string(),
            kind: "mount".to_string(),
            created_at: now,
        })
    }

    pub fn detach_essay_from_focus(
        conn: &Connection,
        life_id: &str,
        focus_id: &str,
        essay_id: &str,
    ) -> Result<()> {
        conn.execute(
            "DELETE FROM object_link
             WHERE life_id = ?1 AND source_type = 'focus' AND source_id = ?2 AND target_type = 'essay' AND target_id = ?3",
            params![life_id, focus_id, essay_id],
        )?;
        Ok(())
    }

    pub fn get_all_focus_essay_counts(
        conn: &Connection,
        life_id: &str,
    ) -> Result<std::collections::HashMap<String, i64>> {
        let mut stmt = conn.prepare(
            "SELECT source_id, COUNT(*)
             FROM object_link
             WHERE life_id = ?1 AND source_type = 'focus' AND target_type = 'essay'
             GROUP BY source_id",
        )?;
        let rows = stmt.query_map(params![life_id], |row| {
            let focus_id: String = row.get(0)?;
            let count: i64 = row.get(1)?;
            Ok((focus_id, count))
        })?;

        let mut map = std::collections::HashMap::new();
        for r in rows {
            let (f_id, c) = r?;
            map.insert(f_id, c);
        }
        Ok(map)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations::run_migrations;

    fn setup_test_db() -> Connection {
        let mut conn = Connection::open_in_memory().unwrap();
        run_migrations(&mut conn).unwrap();
        conn
    }

    #[test]
    fn test_focus_essay_mount_and_detach() {
        let mut conn = setup_test_db();
        let life_id = "test_life_1";
        conn.execute(
            "INSERT INTO life (id, name, created_at, updated_at) VALUES (?1, '测试人生', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')",
            params![life_id],
        ).unwrap();

        let focus = Repository::create_focus(
            &mut conn,
            life_id,
            "战略研讨国策",
            "推进战略",
            None,
            None,
            "active",
            100.0,
            200.0,
        ).unwrap();

        let essay = Repository::create_essay(
            &conn,
            life_id,
            "战略前瞻随笔",
            "这是一篇前瞻性战术随笔...",
        ).unwrap();

        // 1. Initially no essays mounted
        let mounted = Repository::get_focus_essays(&conn, life_id, &focus.id).unwrap();
        assert_eq!(mounted.len(), 0);

        // 2. Attach essay to focus
        let link = Repository::attach_essay_to_focus(&conn, life_id, &focus.id, &essay.id).unwrap();
        assert_eq!(link.source_id, focus.id);
        assert_eq!(link.target_id, essay.id);

        // Idempotent test (attaching again returns existing)
        let link2 = Repository::attach_essay_to_focus(&conn, life_id, &focus.id, &essay.id).unwrap();
        assert_eq!(link.id, link2.id);

        // 3. Verify get_focus_essays returns the essay
        let mounted = Repository::get_focus_essays(&conn, life_id, &focus.id).unwrap();
        assert_eq!(mounted.len(), 1);
        assert_eq!(mounted[0].id, essay.id);
        assert_eq!(mounted[0].title, "战略前瞻随笔");

        // 4. Verify counts map
        let counts = Repository::get_all_focus_essay_counts(&conn, life_id).unwrap();
        assert_eq!(counts.get(&focus.id), Some(&1));

        // 5. Detach essay
        Repository::detach_essay_from_focus(&conn, life_id, &focus.id, &essay.id).unwrap();
        let mounted_after = Repository::get_focus_essays(&conn, life_id, &focus.id).unwrap();
        assert_eq!(mounted_after.len(), 0);

        let counts_after = Repository::get_all_focus_essay_counts(&conn, life_id).unwrap();
        assert_eq!(counts_after.get(&focus.id), None);
    }
}

