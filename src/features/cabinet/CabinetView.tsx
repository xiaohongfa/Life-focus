import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { StaffMember, StaffMeeting } from '../../api/types';
import { api } from '../../api/client';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  MessageSquare,
  CheckCircle2,
  FileText,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Play,
  Pause,
  Send,
  Loader2,
  Sparkles,
  AlertTriangle,
  Settings,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import {
  isLLMConfigured,
  getLLMConfig,
  generateNextCabinetTurn,
  summarizeChatToMinutes,
  StrategyContext,
} from '../../services/llmService';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { soundFx } from '../../utils/soundEffects';
import { useToast } from '../../components/ToastProvider';

interface CabinetViewProps {
  lifeId: string;
  onOpenSettings?: () => void;
}

interface ChatMessage {
  id: string;
  speaker: string;
  role?: string;
  content: string;
  isCommander?: boolean;
  timestamp: string;
}

const QUICK_PROMPTS = [
  '🎯 明确第一阶段战役落地指标与里程碑',
  '⚠️ 指出当前方案最大潜在漏洞与止损预案',
  '💰 测算投入产出比与精力资本消耗',
  '🧘 严守身心健康底线，设定熔断机制',
  '⚖️ 权衡侧翼迂回替代方案的可行性',
];

const getAdvisorVisuals = (name: string, role: string = '') => {
  if (name.includes('战略') || role.includes('战略')) {
    return {
      badge: 'bg-blue-900/70 text-blue-300 border-blue-700/80',
      bubble: 'bg-blue-950/40 border-blue-800/70 text-slate-200',
      title: 'text-blue-300',
    };
  }
  if (name.includes('财政') || role.includes('财务') || role.includes('资源')) {
    return {
      badge: 'bg-amber-900/70 text-amber-300 border-amber-700/80',
      bubble: 'bg-amber-950/40 border-amber-800/70 text-slate-200',
      title: 'text-amber-300',
    };
  }
  if (name.includes('身心') || role.includes('健康') || role.includes('体魄')) {
    return {
      badge: 'bg-emerald-900/70 text-emerald-300 border-emerald-700/80',
      bubble: 'bg-emerald-950/40 border-emerald-800/70 text-slate-200',
      title: 'text-emerald-300',
    };
  }
  if (name.includes('批判') || role.includes('反对') || role.includes('挑刺')) {
    return {
      badge: 'bg-rose-900/70 text-rose-300 border-rose-700/80',
      bubble: 'bg-rose-950/40 border-rose-800/70 text-slate-200',
      title: 'text-rose-300',
    };
  }
  if (name.includes('哲学') || role.includes('价值观') || role.includes('宗师')) {
    return {
      badge: 'bg-purple-900/70 text-purple-300 border-purple-700/80',
      bubble: 'bg-purple-950/40 border-purple-800/70 text-slate-200',
      title: 'text-purple-300',
    };
  }
  return {
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
    bubble: 'bg-slate-900/60 border-slate-800 text-slate-200',
    title: 'text-slate-300',
  };
};

