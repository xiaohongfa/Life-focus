// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::panic::set_hook(Box::new(|info| {
        let msg = format!("CRASH/PANIC at {:?}:\n{}\n", chrono::Utc::now(), info);
        eprintln!("{}", msg);
        let _ = std::fs::write("crash.log", &msg);
        let _ = std::fs::write("data/crash.log", &msg);
    }));
    app_lib::run();
}

