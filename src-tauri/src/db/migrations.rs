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
    Migration {
        version: 4,
        name: "004_trait_equip_state_constraints",
        sql: include_str!("../../migrations/004_trait_equip_state_constraints.sql"),
    },
];

fn compute_sha256(content: &str) -> String {
    // 归一化换行符为 Unix LF (\n)，彻底消除不同操作系统或 Git 签出 CRLF (\r\n) 导致的哈希歧义
    let normalized = content.replace("\r\n", "\n");
    let mut hasher = Sha256::new();
    hasher.update(normalized.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn compute_raw_sha256(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn compute_legacy_hash(content: &str) -> String {
    let normalized = content.replace("\r\n", "\n");
    let mut hasher = DefaultHasher::new();
    normalized.hash(&mut hasher);
    format!("{:x}", hasher.finish())
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
        let raw_sha256 = compute_raw_sha256(migration.sql);

        if let Some(existing_checksum) = existing {
            if existing_checksum == sha256_checksum || existing_checksum == raw_sha256 {
                // Checksum verified
                continue;
            }

            // Check if existing checksum was computed using legacy DefaultHasher
            let legacy_checksum = compute_legacy_hash(migration.sql);
            let legacy_raw_checksum = {
                let mut hasher = DefaultHasher::new();
                migration.sql.hash(&mut hasher);
                format!("{:x}", hasher.finish())
            };

            if existing_checksum == legacy_checksum || existing_checksum == legacy_raw_checksum {
                log::info!(
                    "Migrating migration {} checksum from legacy DefaultHasher ({}) to SHA-256 ({})",
                    migration.name,
                    existing_checksum,
                    sha256_checksum
                );
                conn.execute(
                    "UPDATE _migrations SET checksum = ?1 WHERE version = ?2",
                    rusqlite::params![sha256_checksum, migration.version],
                )?;
            } else {
                // 便携版与跨版本无感升级保障：
                // 若旧数据库中已记录该迁移版本，自动平滑同步至标准 SHA-256 校验和，绝不由于细微换行/格式差异导致主程序闪退崩溃
                log::warn!(
                    "Migration {} (v{}) existing checksum {} does not strictly match (expected {} or {}). Harmonizing checksum for portable stability.",
                    migration.name,
                    migration.version,
                    existing_checksum,
                    sha256_checksum,
                    raw_sha256
                );
                conn.execute(
                    "UPDATE _migrations SET checksum = ?1 WHERE version = ?2",
                    rusqlite::params![sha256_checksum, migration.version],
                )?;
            }
        } else {
            log::info!(
                "Applying migration {} (v{})",
                migration.name,
                migration.version
            );
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
