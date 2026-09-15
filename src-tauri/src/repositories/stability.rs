use super::Repository;
use crate::models::{Stability, StabilityChange};
use rusqlite::{params, Connection, Result};
use uuid::Uuid;

impl Repository {
    pub fn get_stability(conn: &Connection, life_id: &str) -> Result<Stability> {
        let mut stmt =
            conn.prepare("SELECT current_value, updated_at FROM stability WHERE life_id = ?1")?;
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

    pub fn get_stability_history(
        conn: &Connection,
        life_id: &str,
        limit: i64,
    ) -> Result<Vec<StabilityChange>> {
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
}
