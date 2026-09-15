import type { Focus } from '../../api/types';
import type { AIProposalItem, StrategyContext } from './types';
import { isLLMConfigured, callChatCompletions } from './config';
import { buildSystemContextPrompt } from './context';
import { extractJsonFromResponse } from './utils';

// 辅助：根据当前真实环境动态生成国策候选，拒绝呆板字符串
export function generateDynamicContextualFocusProposals(
  parentFocus: Focus,
  context: StrategyContext,
  narrativeStyle: string,
  userRequirement = ''
): AIProposalItem[] {
  const baseTitle = parentFocus.title.replace(/^[深化转向休整：\s]+/, '');
  const timestamp = Date.now();
  const customHint = userRequirement.trim()
    ? `（针对意图：${userRequirement.trim().slice(0, 15)}）`
    : '';
  const contextNote = context.situation
    ? `【局势关切：${context.situation.slice(0, 24)}...】`
    : context.philosophy
    ? `【信条贯穿：${context.philosophy.slice(0, 24)}...】`
    : '';

  const stylesDescriptions: Record<string, { deepen: string; pivot: string; rest: string }> = {
    战略史书: {
      deepen: `乘前期战役之利，全线推进「${baseTitle}」之纵深堡垒，开辟全新战略版图。${contextNote}${
        userRequirement ? ` 融入统帅旨意：${userRequirement}` : ''
      }`,
      pivot: `鉴于主攻方向阻力严峻，以侧翼奇兵开辟替代战线，规避正面阵地战之巨大损耗。${contextNote}`,
      rest: `鸣金收兵，对已有战果展开严密结网与体质整饬，积蓄力量以待下一轮战略窗口。${contextNote}`,
    },
    冷静客观: {
      deepen: `量化追踪「${baseTitle}」的核心指标，以数据驱动迭代，进一步建立确定性壁垒。${contextNote}${
        userRequirement ? ` 结合约束：${userRequirement}` : ''
      }`,
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
          relationType:
            item.relationType === 'mutually_exclusive' ? 'mutually_exclusive' : 'prerequisite',
        }));
      }
    } catch (err) {
      console.warn('Real LLM API call failed, falling back to smart contextual engine:', err);
    }
  }

  // 动态情境策略推演引擎（结合用户输入与真实上下文）
  return generateDynamicContextualFocusProposals(
    parentFocus,
    context,
    narrativeStyle,
    userRequirement
  );
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
      bodyMd: `结合统帅意图${
        userRequirement ? `「${userRequirement}」` : ''
      }与当前局势，集中优势资源打通主要战略瓶颈。`,
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
