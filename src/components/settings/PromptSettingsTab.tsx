import React, { useState, useEffect } from 'react';
import { RotateCcw, Check } from 'lucide-react';
import { promptStore, PromptItem } from '../../services/promptStore';

export const PromptSettingsTab: React.FC = () => {
  const [promptList, setPromptList] = useState<PromptItem[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('system_context');
  const [editingPromptText, setEditingPromptText] = useState<string>('');
  const [savedPromptStatus, setSavedPromptStatus] = useState<string | null>(null);

  useEffect(() => {
    const items = promptStore.getAllPromptItems();
    setPromptList(items);
    const curr = items.find((p) => p.id === selectedPromptId) || items[0];
    if (curr) {
      setSelectedPromptId(curr.id);
      setEditingPromptText(curr.currentPrompt);
    }
  }, []);

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

  const activeItem = promptList.find((p) => p.id === selectedPromptId);
  const isCustomized = activeItem
    ? activeItem.currentPrompt.trim() !== activeItem.defaultPrompt.trim()
    : false;

  return (
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
          const customized = p.currentPrompt.trim() !== p.defaultPrompt.trim();
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
              {customized && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="已自定义覆盖" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active Prompt Detail Box */}
      {activeItem && (
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
      )}
    </div>
  );
};
