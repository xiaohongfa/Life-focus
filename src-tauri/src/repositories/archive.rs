use super::{custom_err, Repository};
use crate::models::{ArchiveItem, Essay, Event, EventKind, WorldSnapshot};
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

impl Repository {
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

    #[allow(clippy::too_many_arguments)]
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
        let parsed_kind: EventKind = kind.parse().map_err(|e: String| custom_err(e))?;
        let kind_str = match parsed_kind {
            EventKind::Normal => "normal",
            EventKind::Super => "super",
        };

        if let Some(snap_id) = snapshot_id {
            let snap_valid: bool = conn.query_row(
                "SELECT COUNT(*) = 1 FROM world_snapshot WHERE id = ?1 AND life_id = ?2",
                params![snap_id, life_id],
                |row| row.get(0),
            )?;
            if !snap_valid {
                return Err(custom_err("关联的世界快照不存在或不属于当前人生世界"));
            }
        }

        let id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO event (id, life_id, title, body_md, kind, occurred_on, image_attachment_id, quote, snapshot_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
            params![id, life_id, title, body_md, kind_str, occurred_on, image_attachment_id, quote, snapshot_id, now],
        )?;
        Ok(Event {
            id,
            life_id: life_id.to_string(),
            title: title.to_string(),
            body_md: body_md.to_string(),
            kind: kind_str.to_string(),
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

    pub fn create_essay(
        conn: &Connection,
        life_id: &str,
        title: &str,
        body_md: &str,
    ) -> Result<Essay> {
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

    pub fn update_essay(
        conn: &Connection,
        life_id: &str,
        id: &str,
        title: &str,
        body_md: &str,
    ) -> Result<Essay> {
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
        let affected = conn.execute(
            "DELETE FROM essay WHERE id = ?1 AND life_id = ?2",
            params![id, life_id],
        )?;
        if affected == 0 {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }
        Ok(())
    }

    pub fn get_archive_feed(
        conn: &Connection,
        life_id: &str,
        filter_type: Option<&str>,
    ) -> Result<Vec<ArchiveItem>> {
        let mut items = Vec::new();

        // 1. 事件 (普通与超事件)
        if filter_type.is_none()
            || filter_type == Some("event")
            || filter_type == Some("super_event")
        {
            let mut stmt = conn.prepare(
                "SELECT id, kind, title, body_md, occurred_on, quote FROM event WHERE life_id = ?1 ORDER BY occurred_on DESC",
            )?;
            let rows = stmt.query_map([life_id], |row| {
                let kind: String = row.get(1)?;
                let quote: Option<String> = row.get(5)?;
                Ok(ArchiveItem {
                    id: row.get(0)?,
                    item_type: if kind == "super" {
                        "super_event".to_string()
                    } else {
                        "event".to_string()
                    },
                    title: row.get(2)?,
                    summary: row.get(3)?,
                    occurred_at: row.get(4)?,
                    source_id: row.get(0)?,
                    extra_badge: quote.or_else(|| {
                        if kind == "super" {
                            Some("超事件".to_string())
                        } else {
                            Some("历史事件".to_string())
                        }
                    }),
                })
            })?;
            for item in rows {
                items.push(item?);
            }
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
            for item in rows {
                items.push(item?);
            }
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
            for item in rows {
                items.push(item?);
            }
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
            for item in rows {
                items.push(item?);
            }
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
            for item in rows {
                items.push(item?);
            }
        }

        // 按时间倒序排序
        items.sort_by(|a, b| b.occurred_at.cmp(&a.occurred_at));

        Ok(items)
    }

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

    pub fn delete_world_snapshot(
        conn: &Connection,
        life_id: &str,
        snapshot_id: &str,
    ) -> Result<()> {
        let affected = conn.execute(
            "DELETE FROM world_snapshot WHERE id = ?1 AND life_id = ?2",
            params![snapshot_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("世界快照不存在或不属于当前人生世界"));
        }
        Ok(())
    }
}
