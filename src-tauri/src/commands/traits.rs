use super::map_err;
use crate::db::DbState;
use crate::models::{Trait, TraitRelation};
use crate::repositories::Repository;
use tauri::State;

#[tauri::command]
pub fn get_traits(
    state: State<'_, DbState>,
    life_id: String,
    include_archived: bool,
) -> Result<Vec<Trait>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_traits(&conn, &life_id, include_archived).map_err(map_err)
}

#[tauri::command]
pub fn create_trait(
    state: State<'_, DbState>,
    life_id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
) -> Result<Trait, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_trait(&conn, &life_id, &title, &body_md, icon.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn archive_trait(
    state: State<'_, DbState>,
    life_id: String,
    trait_id: String,
    archive: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::archive_trait(&conn, &life_id, &trait_id, archive).map_err(map_err)
}

#[tauri::command]
pub fn delete_trait(
    state: State<'_, DbState>,
    life_id: String,
    trait_id: String,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_trait(&mut conn, &life_id, &trait_id).map_err(map_err)
}

#[tauri::command]
pub fn update_trait(
    state: State<'_, DbState>,
    life_id: String,
    id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
) -> Result<Trait, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_trait(&conn, &life_id, &id, &title, &body_md, icon.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn set_active_trait_stage(
    state: State<'_, DbState>,
    life_id: String,
    group_trait_ids: Vec<String>,
    active_trait_id: String,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::set_active_trait_stage(&mut conn, &life_id, &group_trait_ids, &active_trait_id)
        .map_err(map_err)
}

#[tauri::command]
pub fn set_trait_equipped(
    state: State<'_, DbState>,
    life_id: String,
    trait_ids: Vec<String>,
    equip: bool,
    target_active_id: Option<String>,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::set_trait_equipped(
        &mut conn,
        &life_id,
        &trait_ids,
        equip,
        target_active_id.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn get_trait_relations(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Vec<TraitRelation>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_trait_relations(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn add_trait_relation(
    state: State<'_, DbState>,
    life_id: String,
    predecessor_id: String,
    successor_id: String,
    note: Option<String>,
) -> Result<TraitRelation, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::add_trait_relation(
        &conn,
        &life_id,
        &predecessor_id,
        &successor_id,
        note.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn delete_trait_relation(
    state: State<'_, DbState>,
    life_id: String,
    relation_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_trait_relation(&conn, &life_id, &relation_id).map_err(map_err)
}
