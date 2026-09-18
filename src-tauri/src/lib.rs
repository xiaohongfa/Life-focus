pub mod commands;
pub mod db;
pub mod llm;
pub mod models;
pub mod repositories;

use db::DbState;
use repositories::Repository;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 真正的绿色便携存储模式支持 (§P1-PKG-04 & 用户指令 4)
            // 优先级：
            // 1. 命令行 --portable 参数
            // 2. exe 同级存在 portable.flag 文件或 data 目录
            // 3. 默认系统应用数据目录 (%LOCALAPPDATA%/...)
            let is_portable_flag = std::env::args().any(|a| a == "--portable");
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|d| d.to_path_buf()));
            let has_local_marker = exe_dir
                .as_ref()
                .is_some_and(|d| d.join("portable.flag").exists() || d.join("data").is_dir());

            let app_data_dir = if is_portable_flag || has_local_marker {
                let base = exe_dir.unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
                let p = base.join("data");
                log::info!("⚡ 启用纯净便携模式 (Portable Mode)，数据存储目录: {:?}", p);
                p
            } else {
                match app.path().app_data_dir() {
                    Ok(path) => path,
                    Err(_) => std::env::current_dir()?.join("life_strategy_data"),
                }
            };

            std::fs::create_dir_all(&app_data_dir)?;
            log::info!("Database and storage directory: {:?}", app_data_dir);

            // 便携版无感自动更新与数据接力：检测全新便携环境时，自动识别并迁移邻近目录的旧版数据
            commands::try_auto_migrate_fresh_portable(&app_data_dir);

            // 初始化 SQLite 数据库与迁移引擎
            let db_state = DbState::new(&app_data_dir)?;

            // 首次启动若无 Life，默认创建一个，实现约定 §3.1
            {
                let mut conn = db_state
                    .conn
                    .lock()
                    .map_err(|_| std::io::Error::other("数据库连接锁已损坏"))?;
                let lives = Repository::list_lives(&conn)?;
                if lives.is_empty() {
                    log::info!("No life found, creating initial default life: 第一人生");
                    Repository::create_life(&mut conn, "第一人生")?;
                }
            }

            // 初始化安全 LLM 凭据存储与代理状态 (§P0-SEC-01 & §P0-SEC-02)
            let key_store = Arc::new(llm::KeyStore::new(&app_data_dir));
            app.manage(llm::LlmState { key_store });
            app.manage(db_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_lives,
            commands::create_life,
            commands::rename_life,
            commands::get_world_overview,
            commands::get_stability,
            commands::set_stability,
            commands::get_stability_history,
            commands::get_foci,
            commands::get_focus_relations,
            commands::create_focus,
            commands::update_focus_status,
            commands::update_focus_position,
            commands::update_focus_content,
            commands::delete_focus,
            commands::add_focus_relation,
            commands::delete_focus_relation,
            commands::get_focus_history,
            commands::get_leader,
            commands::update_leader,
            commands::get_situation,
            commands::update_situation,
            commands::get_philosophy,
            commands::update_philosophy,
            commands::get_traits,
            commands::create_trait,
            commands::archive_trait,
            commands::delete_trait,
            commands::get_trait_relations,
            commands::add_trait_relation,
            commands::delete_trait_relation,
            commands::get_ideologies,
            commands::create_ideology,
            commands::archive_ideology,
            commands::get_national_spirits,
            commands::create_national_spirit,
            commands::archive_national_spirit,
            commands::get_events,
            commands::create_event,
            commands::get_essays,
            commands::create_essay,
            commands::update_essay,
            commands::delete_essay,
            commands::get_archive_feed,
            commands::create_world_snapshot,
            commands::list_world_snapshots,
            commands::delete_world_snapshot,
            commands::get_sub_foci,
            commands::list_all_sub_foci,
            commands::create_sub_focus,
            commands::update_sub_focus_status,
            commands::delete_sub_focus,
            commands::get_staff_members,
            commands::create_staff_member,
            commands::update_staff_member,
            commands::delete_staff_member,
            commands::get_staff_meetings,
            commands::create_staff_meeting,
            commands::export_life_markdown,
            commands::export_life_json,
            commands::delete_life,
            commands::update_trait,
            commands::set_active_trait_stage,
            commands::set_trait_equipped,
            commands::update_ideology,
            commands::delete_ideology,
            commands::update_national_spirit,
            commands::delete_national_spirit,
            commands::get_portable_status,
            commands::scan_portable_candidates,
            commands::migrate_portable_data,
            llm::llm_get_config,
            llm::llm_save_config,
            llm::llm_clear_key,
            llm::llm_chat,
            llm::llm_test_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
