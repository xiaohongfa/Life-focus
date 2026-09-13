import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../api/client';
import type {
  Focus,
  Trait,
  StaffMember,
  FocusStatus,
} from '../api/types';
import { promptStore } from './promptStore';

export interface LLMConfig {
  provider: 'deepseek' | 'openai' | 'gemini' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface LlmConfigView {
  provider: 'deepseek' | 'openai' | 'gemini' | 'custom';
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  maskedKey?: string | null;
}

export interface StrategyContext {
  lifeId?: string;
  lifeName?: string;
  leaderName?: string;
  leaderBody?: string;
  situation?: string;
  philosophy?: string;
  stability?: number | null;
  traits?: Trait[];
  activeFoci?: Focus[];
}

export interface AIProposalItem {
  id: string;
  direction: string;
  title: string;
  bodyMd: string;
  status: FocusStatus;
  relationType: 'prerequisite' | 'mutually_exclusive';
}

const STORAGE_KEY = 'life_strategy_llm_config';

function normalizeConfigView(raw: any): LlmConfigView {
  return {
    provider: (raw?.provider || 'deepseek') as any,
    baseUrl: raw?.baseUrl || raw?.base_url || 'https://api.deepseek.com',
    model: raw?.model || 'deepseek-chat',
    hasApiKey: Boolean(raw?.hasApiKey ?? raw?.has_api_key ?? false),
    maskedKey: raw?.maskedKey ?? raw?.masked_key ?? null,
  };
}

let cachedConfigView: LlmConfigView = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  model: 'deepseek-chat',
  hasApiKey: false,
  maskedKey: null,
};

export function getLLMConfig(): LLMConfig {
  const defaults: LLMConfig = {
    provider: cachedConfigView.provider,
    baseUrl: cachedConfigView.baseUrl,
    apiKey: '',
    model: cachedConfigView.model,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error('Failed to parse LLM config from localStorage', e);
  }
  return defaults;
}

export async function fetchLLMConfigView(): Promise<LlmConfigView> {
  if (isTauri) {
    try {
      const raw = await invoke<any>('llm_get_config');
      cachedConfigView = normalizeConfigView(raw);
      return cachedConfigView;
    } catch (e) {
      console.error('Failed to get LLM config:', e);
    }
  }
  return cachedConfigView;
}

export function getCachedLLMConfigView(): LlmConfigView {
  return cachedConfigView;
}

export async function saveLLMConfig(
  provider: string,
  baseUrl: string,
  model: string,
  apiKey?: string | null
): Promise<LlmConfigView> {
  if (isTauri) {
    const raw = await invoke<any>('llm_save_config', {
      provider,
      baseUrl,
      model,
      apiKey: apiKey && apiKey.trim().length > 0 ? apiKey.trim() : null,
    });
    cachedConfigView = normalizeConfigView(raw);
    return cachedConfigView;
  }
  // Browser preview fallback
  const config = { provider, baseUrl, apiKey: apiKey || '', model };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  cachedConfigView = {
    provider: provider as any,
    baseUrl,
    model,
    hasApiKey: Boolean(apiKey && apiKey.length > 3),
    maskedKey: apiKey ? `****${apiKey.slice(-4)}` : null,
  };
  return cachedConfigView;
}

export async function clearLLMKey(): Promise<LlmConfigView> {
  if (isTauri) {
    const raw = await invoke<any>('llm_clear_key');
    cachedConfigView = normalizeConfigView(raw);
    return cachedConfigView;
  }
  const current = getLLMConfig();
  current.apiKey = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  cachedConfigView.hasApiKey = false;
  cachedConfigView.maskedKey = null;
  return cachedConfigView;
}

export function isLLMConfigured(): boolean {
  if (isTauri) {
    return cachedConfigView.hasApiKey;
  }
  const config = getLLMConfig();
  return Boolean(config.apiKey && config.apiKey.trim().length > 3);
}

// 启动时初始化及单次迁移：将 localStorage 中的明文 API Key 迁入 Rust 安全存储并彻底抹除
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.apiKey && isTauri) {
          const migrated = await invoke<any>('llm_save_config', {
            provider: parsed.provider || 'deepseek',
            baseUrl: parsed.baseUrl || 'https://api.deepseek.com',
            model: parsed.model || 'deepseek-chat',
            apiKey: parsed.apiKey,
          });
          cachedConfigView = normalizeConfigView(migrated);
          delete parsed.apiKey;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          return;
        }
      }
      if (isTauri) {
        await fetchLLMConfigView();
      }
    } catch (e) {
      console.error('LLM config initialization error:', e);
    }
  })();
}

/**
 * 测试大模型 API 连通性 (§12.5)
 */
export async function testLLMConnection(
  customConfig?: Partial<LLMConfig>
): Promise<{ success: boolean; message: string }> {
  if (isTauri) {
    try {
      const reply = await invoke<string>('llm_test_connection', {
        request: {
          provider: customConfig?.provider || cachedConfigView.provider,
          baseUrl: customConfig?.baseUrl || cachedConfigView.baseUrl,
          model: customConfig?.model || cachedConfigView.model,
          apiKey: customConfig?.apiKey && customConfig.apiKey.trim().length > 0 ? customConfig.apiKey.trim() : null,
        },
      });
      return { success: true, message: reply };
    } catch (err: any) {
      return { success: false, message: typeof err === 'string' ? err : (err?.message || String(err)) };
    }
  }

  // Browser Mock / Dev fallback
  const current = getLLMConfig();
  const config = { ...current, ...(customConfig || {}) };
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    return { success: false, message: '请先填入有效的 API 密钥 (API Key)' };
  }

  let endpoint = config.baseUrl.trim();
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = 'https://' + endpoint;
  }
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.slice(0, -1);
  }
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}/chat/completions`;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: '测试最高参谋部中枢连接，请简明回复：战略通信网络连接正常。',
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        message: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }

    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content?.trim() || '通信正常';
    return {
      success: true,
      message: `连通测试成功！响应内容: "${reply}"`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `网络连通异常: ${err.message || String(err)}`,
    };
  }
}

/**
 * 通用 Chat Completion 调用 (通过 Rust 后端安全代理，彻底避免浏览器跨域与密钥泄露)
 */
async function callChatCompletions(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  temperature = 0.7
): Promise<string> {
  if (isTauri) {
    try {
      const reply = await invoke<string>('llm_chat', {
        request: {
          messages,
          temperature,
        },
      });
      return reply;
    } catch (err: any) {
      throw new Error(typeof err === 'string' ? err : (err?.message || String(err)));
    }
  }

  // Browser Mock / Dev fallback
  const config = getLLMConfig();
  if (!config.apiKey) {
    throw new Error('未配置 API 密钥，请在系统设置中填入有效的 API Key');
  }

  let endpoint = config.baseUrl.trim();
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = 'https://' + endpoint;
  }
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.slice(0, -1);
  }
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = `${endpoint}/chat/completions`;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages,
      temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`LLM API 响应错误 [HTTP ${res.status}]: ${errText.slice(0, 300)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM 响应未包含有效文本');
  }
  return content.trim();
}

