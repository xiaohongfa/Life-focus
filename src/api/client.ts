import { invoke } from '@tauri-apps/api/core';
import type {
  Life,
  Leader,
  Trait,
  TraitRelation,
  Ideology,
  Philosophy,
  Situation,
  NationalSpirit,
  Stability,
  StabilityChange,
  Focus,
  FocusRelation,
  FocusStatusHistory,
  Decision,
  DecisionOccurrence,
  Event,
  Essay,
  ArchiveItem,
  WorldSnapshot,
  WorldOverview,
  FocusStatus,
  FocusSubItem,
  StaffMember,
  StaffMeeting,
} from './types';

// 检测是否处于 Tauri 桌面容器中
export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    return await invoke<T>(cmd, args);
  }
  // 浏览器开发调试 Mock 降级支持
  console.warn(`[Tauri Mock] Running in browser preview for ${cmd}`, args);
  return mockHandler<T>(cmd, args);
}

// 客户端 API 封装
export const api = {
  // Life
  listLives: () => tauriInvoke<Life[]>('list_lives'),
  createLife: (name: string) => tauriInvoke<Life>('create_life', { name }),
  renameLife: (lifeId: string, name: string) => tauriInvoke<void>('rename_life', { lifeId, name }),
  deleteLife: (lifeId: string) => tauriInvoke<void>('delete_life', { lifeId }),
  getWorldOverview: (lifeId: string) => tauriInvoke<WorldOverview | null>('get_world_overview', { lifeId }),

  // Stability
  getStability: (lifeId: string) => tauriInvoke<Stability>('get_stability', { lifeId }),
  setStability: (lifeId: string, newValue: number, reason?: string, sourceType?: string, sourceId?: string) =>
    tauriInvoke<StabilityChange>('set_stability', { lifeId, newValue, reason, sourceType, sourceId }),
  getStabilityHistory: (lifeId: string, limit?: number) =>
    tauriInvoke<StabilityChange[]>('get_stability_history', { lifeId, limit }),

  // Focus
  getFoci: (lifeId: string) => tauriInvoke<Focus[]>('get_foci', { lifeId }),
  getFocusRelations: (lifeId: string) => tauriInvoke<FocusRelation[]>('get_focus_relations', { lifeId }),
  createFocus: (
    lifeId: string,
    title: string,
    bodyMd: string,
    status: FocusStatus,
    positionX: number,
    positionY: number,
    icon?: string,
    imageAttachmentId?: string
  ) =>
    tauriInvoke<Focus>('create_focus', {
      lifeId,
      title,
      bodyMd,
      icon,
      imageAttachmentId,
      status,
      positionX,
      positionY,
    }),
  updateFocusStatus: (
    lifeId: string,
    focusId: string,
    newStatus: FocusStatus,
    reason?: string,
    sourceType?: string,
    sourceId?: string
  ) =>
    tauriInvoke<void>('update_focus_status', {
      lifeId,
      focusId,
      newStatus,
      reason,
      sourceType,
      sourceId,
    }),
  updateFocusPosition: (lifeId: string, focusId: string, positionX: number, positionY: number) =>
    tauriInvoke<void>('update_focus_position', { lifeId, focusId, positionX, positionY }),
  updateFocusContent: (
    lifeId: string,
    focusId: string,
    title: string,
    bodyMd: string,
    icon?: string,
    imageAttachmentId?: string
  ) =>
    tauriInvoke<void>('update_focus_content', {
      lifeId,
      focusId,
      title,
      bodyMd,
      icon,
      imageAttachmentId,
    }),
  deleteFocus: (lifeId: string, focusId: string) => tauriInvoke<void>('delete_focus', { lifeId, focusId }),
  addFocusRelation: (
    lifeId: string,
    sourceId: string,
    targetId: string,
    relationType: 'prerequisite' | 'mutually_exclusive',
    note?: string
  ) =>
    tauriInvoke<FocusRelation>('add_focus_relation', {
      lifeId,
      sourceId,
      targetId,
      relationType,
      note,
    }),
  deleteFocusRelation: (lifeId: string, relationId: string) =>
    tauriInvoke<void>('delete_focus_relation', { lifeId, relationId }),
  getFocusHistory: (lifeId: string, focusId?: string) =>
    tauriInvoke<FocusStatusHistory[]>('get_focus_history', { lifeId, focusId }),

  // Decisions
  getDecisions: (lifeId: string) => tauriInvoke<Decision[]>('get_decisions', { lifeId }),
  createDecision: (
    lifeId: string,
    title: string,
    bodyMd: string,
    kind: 'one_off' | 'repeatable',
    category?: string,
    targetTime?: string
  ) =>
    tauriInvoke<Decision>('create_decision', {
      lifeId,
      title,
      bodyMd,
      category,
      kind,
      targetTime,
    }),
  recordDecisionOccurrence: (lifeId: string, decisionId: string, note?: string) =>
    tauriInvoke<DecisionOccurrence>('record_decision_occurrence', { lifeId, decisionId, note }),
  voidDecisionOccurrence: (lifeId: string, occurrenceId: string, voidReason?: string) =>
    tauriInvoke<void>('void_decision_occurrence', { lifeId, occurrenceId, voidReason }),
  decrementDecisionOccurrence: (lifeId: string, decisionId: string) =>
    tauriInvoke<void>('decrement_decision_occurrence', { lifeId, decisionId }),
  updateDecisionStatus: (lifeId: string, decisionId: string, newStatus: string, reason?: string) =>
    tauriInvoke<void>('update_decision_status', { lifeId, decisionId, newStatus, reason }),

  // World objects
  getLeader: (lifeId: string) => tauriInvoke<Leader | null>('get_leader', { lifeId }),
  updateLeader: (lifeId: string, name: string, bodyMd: string, portraitAttachmentId?: string) =>
    tauriInvoke<void>('update_leader', { lifeId, name, bodyMd, portraitAttachmentId }),
  getSituation: (lifeId: string) => tauriInvoke<Situation | null>('get_situation', { lifeId }),
  updateSituation: (lifeId: string, bodyMd: string) => tauriInvoke<void>('update_situation', { lifeId, bodyMd }),
  getPhilosophy: (lifeId: string) => tauriInvoke<Philosophy | null>('get_philosophy', { lifeId }),
  updatePhilosophy: (lifeId: string, bodyMd: string) => tauriInvoke<void>('update_philosophy', { lifeId, bodyMd }),

  // Traits
  getTraits: (lifeId: string, includeArchived = false) =>
    tauriInvoke<Trait[]>('get_traits', { lifeId, includeArchived }),
  createTrait: (lifeId: string, title: string, bodyMd: string, icon?: string) =>
    tauriInvoke<Trait>('create_trait', { lifeId, title, bodyMd, icon }),
  archiveTrait: (lifeId: string, traitId: string, archive: boolean) =>
    tauriInvoke<void>('archive_trait', { lifeId, traitId, archive }),
  updateTrait: (lifeId: string, id: string, title: string, bodyMd: string, icon?: string | null) =>
    tauriInvoke<Trait>('update_trait', { lifeId, id, title, bodyMd, icon }),
  setActiveTraitStage: (lifeId: string, groupTraitIds: string[], activeTraitId: string) =>
    tauriInvoke<void>('set_active_trait_stage', { lifeId, groupTraitIds, activeTraitId }),
  setTraitEquipped: (lifeId: string, traitIds: string[], equip: boolean, targetActiveId?: string) =>
    tauriInvoke<void>('set_trait_equipped', { lifeId, traitIds, equip, targetActiveId }),
  deleteTrait: (lifeId: string, traitId: string) => tauriInvoke<void>('delete_trait', { lifeId, traitId }),
  getTraitRelations: (lifeId: string) => tauriInvoke<TraitRelation[]>('get_trait_relations', { lifeId }),
  addTraitRelation: (lifeId: string, predecessorId: string, successorId: string, note?: string) =>
    tauriInvoke<TraitRelation>('add_trait_relation', { lifeId, predecessorId, successorId, note }),
  deleteTraitRelation: (lifeId: string, relationId: string) =>
    tauriInvoke<void>('delete_trait_relation', { lifeId, relationId }),

  // Ideologies & Spirits
  getIdeologies: (lifeId: string, includeArchived = false) =>
    tauriInvoke<Ideology[]>('get_ideologies', { lifeId, includeArchived }),
  createIdeology: (lifeId: string, title: string, bodyMd: string, icon?: string) =>
    tauriInvoke<Ideology>('create_ideology', { lifeId, title, bodyMd, icon }),
  updateIdeology: (lifeId: string, id: string, title: string, bodyMd: string, icon?: string | null) =>
    tauriInvoke<Ideology>('update_ideology', { lifeId, id, title, bodyMd, icon }),
  archiveIdeology: (lifeId: string, ideologyId: string, archive: boolean) =>
    tauriInvoke<void>('archive_ideology', { lifeId, ideologyId, archive }),
  deleteIdeology: (lifeId: string, id: string) =>
    tauriInvoke<void>('delete_ideology', { lifeId, id }),
  getNationalSpirits: (lifeId: string, includeArchived = false) =>
    tauriInvoke<NationalSpirit[]>('get_national_spirits', { lifeId, includeArchived }),
  createNationalSpirit: (lifeId: string, title: string, bodyMd: string, icon?: string) =>
    tauriInvoke<NationalSpirit>('create_national_spirit', { lifeId, title, bodyMd, icon }),
  updateNationalSpirit: (lifeId: string, id: string, title: string, bodyMd: string, icon?: string | null) =>
    tauriInvoke<NationalSpirit>('update_national_spirit', { lifeId, id, title, bodyMd, icon }),
  archiveNationalSpirit: (lifeId: string, spiritId: string, archive: boolean) =>
    tauriInvoke<void>('archive_national_spirit', { lifeId, spiritId, archive }),
  deleteNationalSpirit: (lifeId: string, id: string) =>
    tauriInvoke<void>('delete_national_spirit', { lifeId, id }),

  // Events & Essays
  getEvents: (lifeId: string) => tauriInvoke<Event[]>('get_events', { lifeId }),
  createEvent: (
    lifeId: string,
    title: string,
    bodyMd: string,
    kind: 'normal' | 'super',
    occurredOn: string,
    quote?: string,
    imageAttachmentId?: string,
    snapshotId?: string
  ) =>
    tauriInvoke<Event>('create_event', {
      lifeId,
      title,
      bodyMd,
      kind,
      occurredOn,
      imageAttachmentId,
      quote,
      snapshotId,
    }),
  getEssays: (lifeId: string) => tauriInvoke<Essay[]>('get_essays', { lifeId }),
  createEssay: (lifeId: string, title: string, bodyMd: string) =>
    tauriInvoke<Essay>('create_essay', { lifeId, title, bodyMd }),
  updateEssay: (_lifeId: string, id: string, title: string, bodyMd: string) =>
    tauriInvoke<Essay>('update_essay', { id, title, bodyMd }),
  deleteEssay: (_lifeId: string, id: string) =>
    tauriInvoke<void>('delete_essay', { id }),

  // Archive & Snapshots
  getArchiveFeed: (lifeId: string, filterType?: string) =>
    tauriInvoke<ArchiveItem[]>('get_archive_feed', { lifeId, filterType }),
  createWorldSnapshot: (lifeId: string, name: string, description: string | undefined, payloadJson: string) =>
    tauriInvoke<WorldSnapshot>('create_world_snapshot', { lifeId, name, description, payloadJson }),
  listWorldSnapshots: (lifeId: string) => tauriInvoke<WorldSnapshot[]>('list_world_snapshots', { lifeId }),
  deleteWorldSnapshot: (lifeId: string, snapshotId: string) =>
    tauriInvoke<void>('delete_world_snapshot', { lifeId, snapshotId }),

  // Sub-Focus
  getSubFoci: (lifeId: string, focusId: string) =>
    tauriInvoke<FocusSubItem[]>('get_sub_foci', { lifeId, focusId }),
  listAllSubFoci: (lifeId: string) =>
    tauriInvoke<FocusSubItem[]>('list_all_sub_foci', { lifeId }),
  createSubFocus: (lifeId: string, focusId: string, title: string, bodyMd?: string) =>
    tauriInvoke<FocusSubItem>('create_sub_focus', { lifeId, focusId, title, bodyMd }),
  updateSubFocusStatus: (lifeId: string, subId: string, status: string) =>
    tauriInvoke<void>('update_sub_focus_status', { lifeId, subId, status }),
  deleteSubFocus: (lifeId: string, subId: string) =>
    tauriInvoke<void>('delete_sub_focus', { lifeId, subId }),

  // Staff & Cabinet
  getStaffMembers: (lifeId: string) =>
    tauriInvoke<StaffMember[]>('get_staff_members', { lifeId }),
  createStaffMember: (lifeId: string, name: string, role: string, prompt: string, model?: string) =>
    tauriInvoke<StaffMember>('create_staff_member', { lifeId, name, role, prompt, model }),
  updateStaffMember: (lifeId: string, memberId: string, name: string, role: string, prompt: string, enabled: boolean) =>
    tauriInvoke<void>('update_staff_member', { lifeId, memberId, name, role, prompt, enabled }),
  deleteStaffMember: (lifeId: string, memberId: string) =>
    tauriInvoke<void>('delete_staff_member', { lifeId, memberId }),
  getStaffMeetings: (lifeId: string) =>
    tauriInvoke<StaffMeeting[]>('get_staff_meetings', { lifeId }),
  createStaffMeeting: (
    lifeId: string,
    topic: string,
    confirmedMinutesMd: string,
    contextModuleNames: string,
    rounds: number,
    messages: [string, number, string][]
  ) =>
    tauriInvoke<StaffMeeting>('create_staff_meeting', {
      lifeId,
      topic,
      confirmedMinutesMd,
      contextModuleNames,
      rounds,
      messages,
    }),

  // Export
  exportLifeMarkdown: (lifeId: string) =>
    tauriInvoke<string>('export_life_markdown', { lifeId }),
  exportLifeJson: (lifeId: string) =>
    tauriInvoke<string>('export_life_json', { lifeId }),
};

