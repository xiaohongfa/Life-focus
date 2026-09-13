import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import {
  Settings,
  X,
  Bot,
  Download,
  FileCode,
  FileText,
  Check,
  Shield,
  Key,
  Copy,
  Database,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Sparkles,
  RotateCcw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { testLLMConnection } from '../services/llmService';
import { promptStore, PromptItem } from '../services/promptStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lifeId: string;
  lifeName: string;
  onDeleteLife?: (lifeId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  lifeId,
  lifeName,
  onDeleteLife,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ai' | 'prompts' | 'export' | 'storage'>('ai');

  // Delete Life State
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [isDeletingLife, setIsDeletingLife] = useState(false);

  // AI Provider settings
  const [provider, setProvider] = useState<'deepseek' | 'openai' | 'gemini' | 'custom'>('deepseek');
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [savedAiStatus, setSavedAiStatus] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Prompt settings
  const [promptList, setPromptList] = useState<PromptItem[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('system_context');
  const [editingPromptText, setEditingPromptText] = useState<string>('');
  const [savedPromptStatus, setSavedPromptStatus] = useState<string | null>(null);

  // Export states
  const [exporting, setExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    // 加载本地已保存的配置
    const savedConfig = localStorage.getItem('life_strategy_llm_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.provider) setProvider(parsed.provider);
        if (parsed.baseUrl) setBaseUrl(parsed.baseUrl);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.model) setModel(parsed.model);
      } catch (e) {
        console.error('Failed to parse saved LLM config:', e);
      }
    }
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

  const handleSaveAiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const config = { provider, baseUrl, apiKey, model };
    localStorage.setItem('life_strategy_llm_config', JSON.stringify(config));
    setSavedAiStatus(true);
    setTimeout(() => setSavedAiStatus(false), 2000);
  };

  const handleTestConnection = async () => {
    setTestingAi(true);
    setTestResult(null);
    try {
      const res = await testLLMConnection({ provider, baseUrl, apiKey, model });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || String(err) });
    } finally {
      setTestingAi(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const items = promptStore.getAllPromptItems();
      setPromptList(items);
      const curr = items.find((p) => p.id === selectedPromptId) || items[0];
      if (curr) {
        setSelectedPromptId(curr.id);
        setEditingPromptText(curr.currentPrompt);
      }
    }
  }, [isOpen]);

  const refreshPrompts = (targetId?: string) => {
    const items = promptStore.getAllPromptItems();
    setPromptList(items);
    const idToUse = targetId || selectedPromptId;
    const curr = items.find((p) => p.id === idToUse) || items[0];
    if (curr) {
      setSelectedPromptId(curr.id);
      setEditingPromptText(curr.currentPrompt);
    }
  };

  const handleSelectPrompt = (id: string) => {
    setSelectedPromptId(id);
    const p = promptList.find((item) => item.id === id);
    if (p) {
      setEditingPromptText(p.currentPrompt);
    }
  };

  const handleSavePrompt = () => {
    promptStore.setPrompt(selectedPromptId, editingPromptText);
    refreshPrompts(selectedPromptId);
    setSavedPromptStatus('已保存并即时生效');
    setTimeout(() => setSavedPromptStatus(null), 2500);
  };

  const handleResetCurrentPrompt = () => {
    promptStore.resetPrompt(selectedPromptId);
    refreshPrompts(selectedPromptId);
    setSavedPromptStatus('已恢复该项默认设定');
    setTimeout(() => setSavedPromptStatus(null), 2500);
  };

  const handleResetAllPrompts = () => {
    if (!window.confirm('确认将所有 AI 提示词重置为官方默认模板？')) return;
    promptStore.resetAll();
    refreshPrompts();
    setSavedPromptStatus('已重置所有提示词为官方出厂模板');
    setTimeout(() => setSavedPromptStatus(null), 2500);
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    try {
      const md = await api.exportLifeMarkdown(lifeId);
      downloadFile(`${lifeName}_战略档案_${new Date().toISOString().slice(0, 10)}.md`, md, 'text/markdown');
    } catch (err) {
      console.error('Failed to export markdown:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const json = await api.exportLifeJson(lifeId);
      downloadFile(`${lifeName}_结构化数据包_${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json');
    } catch (err) {
      console.error('Failed to export JSON:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const md = await api.exportLifeMarkdown(lifeId);
      await navigator.clipboard.writeText(md);
      setCopySuccess('md');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-strategy-gold/60 rounded-xl shadow-[0_0_40px_rgba(217,119,6,0.25)] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-strategy-gold/15 rounded text-strategy-gold border border-strategy-gold/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-slate-100">系统战略控制台 (Settings)</h3>
              <span className="text-xs text-slate-400">§12.5 模型与密钥配置 · §16 档案数据安全与导出</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center space-x-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveSubTab('ai')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-bold transition ${
              activeSubTab === 'ai'
                ? 'border-strategy-gold text-strategy-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI 模型与服务商 (§12.5)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('prompts')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-bold transition ${
              activeSubTab === 'prompts'
                ? 'border-strategy-gold text-strategy-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI 提示词通道 (Prompts)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('export')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-bold transition ${
              activeSubTab === 'export'
                ? 'border-strategy-gold text-strategy-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>数据导出与携带 (§16)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('storage')}
            className={`flex items-center space-x-1.5 px-3 py-2 border-b-2 text-xs font-bold transition ${
              activeSubTab === 'storage'
                ? 'border-strategy-gold text-strategy-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>本地存储与隐私</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: AI MODEL CONFIG */}
          {activeSubTab === 'ai' && (
            <form onSubmit={handleSaveAiConfig} className="space-y-4">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 leading-relaxed">
                <span className="text-strategy-gold font-bold">本地隐私承诺：</span>
                API Key 仅保存在你的本机安全存储中，绝不写入人生 SQLite 数据库或云端同步，也不会在导出文件中泄露。
              </div>

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
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center space-x-1">
                  <Key className="w-3.5 h-3.5 text-strategy-gold" />
                  <span>API 密钥 (API Key)</span>
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
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
                  disabled={testingAi || !apiKey.trim()}
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
          )}

          {/* TAB: PROMPT ENGINEERING */}
          {activeSubTab === 'prompts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed">
                <div>
                  <span className="text-strategy-gold font-bold">提示词透明与自定义通道：</span>
                  在此查看并自由修改系统下发给大模型的各场景指令。修改后立即生效，支持随时一键恢复出厂预设。
                </div>
                <button
                  type="button"
                  onClick={handleResetAllPrompts}
                  className="px-2.5 py-1 text-[11px] bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded transition shrink-0 ml-3 flex items-center space-x-1"
                  title="清空所有自定义覆盖，全部恢复默认"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>全部恢复默认</span>
                </button>
              </div>

              {/* Prompt Selection Tabs */}
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/80 border border-slate-800 rounded-lg">
                {promptList.map((p) => {
                  const isSelected = p.id === selectedPromptId;
                  const isCustomized = p.currentPrompt.trim() !== p.defaultPrompt.trim();
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPrompt(p.id)}
                      className={`px-2.5 py-1 rounded text-xs transition flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-amber-600/30 text-strategy-gold border border-strategy-gold font-bold shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <span>{p.title.split('·')[0].trim()}</span>
                      {isCustomized && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="已自定义覆盖" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Prompt Detail Box */}
              {(() => {
                const activeItem = promptList.find((p) => p.id === selectedPromptId);
                if (!activeItem) return null;
                const isCustomized = activeItem.currentPrompt.trim() !== activeItem.defaultPrompt.trim();

                return (
                  <div className="space-y-2.5 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-serif font-bold text-slate-100">{activeItem.title}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                              isCustomized
                                ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isCustomized ? '已启用自定义覆盖' : '当前使用官方默认模板'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{activeItem.description}</p>
                      </div>

                      <button
                        type="button"
                        disabled={!isCustomized}
                        onClick={handleResetCurrentPrompt}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 border border-slate-700 rounded transition flex items-center space-x-1 shrink-0"
                        title="恢复本项为官方默认提示词"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>恢复该项默认</span>
                      </button>
                    </div>

                    <div>
                      <textarea
                        rows={9}
                        value={editingPromptText}
                        onChange={(e) => setEditingPromptText(e.target.value)}
                        placeholder="输入你期望的专属提示词指令..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-strategy-gold leading-relaxed resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs text-emerald-400 font-medium">
                        {savedPromptStatus ? `✓ ${savedPromptStatus}` : ''}
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePrompt}
                        className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-strategy-gold hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs transition shadow flex items-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>保存此项提示词</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: DATA EXPORT */}
          {activeSubTab === 'export' && (
            <div className="space-y-5">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 leading-relaxed">
                §16: 提供面向人类可读的 **Markdown 战略档案** 与机器可解析的 **版本化 JSON 数据包**。导出严格限定于当前人生空间「{lifeName}」，不包含任何敏感密钥。
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Markdown Export Card */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-strategy-gold font-serif font-bold text-sm">
                      <FileText className="w-4 h-4" />
                      <span>Markdown 战略纪实档案</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      将领袖自述、当前局势、哲学底座、特质谱系、进行中国策及待执行决议一键排版为清晰的 Markdown 文档。
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      type="button"
                      disabled={exporting}
                      onClick={handleExportMarkdown}
                      className="flex-1 py-2 px-3 bg-strategy-gold hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下载 .md 档案</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyMarkdown}
                      className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition"
                      title="复制 Markdown 正文到剪贴板"
                    >
                      {copySuccess === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* JSON Export Card */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sky-400 font-serif font-bold text-sm">
                      <FileCode className="w-4 h-4" />
                      <span>JSON 完整结构化数据</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      包含 Schema 版本清单、所有领域对象及子国策阶段任务完整 ID 与关系，供异地冷备或二次开发分析。
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={exporting}
                      onClick={handleExportJson}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-600/50 font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下载 .json 数据包</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STORAGE & PRIVACY */}
          {activeSubTab === 'storage' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-strategy-gold font-bold text-sm">
                  <Shield className="w-4 h-4" />
                  <span>本地绝对优先架构 (Local-First Guarantee)</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <p>
                    • **数据存储物理路径**：本应用所有战略数据统一持久化于本机标准的 SQLite 数据库中，路径位于操作系统的 AppData / Roaming 用户本地目录。
                  </p>
                  <p>
                    • **零后台秘密上传**：除非你在国策画布或参谋部主动点击明确的 AI 按钮，否则软件永远不会向任何外部服务器发送你的任何人生数据。
                  </p>
                  <p>
                    • **版本一致性迁移保障**：内置 SQLite 迁移引擎，未来任何新增表或字段均在保留你既有数据的可恢复边界内自动完成。
                  </p>
                </div>
              </div>

              {/* 危险区：彻底删档 (Delete Save Slot) */}
              {onDeleteLife && (
                <div className="p-4 rounded-xl bg-rose-950/30 border-2 border-rose-800/80 space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 font-serif font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>危险操作：彻底删除当前人生空间 (删档)</span>
                  </div>
                  <p className="text-xs text-rose-200/80 leading-relaxed">
                    此操作将通过 SQLite 外键级联彻底清除当前人生空间「<strong className="text-amber-300 font-mono">{lifeName}</strong>」下的全部数据（包括所有国策树、心智特质、内阁会议记录、意识形态、随笔与历史事件）。
                    <strong>该操作不可逆，数据无法恢复！</strong> 若删除了最后一个空间，系统将自动重新创建一个崭新的默认空间。
                  </p>
                  <div className="pt-2 border-t border-rose-900/60 space-y-2">
                    <label className="block text-xs text-slate-300 font-medium">
                      请输入当前人生空间名称 <span className="text-strategy-gold font-bold font-mono">"{lifeName}"</span> 确认删档：
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={confirmDeleteInput}
                        onChange={(e) => setConfirmDeleteInput(e.target.value)}
                        placeholder={`输入 ${lifeName} 确认`}
                        className="flex-1 bg-slate-900 border border-rose-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                      />
                      <button
                        type="button"
                        disabled={confirmDeleteInput.trim() !== lifeName || isDeletingLife}
                        onClick={async () => {
                          if (!window.confirm(`二次确认：真的要彻底清除「${lifeName}」的所有档案数据吗？`)) return;
                          setIsDeletingLife(true);
                          try {
                            await onDeleteLife(lifeId);
                            setConfirmDeleteInput('');
                            onClose();
                          } finally {
                            setIsDeletingLife(false);
                          }
                        }}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{isDeletingLife ? '正在删除...' : '彻底删档 (不可撤销)'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/90">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
          >
            完成并关闭
          </button>
        </div>
      </div>
    </div>
  );
};
