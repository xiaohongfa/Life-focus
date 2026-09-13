import React, { useState, useEffect } from 'react';
import type { Decision } from '../../api/types';
import { api } from '../../api/client';
import { CheckSquare, Plus, Check, Minus, RotateCcw, XCircle, Tag, Sparkles, X } from 'lucide-react';
import { AICommandModal } from '../../components/AICommandModal';
import { recommendDecisions, StrategyContext } from '../../services/llmService';
import { soundFx } from '../../utils/soundEffects';

interface DecisionViewProps {
  lifeId: string;
}

export const DecisionView: React.FC<DecisionViewProps> = ({ lifeId }) => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [activeFilter, setActiveFilter] = useState<'open' | 'completed' | 'abandoned' | 'all'>('open');

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [category, setCategory] = useState('');
  const [kind, setKind] = useState<'one_off' | 'repeatable'>('repeatable');
  const [targetTime, setTargetTime] = useState('');

  // AI Decision State (§8, §12)
  const [aiCmdOpen, setAiCmdOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiProposals, setAiProposals] = useState<{ title: string; bodyMd: string; kind: 'one_off' | 'repeatable'; category: string }[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [strategyContext, setStrategyContext] = useState<StrategyContext>({});

  useEffect(() => {
    loadData();
  }, [lifeId]);

  const loadData = async () => {
    try {
      const [data, overview] = await Promise.all([
        api.getDecisions(lifeId),
        api.getWorldOverview(lifeId).catch(() => null),
      ]);
      setDecisions(data);
      if (overview) {
        setStrategyContext({
          lifeId,
          lifeName: overview.life.name,
          leaderName: overview.leader?.name,
          leaderBody: overview.leader?.body_md,
          situation: overview.situation?.body_md,
          philosophy: overview.philosophy?.body_md,
          stability: overview.stability.current_value,
          traits: overview.traits,
          activeFoci: overview.active_foci,
        });
      }
    } catch (err) {
      console.error('Failed to load decisions', err);
    }
  };

  const handleRunAi = async (requirement: string) => {
    setIsGeneratingAi(true);
    try {
      const list = await recommendDecisions(strategyContext, requirement);
      setAiProposals(list);
      setSelectedIndices(list.map((_, i) => i));
      setAiCmdOpen(false);
      setPreviewOpen(true);
    } catch (err) {
      console.error('Failed to recommend decisions:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAcceptProposals = async () => {
    try {
      for (const idx of selectedIndices) {
        const p = aiProposals[idx];
        if (!p || !p.title.trim()) continue;
        await api.createDecision(lifeId, p.title.trim(), p.bodyMd.trim(), p.kind, p.category.trim() || undefined);
      }
      setPreviewOpen(false);
      setAiProposals([]);
      loadData();
    } catch (err) {
      console.error('Failed to accept decisions', err);
    }
  };

  const handleRecordOccurrence = async (decisionId: string) => {
    try {
      soundFx.playStamp();
      await api.recordDecisionOccurrence(lifeId, decisionId);
      loadData();
    } catch (err) {
      console.error('Failed to record occurrence', err);
    }
  };

  const handleDecrementOccurrence = async (decisionId: string) => {
    try {
      soundFx.playVoid();
      await api.decrementDecisionOccurrence(lifeId, decisionId);
      loadData();
    } catch (err) {
      console.error('Failed to decrement occurrence', err);
    }
  };

  const handleAbandon = async (decisionId: string) => {
    try {
      soundFx.playVoid();
      await api.updateDecisionStatus(lifeId, decisionId, 'abandoned', '用户选择放弃此决议');
      loadData();
    } catch (err) {
      console.error('Failed to abandon decision', err);
    }
  };

  const handleReopen = async (decisionId: string) => {
    try {
      soundFx.playClick();
      await api.updateDecisionStatus(lifeId, decisionId, 'open', '重新启用');
      loadData();
    } catch (err) {
      console.error('Failed to reopen decision', err);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const created = await api.createDecision(
        lifeId,
        title.trim(),
        bodyMd.trim(),
        kind,
        category.trim() || undefined,
        targetTime.trim() || undefined
      );
      setDecisions((prev) => [created, ...prev]);
      setTitle('');
      setBodyMd('');
      setCategory('');
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create decision', err);
    }
  };

  const filteredDecisions = decisions.filter((d) => {
    if (activeFilter === 'all') return true;
    return d.status === activeFilter;
  });

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] select-none">
      <div className="dossier-card border-2 border-[#967b36] p-6 rounded-sm space-y-4 shadow-[0_6px_24px_rgba(0,0,0,0.65)] relative">
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />

        <div className="flex items-center justify-between border-b border-[#334237] pb-3">
          <div>
            <h3 className="font-serif font-bold text-base text-strategy-gold flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-strategy-gold" />
              <span className="gold-gradient-text">战略决议待办 (DECISIONS · 独立待办小事项)</span>
            </h3>
            <p className="text-xs text-[#8b9b8f] mt-1 font-serif">
              独立小事待办机制，支持单次与无限次完成，无冷却强制，战术任务实时记数。
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setAiCmdOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#221a10] hover:bg-[#2e2316] border border-[#a38237]/70 text-strategy-gold rounded-sm text-xs font-mono font-bold transition shadow"
              title="输入生活场景或战略诉求，让 AI 参谋启发可执行的决议待办"
            >
              <Sparkles className="w-3.5 h-3.5 text-strategy-gold" />
              <span>AI 启发决议</span>
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setShowModal(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>制定新决议</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex space-x-2 text-xs">
          {(['open', 'completed', 'abandoned', 'all'] as const).map((filter) => {
            const labels = { open: '待执行', completed: '已完成', abandoned: '已放弃', all: '全部' };
            const count = decisions.filter((d) => (filter === 'all' ? true : d.status === filter)).length;
            return (
              <button
                key={filter}
                onClick={() => {
                  soundFx.playClick();
                  setActiveFilter(filter);
                }}
                className={`px-3 py-1 rounded-sm font-mono transition ${
                  activeFilter === filter
                    ? 'bg-[#cfa847] text-black font-bold shadow-sm'
                    : 'text-[#8b9b8f] hover:text-[#e7e0cc] bg-[#141b16] border border-[#2b382d]'
                }`}
              >
                <span>{labels[filter]}</span>
                <span className="ml-1.5 opacity-80">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Decisions List */}
        <div className="space-y-3">
          {filteredDecisions.length === 0 ? (
            <div className="text-center py-10 text-[#6e8073] italic font-serif text-xs">暂无该状态下的决议条目</div>
          ) : (
            filteredDecisions.map((d) => (
              <div
                key={d.id}
                className="p-4 bg-[#131915] border border-[#2d3a30] hover:border-[#967b36] rounded-sm flex items-center justify-between shadow-sm transition"
              >
                <div className="space-y-1 min-w-0 flex-1 pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-slate-100">{d.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        d.kind === 'repeatable'
                          ? 'bg-blue-950/80 text-blue-300 border-blue-700'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {d.kind === 'repeatable' ? '重复进行' : '一次性'}
                    </span>
                    {d.kind === 'repeatable' && (
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                        已执行 {d.occurrence_count} 次
                      </span>
                    )}
                  </div>
                  {d.body_md && <p className="text-xs text-slate-400">{d.body_md}</p>}
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                    {d.category && (
                      <span className="flex items-center space-x-1">
                        <Tag className="w-3 h-3" />
                        <span>{d.category}</span>
                      </span>
                    )}
                    {d.target_time && <span>目标时间: {d.target_time}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  {d.status === 'open' && (
                    <>
                      <button
                        onClick={() => handleRecordOccurrence(d.id)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded text-xs font-semibold shadow-sm transition"
                        title="记录一次完成 (+1)"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>做了 (+1)</span>
                      </button>
                      {d.kind === 'repeatable' && d.occurrence_count > 0 && (
                        <button
                          onClick={() => handleDecrementOccurrence(d.id)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 rounded text-xs font-semibold shadow-sm transition"
                          title="回退/撤销一次打卡 (-1)"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>撤销 (-1)</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleAbandon(d.id)}
                        className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                        title="放弃此决议"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {d.status === 'completed' && (
                    <div className="flex items-center space-x-2">
                      <span className="stamp-gold-order text-xs font-bold border border-[#d4af37]">
                        ★ 决议已达成 ★
                      </span>
                      <button
                        onClick={() => handleDecrementOccurrence(d.id)}
                        className="flex items-center space-x-1 px-2 py-1 bg-[#17211a] hover:bg-[#202e24] text-[#8b9b8f] hover:text-[#e7e0cc] border border-[#344437] rounded-sm text-xs transition"
                        title="撤销完成状态并恢复为待执行"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>撤销完成</span>
                      </button>
                    </div>
                  )}

                  {d.status === 'abandoned' && (
                    <div className="flex items-center space-x-2">
                      <span className="stamp-top-secret text-xs font-bold border border-rose-800 text-rose-400">
                        ✕ 已撤回放弃 ✕
                      </span>
                      <button
                        onClick={() => handleReopen(d.id)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-[#17211a] hover:bg-[#202e24] text-[#8b9b8f] hover:text-[#e7e0cc] border border-[#344437] rounded-sm text-xs font-mono"
                      >
                        <RotateCcw className="w-3 h-3 text-strategy-gold" />
                        <span>重新启用</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>新建决议事项</span>
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">决议名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：晨跑3公里、阅读半小时深度文献..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">决议类型</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as 'one_off' | 'repeatable')}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="repeatable">重复进行 (无限累次)</option>
                    <option value="one_off">一次性待办</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">自定义分类（可选）</label>
                  <input
                    type="text"
                    placeholder="健康 / 学习 / 财务"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">目标时间提示（可选）</label>
                <input
                  type="text"
                  placeholder="例如：每日清晨、本周日前、2026-10-01..."
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">详细描述（可选）</label>
                <textarea
                  rows={2}
                  placeholder="补充说明事项细则..."
                  value={bodyMd}
                  onChange={(e) => setBodyMd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold disabled:opacity-50"
                >
                  确认新建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Command Modal */}
      <AICommandModal
        isOpen={aiCmdOpen}
        onClose={() => setAiCmdOpen(false)}
        title="AI 启发战略决议 (Decisions)"
        subtitle="请告诉参谋部你当前的生活场景、习惯养成目标或战术待办侧重（例如：身体锻炼/技术阅读/专注冲刺/人际社交）"
        placeholder="例如：制定几项能长期复利的日常战术动作，兼顾体能储备与深度专注..."
        onGenerate={handleRunAi}
        isGenerating={isGeneratingAi}
        showStyleSelector={false}
      />

      {/* AI Decision Proposals Preview Modal (§12.1: 先预览、后接受) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-strategy-gold/60 rounded-xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-strategy-gold" />
                <h3 className="text-base font-serif font-bold text-slate-100">
                  AI 战略决议候选预览
                </h3>
              </div>
              <button onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              参谋部推演出以下可执行决议。勾选所需项、编辑内容后，将批量建立独立待办：
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
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAiProposals((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, title: val } : p))
                              );
                            }}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-bold text-strategy-gold focus:outline-none focus:border-strategy-gold"
                          />
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                            {item.kind === 'repeatable' ? '可重复' : '单次'} · {item.category || '综合'}
                          </span>
                        </div>
                        <textarea
                          rows={2}
                          value={item.bodyMd}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAiProposals((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, bodyMd: val } : p))
                            );
                          }}
                          placeholder="说明事项细则..."
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
                  onClick={() => setPreviewOpen(false)}
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
                  <span>确认采纳下达决议</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
