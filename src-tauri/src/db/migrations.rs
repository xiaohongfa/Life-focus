use rusqlite::{Connection, Result};
use sha2::{Digest, Sha256};
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
    Migration {
        version: 3,
        name: "003_integrity_hardening",
        sql: include_str!("../../migrations/003_integrity_hardening.sql"),
    },
];

fn compute_sha256(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn compute_legacy_hash(content: &str) -> String {
    let mut hasher = DefaultHasher::new();
    content.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn custom_err(msg: impl Into<String>) -> rusqlite::Error {
    rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::other(msg.into())))
}

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

        let sha256_checksum = compute_sha256(migration.sql);

        if let Some(existing_checksum) = existing {
            if existing_checksum == sha256_checksum {
                // Checksum verified
                continue;
            }

            // Check if existing checksum was computed using legacy DefaultHasher
            let legacy_checksum = compute_legacy_hash(migration.sql);
            if existing_checksum == legacy_checksum {
                log::info!(
                    "Migrating migration {} checksum from legacy DefaultHasher ({}) to SHA-256 ({})",
                    migration.name,
                    legacy_checksum,
                    sha256_checksum
                );
                conn.execute(
                    "UPDATE _migrations SET checksum = ?1 WHERE version = ?2",
                    rusqlite::params![sha256_checksum, migration.version],
                )?;
            } else {
                // Tampering / corruption detected! Fail fast!
                let err_msg = format!(
                    "Migration {} checksum mismatch (applied: {}, expected SHA-256: {})",
                    migration.name, existing_checksum, sha256_checksum
                );
                log::error!("{}", err_msg);
                return Err(custom_err(err_msg));
            }
        } else {
            log::info!("Applying migration {} (v{})", migration.name, migration.version);
            let tx = conn.transaction()?;
            tx.execute_batch(migration.sql)?;
            tx.execute(
                "INSERT INTO _migrations (version, name, applied_at, checksum) VALUES (?1, ?2, datetime('now'), ?3)",
                rusqlite::params![migration.version, migration.name, sha256_checksum],
            )?;
            tx.commit()?;
            log::info!("Migration {} applied successfully", migration.name);
        }
    }

    Ok(())
}