/**
 * 组装人生上下文为 System Prompt (§12.2)
 */
function buildSystemContextPrompt(
  context: StrategyContext,
  narrativeStyle = '战略史书',
  requireJson = false
): string {
  const stylePromptMap: Record<string, string> = {
    战略史书: '叙事风格要求：严肃深沉的战略史书文笔，如同撰写《资治通鉴》或《罗马帝国衰亡史》，措辞考究，气魄恢宏。',
    冷静客观: '叙事风格要求：极度冷静理性的参谋推演分析，摒弃修饰词，直击利弊边界与核心胜负手。',
    公文严谨: '叙事风格要求：规范、庄重的国家战略公文体例，结构清晰，条理分明，指标量化。',
    史诗恢宏: '叙事风格要求：如荷马史诗或钢铁雄心超事件演出的磅礴史诗语调，充满对命运抗争与时代转折的张力。',
  };

  const styleText = stylePromptMap[narrativeStyle] || stylePromptMap['战略史书'];
  const baseSystemPrompt = promptStore.getPrompt('system_context') || `你是一位人生战略推演与参谋部智囊。你身处于《人生战略游戏》（Life Strategy Game）中。
用户的现实生活被视作一场宏大的地缘政治与战略演进。
严禁使用毫无营养的套话、套皮模板或空洞填充。必须紧密结合统帅特征、客观局势以及用户的具体定制需求，给出真正具有启发性、锋芒和操作深度的战略判断。`;

  const formatRequirement = requireJson
    ? '3. 严格按照指定的 JSON 格式返回，不输出任何多余的 markdown 围栏之外的废话。'
    : '3. 以自然、逼真的人类口吻对话表达，严禁在正文中输出 JSON、键值对（如 {"seat":...}）或代码围栏等技术符号。';

  return `${baseSystemPrompt}

【统帅与世界背景】
- 人生空间：${context.lifeName || '第一人生'}
- 统帅：${context.leaderName || '统帅'}
- 统帅心智特征与人格自述：${context.leaderBody || '注重战略定力，攻坚核心难关'}
- 当前局势简报：${context.situation || '处于关键发展积累期，面临多重外部挑战与机遇'}
- 底层人生哲学：${context.philosophy || '坚定战略定力，以长期主义应对短期波动'}
- 稳定度状态：${context.stability !== null && context.stability !== undefined ? `${context.stability}%` : '未设定'}
- 已确立特质：${context.traits?.map((t) => t.title).join('、') || '暂无特质'}
- 当前正在推进的核心国策：${context.activeFoci?.map((f) => f.title).join('、') || '无'}

【统帅意图与元指令响应原则】
统帅拥有决策与裁量权。
若统帅下达了明确的直接命令、日常问候、功能测试或元指令（如要求“说你好”、“停止扮演/别角色扮演了”、“测试系统”、“简短回复”等），所有参谋席位必须优先遵从统帅指令如实执行！严禁在统帅要求测试或打招呼时强行无视指令或塞入空洞的危机反诘。

【核心要求】
1. ${styleText}
2. 严禁使用毫无营养的套话、套皮模板或空洞填充。必须紧密结合上述统帅特征、客观局势以及用户的具体定制需求，给出真正具有启发性、锋芒和操作深度的战略判断。
${formatRequirement}`;
}

/**
 * 1. AI 尝试生成后续国策节点候选 (§7.4) - 带有用户自定义需求输入
 */
export async function generateNextFocusProposals(
  parentFocus: Focus,
  context: StrategyContext,
  narrativeStyle = '战略史书',
  userRequirement = ''
): Promise<AIProposalItem[]> {
  const requirementSection = userRequirement.trim()
    ? `\n【统帅附加指导需求】：\n"${userRequirement.trim()}"\n请在推演中深度体现上述统帅指导意图！\n`
    : '';

  const prompt = `用户当前选中的基准国策节点是：「${parentFocus.title}」
该国策当前状态：${parentFocus.status}
国策正文说明：${parentFocus.body_md || '无详细说明'}
${requirementSection}
请推演该国策接下来的 3 种不同演化路径候选，分别代表三种截然不同的战略决策取向：
1. 方向一（深化推进）：在该国策取得突破或阶段成果后，顺势扩大战果、纵深推进的核心路线；
2. 方向二（侧翼转向/防守）：面对现实阻力、资源制约或风险时，开辟侧翼替代战场，或设立互斥路线；
3. 方向三（整顿巩固）：暂停单点冒进，进行战略复盘、体质整顿或能量储备的修整路线。

请严格返回如下 JSON 数组格式（不要输出任何额外文字，直接输出可被 JSON.parse 的字符串）：
[
  {
    "direction": "深化推进",
    "title": "简练有力的国策标题",
    "bodyMd": "2-3句话阐述该战略动作的核心意图、攻坚指标与实现路径",
    "status": "active",
    "relationType": "prerequisite"
  },
  {
    "direction": "战略转向",
    "title": "简练有力的国策标题",
    "bodyMd": "2-3句话阐述该战略动作的核心意图、攻坚指标与实现路径",
    "status": "paused",
    "relationType": "mutually_exclusive"
  },
  {
    "direction": "整顿巩固",
    "title": "简练有力的国策标题",
    "bodyMd": "2-3句话阐述该战略动作的核心意图、攻坚指标与实现路径",
    "status": "paused",
    "relationType": "prerequisite"
  }
]`;

  if (isLLMConfigured()) {
    try {
      const systemPrompt = buildSystemContextPrompt(context, narrativeStyle, true);
      const rawRes = await callChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);
      const jsonStr = extractJsonFromResponse(rawRes);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: `ai-prop-${Date.now()}-${idx}`,
          direction: item.direction || '战略延伸',
          title: item.title || `深化：${parentFocus.title} · 下一阶段`,
          bodyMd: item.bodyMd || '',
          status: item.status === 'paused' ? 'paused' : 'active',
          relationType: item.relationType === 'mutually_exclusive' ? 'mutually_exclusive' : 'prerequisite',
        }));
      }
    } catch (err) {
      console.warn('Real LLM API call failed, falling back to smart contextual engine:', err);
    }
  }

  // 动态情境策略推演引擎（结合用户输入与真实上下文）
  return generateDynamicContextualFocusProposals(parentFocus, context, narrativeStyle, userRequirement);
}

