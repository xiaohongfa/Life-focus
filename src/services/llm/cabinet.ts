import type { StaffMember } from '../../api/types';
import type { CabinetDebateResult, StrategyContext } from './types';
import { isLLMConfigured, callChatCompletions } from './config';
import { buildSystemContextPrompt } from './context';
import { sanitizeChatMessage } from './utils';
import { promptStore } from '../promptStore';

/**
 * 5. 内阁多参谋真实模拟辩论与共识纪要 (§12.4)
 */
export async function simulateCabinetDebate(
  topic: string,
  members: StaffMember[],
  context: StrategyContext,
  rounds = 2,
  userRequirement = ''
): Promise<CabinetDebateResult> {
  const reqSection = userRequirement.trim()
    ? `\n【统帅特别批示/限制条件】：${userRequirement.trim()}`
    : '';

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

          const response = await callChatCompletions(
            [
              { role: 'system', content: buildSystemContextPrompt(context, '冷静客观', false) },
              { role: 'user', content: prompt },
            ],
            0.8
          );

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

      const minutes = await callChatCompletions(
        [
          { role: 'system', content: buildSystemContextPrompt(context, '公文严谨', false) },
          { role: 'user', content: minutesPrompt },
        ],
        0.5
      );

      return { logs, minutes, usedRealLLM: true };
    } catch (err: any) {
      console.warn('Real LLM cabinet debate failed, using dynamic strategy engine:', err);
      apiError = err.message || String(err);
    }
  }

  // 动态情境参谋部生成 (启发式拟真引擎 - 拒绝机械套话与过度遵从)
  const isGreetingOrTest =
    /你好|hello|hi|测试|test|打招呼|问好|别角色扮演|不要扮演|停止扮演/i.test(userRequirement);
  const trimmedReq = userRequirement.trim();

  const logs: { speaker: string; round: number; content: string }[] = [];
  for (let r = 1; r <= rounds; r++) {
    for (const m of members) {
      let content = '';
      const isStrat = m.name.includes('战略') || m.role.includes('战略');
      const isFin =
        m.name.includes('财政') || m.role.includes('财务') || m.role.includes('资源');
      const isHealth =
        m.name.includes('身心') || m.role.includes('健康') || m.role.includes('体魄');
      const isCritic =
        m.name.includes('批判') || m.role.includes('反对') || m.role.includes('挑刺');

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
  } else if (
    speaker.name.includes('财政') ||
    speaker.role.includes('财务') ||
    speaker.role.includes('资源')
  ) {
    advisorPersona = promptStore.getPrompt('advisor_finance') || speaker.prompt;
  } else if (
    speaker.name.includes('身心') ||
    speaker.role.includes('健康') ||
    speaker.role.includes('体魄')
  ) {
    advisorPersona = promptStore.getPrompt('advisor_health') || speaker.prompt;
  } else if (
    speaker.name.includes('批判') ||
    speaker.role.includes('反对') ||
    speaker.role.includes('挑刺')
  ) {
    advisorPersona = promptStore.getPrompt('advisor_critic') || speaker.prompt;
  } else if (
    speaker.name.includes('哲学') ||
    speaker.role.includes('价值观') ||
    speaker.role.includes('宗师')
  ) {
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
        formattedHistory.length > 0
          ? formattedHistory.slice(-8).join('\n\n')
          : '（会议刚开始，请发表开篇立论）'
      }

${
  userRequirement?.trim() ? `【统帅特别批示/追问/直接命令】："${userRequirement.trim()}"\n` : ''
}
现在轮到你（${speaker.name}）发言。请直接发表你的自然发言（严禁输出任何JSON或花括号）：`;

      const reply = await callChatCompletions(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        0.7
      );

      const cleanedContent = sanitizeChatMessage(reply);
      return { content: cleanedContent, usedRealLLM: true };
    } catch (err: any) {
      console.warn('Real LLM cabinet single turn failed, falling back to heuristic engine:', err);
    }
  }

  // 2. 离线启发式拟真引擎（自适应上下文与统帅插话）
  const lastMsg = history.length > 0 ? history[history.length - 1] : null;
  const commanderMsgs = history.filter((h) => h.isCommander);
  const latestCommanderMsg =
    commanderMsgs.length > 0 ? commanderMsgs[commanderMsgs.length - 1].content : '';
  const effectiveCommanderInput = userRequirement?.trim() || latestCommanderMsg;

  const isGreetingOrTest =
    /你好|hello|hi|测试|test|打招呼|问好|别角色扮演|不要扮演|停止扮演/i.test(
      effectiveCommanderInput
    );

  let reply = '';
  const isStrat = speaker.name.includes('战略') || speaker.role.includes('战略');
  const isFin =
    speaker.name.includes('财政') || speaker.role.includes('财务') || speaker.role.includes('资源');
  const isHealth =
    speaker.name.includes('身心') || speaker.role.includes('健康') || speaker.role.includes('体魄');
  const isCritic =
    speaker.name.includes('批判') || speaker.role.includes('反对') || speaker.role.includes('挑刺');

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
  const minutesInstruction =
    promptStore.getPrompt('meeting_minutes') ||
    `请作为总参谋长，深入综合所有参谋席位的交锋发言与最高统帅的批示，起草高水准的《总参谋部会议纪要》：
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

      const res = await callChatCompletions(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        0.5
      );

      return { minutes: res.trim(), usedRealLLM: true };
    } catch (err) {
      console.warn('Real LLM summarizeChatToMinutes failed, falling back to local template:', err);
    }
  }

  // 离线结构化纪要生成
  const commanderCount = history.filter((h) => h.isCommander).length;
  const advisors = Array.from(
    new Set(history.filter((h) => !h.isCommander).map((h) => h.speaker))
  );

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
