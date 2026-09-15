use super::map_err;
use crate::db::DbState;
use crate::models::{Life, WorldOverview};
use crate::repositories::Repository;
use tauri::State;

#[tauri::command]
pub fn list_lives(state: State<'_, DbState>) -> Result<Vec<Life>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::list_lives(&conn).map_err(map_err)
}

#[tauri::command]
pub fn create_life(state: State<'_, DbState>, name: String) -> Result<Life, String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::create_life(&mut conn, &name).map_err(map_err)
}

#[tauri::command]
pub fn rename_life(state: State<'_, DbState>, life_id: String, name: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::rename_life(&conn, &life_id, &name).map_err(map_err)
}

#[tauri::command]
pub fn delete_life(state: State<'_, DbState>, life_id: String) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_life(&mut conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn get_world_overview(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Option<WorldOverview>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_world_overview(&conn, &life_id).map_err(map_err)
}