/**
 * 2. 启发全新战略主线国策（画布空白处启发）- 带有用户自定义需求
 */
export async function generateInitialFocuses(
  context: StrategyContext,
  narrativeStyle = '战略史书',
  userRequirement = ''
): Promise<AIProposalItem[]> {
  const reqText = userRequirement.trim() ? `\n统帅特定指导想法：${userRequirement.trim()}` : '';
  const prompt = `最高统帅当前正在确立全局战略攻坚新主线。
结合当前局势简报「${context.situation || '基础奠定阶段'}」与人生哲学。${reqText}
请推演 3 个具有统摄全局意义的新国策宏观主线方向。

请严格返回如下 JSON 数组：
[
  {
    "direction": "破局主线",
    "title": "主线标题",
    "bodyMd": "说明战略意图与核心攻坚方向",
    "status": "active",
    "relationType": "prerequisite"
  },
  {
    "direction": "能力支柱",
    "title": "主线标题",
    "bodyMd": "说明战略意图",
    "status": "active",
    "relationType": "prerequisite"
  },
  {
    "direction": "长远防波堤",
    "title": "主线标题",
    "bodyMd": "说明战略意图",
    "status": "paused",
    "relationType": "prerequisite"
  }
]`;

  if (isLLMConfigured()) {
    try {
      const systemPrompt = buildSystemContextPrompt(context, narrativeStyle);
      const rawRes = await callChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);
      const jsonStr = extractJsonFromResponse(rawRes);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          id: `ai-init-${Date.now()}-${idx}`,
          direction: item.direction || '核心战略',
          title: item.title,
          bodyMd: item.bodyMd,
          status: item.status || 'active',
          relationType: 'prerequisite',
        }));
      }
    } catch (err) {
      console.warn('Initial focus LLM generation failed, using fallback:', err);
    }
  }

  const tag = userRequirement.trim() ? `【指向：${userRequirement.slice(0, 10)}】` : '';
  return [
    {
      id: `ai-init-1-${Date.now()}`,
      direction: '破局主攻',
      title: `${tag}核心战役攻坚工程`,
      bodyMd: `结合统帅意图${userRequirement ? `「${userRequirement}」` : ''}与当前局势，集中优势资源打通主要战略瓶颈。`,
      status: 'active',
      relationType: 'prerequisite',
    },
    {
      id: `ai-init-2-${Date.now()}`,
      direction: '侧翼底座',
      title: '精力与认知护城河构建',
      bodyMd: '建立充足的心理弹性与秩序缓冲底座，确保主攻推进时不发生系统性雪崩。',
      status: 'paused',
      relationType: 'prerequisite',
    },
    {
      id: `ai-init-3-${Date.now()}`,
      direction: '远期前瞻',
      title: '第二曲线试验性预研',
      bodyMd: '以轻量化试错探索新兴潜在增长极，在主航道稳固前提下为下一时代储备动能。',
      status: 'paused',
      relationType: 'prerequisite',
    },
  ];
}

/**
 * 3. AI 一键拆解国策为 3-5 步具体执行阶段 (§7) - 带有用户自定义需求
 */
export async function decomposeFocusSubItems(
  focus: Focus,
  context: StrategyContext,
  userRequirement = ''
): Promise<{ title: string; body_md: string }[]> {
  const reqText = userRequirement.trim() ? `\n统帅特殊要求：${userRequirement.trim()}` : '';
  const prompt = `请将国策「${focus.title}」（正文：${focus.body_md || '无'}）${reqText}
细化拆解为 3 至 4 个循序渐进、切实可落地的具体执行阶段步骤。
每个步骤应包含明确的阶段动作名称与验收指标备注。

请严格返回如下 JSON 数组格式：
[
  { "title": "阶段一：xxxx", "body_md": "具体实施要点与衡量准则" },
  { "title": "阶段二：xxxx", "body_md": "具体实施要点与衡量准则" },
  { "title": "阶段三：xxxx", "body_md": "具体实施要点与衡量准则" }
]`;

  if (isLLMConfigured()) {
    try {
      const systemPrompt = buildSystemContextPrompt(context, '公文严谨', true);
      const rawRes = await callChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);
      const jsonStr = extractJsonFromResponse(rawRes);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => ({
          title: String(p.title || '执行步骤'),
          body_md: String(p.body_md || ''),
        }));
      }
    } catch (err) {
      console.warn('Sub-focus decomposition LLM call failed, using dynamic engine:', err);
    }
  }

  const customHint = userRequirement.trim() ? `（针对：${userRequirement.slice(0, 15)}）` : '';
  return [
    {
      title: `阶段一：${focus.title} · 前置调研与准备${customHint}`,
      body_md: '完成资源盘点、核心资料梳理，消除关键认知盲区。',
    },
    {
      title: `阶段二：${focus.title} · 核心攻坚战役`,
      body_md: '全力投入主要精力，完成核心骨架搭建并攻克最难技术/业务点。',
    },
    {
      title: `阶段三：${focus.title} · 成果巩固与复盘沉淀`,
      body_md: '建立长效运行机制，将实践经验凝练为心智特质与沉淀归档。',
    },
  ];
}

/**
 * 4. 文本总结与战略润色 (§6.2, §12.3: 局势、哲学、统帅、随笔) - 带有用户自定义需求
 */
