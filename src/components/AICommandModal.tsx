import React, { useState } from 'react';
import { Sparkles, X, Send, Bot, ShieldCheck, AlertCircle, Settings } from 'lucide-react';
import { isLLMConfigured, getLLMConfig } from '../services/llmService';

export interface AICommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  defaultRequirement?: string;
  placeholder?: string;
  showStyleSelector?: boolean;
  onGenerate: (requirement: string, style: string) => Promise<void>;
  isGenerating?: boolean;
  onOpenSettings?: () => void;
}

export const AICommandModal: React.FC<AICommandModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  defaultRequirement = '',
  placeholder = '在此输入你的特定想法、现实约束或战略意向（例如：“偏重防守保底”、“预期3个月见效”、“精力受限”、“注重技术沉淀而非短期利益”等）...',
  showStyleSelector = true,
  onGenerate,
  isGenerating = false,
  onOpenSettings,
}) => {
  const [requirement, setRequirement] = useState(defaultRequirement);
  const [selectedStyle, setSelectedStyle] = useState('战略史书');

  if (!isOpen) return null;

  const hasApiKey = isLLMConfigured();
  const config = getLLMConfig();

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    await onGenerate(requirement.trim(), selectedStyle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border-2 border-amber-500/60 rounded-xl shadow-[0_0_40px_rgba(217,119,6,0.3)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-strategy-gold/15 border border-strategy-gold/40 rounded-lg text-strategy-gold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-slate-100">{title}</h3>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Engine Status Banner */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-strategy-gold shrink-0" />
            {hasApiKey ? (
              <span className="flex items-center space-x-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  大模型在线：{config.provider.toUpperCase()} ({config.model})
                </span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400/90">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>本地增强型情境推演引擎（未配置云端 API 密钥）</span>
              </span>
            )}
          </div>
          {onOpenSettings && !hasApiKey && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline flex items-center space-x-1"
            >
              <Settings className="w-3 h-3" />
              <span>配置密钥</span>
            </button>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleRun} className="p-6 space-y-4">
          {/* User Prompt / Requirement Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span>输入具体生成需求与战略意图 (Prompt)</span>
              <span className="text-[11px] text-slate-500">可选，留空将按全局综合最优推演</span>
            </label>
            <textarea
              rows={4}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-strategy-gold resize-none leading-relaxed"
              autoFocus
            />
          </div>

          {/* Style Selector (§12.3) */}
          {showStyleSelector && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                叙事风格与文体语调 (§12.3)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: '战略史书', desc: '深沉典雅，古今互鉴' },
                  { id: '冷静客观', desc: '直击要害，利弊分明' },
                  { id: '公文严谨', desc: '体例规范，指标量化' },
                  { id: '史诗恢宏', desc: '张力十足，气势磅礴' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStyle(s.id)}
                    className={`p-2 rounded-lg border text-left transition ${
                      selectedStyle === s.id
                        ? 'bg-amber-950/50 border-strategy-gold text-strategy-gold shadow-sm'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{s.id}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-strategy-gold hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs transition shadow-lg flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                  <span>战略推演思考中...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>启动战略推演</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
