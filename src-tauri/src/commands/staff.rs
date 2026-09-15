use super::map_err;
use crate::db::DbState;
use crate::models::{StaffMeeting, StaffMember};
use crate::repositories::Repository;
use tauri::State;

#[tauri::command]
pub fn get_staff_members(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Vec<StaffMember>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_staff_members(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn create_staff_member(
    state: State<'_, DbState>,
    life_id: String,
    name: String,
    role: String,
    prompt: String,
    model: Option<String>,
) -> Result<StaffMember, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_staff_member(&conn, &life_id, &name, &role, &prompt, model.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn update_staff_member(
    state: State<'_, DbState>,
    life_id: String,
    member_id: String,
    name: String,
    role: String,
    prompt: String,
    enabled: bool,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_staff_member(&conn, &life_id, &member_id, &name, &role, &prompt, enabled)
        .map_err(map_err)
}

#[tauri::command]
pub fn delete_staff_member(
    state: State<'_, DbState>,
    life_id: String,
    member_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_staff_member(&conn, &life_id, &member_id).map_err(map_err)
}

#[tauri::command]
pub fn get_staff_meetings(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<Vec<StaffMeeting>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_staff_meetings(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn create_staff_meeting(
    state: State<'_, DbState>,
    life_id: String,
    topic: String,
    confirmed_minutes_md: String,
    context_module_names: String,
    rounds: i32,
    messages: Vec<(String, i32, String)>,
) -> Result<StaffMeeting, String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::create_staff_meeting(
        &mut conn,
        &life_id,
        &topic,
        &confirmed_minutes_md,
        &context_module_names,
        rounds,
        messages,
    )
    .map_err(map_err)
}