export async function refineText(
  originalText: string,
  taskType: 'situation' | 'philosophy' | 'leader' | 'focus' | 'essay',
  narrativeStyle = '战略史书',
  context: StrategyContext = {},
  userRequirement = ''
): Promise<string> {
  const taskDescriptions: Record<string, string> = {
    situation: '请对统帅录入的当前局势草稿进行战略提炼。理清当前核心态势、主要矛盾、外部制约与下一阶段关键胜负手，使其兼具战略洞见与史书质感。',
    philosophy: '请对统帅的人生哲学与底层行事准则进行升华。提炼出具有金石之声的公理式信条与认知模型，去除泛泛空谈，字字有千钧之力。',
    leader: '请根据统帅的原有人格自述，润色为一份兼具自省锐度与决断魅力的战略领袖画像，提炼其核心决断心智与抗压风格。',
    focus: '请对该国策节点的战略目标进行深化润色。明确战略意图、战役分期与关键里程碑。',
    essay: '请对这篇战略思考随笔进行文学与战略深度的润色提升。',
  };

  const reqSection = userRequirement.trim() ? `\n【统帅特定要求与输入意向】：\n"${userRequirement.trim()}"\n` : '';
  const prompt = `${taskDescriptions[taskType]}
${reqSection}
【原始输入文本】：
${originalText || '（用户尚未录入内容，请基于当前上下文提供一份高水准的奠基性范本）'}

请直接输出润色后的正式 Markdown 正文，不需要多余的问候语或说明。`;

  if (isLLMConfigured()) {
    try {
      const systemPrompt = buildSystemContextPrompt(context, narrativeStyle);
      const res = await callChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);
      return res;
    } catch (err) {
      console.warn('Refine text LLM call failed:', err);
    }
  }

  // 动态润色本地算法
  if (taskType === 'situation') {
    const focusHint = userRequirement.trim() ? `\n> **统帅当前聚焦方向**：${userRequirement.trim()}\n` : '';
    return `### 当前局势战略简报（${narrativeStyle}风格）

${originalText ? `> 原始基调：${originalText}\n\n` : ''}${focusHint}
**一、宏观态势综述**
当前正处于由潜伏蓄力迈向战略攻坚的关键窗口期。外部环境充满波动与不确定性，既有战略赛道上的竞争与资源紧缩，亦孕育着关键结构性突破的新机遇。

**二、主要矛盾与瓶颈约束**
- **精力资本分配**：多项重要国策同时推进，面临认知负荷超载与局部精力稀释风险；
- **确定性建立**：前期基础已完成铺设，但核心胜负手尚需决定性的战役成果予以锁定。

**三、下一阶段胜负手策略**
坚决收缩非核心战线，集中全部战略动能于主导性国策；以严谨的阶段性子指标为抓手，稳扎稳打，构筑深层竞争护城河。`;
  }

  if (taskType === 'philosophy') {
    const focusHint = userRequirement.trim() ? `\n> **核心心愿**：${userRequirement.trim()}\n` : '';
    return `## 人生战略公理底座

${originalText ? `> 根本源流：${originalText}\n\n` : ''}${focusHint}
### 公理一：战略定力超越短期波动
大风大浪之中，噪音四起。真正的战略家不为任何局部风吹草动转移重心。唯有深扎根基，方能在时代巨浪拍打之时直抵彼岸。

### 公理二：凡事皆有对价，向死而生
每一个重大飞跃必然伴随艰难的断舍离。承认资源的有限性，把最高阶的精力注入具有复利价值的战略支点。

### 公理三：知行合一，实事求是
不搞自我欺骗，不沉迷于虚妄预测。在最坚硬的现实土壤中磨砺心智特质，在持续复盘中逼近客观规律。`;
  }

  if (taskType === 'leader') {
    return `### 最高统帅战略画像

${originalText ? `> 统帅自述：${originalText}\n\n` : ''}
**核心决断风格**：审慎定力与临机决断并重。善于在迷雾重重的混沌格局中保持战略定力，抗压耐受度极高。视逆境为意志试金石，以终局思维排定行事优先序。`;
  }

  if (taskType === 'essay') {
    const focusHint = userRequirement.trim() ? `\n> **随笔主旨与统帅关注**：${userRequirement.trim()}\n` : '';
    return `### 战略随笔：深度复盘与远期推演

${focusHint}${originalText || '录入您的战略随笔构想...'}

---
*参谋部评注：立论深远，理路明晰，兼具长效战略定力与深刻反思敏锐度。*`;
  }

  return `### 深度战略提炼\n\n${originalText}\n\n*战略建议：紧扣核心意图，设立不可动摇之分段里程碑。*`;
}

/**
 * 5. 内阁多参谋真实模拟辩论与共识纪要 (§12.4)
 */
export interface CabinetDebateResult {
  logs: { speaker: string; round: number; content: string }[];
  minutes: string;
  usedRealLLM: boolean;
  error?: string;
}

