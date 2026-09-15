use super::map_err;
use crate::db::DbState;
use crate::repositories::Repository;
use tauri::State;

#[tauri::command]
pub fn export_life_markdown(state: State<'_, DbState>, life_id: String) -> Result<String, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::export_life_markdown(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn export_life_json(state: State<'_, DbState>, life_id: String) -> Result<String, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::export_life_json(&conn, &life_id).map_err(map_err)
}
