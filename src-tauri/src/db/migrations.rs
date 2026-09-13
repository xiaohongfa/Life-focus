use rusqlite::{Connection, Result};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

pub struct Migration {
    pub version: i32,
    pub name: &'static str,
    pub sql: &'static str,
}

pub static MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "001_initial_schema",
        sql: include_str!("../../migrations/001_initial_schema.sql"),
    },
    Migration {
        version: 2,
        name: "002_sub_focus",
        sql: include_str!("../../migrations/002_sub_focus.sql"),
    },
];

pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL,
            checksum TEXT NOT NULL
        );",
    )?;

    for migration in MIGRATIONS {
        let existing: Option<String> = {
            let mut stmt = conn.prepare("SELECT checksum FROM _migrations WHERE version = ?1")?;
            stmt.query_row([migration.version], |row| row.get(0)).ok()
        };

        let mut hasher = DefaultHasher::new();
        migration.sql.hash(&mut hasher);
        let current_checksum = format!("{:x}", hasher.finish());

        if let Some(existing_checksum) = existing {
            if existing_checksum != current_checksum {
                log::warn!(
                    "Migration {} checksum mismatch (applied: {}, current: {})",
                    migration.name,
                    existing_checksum,
                    current_checksum
                );
            }
        } else {
            log::info!("Applying migration {} (v{})", migration.name, migration.version);
            let tx = conn.transaction()?;
            tx.execute_batch(migration.sql)?;
            tx.execute(
                "INSERT INTO _migrations (version, name, applied_at, checksum) VALUES (?1, ?2, datetime('now'), ?3)",
                rusqlite::params![migration.version, migration.name, current_checksum],
            )?;
            tx.commit()?;
            log::info!("Migration {} applied successfully", migration.name);
        }
    }

    Ok(())
}
