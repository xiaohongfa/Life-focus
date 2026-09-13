use tauri::State;
use crate::db::DbState;
use crate::models::*;
use crate::repositories::Repository;

// Helper to map rusqlite errors to String
fn map_err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ==================== LIFE COMMANDS ====================
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
pub fn get_world_overview(state: State<'_, DbState>, life_id: String) -> Result<Option<WorldOverview>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_world_overview(&conn, &life_id).map_err(map_err)
}

// ==================== STABILITY COMMANDS ====================
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

// ==================== FOCUS COMMANDS ====================
#[tauri::command]
pub fn get_foci(state: State<'_, DbState>, life_id: String) -> Result<Vec<Focus>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_foci(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn get_focus_relations(state: State<'_, DbState>, life_id: String) -> Result<Vec<FocusRelation>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_focus_relations(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
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
    Repository::update_focus_position(&conn, &life_id, &focus_id, position_x, position_y).map_err(map_err)
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
pub fn delete_focus(state: State<'_, DbState>, life_id: String, focus_id: String) -> Result<(), String> {
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
    Repository::add_focus_relation(&conn, &life_id, &source_id, &target_id, &relation_type, note.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn delete_focus_relation(state: State<'_, DbState>, life_id: String, relation_id: String) -> Result<(), String> {
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

// ==================== DECISION COMMANDS ====================
#[tauri::command]
pub fn get_decisions(state: State<'_, DbState>, life_id: String) -> Result<Vec<Decision>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_decisions(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn create_decision(
    state: State<'_, DbState>,
    life_id: String,
    title: String,
    body_md: String,
    category: Option<String>,
    kind: String,
    target_time: Option<String>,
) -> Result<Decision, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_decision(
        &conn,
        &life_id,
        &title,
        &body_md,
        category.as_deref(),
        &kind,
        target_time.as_deref(),
    )
    .map_err(map_err)
}

#[tauri::command]
pub fn record_decision_occurrence(
    state: State<'_, DbState>,
    life_id: String,
    decision_id: String,
    note: Option<String>,
) -> Result<DecisionOccurrence, String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::record_decision_occurrence(&mut conn, &life_id, &decision_id, note.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn void_decision_occurrence(
    state: State<'_, DbState>,
    life_id: String,
    occurrence_id: String,
    void_reason: Option<String>,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::void_decision_occurrence(&mut conn, &life_id, &occurrence_id, void_reason.as_deref())
        .map_err(map_err)
}

#[tauri::command]
pub fn decrement_decision_occurrence(
    state: State<'_, DbState>,
    life_id: String,
    decision_id: String,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::decrement_decision_occurrence(&mut conn, &life_id, &decision_id)
        .map_err(map_err)
}

#[tauri::command]
pub fn update_decision_status(
    state: State<'_, DbState>,
    life_id: String,
    decision_id: String,
    new_status: String,
    reason: Option<String>,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::update_decision_status(&mut conn, &life_id, &decision_id, &new_status, reason.as_deref())
        .map_err(map_err)
}

// ==================== WORLD OBJECT COMMANDS ====================
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
    Repository::update_leader(&conn, &life_id, &name, &body_md, portrait_attachment_id.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn get_situation(state: State<'_, DbState>, life_id: String) -> Result<Option<Situation>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_situation(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn update_situation(state: State<'_, DbState>, life_id: String, body_md: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_situation(&conn, &life_id, &body_md).map_err(map_err)
}

#[tauri::command]
pub fn get_philosophy(state: State<'_, DbState>, life_id: String) -> Result<Option<Philosophy>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_philosophy(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn update_philosophy(state: State<'_, DbState>, life_id: String, body_md: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_philosophy(&conn, &life_id, &body_md).map_err(map_err)
}

#[tauri::command]
pub fn get_traits(state: State<'_, DbState>, life_id: String, include_archived: bool) -> Result<Vec<Trait>, String> {
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
pub fn archive_trait(state: State<'_, DbState>, life_id: String, trait_id: String, archive: bool) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::archive_trait(&conn, &life_id, &trait_id, archive).map_err(map_err)
}

#[tauri::command]
pub fn delete_trait(state: State<'_, DbState>, life_id: String, trait_id: String) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_trait(&mut conn, &life_id, &trait_id).map_err(map_err)
}

#[tauri::command]
pub fn get_trait_relations(state: State<'_, DbState>, life_id: String) -> Result<Vec<TraitRelation>, String> {
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
    Repository::add_trait_relation(&conn, &life_id, &predecessor_id, &successor_id, note.as_deref()).map_err(map_err)
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

#[tauri::command]
pub fn get_ideologies(state: State<'_, DbState>, life_id: String, include_archived: bool) -> Result<Vec<Ideology>, String> {
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
pub fn archive_ideology(state: State<'_, DbState>, life_id: String, ideology_id: String, archive: bool) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::archive_ideology(&conn, &life_id, &ideology_id, archive).map_err(map_err)
}

#[tauri::command]
pub fn get_national_spirits(state: State<'_, DbState>, life_id: String, include_archived: bool) -> Result<Vec<NationalSpirit>, String> {
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
    Repository::create_national_spirit(&conn, &life_id, &title, &body_md, icon.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn archive_national_spirit(state: State<'_, DbState>, life_id: String, spirit_id: String, archive: bool) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::archive_national_spirit(&conn, &life_id, &spirit_id, archive).map_err(map_err)
}

#[tauri::command]
pub fn get_events(state: State<'_, DbState>, life_id: String) -> Result<Vec<Event>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_events(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
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
    id: String,
    title: String,
    body_md: String,
) -> Result<Essay, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_essay(&conn, &id, &title, &body_md).map_err(map_err)
}

#[tauri::command]
pub fn delete_essay(
    state: State<'_, DbState>,
    id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_essay(&conn, &id).map_err(map_err)
}

// ==================== ARCHIVE COMMANDS ====================
#[tauri::command]
pub fn get_archive_feed(
    state: State<'_, DbState>,
    life_id: String,
    filter_type: Option<String>,
) -> Result<Vec<ArchiveItem>, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::get_archive_feed(&conn, &life_id, filter_type.as_deref()).map_err(map_err)
}

// ==================== SNAPSHOT COMMANDS ====================
#[tauri::command]
pub fn create_world_snapshot(
    state: State<'_, DbState>,
    life_id: String,
    name: String,
    description: Option<String>,
    payload_json: String,
) -> Result<WorldSnapshot, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::create_world_snapshot(&conn, &life_id, &name, description.as_deref(), &payload_json).map_err(map_err)
}

#[tauri::command]
pub fn list_world_snapshots(state: State<'_, DbState>, life_id: String) -> Result<Vec<WorldSnapshot>, String> {
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

// ==================== SUB-FOCUS COMMANDS ====================
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
    Repository::create_sub_focus(&conn, &life_id, &focus_id, &title, body_md.as_deref()).map_err(map_err)
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

// ==================== STAFF / CABINET COMMANDS ====================
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
    Repository::create_staff_member(&conn, &life_id, &name, &role, &prompt, model.as_deref()).map_err(map_err)
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
    Repository::update_staff_member(&conn, &life_id, &member_id, &name, &role, &prompt, enabled).map_err(map_err)
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
    Repository::create_staff_meeting(&mut conn, &life_id, &topic, &confirmed_minutes_md, &context_module_names, rounds, messages).map_err(map_err)
}

// ==================== EXPORT DATA COMMANDS (§16) ====================
#[tauri::command]
pub fn export_life_markdown(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<String, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::export_life_markdown(&conn, &life_id).map_err(map_err)
}

#[tauri::command]
pub fn export_life_json(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<String, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::export_life_json(&conn, &life_id).map_err(map_err)
}

// ==================== DELETE LIFE & CRUD COMMANDS ====================
#[tauri::command]
pub fn delete_life(
    state: State<'_, DbState>,
    life_id: String,
) -> Result<(), String> {
    let mut conn = state.conn.lock().map_err(map_err)?;
    Repository::delete_life(&mut conn, &life_id).map_err(map_err)
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
    Repository::update_trait(&conn, &life_id, &id, &title, &body_md, icon.as_deref()).map_err(map_err)
}

#[tauri::command]
pub fn set_active_trait_stage(
    state: State<'_, DbState>,
    life_id: String,
    group_trait_ids: Vec<String>,
    active_trait_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::set_active_trait_stage(&conn, &life_id, &group_trait_ids, &active_trait_id).map_err(map_err)
}

#[tauri::command]
pub fn set_trait_equipped(
    state: State<'_, DbState>,
    life_id: String,
    trait_ids: Vec<String>,
    equip: bool,
    target_active_id: Option<String>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::set_trait_equipped(&conn, &life_id, &trait_ids, equip, target_active_id.as_deref()).map_err(map_err)
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
    Repository::update_ideology(&conn, &life_id, &id, &title, &body_md, icon.as_deref()).map_err(map_err)
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
pub fn update_national_spirit(
    state: State<'_, DbState>,
    life_id: String,
    id: String,
    title: String,
    body_md: String,
    icon: Option<String>,
) -> Result<NationalSpirit, String> {
    let conn = state.conn.lock().map_err(map_err)?;
    Repository::update_national_spirit(&conn, &life_id, &id, &title, &body_md, icon.as_deref()).map_err(map_err)
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

