use super::{custom_err, Repository};
use crate::models::*;
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

impl Repository {
    pub fn list_lives(conn: &Connection) -> Result<Vec<Life>> {
        let mut stmt = conn
            .prepare("SELECT id, name, created_at, updated_at FROM life ORDER BY created_at ASC")?;
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
        let mut stmt =
            conn.prepare("SELECT id, name, created_at, updated_at FROM life WHERE id = ?1")?;
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
        let affected = conn.execute(
            "UPDATE life SET name = ?1, updated_at = ?2 WHERE id = ?3",
            params![name, now, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("人生世界不存在"));
        }
        Ok(())
    }

    pub fn delete_life(conn: &mut Connection, life_id: &str) -> Result<()> {
        let tx = conn.transaction()?;
        let affected = tx.execute("DELETE FROM life WHERE id = ?1", params![life_id])?;
        if affected == 0 {
            return Err(custom_err("人生世界不存在"));
        }
        tx.commit()?;
        Ok(())
    }

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
        let affected = conn.execute(
            "UPDATE leader SET name = ?1, body_md = ?2, portrait_attachment_id = ?3, updated_at = ?4 WHERE life_id = ?5",
            params![name, body_md, portrait_attachment_id, now, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("最高统帅档案不存在"));
        }
        Ok(())
    }

    pub fn get_situation(conn: &Connection, life_id: &str) -> Result<Option<Situation>> {
        let mut stmt = conn.prepare(
            "SELECT id, body_md, created_at, updated_at FROM situation WHERE life_id = ?1",
        )?;
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
        let affected = conn.execute(
            "UPDATE situation SET body_md = ?1, updated_at = ?2 WHERE life_id = ?3",
            params![body_md, now, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("局势档案不存在"));
        }
        Ok(())
    }

    pub fn get_philosophy(conn: &Connection, life_id: &str) -> Result<Option<Philosophy>> {
        let mut stmt = conn.prepare(
            "SELECT id, body_md, created_at, updated_at FROM philosophy WHERE life_id = ?1",
        )?;
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
        let affected = conn.execute(
            "UPDATE philosophy SET body_md = ?1, updated_at = ?2 WHERE life_id = ?3",
            params![body_md, now, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("底层哲学档案不存在"));
        }
        Ok(())
    }

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
}
