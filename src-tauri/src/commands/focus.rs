use super::map_err;
use crate::db::DbState;
use crate::models::{Focus, FocusRelation, FocusStatusHistory, FocusSubItem};
use crate::repositories::Repository;
use tauri::State;

#[tauri::command]
pub fn get_foci(state: State<'_, DbState>, life_id: String) -> Result<Vec<Focus>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_foci(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn get_focus_relations(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Vec<FocusRelation>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_focus_relations(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn create_focus(
    state: State<'_, DbState>,
    life_id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
    image_attachment_id: Option<String>,
    status: String,
    position_x: f64,
    position_y: f64,
) -> Result<Focus, String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::create_focus(
        &mut conn,
        &life_id,
        &title,
        &body_md,
        icon.as_deref(),
        image_attachment_id.as_deref(),
        &status,
        position_x,
        position_y,
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn update_focus_status(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
    new_status: String,
    reason: Option<String>,
    source_type: Option<String>,
    source_id: Option<String>,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::update_focus_status(
        &mut conn,
        &life_id,
        &focus_id,
        &new_status,
        reason.as_deref(),
        source_type.as_deref(),
        source_id.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn update_focus_position(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
    position_x: f64,
    position_y: f64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_focus_position(&conn, &life_id, &focus_id, position_x, position_y)
        .map_err(map_err)
}

#[tauri::command]
pub fn update_focus_content(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
    image_attachment_id: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_focus_content(
        &conn,
        &life_id,
        &focus_id,
        &title,
        &body_md,
        icon.as_deref(),
        image_attachment_id.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn delete_focus(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_focus(&mut conn, &life_id, &focus_id).map_err(map_err)
}

#[tauri::command]
pub fn add_focus_relation(
    state: State<'_, DbState>,
    life_id: String,
    source_id: String,
    target_id: String,
    relation_type: String,
    note: Option<String>,
) -> Result<FocusRelation, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::add_focus_relation(
        &conn,
        &life_id,
        &source_id,
        &target_id,
        &relation_type,
        note.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn delete_focus_relation(
    state: State<'_, DbState>,
    life_id: String,
    relation_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_focus_relation(&conn, &life_id, &relation_id).map_err(map_err)
}

#[tauri::command]
pub fn get_focus_history(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: Option<String>,
) -> Result<Vec<FocusStatusHistory>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_focus_history(&conn, &life_id, focus_id.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn get_sub_foci(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
) -> Result<Vec<FocusSubItem>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_sub_foci(&conn, &life_id, &focus_id).map_err(map_err)
}

#[tauri::command]
pub fn list_all_sub_foci(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Vec<FocusSubItem>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::list_all_sub_foci(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn create_sub_focus(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
    title: String,
    body_md: Option<String>,
) -> Result<FocusSubItem, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_sub_focus(&conn, &life_id, &focus_id, &title, body_md.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn update_sub_focus_status(
    state: State<'_, DbState>,
    life_id: String,
    sub_id: String,
    status: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_sub_focus_status(&conn, &life_id, &sub_id, &status).map_err(map_err)
}

#[tauri::command]
pub fn delete_sub_focus(
    state: State<'_, DbState>,
    life_id: String,
    sub_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_sub_focus(&conn, &life_id, &sub_id).map_err(map_err)
}

#[tauri::command]
pub fn get_focus_essays(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
) -> Result<Vec<crate::models::Essay>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_focus_essays(&conn, &life_id, &focus_id).map_err(map_err)
}

#[tauri::command]
pub fn attach_essay_to_focus(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
    essay_id: String,
) -> Result<crate::models::ObjectLink, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::attach_essay_to_focus(&conn, &life_id, &focus_id, &essay_id).map_err(map_err)
}

#[tauri::command]
pub fn detach_essay_from_focus(
    state: State<'_, DbState>,
    life_id: String,
    focus_id: String,
    essay_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::detach_essay_from_focus(&conn, &life_id, &focus_id, &essay_id).map_err(map_err)
}

#[tauri::command]
pub fn get_all_focus_essay_counts(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<std::collections::HashMap<String, i64>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_all_focus_essay_counts(&conn, &life_id).map_err(map_err)
}

