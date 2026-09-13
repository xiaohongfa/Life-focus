pub mod migrations;

use rusqlite::{Connection, Result};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

pub struct DbState {
    pub conn: Arc<Mutex<Connection>>,
    pub data_dir: PathBuf,
}

impl DbState {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Result<Self> {
        let dir = data_dir.as_ref();
        std::fs::create_dir_all(dir).map_err(|e| {
            rusqlite::Error::ToSqlConversionFailure(Box::new(e))
        })?;

        let db_path = dir.join("life_strategy.db");
        let mut conn = Connection::open(&db_path)?;

        // 配置高性能和高可靠性 PRAGMA
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;"
        )?;

        // 执行初始迁移
        migrations::run_migrations(&mut conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            data_dir: dir.to_path_buf(),
        })
    }

    pub fn in_memory() -> Result<Self> {
        let mut conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;
        migrations::run_migrations(&mut conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            data_dir: PathBuf::from("memory"),
        })
    }
}