export const CabinetView: React.FC<CabinetViewProps> = ({ lifeId, onOpenSettings }) => {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [meetings, setMeetings] = useState<StaffMeeting[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit / Create Advisor Modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [prompt, setPrompt] = useState('');

  // Meeting Room State Machine
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingStage, setMeetingStage] = useState<'setup' | 'active' | 'minutes'>('setup');
  const [meetingTopic, setMeetingTopic] = useState('');
  const [specialInstruction, setSpecialInstruction] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    '当前局势',
    '稳定度状态',
    '正在进行的国策',
  ]);

  // Live War Room Debate State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [speechInterval, setSpeechInterval] = useState<number>(2000); // ms
  const [currentSpeakerIdx, setCurrentSpeakerIdx] = useState<number>(0);
  const [isGeneratingTurn, setIsGeneratingTurn] = useState<boolean>(false);
  const [commanderInput, setCommanderInput] = useState<string>('');
  const [consecutiveTurns, setConsecutiveTurns] = useState<number>(0);
  const [activeContext, setActiveContext] = useState<StrategyContext | null>(null);

  // Minutes Drafting State
  const [generatedMinutes, setGeneratedMinutes] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [usedRealLLM, setUsedRealLLM] = useState<boolean | null>(null);

  // Read Past Meeting Modal
  const [readingMeeting, setReadingMeeting] = useState<StaffMeeting | null>(null);

  const toast = useToast();
  const activeLifeIdRef = useRef(lifeId);
  const loadSeqRef = useRef(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const commanderInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (members.length > 0 && selectedMemberIds.length === 0) {
      setSelectedMemberIds(members.filter((m) => m.enabled).map((m) => m.id));
    }
  }, [members]);

  const loadData = useCallback(async () => {
    activeLifeIdRef.current = lifeId;
    const currentSeq = ++loadSeqRef.current;
    setLoading(true);
    try {
      const [membersData, meetingsData] = await Promise.all([
        api.getStaffMembers(lifeId),
        api.getStaffMeetings(lifeId),
      ]);

      if (activeLifeIdRef.current !== lifeId || loadSeqRef.current !== currentSeq) {
        return;
      }

      setMembers(membersData || []);
      setMeetings(meetingsData || []);
      setSelectedMemberIds(
        (membersData || []).filter((m) => m.enabled).map((m) => m.id)
      );
    } catch (err: unknown) {
      if (activeLifeIdRef.current === lifeId && loadSeqRef.current === currentSeq) {
        console.error('Failed to load cabinet data:', err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`加载总参谋部数据失败: ${msg}`);
      }
    } finally {
      if (activeLifeIdRef.current === lifeId && loadSeqRef.current === currentSeq) {
        setLoading(false);
      }
    }
  }, [lifeId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Advisor CRUD handlers
  const handleOpenCreateMember = () => {
    setEditingMemberId(null);
    setName('');
    setRole('');
    setPrompt('');
    setShowMemberModal(true);
  };

  const handleOpenEditMember = (m: StaffMember) => {
    setEditingMemberId(m.id);
    setName(m.name);
    setRole(m.role);
    setPrompt(m.prompt);
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim() || !prompt.trim()) return;

    try {
      if (editingMemberId) {
        const current = members.find((m) => m.id === editingMemberId);
        await api.updateStaffMember(
          lifeId,
          editingMemberId,
          name.trim(),
          role.trim(),
          prompt.trim(),
          current ? current.enabled : true
        );
        toast.success(`参谋【${name.trim()}】档案已更新`);
      } else {
        await api.createStaffMember(lifeId, name.trim(), role.trim(), prompt.trim());
        toast.success(`参谋【${name.trim()}】已入驻总参谋部`);
      }
      setShowMemberModal(false);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to save staff member:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`保存参谋席位失败: ${msg}`);
    }
  };

  const handleToggleMember = async (m: StaffMember) => {
    try {
      await api.updateStaffMember(lifeId, m.id, m.name, m.role, m.prompt, !m.enabled);
      toast.info(!m.enabled ? `参谋【${m.name}】已列席参会` : `参谋【${m.name}】已休会`);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to toggle staff member:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`调整参谋状态失败: ${msg}`);
    }
  };

  const handleDeleteMember = async (memberId: string, title: string) => {
    if (!window.confirm(`确认解散参谋席位「${title}」？`)) return;
    try {
      await api.deleteStaffMember(lifeId, memberId);
      toast.info(`参谋席位【${title}】已撤销解散`);
      await loadData();
    } catch (err: unknown) {
      console.error('Failed to delete staff member:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`解散参谋席位失败: ${msg}`);
    }
  };

  // 1. 开启作战研讨室
  const handleStartWarRoom = async () => {
    if (!meetingTopic.trim()) return;
    const participants = members.filter((m) => selectedMemberIds.includes(m.id));
    if (participants.length === 0) {
      alert('请至少选择一位顾问参会！');
      return;
    }

    setMeetingError(null);
    setUsedRealLLM(null);
    setGeneratedMinutes(null);

    let context: StrategyContext = { lifeId };
    try {
      const overview = await api.getWorldOverview(lifeId).catch(() => null);
      if (overview) {
        context = {
          lifeId,
          lifeName: overview.life.name,
          leaderName: overview.leader?.name,
          leaderBody: overview.leader?.body_md,
          situation: overview.situation?.body_md,
          philosophy: overview.philosophy?.body_md,
          stability: overview.stability?.current_value,
          traits: overview.traits,
          activeFoci: overview.active_foci,
        };
      }
    } catch (err) {
      console.error('Failed to get context:', err);
    }
    setActiveContext(context);

    // Initial Commander opening statement
    const openingMsg: ChatMessage = {
      id: `cmd-init-${Date.now()}`,
      speaker: '最高统帅',
      role: '最高统帅',
      content: specialInstruction.trim()
        ? `【议题定标】：${meetingTopic.trim()}\n【统帅训令】：${specialInstruction.trim()}`
        : `【议题定标】：${meetingTopic.trim()}\n总参谋部全体参谋就位，开始战术推演。各席位开门见山，阐明立场。`,
      isCommander: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setChatMessages([openingMsg]);
    setCurrentSpeakerIdx(0);
    setConsecutiveTurns(0);
    setIsPaused(false);
    setMeetingStage('active');
  };

  // 2. 自动化参谋发言轮转循环 (支持统帅插话、暂停、恢复、自定义间隔)
  useEffect(() => {
    if (meetingStage !== 'active' || isPaused || isGeneratingTurn) {
      return;
    }

    const participants = members.filter((m) => selectedMemberIds.includes(m.id));
    if (participants.length === 0) return;

    // 安全熔断：连续 25 次无统帅插话的自由辩论后自动暂停，等待指示
    if (consecutiveTurns >= 25) {
      setIsPaused(true);
      return;
    }

    const timer = setTimeout(async () => {
      const speaker = participants[currentSpeakerIdx % participants.length];
      if (!speaker) return;

      setIsGeneratingTurn(true);
      try {
        const context = activeContext || { lifeId };
        const result = await generateNextCabinetTurn({
          topic: meetingTopic.trim(),
          speaker,
          history: chatMessages,
          context,
        });

        const newMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          speaker: speaker.name,
          role: speaker.role,
          content: result.content,
          isCommander: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };

        setChatMessages((prev) => [...prev, newMsg]);
        setCurrentSpeakerIdx((prev) => (prev + 1) % participants.length);
        setConsecutiveTurns((prev) => prev + 1);
        if (result.usedRealLLM !== undefined) {
          setUsedRealLLM(result.usedRealLLM);
        }
        if (result.error) {
          setMeetingError(result.error);
        }
      } catch (err: any) {
        console.error('Advisor turn generation error:', err);
      } finally {
        setIsGeneratingTurn(false);
      }
    }, speechInterval);

    return () => clearTimeout(timer);
  }, [
    meetingStage,
    isPaused,
    isGeneratingTurn,
    chatMessages,
    speechInterval,
    currentSpeakerIdx,
    consecutiveTurns,
    members,
    selectedMemberIds,
    activeContext,
    meetingTopic,
    lifeId,
  ]);

  // 滚动至聊天底部
  useEffect(() => {
    if (meetingStage === 'active') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isGeneratingTurn, meetingStage]);

  // 3. 统帅插话与训示
  const handleSendCommanderMessage = (customText?: string) => {
    const text = (customText !== undefined ? customText : commanderInput).trim();
    if (!text) return;

    const commanderMsg: ChatMessage = {
      id: `cmd-${Date.now()}-${Math.random()}`,
      speaker: '最高统帅',
      role: '最高统帅',
      content: text,
      isCommander: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, commanderMsg]);
    setCommanderInput('');
    setConsecutiveTurns(0);
    if (isPaused) {
      setIsPaused(false);
    }
  };

  // 4. 提炼纪要
  const handleSummarizeMinutes = async () => {
    if (chatMessages.length === 0) return;
    setIsPaused(true);
    setIsSummarizing(true);
    try {
      const context = activeContext || { lifeId };
      const res = await summarizeChatToMinutes({
        topic: meetingTopic.trim(),
        history: chatMessages,
        context,
      });
      setGeneratedMinutes(res.minutes);
      setMeetingStage('minutes');
    } catch (err: any) {
      console.error('Failed to summarize minutes:', err);
      alert('提炼会议纪要失败：' + (err.message || String(err)));
    } finally {
      setIsSummarizing(false);
    }
  };

  // 5. 确认并入库归档
  const handleConfirmMeetingMinutes = async () => {
    if (!meetingTopic.trim() || !generatedMinutes) return;
    setIsSavingMeeting(true);
    try {
      const participantCount = Math.max(selectedMemberIds.length, 1);
      const messagesTuple: [string, number, string][] = chatMessages.map((m, idx) => [
        m.speaker,
        Math.floor(idx / participantCount) + 1,
        m.content,
      ]);
      await api.createStaffMeeting(
        lifeId,
        meetingTopic.trim(),
        generatedMinutes,
        selectedModules.join('、'),
        Math.max(1, Math.ceil(chatMessages.length / participantCount)),
        messagesTuple
      );
      setShowMeetingModal(false);
      setMeetingStage('setup');
      setMeetingTopic('');
      setSpecialInstruction('');
      setGeneratedMinutes(null);
      setChatMessages([]);
      await loadData();
      toast.success('参谋部推演决议与备忘录已正式签署归档');
    } catch (err: unknown) {
      console.error('Failed to confirm meeting minutes:', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`签署参谋备忘录失败: ${msg}`);
    } finally {
      setIsSavingMeeting(false);
    }
  };

  // 6. 关闭会议模态窗（带确认保护）
  const handleCloseMeetingModal = () => {
    if (meetingStage === 'active' && chatMessages.length > 1) {
      if (!window.confirm('当前推演尚未提炼纪要并归档，退出将丢失本次会话记录，确认退出？')) {
        return;
      }
    }
    setShowMeetingModal(false);
    setMeetingStage('setup');
    setChatMessages([]);
    setIsPaused(false);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] select-none">
      {/* Header Banner */}
      <div className="dossier-card border-2 border-[#967b36] p-6 rounded-sm shadow-[0_6px_24px_rgba(0,0,0,0.65)] relative">
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#334237] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#221a10] border border-[#a38237]/60 rounded-sm text-strategy-gold shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-serif font-bold gold-gradient-text">
                  总参谋部与内阁系统 (CABINET & VIRTUAL STAFF)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-700/80 font-mono font-bold">
                  WAR-CABINET
                </span>
              </div>
              <p className="text-xs text-[#8b9b8f] mt-1 max-w-2xl font-serif leading-relaxed">
                参考钢铁雄心（HOI4）政要内阁体系。配置具备不同立场、专长与性格的专属参谋团队，针对重大战略决断发起跨席位辩论，凝聚共识并沉淀纪要入档。
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                soundFx.playStamp();
                setSelectedMemberIds(members.filter((m) => m.enabled).map((m) => m.id));
                setShowMeetingModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs transition shadow-lg"
            >
              <MessageSquare className="w-4 h-4" />
              <span>召开总参谋部研讨会</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                handleOpenCreateMember();
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#1a231d] hover:bg-[#253229] text-[#e7e0cc] border border-[#38483c] rounded-sm text-xs font-mono font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4 text-strategy-gold" />
              <span>增补参谋席位</span>
            </button>
          </div>
        </div>

        {/* Advisor Slots Grid */}
        <div className="pt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-strategy-gold uppercase tracking-wider flex items-center space-x-1.5 font-serif">
              <ShieldCheck className="w-4 h-4 text-strategy-gold" />
              <span>现役内阁顾问席位 ({members.length})</span>
            </span>
            <span className="text-xs text-[#8b9b8f] font-mono">各席位拥有独立人格预设与分析视界</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[#6e8073] font-serif text-sm">正在检阅总参谋部名册...</div>
          ) : members.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-[#2d3a30] rounded-sm text-[#6e8073] font-serif text-sm">
              暂无内阁成员。点击「增补参谋席位」指派你的专属顾问。
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-sm border transition flex flex-col justify-between space-y-3 relative ${
                    m.enabled
                      ? 'dossier-card border-[#967b36]/80 shadow-md'
                      : 'bg-[#111713]/60 border-[#263329] opacity-60'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Card Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-10 h-10 rounded-sm bg-[#18221b] border-2 border-[#d4af37]/70 flex items-center justify-center font-serif font-bold text-amber-300 shadow-[inset_0_1px_0_rgba(255,230,160,0.3),0_2px_6px_rgba(0,0,0,0.6)]">
                          {m.name[0]}
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#f0eae0]">{m.name}</h4>
                          <span className="text-[11px] text-strategy-gold font-mono font-bold">{m.role}</span>
                        </div>
                      </div>

                      {/* Enable Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          soundFx.playClick();
                          handleToggleMember(m);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-sm font-mono font-bold border transition ${
                          m.enabled
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                            : 'bg-[#18211a] text-[#7d8e82] border-[#2b382d]'
                        }`}
                        title="切换启用/休假状态"
                      >
                        {m.enabled ? '在岗履职' : '暂时休假'}
                      </button>
                    </div>

                    {/* Persona Prompt Description */}
                    <p className="text-xs text-[#cbd6cd] leading-relaxed bg-[#0d120f] p-2.5 rounded-sm border border-[#2b382d] line-clamp-3 font-serif">
                      {m.prompt}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#263229] text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        handleOpenEditMember(m);
                      }}
                      className="text-[#8b9b8f] hover:text-[#e7e0cc] flex items-center space-x-1 p-1 rounded-sm hover:bg-[#1a231d]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>修订设定</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m.id, m.name)}
                      className="text-[#7d8e82] hover:text-rose-400 flex items-center space-x-1 p-1 rounded-sm hover:bg-[#1a231d]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>撤职</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmed Meeting Minutes Archive */}
      <div className="dossier-card border-2 border-[#967b36] p-6 rounded-sm space-y-4 shadow-[0_6px_24px_rgba(0,0,0,0.65)] relative">
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />

        <div className="flex items-center justify-between border-b border-[#334237] pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-strategy-gold" />
            <h4 className="font-serif font-bold text-base gold-gradient-text">
              参谋部会议历史纪要 (MEETING MINUTES ARCHIVE)
            </h4>
          </div>
          <span className="text-xs text-[#8b9b8f] font-mono">
            共沉淀 {meetings.length} 篇战略决策纪要
          </span>
        </div>

        {meetings.length === 0 ? (
          <div className="py-10 text-center text-[#6e8073] text-sm border-2 border-dashed border-[#2d3a30] rounded-sm font-serif">
            尚未召开参谋部会议。点击上方「召开总参谋部研讨会」组织顾问合议。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meetings.map((meet) => (
              <div
                key={meet.id}
                onClick={() => {
                  soundFx.playClick();
                  setReadingMeeting(meet);
                }}
                className="p-4 rounded-sm bg-[#131915] border border-[#2d3a30] hover:border-[#967b36] transition cursor-pointer group flex flex-col justify-between space-y-3 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-sm bg-[#241d10] text-[#f7e192] border border-[#a38237]/60 font-mono font-bold">
                      {meet.rounds} 轮研讨
                    </span>
                    <span className="text-[11px] text-[#6e8073] font-mono flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-[#6e8073]" />
                      <span>{meet.created_at.slice(0, 16).replace('T', ' ')}</span>
                    </span>
                  </div>
                  <h5 className="font-serif font-bold text-sm text-[#f0eae0] group-hover:text-amber-300 transition line-clamp-1">
                    {meet.topic}
                  </h5>
                  <p className="text-xs text-[#9bb09f] mt-1 line-clamp-2 leading-relaxed font-serif">
                    {meet.confirmed_minutes_md || '已生成结构化共识与风险备忘录...'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#263229] text-[11px] text-[#6e8073] font-mono">
                  <span className="truncate max-w-[200px]">参考：{meet.context_module_names}</span>
                  <span className="text-strategy-gold group-hover:translate-x-0.5 transition flex items-center space-x-0.5 font-serif font-bold">
                    <span>阅读纪要</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Advisor Setting */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-strategy-gold/60 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5 text-amber-400" />
              <span>{editingMemberId ? '修订参谋席位设定' : '增补内阁顾问'}</span>
            </h3>
            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">顾问名称 / 代号 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：战略参谋长、财政总监、批判副官..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">分管职责与职衔 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：长期路线审视、财务投入产出评估..."
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  人格立场与分析 Prompt 设定 *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="在此定义其思维倾向（例如：永远从最悲观角度寻找计划漏洞；或始终强调坚守核心初心，拒绝被短期波动裹挟...）"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 leading-relaxed resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs rounded bg-gradient-to-r from-amber-600 to-strategy-gold text-slate-950 font-bold hover:brightness-110 shadow"
                >
                  确认委任
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Staff Meeting War Room (聊天群模式 · 统帅插话 · 自动交锋辩论 · 纪要提炼归档) */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
          {meetingStage === 'setup' && (
            /* =================== STAGE 1: 议题筹备设置 =================== */
            <div className="bg-slate-900 border-2 border-strategy-gold/70 rounded-xl shadow-[0_0_40px_rgba(217,119,6,0.3)] w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 bg-strategy-gold/15 rounded text-strategy-gold border border-strategy-gold/30">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-slate-100">
                      总参谋部战略合议厅 · 议题筹备
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      配置参会顾问席位与研讨论题，开启实时交互推演群聊
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseMeetingModal}
                  className="text-slate-400 hover:text-slate-100 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* LLM Status Banner */}
                {isLLMConfigured() ? (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        已接入真实大模型推演：<strong className="text-amber-300">{getLLMConfig().provider.toUpperCase()}</strong> ({getLLMConfig().model})
                      </span>
                    </div>
                    {onOpenSettings && (
                      <button
                        type="button"
                        onClick={onOpenSettings}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
                      >
                        <Settings className="w-3 h-3" />
                        <span>配置管理</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-300">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        未配置大模型 API 密钥，当前运行于<strong className="text-amber-200">【离线启发式模拟推演】</strong>
                      </span>
                    </div>
                    {onOpenSettings && (
                      <button
                        type="button"
                        onClick={onOpenSettings}
                        className="px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-[11px] font-medium flex items-center space-x-1 transition shadow-sm"
                      >
                        <Settings className="w-3 h-3" />
                        <span>前往配置 API Key</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Error Alert if API failed */}
                {meetingError && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold">大模型调用异常，已平滑降级至本地离线推演：</span>
                      <p className="font-mono text-[11px] text-rose-200/90 break-all">{meetingError}</p>
                    </div>
                  </div>
                )}

                {/* Setup Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-strategy-gold mb-1">
                      研讨论题 / 当前战略决断困境 *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例如：当前各项国策全线开花，是否应当暂缓非核心路线以确保稳定度不滑坡？"
                      value={meetingTopic}
                      onChange={(e) => setMeetingTopic(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-strategy-gold font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      统帅初始批示 / 边界约束（可选）
                    </label>
                    <textarea
                      rows={2}
                      placeholder="在此输入你的特定倾向或约束（例如：“不接受激进借贷”、“严守每周体能休息底线”、“重点突破技术难关”...）"
                      value={specialInstruction}
                      onChange={(e) => setSpecialInstruction(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-strategy-gold resize-none"
                    />
                  </div>

                  {/* Advisor Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      参会顾问席位选择 (勾选出席成员)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {members.map((m) => {
                        const isSelected = selectedMemberIds.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              setSelectedMemberIds((prev) =>
                                isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                              );
                            }}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer select-none transition ${
                              isSelected
                                ? 'bg-slate-800 border-strategy-gold/70 text-slate-100 shadow-sm'
                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="font-bold flex items-center justify-between">
                              <span>{m.name}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-strategy-gold" />}
                            </div>
                            <span className="text-[10px] text-amber-400/80 block mt-0.5">{m.role}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Context Modules */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      加载参考上下文模块 (§12.2 按模块注入)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['当前局势', '稳定度状态', '正在进行的国策', '特质谱系', '国家精神'].map(
                        (mod) => {
                          const active = selectedModules.includes(mod);
                          return (
                            <button
                              type="button"
                              key={mod}
                              onClick={() => {
                                setSelectedModules((prev) =>
                                  active ? prev.filter((item) => item !== mod) : [...prev, mod]
                                );
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                                active
                                  ? 'bg-strategy-gold/20 text-strategy-gold border-strategy-gold/50 font-bold'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                              }`}
                            >
                              {mod}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Initial Speech Interval Setting */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-strategy-gold" />
                      <span>推演发言间隔（防止场面混乱，入室后可随时微调）</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      {[
                        { label: '1.0s 快推演', val: 1000 },
                        { label: '2.0s 标准 (推荐)', val: 2000 },
                        { label: '3.0s 深度思考', val: 3000 },
                        { label: '5.0s 从容阅览', val: 5000 },
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.val}
                          onClick={() => setSpeechInterval(item.val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                            speechInterval === item.val
                              ? 'bg-strategy-gold text-slate-950 border-strategy-gold shadow'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90">
                <button
                  type="button"
                  onClick={handleCloseMeetingModal}
                  className="px-4 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  放弃会议
                </button>

                <button
                  type="button"
                  disabled={!meetingTopic.trim() || selectedMemberIds.length === 0}
                  onClick={handleStartWarRoom}
                  className="px-5 py-1.5 text-xs font-bold rounded bg-gradient-to-r from-amber-600 to-strategy-gold text-slate-950 hover:brightness-110 transition shadow disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>启动作战研讨推演</span>
                </button>
              </div>
            </div>
          )}

          {meetingStage === 'active' && (
            /* =================== STAGE 2: 作战室群聊推演 (WAR ROOM) =================== */
            <div className="bg-slate-900 border-2 border-strategy-gold/70 rounded-xl shadow-[0_0_50px_rgba(217,119,6,0.3)] w-full max-w-4xl flex flex-col h-[88vh] overflow-hidden">
              {/* War Room Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-800 bg-slate-950/90 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-strategy-gold/15 rounded text-strategy-gold border border-strategy-gold/30">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-serif font-bold text-slate-100">
                        参谋部作战会议室 · 联席推演
                      </h3>
                      {isPaused ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/80 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>已暂停推演</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          <span>推演进行中</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-300/90 line-clamp-1 max-w-md">
                      议题：{meetingTopic}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Interval Selector */}
                  <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded-lg p-1 text-[11px]">
                    <Clock className="w-3 h-3 text-slate-400 ml-1 mr-0.5" />
                    <span className="text-slate-400 mr-1 text-[10px]">发言间隔:</span>
                    {[1000, 1500, 2000, 3000, 5000].map((intv) => (
                      <button
                        key={intv}
                        type="button"
                        onClick={() => setSpeechInterval(intv)}
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] transition ${
                          speechInterval === intv
                            ? 'bg-strategy-gold text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {intv / 1000}s
                      </button>
                    ))}
                  </div>

                  {/* Pause / Resume Button */}
                  <button
                    type="button"
                    onClick={() => setIsPaused(!isPaused)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition ${
                      isPaused
                        ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300 hover:bg-emerald-900/80'
                        : 'bg-amber-950/70 border-amber-600/70 text-amber-300 hover:bg-amber-900/80'
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>继续推演</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>暂停会议</span>
                      </>
                    )}
                  </button>

                  {/* Summarize to Minutes Button */}
                  <button
                    type="button"
                    disabled={isSummarizing || chatMessages.length === 0}
                    onClick={handleSummarizeMinutes}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-600 to-strategy-gold text-slate-950 hover:brightness-110 shadow transition flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>提炼纪要中...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        <span>提炼形成会议纪要</span>
                      </>
                    )}
                  </button>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={handleCloseMeetingModal}
                    className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Chat Stream Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-950/80">
                {chatMessages.map((msg) => {
                  if (msg.isCommander) {
                    return (
                      <div key={msg.id} className="flex flex-col items-end space-y-1">
                        <div className="flex items-center space-x-2 text-[11px] text-amber-400/90 font-mono">
                          <span className="font-bold flex items-center space-x-1">
                            <span className="text-strategy-gold">★</span>
                            <span>最高统帅</span>
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div className="max-w-[85%] rounded-2xl rounded-tr-none px-4 py-3 bg-gradient-to-br from-amber-950/50 via-slate-900 to-slate-900 border border-strategy-gold/60 text-slate-100 text-xs sm:text-sm leading-relaxed shadow-[0_0_20px_rgba(217,119,6,0.1)]">
                          <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                        </div>
                      </div>
                    );
                  }

                  const visual = getAdvisorVisuals(msg.speaker, msg.role);
                  return (
                    <div key={msg.id} className="flex flex-col items-start space-y-1">
                      <div className="flex items-center space-x-2 text-[11px] font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${visual.badge}`}>
                          {msg.speaker}
                        </span>
                        {msg.role && <span className="text-slate-400 text-[10px]">({msg.role})</span>}
                        <span className="text-slate-500">{msg.timestamp}</span>
                      </div>
                      <div className={`max-w-[88%] rounded-2xl rounded-tl-none p-4 border ${visual.bubble} text-xs sm:text-sm leading-relaxed shadow-sm`}>
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    </div>
                  );
                })}

                {/* Typing / Generating Indicator */}
                {isGeneratingTurn && (
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 animate-fadeIn">
                    <Loader2 className="w-4 h-4 text-strategy-gold animate-spin" />
                    <span className="text-slate-300">
                      顾问席位正在推演研判并组织发言...
                    </span>
                  </div>
                )}

                {/* Paused state notice banner */}
                {isPaused && !isGeneratingTurn && (
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-amber-800/50 text-center text-xs text-amber-300/90 flex items-center justify-center space-x-2">
                    <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>会议已暂停。统帅可随时插话训示、调整发言间隔，或点击顶部「继续推演」。</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Commander Interjection Console */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0 space-y-2.5">
                {/* Quick prompt suggestions chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                  <span className="text-slate-400 text-[10px] shrink-0">统帅令快捷引导：</span>
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCommanderInput(qp.replace(/^[^\s]+\s*/, ''));
                        commanderInputRef.current?.focus();
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-strategy-gold/50 shrink-0 transition text-[11px]"
                    >
                      {qp}
                    </button>
                  ))}
                </div>

                {/* Input Box and Send Button */}
                <div className="flex items-end space-x-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={commanderInputRef}
                      rows={2}
                      value={commanderInput}
                      onChange={(e) => setCommanderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendCommanderMessage();
                        }
                      }}
                      placeholder="最高统帅作战训示 / 插话质询（Enter 发送，Shift+Enter 换行）..."
                      className="w-full bg-slate-950 border border-slate-700 focus:border-strategy-gold rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed font-sans"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!commanderInput.trim()}
                    onClick={() => handleSendCommanderMessage()}
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-strategy-gold text-slate-950 font-bold rounded-xl text-xs hover:brightness-110 transition shadow flex items-center space-x-1.5 disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>统帅训示</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {meetingStage === 'minutes' && (
            /* =================== STAGE 3: 纪要草案审校与归档入库 =================== */
            <div className="bg-slate-900 border-2 border-emerald-500/70 rounded-xl shadow-[0_0_40px_rgba(16,185,129,0.25)] w-full max-w-3xl flex flex-col h-[88vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 bg-emerald-500/15 rounded text-emerald-400 border border-emerald-500/30">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-serif font-bold text-slate-100">
                      《{meetingTopic}》总参谋部战略纪要草案
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      已结合 {chatMessages.length} 条实录发言与最高统帅训示提炼生成
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMeetingStage('active')}
                  className="text-xs px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1 border border-slate-700"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>返回作战室交流</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>正式归档纪要文本（支持 Markdown 编辑）</span>
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                    {usedRealLLM ? (
                      <span className="text-emerald-400 font-bold flex items-center space-x-0.5">
                        <Sparkles className="w-3 h-3" />
                        <span>真实大模型提炼生成</span>
                      </span>
                    ) : (
                      <span className="text-amber-400/90 font-medium">⚙️ 启发式战术引擎合成</span>
                    )}
                  </span>
                </div>
                <MarkdownEditor
                  value={generatedMinutes || ''}
                  onChange={(val) => setGeneratedMinutes(val)}
                  defaultMode="preview"
                  minHeight="320px"
                  rows={14}
                />
                <p className="text-[11px] text-slate-500">
                  §12.4: 确认采纳后，本纪要将正式落库并沉淀至「参谋部会议历史纪要」，作为后续决策演化的核心纲领。
                </p>
              </div>

              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setMeetingStage('active')}
                  className="px-4 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>返回作战室讨论</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingMeeting || !generatedMinutes}
                  onClick={handleConfirmMeetingMinutes}
                  className="px-5 py-1.5 text-xs font-bold rounded bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 hover:brightness-110 transition shadow flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSavingMeeting ? '正在存档...' : '确认采纳并归档纪要'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Read Past Confirmed Meeting */}
      {readingMeeting && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono text-strategy-gold">已确认历史会议纪要</span>
                <h4 className="text-lg font-serif font-bold text-slate-100">{readingMeeting.topic}</h4>
              </div>
              <button
                onClick={() => setReadingMeeting(null)}
                className="text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <MarkdownRenderer content={readingMeeting.confirmed_minutes_md || ''} />
            </div>

            <div className="flex justify-end pt-4 mt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReadingMeeting(null)}
                className="px-4 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                关闭阅读
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