export async function simulateCabinetDebate(
  topic: string,
  members: StaffMember[],
  context: StrategyContext,
  rounds = 2,
  userRequirement = ''
): Promise<CabinetDebateResult> {
  const reqSection = userRequirement.trim() ? `\n【统帅特别批示/限制条件】：${userRequirement.trim()}` : '';

  let apiError: string | undefined;

  if (isLLMConfigured()) {
    try {
      const logs: { speaker: string; round: number; content: string }[] = [];
      const historySummary: string[] = [];

      // 逐轮发言，按顺序让每位参谋发言
      for (let r = 1; r <= rounds; r++) {
        for (const member of members) {
          const priorContext =
            historySummary.length > 0
              ? `【此前其他参谋的发言要点】：\n${historySummary.join('\n')}`
              : '【这是研讨会第一轮发言，请开宗明义阐明你的专业立场】';

          const prompt = `你是参谋席位：【${member.name}】（角色职责：${member.role}）
你的特定人设与考量维度：
"""
${member.prompt}
"""

统帅当前提交的合议议题：【${topic}】
${reqSection}
当前轮次：第 ${r} 轮发言（共 ${rounds} 轮）
${priorContext}

【发言质量与人设规范】：
1. 保持独立深刻的专业意志与锋芒，严禁机械套用公式或复读“收到统帅特别指令/向最高统帅问好”等机械套话；
2. 若有统帅特别关注，应将其自然融入战略研判与得失权衡中，而非生硬摘抄字句；
3. 开门见山直奔核心研判与各席位间观点的实质交锋，直接输出 100~200 字具有专业份量的发言正文。`;

          const response = await callChatCompletions([
            { role: 'system', content: buildSystemContextPrompt(context, '冷静客观', false) },
            { role: 'user', content: prompt },
          ], 0.8);

          const cleanedResponse = sanitizeChatMessage(response);

          logs.push({
            speaker: member.name,
            round: r,
            content: cleanedResponse,
          });
          historySummary.push(`【${member.name}】(第${r}轮): ${cleanedResponse.slice(0, 120)}...`);
        }
      }

      // 生成结构化共识纪要
      const minutesPrompt = `总参谋部已就议题【${topic}】完成了 ${rounds} 轮深入辩论。
${reqSection}
全部参谋发言实录如下：
${logs.map((l) => `【${l.speaker}】(第${l.round}轮): ${l.content}`).join('\n\n')}

请作为总参谋长，起草最终的结构化《总参谋部会议纪要》，包含：
1. 核心战略共识（大家一致认同的原则与方向）
2. 主要分歧与辩论交锋（各席位冲突点及化解方案）
3. 最高统帅裁定建议（立即可执行的下一步具体动作）

请使用精炼庄重的 Markdown 格式输出纪要全文。`;

      const minutes = await callChatCompletions([
        { role: 'system', content: buildSystemContextPrompt(context, '公文严谨', false) },
        { role: 'user', content: minutesPrompt },
      ], 0.5);

      return { logs, minutes, usedRealLLM: true };
    } catch (err: any) {
      console.warn('Real LLM cabinet debate failed, using dynamic strategy engine:', err);
      apiError = err.message || String(err);
    }
  }

  // 动态情境参谋部生成 (启发式拟真引擎 - 拒绝机械套话与过度遵从)
  const isGreetingOrTest = /你好|hello|hi|测试|test|打招呼|问好|别角色扮演|不要扮演|停止扮演/i.test(userRequirement);
  const trimmedReq = userRequirement.trim();

  const logs: { speaker: string; round: number; content: string }[] = [];
  for (let r = 1; r <= rounds; r++) {
    for (const m of members) {
      let content = '';
      const isStrat = m.name.includes('战略') || m.role.includes('战略');
      const isFin = m.name.includes('财政') || m.role.includes('财务') || m.role.includes('资源');
      const isHealth = m.name.includes('身心') || m.role.includes('健康') || m.role.includes('体魄');
      const isCritic = m.name.includes('批判') || m.role.includes('反对') || m.role.includes('挑刺');

      if (isStrat) {
        if (r === 1) {
          if (isGreetingOrTest) {
            content = `报告统帅！战略参谋通信链路畅通无阻，随时听候调遣。统帅好！`;
          } else if (trimmedReq) {
            content = `审视议题【${topic}】：在统帅提出的实施导向下，核心在于掌握推进节奏与里程碑节点，确保主攻方向清晰，不因短期外部扰动而动摇战略定力。`;
          } else {
            content = `针对议题【${topic}】，从终局战略推演：必须明确核心胜负手。若推进节奏过急，极易导致战略重心失焦；建议划定不可逾越的红线指标，优先保障核心战略稳固。`;
          }
        } else {
          content = `回应各顾问席位：无论推进面临何种资源或精力限制，关键在于分阶段拆解战役、建立不可逆的阶梯优势，不能因畏惧阵痛而错失不可再得的时间窗口！`;
        }
      } else if (isFin) {
        if (r === 1) {
          if (isGreetingOrTest) {
            content = `报告统帅！财政与资源核算通道通畅。收到测试命令，随时配合统帅进行各项功能验证。统帅好！`;
          } else if (trimmedReq) {
            content = `从现实成本视角评估【${topic}】：推进过程必须设定严格的投入上限与损益评估，将沉没成本严格控制在安全阈值之内。`;
          } else {
            content = `从资本与精力储量审查：任何战略动作都需要现实弹药。当前资源消耗率偏高，在没有取得确凿正向回报前，坚决反对无节制扩大战线。`;
          }
        } else {
          content = `针对战略参谋长的推进提议：即使要全力推进【${topic}】，也必须设立硬性熔断机制！若在两周内关键产出未能达标，必须强制削减 30% 资源投入。`;
        }
      } else if (isHealth) {
        if (r === 1) {
          if (isGreetingOrTest) {
            content = `报告统帅！身心监测与神经反馈信道正常。收到测试指令，随时待命。最高统帅好！`;
          } else if (trimmedReq) {
            content = `结合统帅考量，从身心可持续性切入【${topic}】：必须强制设置恢复期与认知缓冲带，严防超负荷推进引发深层焦虑与战略误判。`;
          } else {
            content = `统帅的身心底座不可透支！连续高压推进将触发不可逆的认知疲劳，造成深层战略误判。必须强制设置恢复期与缓冲带。`;
          }
        } else {
          content = `附议财政席位的熔断倡议。推进议题【${topic}】过程中，必须将体能恢复、深层睡眠与作息规律列为不可妥协的硬性底线指标。`;
        }
      } else if (isCritic) {
        if (r === 1) {
          if (isGreetingOrTest) {
            content = `报告统帅！红队质疑席位通信正常，坚决遵从统帅测试命令。统帅好！`;
          } else if (trimmedReq) {
            content = `我必须尖锐地提问：相关限定是否反而束缚了我们在【${topic}】中的机动空间？切不可因为设限而陷入战术勤奋与自我感动，忽略了最致命的现实堵点。`;
          } else {
            content = `我来指出所有人刻意回避的灰犀牛风险：如果这项设想的核心假设从一开始就是错的呢？我们是否有准备退出的止损方案？`;
          }
        } else {
          content = `既然大家就【${topic}】趋于折衷，我提出底线裁定原则：必须设立明确的反向检验指标，一旦受挫立即启动侧翼替代方案，绝不可恋战。`;
        }
      } else {
        // 哲学或通用顾问
        if (r === 1) {
          if (isGreetingOrTest) {
            content = `回归底层心智与初心：审视议题【${topic}】，其本质是价值观的一场考验。知行合一才是战略推演的最高合法性，不可为短期浮名牺牲核心底线。`;
          } else if (trimmedReq) {
            content = `从底层价值观审视议题【${topic}】：推行路径的合法性来源于知行合一。在大浪淘沙中保持对核心原则的坚守，才是穿越迷雾的终极锚点。`;
          } else {
            content = `从底层价值观审视：这项决策是否背离了最高统帅最初确立的人生哲学？若牺牲核心初心换取短期浮名，绝不可取。`;
          }
        } else {
          content = `战略进取与身心底线、哲学初心从来不是对立的。真正的战略定力是在守住底线的前提下谋求长远精进。建议统帅正式立卷归档此纪要。`;
        }
      }
      logs.push({ speaker: m.name, round: r, content });
    }
  }

  const minutes = `## 参谋部会议纪要：${topic}

- **召开时间**：${new Date().toLocaleString()}
- **参会席位**：${members.map((m) => m.name).join('、')}
- **讨论轮数**：${rounds} 轮深入辩论推演
${trimmedReq && !isGreetingOrTest ? `- **统帅关注重点**：${trimmedReq}\n` : ''}
---

### 一、核心战略共识
1. **战略重心明确**：一致确认当前议题【${topic}】的战略必要性与紧迫性，宏观推进轴线不可动摇；
2. **节奏管控与边界约束**：达成稳健推进共识，采取分阶段里程碑推进，坚决避免无序冒进。

### 二、主要分歧与辩论交锋
- **进取窗口期 vs 资源与身心防御**：战略席位强调战役窗口期的不可逆性，而财政与身心席位坚持资源储量与精力底线不可逾越；
- **化解方案**：采纳批判反对者意见，设立阶段性“熔断预警机制”，达到分段里程碑方可追加后续兵力与资源。

### 三、最高统帅裁定建议
- **短期落地**：在国策画布中建立细分子清单，明确当前主攻路线；
- **状态监控**：若稳定度产生剧烈波动或身心超载，立即启动紧急参谋复盘会。`;

  return { logs, minutes, usedRealLLM: false, error: apiError };
}

/**
 * 6. AI 推荐潜在演化心智特质 (§6.1) - 带有用户自定义需求
 */
