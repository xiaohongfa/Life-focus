use crate::commands::map_err;
use crate::db::DbState;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct PortableStatus {
    pub is_portable: bool,
    pub data_dir: String,
    pub db_exists: bool,
    pub db_size_bytes: u64,
    pub has_llm_vault: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PortableCandidate {
    pub folder_name: String,
    pub full_path: String,
    pub db_path: String,
    pub db_size_bytes: u64,
    pub last_modified: u64,
}

/// Helper to automatically copy database and vault files from a source directory into the target directory
pub fn copy_data_directory(source_dir: &Path, target_dir: &Path) -> std::io::Result<()> {
    if !target_dir.exists() {
        fs::create_dir_all(target_dir)?;
    }

    let files_to_copy = [
        "life_strategy.db",
        "life_strategy.db-wal",
        "life_strategy.db-shm",
        ".llm_vault",
    ];

    for file_name in files_to_copy {
        let src_file = source_dir.join(file_name);
        if src_file.exists() && src_file.is_file() {
            let dst_file = target_dir.join(file_name);
            // Backup existing if different
            if dst_file.exists() {
                let _ = fs::copy(&dst_file, target_dir.join(format!("{}.bak", file_name)));
            }
            fs::copy(&src_file, &dst_file)?;
        }
    }

    // Write a migration marker note
    let marker_path = target_dir.join(".migrated_from.txt");
    let info = format!(
        "Migrated from: {}\nTimestamp: {}\n",
        source_dir.display(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0)
    );
    let _ = fs::write(marker_path, info);

    Ok(())
}

/// Auto-detect previous portable version in parent or sibling directories when fresh
pub fn try_auto_migrate_fresh_portable(target_data_dir: &Path) -> Option<PathBuf> {
    let target_db = target_data_dir.join("life_strategy.db");
    // Only auto-migrate if current target db does not exist or is empty (0 bytes)
    let is_fresh = !target_db.exists() || fs::metadata(&target_db).map(|m| m.len() == 0).unwrap_or(false);
    if !is_fresh {
        return None;
    }

    // App root is parent of data_dir
    let app_root = target_data_dir.parent()?;
    let install_parent = app_root.parent()?;

    // Search sibling folders in install_parent
    if let Ok(entries) = fs::read_dir(install_parent) {
        let mut candidates: Vec<(PathBuf, std::time::SystemTime)> = Vec::new();
        for entry in entries.flatten() {
            let path = entry.path();
            if path == app_root || !path.is_dir() {
                continue;
            }

            let cand_data = path.join("data");
            let cand_db = cand_data.join("life_strategy.db");
            if cand_db.exists() {
                if let Ok(meta) = fs::metadata(&cand_db) {
                    if meta.len() > 0 {
                        let mtime = meta.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                        candidates.push((cand_data, mtime));
                    }
                }
            }
        }

        // Sort by most recently modified
        candidates.sort_by(|a, b| b.1.cmp(&a.1));

        if let Some((best_source, _)) = candidates.first() {
            log::info!(
                "⚡ [Portable Auto-Migrate] 发现旧版本便携数据: {:?}，正在无感迁移至全新版本...",
                best_source
            );
            if copy_data_directory(best_source, target_data_dir).is_ok() {
                log::info!("✓ [Portable Auto-Migrate] 旧版本便携数据已成功无感同步迁移！");
                return Some(best_source.clone());
            }
        }
    }

    None
}

#[tauri::command]
pub fn get_portable_status(state: State<'_, DbState>) -> Result<PortableStatus, String> {
    let data_dir = state.data_dir.clone();
    let db_path = data_dir.join("life_strategy.db");
    let db_exists = db_path.exists();
    let db_size_bytes = if db_exists {
        fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };
    let has_llm_vault = data_dir.join(".llm_vault").exists();

    // Check if running in portable mode
    let is_portable = data_dir.parent().map(|p| p.join("portable.flag").exists()).unwrap_or(false);

    Ok(PortableStatus {
        is_portable,
        data_dir: data_dir.display().to_string(),
        db_exists,
        db_size_bytes,
        has_llm_vault,
    })
}

#[tauri::command]
pub fn scan_portable_candidates(state: State<'_, DbState>) -> Result<Vec<PortableCandidate>, String> {
    let mut list = Vec::new();
    let current_data_dir = &state.data_dir;
    let app_root = match current_data_dir.parent() {
        Some(p) => p,
        None => return Ok(list),
    };
    let install_parent = match app_root.parent() {
        Some(p) => p,
        None => return Ok(list),
    };

    if let Ok(entries) = fs::read_dir(install_parent) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path == app_root || !path.is_dir() {
                continue;
            }

            let cand_data = path.join("data");
            let cand_db = cand_data.join("life_strategy.db");
            if cand_db.exists() {
                if let Ok(meta) = fs::metadata(&cand_db) {
                    let mtime = meta
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);

                    list.push(PortableCandidate {
                        folder_name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                        full_path: cand_data.display().to_string(),
                        db_path: cand_db.display().to_string(),
                        db_size_bytes: meta.len(),
                        last_modified: mtime,
                    });
                }
            }
        }
    }

    // Sort by modified time descending
    list.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(list)
}

#[tauri::command]
pub fn migrate_portable_data(
    source_dir: String,
    state: State<'_, DbState>,
) -> Result<String, String> {
    let src_path = PathBuf::from(&source_dir);
    if !src_path.exists() {
        return Err("所选旧版本数据源目录不存在".to_string());
    }

    let src_db = if src_path.is_file() {
        src_path.parent().unwrap_or(&src_path).to_path_buf()
    } else if src_path.join("data").is_dir() {
        src_path.join("data")
    } else {
        src_path
    };

    if !src_db.join("life_strategy.db").exists() {
        return Err("源目录中未发现 life_strategy.db 数据库文件".to_string());
    }

    // Checkpoint SQLite WAL in current DB before replacing
    {
        if let Ok(conn) = state.conn.lock() {
            let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
        }
    }

    copy_data_directory(&src_db, &state.data_dir).map_err(map_err)?;

    Ok("旧版便携数据（含数据库与本地密钥保险库）已成功无缝迁移！重启或刷新后即刻生效。".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_copy_data_directory_and_backup() {
        let base_temp = std::env::temp_dir().join(format!(
            "lf_portable_test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let src_dir = base_temp.join("src");
        let dst_dir = base_temp.join("dst");
        fs::create_dir_all(&src_dir).unwrap();
        fs::create_dir_all(&dst_dir).unwrap();

        // Create test files in src
        let db_content = b"SQLITE_TEST_CONTENT_PORTABLE";
        let vault_content = b"VAULT_TEST_KEY_DATA";
        fs::write(src_dir.join("life_strategy.db"), db_content).unwrap();
        fs::write(src_dir.join(".llm_vault"), vault_content).unwrap();

        // Pre-create existing file in dst to verify backup
        fs::write(dst_dir.join("life_strategy.db"), b"OLD_DATA").unwrap();

        copy_data_directory(&src_dir, &dst_dir).unwrap();

        // Check copy
        assert_eq!(
            fs::read(dst_dir.join("life_strategy.db")).unwrap(),
            db_content
        );
        assert_eq!(
            fs::read(dst_dir.join(".llm_vault")).unwrap(),
            vault_content
        );

        // Check backup
        assert_eq!(
            fs::read(dst_dir.join("life_strategy.db.bak")).unwrap(),
            b"OLD_DATA"
        );

        let _ = fs::remove_dir_all(&base_temp);
    }
}
