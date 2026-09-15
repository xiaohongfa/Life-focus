use super::map_err;
use crate::db::DbState;
use crate::models::{Ideology, Leader, NationalSpirit, Philosophy, Situation};
use crate::repositories::Repository;
use tauri::State;

#[tauri::command]
pub fn get_leader(state: State<'_, DbState>, life_id: String) -> Result<Option<Leader>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_leader(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn update_leader(
    state: State<'_, DbState>,
    life_id: String,
    name: String,
    body_md: String,
    portrait_attachment_id: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_leader(
        &conn,
        &life_id,
        &name,
        &body_md,
        portrait_attachment_id.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn get_situation(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Option<Situation>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_situation(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn update_situation(
    state: State<'_, DbState>,
    life_id: String,
    body_md: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_situation(&conn, &life_id, &body_md).map_err(map_err)
}

#[tauri::command]
pub fn get_philosophy(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Option<Philosophy>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_philosophy(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn update_philosophy(
    state: State<'_, DbState>,
    life_id: String,
    body_md: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_philosophy(&conn, &life_id, &body_md).map_err(map_err)
}

#[tauri::command]
pub fn get_ideologies(
    state: State<'_, DbState>,
    life_id: String,
    include_archived: bool,
) -> Result<Vec<Ideology>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_ideologies(&conn, &life_id, include_archived).map_err(map_err)
}

#[tauri::command]
pub fn create_ideology(
    state: State<'_, DbState>,
    life_id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
) -> Result<Ideology, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_ideology(&conn, &life_id, &title, &body_md, icon.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn update_ideology(
    state: State<'_, DbState>,
    life_id: String,
    id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
) -> Result<Ideology, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_ideology(&conn, &life_id, &id, &title, &body_md, icon.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn archive_ideology(
    state: State<'_, DbState>,
    life_id: String,
    ideology_id: String,
    archive: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::archive_ideology(&conn, &life_id, &ideology_id, archive).map_err(map_err)
}

#[tauri::command]
pub fn delete_ideology(
    state: State<'_, DbState>,
    life_id: String,
    id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_ideology(&conn, &life_id, &id).map_err(map_err)
}

#[tauri::command]
pub fn get_national_spirits(
    state: State<'_, DbState>,
    life_id: String,
    include_archived: bool,
) -> Result<Vec<NationalSpirit>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_national_spirits(&conn, &life_id, include_archived).map_err(map_err)
}

#[tauri::command]
pub fn create_national_spirit(
    state: State<'_, DbState>,
    life_id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
) -> Result<NationalSpirit, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_national_spirit(&conn, &life_id, &title, &body_md, icon.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn update_national_spirit(
    state: State<'_, DbState>,
    life_id: String,
    id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
) -> Result<NationalSpirit, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_national_spirit(&conn, &life_id, &id, &title, &body_md, icon.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn archive_national_spirit(
    state: State<'_, DbState>,
    life_id: String,
    spirit_id: String,
    archive: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::archive_national_spirit(&conn, &life_id, &spirit_id, archive).map_err(map_err)
}

#[tauri::command]
pub fn delete_national_spirit(
    state: State<'_, DbState>,
    life_id: String,
    id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_national_spirit(&conn, &life_id, &id).map_err(map_err)
}
