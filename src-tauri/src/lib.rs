pub mod db;
pub mod models;
pub mod repositories;
pub mod commands;

use db::DbState;
use repositories::Repository;
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

            // 获取或创建应用持久化存储目录
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap().join("life_strategy_data"));

            std::fs::create_dir_all(&app_data_dir).expect("failed to create app data directory");
            log::info!("Database and storage directory: {:?}", app_data_dir);

            // 初始化 SQLite 数据库与迁移引擎
            let db_state = DbState::new(&app_data_dir).expect("failed to initialize sqlite database");

            // 首次启动若无 Life，默认创建一个，实现约定 §3.1
            {
                let mut conn = db_state.conn.lock().expect("failed to lock db conn");
                let lives = Repository::list_lives(&conn).expect("failed to check existing lives");
                if lives.is_empty() {
                    log::info!("No life found, creating initial default life: 第一人生");
                    Repository::create_life(&mut conn, "第一人生").expect("failed to create default life");
                }
            }

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
            commands::get_decisions,
            commands::create_decision,
            commands::record_decision_occurrence,
            commands::void_decision_occurrence,
            commands::decrement_decision_occurrence,
            commands::update_decision_status,
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
            commands::delete_national_spirit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
