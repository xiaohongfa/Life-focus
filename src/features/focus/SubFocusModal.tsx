import React, { useState, useEffect, useCallback } from 'react';
import type { Focus, FocusSubItem } from '../../api/types';
import { api } from '../../api/client';
import { X, Plus, CheckCircle2, Circle, Trash2, ListTodo, Award, Calendar, Sparkles, Check, Clock, XCircle } from 'lucide-react';
import { AICommandModal } from '../../components/AICommandModal';
import { decomposeFocusSubItems } from '../../services/llmService';

interface SubFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  lifeId: string;
  focus: Focus | null;
  onUpdated?: () => void;
}

export const SubFocusModal: React.FC<SubFocusModalProps> = ({
  isOpen,
  onClose,
  lifeId,
  focus,
  onUpdated,
}) => {
  const [items, setItems] = useState<FocusSubItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBodyMd, setNewBodyMd] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // AI Decompose State (§12, §7)
  const [isAiCmdOpen, setIsAiCmdOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiProposals, setAiProposals] = useState<{ title: string; body_md: string }[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  const loadSubItems = useCallback(async () => {
    if (!focus) return;
    setLoading(true);
    try {
      const data = await api.getSubFoci(lifeId, focus.id);
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load sub-focus items:', err);
    } finally {
      setLoading(false);
    }
  }, [lifeId, focus]);

  useEffect(() => {
    if (isOpen && focus) {
      loadSubItems();
    }
  }, [isOpen, focus, loadSubItems]);

  if (!isOpen || !focus) return null;

  const handleStatusChange = async (item: FocusSubItem, nextStatus: string) => {
    try {
      await api.updateSubFocusStatus(lifeId, item.id, nextStatus);
      await loadSubItems();
      onUpdated?.();
    } catch (err) {
      console.error('Failed to update sub-focus status:', err);
    }
  };

  const handleToggle = async (item: FocusSubItem) => {
    let nextStatus = 'todo';
    if (item.status === 'todo') nextStatus = 'in_progress';
    else if (item.status === 'in_progress') nextStatus = 'done';
    else if (item.status === 'done') nextStatus = 'todo';
    else if (item.status === 'canceled') nextStatus = 'todo';
    await handleStatusChange(item, nextStatus);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.createSubFocus(lifeId, focus.id, newTitle.trim(), newBodyMd.trim() || undefined);
      setNewTitle('');
      setNewBodyMd('');
      setIsAdding(false);
      await loadSubItems();
      onUpdated?.();
    } catch (err) {
      console.error('Failed to create sub-focus item:', err);
    }
  };

  const handleDelete = async (subId: string) => {
    try {
      await api.deleteSubFocus(lifeId, subId);
      await loadSubItems();
      onUpdated?.();
    } catch (err) {
      console.error('Failed to delete sub-focus item:', err);
    }
  };

  const handleRunAiDecompose = async (requirement: string) => {
    setIsGeneratingAi(true);
    try {
      const proposals = await decomposeFocusSubItems(focus, {}, requirement);
      setAiProposals(proposals);
      setSelectedIndices(proposals.map((_, i) => i));
      setIsAiCmdOpen(false);
      setIsPreviewOpen(true);
    } catch (err) {
      console.error('Failed to decompose sub-focus:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAcceptProposals = async () => {
    try {
      for (const idx of selectedIndices) {
        const p = aiProposals[idx];
        if (p && p.title.trim()) {
          await api.createSubFocus(lifeId, focus.id, p.title.trim(), p.body_md?.trim() || undefined);
        }
      }
      setIsPreviewOpen(false);
      await loadSubItems();
      onUpdated?.();
    } catch (err) {
      console.error('Failed to accept sub-focus proposals:', err);
    }
  };

  const totalCount = items.length;
  const doneCount = items.filter((i) => i.status === 'done').length;
  const canceledCount = items.filter((i) => i.status === 'canceled').length;
  const activeCount = totalCount - canceledCount;
  const percent = activeCount > 0 ? Math.round((doneCount / activeCount) * 100) : (totalCount > 0 && doneCount === totalCount ? 100 : 0);
  const isAllDone = activeCount > 0 && doneCount === activeCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-strategy-gold/60 rounded-xl shadow-[0_0_30px_rgba(217,119,6,0.25)] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-strategy-gold/10 border border-strategy-gold/30 rounded-lg text-strategy-gold">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-mono text-strategy-gold tracking-wider">
                  国策阶段执行拆解
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {focus.status}
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-slate-100 line-clamp-1">
                {focus.title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar & Summary */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">
              达成进度：
              <span className="font-mono font-bold text-slate-200 ml-1">
                {doneCount} / {totalCount} 步骤 ({percent}%)
              </span>
            </span>
            {isAllDone && (
              <span className="flex items-center space-x-1 text-emerald-400 font-bold text-xs">
                <Award className="w-3.5 h-3.5" />
                <span>各项子指标全线告捷</span>
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isAllDone
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-amber-600 to-strategy-gold'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Sub-Focus Checklist Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">正在加载子国策步骤...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <ListTodo className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 font-medium">尚未为此国策拆分子步骤</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                将宏大的长期国策分解为若干具体的阶段目标或先导措施，稳扎稳打推进落实。
              </p>
              <div className="flex items-center space-x-2 mt-4 justify-center">
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-1.5 bg-strategy-gold/10 hover:bg-strategy-gold/20 text-strategy-gold border border-strategy-gold/40 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>拟定首个子国策步骤</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAiCmdOpen(true)}
                  className="px-4 py-1.5 bg-amber-950/70 hover:bg-amber-900 border border-amber-500/50 text-amber-300 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1.5 shadow"
                  title="输入定制需求，让 AI 参谋一键拆解执行路径"
                >
                  <Sparkles className="w-3.5 h-3.5 text-strategy-gold" />
                  <span>AI 一键拆解执行路径</span>
                </button>
              </div>
            </div>
          ) : (
            items.map((item, idx) => {
              const isDone = item.status === 'done';
              const isInProgress = item.status === 'in_progress';
              const isCanceled = item.status === 'canceled';
              return (
                <div
                  key={item.id}
                  className={`group flex items-start justify-between p-3.5 rounded-lg border transition ${
                    isDone
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-85'
                      : isCanceled
                      ? 'bg-rose-950/20 border-rose-900/40 opacity-70'
                      : isInProgress
                      ? 'bg-amber-950/20 border-amber-600/40 shadow-sm'
                      : 'bg-slate-800/40 border-slate-700/80 hover:border-strategy-gold/50 shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3 flex-1 min-w-0 mr-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      className="mt-0.5 text-slate-400 hover:text-strategy-gold transition shrink-0"
                      title={`当前状态: ${item.status}，点击快速切换状态`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : isCanceled ? (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      ) : isInProgress ? (
                        <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-500 group-hover:text-amber-400" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono text-[10px] text-strategy-gold/80 px-1 py-0.2 bg-slate-900 rounded">
                          #{idx + 1}
                        </span>
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item, e.target.value)}
                          className={`text-[10px] font-mono rounded px-1.5 py-0.5 border cursor-pointer focus:outline-none ${
                            isDone
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                              : isCanceled
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                              : isInProgress
                              ? 'bg-amber-950/60 text-amber-300 border-amber-600/60'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="todo">待办 (TODO)</option>
                          <option value="in_progress">推进中 (IN_PROGRESS)</option>
                          <option value="done">已达成 (DONE)</option>
                          <option value="canceled">已作废 (CANCELED)</option>
                        </select>
                        <h5
                          className={`text-sm font-medium leading-snug break-words ${
                            isDone
                              ? 'line-through text-slate-500'
                              : isCanceled
                              ? 'line-through text-rose-400/70'
                              : isInProgress
                              ? 'text-amber-200'
                              : 'text-slate-100'
                          }`}
                        >
                          {item.title}
                        </h5>
                      </div>
                      {item.body_md && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words whitespace-pre-wrap">
                          {item.body_md}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{item.created_at.slice(0, 10)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800 transition shrink-0"
                    title="删除此步骤"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}

          {/* Add Sub-Focus Item Form */}
          {isAdding && (
            <form
              onSubmit={handleCreate}
              className="p-4 bg-slate-950/70 border border-strategy-gold/40 rounded-xl space-y-3 mt-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-strategy-gold flex items-center space-x-1">
                  <Plus className="w-3.5 h-3.5" />
                  <span>追加子国策执行阶段</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-500 hover:text-slate-300 text-xs"
                >
                  取消
                </button>
              </div>
              <div>
                <input
                  type="text"
                  required
                  placeholder="子国策标题（例如：完成第一阶段调研 / 组建核心攻坚小组）"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-strategy-gold"
                  autoFocus
                />
              </div>
              <div>
                <textarea
                  rows={2}
                  placeholder="阶段性补充说明、衡量标准或行动备注（可选）"
                  value={newBodyMd}
                  onChange={(e) => setNewBodyMd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-strategy-gold resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  放弃
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-strategy-gold text-slate-950 font-bold rounded-lg text-xs hover:brightness-110 shadow"
                >
                  确认下达子步骤
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90">
          <div className="flex items-center space-x-2">
            {!isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-strategy-gold border border-strategy-gold/30 rounded-lg text-xs font-bold transition flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>添加子国策</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAiCmdOpen(true)}
              className="px-3 py-1.5 bg-amber-950/70 hover:bg-amber-900 border border-strategy-gold/40 text-strategy-gold rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
              title="输入定制要求，让 AI 参谋将该国策细化拆解为多个步骤"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 定制拆解</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
          >
            关闭清单
          </button>
        </div>
      </div>

      {/* AI Sub-Focus Proposals Preview Modal (§12.1: 先预览、后接受) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-strategy-gold/60 rounded-xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-strategy-gold" />
                <h3 className="text-base font-serif font-bold text-slate-100">
                  AI 阶段执行步骤候选预览
                </h3>
              </div>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              参谋部已根据你的指令拆解出以下步骤。你可以勾选所需步骤、直接编辑标题与要点，点击确认后批量写入：
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {aiProposals.map((item, idx) => {
                const isChecked = selectedIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border transition ${
                      isChecked ? 'bg-slate-800/80 border-strategy-gold/60' : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedIndices((prev) =>
                            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                          );
                        }}
                        className="mt-1 accent-amber-500 rounded cursor-pointer"
                      />
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAiProposals((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, title: val } : p))
                            );
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-bold text-strategy-gold focus:outline-none focus:border-strategy-gold"
                        />
                        <textarea
                          rows={2}
                          value={item.body_md}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAiProposals((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, body_md: val } : p))
                            );
                          }}
                          placeholder="补充说明（可选）"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-strategy-gold resize-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-3">
              <span className="text-xs text-slate-400">
                已选中 {selectedIndices.length} / {aiProposals.length} 项
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAcceptProposals}
                  disabled={selectedIndices.length === 0}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-strategy-gold text-slate-950 font-bold rounded-lg text-xs hover:brightness-110 disabled:opacity-40 transition flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>采纳并批量追加至子国策</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Command Input Modal */}
      <AICommandModal
        isOpen={isAiCmdOpen}
        onClose={() => setIsAiCmdOpen(false)}
        title={`AI 拆解国策「${focus.title}」执行步骤`}
        subtitle="请告诉参谋部你的拆解偏好、执行约束或阶段规划（例如：强调前置准备/按月推进/风险优先）"
        placeholder="例如：分为调研、原型和攻坚三个阶段；重点突出技术难点攻关与交付物指标..."
        onGenerate={handleRunAiDecompose}
        isGenerating={isGeneratingAi}
        showStyleSelector={false}
      />
    </div>
  );
};
