import type {
  Life,
  Leader,
  Trait,
  TraitRelation,
  Ideology,
  Philosophy,
  Situation,
  NationalSpirit,
  StabilityChange,
  Focus,
  FocusRelation,
  FocusStatusHistory,
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
import { resolveActiveEquippedTraits } from '../domain/traits';

export interface MockStore {
  lives: Life[];
  foci: Focus[];
  relations: FocusRelation[];
  focusHistory: FocusStatusHistory[];
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
  situations: Record<string, Situation>;
  philosophies: Record<string, Philosophy>;
  stability: Record<string, { current: number | null; history: StabilityChange[] }>;
  snapshots: WorldSnapshot[];
}

const DEFAULT_LIFE_ID = 'mock-life-1';
const now = new Date().toISOString();

export const mockData: MockStore = {
  lives: [{ id: DEFAULT_LIFE_ID, name: '第一人生', created_at: now, updated_at: now }],
  foci: [
    { id: 'focus-1', life_id: DEFAULT_LIFE_ID, title: '求学之路', body_md: '扎实专业学识，构建系统化认知底座与思维模型。', status: 'completed', position_x: 240, position_y: 190, created_at: now, updated_at: now },
    { id: 'focus-2', life_id: DEFAULT_LIFE_ID, title: '职场打拼', body_md: '切入主干战役，积累一线实操战功与核心资源网络。', status: 'active', position_x: 520, position_y: 190, created_at: now, updated_at: now },
    { id: 'focus-3', life_id: DEFAULT_LIFE_ID, title: '家庭建设', body_md: '打造稳固家庭后盾与精神避风港，传承优良家风。', status: 'completed', position_x: 820, position_y: 190, created_at: now, updated_at: now },
    { id: 'focus-4', life_id: DEFAULT_LIFE_ID, title: '专业技能', body_md: '淬炼独门硬核技术，形成难以替代的战略壁垒。', status: 'completed', position_x: 340, position_y: 350, created_at: now, updated_at: now },
    { id: 'focus-5', life_id: DEFAULT_LIFE_ID, title: '企业晋升', body_md: '承担团队领导责任，打赢攻坚战役，突破职业天花板。', status: 'active', position_x: 500, position_y: 350, created_at: now, updated_at: now },
    { id: 'focus-6', life_id: DEFAULT_LIFE_ID, title: '商业冒险', body_md: '自建商业闭环，在不确定市场中博取非对称收益。', status: 'paused', position_x: 660, position_y: 350, created_at: now, updated_at: now },
    { id: 'focus-7', life_id: DEFAULT_LIFE_ID, title: '健康管理', body_md: '科学运动与精力分配，维持体魄韧性与高抗压机能。', status: 'completed', position_x: 850, position_y: 350, created_at: now, updated_at: now },
    { id: 'focus-8', life_id: DEFAULT_LIFE_ID, title: '心身修炼', body_md: '身心合一，以内在定力对抗外界浮躁与焦虑。', status: 'active', position_x: 500, position_y: 500, created_at: now, updated_at: now },
  ],
  relations: [
    { id: 'rel-1', life_id: DEFAULT_LIFE_ID, source_focus_id: 'focus-1', target_focus_id: 'focus-2', relation_type: 'prerequisite' },
    { id: 'rel-2', life_id: DEFAULT_LIFE_ID, source_focus_id: 'focus-2', target_focus_id: 'focus-3', relation_type: 'prerequisite' },
    { id: 'rel-3', life_id: DEFAULT_LIFE_ID, source_focus_id: 'focus-1', target_focus_id: 'focus-4', relation_type: 'prerequisite' },
    { id: 'rel-4', life_id: DEFAULT_LIFE_ID, source_focus_id: 'focus-4', target_focus_id: 'focus-5', relation_type: 'prerequisite' },
    { id: 'rel-5', life_id: DEFAULT_LIFE_ID, source_focus_id: 'focus-5', target_focus_id: 'focus-6', relation_type: 'mutually_exclusive' },
    { id: 'rel-6', life_id: DEFAULT_LIFE_ID, source_focus_id: 'focus-3', target_focus_id: 'focus-7', relation_type: 'prerequisite' },
    { id: 'rel-7', life_id: DEFAULT_LIFE_ID, source_focus_id: 'focus-5', target_focus_id: 'focus-8', relation_type: 'prerequisite' },
  ],
  focusHistory: [],
  traits: [
    { id: 'trait-1', life_id: DEFAULT_LIFE_ID, title: '本质思考 1阶', body_md: '第一性原理拆解核心逻辑，专注归纳本质公理', icon: undefined, equip_state: 'unequipped', archived_at: null, created_at: now, updated_at: now },
    { id: 'trait-2', life_id: DEFAULT_LIFE_ID, title: '反脆弱进化 2阶', body_md: '在波动与挫败中沉淀经验，持续构建第二曲线', icon: undefined, equip_state: 'active', archived_at: null, created_at: now, updated_at: now },
    { id: 'trait-3', life_id: DEFAULT_LIFE_ID, title: '终局洞察推演 3阶', body_md: '以未来终局视角审视当下决断，保持战略定力', icon: undefined, equip_state: 'unequipped', archived_at: null, created_at: now, updated_at: now },
  ],
  traitRelations: [
    { id: 't-rel-1', life_id: DEFAULT_LIFE_ID, predecessor_id: 'trait-1', successor_id: 'trait-2', note: '心智阶梯进阶', occurred_at: now },
    { id: 't-rel-2', life_id: DEFAULT_LIFE_ID, predecessor_id: 'trait-2', successor_id: 'trait-3', note: '心智阶梯进阶', occurred_at: now },
  ],
  spirits: [
    { id: 'spirit-1', life_id: DEFAULT_LIFE_ID, title: '宏观行业紧缩周期', body_md: '外部资本环境持续收紧，现金流与抗风险基本面优先。', icon: undefined, archived_at: null, created_at: now, updated_at: now },
    { id: 'spirit-2', life_id: DEFAULT_LIFE_ID, title: 'AI生产力革命潮', body_md: '新型认知与生产工具爆发式普及，技术迭代窗口极为紧迫。', icon: undefined, archived_at: null, created_at: now, updated_at: now },
  ],
  ideologies: [
    { id: 'ideo-1', life_id: DEFAULT_LIFE_ID, title: '实用理性主义', body_md: '实践是检验真理的唯一标准，以最小成本求证闭环，摒弃教条主义。', icon: undefined, sort_order: 0, archived_at: null, created_at: now, updated_at: now },
    { id: 'ideo-2', life_id: DEFAULT_LIFE_ID, title: '极端长期主义', body_md: '放弃短期虚荣指标，在深水区积累核心壁垒，信任复利的力量。', icon: undefined, sort_order: 1, archived_at: null, created_at: now, updated_at: now },
  ],
  events: [],
  essays: [],
  subFoci: [],
  staffMembers: [],
  staffMeetings: [],
  leaders: {},
  situations: {},
  philosophies: {},
  stability: {
    [DEFAULT_LIFE_ID]: { current: 75, history: [] },
  },
  snapshots: [],
};

function createDefaultStaffMembers(lifeId: string, timestamp: string): StaffMember[] {
  return [
    {
      id: `staff-${lifeId}-1`,
      life_id: lifeId,
      name: '战略参谋长',
      role: '首席长期战略顾问',
      prompt: '从宏观战略、路线演进与终局思维出发，推演各项重大国策的长远得失与可行节奏。',
      enabled: true,
      sort_order: 0,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: `staff-${lifeId}-2`,
      life_id: lifeId,
      name: '财政与资源总监',
      role: '财务与精力分配顾问',
      prompt: '关注时间、精力与财务资本的分配效率，严格计算投入产出比。',
      enabled: true,
      sort_order: 1,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: `staff-${lifeId}-3`,
      life_id: lifeId,
      name: '身心体魄总管',
      role: '精力管理与健康顾问',
      prompt: '关注最高统帅的精力槽、睡眠与精神状态，在面临高压决策时警惕身心耗竭。',
      enabled: true,
      sort_order: 2,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: `staff-${lifeId}-4`,
      life_id: lifeId,
      name: '批判反对者',
      role: '战略挑刺官与盲区副官',
      prompt: '专门寻找计划中的逻辑漏洞、未预料的意外风险与自我欺骗。',
      enabled: true,
      sort_order: 3,
      created_at: timestamp,
      updated_at: timestamp,
    },
    {
      id: `staff-${lifeId}-5`,
      life_id: lifeId,
      name: '哲学与意识形态宗师',
      role: '底层价值观与定力导师',
      prompt: '从核心人生哲学与伦理信念出发，评估行动是否背离初心。',
      enabled: true,
      sort_order: 4,
      created_at: timestamp,
      updated_at: timestamp,
    },
  ];
}

export function mockHandler<T>(cmd: string, args?: Record<string, unknown>): T {
  const currentTimestamp = new Date().toISOString();

  // ==================== LIFE ====================
  if (cmd === 'list_lives') {
    return mockData.lives as T;
  }

  if (cmd === 'create_life') {
    const lifeId = `life-${Date.now()}`;
    const name = (args?.name as string) || '新人生';
    const newLife: Life = {
      id: lifeId,
      name,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };
    mockData.lives.push(newLife);

    // 同步初始化单例领域对象，与 Rust Repository::create_life 保持严格一致
    mockData.leaders[lifeId] = {
      id: `leader-${lifeId}`,
      life_id: lifeId,
      name: '最高统帅',
      portrait_attachment_id: undefined,
      body_md: '自述你的战略思维模式与特质。',
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };

    mockData.situations[lifeId] = {
      id: `situation-${lifeId}`,
      life_id: lifeId,
      body_md: '记录你当下的整体境况、战略要务与外在挑战。',
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };

    mockData.philosophies[lifeId] = {
      id: `philosophy-${lifeId}`,
      life_id: lifeId,
      body_md: '# 核心原则与底层哲学\n\n在此记录长期奉行的价值观与根本决策基石。',
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };

    mockData.stability[lifeId] = {
      current: null,
      history: [],
    };

    // 默认注入五大战略参谋
    const defaultStaff = createDefaultStaffMembers(lifeId, currentTimestamp);
    mockData.staffMembers.push(...defaultStaff);

    return newLife as T;
  }

  if (cmd === 'rename_life') {
    const lifeId = args?.lifeId as string;
    const name = args?.name as string;
    const life = mockData.lives.find((l) => l.id === lifeId);
    if (!life) {
      throw new Error('人生世界不存在');
    }
    life.name = name;
    life.updated_at = currentTimestamp;
    return undefined as unknown as T;
  }

  if (cmd === 'delete_life') {
    const lifeId = args?.lifeId as string;
    const lifeIdx = mockData.lives.findIndex((l) => l.id === lifeId);
    if (lifeIdx === -1) {
      throw new Error('人生世界不存在');
    }
    // 级联清理所有归属于该 lifeId 的数据
    mockData.lives.splice(lifeIdx, 1);
    mockData.foci = mockData.foci.filter((f) => f.life_id !== lifeId);
    mockData.relations = mockData.relations.filter((r) => r.life_id !== lifeId);
    mockData.focusHistory = mockData.focusHistory.filter((h) => h.life_id !== lifeId);
    mockData.traits = mockData.traits.filter((t) => t.life_id !== lifeId);
    mockData.traitRelations = mockData.traitRelations.filter((r) => r.life_id !== lifeId);
    mockData.spirits = mockData.spirits.filter((s) => s.life_id !== lifeId);
    mockData.ideologies = mockData.ideologies.filter((i) => i.life_id !== lifeId);
    mockData.events = mockData.events.filter((e) => e.life_id !== lifeId);
    mockData.essays = mockData.essays.filter((e) => e.life_id !== lifeId);
    mockData.subFoci = mockData.subFoci.filter((s) => s.life_id !== lifeId);
    mockData.staffMembers = mockData.staffMembers.filter((m) => m.life_id !== lifeId);
    mockData.staffMeetings = mockData.staffMeetings.filter((m) => m.life_id !== lifeId);
    mockData.snapshots = mockData.snapshots.filter((s) => s.life_id !== lifeId);
    delete mockData.leaders[lifeId];
    delete mockData.situations[lifeId];
    delete mockData.philosophies[lifeId];
    delete mockData.stability[lifeId];
    return undefined as unknown as T;
  }

  if (cmd === 'get_world_overview') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0]?.id;
    const life = mockData.lives.find((l) => l.id === lifeId);
    if (!life) {
      return null as unknown as T;
    }
    const stab = mockData.stability[lifeId]?.current ?? null;
    const leader = mockData.leaders[lifeId] || {
      id: `leader-${lifeId}`,
      life_id: lifeId,
      name: '最高统帅',
      body_md: '自述你的战略思维模式与特质。',
      portrait_attachment_id: undefined,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };
    const situation = mockData.situations[lifeId] || {
      id: `situation-${lifeId}`,
      life_id: lifeId,
      body_md: '当前面临多项核心发展机遇。',
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };
    const philosophy = mockData.philosophies[lifeId] || {
      id: `philosophy-${lifeId}`,
      life_id: lifeId,
      body_md: '# 底层哲学\n坚定战略定力。',
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };
    const lifeTraits = mockData.traits.filter((t) => t.life_id === lifeId);
    const lifeRels = mockData.traitRelations.filter((r) => r.life_id === lifeId);

    const overview: WorldOverview = {
      life,
      leader,
      situation,
      philosophy,
      stability: { life_id: lifeId, current_value: stab, updated_at: currentTimestamp },
      traits: resolveActiveEquippedTraits(lifeTraits, lifeRels),
      ideologies: mockData.ideologies.filter((i) => i.life_id === lifeId && !i.archived_at),
      national_spirits: mockData.spirits.filter((s) => s.life_id === lifeId && !s.archived_at),
      active_foci: mockData.foci.filter((f) => f.life_id === lifeId && f.status === 'active'),
      recent_events: mockData.events.filter((e) => e.life_id === lifeId).slice(0, 5),
    };
    return overview as T;
  }

  // ==================== STABILITY ====================
  if (cmd === 'get_stability') {
    const lifeId = (args?.lifeId as string) || DEFAULT_LIFE_ID;
    return {
      life_id: lifeId,
      current_value: mockData.stability[lifeId]?.current ?? null,
      updated_at: currentTimestamp,
    } as T;
  }

  if (cmd === 'set_stability') {
    const lifeId = (args?.lifeId as string) || DEFAULT_LIFE_ID;
    const val = args?.newValue as number;
    if (!mockData.stability[lifeId]) {
      mockData.stability[lifeId] = { current: null, history: [] };
    }
    const prev = mockData.stability[lifeId].current;
    mockData.stability[lifeId].current = val;
    const change: StabilityChange = {
      id: `sc-${Date.now()}`,
      life_id: lifeId,
      before_value: prev,
      after_value: val,
      delta: prev !== null ? val - prev : null,
      occurred_at: currentTimestamp,
      recorded_at: currentTimestamp,
      reason: args?.reason as string | undefined,
      source_type: args?.sourceType as string | undefined,
      source_id: args?.sourceId as string | undefined,
    };
    mockData.stability[lifeId].history.unshift(change);
    return change as T;
  }

  if (cmd === 'get_stability_history') {
    const lifeId = (args?.lifeId as string) || DEFAULT_LIFE_ID;
    const limit = (args?.limit as number) || 50;
    const history = mockData.stability[lifeId]?.history || [];
    return history.slice(0, limit) as T;
  }

  // ==================== FOCUS ====================
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
      icon: args?.icon as string | undefined,
      image_attachment_id: args?.imageAttachmentId as string | undefined,
      status: (args?.status as FocusStatus) || 'active',
      position_x: (args?.positionX as number) || 0,
      position_y: (args?.positionY as number) || 0,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
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
      f.updated_at = currentTimestamp;
    }
    return undefined as unknown as T;
  }

  if (cmd === 'update_focus_status') {
    const focusId = args?.focusId as string;
    const newStatus = args?.newStatus as FocusStatus;
    const f = mockData.foci.find((item) => item.id === focusId);
    if (f) {
      const oldStatus = f.status;
      f.status = newStatus;
      f.updated_at = currentTimestamp;

      // 记录流转历史
      mockData.focusHistory.unshift({
        id: `fsh-${Date.now()}`,
        life_id: f.life_id,
        focus_id: focusId,
        from_status: oldStatus,
        to_status: newStatus,
        reason: args?.reason as string | undefined,
        source_type: args?.sourceType as string | undefined,
        source_id: args?.sourceId as string | undefined,
        occurred_at: currentTimestamp,
        recorded_at: currentTimestamp,
      });
    }
    return undefined as unknown as T;
  }

  if (cmd === 'update_focus_content') {
    const focusId = args?.focusId as string;
    const f = mockData.foci.find((item) => item.id === focusId);
    if (f) {
      f.title = (args?.title as string) || f.title;
      f.body_md = (args?.bodyMd as string) ?? f.body_md;
      f.icon = args?.icon as string | undefined;
      f.image_attachment_id = args?.imageAttachmentId as string | undefined;
      f.updated_at = currentTimestamp;
    }
    return undefined as unknown as T;
  }

  if (cmd === 'delete_focus') {
    const focusId = args?.focusId as string;
    mockData.foci = mockData.foci.filter((item) => item.id !== focusId);
    mockData.relations = mockData.relations.filter(
      (r) => r.source_focus_id !== focusId && r.target_focus_id !== focusId
    );
    mockData.subFoci = mockData.subFoci.filter((s) => s.focus_id !== focusId);
    return undefined as unknown as T;
  }

  if (cmd === 'add_focus_relation') {
    const rel: FocusRelation = {
      id: `rel-${Date.now()}`,
      life_id: args?.lifeId as string,
      source_focus_id: args?.sourceId as string,
      target_focus_id: args?.targetId as string,
      relation_type: (args?.relationType as 'prerequisite' | 'mutually_exclusive') || 'prerequisite',
      note: args?.note as string | undefined,
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
    const lifeId = args?.lifeId as string;
    const focusId = args?.focusId as string | undefined;
    return mockData.focusHistory.filter(
      (h) => h.life_id === lifeId && (!focusId || h.focus_id === focusId)
    ) as T;
  }

  // ==================== WORLD OBJECTS ====================
  if (cmd === 'get_leader') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0]?.id;
    if (!mockData.leaders[lifeId]) {
      mockData.leaders[lifeId] = {
        id: `leader-${lifeId}`,
        life_id: lifeId,
        name: '最高统帅',
        body_md: '自述你的战略思维模式与特质。',
        portrait_attachment_id: undefined,
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
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
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      };
    } else {
      mockData.leaders[lifeId].name = (args?.name as string) || mockData.leaders[lifeId].name;
      mockData.leaders[lifeId].body_md = (args?.bodyMd as string) ?? mockData.leaders[lifeId].body_md;
      mockData.leaders[lifeId].portrait_attachment_id = args?.portraitAttachmentId as string | undefined;
      mockData.leaders[lifeId].updated_at = currentTimestamp;
    }
    return undefined as unknown as T;
  }

  if (cmd === 'get_situation') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0]?.id;
    if (!mockData.situations[lifeId]) {
      mockData.situations[lifeId] = {
        id: `situation-${lifeId}`,
        life_id: lifeId,
        body_md: '记录你当下的整体境况、战略要务与外在挑战。',
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      };
    }
    return mockData.situations[lifeId] as T;
  }

  if (cmd === 'update_situation') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0]?.id;
    if (!mockData.situations[lifeId]) {
      mockData.situations[lifeId] = {
        id: `situation-${lifeId}`,
        life_id: lifeId,
        body_md: (args?.bodyMd as string) || '',
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      };
    } else {
      mockData.situations[lifeId].body_md = (args?.bodyMd as string) ?? mockData.situations[lifeId].body_md;
      mockData.situations[lifeId].updated_at = currentTimestamp;
    }
    return undefined as unknown as T;
  }

  if (cmd === 'get_philosophy') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0]?.id;
    if (!mockData.philosophies[lifeId]) {
      mockData.philosophies[lifeId] = {
        id: `philosophy-${lifeId}`,
        life_id: lifeId,
        body_md: '# 核心原则与底层哲学\n\n在此记录长期奉行的价值观与根本决策基石。',
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      };
    }
    return mockData.philosophies[lifeId] as T;
  }

  if (cmd === 'update_philosophy') {
    const lifeId = (args?.lifeId as string) || mockData.lives[0]?.id;
    if (!mockData.philosophies[lifeId]) {
      mockData.philosophies[lifeId] = {
        id: `philosophy-${lifeId}`,
        life_id: lifeId,
        body_md: (args?.bodyMd as string) || '',
        created_at: currentTimestamp,
        updated_at: currentTimestamp,
      };
    } else {
      mockData.philosophies[lifeId].body_md = (args?.bodyMd as string) ?? mockData.philosophies[lifeId].body_md;
      mockData.philosophies[lifeId].updated_at = currentTimestamp;
    }
    return undefined as unknown as T;
  }

  // ==================== TRAITS ====================
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
      equip_state: 'unequipped',
      archived_at: null,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };
    mockData.traits.push(t);
    return t as T;
  }

  if (cmd === 'archive_trait') {
    const trait = mockData.traits.find((t) => t.id === args?.traitId);
    if (trait) {
      trait.archived_at = (args?.archive as boolean) ? currentTimestamp : null;
    }
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
      trait.updated_at = currentTimestamp;
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
        t.equip_state = t.id === activeId ? 'active' : 'unequipped';
        t.updated_at = currentTimestamp;
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
          t.equip_state = 'benched';
        } else {
          t.equip_state = t.id === targetActiveId ? 'active' : 'unequipped';
        }
        t.updated_at = currentTimestamp;
      }
    }
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
      occurred_at: currentTimestamp,
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

  // ==================== IDEOLOGIES & SPIRITS ====================
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
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
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
      ideo.updated_at = currentTimestamp;
      return ideo as T;
    }
    throw new Error('Ideology not found');
  }

  if (cmd === 'archive_ideology') {
    const ideo = mockData.ideologies.find((i) => i.id === args?.ideologyId);
    if (ideo) ideo.archived_at = (args?.archive as boolean) ? currentTimestamp : null;
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
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
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
      spirit.updated_at = currentTimestamp;
      return spirit as T;
    }
    throw new Error('National spirit not found');
  }

  if (cmd === 'archive_national_spirit') {
    const spirit = mockData.spirits.find((s) => s.id === args?.spiritId);
    if (spirit) spirit.archived_at = (args?.archive as boolean) ? currentTimestamp : null;
    return undefined as unknown as T;
  }

  if (cmd === 'delete_national_spirit') {
    mockData.spirits = mockData.spirits.filter((s) => s.id !== args?.id);
    return undefined as unknown as T;
  }

  // ==================== EVENTS & ESSAYS ====================
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
      occurred_on: (args?.occurredOn as string) || currentTimestamp.split('T')[0],
      quote: args?.quote as string | undefined,
      image_attachment_id: args?.imageAttachmentId as string | undefined,
      snapshot_id: args?.snapshotId as string | undefined,
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };
    mockData.events.unshift(ev);
    return ev as T;
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
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
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
      essay.updated_at = currentTimestamp;
      return essay as T;
    }
    throw new Error('Essay not found');
  }

  if (cmd === 'delete_essay') {
    const id = args?.id as string;
    mockData.essays = mockData.essays.filter((e) => e.id !== id);
    return undefined as unknown as T;
  }

  // ==================== ARCHIVE FEED & SNAPSHOTS ====================
  if (cmd === 'get_archive_feed') {
    const lifeId = args?.lifeId as string;
    const filterType = args?.filterType as string | undefined;
    const feed: ArchiveItem[] = [];

    // 1. 大事记 (normal & super)
    if (!filterType || filterType === 'event' || filterType === 'super_event') {
      for (const ev of mockData.events) {
        if (ev.life_id === lifeId) {
          const isSuper = ev.kind === 'super';
          if (!filterType || (filterType === 'super_event' && isSuper) || (filterType === 'event' && !isSuper)) {
            feed.push({
              id: ev.id,
              source_id: ev.id,
              item_type: isSuper ? 'super_event' : 'event',
              title: ev.title,
              summary: isSuper ? ev.quote || ev.body_md : ev.body_md,
              occurred_at: ev.occurred_on,
              extra_badge: isSuper ? '超级事件' : '大事记',
            });
          }
        }
      }
    }

    // 2. 世界快照
    if (!filterType || filterType === 'snapshot') {
      for (const snap of mockData.snapshots) {
        if (snap.life_id === lifeId) {
          feed.push({
            id: snap.id,
            source_id: snap.id,
            item_type: 'snapshot',
            title: `世界快照: ${snap.name}`,
            summary: snap.description || '',
            occurred_at: snap.created_at,
            extra_badge: '存档',
          });
        }
      }
    }

    // 3. 随笔
    if (!filterType || filterType === 'essay') {
      for (const essay of mockData.essays) {
        if (essay.life_id === lifeId) {
          feed.push({
            id: essay.id,
            source_id: essay.id,
            item_type: 'essay',
            title: `随笔: ${essay.title}`,
            summary: essay.body_md,
            occurred_at: essay.updated_at || currentTimestamp,
            extra_badge: '随笔',
          });
        }
      }
    }

    // 4. 国策流转历史
    if (!filterType || filterType === 'focus_history') {
      for (const h of mockData.focusHistory) {
        if (h.life_id === lifeId) {
          const focus = mockData.foci.find((f) => f.id === h.focus_id);
          const title = focus ? focus.title : '未知国策';
          const statusZh =
            h.to_status === 'active'
              ? '开始进行'
              : h.to_status === 'completed'
              ? '宣布完成'
              : h.to_status === 'paused'
              ? '暂时搁置'
              : h.to_status === 'revoked'
              ? '正式撤销'
              : '状态变更';
          feed.push({
            id: h.id,
            source_id: h.focus_id,
            item_type: 'focus_history',
            title: `国策 [${title}] ${statusZh}`,
            summary: h.reason || '',
            occurred_at: h.occurred_at,
            extra_badge: '国策动向',
          });
        }
      }
    }

    // 5. 参谋会议纪要
    if (!filterType || filterType === 'meeting') {
      for (const meet of mockData.staffMeetings) {
        if (meet.life_id === lifeId) {
          feed.push({
            id: meet.id,
            source_id: meet.id,
            item_type: 'meeting',
            title: `参谋部会议：${meet.topic}`,
            summary: meet.confirmed_minutes_md || '',
            occurred_at: meet.created_at || currentTimestamp,
            extra_badge: '参谋纪要',
          });
        }
      }
    }

    // 按时间倒序排序
    feed.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
    return feed as T;
  }

  if (cmd === 'create_world_snapshot') {
    const snap: WorldSnapshot = {
      id: `snap-${Date.now()}`,
      life_id: args?.lifeId as string,
      name: args?.name as string,
      description: args?.description as string | undefined,
      snapshot_schema_version: 1,
      payload_json: args?.payloadJson as string,
      created_at: currentTimestamp,
    };
    mockData.snapshots.unshift(snap);
    return snap as T;
  }

  if (cmd === 'list_world_snapshots') {
    const lifeId = args?.lifeId as string;
    return mockData.snapshots.filter((s) => s.life_id === lifeId) as T;
  }

  if (cmd === 'delete_world_snapshot') {
    const snapshotId = args?.snapshotId as string;
    mockData.snapshots = mockData.snapshots.filter((s) => s.id !== snapshotId);
    return undefined as unknown as T;
  }

  // ==================== SUB-FOCUS ====================
  if (cmd === 'get_sub_foci' || cmd === 'list_all_sub_foci') {
    const focusId = args?.focusId as string | undefined;
    const lifeId = args?.lifeId as string | undefined;
    if (focusId) {
      return mockData.subFoci.filter((s) => s.focus_id === focusId) as T;
    }
    if (lifeId) {
      return mockData.subFoci.filter((s) => s.life_id === lifeId) as T;
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
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };
    mockData.subFoci.push(sub);
    return sub as T;
  }

  if (cmd === 'update_sub_focus_status') {
    const sub = mockData.subFoci.find((s) => s.id === args?.subId);
    if (sub) {
      sub.status = args?.status as any;
      sub.updated_at = currentTimestamp;
    }
    return undefined as unknown as T;
  }

  if (cmd === 'delete_sub_focus') {
    mockData.subFoci = mockData.subFoci.filter((s) => s.id !== args?.subId);
    return undefined as unknown as T;
  }

  // ==================== STAFF & CABINET ====================
  if (cmd === 'get_staff_members') {
    const lifeId = (args?.lifeId as string) || DEFAULT_LIFE_ID;
    const existing = mockData.staffMembers.filter((m) => m.life_id === lifeId);
    if (existing.length === 0) {
      const defaultStaff = createDefaultStaffMembers(lifeId, currentTimestamp);
      mockData.staffMembers.push(...defaultStaff);
      return defaultStaff as T;
    }
    return existing as T;
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
      created_at: currentTimestamp,
      updated_at: currentTimestamp,
    };
    mockData.staffMembers.push(mem);
    return mem as T;
  }

  if (cmd === 'update_staff_member') {
    const mem = mockData.staffMembers.find((m) => m.id === args?.memberId);
    if (mem) {
      mem.name = (args?.name as string) || mem.name;
      mem.role = (args?.role as string) || mem.role;
      mem.prompt = (args?.prompt as string) || mem.prompt;
      mem.enabled = Boolean(args?.enabled);
      mem.updated_at = currentTimestamp;
    }
    return undefined as unknown as T;
  }

  if (cmd === 'delete_staff_member') {
    mockData.staffMembers = mockData.staffMembers.filter((m) => m.id !== args?.memberId);
    return undefined as unknown as T;
  }

  if (cmd === 'get_staff_meetings') {
    const lifeId = (args?.lifeId as string) || DEFAULT_LIFE_ID;
    return mockData.staffMeetings.filter((m) => m.life_id === lifeId) as T;
  }

  if (cmd === 'create_staff_meeting') {
    const meeting: StaffMeeting = {
      id: `meet-${Date.now()}`,
      life_id: args?.lifeId as string,
      topic: args?.topic as string,
      confirmed_minutes_md: args?.confirmedMinutesMd as string,
      context_module_names: args?.contextModuleNames as string,
      rounds: args?.rounds as number,
      status: 'completed',
      created_at: currentTimestamp,
    };
    mockData.staffMeetings.push(meeting);
    return meeting as T;
  }

  // ==================== EXPORT DATA ====================
  if (cmd === 'export_life_markdown') {
    const lifeId = (args?.lifeId as string) || DEFAULT_LIFE_ID;
    const life = mockData.lives.find((l) => l.id === lifeId);
    const lifeName = life ? life.name : '人生世界';
    const stab = mockData.stability[lifeId]?.current ?? null;
    let md = `# 人生战略档案：${lifeName}\n\n`;
    md += `- 导出时间：${currentTimestamp}\n`;
    md += `- 当前战略稳定度：${stab}\n\n`;
    const leader = mockData.leaders[lifeId];
    if (leader) {
      md += `## 最高统帅：${leader.name}\n\n${leader.body_md}\n\n`;
    }
    const situation = mockData.situations[lifeId];
    if (situation) {
      md += `## 当前战略局势\n\n${situation.body_md}\n\n`;
    }
    const philosophy = mockData.philosophies[lifeId];
    if (philosophy) {
      md += `## 根本人生哲学\n\n${philosophy.body_md}\n\n`;
    }
    md += '## 正在进行的重点国策\n\n';
    const activeFoci = mockData.foci.filter((f) => f.life_id === lifeId && f.status === 'active');
    for (const f of activeFoci) {
      md += `### 国策：${f.title}\n\n${f.body_md}\n\n`;
    }
    return md as unknown as T;
  }

  if (cmd === 'export_life_json') {
    const lifeId = (args?.lifeId as string) || DEFAULT_LIFE_ID;
    const exportData = {
      version: 2,
      exported_at: currentTimestamp,
      life_id: lifeId,
      all_foci: mockData.foci.filter((f) => f.life_id === lifeId),
      focus_relations: mockData.relations.filter((r) => r.life_id === lifeId),
      all_traits: mockData.traits.filter((t) => t.life_id === lifeId),
      trait_relations: mockData.traitRelations.filter((r) => r.life_id === lifeId),
      essays: mockData.essays.filter((e) => e.life_id === lifeId),
      events: mockData.events.filter((e) => e.life_id === lifeId),
      sub_foci: mockData.subFoci.filter((s) => s.life_id === lifeId),
      staff_members: mockData.staffMembers.filter((m) => m.life_id === lifeId),
      staff_meetings: mockData.staffMeetings.filter((m) => m.life_id === lifeId),
    };
    return JSON.stringify(exportData, null, 2) as unknown as T;
  }

  return [] as unknown as T;
}
