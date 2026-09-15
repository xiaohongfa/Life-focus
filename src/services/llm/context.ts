import type { StrategyContext } from './types';
import { promptStore } from '../promptStore';

/**
 * 组装人生上下文为 System Prompt (§12.2)
 */
export function buildSystemContextPrompt(
  context: StrategyContext,
  narrativeStyle = '战略史书',
  requireJson = false
): string {
  const stylePromptMap: Record<string, string> = {
    战略史书:
      '叙事风格要求：严肃深沉的战略史书文笔，如同撰写《资治通鉴》或《罗马帝国衰亡史》，措辞考究，气魄恢宏。',
    冷静客观:
      '叙事风格要求：极度冷静理性的参谋推演分析，摒弃修饰词，直击利弊边界与核心胜负手。',
    公文严谨:
      '叙事风格要求：规范、庄重的国家战略公文体例，结构清晰，条理分明，指标量化。',
    史诗恢宏:
      '叙事风格要求：如荷马史诗或钢铁雄心超事件演出的磅礴史诗语调，充满对命运抗争与时代转折的张力。',
  };

  const styleText = stylePromptMap[narrativeStyle] || stylePromptMap['战略史书'];
  const baseSystemPrompt =
    promptStore.getPrompt('system_context') ||
    `你是一位人生战略推演与参谋部智囊。你身处于《人生战略游戏》（Life Strategy Game）中。
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
- 稳定度状态：${
    context.stability !== null && context.stability !== undefined
      ? `${context.stability}%`
      : '未设定'
  }
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
