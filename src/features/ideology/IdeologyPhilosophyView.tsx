import React, { useState, useEffect, useRef } from 'react';
import type { Ideology } from '../../api/types';
import { api } from '../../api/client';
import { useToast } from '../../components/ToastProvider';
import { BookOpen, Compass, Plus, Archive, Check, Sparkles, Edit3, Trash2, X } from 'lucide-react';
import { AICommandModal } from '../../components/AICommandModal';
import { AIProposalModal } from '../../components/AIProposalModal';
import { refineText, StrategyContext } from '../../services/llmService';
import { soundFx } from '../../utils/soundEffects';

interface IdeologyPhilosophyViewProps {
  lifeId: string;
}

export const IdeologyPhilosophyView: React.FC<IdeologyPhilosophyViewProps> = ({ lifeId }) => {
  const [ideologies, setIdeologies] = useState<Ideology[]>([]);

  const [philosophyText, setPhilosophyText] = useState('');
  const [situationText, setSituationText] = useState('');
  const [philSaveStatus, setPhilSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sitSaveStatus, setSitSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [showIdeologyModal, setShowIdeologyModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBodyMd, setNewBodyMd] = useState('');

  // Edit Ideology State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIdeology, setEditingIdeology] = useState<Ideology | null>(null);
  const [editIdeoTitle, setEditIdeoTitle] = useState('');
  const [editIdeoBody, setEditIdeoBody] = useState('');

  // AI Refine State (§6.2, §12)
  const [aiCmdOpen, setAiCmdOpen] = useState(false);
  const [aiCmdTarget, setAiCmdTarget] = useState<'philosophy' | 'situation'>('philosophy');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposedText, setProposedText] = useState('');
  const [strategyContext, setStrategyContext] = useState<StrategyContext>({});

  const toast = useToast();
  const activeLifeIdRef = useRef(lifeId);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    loadData();
  }, [lifeId]);

  const loadData = async () => {
    activeLifeIdRef.current = lifeId;
    const currentSeq = ++loadSeqRef.current;
    try {
      const [ideoData, philData, sitData, overview] = await Promise.all([
        api.getIdeologies(lifeId, true),
        api.getPhilosophy(lifeId),
        api.getSituation(lifeId),
        api.getWorldOverview(lifeId).catch(() => null),
      ]);

      if (activeLifeIdRef.current !== lifeId || loadSeqRef.current !== currentSeq) {
        return;
      }

      setIdeologies(ideoData);
      if (philData) setPhilosophyText(philData.body_md);
      if (sitData) setSituationText(sitData.body_md);
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
    } catch (err: unknown) {
      if (activeLifeIdRef.current === lifeId && loadSeqRef.current === currentSeq) {
        console.error('Failed to load ideology/philosophy data', err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`加载哲学与局势数据失败: ${msg}`);
      }
    }
  };

  const handleOpenAi = (target: 'philosophy' | 'situation') => {
    setAiCmdTarget(target);
    setAiCmdOpen(true);
  };

  const handleRunAi = async (requirement: string, style: string) => {
    setIsGeneratingAi(true);
    try {
      const orig = aiCmdTarget === 'philosophy' ? philosophyText : situationText;
      const res = await refineText(orig, aiCmdTarget, style, strategyContext, requirement);
      setProposedText(res);
      setAiCmdOpen(false);
      setProposalModalOpen(true);
    } catch (err: unknown) {
      console.error('Failed to run AI refine:', err);
      toast.error(`AI 润色失败: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAcceptProposal = async (finalText: string) => {
    try {
      if (aiCmdTarget === 'philosophy') {
        setPhilosophyText(finalText);
        await api.updatePhilosophy(lifeId, finalText);
      } else {
        setSituationText(finalText);
        await api.updateSituation(lifeId, finalText);
      }
      setProposalModalOpen(false);
    } catch (err: unknown) {
      console.error('Failed to accept proposal:', err);
      toast.error(`采纳建议失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleSavePhilosophy = async () => {
    setPhilSaveStatus('saving');
    try {
      await api.updatePhilosophy(lifeId, philosophyText);
      setPhilSaveStatus('saved');
      toast.success('根本人生哲学已镌刻保存');
      setTimeout(() => setPhilSaveStatus('idle'), 2000);
    } catch (err: unknown) {
      console.error('Failed to save philosophy', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`保存人生哲学失败: ${msg}`);
      setPhilSaveStatus('idle');
    }
  };

  const handleSaveSituation = async () => {
    setSitSaveStatus('saving');
    try {
      await api.updateSituation(lifeId, situationText);
      setSitSaveStatus('saved');
      toast.success('当前战略局势备忘已更新');
      setTimeout(() => setSitSaveStatus('idle'), 2000);
    } catch (err: unknown) {
      console.error('Failed to save situation', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`保存战略局势失败: ${msg}`);
      setSitSaveStatus('idle');
    }
  };

  const handleCreateIdeology = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await api.createIdeology(lifeId, newTitle.trim(), newBodyMd.trim());
      setIdeologies((prev) => [...prev, created]);
      setNewTitle('');
      setNewBodyMd('');
      setShowIdeologyModal(false);
      toast.success(`意识形态【${created.title}】已立案奉行`);
    } catch (err: unknown) {
      console.error('Failed to create ideology', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`创建意识形态失败: ${msg}`);
    }
  };

  const handleArchiveIdeology = async (id: string, currentArchived: boolean) => {
    try {
      await api.archiveIdeology(lifeId, id, !currentArchived);
      toast.info(currentArchived ? '意识形态已解封启用' : '意识形态已封存归档');
      loadData();
    } catch (err: unknown) {
      console.error('Failed to archive ideology', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`封存意识形态失败: ${msg}`);
    }
  };

  const handleOpenEdit = (item: Ideology) => {
    setEditingIdeology(item);
    setEditIdeoTitle(item.title);
    setEditIdeoBody(item.body_md);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdeology || !editIdeoTitle.trim()) return;
    try {
      await api.updateIdeology(lifeId, editingIdeology.id, editIdeoTitle.trim(), editIdeoBody.trim(), editingIdeology.icon);
      setShowEditModal(false);
      setEditingIdeology(null);
      await loadData();
      toast.success('意识形态已修订更新');
    } catch (err: unknown) {
      console.error('Failed to update ideology', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`更新意识形态失败: ${msg}`);
    }
  };

  const handleDeleteIdeology = async (id: string, title: string) => {
    if (!window.confirm(`确认彻底删除意识形态「${title}」？此操作不可撤销。`)) return;
    try {
      await api.deleteIdeology(lifeId, id);
      toast.info(`意识形态【${title}】已彻底撤销`);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to delete ideology', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`撤除意识形态失败: ${msg}`);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] select-none">
      {/* Ideology Section (§6.2: 多意识形态并存，用户自定义) */}
      <div className="dossier-card border-2 border-[#967b36] p-6 rounded-sm space-y-4 shadow-[0_6px_24px_rgba(0,0,0,0.65)] relative">
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />

        <div className="flex items-center justify-between border-b border-[#334237] pb-3">
          <div>
            <h3 className="font-serif font-bold text-base text-strategy-gold flex items-center space-x-2">
              <span className="text-strategy-gold">★</span>
              <span className="gold-gradient-text">意识形态取向与核心信条 (IDEOLOGIES & DOCTRINES)</span>
            </h3>
            <p className="text-xs text-[#8b9b8f] mt-0.5 font-serif">
              支持多项思想并存，不设强制主次比例或预设阵营评判，定义你的底层价值坐标。
            </p>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              setShowIdeologyModal(true);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>制定新信条</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ideologies.length === 0 ? (
            <div className="col-span-3 text-center py-6 text-[#6e8073] italic font-serif text-xs">
              暂无意识形态条目，点击右上角添加你的核心价值取向。
            </div>
          ) : (
            ideologies.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-sm border space-y-2 flex flex-col justify-between transition shadow-sm ${
                  item.archived_at
                    ? 'bg-[#111713]/50 border-[#263329] opacity-60'
                    : 'dossier-card border-[#967b36]/70 hover:border-[#d4af37]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h5 className="font-serif font-bold text-sm text-[#f7e192]">{item.title}</h5>
                    {item.archived_at && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a231d] text-[#7d8e82] border border-[#2b382d] font-mono">已归档</span>
                    )}
                  </div>
                  <p className="text-xs text-[#cbd6cd] mt-1 whitespace-pre-wrap font-serif leading-relaxed">{item.body_md}</p>
                </div>
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#263229] font-mono text-xs">
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      handleOpenEdit(item);
                    }}
                    className="text-[#8b9b8f] hover:text-[#e7e0cc] flex items-center space-x-1"
                    title="编辑此意识形态"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>编辑</span>
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      handleArchiveIdeology(item.id, !!item.archived_at);
                    }}
                    className="text-[#8b9b8f] hover:text-[#e7e0cc] flex items-center space-x-1"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{item.archived_at ? '恢复展示' : '归档'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteIdeology(item.id, item.title)}
                    className="text-[#7d8e82] hover:text-rose-400 flex items-center space-x-1"
                    title="彻底删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Two long texts: Philosophy & Situation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Philosophy Long Document (§6.3) */}
        <div className="dossier-card border-2 border-[#967b36] p-6 rounded-sm space-y-3 flex flex-col shadow-[0_6px_20px_rgba(0,0,0,0.6)] relative">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#334237] pb-2">
            <div className="flex items-center space-x-2 text-strategy-gold font-bold">
              <BookOpen className="w-4 h-4 text-strategy-gold" />
              <span className="font-serif text-sm gold-gradient-text">人生哲学 (PHILOSOPHY · 长期主文档)</span>
            </div>
            <div className="flex items-center space-x-2">
              {philSaveStatus === 'saving' && <span className="text-xs text-amber-400 animate-pulse font-mono">保存中...</span>}
              {philSaveStatus === 'saved' && (
                <span className="text-xs text-emerald-400 flex items-center space-x-0.5 font-mono">
                  <Check className="w-3 h-3" />
                  <span>已保存</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  handleOpenAi('philosophy');
                }}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#221a10] hover:bg-[#2e2316] border border-[#a38237]/70 text-strategy-gold rounded-sm text-xs font-mono transition"
                title="输入定制需求，唤起 AI 提炼人生底层哲学公理"
              >
                <Sparkles className="w-3 h-3 text-strategy-gold" />
                <span>AI 哲学升华</span>
              </button>
              <button
                onClick={() => {
                  soundFx.playStamp();
                  handleSavePhilosophy();
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs shadow"
              >
                保存
              </button>
            </div>
          </div>
          <p className="text-xs text-[#8b9b8f] font-serif">
            用于记录贯穿一生的根本信念、行事准则与元认知体系，支持完整 Markdown。
          </p>
          <textarea
            rows={14}
            value={philosophyText}
            onChange={(e) => setPhilosophyText(e.target.value)}
            onBlur={handleSavePhilosophy}
            placeholder="# 核心信念\n\n在此书写你的长期战略与人生底层逻辑..."
            className="flex-1 w-full bg-[#0d120f] border border-[#38483c] rounded-sm p-3 text-xs text-[#f0eae0] font-serif focus:outline-none focus:border-strategy-gold leading-relaxed resize-none"
          />
        </div>

        {/* Situation Long Document (§6.3) */}
        <div className="dossier-card border-2 border-[#967b36] p-6 rounded-sm space-y-3 flex flex-col shadow-[0_6px_20px_rgba(0,0,0,0.6)] relative">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#334237] pb-2">
            <div className="flex items-center space-x-2 text-strategy-gold font-bold">
              <Compass className="w-4 h-4 text-strategy-gold" />
              <span className="font-serif text-sm gold-gradient-text">当前局势 (SITUATION · 阶段战略简报)</span>
            </div>
            <div className="flex items-center space-x-2">
              {sitSaveStatus === 'saving' && <span className="text-xs text-amber-400 animate-pulse font-mono">保存中...</span>}
              {sitSaveStatus === 'saved' && (
                <span className="text-xs text-emerald-400 flex items-center space-x-0.5 font-mono">
                  <Check className="w-3 h-3" />
                  <span>已保存</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  handleOpenAi('situation');
                }}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#221a10] hover:bg-[#2e2316] border border-[#a38237]/70 text-strategy-gold rounded-sm text-xs font-mono transition"
                title="输入定制诉求与侧重，唤起 AI 提炼战略局势简报"
              >
                <Sparkles className="w-3 h-3 text-strategy-gold" />
                <span>AI 局势研判</span>
              </button>
              <button
                onClick={() => {
                  soundFx.playStamp();
                  handleSaveSituation();
                }}
                className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs shadow"
              >
                保存
              </button>
            </div>
          </div>
          <p className="text-xs text-[#8b9b8f] font-serif">
            记录当下所处的真实客观境况、近期主线与内外部挑战，独立于国家精神。
          </p>
          <textarea
            rows={14}
            value={situationText}
            onChange={(e) => setSituationText(e.target.value)}
            onBlur={handleSaveSituation}
            placeholder="简述当前的生存发展态势、关键资源状况与下一步攻坚方向..."
            className="flex-1 w-full bg-[#0d120f] border border-[#38483c] rounded-sm p-3 text-xs text-[#f0eae0] font-serif focus:outline-none focus:border-strategy-gold leading-relaxed resize-none"
          />
        </div>
      </div>

      {/* Create Ideology Modal */}
      {showIdeologyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>新建意识形态条目</span>
            </h3>
            <form onSubmit={handleCreateIdeology} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">思想名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：实用理性主义、长期主义、技术乐观论..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">描述与内涵</label>
                <textarea
                  rows={3}
                  placeholder="阐明该意识形态所倡导的核心主张..."
                  value={newBodyMd}
                  onChange={(e) => setNewBodyMd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIdeologyModal(false)}
                  className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
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
        title={aiCmdTarget === 'philosophy' ? 'AI 升华底层哲学公理' : 'AI 研判提炼阶段局势'}
        subtitle={
          aiCmdTarget === 'philosophy'
            ? '请告诉参谋部你的核心信念侧重、行事准则或思维模型倾向（如长期主义/极简聚焦/底线思维）'
            : '输入你近期的客观现实挑战、焦点战役或外部阻力，参谋部将生成深度战略简报'
        }
        placeholder={
          aiCmdTarget === 'philosophy'
            ? '例如：强调战略定力与断舍离，突出身体与精神底座，形成三条精炼公理...'
            : '例如：当前正在转行阶段，时间紧迫，面临技能储备不足与精力分散的矛盾...'
        }
        onGenerate={handleRunAi}
        isGenerating={isGeneratingAi}
      />

      {/* AI Proposal Modal (§12.1: 先预览、后接受) */}
      <AIProposalModal
        isOpen={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        title={aiCmdTarget === 'philosophy' ? 'AI 哲学升华正文预览' : 'AI 局势研判简报预览'}
        originalText={aiCmdTarget === 'philosophy' ? philosophyText : situationText}
        proposedText={proposedText}
        onAccept={handleAcceptProposal}
      />

      {/* Edit Ideology Modal */}
      {showEditModal && editingIdeology && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-strategy-gold/70 rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-strategy-gold" />
                <h3 className="text-base font-serif font-bold text-amber-300">编辑意识形态条目</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingIdeology(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">思想名称 *</label>
                <input
                  type="text"
                  required
                  value={editIdeoTitle}
                  onChange={(e) => setEditIdeoTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-strategy-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">描述与内涵 (Markdown)</label>
                <textarea
                  rows={4}
                  value={editIdeoBody}
                  onChange={(e) => setEditIdeoBody(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-strategy-gold leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingIdeology(null);
                  }}
                  className="px-4 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!editIdeoTitle.trim()}
                  className="px-4 py-1.5 text-xs rounded bg-gradient-to-r from-amber-600 to-strategy-gold hover:brightness-110 text-slate-950 font-bold disabled:opacity-50 transition shadow"
                >
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
