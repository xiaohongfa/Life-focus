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

/**
 * 辅助：从模型输出中提取 JSON 串
 */
export function extractJsonFromResponse(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```$/i);
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
