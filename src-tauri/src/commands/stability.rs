use super::map_err;
use crate::db::DbState;
use crate::models::{Stability, StabilityChange};
use crate::repositories::Repository;
use tauri::State;

#[tauri::command]
pub fn get_stability(state: State<'_, DbState>, life_id: String) -> Result<Stability, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_stability(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn set_stability(
    state: State<'_, DbState>,
    life_id: String,
    new_value: f64,
    reason: Option<String>,
    source_type: Option<String>,
    source_id: Option<String>,
) -> Result<StabilityChange, String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::set_stability(
        &mut conn,
        &life_id,
        new_value,
        reason.as_deref(),
        source_type.as_deref(),
        source_id.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn get_stability_history(
    state: State<'_, DbState>,
    life_id: String,
    limit: Option<i64>,
) -> Result<Vec<StabilityChange>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_stability_history(&conn, &life_id, limit.unwrap_or(50)).map_err(map_err)
}
