import React, { useState, useEffect } from 'react';
import { Key, Loader2, CheckCircle2, AlertCircle, Wifi, ShieldCheck } from 'lucide-react';
import {
  testLLMConnection,
  saveLLMConfig,
  clearLLMKey,
  fetchLLMConfigView,
} from '../../services/llmService';
import { soundFx } from '../../utils/soundEffects';

export const LlmSettingsTab: React.FC = () => {
  const [provider, setProvider] = useState<'deepseek' | 'openai' | 'gemini' | 'custom'>('deepseek');
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [savedAiStatus, setSavedAiStatus] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchLLMConfigView().then((cfg) => {
      setProvider(cfg.provider as any);
      setBaseUrl(cfg.baseUrl);
      setModel(cfg.model);
      setHasApiKey(cfg.hasApiKey);
      setMaskedKey(cfg.maskedKey || null);
    });
  }, []);

  const handleProviderChange = (p: 'deepseek' | 'openai' | 'gemini' | 'custom') => {
    soundFx.playClick();
    setProvider(p);
    if (p === 'deepseek') {
      setBaseUrl('https://api.deepseek.com');
      setModel('deepseek-chat');
    } else if (p === 'openai') {
      setBaseUrl('https://api.openai.com/v1');
      setModel('gpt-4o');
    } else if (p === 'gemini') {
      setBaseUrl('https://generativelanguage.googleapis.com/v1beta');
      setModel('gemini-1.5-pro');
    }
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await saveLLMConfig(provider, baseUrl, model, apiKey.trim() || undefined);
      setHasApiKey(res.hasApiKey);
      setMaskedKey(res.maskedKey || null);
      setApiKey('');
      setSavedAiStatus(true);
      soundFx.playStamp();
      setTimeout(() => setSavedAiStatus(false), 2500);
    } catch (err: any) {
      alert(`保存失败: ${err?.message || String(err)}`);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm('确认清除已保存在本地保险库中的 API 密钥？')) return;
    try {
      const res = await clearLLMKey();
      setHasApiKey(res.hasApiKey);
      setMaskedKey(null);
      setApiKey('');
      soundFx.playVoid();
    } catch (err: any) {
      alert(`清除失败: ${err?.message || String(err)}`);
    }
  };

  const handleTestConnection = async () => {
    soundFx.playClick();
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await testLLMConnection({
        provider,
        baseUrl,
        apiKey: apiKey.trim() || undefined,
        model,
      });
      setTestResult(res);
      if (res.success) {
        soundFx.playFocusStart();
      } else {
        soundFx.playAlert();
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || String(err) });
      soundFx.playAlert();
    } finally {
      setTestingAi(false);
    }
  };

  return (
    <form onSubmit={handleSaveAiConfig} className="space-y-4 select-none">
      {/* 永久持久化凭据保障卡片 */}
      <div className="p-3.5 bg-gradient-to-r from-[#14231b] to-[#111915] border-2 border-emerald-600/70 rounded-lg text-xs leading-relaxed shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
        <div className="flex items-center space-x-2 text-emerald-400 font-bold mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>本地保险库永久持久化保障 (PERMANENT KEY PERSISTENCE)</span>
        </div>
        <p className="text-[#e2e8f0]">
          API 密钥通过<strong>本地便携保险库 (`./data/.llm_vault`) 与系统安全凭据管理器双层保存</strong>。即使重启软件、电脑重启或升级便携版，密钥均已永久留存，绝不会在下一次打开时丢失！
        </p>
      </div>

      <div>
        <label className="block text-xs font-bold text-[#ffffff] mb-1.5">
          AI 服务提供商 (Provider)
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'deepseek', label: 'DeepSeek (推荐)' },
            { id: 'openai', label: 'OpenAI' },
            { id: 'gemini', label: 'Gemini' },
            { id: 'custom', label: '自定义 / 兼容' },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => handleProviderChange(item.id as any)}
              className={`py-2 px-2 rounded text-xs font-bold border text-center transition ${
                provider === item.id
                  ? 'bg-gradient-to-b from-amber-600 to-amber-700 text-black border-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                  : 'hoi4-btn-steel text-[#e2e8f0] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-[#ffffff] mb-1">接口 Base URL</label>
        <input
          type="text"
          required
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full hoi4-inset-panel rounded px-3 py-2 text-xs text-[#ffffff] font-mono focus:outline-none focus:border-[#fbbf24]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-[#ffffff] flex items-center space-x-1">
            <Key className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>API 密钥 (API Key)</span>
          </label>
          {hasApiKey && (
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">
                🔒 本地已永久保存: {maskedKey || '已安全存储'}
              </span>
              <button
                type="button"
                onClick={handleClearKey}
                className="text-[10px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
              >
                清除密钥
              </button>
            </div>
          )}
        </div>
        <input
          type="password"
          placeholder={hasApiKey ? '已在本地永久保存（留空保持不变，输入新密钥可覆盖）' : 'sk-...'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full hoi4-inset-panel rounded px-3 py-2 text-xs text-[#ffffff] font-mono placeholder-[#64748b] focus:outline-none focus:border-[#fbbf24]"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-[#ffffff] mb-1">默认调用模型</label>
        <input
          type="text"
          required
          placeholder="例如：deepseek-chat / gpt-4o"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full hoi4-inset-panel rounded px-3 py-2 text-xs text-[#ffffff] font-mono placeholder-[#64748b] focus:outline-none focus:border-[#fbbf24]"
        />
      </div>

      {/* Test Result Feedback */}
      {testingAi && (
        <div className="p-2.5 bg-[#141b22] border border-[#fbbf24]/50 rounded text-xs text-[#fbbf24] flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#fbbf24]" />
          <span>正在向 {baseUrl} 发送心跳探针，验证 API 密钥与模型可用性...</span>
        </div>
      )}

      {testResult && (
        <div
          className={`p-3 rounded text-xs flex items-start space-x-2 border ${
            testResult.success
              ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
              : 'bg-rose-950/70 border-rose-600 text-rose-200'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <span className="font-bold">
              {testResult.success ? '✅ API 联通测试成功（参谋部随时待命）' : '❌ API 联通测试失败'}
            </span>
            <p className="font-mono text-[11px] leading-relaxed break-all opacity-95">
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-[#2d3642]">
        <button
          type="button"
          disabled={testingAi || (!apiKey.trim() && !hasApiKey)}
          onClick={handleTestConnection}
          className="hoi4-btn-steel px-3.5 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          title="向服务商接口发送探针，即时检验 API Key 与 Base URL 是否正确"
        >
          {testingAi ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wifi className="w-3.5 h-3.5 text-[#fbbf24]" />
          )}
          <span>测试 API 连接</span>
        </button>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-emerald-400 font-bold font-mono">
            {savedAiStatus ? '✓ 配置已永久加密存入本地保险库' : ''}
          </span>
          <button
            type="submit"
            className="hoi4-btn-military px-5 py-2 rounded text-xs font-serif font-bold shadow"
          >
            永久保存模型设定
          </button>
        </div>
      </div>
    </form>
  );
};