export async function recommendTraits(
  context: StrategyContext,
  userRequirement = ''
): Promise<{ title: string; body: string; evolutionFrom?: string }[]> {
  const currentTitles = context.traits?.map((t) => t.title).join('、') || '暂无';
  const reqText = userRequirement.trim() ? `\n统帅期望突破的特质维度：${userRequirement.trim()}` : '';
  const prompt = `当前最高统帅已具有特质：「${currentTitles}」。
当前局势简报：「${context.situation || '处于攻坚积累期'}」。${reqText}
请推演 3 个最契合当前统帅发展需要的心智特质候选，其中至少有 1 个是由现有特质演化推进而来的进阶特征。

请严格返回如下 JSON 数组格式：
[
  {
    "title": "特质名称",
    "body": "阐述该特质的核心表现与决断影响",
    "evolutionFrom": "若是某旧特质的演化版则填旧特质名，否则留空字符串"
  }
]`;

  if (isLLMConfigured()) {
    try {
      const systemPrompt = buildSystemContextPrompt(context, '战略史书', true);
      const rawRes = await callChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ]);
      const jsonStr = extractJsonFromResponse(rawRes);
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((p) => ({
          title: String(p.title),
          body: String(p.body),
          evolutionFrom: p.evolutionFrom ? String(p.evolutionFrom) : undefined,
        }));
      }
    } catch (err) {
      console.warn('Recommend traits LLM call failed:', err);
    }
  }

  const firstTraitTitle = context.traits?.[0]?.title;
  return [
    {
      title: firstTraitTitle ? `高阶：${firstTraitTitle}` : '全局战略定力',
      body: '历经沉潜后凝练出的深层战略意志，在大风大浪中不为任何短期扰动所动。',
      evolutionFrom: firstTraitTitle,
    },
    {
      title: '敏锐战术嗅觉',
      body: '善于在纷繁复杂的日常信号中迅速捕捉破局契机，具备高度决断力。',
    },
    {
      title: '反脆弱心智结构',
      body: '视挫折与外部冲击为系统升级的弹药，具备超常的抗压自愈能力。',
    },
  ];
}


/**
 * 辅助：对作战参谋对话发言进行强力清洗过滤
 * 彻底消除 AI 泄露的 JSON 结构体、花括号、键名以及元数据围栏
 */
