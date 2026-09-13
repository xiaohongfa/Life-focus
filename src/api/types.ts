// TypeScript 领域类型定义
// 严格遵守 LIFE_STRATEGY_GAME_SPEC_FINAL_zh.md §4 & §14.2

export interface Life {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Leader {
  id: string;
  life_id: string;
  name: string;
  portrait_attachment_id?: string | null;
  body_md: string;
  created_at: string;
  updated_at: string;
}

export interface Trait {
  id: string;
  life_id: string;
  title: string;
  body_md: string;
  icon?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TraitRelation {
  id: string;
  life_id: string;
  predecessor_id: string;
  successor_id: string;
  occurred_at: string;
  note?: string | null;
}

export interface Ideology {
  id: string;
  life_id: string;
  title: string;
  body_md: string;
  icon?: string | null;
  sort_order: number;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Philosophy {
  id: string;
  life_id: string;
  body_md: string;
  created_at: string;
  updated_at: string;
}

export interface Situation {
  id: string;
  life_id: string;
  body_md: string;
  created_at: string;
  updated_at: string;
}

export interface NationalSpirit {
  id: string;
  life_id: string;
  title: string;
  body_md: string;
  icon?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stability {
  life_id: string;
  current_value: number | null;
  updated_at: string;
}

export interface StabilityChange {
  id: string;
  life_id: string;
  before_value: number | null;
  after_value: number;
  delta: number | null;
  occurred_at: string;
  recorded_at: string;
  reason?: string | null;
  source_type?: string | null;
  source_id?: string | null;
}

export type FocusStatus = 'active' | 'completed' | 'paused' | 'revoked';

export interface Focus {
  id: string;
  life_id: string;
  title: string;
  body_md: string;
  icon?: string | null;
  image_attachment_id?: string | null;
  status: FocusStatus;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface FocusRelation {
  id: string;
  life_id: string;
  source_focus_id: string;
  target_focus_id: string;
  relation_type: 'prerequisite' | 'mutually_exclusive';
  note?: string | null;
}

export interface FocusStatusHistory {
  id: string;
  life_id: string;
  focus_id: string;
  from_status?: string | null;
  to_status: FocusStatus;
  occurred_at: string;
  recorded_at: string;
  reason?: string | null;
  source_type?: string | null;
  source_id?: string | null;
}

export interface Decision {
  id: string;
  life_id: string;
  title: string;
  body_md: string;
  category?: string | null;
  kind: 'one_off' | 'repeatable';
  status: 'open' | 'completed' | 'abandoned';
  target_time?: string | null;
  occurrence_count: number;
  created_at: string;
  updated_at: string;
}

export interface DecisionOccurrence {
  id: string;
  life_id: string;
  decision_id: string;
  occurred_at: string;
  recorded_at: string;
  note?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
}

export interface Event {
  id: string;
  life_id: string;
  title: string;
  body_md: string;
  kind: 'normal' | 'super';
  occurred_on: string;
  image_attachment_id?: string | null;
  quote?: string | null;
  snapshot_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Essay {
  id: string;
  life_id: string;
  title: string;
  body_md: string;
  created_at: string;
  updated_at: string;
}

export interface ArchiveItem {
  id: string;
  item_type: string;
  title: string;
  summary: string;
  occurred_at: string;
  source_id: string;
  extra_badge?: string | null;
}

export interface WorldSnapshot {
  id: string;
  life_id: string;
  name: string;
  description?: string | null;
  snapshot_schema_version: number;
  payload_json: string;
  created_at: string;
}

export interface WorldOverview {
  life: Life;
  leader?: Leader | null;
  situation?: Situation | null;
  philosophy?: Philosophy | null;
  stability: Stability;
  traits: Trait[];
  ideologies: Ideology[];
  national_spirits: NationalSpirit[];
  active_foci: Focus[];
  open_decisions: Decision[];
  recent_events: Event[];
}

export interface FocusSubItem {
  id: string;
  life_id: string;
  focus_id: string;
  title: string;
  body_md?: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'canceled';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  life_id: string;
  name: string;
  role: string;
  prompt: string;
  provider_config_id?: string | null;
  model?: string | null;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffMeeting {
  id: string;
  life_id: string;
  topic: string;
  confirmed_minutes_md?: string | null;
  context_module_names: string;
  rounds: number;
  status: string;
  created_at: string;
}

export interface LLMProviderConfig {
  provider: 'deepseek' | 'openai' | 'gemini' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
}

