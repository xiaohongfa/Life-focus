import React, { useState, useEffect } from 'react';
import { Key, Loader2, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { isTauri } from '../../api/client';
import {
  testLLMConnection,
  saveLLMConfig,
  clearLLMKey,
  fetchLLMConfigView,
} from '../../services/llmService';

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
      setTimeout(() => setSavedAiStatus(false), 2000);
    } catch (err: any) {
      alert(`保存失败: ${err?.message || String(err)}`);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm('确认清除已保存在本机的安全 API 密钥？')) return;
    try {
      const res = await clearLLMKey();
      setHasApiKey(res.hasApiKey);
      setMaskedKey(null);
      setApiKey('');
    } catch (err: any) {
      alert(`清除失败: ${err?.message || String(err)}`);
    }
  };

  const handleTestConnection = async () => {
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
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || String(err) });
    } finally {
      setTestingAi(false);
    }
  };

  return (
    <form onSubmit={handleSaveAiConfig} className="space-y-4">
      {isTauri ? (
        <div className="p-3 bg-slate-950/60 border border-emerald-500/30 rounded-lg text-xs text-slate-400 leading-relaxed">
          <span className="text-emerald-400 font-bold">系统级安全凭证隔离：</span>
          桌面客户端模式下，API Key 由系统凭据管理器（Credential Manager / Keychain / Secret Service）加密托管，绝不写入普通文件、数据库或云端，导出档案时严格隔离。
        </div>
      ) : (
        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-200/90 leading-relaxed">
          <span className="text-amber-400 font-bold">⚠️ 浏览器开发预览模式：</span>
          当前处于网页开发预览环境，凭据仅保存在当前浏览器临时缓存（localStorage），未启用操作系统级凭证保护。正式使用与生产部署请运行 Tauri 桌面客户端。
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1.5">
          AI 服务提供商 (Provider)
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'deepseek', label: 'DeepSeek' },
            { id: 'openai', label: 'OpenAI' },
            { id: 'gemini', label: 'Gemini' },
            { id: 'custom', label: '自定义 / 兼容' },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => handleProviderChange(item.id as any)}
              className={`py-2 px-2 rounded-lg text-xs font-bold border text-center transition ${
                provider === item.id
                  ? 'bg-strategy-gold text-slate-950 border-strategy-gold shadow'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1">接口 Base URL</label>
        <input
          type="text"
          required
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-strategy-gold"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
            <Key className="w-3.5 h-3.5 text-strategy-gold" />
            <span>API 密钥 (API Key)</span>
          </label>
          {hasApiKey && (
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                安全就绪: {maskedKey || '已安全存储'}
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
          placeholder={hasApiKey ? '已保存安全密钥（留空保持不变，输入新值可覆盖）' : 'sk-...'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-strategy-gold"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-300 mb-1">默认调用模型</label>
        <input
          type="text"
          required
          placeholder="例如：deepseek-chat / gpt-4o"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-strategy-gold"
        />
      </div>

      {/* Test Result Feedback */}
      {testingAi && (
        <div className="p-2.5 bg-slate-950/80 border border-strategy-gold/40 rounded-lg text-xs text-strategy-gold flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-strategy-gold" />
          <span>正在向 {baseUrl} 发送心跳测试探针，验证 API 密钥与模型可用性...</span>
        </div>
      )}

      {testResult && (
        <div
          className={`p-3 rounded-lg text-xs flex items-start space-x-2 border ${
            testResult.success
              ? 'bg-emerald-950/50 border-emerald-700/70 text-emerald-300'
              : 'bg-rose-950/50 border-rose-700/70 text-rose-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <span className="font-bold">
              {testResult.success ? '✅ API 联通测试成功' : '❌ API 联通测试失败'}
            </span>
            <p className="font-mono text-[11px] leading-relaxed break-all opacity-90">
              {testResult.message}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <button
          type="button"
          disabled={testingAi || (!apiKey.trim() && !hasApiKey)}
          onClick={handleTestConnection}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
          title="向服务商接口发送探针，即时检验 API Key 与 Base URL 是否正确"
        >
          {testingAi ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Wifi className="w-3.5 h-3.5 text-strategy-gold" />
          )}
          <span>测试 API 连接</span>
        </button>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-emerald-400 font-medium">
            {savedAiStatus ? '✓ 配置已成功更新并安全持久化' : ''}
          </span>
          <button
            type="submit"
            className="px-5 py-2 bg-gradient-to-r from-amber-600 to-strategy-gold hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs transition shadow"
          >
            保存模型设定
          </button>
        </div>
      </div>
    </form>
  );
};