export function sanitizeChatMessage(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  // 1. 若被 markdown 代码围栏包裹 (如 ```json ... ``` 或 ``` ... ```)，先剥除围栏
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  // 2. 如果呈现为 JSON 对象或数组，尝试解析并提取自然语言内容
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.content === 'string') return sanitizeChatMessage(parsed.content);
        if (typeof parsed.reply === 'string') return sanitizeChatMessage(parsed.reply);
        if (typeof parsed.message === 'string') return sanitizeChatMessage(parsed.message);
        if (typeof parsed.text === 'string') return sanitizeChatMessage(parsed.text);
        if (typeof parsed.statement === 'string') return sanitizeChatMessage(parsed.statement);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (first && typeof first === 'object' && first.content) {
            return sanitizeChatMessage(String(first.content));
          }
        }
      }
    } catch {
      // 容错进入下一步正则提取
    }
  }

  // 3. 正则 fallback 匹配 "content": "..." 或 "reply": "..."
  const fieldMatch = text.match(/"(?:content|reply|message|text)"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
  if (fieldMatch) {
    try {
      return JSON.parse(`"${fieldMatch[1]}"`).trim();
    } catch {
      return fieldMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
    }
  }

  // 4. 清理残余的开头/结尾花括号、键名前缀 (例如 {"seat": "xxx", "content": )
  if (text.startsWith('{') || text.endsWith('}')) {
    text = text.replace(/^\{[\s\S]*?"(?:content|reply)":\s*"?/i, '');
    text = text.replace(/"?\s*\}[\s\S]*$/i, '');
  }

  return text.trim();
}

// 辅助：从模型输出中提取 JSON 串
function extractJsonFromResponse(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const firstBracket = trimmed.indexOf('[');
  const firstBrace = trimmed.indexOf('{');
  let startIdx = -1;
  let endChar = '';

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    startIdx = firstBracket;
    endChar = ']';
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    endChar = '}';
  }

  if (startIdx !== -1) {
    const lastIdx = trimmed.lastIndexOf(endChar);
    if (lastIdx > startIdx) {
      return trimmed.slice(startIdx, lastIdx + 1);
    }
  }
  return trimmed;
}

// 辅助：根据当前真实环境动态生成国策候选，拒绝呆板字符串
function generateDynamicContextualFocusProposals(
  parentFocus: Focus,
  context: StrategyContext,
  narrativeStyle: string,
  userRequirement = ''
): AIProposalItem[] {
  const baseTitle = parentFocus.title.replace(/^[深化转向休整：\s]+/, '');
  const timestamp = Date.now();
  const customHint = userRequirement.trim() ? `（针对意图：${userRequirement.trim().slice(0, 15)}）` : '';
  const contextNote = context.situation
    ? `【局势关切：${context.situation.slice(0, 24)}...】`
    : context.philosophy
    ? `【信条贯穿：${context.philosophy.slice(0, 24)}...】`
    : '';

  const stylesDescriptions: Record<string, { deepen: string; pivot: string; rest: string }> = {
    战略史书: {
      deepen: `乘前期战役之利，全线推进「${baseTitle}」之纵深堡垒，开辟全新战略版图。${contextNote}${userRequirement ? ` 融入统帅旨意：${userRequirement}` : ''}`,
      pivot: `鉴于主攻方向阻力严峻，以侧翼奇兵开辟替代战线，规避正面阵地战之巨大损耗。${contextNote}`,
      rest: `鸣金收兵，对已有战果展开严密结网与体质整饬，积蓄力量以待下一轮战略窗口。${contextNote}`,
    },
    冷静客观: {
      deepen: `量化追踪「${baseTitle}」的核心指标，以数据驱动迭代，进一步建立确定性壁垒。${contextNote}${userRequirement ? ` 结合约束：${userRequirement}` : ''}`,
      pivot: `评估当前边际产出递减风险，设立平行互斥方案，分散单点暴露风险。${contextNote}`,
      rest: `进行阶段性战略复盘，清理执行冗余，优化精力资本与工具链效能。${contextNote}`,
    },
    公文严谨: {
      deepen: `依据总体规划纲要，全面启动「${baseTitle}」第二阶段配套工程，明确里程碑节点。${contextNote}`,
      pivot: `启动战略应急预案，针对外部约束调整实施路线，保重点、控节奏。${contextNote}`,
      rest: `落实规范化管理要求，开展制度化复盘与能量储备，确保长期可持续推进。${contextNote}`,
    },
    史诗恢宏: {
      deepen: `时代的大潮奔涌向前！执「${baseTitle}」之旗帜，直抵破晓之决胜峰峦！${contextNote}`,
      pivot: `在命运的风暴中果决转向！避其锋芒，于暗礁险滩中另辟通天坦途！${contextNote}`,
      rest: `在大决战前夕静穆驻足，聆听内心的金石之声，将身心熔铸为不朽的底座。${contextNote}`,
    },
  };

  const selectedDesc = stylesDescriptions[narrativeStyle] || stylesDescriptions['战略史书'];

  return [
    {
      id: `prop-deepen-${timestamp}`,
      direction: '纵深突破',
      title: `深化攻坚：${baseTitle} · 决胜阶段${customHint}`,
      bodyMd: selectedDesc.deepen,
      status: 'active',
      relationType: 'prerequisite',
    },
    {
      id: `prop-pivot-${timestamp}`,
      direction: '侧翼迂回',
      title: `侧翼突围：针对现实阻力的替代路线`,
      bodyMd: selectedDesc.pivot,
      status: 'paused',
      relationType: 'mutually_exclusive',
    },
    {
      id: `prop-rest-${timestamp}`,
      direction: '整顿固基',
      title: `战略休整：${baseTitle} 复盘与能量储备`,
      bodyMd: selectedDesc.rest,
      status: 'paused',
      relationType: 'prerequisite',
    },
  ];
}

/**
 * 7. 作战会议室群聊模式：单步生成顾问发言
 * 支持统帅插话互动、顾问跨席位辩论、自定义提示词感知
 */
export async function generateNextCabinetTurn(params: {
  topic: string;
  speaker: StaffMember;
  history: { speaker: string; content: string; isCommander?: boolean }[];
  context: StrategyContext;
  userRequirement?: string;
}): Promise<{ content: string; usedRealLLM: boolean; error?: string }> {
  const { topic, speaker, history, context, userRequirement } = params;

  // 获取该席位的人设提示词（优先读取 promptStore 自定义配置）
  let advisorPersona = speaker.prompt;
  if (speaker.name.includes('战略') || speaker.role.includes('战略')) {
    advisorPersona = promptStore.getPrompt('advisor_strategy') || speaker.prompt;
  } else if (speaker.name.includes('财政') || speaker.role.includes('财务') || speaker.role.includes('资源')) {
    advisorPersona = promptStore.getPrompt('advisor_finance') || speaker.prompt;
  } else if (speaker.name.includes('身心') || speaker.role.includes('健康') || speaker.role.includes('体魄')) {
    advisorPersona = promptStore.getPrompt('advisor_health') || speaker.prompt;
  } else if (speaker.name.includes('批判') || speaker.role.includes('反对') || speaker.role.includes('挑刺')) {
    advisorPersona = promptStore.getPrompt('advisor_critic') || speaker.prompt;
  } else if (speaker.name.includes('哲学') || speaker.role.includes('价值观') || speaker.role.includes('宗师')) {
    advisorPersona = promptStore.getPrompt('advisor_philosophy') || speaker.prompt;
  }

  // 1. 若配置了大模型，优先调用真实 API
  if (isLLMConfigured()) {
    try {
      const baseSystem = buildSystemContextPrompt(context, '冷静客观', false);
      const systemPrompt = `${baseSystem}

【当前正在召开的参谋部作战会议】
- 研讨总议题：【${topic}】
- 你的席位与身份：${speaker.name}（${speaker.role}）

【你的席位专属人设与思考准则】
${advisorPersona}

【参谋会议发言准则】
1. 统帅指令与元指令响应原则：若统帅下达了直接指令、日常问候或测试指令（例如“别角色扮演了”、“说你好”、“测试”等），所有席位必须优先直接响应统帅命令，严禁在此时强行扮演或反客为主！
2. 围绕议题【${topic}】或承接前序发言与统帅训示发表见解。
3. 若最高统帅近期有战术训示或插话，必须重点承接统帅意图并以专业角度予以推演或提醒，严禁生硬复读统帅原话。
4. 若已有其他参谋发言，可以明确针对前序参谋的论点展开支持、补充、质询或反驳。
5. 语言精炼自然，字数在 50-180 字之间。
6. 严格禁止输出 JSON、键值对（例如 {"seat":...}）或代码围栏！直接输出可读口语发言正文！`;

      const formattedHistory = history.map((msg) => {
        const prefix = msg.isCommander ? `【最高统帅 训示】` : `【${msg.speaker}】`;
        return `${prefix}: ${msg.content}`;
      });

      const prompt = `会议最新进展记录：\n${
        formattedHistory.length > 0 ? formattedHistory.slice(-8).join('\n\n') : '（会议刚开始，请发表开篇立论）'
      }

${userRequirement?.trim() ? `【统帅特别批示/追问/直接命令】："${userRequirement.trim()}"\n` : ''}
现在轮到你（${speaker.name}）发言。请直接发表你的自然发言（严禁输出任何JSON或花括号）：`;

      const reply = await callChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ], 0.7);

      const cleanedContent = sanitizeChatMessage(reply);
      return { content: cleanedContent, usedRealLLM: true };
    } catch (err: any) {
      console.warn('Real LLM cabinet single turn failed, falling back to heuristic engine:', err);
    }
  }

  // 2. 离线启发式拟真引擎（自适应上下文与统帅插话）
  const lastMsg = history.length > 0 ? history[history.length - 1] : null;
  const commanderMsgs = history.filter((h) => h.isCommander);
  const latestCommanderMsg = commanderMsgs.length > 0 ? commanderMsgs[commanderMsgs.length - 1].content : '';
  const effectiveCommanderInput = userRequirement?.trim() || latestCommanderMsg;

  const isGreetingOrTest = /你好|hello|hi|测试|test|打招呼|问好|别角色扮演|不要扮演|停止扮演/i.test(effectiveCommanderInput);

  let reply = '';
  const isStrat = speaker.name.includes('战略') || speaker.role.includes('战略');
  const isFin = speaker.name.includes('财政') || speaker.role.includes('财务') || speaker.role.includes('资源');
  const isHealth = speaker.name.includes('身心') || speaker.role.includes('健康') || speaker.role.includes('体魄');
  const isCritic = speaker.name.includes('批判') || speaker.role.includes('反对') || speaker.role.includes('挑刺');

  if (isGreetingOrTest) {
    if (isStrat) {
      reply = `报告统帅！战略参谋通信链路畅通无阻，随时听候调遣。统帅好！`;
    } else if (isFin) {
      reply = `报告统帅！财政与资源核算通道正常，随时配合统帅各项测试。统帅好！`;
    } else if (isHealth) {
      reply = `报告统帅！身心监测信道响应正常，随时待命。最高统帅好！`;
    } else if (isCritic) {
      reply = `报告统帅！红队质疑席位通信正常，坚决遵从统帅测试命令。统帅好！`;
    } else {
      reply = `报告统帅！底层价值与战略初心模块连接正常。统帅好！`;
    }
  } else if (isStrat) {
    if (effectiveCommanderInput) {
      reply = `谨遵统帅指示。关于当前焦点，战略关键在于明确第一阶段战役成果的验收标准，确保我们在推进【${topic}】时建立起不可逆的主导优势。`;
    } else if (lastMsg && !lastMsg.isCommander) {
      reply = `针对${lastMsg.speaker}的顾虑：谨慎固然必要，但战略窗口期稍纵即逝。对【${topic}】的推演不能因噎废食，应当以阶段性战果逐步消除不确定性。`;
    } else {
      reply = `开辟议题【${topic}】推演：从终局视角研判，核心在于掌握推进节奏与里程碑节点，确保主线清晰，不为短期扰动动摇定力。`;
    }
  } else if (isFin) {
    if (effectiveCommanderInput) {
      reply = `从资本与精力盘面审视统帅的考量：推进【${topic}】必须设定严格的投入上限与损益评估，绝不能让沉没成本绑架整体战略资金链。`;
    } else if (lastMsg && lastMsg.speaker.includes('战略')) {
      reply = `必须给战略参谋长泼点冷水：宏大构想不能没有弹药支持。在【${topic}】形成正向现金流或精力收益前，坚决反对无节制扩大战线。`;
    } else {
      reply = `核算【${topic}】的投产比：建议设立硬性熔断阈值。若两周内未见关键阶段产出，必须强制削减 30% 资源投入。`;
    }
  } else if (isHealth) {
    if (effectiveCommanderInput) {
      reply = `我必须从身心底座向统帅进言：您的精力槽与健康是一切宏图大略的物理依托。推行【${topic}】绝不能以透支生物节律为代价，必须强制预留恢复窗口。`;
    } else if (lastMsg && (lastMsg.speaker.includes('战略') || lastMsg.speaker.includes('财政'))) {
      reply = `不论战役节奏还是成本管控，统帅的生理承载力才是终极硬约束。高压推进必须配套深度睡眠与神经放松，否则战略执行力必然断崖式下跌。`;
    } else {
      reply = `从精力负荷模型评估【${topic}】：当前外部认知压力较高，必须将作息规律与体能锻炼设为不可逾越的红线。`;
    }
  } else if (isCritic) {
    if (effectiveCommanderInput) {
      reply = `我来指出所有人回避的盲点：统帅的思路虽具魄力，但对【${topic}】最坏情况的退出机制是否有所准备？若外部环境逆转，我们如何避免被拖入泥潭？`;
    } else if (lastMsg && !lastMsg.isCommander) {
      reply = `我反驳${lastMsg.speaker}的乐观假设：所谓的折衷方案往往两头不讨好。对【${topic}】必须设立明确的反向检验指标，敢于刺破虚妄的自我感动。`;
    } else {
      reply = `指出灰犀牛风险：如果这项设想的核心前提就是错的呢？必须设立红队假想敌机制，对【${topic}】的脆弱环节进行压力测试。`;
    }
  } else {
    // 哲学宗师或通用顾问
    if (effectiveCommanderInput) {
      reply = `回归底层心智与初心：统帅的决断不仅是战术取舍，更是价值观的投射。在【${topic}】中唯有守住战略公理与知行合一，方能穿越短期迷雾。`;
    } else {
      reply = `综合各席位推演：战略进取、精力防线与批判审视从来不是对立的。保持长远定力，不为浮名妥协初心，此为【${topic}】取胜之本。`;
    }
  }

  return { content: sanitizeChatMessage(reply), usedRealLLM: false };
}

