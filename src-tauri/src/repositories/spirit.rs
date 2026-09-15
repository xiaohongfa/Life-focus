use super::{custom_err, Repository};
use crate::models::NationalSpirit;
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

impl Repository {
    pub fn get_national_spirits(
        conn: &Connection,
        life_id: &str,
        include_archived: bool,
    ) -> Result<Vec<NationalSpirit>> {
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

    pub fn create_national_spirit(
        conn: &Connection,
        life_id: &str,
        title: &str,
        body_md: &str,
        icon: Option<&str>,
    ) -> Result<NationalSpirit> {
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

    pub fn archive_national_spirit(
        conn: &Connection,
        life_id: &str,
        spirit_id: &str,
        archive: bool,
    ) -> Result<()> {
        let now = if archive {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        };
        let affected = conn.execute(
            "UPDATE national_spirit SET archived_at = ?1 WHERE id = ?2 AND life_id = ?3",
            params![now, spirit_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("国家精神不存在或不属于当前人生世界"));
        }
        Ok(())
    }

    pub fn update_national_spirit(
        conn: &Connection,
        life_id: &str,
        spirit_id: &str,
        title: &str,
        body_md: &str,
        icon: Option<&str>,
    ) -> Result<NationalSpirit> {
        let now = chrono::Utc::now().to_rfc3339();
        let affected = conn.execute(
            "UPDATE national_spirit SET title = ?1, body_md = ?2, icon = ?3, updated_at = ?4 WHERE id = ?5 AND life_id = ?6",
            params![title, body_md, icon, now, spirit_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("国家精神不存在或不属于当前人生世界"));
        }
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
        let affected = conn.execute(
            "DELETE FROM national_spirit WHERE id = ?1 AND life_id = ?2",
            params![spirit_id, life_id],
        )?;
        if affected == 0 {
            return Err(custom_err("国家精神不存在或不属于当前人生世界"));
        }
        Ok(())
    }
}
