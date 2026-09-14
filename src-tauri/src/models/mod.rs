use serde::{Deserialize, Serialize};

// 1. 人生空间
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Life {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

// 2. 领导人
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Leader {
    pub id: String,
    pub life_id: String,
    pub name: String,
    pub portrait_attachment_id: Option<String>,
    pub body_md: String,
    pub created_at: String,
    pub updated_at: String,
}

// 3. 特质与特质演化
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trait {
    pub id: String,
    pub life_id: String,
    pub title: String,
    pub body_md: String,
    pub icon: Option<String>,
    #[serde(default = "default_equip_state")]
    pub equip_state: Option<String>,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

fn default_equip_state() -> Option<String> {
    Some("unequipped".to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TraitRelation {
    pub id: String,
    pub life_id: String,
    pub predecessor_id: String,
    pub successor_id: String,
    pub occurred_at: String,
    pub note: Option<String>,
}

// 4. 意识形态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ideology {
    pub id: String,
    pub life_id: String,
    pub title: String,
    pub body_md: String,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// 5. 人生哲学与当前局势
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Philosophy {
    pub id: String,
    pub life_id: String,
    pub body_md: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Situation {
    pub id: String,
    pub life_id: String,
    pub body_md: String,
    pub created_at: String,
    pub updated_at: String,
}

// 6. 国家精神
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NationalSpirit {
    pub id: String,
    pub life_id: String,
    pub title: String,
    pub body_md: String,
    pub icon: Option<String>,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// 7. 稳定度与稳定度变更
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Stability {
    pub life_id: String,
    pub current_value: Option<f64>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StabilityChange {
    pub id: String,
    pub life_id: String,
    pub before_value: Option<f64>,
    pub after_value: f64,
    pub delta: Option<f64>,
    pub occurred_at: String,
    pub recorded_at: String,
    pub reason: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<String>,
}

// 8. 国策系统
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FocusStatus {
    Active,
    Completed,
    Paused,
    Revoked,
}

impl std::str::FromStr for FocusStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "active" => Ok(FocusStatus::Active),
            "completed" => Ok(FocusStatus::Completed),
            "paused" => Ok(FocusStatus::Paused),
            "revoked" => Ok(FocusStatus::Revoked),
            _ => Err(format!("未知的国策状态: '{s}', 允许值为 active, completed, paused, revoked")),
        }
    }
}

impl FocusStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            FocusStatus::Active => "active",
            FocusStatus::Completed => "completed",
            FocusStatus::Paused => "paused",
            FocusStatus::Revoked => "revoked",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FocusRelationType {
    Prerequisite,
    MutuallyExclusive,
}

impl std::str::FromStr for FocusRelationType {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "prerequisite" => Ok(FocusRelationType::Prerequisite),
            "mutually_exclusive" => Ok(FocusRelationType::MutuallyExclusive),
            _ => Err(format!("未知的国策关系类型: '{s}', 允许值为 prerequisite, mutually_exclusive")),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TraitEquipState {
    Active,
    Benched,
    Unequipped,
}

impl std::str::FromStr for TraitEquipState {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "active" => Ok(TraitEquipState::Active),
            "benched" => Ok(TraitEquipState::Benched),
            "unequipped" => Ok(TraitEquipState::Unequipped),
            _ => Err(format!("未知的特质装备状态: '{s}', 允许值为 active, benched, unequipped")),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SubFocusStatus {
    Todo,
    InProgress,
    Done,
    Canceled,
}

impl std::str::FromStr for SubFocusStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "todo" => Ok(SubFocusStatus::Todo),
            "in_progress" => Ok(SubFocusStatus::InProgress),
            "done" => Ok(SubFocusStatus::Done),
            "canceled" => Ok(SubFocusStatus::Canceled),
            _ => Err(format!("未知的子国策状态: '{s}', 允许值为 todo, in_progress, done, canceled")),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EventKind {
    Normal,
    Super,
}

impl std::str::FromStr for EventKind {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "normal" => Ok(EventKind::Normal),
            "super" => Ok(EventKind::Super),
            _ => Err(format!("未知的事件类型: '{s}', 允许值为 normal, super")),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StaffMeetingStatus {
    InProgress,
    Completed,
    Aborted,
}

impl std::str::FromStr for StaffMeetingStatus {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "in_progress" => Ok(StaffMeetingStatus::InProgress),
            "completed" => Ok(StaffMeetingStatus::Completed),
            "aborted" => Ok(StaffMeetingStatus::Aborted),
            _ => Err(format!("未知的参谋会议状态: '{s}', 允许值为 in_progress, completed, aborted")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Focus {
    pub id: String,
    pub life_id: String,
    pub title: String,
    pub body_md: String,
    pub icon: Option<String>,
    pub image_attachment_id: Option<String>,
    pub status: String,
    pub position_x: f64,
    pub position_y: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusRelation {
    pub id: String,
    pub life_id: String,
    pub source_focus_id: String,
    pub target_focus_id: String,
    pub relation_type: String, // "prerequisite" | "mutually_exclusive"
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusStatusHistory {
    pub id: String,
    pub life_id: String,
    pub focus_id: String,
    pub from_status: Option<String>,
    pub to_status: String,
    pub occurred_at: String,
    pub recorded_at: String,
    pub reason: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusSubItem {
    pub id: String,
    pub life_id: String,
    pub focus_id: String,
    pub title: String,
    pub body_md: Option<String>,
    pub status: String, // "todo" | "in_progress" | "done" | "canceled"
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

// 10. 事件与随笔
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: String,
    pub life_id: String,
    pub title: String,
    pub body_md: String,
    pub kind: String, // "normal" | "super"
    pub occurred_on: String,
    pub image_attachment_id: Option<String>,
    pub quote: Option<String>,
    pub snapshot_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Essay {
    pub id: String,
    pub life_id: String,
    pub title: String,
    pub body_md: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectLink {
    pub id: String,
    pub life_id: String,
    pub source_type: String,
    pub source_id: String,
    pub target_type: String,
    pub target_id: String,
    pub kind: String,
    pub created_at: String,
}

// 11. 快照系统
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldSnapshot {
    pub id: String,
    pub life_id: String,
    pub name: String,
    pub description: Option<String>,
    pub snapshot_schema_version: i32,
    pub payload_json: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextSnapshot {
    pub id: String,
    pub life_id: String,
    pub source_type: String,
    pub source_id: String,
    pub name: String,
    pub description: Option<String>,
    pub body_md: String,
    pub created_at: String,
}

// 12. 总参谋部
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffMember {
    pub id: String,
    pub life_id: String,
    pub name: String,
    pub role: String,
    pub prompt: String,
    pub provider_config_id: Option<String>,
    pub model: Option<String>,
    pub enabled: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffMeeting {
    pub id: String,
    pub life_id: String,
    pub topic: String,
    pub confirmed_minutes_md: Option<String>,
    pub context_module_names: String,
    pub rounds: i32,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StaffMessage {
    pub id: String,
    pub life_id: String,
    pub meeting_id: String,
    pub speaker_label: String,
    pub round_index: i32,
    pub confirmed_content: String,
    pub created_at: String,
}

// 13. Archive 统一历史展示项 (无物理实体表，查询层统一聚合)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveItem {
    pub id: String,
    pub item_type: String, // "event" | "super_event" | "snapshot" | "essay" | "meeting" | "decision_occurrence" | "focus_status_history" | "archived_trait" | "archived_spirit"
    pub title: String,
    pub summary: String,
    pub occurred_at: String,
    pub source_id: String,
    pub extra_badge: Option<String>,
}

// 14. 完整世界概览 (用于首页与仪表盘一站式聚合加载)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldOverview {
    pub life: Life,
    pub leader: Option<Leader>,
    pub situation: Option<Situation>,
    pub philosophy: Option<Philosophy>,
    pub stability: Stability,
    pub traits: Vec<Trait>,
    pub ideologies: Vec<Ideology>,
    pub national_spirits: Vec<NationalSpirit>,
    pub active_foci: Vec<Focus>,
    pub recent_events: Vec<Event>,
}