/**
 * 8. 作战会议室群聊记录一键提炼总结为 Markdown 纪要草案
 */
export async function summarizeChatToMinutes(params: {
  topic: string;
  history: { speaker: string; content: string; isCommander?: boolean }[];
  context: StrategyContext;
}): Promise<{ minutes: string; usedRealLLM: boolean }> {
  const { topic, history, context } = params;
  const minutesInstruction = promptStore.getPrompt('meeting_minutes') || `请作为总参谋长，深入综合所有参谋席位的交锋发言与最高统帅的批示，起草高水准的《总参谋部会议纪要》：
包含：
一、核心战略共识（一致认同的基调与推进轴线）
二、主要分歧与辩论交锋（冲突焦点与折衷制衡）
三、最高统帅裁定建议（立即可落地的下一步军令动员）
使用典雅庄重的 Markdown 格式输出。`;

  const transcript = history
    .map((h) => `${h.isCommander ? '【最高统帅 训示】' : `【${h.speaker}】`}: ${h.content}`)
    .join('\n\n');

  if (isLLMConfigured()) {
    try {
      const systemPrompt = `${buildSystemContextPrompt(context, '公文严谨', false)}

【任务要求】
${minutesInstruction}`;

      const prompt = `议题：【${topic}】

以下为作战参谋部完整交流辩论实录：
${transcript}

请根据实录起草正式的 Markdown 会议纪要草案：`;

      const res = await callChatCompletions([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ], 0.5);

      return { minutes: res.trim(), usedRealLLM: true };
    } catch (err) {
      console.warn('Real LLM summarizeChatToMinutes failed, falling back to local template:', err);
    }
  }

  // 离线结构化纪要生成
  const commanderCount = history.filter((h) => h.isCommander).length;
  const advisors = Array.from(new Set(history.filter((h) => !h.isCommander).map((h) => h.speaker)));

  const minutes = `## 参谋部战略研讨纪要：${topic}

- **会议时间**：${new Date().toLocaleString()}
- **统帅参会**：最高统帅亲自督导（指导发言 ${commanderCount} 次）
- **参谋席位**：${advisors.length > 0 ? advisors.join('、') : '全体内阁顾问'}
- **讨论轮次**：累计发言 ${history.length} 条实录交互

---

### 一、核心战略共识
1. **主轴方向锁定**：就议题【${topic}】达成高度统一，确立其作为当前战略推进的核心抓手；
2. **战役分期推进**：坚决贯彻统帅批示，采取循序渐进的里程碑式攻坚，不搞无准备的盲目冒进。

### 二、主要交锋与制衡化解
- **进取窗口 vs 现实防御**：战略席位主张抢占时间窗口，财政与身心席位坚守成本上限与精力防线；
- **化解方案**：采纳批判反对者意见，设立刚性阶段考核与预警熔断机制，以确凿阶段成果换取后续弹药追加。

### 三、最高统帅裁定要项
- **立即行动**：将研讨共识转化为国策画布中的具体执行子项；
- **长效复盘**：保持对系统稳定度与精力消耗的密切监测，随时启动参谋复盘。`;

  return { minutes, usedRealLLM: false };
}

