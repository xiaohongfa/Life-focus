import React, { useState } from 'react';
import { Settings, X, Bot, Download, Database, Sparkles } from 'lucide-react';
import { LlmSettingsTab } from './settings/LlmSettingsTab';
import { PromptSettingsTab } from './settings/PromptSettingsTab';
import { ExportSettingsTab } from './settings/ExportSettingsTab';
import { StorageDangerTab } from './settings/StorageDangerTab';

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
              <h3 className="text-base font-serif font-bold text-slate-100">
                系统战略控制台 (Settings)
              </h3>
              <span className="text-xs text-slate-400">
                §12.5 模型与密钥配置 · §16 档案数据安全与导出
              </span>
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
          {activeSubTab === 'ai' && <LlmSettingsTab />}
          {activeSubTab === 'prompts' && <PromptSettingsTab />}
          {activeSubTab === 'export' && (
            <ExportSettingsTab lifeId={lifeId} lifeName={lifeName} />
          )}
          {activeSubTab === 'storage' && (
            <StorageDangerTab
              lifeId={lifeId}
              lifeName={lifeName}
              onDeleteLife={onDeleteLife}
              onClose={onClose}
            />
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
