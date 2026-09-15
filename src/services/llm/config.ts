import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '../../api/client';
import type { LLMConfig, LlmConfigView } from './types';

export const STORAGE_KEY = 'life_strategy_llm_config';

export function normalizeConfigView(raw: any): LlmConfigView {
  return {
    provider: (raw?.provider || 'deepseek') as any,
    baseUrl: raw?.baseUrl || raw?.base_url || 'https://api.deepseek.com',
    model: raw?.model || 'deepseek-chat',
    hasApiKey: Boolean(raw?.hasApiKey ?? raw?.has_api_key ?? false),
    maskedKey: raw?.maskedKey ?? raw?.masked_key ?? null,
  };
}

export let cachedConfigView: LlmConfigView = {
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
          apiKey:
            customConfig?.apiKey && customConfig.apiKey.trim().length > 0
              ? customConfig.apiKey.trim()
              : null,
        },
      });
      return { success: true, message: reply };
    } catch (err: any) {
      return {
        success: false,
        message: typeof err === 'string' ? err : err?.message || String(err),
      };
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
export async function callChatCompletions(
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
      throw new Error(typeof err === 'string' ? err : err?.message || String(err));
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
