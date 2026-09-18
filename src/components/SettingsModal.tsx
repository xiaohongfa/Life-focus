import React, { useState } from 'react';
import { Settings, X, Bot, Download, Database, Sparkles, Volume2 } from 'lucide-react';
import { LlmSettingsTab } from './settings/LlmSettingsTab';
import { PromptSettingsTab } from './settings/PromptSettingsTab';
import { ExportSettingsTab } from './settings/ExportSettingsTab';
import { StorageDangerTab } from './settings/StorageDangerTab';
import { AudioSettingsTab } from './settings/AudioSettingsTab';
import { soundFx } from '../utils/soundEffects';

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
  const [activeSubTab, setActiveSubTab] = useState<'ai' | 'audio' | 'prompts' | 'export' | 'storage'>('ai');

  if (!isOpen) return null;

  const handleTabClick = (tab: 'ai' | 'audio' | 'prompts' | 'export' | 'storage') => {
    soundFx.playClick();
    setActiveSubTab(tab);
  };

  const handleClose = () => {
    soundFx.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      {/* HOI4 Options Dialog Frame (素材图 2) */}
      <div className="relative w-full max-w-2xl hoi4-window rounded-lg border-2 border-[#4a5666] flex flex-col max-h-[88vh] overflow-hidden shadow-2xl">
        {/* Header Bar with Steel Texture & Iconic Close Button */}
        <div className="hoi4-header-bar flex items-center justify-between px-6 py-3.5 border-b border-[#3b4452]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#171c22] rounded text-[#fbbf24] border border-[#444f5e]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-serif font-black text-[#ffffff] tracking-wide">
                战略战役控制台 (OPTIONS & SETTINGS)
              </h3>
              <span className="text-[11px] font-mono text-[#94a3b8]">
                §12.5 AI 模型永久凭据 · 战役音响 · 便携版无感更新 · 档案隔离
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="hoi4-close-btn rounded"
            title="关闭控制台"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Segmented Sub Navigation Tabs */}
        <div className="flex items-center space-x-1.5 px-6 pt-2 pb-2 bg-[#121519] border-b border-[#2a323d] overflow-x-auto">
          {[
            { id: 'ai', label: 'AI 模型与密钥', icon: Bot },
            { id: 'audio', label: '战役音效音量', icon: Volume2 },
            { id: 'prompts', label: 'AI 提示词通道', icon: Sparkles },
            { id: 'export', label: '数据导出与携带', icon: Download },
            { id: 'storage', label: '本地存储与便携迁移', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'hoi4-btn-steel-active text-[#ffffff] border-b-2 border-b-[#fbbf24]'
                    : 'hoi4-btn-steel text-[#cbd5e1] hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#fbbf24]' : 'text-[#94a3b8]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#161a20]">
          {activeSubTab === 'ai' && <LlmSettingsTab />}
          {activeSubTab === 'audio' && <AudioSettingsTab />}
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
        <div className="flex justify-end px-6 py-3 border-t border-[#2d3642] bg-[#121519]">
          <button
            type="button"
            onClick={handleClose}
            className="hoi4-btn-military px-6 py-1.5 rounded text-xs font-serif font-bold shadow transition"
          >
            完成并关闭 (DONE)
          </button>
        </div>
      </div>
    </div>
  );
};