// 浏览器运行环境调试降级桩 (In-memory storage)
const mockData: {
  lives: Life[];
  foci: Focus[];
  relations: FocusRelation[];
  decisions: Decision[];
  traits: Trait[];
  traitRelations: TraitRelation[];
  spirits: NationalSpirit[];
  ideologies: Ideology[];
  events: Event[];
  essays: Essay[];
  subFoci: FocusSubItem[];
  staffMembers: StaffMember[];
  staffMeetings: StaffMeeting[];
  leaders: Record<string, Leader>;
  stability: Record<string, { current: number | null; history: StabilityChange[] }>;
} = {
  lives: [{ id: 'mock-life-1', name: '第一人生', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
  foci: [
    { id: 'focus-1', life_id: 'mock-life-1', title: '求学之路', body_md: '扎实专业学识，构建系统化认知底座与思维模型。', status: 'completed', position_x: 240, position_y: 190, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'focus-2', life_id: 'mock-life-1', title: '职场打拼', body_md: '切入主干战役，积累一线实操战功与核心资源网络。', status: 'active', position_x: 520, position_y: 190, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'focus-3', life_id: 'mock-life-1', title: '家庭建设', body_md: '打造稳固家庭后盾与精神避风港，传承优良家风。', status: 'completed', position_x: 820, position_y: 190, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'focus-4', life_id: 'mock-life-1', title: '专业技能', body_md: '淬炼独门硬核技术，形成难以替代的战略壁垒。', status: 'completed', position_x: 340, position_y: 350, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'focus-5', life_id: 'mock-life-1', title: '企业晋升', body_md: '承担团队领导责任，打赢攻坚战役，突破职业天花板。', status: 'active', position_x: 500, position_y: 350, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'focus-6', life_id: 'mock-life-1', title: '商业冒险', body_md: '自建商业闭环，在不确定市场中博取非对称收益。', status: 'paused', position_x: 660, position_y: 350, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'focus-7', life_id: 'mock-life-1', title: '健康管理', body_md: '科学运动与精力分配，维持体魄韧性与高抗压机能。', status: 'completed', position_x: 850, position_y: 350, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'focus-8', life_id: 'mock-life-1', title: '心身修炼', body_md: '身心合一，以内在定力对抗外界浮躁与焦虑。', status: 'active', position_x: 500, position_y: 500, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
  relations: [
    { id: 'rel-1', life_id: 'mock-life-1', source_focus_id: 'focus-1', target_focus_id: 'focus-2', relation_type: 'prerequisite' },
    { id: 'rel-2', life_id: 'mock-life-1', source_focus_id: 'focus-2', target_focus_id: 'focus-3', relation_type: 'prerequisite' },
    { id: 'rel-3', life_id: 'mock-life-1', source_focus_id: 'focus-1', target_focus_id: 'focus-4', relation_type: 'prerequisite' },
    { id: 'rel-4', life_id: 'mock-life-1', source_focus_id: 'focus-4', target_focus_id: 'focus-5', relation_type: 'prerequisite' },
    { id: 'rel-5', life_id: 'mock-life-1', source_focus_id: 'focus-5', target_focus_id: 'focus-6', relation_type: 'mutually_exclusive' },
    { id: 'rel-6', life_id: 'mock-life-1', source_focus_id: 'focus-3', target_focus_id: 'focus-7', relation_type: 'prerequisite' },
    { id: 'rel-7', life_id: 'mock-life-1', source_focus_id: 'focus-5', target_focus_id: 'focus-8', relation_type: 'prerequisite' },
  ],
  decisions: [],
  traits: [
    { id: 'trait-1', life_id: 'mock-life-1', title: '本质思考 1阶', body_md: '第一性原理拆解核心逻辑，专注归纳本质公理', icon: undefined, archived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'trait-2', life_id: 'mock-life-1', title: '反脆弱进化 2阶', body_md: '在波动与挫败中沉淀经验，持续构建第二曲线', icon: 'active', archived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'trait-3', life_id: 'mock-life-1', title: '终局洞察推演 3阶', body_md: '以未来终局视角审视当下决断，保持战略定力', icon: undefined, archived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
  traitRelations: [
    { id: 't-rel-1', life_id: 'mock-life-1', predecessor_id: 'trait-1', successor_id: 'trait-2', note: '心智阶梯进阶', occurred_at: new Date().toISOString() },
    { id: 't-rel-2', life_id: 'mock-life-1', predecessor_id: 'trait-2', successor_id: 'trait-3', note: '心智阶梯进阶', occurred_at: new Date().toISOString() },
  ],
  spirits: [
    { id: 'spirit-1', life_id: 'mock-life-1', title: '宏观行业紧缩周期', body_md: '外部资本环境持续收紧，现金流与抗风险基本面优先。', icon: undefined, archived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'spirit-2', life_id: 'mock-life-1', title: 'AI生产力革命潮', body_md: '新型认知与生产工具爆发式普及，技术迭代窗口极为紧迫。', icon: undefined, archived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
  ideologies: [
    { id: 'ideo-1', life_id: 'mock-life-1', title: '实用理性主义', body_md: '实践是检验真理的唯一标准，以最小成本求证闭环，摒弃教条主义。', icon: undefined, sort_order: 0, archived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'ideo-2', life_id: 'mock-life-1', title: '极端长期主义', body_md: '放弃短期虚荣指标，在深水区积累核心壁垒，信任复利的力量。', icon: undefined, sort_order: 1, archived_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ],
  events: [],
  essays: [],
  subFoci: [],
  staffMembers: [],
  staffMeetings: [],
  leaders: {},
  stability: {
    'mock-life-1': { current: 75, history: [] },
  },
};

export function resolveActiveEquippedTraits(traits: Trait[], relations: TraitRelation[]): Trait[] {
  if (traits.length === 0) return [];

  const unarchived = traits.filter((t) => !t.archived_at);
  const adj = new Map<string, string[]>();
  for (const r of relations) {
    if (!adj.has(r.predecessor_id)) adj.set(r.predecessor_id, []);
    if (!adj.has(r.successor_id)) adj.set(r.successor_id, []);
    adj.get(r.predecessor_id)!.push(r.successor_id);
    adj.get(r.successor_id)!.push(r.predecessor_id);
  }

  const traitMap = new Map<string, Trait>();
  for (const t of unarchived) traitMap.set(t.id, t);

  const visited = new Set<string>();
  const activeTraits: Trait[] = [];

  for (const t of unarchived) {
    if (visited.has(t.id)) continue;

    const compIds: string[] = [];
    const queue = [t.id];
    visited.add(t.id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      compIds.push(curr);
      const neighbors = adj.get(curr) || [];
      for (const n of neighbors) {
        if (traitMap.has(n) && !visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }

    const component = compIds.map((id) => traitMap.get(id)!).filter(Boolean);
    if (component.length === 0) continue;

    if (component.length === 1) {
      const single = component[0];
      if (single.icon !== 'benched') {
        activeTraits.push(single);
      }
    } else {
      const active = component.find((item) => item.icon === 'active');
      if (active) {
        activeTraits.push(active);
      } else {
        const isBenched = component.some((item) => item.icon === 'benched');
        if (!isBenched) {
          const succSet = new Set(relations.map((r) => r.successor_id));
          const root = component.find((item) => !succSet.has(item.id)) || component[0];
          activeTraits.push(root);
        }
      }
    }
  }

  return activeTraits;
}

function mockHandler<T>(cmd: string, args?: Record<string, unknown>): T {
  const now = new Date().toISOString();
  if (cmd === 'list_lives') return mockData.lives as T;
  if (cmd === 'create_life') {
    const newLife = { id: `life-${Date.now()}`, name: (args?.name as string) || '新人生', created_at: now, updated_at: now };
    mockData.lives.push(newLife);
    return newLife as T;
  }
  if (cmd === 'delete_life') {
    const lifeId = args?.lifeId as string;
    mockData.lives = mockData.lives.filter((l) => l.id !== lifeId);
    mockData.traits = mockData.traits.filter((t) => t.life_id !== lifeId);
    mockData.foci = mockData.foci.filter((f) => f.life_id !== lifeId);
    mockData.ideologies = mockData.ideologies.filter((i) => i.life_id !== lifeId);
    mockData.spirits = mockData.spirits.filter((s) => s.life_id !== lifeId);
    mockData.essays = mockData.essays.filter((e) => e.life_id !== lifeId);
    mockData.events = mockData.events.filter((e) => e.life_id !== lifeId);
    return undefined as unknown as T;
  }
  if (cmd === 'get_world_overview') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0].id;
    const life = mockData.lives.find((l) => l.id === lifeId) || mockData.lives[0];
    const stab = mockData.stability[lifeId]?.current ?? null;
    const leader = mockData.leaders[lifeId] || {
      id: `l-${lifeId}`,
      life_id: lifeId,
      name: '最高统帅',
      body_md: '自述性格与战略特质...',
      portrait_attachment_id: undefined,
      created_at: now,
      updated_at: now,
    };
    const lifeTraits = mockData.traits.filter((t) => t.life_id === lifeId);
    const lifeRels = mockData.traitRelations.filter((r) => r.life_id === lifeId);
    return {
      life,
      leader,
      situation: { id: 's1', life_id: lifeId, body_md: '当前面临多项核心发展机遇。', created_at: now, updated_at: now },
      philosophy: { id: 'p1', life_id: lifeId, body_md: '# 底层哲学\n坚定战略定力。', created_at: now, updated_at: now },
      stability: { life_id: lifeId, current_value: stab, updated_at: now },
      traits: resolveActiveEquippedTraits(lifeTraits, lifeRels),
      ideologies: mockData.ideologies.filter((i) => i.life_id === lifeId),
      national_spirits: mockData.spirits.filter((s) => s.life_id === lifeId),
      active_foci: mockData.foci.filter((f) => f.life_id === lifeId && f.status === 'active'),
      open_decisions: mockData.decisions.filter((d) => d.life_id === lifeId && d.status === 'open'),
      recent_events: mockData.events.filter((e) => e.life_id === lifeId),
    } as T;
  }
  if (cmd === 'get_leader') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0]?.id;
    if (!mockData.leaders[lifeId]) {
      mockData.leaders[lifeId] = {
        id: `leader-${lifeId}`,
        life_id: lifeId,
        name: '最高统帅',
        body_md: '自述性格与战略特质...',
        portrait_attachment_id: undefined,
        created_at: now,
        updated_at: now,
      };
    }
    return mockData.leaders[lifeId] as T;
  }
  if (cmd === 'update_leader') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0]?.id;
    if (!mockData.leaders[lifeId]) {
      mockData.leaders[lifeId] = {
        id: `leader-${lifeId}`,
        life_id: lifeId,
        name: (args?.name as string) || '最高统帅',
        body_md: (args?.bodyMd as string) || '',
        portrait_attachment_id: args?.portraitAttachmentId as string | undefined,
        created_at: now,
        updated_at: now,
      };
    } else {
      mockData.leaders[lifeId].name = (args?.name as string) || mockData.leaders[lifeId].name;
      mockData.leaders[lifeId].body_md = (args?.bodyMd as string) ?? mockData.leaders[lifeId].body_md;
      mockData.leaders[lifeId].portrait_attachment_id = args?.portraitAttachmentId as string | undefined;
      mockData.leaders[lifeId].updated_at = now;
    }
    return undefined as unknown as T;
  }
  if (cmd === 'get_stability') {
    const lifeId = (args?.lifeId as string) || 'mock-life-1';
    return { life_id: lifeId, current_value: mockData.stability[lifeId]?.current ?? null, updated_at: now } as T;
  }
  if (cmd === 'set_stability') {
    const lifeId = (args?.lifeId as string) || 'mock-life-1';
    const val = args?.newValue as number;
    if (!mockData.stability[lifeId]) mockData.stability[lifeId] = { current: null, history: [] };
    const prev = mockData.stability[lifeId].current;
    mockData.stability[lifeId].current = val;
    const change: StabilityChange = {
      id: `sc-${Date.now()}`,
      life_id: lifeId,
      before_value: prev,
      after_value: val,
      delta: prev !== null ? val - prev : null,
      occurred_at: now,
      recorded_at: now,
      reason: args?.reason as string,
    };
    mockData.stability[lifeId].history.unshift(change);
    return change as T;
  }
  if (cmd === 'get_foci') {
    const lifeId = args?.lifeId as string;
    return mockData.foci.filter((f) => f.life_id === lifeId) as T;
  }
  if (cmd === 'get_focus_relations') {
    const lifeId = args?.lifeId as string;
    return mockData.relations.filter((r) => r.life_id === lifeId) as T;
  }
  if (cmd === 'create_focus') {
    const f: Focus = {
      id: `focus-${Date.now()}`,
      life_id: args?.lifeId as string,
      title: args?.title as string,
      body_md: (args?.bodyMd as string) || '',
      status: (args?.status as FocusStatus) || 'active',
      position_x: (args?.positionX as number) || 0,
      position_y: (args?.positionY as number) || 0,
      created_at: now,
      updated_at: now,
    };
    mockData.foci.push(f);
    return f as T;
  }
  if (cmd === 'update_focus_position') {
    const focusId = args?.focusId as string;
    const f = mockData.foci.find((item) => item.id === focusId);
    if (f) {
      f.position_x = args?.positionX as number;
      f.position_y = args?.positionY as number;
      f.updated_at = now;
    }
    return undefined as unknown as T;
  }
  if (cmd === 'update_focus_status') {
    const focusId = args?.focusId as string;
    const f = mockData.foci.find((item) => item.id === focusId);
    if (f) {
      f.status = args?.newStatus as FocusStatus;
      f.updated_at = now;
    }
    return undefined as unknown as T;
  }
  if (cmd === 'update_focus_content') {
    const focusId = args?.focusId as string;
    const f = mockData.foci.find((item) => item.id === focusId);
    if (f) {
      f.title = (args?.title as string) || f.title;
      f.body_md = (args?.bodyMd as string) ?? f.body_md;
      f.updated_at = now;
    }
    return undefined as unknown as T;
  }
  if (cmd === 'delete_focus') {
    const focusId = args?.focusId as string;
    mockData.foci = mockData.foci.filter((item) => item.id !== focusId);
    mockData.relations = mockData.relations.filter(
      (r) => r.source_focus_id !== focusId && r.target_focus_id !== focusId
    );
    return undefined as unknown as T;
  }
  if (cmd === 'add_focus_relation') {
    const rel: FocusRelation = {
      id: `rel-${Date.now()}`,
      life_id: args?.lifeId as string,
      source_focus_id: args?.sourceId as string,
      target_focus_id: args?.targetId as string,
      relation_type: (args?.relationType as 'prerequisite' | 'mutually_exclusive') || 'prerequisite',
      note: args?.note as string,
    };
    mockData.relations.push(rel);
    return rel as T;
  }
  if (cmd === 'delete_focus_relation') {
    const relationId = args?.relationId as string;
    mockData.relations = mockData.relations.filter((r) => r.id !== relationId);
    return undefined as unknown as T;
  }
  if (cmd === 'get_focus_history') {
    return [] as T;
  }
  if (cmd === 'get_decisions') {
    const lifeId = args?.lifeId as string;
    return mockData.decisions.filter((d) => d.life_id === lifeId) as T;
  }
  if (cmd === 'create_decision') {
    const d: Decision = {
      id: `dec-${Date.now()}`,
      life_id: args?.lifeId as string,
      title: args?.title as string,
      body_md: (args?.bodyMd as string) || '',
      kind: (args?.kind as 'one_off' | 'repeatable') || 'one_off',
      status: 'open',
      category: args?.category as string,
      occurrence_count: 0,
      created_at: now,
      updated_at: now,
    };
    mockData.decisions.push(d);
    return d as T;
  }
  if (cmd === 'record_decision_occurrence') {
    const decisionId = args?.decisionId as string;
    const dec = mockData.decisions.find((d) => d.id === decisionId);
    if (dec) {
      dec.occurrence_count = (dec.occurrence_count || 0) + 1;
      if (dec.kind === 'one_off') {
        dec.status = 'completed';
      }
      dec.updated_at = now;
    }
    return {
      id: `occ-${Date.now()}`,
      life_id: args?.lifeId as string,
      decision_id: decisionId,
      occurred_at: now,
      recorded_at: now,
      note: args?.note as string | undefined,
      voided_at: null,
      void_reason: null,
    } as unknown as T;
  }
  if (cmd === 'void_decision_occurrence' || cmd === 'decrement_decision_occurrence') {
    const decisionId = args?.decisionId as string;
    const dec = mockData.decisions.find((d) => d.id === decisionId);
    if (dec && dec.occurrence_count > 0) {
      dec.occurrence_count -= 1;
      if (dec.kind === 'one_off' && dec.status === 'completed') {
        dec.status = 'open';
      }
      dec.updated_at = now;
    }
    return undefined as unknown as T;
  }
  if (cmd === 'update_decision_status') {
    const dec = mockData.decisions.find((d) => d.id === args?.decisionId);
    if (dec) {
      dec.status = args?.newStatus as any;
      dec.updated_at = now;
    }
    return undefined as unknown as T;
  }
  if (cmd === 'get_traits') {
    const lifeId = args?.lifeId as string;
    const includeArchived = args?.includeArchived as boolean;
    return mockData.traits.filter(
      (t) => t.life_id === lifeId && (includeArchived || !t.archived_at)
    ) as T;
  }
  if (cmd === 'create_trait') {
    const t: Trait = {
      id: `trait-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      life_id: args?.lifeId as string,
      title: args?.title as string,
      body_md: (args?.bodyMd as string) || '',
      icon: args?.icon as string | undefined,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };
    mockData.traits.push(t);
    return t as T;
  }
  if (cmd === 'archive_trait') {
    const trait = mockData.traits.find((t) => t.id === args?.traitId);
    if (trait) trait.archived_at = (args?.archive as boolean) ? now : null;
    return undefined as unknown as T;
  }
  if (cmd === 'delete_trait') {
    mockData.traits = mockData.traits.filter((t) => t.id !== args?.traitId);
    mockData.traitRelations = mockData.traitRelations.filter(
      (r) => r.predecessor_id !== args?.traitId && r.successor_id !== args?.traitId
    );
    return undefined as unknown as T;
  }
  if (cmd === 'update_trait') {
    const trait = mockData.traits.find((t) => t.id === args?.id);
    if (trait) {
      trait.title = (args?.title as string) || trait.title;
      trait.body_md = (args?.bodyMd as string) ?? trait.body_md;
      trait.icon = args?.icon as string | undefined;
      trait.updated_at = now;
      return trait as T;
    }
    throw new Error('Trait not found');
  }
  if (cmd === 'set_active_trait_stage') {
    const groupTraitIds = (args?.groupTraitIds as string[]) || [];
    const activeId = args?.activeTraitId as string;
    for (const tid of groupTraitIds) {
      const t = mockData.traits.find((item) => item.id === tid);
      if (t) {
        t.icon = t.id === activeId ? 'active' : undefined;
        t.updated_at = now;
      }
    }
    return undefined as unknown as T;
  }
  if (cmd === 'set_trait_equipped') {
    const traitIds = (args?.traitIds as string[]) || [];
    const equip = args?.equip as boolean;
    const targetActiveId = (args?.targetActiveId as string) || traitIds[0];
    for (const tid of traitIds) {
      const t = mockData.traits.find((item) => item.id === tid);
      if (t) {
        if (!equip) {
          t.icon = 'benched';
        } else {
          t.icon = t.id === targetActiveId ? 'active' : undefined;
        }
        t.updated_at = now;
      }
    }
    return undefined as unknown as T;
  }
  if (cmd === 'get_ideologies') {
    const lifeId = args?.lifeId as string;
    const includeArchived = args?.includeArchived as boolean;
    return mockData.ideologies.filter((i) => i.life_id === lifeId && (includeArchived || !i.archived_at)) as T;
  }
  if (cmd === 'create_ideology') {
    const ideo: Ideology = {
      id: `ideo-${Date.now()}`,
      life_id: args?.lifeId as string,
      title: args?.title as string,
      body_md: (args?.bodyMd as string) || '',
      icon: args?.icon as string | undefined,
      sort_order: mockData.ideologies.length,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };
    mockData.ideologies.push(ideo);
    return ideo as T;
  }
  if (cmd === 'update_ideology') {
    const ideo = mockData.ideologies.find((i) => i.id === args?.id);
    if (ideo) {
      ideo.title = (args?.title as string) || ideo.title;
      ideo.body_md = (args?.bodyMd as string) ?? ideo.body_md;
      ideo.icon = args?.icon as string | undefined;
      ideo.updated_at = now;
      return ideo as T;
    }
    throw new Error('Ideology not found');
  }
  if (cmd === 'archive_ideology') {
    const ideo = mockData.ideologies.find((i) => i.id === args?.ideologyId);
    if (ideo) ideo.archived_at = (args?.archive as boolean) ? now : null;
    return undefined as unknown as T;
  }
  if (cmd === 'delete_ideology') {
    mockData.ideologies = mockData.ideologies.filter((i) => i.id !== args?.id);
    return undefined as unknown as T;
  }
  if (cmd === 'get_national_spirits') {
    const lifeId = args?.lifeId as string;
    const includeArchived = args?.includeArchived as boolean;
    return mockData.spirits.filter((s) => s.life_id === lifeId && (includeArchived || !s.archived_at)) as T;
  }
  if (cmd === 'create_national_spirit') {
    const spirit: NationalSpirit = {
      id: `spirit-${Date.now()}`,
      life_id: args?.lifeId as string,
      title: args?.title as string,
      body_md: (args?.bodyMd as string) || '',
      icon: args?.icon as string | undefined,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };
    mockData.spirits.push(spirit);
    return spirit as T;
  }
  if (cmd === 'update_national_spirit') {
    const spirit = mockData.spirits.find((s) => s.id === args?.id);
    if (spirit) {
      spirit.title = (args?.title as string) || spirit.title;
      spirit.body_md = (args?.bodyMd as string) ?? spirit.body_md;
      spirit.icon = args?.icon as string | undefined;
      spirit.updated_at = now;
      return spirit as T;
    }
    throw new Error('National spirit not found');
  }
  if (cmd === 'archive_national_spirit') {
    const spirit = mockData.spirits.find((s) => s.id === args?.spiritId);
    if (spirit) spirit.archived_at = (args?.archive as boolean) ? now : null;
    return undefined as unknown as T;
  }
  if (cmd === 'delete_national_spirit') {
    mockData.spirits = mockData.spirits.filter((s) => s.id !== args?.id);
    return undefined as unknown as T;
  }
  if (cmd === 'get_trait_relations') {
    const lifeId = args?.lifeId as string;
    return mockData.traitRelations.filter((r) => r.life_id === lifeId) as T;
  }
  if (cmd === 'add_trait_relation') {
    const rel: TraitRelation = {
      id: `trel-${Date.now()}`,
      life_id: args?.lifeId as string,
      predecessor_id: args?.predecessorId as string,
      successor_id: args?.successorId as string,
      occurred_at: now,
      note: args?.note as string | undefined,
    };
    mockData.traitRelations.push(rel);
    return rel as T;
  }
  if (cmd === 'delete_trait_relation') {
    const relationId = args?.relationId as string | undefined;
    const predId = args?.predecessorId as string | undefined;
    const succId = args?.successorId as string | undefined;
    mockData.traitRelations = mockData.traitRelations.filter((r) => {
      if (relationId && r.id === relationId) return false;
      if (predId && succId && r.predecessor_id === predId && r.successor_id === succId) return false;
      return true;
    });
    return undefined as unknown as T;
  }
  if (cmd === 'get_events') {
    const lifeId = args?.lifeId as string;
    return mockData.events.filter((e) => e.life_id === lifeId) as T;
  }
  if (cmd === 'create_event') {
    const ev: Event = {
      id: `ev-${Date.now()}`,
      life_id: args?.lifeId as string,
      title: args?.title as string,
      body_md: (args?.bodyMd as string) || '',
      kind: (args?.kind as 'normal' | 'super') || 'normal',
      occurred_on: (args?.occurredOn as string) || now.split('T')[0],
      quote: args?.quote as string | undefined,
      created_at: now,
      updated_at: now,
    };
    mockData.events.unshift(ev);
    return ev as T;
  }
  if (cmd === 'get_archive_feed') {
    const lifeId = args?.lifeId as string;
    const feed: ArchiveItem[] = [];
    for (const ev of mockData.events) {
      if (ev.life_id === lifeId) {
        feed.push({
          id: ev.id,
          source_id: ev.id,
          item_type: ev.kind === 'super' ? 'super_event' : 'event',
          title: ev.title,
          summary: ev.body_md,
          occurred_at: ev.occurred_on,
        });
      }
    }
    for (const meet of mockData.staffMeetings) {
      if (meet.life_id === lifeId) {
        feed.push({
          id: meet.id,
          source_id: meet.id,
          item_type: 'staff_meeting',
          title: `总参谋部研讨共识：${meet.topic}`,
          summary: meet.confirmed_minutes_md || '',
          occurred_at: meet.created_at || now,
        });
      }
    }
    for (const essay of mockData.essays) {
      if (essay.life_id === lifeId) {
        feed.push({
          id: essay.id,
          source_id: essay.id,
          item_type: 'essay',
          title: `随笔: ${essay.title}`,
          summary: essay.body_md,
          occurred_at: essay.updated_at || now,
        });
      }
    }
    return feed as T;
  }
  if (cmd === 'get_essays') {
    const lifeId = args?.lifeId as string;
    return mockData.essays.filter((e) => e.life_id === lifeId) as T;
  }
  if (cmd === 'create_essay') {
    const essay: Essay = {
      id: `essay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      life_id: args?.lifeId as string,
      title: args?.title as string,
      body_md: args?.bodyMd as string,
      created_at: now,
      updated_at: now,
    };
    mockData.essays.unshift(essay);
    return essay as T;
  }
  if (cmd === 'update_essay') {
    const id = args?.id as string;
    const essay = mockData.essays.find((e) => e.id === id);
    if (essay) {
      essay.title = args?.title as string;
      essay.body_md = args?.bodyMd as string;
      essay.updated_at = now;
      return essay as T;
    }
    throw new Error('Essay not found');
  }
  if (cmd === 'delete_essay') {
    const id = args?.id as string;
    mockData.essays = mockData.essays.filter((e) => e.id !== id);
    return undefined as unknown as T;
  }
  if (cmd === 'get_sub_foci' || cmd === 'list_all_sub_foci') {
    const focusId = args?.focusId as string | undefined;
    if (focusId) {
      return mockData.subFoci.filter((s) => s.focus_id === focusId) as T;
    }
    return mockData.subFoci as T;
  }
  if (cmd === 'create_sub_focus') {
    const sub: FocusSubItem = {
      id: `sub-${Date.now()}`,
      life_id: args?.lifeId as string,
      focus_id: args?.focusId as string,
      title: args?.title as string,
      body_md: args?.bodyMd as string | undefined,
      status: 'todo',
      sort_order: mockData.subFoci.length,
      created_at: now,
      updated_at: now,
    };
    mockData.subFoci.push(sub);
    return sub as T;
  }
  if (cmd === 'update_sub_focus_status') {
    const sub = mockData.subFoci.find((s) => s.id === args?.subId);
    if (sub) {
      sub.status = args?.status as 'todo' | 'done';
      sub.updated_at = now;
    }
    return undefined as unknown as T;
  }
  if (cmd === 'delete_sub_focus') {
    mockData.subFoci = mockData.subFoci.filter((s) => s.id !== args?.subId);
    return undefined as unknown as T;
  }
  if (cmd === 'get_staff_members') {
    if (mockData.staffMembers.length === 0) {
      mockData.staffMembers = [
        {
          id: 'staff-1',
          life_id: (args?.lifeId as string) || 'mock-life-1',
          name: '战略参谋长',
          role: '首席长期战略顾问',
          prompt: '从宏观战略、路线演进与终局思维出发，推演各项重大国策的长远得失与可行节奏。',
          enabled: true,
          sort_order: 0,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'staff-2',
          life_id: (args?.lifeId as string) || 'mock-life-1',
          name: '财政与资源总监',
          role: '财务与精力分配顾问',
          prompt: '关注时间、精力与财务资本的分配效率，严格计算投入产出比。',
          enabled: true,
          sort_order: 1,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'staff-3',
          life_id: (args?.lifeId as string) || 'mock-life-1',
          name: '身心体魄总管',
          role: '精力管理与健康顾问',
          prompt: '关注最高统帅的精力槽、睡眠与精神状态，在面临高压决策时警惕身心耗竭。',
          enabled: true,
          sort_order: 2,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'staff-4',
          life_id: (args?.lifeId as string) || 'mock-life-1',
          name: '批判反对者',
          role: '战略挑刺官与盲区副官',
          prompt: '专门寻找计划中的逻辑漏洞、未预料的意外风险与自我欺骗。',
          enabled: true,
          sort_order: 3,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'staff-5',
          life_id: (args?.lifeId as string) || 'mock-life-1',
          name: '哲学与意识形态宗师',
          role: '底层价值观与定力导师',
          prompt: '从核心人生哲学与伦理信念出发，评估行动是否背离初心。',
          enabled: true,
          sort_order: 4,
          created_at: now,
          updated_at: now,
        },
      ];
    }
    return mockData.staffMembers as T;
  }
  if (cmd === 'create_staff_member') {
    const mem: StaffMember = {
      id: `staff-${Date.now()}`,
      life_id: args?.lifeId as string,
      name: args?.name as string,
      role: args?.role as string,
      prompt: args?.prompt as string,
      model: args?.model as string | undefined,
      enabled: true,
      sort_order: mockData.staffMembers.length,
      created_at: now,
      updated_at: now,
    };
    mockData.staffMembers.push(mem);
    return mem as T;
  }
  if (cmd === 'get_staff_meetings') {
    return mockData.staffMeetings as T;
  }
  if (cmd === 'create_staff_meeting') {
    const meeting: StaffMeeting = {
      id: `meet-${Date.now()}`,
      life_id: args?.lifeId as string,
      topic: args?.topic as string,
      confirmed_minutes_md: args?.confirmedMinutesMd as string,
      context_module_names: args?.contextModuleNames as string,
      rounds: args?.rounds as number,
      status: 'confirmed',
      created_at: now,
    };
    mockData.staffMeetings.push(meeting);
    return meeting as T;
  }
  if (cmd === 'export_life_markdown') {
    return '# 人生战略档案导出预览\n\n导出功能运行正常。' as unknown as T;
  }
  if (cmd === 'export_life_json') {
    return JSON.stringify({ mock: true, exported_at: now }, null, 2) as unknown as T;
  }
  return [] as unknown as T;
}
