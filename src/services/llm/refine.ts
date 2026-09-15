import type { StrategyContext } from './types';
import { isLLMConfigured, callChatCompletions } from './config';
import { buildSystemContextPrompt } from './context';
import { extractJsonFromResponse } from './utils';

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
    situation:
      '请对统帅录入的当前局势草稿进行战略提炼。理清当前核心态势、主要矛盾、外部制约与下一阶段关键胜负手，使其兼具战略洞见与史书质感。',
    philosophy:
      '请对统帅的人生哲学与底层行事准则进行升华。提炼出具有金石之声的公理式信条与认知模型，去除泛泛空谈，字字有千钧之力。',
    leader:
      '请根据统帅的原有人格自述，润色为一份兼具自省锐度与决断魅力的战略领袖画像，提炼其核心决断心智与抗压风格。',
    focus: '请对该国策节点的战略目标进行深化润色。明确战略意图、战役分期与关键里程碑。',
    essay: '请对这篇战略思考随笔进行文学与战略深度的润色提升。',
  };

  const reqSection = userRequirement.trim()
    ? `\n【统帅特定要求与输入意向】：\n"${userRequirement.trim()}"\n`
    : '';
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
    const focusHint = userRequirement.trim()
      ? `\n> **统帅当前聚焦方向**：${userRequirement.trim()}\n`
      : '';
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
    const focusHint = userRequirement.trim()
      ? `\n> **核心心愿**：${userRequirement.trim()}\n`
      : '';
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
    const focusHint = userRequirement.trim()
      ? `\n> **随笔主旨与统帅关注**：${userRequirement.trim()}\n`
      : '';
    return `### 战略随笔：深度复盘与远期推演

${focusHint}${originalText || '录入您的战略随笔构想...'}

---
*参谋部评注：立论深远，理路明晰，兼具长效战略定力与深刻反思敏锐度。*`;
  }

  return `### 深度战略提炼\n\n${originalText}\n\n*战略建议：紧扣核心意图，设立不可动摇之分段里程碑。*`;
}

/**
 * 6. AI 推荐潜在演化心智特质 (§6.1) - 带有用户自定义需求
 */
export async function recommendTraits(
  context: StrategyContext,
  userRequirement = ''
): Promise<{ title: string; body: string; evolutionFrom?: string }[]> {
  const currentTitles = context.traits?.map((t) => t.title).join('、') || '暂无';
  const reqText = userRequirement.trim()
    ? `\n统帅期望突破的特质维度：${userRequirement.trim()}`
    : '';
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
