use super::map_err;
use crate::db::DbState;
use crate::models::{ArchiveItem, Essay, Event, WorldSnapshot};
use crate::repositories::Repository;
use tauri::State;

#[tauri::command]
pub fn get_events(state: State<'_, DbState>, life_id: String) -> Result<Vec<Event>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_events(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn create_event(
    state: State<'_, DbState>,
    life_id: String,
    title: String,
    body_md: String,
    kind: String,
    occurred_on: String,
    image_attachment_id: Option<String>,
    quote: Option<String>,
    snapshot_id: Option<String>,
) -> Result<Event, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_event(
        &conn,
        &life_id,
        &title,
        &body_md,
        &kind,
        &occurred_on,
        image_attachment_id.as_deref(),
        quote.as_deref(),
        snapshot_id.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn get_essays(state: State<'_, DbState>, life_id: String) -> Result<Vec<Essay>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_essays(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn create_essay(
    state: State<'_, DbState>,
    life_id: String,
    title: String,
    body_md: String,
) -> Result<Essay, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_essay(&conn, &life_id, &title, &body_md).map_err(map_err)
}

#[tauri::command]
pub fn update_essay(
    state: State<'_, DbState>,
    life_id: String,
    id: String,
    title: String,
    body_md: String,
) -> Result<Essay, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_essay(&conn, &life_id, &id, &title, &body_md).map_err(map_err)
}

#[tauri::command]
pub fn delete_essay(state: State<'_, DbState>, life_id: String, id: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_essay(&conn, &life_id, &id).map_err(map_err)
}

#[tauri::command]
pub fn get_archive_feed(
    state: State<'_, DbState>,
    life_id: String,
    filter_type: Option<String>,
) -> Result<Vec<ArchiveItem>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_archive_feed(&conn, &life_id, filter_type.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn create_world_snapshot(
    state: State<'_, DbState>,
    life_id: String,
    name: String,
    description: Option<String>,
    payload_json: String,
) -> Result<WorldSnapshot, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_world_snapshot(
        &conn,
        &life_id,
        &name,
        description.as_deref(),
        &payload_json,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn list_world_snapshots(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Vec<WorldSnapshot>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::list_world_snapshots(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn delete_world_snapshot(
    state: State<'_, DbState>,
    life_id: String,
    snapshot_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_world_snapshot(&conn, &life_id, &snapshot_id).map_err(map_err)
}
