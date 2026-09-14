import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Trait, TraitRelation } from '../../api/types';
import { api } from '../../api/client';
import { useToast } from '../../components/ToastProvider';
import {
  User,
  Plus,
  Archive,
  Trash2,
  GitCommit,
  Check,
  Layers,
  LayoutGrid,
  ArrowRight,
  GitFork,
  Filter,
  Sparkles,
  X,
  AlertTriangle,
  Camera,
  Upload,
  ChevronRight,
  Crown,
  Edit3,
  Flag,
  Shield,
} from 'lucide-react';
import { AICommandModal } from '../../components/AICommandModal';
import { AIProposalModal } from '../../components/AIProposalModal';
import { refineText, recommendTraits, StrategyContext } from '../../services/llmService';
import { soundFx } from '../../utils/soundEffects';

export const PRESET_AVATARS = [
  {
    id: 'preset:marshal',
    name: '铁血元帅',
    bg: 'from-amber-700 to-amber-950',
    color: 'text-amber-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 4a3 3 0 110 6 3 3 0 010-6zm0 14.9c-3.11-1.07-5.54-4.57-5.93-8.4h11.86c-.39 3.83-2.82 7.33-5.93 8.4z" />
      </svg>
    ),
  },
  {
    id: 'preset:commander',
    name: '最高统帅',
    bg: 'from-yellow-600 to-amber-900',
    color: 'text-yellow-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z" />
      </svg>
    ),
  },
  {
    id: 'preset:strategist',
    name: '战略谋士',
    bg: 'from-sky-700 to-slate-950',
    color: 'text-sky-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    id: 'preset:tactical',
    name: '战术指挥',
    bg: 'from-emerald-800 to-slate-950',
    color: 'text-emerald-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    ),
  },
  {
    id: 'preset:cyber',
    name: '赛博先锋',
    bg: 'from-violet-800 to-slate-950',
    color: 'text-fuchsia-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86l5.95 5.95v1.91c0 .55.45 1 1 1h2zm6.71-3.29c-.19-.18-.44-.29-.71-.29h-2v-3c0-.55-.45-1-1-1h-4v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    id: 'preset:philosopher',
    name: '深邃哲人',
    bg: 'from-indigo-900 to-slate-950',
    color: 'text-indigo-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
      </svg>
    ),
  },
];

function renderLeaderAvatar(avatarUri?: string, name?: string) {
  if (!avatarUri) {
    return <span className="text-3xl font-serif font-bold text-amber-300">{name ? name[0] : '帅'}</span>;
  }
  if (avatarUri.startsWith('preset:')) {
    const preset = PRESET_AVATARS.find((p) => p.id === avatarUri) || PRESET_AVATARS[0];
    return (
      <div className={`w-full h-full bg-gradient-to-br ${preset.bg} ${preset.color} flex items-center justify-center p-2`}>
        {preset.svg}
      </div>
    );
  }
  return <img src={avatarUri} alt={name || '领袖'} className="w-full h-full object-cover" />;
}

/**
 * 拓扑环检测：检测有向图中是否存在从 fromId 到 toId 的有向路径
 */
function hasDirectedPath(
  relations: TraitRelation[],
  fromId: string,
  toId: string,
  visited = new Set<string>()
): boolean {
  if (fromId === toId) return true;
  if (visited.has(fromId)) return false;
  const nextVisited = new Set(visited);
  nextVisited.add(fromId);

  const directSuccessors = relations
    .filter((r) => r.predecessor_id === fromId)
    .map((r) => r.successor_id);

  for (const succ of directSuccessors) {
    if (hasDirectedPath(relations, succ, toId, nextVisited)) {
      return true;
    }
  }
  return false;
}

interface LeaderViewProps {
  lifeId: string;
}

export const LeaderView: React.FC<LeaderViewProps> = ({ lifeId }) => {
  const [traits, setTraits] = useState<Trait[]>([]);
  const [relations, setRelations] = useState<TraitRelation[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Leader editing state
  const [leaderName, setLeaderName] = useState('');
  const [leaderBody, setLeaderBody] = useState('');
  const [leaderAvatar, setLeaderAvatar] = useState<string | undefined>(undefined);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  // AI State (§6.1, §12)
  const [aiCmdOpen, setAiCmdOpen] = useState(false);
  const [aiCmdMode, setAiCmdMode] = useState<'leader_profile' | 'traits'>('leader_profile');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [strategyContext, setStrategyContext] = useState<StrategyContext>({});

  // Leader profile proposal
  const [leaderProposalOpen, setLeaderProposalOpen] = useState(false);
  const [refinedLeaderProposal, setRefinedLeaderProposal] = useState('');

  // Trait recommendation proposal
  const [traitProposalsOpen, setTraitProposalsOpen] = useState(false);
  const [proposedTraits, setProposedTraits] = useState<{ title: string; body: string; evolutionFrom?: string }[]>([]);
  const [selectedTraitIndices, setSelectedTraitIndices] = useState<number[]>([]);

  // Trait modal state
  const [showTraitModal, setShowTraitModal] = useState(false);
  const [traitTitle, setTraitTitle] = useState('');
  const [traitBody, setTraitBody] = useState('');
  const [newTraitPredecessorId, setNewTraitPredecessorId] = useState('');

  // Evolution relation modal state
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [predId, setPredId] = useState('');
  const [succId, setSuccId] = useState('');
  const [evolutionNote, setEvolutionNote] = useState('');

  // View mode and filter state (§6.1 特质下拉选择与脉络层级)
  const [viewMode, setViewMode] = useState<'master' | 'tree' | 'grid'>('master');
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // 'all' | 'roots' | traitId

  // 总特征与子特征弹出阶梯状态
  const [selectedMasterGroup, setSelectedMasterGroup] = useState<{
    id: string;
    masterTitle: string;
    rootTrait: Trait;
    subTraits: Trait[];
  } | null>(null);
  const [showSubTraitsModal, setShowSubTraitsModal] = useState(false);
  const [isAddingSubTrait, setIsAddingSubTrait] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubBody, setNewSubBody] = useState('');

  // 编辑特质弹窗状态
  const [showEditTraitModal, setShowEditTraitModal] = useState(false);
  const [editingTrait, setEditingTrait] = useState<Trait | null>(null);
  const [editTraitTitle, setEditTraitTitle] = useState('');
  const [editTraitBody, setEditTraitBody] = useState('');

  const toast = useToast();
  const activeLifeIdRef = useRef(lifeId);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    loadData();
  }, [lifeId, includeArchived]);

  const loadData = async () => {
    activeLifeIdRef.current = lifeId;
    const currentSeq = ++loadSeqRef.current;
    try {
      const [leaderData, traitData, relData, overview] = await Promise.all([
        api.getLeader(lifeId),
        api.getTraits(lifeId, includeArchived),
        api.getTraitRelations(lifeId),
        api.getWorldOverview(lifeId).catch(() => null),
      ]);

      if (activeLifeIdRef.current !== lifeId || loadSeqRef.current !== currentSeq) {
        return;
      }

      if (leaderData) {
        setLeaderName(leaderData.name);
        setLeaderBody(leaderData.body_md);
        setLeaderAvatar(leaderData.portrait_attachment_id || undefined);
      }
      setTraits(traitData);
      setRelations(relData);
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
        console.error('Failed to load leader data', err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`加载特质与统帅数据失败: ${msg}`);
      }
    }
  };

  const handleOpenAi = (mode: 'leader_profile' | 'traits') => {
    setAiCmdMode(mode);
    setAiCmdOpen(true);
  };

  const handleRunAi = async (requirement: string, style: string) => {
    setIsGeneratingAi(true);
    try {
      if (aiCmdMode === 'leader_profile') {
        const refined = await refineText(leaderBody, 'leader', style, strategyContext, requirement);
        setRefinedLeaderProposal(refined);
        setAiCmdOpen(false);
        setLeaderProposalOpen(true);
      } else {
        const list = await recommendTraits(strategyContext, requirement);
        setProposedTraits(list);
        setSelectedTraitIndices(list.map((_, i) => i));
        setAiCmdOpen(false);
        setTraitProposalsOpen(true);
      }
    } catch (err) {
      console.error('Failed to run AI in LeaderView:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAcceptLeaderProposal = async (finalText: string) => {
    setLeaderBody(finalText);
    setLeaderProposalOpen(false);
    try {
      await api.updateLeader(lifeId, leaderName, finalText, leaderAvatar);
    } catch (err) {
      console.error('Failed to save leader proposal', err);
    }
  };

  const handleAcceptTraitProposals = async () => {
    try {
      for (const idx of selectedTraitIndices) {
        const prop = proposedTraits[idx];
        if (!prop || !prop.title.trim()) continue;
        const created = await api.createTrait(lifeId, prop.title.trim(), prop.body.trim());
        if (prop.evolutionFrom) {
          const predecessor = traits.find(
            (t) => t.title.includes(prop.evolutionFrom!) || prop.evolutionFrom!.includes(t.title)
          );
          if (predecessor) {
            await api.addTraitRelation(lifeId, predecessor.id, created.id, 'AI演化继承');
          }
        }
      }
      setTraitProposalsOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to accept trait proposals', err);
    }
  };

  // Auto-save leader info on blur or button
  const handleSaveLeader = async () => {
    setSaveStatus('saving');
    try {
      await api.updateLeader(lifeId, leaderName, leaderBody, leaderAvatar);
      setSaveStatus('saved');
      toast.success('统帅档案与箴言已保存');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: unknown) {
      console.error('Failed to save leader', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`保存统帅档案失败: ${msg}`);
      setSaveStatus('idle');
    }
  };

  // 头像选择与更新
  const handleSaveAvatar = async (avatarUri?: string) => {
    const nextAvatar = avatarUri !== undefined ? avatarUri : customAvatarUrl.trim() || undefined;
    setLeaderAvatar(nextAvatar);
    try {
      await api.updateLeader(lifeId, leaderName, leaderBody, nextAvatar);
      toast.success('统帅战术徽记已更新');
    } catch (err: unknown) {
      console.error('Failed to save leader avatar', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`更新统帅徽记失败: ${msg}`);
    }
    setShowAvatarModal(false);
    setCustomAvatarUrl('');
  };

  const handleUploadAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await handleSaveAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // 打开总特征对应的子特征阶梯弹窗
  const handleOpenSubTraitsModal = (group: { id: string; masterTitle: string; rootTrait: Trait; subTraits: Trait[] }) => {
    setSelectedMasterGroup(group);
    setIsAddingSubTrait(false);
    setNewSubTitle('');
    setNewSubBody('');
    setShowSubTraitsModal(true);
  };

  // 在总特质阶梯弹窗中直接添加子特质 (下一阶段进化)
  const handleAddSubTraitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMasterGroup || !newSubTitle.trim()) return;
    try {
      const created = await api.createTrait(lifeId, newSubTitle.trim(), newSubBody.trim());
      const lastSub = selectedMasterGroup.subTraits[selectedMasterGroup.subTraits.length - 1];
      const predecessorId = lastSub ? lastSub.id : selectedMasterGroup.rootTrait.id;
      await api.addTraitRelation(lifeId, predecessorId, created.id, '阶梯进阶');
      setNewSubTitle('');
      setNewSubBody('');
      setIsAddingSubTrait(false);
      await loadData();
      setSelectedMasterGroup((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          subTraits: [...prev.subTraits, created],
        };
      });
      toast.success(`进阶阶梯【${created.title}】已建立`);
    } catch (err: unknown) {
      console.error('Failed to add sub trait', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`添加特质进阶阶梯失败: ${msg}`);
    }
  };

  const handleCreateTrait = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traitTitle.trim()) return;
    try {
      const created = await api.createTrait(lifeId, traitTitle.trim(), traitBody.trim());
      if (newTraitPredecessorId) {
        await api.addTraitRelation(lifeId, newTraitPredecessorId, created.id);
      }
      setTraitTitle('');
      setTraitBody('');
      setNewTraitPredecessorId('');
      setShowTraitModal(false);
      await loadData();
      toast.success(`心智特质【${created.title}】已铸就建立`);
    } catch (err: unknown) {
      console.error('Failed to create trait', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`铸就特质失败: ${msg}`);
    }
  };

  const handleArchiveTrait = async (traitId: string, currentArchived: boolean) => {
    try {
      await api.archiveTrait(lifeId, traitId, !currentArchived);
      toast.info(currentArchived ? '特质已解封归位' : '特质已封存归档');
      loadData();
    } catch (err: unknown) {
      console.error('Failed to archive trait', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`封存特质失败: ${msg}`);
    }
  };

  const handleDeleteTrait = async (traitId: string, title: string) => {
    if (!window.confirm(`确认删除特质「${title}」？相关演化前身关系也将移除。`)) return;
    try {
      await api.deleteTrait(lifeId, traitId);
      toast.info(`特质【${title}】已撤除`);
      loadData();
    } catch (err: unknown) {
      console.error('Failed to delete trait', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`撤除特质失败: ${msg}`);
    }
  };

  const handleOpenEditTrait = (t: Trait) => {
    setEditingTrait(t);
    setEditTraitTitle(t.title);
    setEditTraitBody(t.body_md);
    setShowEditTraitModal(true);
  };

  const handleSaveEditTrait = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrait || !editTraitTitle.trim()) return;
    try {
      await api.updateTrait(lifeId, editingTrait.id, editTraitTitle.trim(), editTraitBody.trim(), editingTrait.icon);
      setShowEditTraitModal(false);
      setEditingTrait(null);
      await loadData();
      if (selectedMasterGroup) {
        setSelectedMasterGroup((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            subTraits: prev.subTraits.map((item) =>
              item.id === editingTrait.id
                ? { ...item, title: editTraitTitle.trim(), body_md: editTraitBody.trim() }
                : item
            ),
          };
        });
      }
      toast.success('特质已修订保存');
    } catch (err: unknown) {
      console.error('Failed to update trait', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`保存特质失败: ${msg}`);
    }
  };

  const handleSetActiveStage = async (groupTraitIds: string[], activeTraitId: string) => {
    try {
      soundFx.playMedalEquip();
      await api.setActiveTraitStage(lifeId, groupTraitIds, activeTraitId);
      await loadData();
      if (selectedMasterGroup) {
        setSelectedMasterGroup((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            subTraits: prev.subTraits.map((item) => ({
              ...item,
              equip_state: item.id === activeTraitId ? 'active' : 'unequipped',
            })),
          };
        });
      }
      toast.success('活跃特质阶梯已标定上阵');
    } catch (err: unknown) {
      console.error('Failed to set active trait stage', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`标定特质阶梯失败: ${msg}`);
    }
  };

  const handleToggleEquipGroup = async (group: { id: string; subTraits: Trait[] }, equip: boolean, targetStageId?: string) => {
    const groupTraitIds = group.subTraits.map((t) => t.id);
    const targetId = targetStageId || group.subTraits.find((t) => t.equip_state === 'active' || t.icon === 'active')?.id || group.subTraits[0]?.id;
    try {
      if (equip) {
        soundFx.playMedalEquip();
      } else {
        soundFx.playVoid();
      }
      await api.setTraitEquipped(lifeId, groupTraitIds, equip, targetId);
      await loadData();
      if (selectedMasterGroup && selectedMasterGroup.id === group.id) {
        setSelectedMasterGroup((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            subTraits: prev.subTraits.map((item) => ({
              ...item,
              equip_state: !equip ? 'benched' : item.id === targetId ? 'active' : 'unequipped',
            })),
          };
        });
      }
      toast.success(equip ? '特质谱系已上阵激活' : '特质谱系已转入待命');
    } catch (err: unknown) {
      console.error('Failed to toggle trait equip status', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`切换特质上阵状态失败: ${msg}`);
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await api.deleteTraitRelation(lifeId, relationId);
      await loadData();
      toast.info('演化关系已解除');
    } catch (err: unknown) {
      console.error('Failed to delete trait relation', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`解除演化关系失败: ${msg}`);
    }
  };

  const handleAddEvolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!predId || !succId || predId === succId) return;

    if (hasDirectedPath(relations, succId, predId)) {
      alert('无法建立演化关系：检测到循环依赖死锁！该后继特质通过现有演化链已可到达前身特质。');
      return;
    }

    try {
      const rel = await api.addTraitRelation(lifeId, predId, succId, evolutionNote.trim() || undefined);
      setRelations((prev) => [...prev, rel]);
      setPredId('');
      setSuccId('');
      setEvolutionNote('');
      setShowEvolutionModal(false);
      await loadData();
      toast.success('特质脉络演化关系已确立');
    } catch (err: unknown) {
      console.error('Failed to add trait evolution relation', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`建立演化关系失败: ${msg}`);
    }
  };

  // 检测当前是否已存在循环演化死锁（例如 A -> B 且 B -> A）
  const detectedCycles = useMemo(() => {
    const cyclePairs: { pred: Trait; succ: Trait; relId: string }[] = [];
    const seenEdges = new Set<string>();

    for (const r of relations) {
      const otherRels = relations.filter((other) => other.id !== r.id);
      if (hasDirectedPath(otherRels, r.successor_id, r.predecessor_id)) {
        const edgeKey = [r.predecessor_id, r.successor_id].sort().join('<->');
        if (!seenEdges.has(edgeKey)) {
          seenEdges.add(edgeKey);
          const pred = traits.find((t) => t.id === r.predecessor_id);
          const succ = traits.find((t) => t.id === r.successor_id);
          if (pred && succ) {
            cyclePairs.push({ pred, succ, relId: r.id });
          }
        }
      }
    }
    return cyclePairs;
  }, [relations, traits]);

  // 计算演化脉络谱系：区分有演化链的特质组与独立特质（具备拓扑环容灾能力）
  const { lineageChains, standaloneTraits } = useMemo(() => {
    const successorIds = new Set(relations.map((r) => r.successor_id));
    const predecessorIds = new Set(relations.map((r) => r.predecessor_id));

    // 找到所有前身为根的特质（入度为 0，出度 > 0）
    const roots = traits.filter((t) => predecessorIds.has(t.id) && !successorIds.has(t.id));

    // 递归或者顺藤摸瓜寻找从 root 出发的所有链条
    const chains: Trait[][] = [];
    const visitedInChains = new Set<string>();

    for (const root of roots) {
      const chain: Trait[] = [root];
      visitedInChains.add(root.id);

      let currentId = root.id;
      while (true) {
        const nextRel = relations.find((r) => r.predecessor_id === currentId);
        if (!nextRel) break;
        const nextTrait = traits.find((t) => t.id === nextRel.successor_id);
        if (!nextTrait || visitedInChains.has(nextTrait.id)) break;
        chain.push(nextTrait);
        visitedInChains.add(nextTrait.id);
        currentId = nextTrait.id;
      }
      if (chain.length > 1) {
        chains.push(chain);
      }
    }

    // 容灾处理：如果存在循环依赖或孤岛环路，导致入度>0且出度>0，未被标准根节点覆盖
    const orphanRelatedTraits = traits.filter(
      (t) => !visitedInChains.has(t.id) && (predecessorIds.has(t.id) || successorIds.has(t.id))
    );

    for (const orphan of orphanRelatedTraits) {
      if (visitedInChains.has(orphan.id)) continue;
      const chain: Trait[] = [orphan];
      visitedInChains.add(orphan.id);

      let currentId = orphan.id;
      while (true) {
        const nextRel = relations.find((r) => r.predecessor_id === currentId);
        if (!nextRel) break;
        const nextTrait = traits.find((t) => t.id === nextRel.successor_id);
        if (!nextTrait) break;
        if (chain.some((x) => x.id === nextTrait.id)) {
          // 环路回到自身，停止延伸以避免死循环
          break;
        }
        if (visitedInChains.has(nextTrait.id)) break;
        chain.push(nextTrait);
        visitedInChains.add(nextTrait.id);
        currentId = nextTrait.id;
      }
      chains.push(chain);
    }

    // 没有任何前身/后继的独立特质
    const standalones = traits.filter((t) => !successorIds.has(t.id) && !predecessorIds.has(t.id));

    return { lineageChains: chains, standaloneTraits: standalones };
  }, [traits, relations]);

  // 计算心智总特征矩阵：按谱系演化树和独立特征组织总模块
  const masterGroups = useMemo(() => {
    const groups: {
      id: string;
      masterTitle: string;
      rootTrait: Trait;
      subTraits: Trait[];
    }[] = [];

    lineageChains.forEach((chain, idx) => {
      if (chain.length > 0) {
        const root = chain[0];
        // 智能提取总特征主标题（去除尾部“等级一/1/初阶”等修饰，如“三角洲能力等级一” -> “三角洲能力”）
        const masterTitle = root.title
          .replace(/(等级[一二三四五六七八九十0-9]+|[0-9]+|初阶|进阶|高阶|基础)$/i, '')
          .trim() || root.title;

        groups.push({
          id: `master-chain-${root.id}-${idx}`,
          masterTitle,
          rootTrait: root,
          subTraits: chain,
        });
      }
    });

    standaloneTraits.forEach((t) => {
      groups.push({
        id: `master-standalone-${t.id}`,
        masterTitle: t.title,
        rootTrait: t,
        subTraits: [t],
      });
    });

    return groups;
  }, [lineageChains, standaloneTraits]);

  // 计算上阵状态统计
  const { equippedGroupsCount, benchedGroupsCount } = useMemo(() => {
    let equipped = 0;
    let benched = 0;
    for (const group of masterGroups) {
      const hasActive = group.subTraits.some((t) => t.icon === 'active');
      const hasBenched = group.subTraits.some((t) => t.icon === 'benched');
      if (hasActive) {
        equipped++;
      } else if (hasBenched) {
        benched++;
      } else {
        equipped++;
      }
    }
    return { equippedGroupsCount: equipped, benchedGroupsCount: benched };
  }, [masterGroups]);

  // 根据当前下拉选择器过滤特质
  const filteredTraits = useMemo(() => {
    if (selectedFilter === 'all') return traits;
    if (selectedFilter === 'standalone') return standaloneTraits;
    if (selectedFilter === 'lineage') {
      const allChainTraitIds = new Set(lineageChains.flat().map((t) => t.id));
      return traits.filter((t) => allChainTraitIds.has(t.id));
    }
    // 选定了具体某一个特质：展示其前驱、后继和自身
    const activeId = selectedFilter;
    const relatedIds = new Set<string>([activeId]);
    relations.forEach((r) => {
      if (r.predecessor_id === activeId) relatedIds.add(r.successor_id);
      if (r.successor_id === activeId) relatedIds.add(r.predecessor_id);
    });
    return traits.filter((t) => relatedIds.has(t.id));
  }, [selectedFilter, traits, standaloneTraits, lineageChains, relations]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] select-none">
      {/* Top Section: Supreme Commander Profile Dossier (1:1 概念图 Manila 纸袋绝密人事档案) */}
      <div className="manila-paper border-2 border-[#b3a078] p-6 rounded space-y-4 shadow-[0_8px_25px_rgba(0,0,0,0.7)] text-[#2b2214] relative">
        <div className="manila-folder-tab -mt-6 -mx-6 px-6 py-2.5 flex items-center justify-between border-b border-[#bfae8b]">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-[#8a6b29]" />
            <span className="font-serif font-black text-sm tracking-wider text-[#2d2212]">
              最高统帅人事绝密档案 (SUPREME COMMANDER DOSSIER)
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {saveStatus === 'saving' && <span className="text-xs font-mono text-amber-800 animate-pulse font-bold">档案存盘中...</span>}
            {saveStatus === 'saved' && (
              <span className="text-xs font-mono text-emerald-800 font-bold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>档案已自动核准</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => handleOpenAi('leader_profile')}
              className="flex items-center space-x-1 px-2.5 py-1 bg-[#ecdcc0] hover:bg-[#dfceb0] border border-[#a38b5d] text-[#4a3a1f] rounded text-xs font-mono font-bold transition shadow-sm"
              title="输入定制诉求与统帅气质侧重，唤起 AI 润色领袖画像"
            >
              <Sparkles className="w-3 h-3 text-[#8a6b29]" />
              <span>AI 画像润色</span>
            </button>
            <button
              onClick={handleSaveLeader}
              className="px-3 py-1 bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-white font-serif font-bold rounded text-xs transition shadow"
            >
              保存档案
            </button>
          </div>
        </div>

        {/* 红色火漆印章 */}
        <div className="distressed-stamp-red absolute top-14 right-6 text-xs px-2.5 py-0.5 pointer-events-none z-10 opacity-85">
          绝密 256
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
          <div className="flex flex-col items-center justify-center p-4 bg-[#f4ecd9] border border-[#cfbe9b] rounded shadow-sm">
            <div
              onClick={() => setShowAvatarModal(true)}
              className="group relative w-24 h-28 rounded bg-[#faf6ee] p-1 border-2 border-[#b59955] shadow-md flex items-center justify-center overflow-hidden cursor-pointer hover:border-amber-700 transition"
              title="点击自定义/更换统帅照片"
            >
              <div className="w-full h-full bg-gradient-to-br from-[#243127] to-[#121914] flex items-center justify-center overflow-hidden">
                {renderLeaderAvatar(leaderAvatar, leaderName)}
              </div>
              <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-amber-300 font-mono transition">
                <Camera className="w-4 h-4 mb-0.5 text-strategy-gold" />
                <span>更换照片</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAvatarModal(true)}
              className="text-xs font-serif font-bold text-[#8a6b29] hover:underline mt-2 flex items-center space-x-1"
            >
              <Camera className="w-3 h-3" />
              <span>更换军官相片</span>
            </button>
          </div>

          <div className="md:col-span-3 space-y-3">
            <div>
              <label className="block text-xs font-mono font-bold text-[#6d5b3d] mb-1">统帅尊号 / 自称 (COMMANDER TITLE)</label>
              <input
                type="text"
                value={leaderName}
                onChange={(e) => setLeaderName(e.target.value)}
                onBlur={handleSaveLeader}
                placeholder="例如：战略统帅 张伟"
                className="w-full bg-[#faf5ea] border-2 border-[#bfae8b] rounded px-3 py-1.5 text-sm text-[#1f190e] font-serif font-black focus:outline-none focus:border-[#8a6b29]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-bold text-[#6d5b3d] mb-1">战略思维特质与总纲档案 (DOCTRINE PROFILE)</label>
              <textarea
                value={leaderBody}
                onChange={(e) => setLeaderBody(e.target.value)}
                onBlur={handleSaveLeader}
                rows={3}
                placeholder="记录你长期的思维方式、行为风格与心智模式..."
                className="w-full bg-[#faf5ea] border-2 border-[#bfae8b] rounded p-2.5 text-xs text-[#2b2214] font-serif leading-relaxed focus:outline-none focus:border-[#8a6b29] resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Traits Section with Dropdown Filtering & Lineage Hierarchy */}
      <div className="dossier-card border-2 border-[#967b36] p-6 rounded-sm space-y-5 shadow-[0_6px_24px_rgba(0,0,0,0.65)] relative">
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />
        {/* Trait Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-strategy-gold/10 border border-strategy-gold/30 rounded text-strategy-gold">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif font-bold text-base text-slate-100">心智特质与演化谱系 (Traits)</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/80 text-strategy-gold border border-strategy-gold/40">
                  已上阵 {equippedGroupsCount} 项
                </span>
                {benchedGroupsCount > 0 && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    待命 {benchedGroupsCount} 项
                  </span>
                )}
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-500 border border-slate-800">
                  共 {traits.length} 阶特质
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                仅已上阵且处于当前阶段的心智特征会呈现在战略总览并融入参谋部推演；多阶演化链严格互斥仅上阵当前所处阶。
              </p>
            </div>
          </div>

          {/* Filter Dropdown, View Mode & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 特质下拉筛选器 */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-strategy-gold shrink-0" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-slate-900">
                  全部特质 ({traits.length})
                </option>
                <option value="lineage" className="bg-slate-900">
                  仅脉络谱系特质 ({lineageChains.flat().length})
                </option>
                <option value="standalone" className="bg-slate-900">
                  仅独立无前置特质 ({standaloneTraits.length})
                </option>
                <optgroup label="指定特质脉络审查" className="bg-slate-900">
                  {traits.map((t) => (
                    <option key={t.id} value={t.id} className="bg-slate-900">
                      聚焦：{t.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('master')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                  viewMode === 'master'
                    ? 'bg-strategy-gold text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="总特征大厅：点击总特征弹出子特征明细列表"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>总特征大厅</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                  viewMode === 'tree'
                    ? 'bg-strategy-gold text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="层级演化脉络流视图"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>脉络谱系流</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                  viewMode === 'grid'
                    ? 'bg-strategy-gold text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="卡片网格列表视图"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>网格列表</span>
              </button>
            </div>

            <label className="flex items-center space-x-1.5 text-xs text-slate-400 cursor-pointer pl-1">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>含归档</span>
            </label>

            <button
              onClick={() => setShowEvolutionModal(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-xs transition"
            >
              <GitCommit className="w-3.5 h-3.5 text-amber-400" />
              <span>连线演化 (A → B)</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAi('traits')}
              className="flex items-center space-x-1 px-3 py-1.5 bg-amber-950/70 hover:bg-amber-900 border border-strategy-gold/40 text-strategy-gold rounded-lg text-xs font-bold transition shadow"
              title="输入定制需求，让 AI 参谋推演契合当前局势与统帅心智的进阶特质"
            >
              <Sparkles className="w-3.5 h-3.5 text-strategy-gold" />
              <span>AI 推演特质</span>
            </button>

            <button
              onClick={() => setShowTraitModal(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-strategy-gold hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建特质</span>
            </button>
          </div>
        </div>

        {/* 演化死锁闭环告警与快速解绑 */}
        {detectedCycles.length > 0 && (
          <div className="p-4 bg-rose-950/70 border border-rose-600/80 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg text-xs animate-fadeIn">
            <div className="flex items-center space-x-2.5 text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold text-rose-300">检测到心智特质存在演化死锁闭环：</span>
                {detectedCycles.map((c, i) => (
                  <span key={i} className="font-mono bg-rose-900/80 px-2 py-0.5 rounded mx-1 text-rose-200 border border-rose-700/60 font-semibold">
                    {c.pred.title} ⇄ {c.succ.title}
                  </span>
                ))}
                <span className="text-slate-300 block sm:inline sm:ml-1">
                  心智演化应为单向递进，循环引用会导致脉络谱系流混淆死锁。
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteRelation(detectedCycles[0].relId)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold rounded-lg text-xs transition shadow flex items-center space-x-1"
                title="一键解绑造成死锁的环路关系"
              >
                <X className="w-3.5 h-3.5" />
                <span>一键破除闭环死锁</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 0: MASTER TRAITS HALL (点击总特征弹出子特征阶梯) */}
        {viewMode === 'master' ? (
          <div className="space-y-6">
            {masterGroups.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic text-sm border-2 border-dashed border-slate-800 rounded-xl">
                暂无心智特质。点击右上角「新建特质」或「AI 推演特质」确立你的第一项核心总特征。
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {masterGroups.map((group) => {
                  const subCount = group.subTraits.length;
                  const activeSubIndex = group.subTraits.findIndex((s) => s.icon === 'active');
                  const isBenched = group.subTraits.some((s) => s.icon === 'benched');
                  const isEquipped = activeSubIndex >= 0 || (!isBenched && group.subTraits.length > 0);
                  const currentActiveIdx = activeSubIndex >= 0 ? activeSubIndex : 0;
                  const activeTrait = group.subTraits[currentActiveIdx] || group.subTraits[0];
                  return (
                    <div
                      key={group.id}
                      onClick={() => handleOpenSubTraitsModal(group)}
                      className={`group p-5 rounded-sm border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative ${
                        isEquipped
                          ? 'dossier-card border-[#d4af37] shadow-[0_4px_18px_rgba(0,0,0,0.7),0_0_12px_rgba(212,175,55,0.25)] hover:brightness-110'
                          : 'bg-[#121814] border-[#2b392e] opacity-75 hover:opacity-100 hover:border-[#445749]'
                      }`}
                    >
                      <div className="absolute top-1.5 left-1.5 screw-rivet" />
                      <div className="absolute top-1.5 right-1.5 screw-rivet" />

                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`p-1.5 rounded-sm border group-hover:scale-110 transition ${
                                isEquipped
                                  ? 'bg-[#292211] text-strategy-gold border-strategy-gold/50 shadow-inner'
                                  : 'bg-[#18211a] text-[#7d8e82] border-[#2e3c31]'
                              }`}
                            >
                              <Crown className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-serif font-bold text-base text-[#f0eae0] group-hover:text-strategy-gold transition line-clamp-1">
                                {group.masterTitle}
                              </h4>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                {isEquipped ? (
                                  <span className="text-[11px] font-mono text-strategy-gold font-bold">
                                    ★ 当前处于：第 {currentActiveIdx + 1} 阶 · {activeTrait?.title}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-mono text-[#6e8073]">
                                    待命中（后备心智，未占用活跃名额）
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded-sm text-[11px] font-mono font-bold bg-[#261f12] text-amber-300 border border-amber-700/60">
                              共 {subCount} 阶
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-sm text-[11px] font-mono font-bold border ${
                                isEquipped
                                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/80 shadow-sm'
                                  : 'bg-[#18211a] text-[#7d8e82] border-[#2e3c31]'
                              }`}
                            >
                              {isEquipped ? '已上阵' : '待命中'}
                            </span>
                          </div>
                        </div>

                        {/* Progression Path */}
                        <div className="flex flex-wrap items-center gap-1.5 py-2 my-1 border-y border-[#29362c] text-[11px]">
                          {group.subTraits.map((t, idx) => {
                            const isCur = isEquipped && idx === currentActiveIdx;
                            const isPast = isEquipped && idx < currentActiveIdx;
                            return (
                              <React.Fragment key={t.id}>
                                <span
                                  className={`px-2 py-0.5 rounded-sm border font-serif font-bold transition ${
                                    isCur
                                      ? 'bg-gradient-to-b from-[#2a2211] to-[#18140c] text-strategy-gold border-strategy-gold shadow-[0_0_8px_rgba(217,119,6,0.3)]'
                                      : isPast
                                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60'
                                      : 'bg-[#0f1411] text-[#7d8e82] border-[#28352b]'
                                  }`}
                                >
                                  {isCur && '★ '}
                                  {t.title}
                                </span>
                                {idx < subCount - 1 && (
                                  <ChevronRight className="w-3.5 h-3.5 text-strategy-gold shrink-0" />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        {/* Body Preview */}
                        <p className="text-xs text-[#9bb09f] line-clamp-3 leading-relaxed mt-2 font-serif">
                          {activeTrait?.body_md || '暂无详细阐述'}
                        </p>
                      </div>

                      {/* Footer CTA & Toggle Equip Button */}
                      <div className="pt-2 border-t border-[#29362c] flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleEquipGroup(group, !isEquipped);
                          }}
                          className={`px-2.5 py-1 rounded-sm text-xs font-mono font-bold transition flex items-center space-x-1 ${
                            isEquipped
                              ? 'bg-[#18211a] hover:bg-rose-950/80 hover:text-rose-200 hover:border-rose-700 text-[#8b9b8f] border border-[#334237]'
                              : 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black shadow-sm'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{isEquipped ? '设为待命 (下阵)' : '佩戴上阵'}</span>
                        </button>

                        <div className="flex items-center space-x-1 text-strategy-gold group-hover:text-amber-300 transition font-serif font-bold">
                          <span>演化阶梯明细</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : viewMode === 'tree' ? (
          <div className="space-y-6">
            {lineageChains.length === 0 && standaloneTraits.length === 0 ? (
              <div className="py-12 text-center text-slate-500 italic text-sm border-2 border-dashed border-slate-800 rounded-xl">
                暂无特质。点击右上角「新建特质」添加长期的思维或行为特征。
              </div>
            ) : null}

            {/* Lineage Evolution Chains */}
            {lineageChains.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-strategy-gold uppercase tracking-wider">
                  <GitCommit className="w-4 h-4" />
                  <span>演化继承脉络 (Evolutionary Lineage Chains)</span>
                </div>

                <div className="space-y-3">
                  {lineageChains.map((chain, cIdx) => (
                    <div
                      key={`chain-${cIdx}`}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          谱系链 #{cIdx + 1}
                        </span>
                        <span className="text-xs text-slate-400">
                          由早期特质经由实践沉淀，演进为深层心智特征
                        </span>
                      </div>

                      {/* Horizontal / Wrapped Step Flow */}
                      <div className="flex flex-wrap items-center gap-3">
                        {chain.map((t, idx) => {
                          const isLast = idx === chain.length - 1;
                          const isFirst = idx === 0;

                          return (
                            <React.Fragment key={t.id}>
                              <div
                                className={`w-64 p-3.5 rounded-lg border transition ${
                                  t.archived_at
                                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                                    : isLast
                                    ? 'bg-slate-900/90 border-strategy-gold/70 shadow-[0_0_12px_rgba(217,119,6,0.15)]'
                                    : 'bg-slate-900/70 border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center space-x-1.5">
                                    <span
                                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                        isFirst
                                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                          : isLast
                                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                          : 'bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {isFirst ? '起源前身' : isLast ? '现行演化态' : `阶段 ${idx + 1}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => handleOpenEditTrait(t)}
                                      className="text-slate-400 hover:text-amber-300 p-1 rounded hover:bg-slate-800"
                                      title="编辑此特质"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleArchiveTrait(t.id, !!t.archived_at)}
                                      className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800"
                                      title={t.archived_at ? '取消归档' : '归档'}
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTrait(t.id, t.title)}
                                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                                      title="删除"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <h5 className="font-serif font-bold text-sm text-slate-100 mb-1">{t.title}</h5>
                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                                  {t.body_md || '无详细描述'}
                                </p>
                              </div>

                              {!isLast && (
                                <div className="flex flex-col items-center group relative px-1">
                                  <div className="flex items-center text-strategy-gold/80 animate-pulse">
                                    <ArrowRight className="w-5 h-5" />
                                  </div>
                                  {(() => {
                                    const nextT = chain[idx + 1];
                                    const relBetween = nextT
                                      ? relations.find(
                                          (r) =>
                                            r.predecessor_id === t.id &&
                                            r.successor_id === nextT.id
                                        )
                                      : null;
                                    if (!relBetween) return null;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRelation(relBetween.id)}
                                        className="opacity-0 group-hover:opacity-100 transition px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] whitespace-nowrap shadow mt-1 hover:bg-rose-900"
                                        title={`解绑断开「${t.title}」演化至「${nextT?.title}」的关系`}
                                      >
                                        解绑
                                      </button>
                                    );
                                  })()}
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standalone Traits Group */}
            {standaloneTraits.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <LayoutGrid className="w-4 h-4" />
                  <span>独立基座特质 (未关联前身后继)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {standaloneTraits.map((t) => (
                    <div
                      key={t.id}
                      className={`p-4 rounded-lg border transition space-y-2 flex flex-col justify-between ${
                        t.archived_at
                          ? 'bg-slate-900/40 border-slate-800 opacity-60'
                          : 'bg-slate-900/70 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between">
                          <h5 className="font-serif font-bold text-sm text-slate-100">{t.title}</h5>
                          {t.archived_at && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                              已归档
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{t.body_md}</p>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleOpenEditTrait(t)}
                          className="text-xs text-slate-400 hover:text-amber-300 flex items-center space-x-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>编辑</span>
                        </button>
                        <button
                          onClick={() => handleArchiveTrait(t.id, !!t.archived_at)}
                          className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>{t.archived_at ? '取消归档' : '归档'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTrait(t.id, t.title)}
                          className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>删除</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: FILTERABLE CARD GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredTraits.length === 0 ? (
              <div className="col-span-3 py-10 text-center text-slate-500 italic text-sm">
                当前筛选条件下无匹配特质。
              </div>
            ) : (
              filteredTraits.map((t) => {
                const predecessorItems = relations
                  .filter((r) => r.successor_id === t.id)
                  .map((r) => ({
                    relId: r.id,
                    title: traits.find((item) => item.id === r.predecessor_id)?.title || '未知',
                  }));

                const successorItems = relations
                  .filter((r) => r.predecessor_id === t.id)
                  .map((r) => ({
                    relId: r.id,
                    title: traits.find((item) => item.id === r.successor_id)?.title || '未知',
                  }));

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-lg border transition space-y-2 flex flex-col justify-between ${
                      t.archived_at
                        ? 'bg-slate-900/40 border-slate-800 opacity-60'
                        : 'bg-slate-900/70 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h5 className="font-serif font-bold text-sm text-slate-100">{t.title}</h5>
                        {t.archived_at && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                            已归档
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{t.body_md}</p>

                      {/* Lineage Predecessors / Successors with Unbind Buttons */}
                      {(predecessorItems.length > 0 || successorItems.length > 0) && (
                        <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1.5 text-slate-400">
                          {predecessorItems.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-amber-400 font-medium shrink-0">前身:</span>
                              {predecessorItems.map((p) => (
                                <span
                                  key={p.relId}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800/80 text-amber-200 text-[10px]"
                                >
                                  <span>{p.title}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRelation(p.relId)}
                                    className="hover:text-rose-400 p-0.5 rounded transition text-slate-400 hover:bg-slate-800"
                                    title={`解绑与「${p.title}」的前身继承关系`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                          {successorItems.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sky-400 font-medium shrink-0">演化为:</span>
                              {successorItems.map((s) => (
                                <span
                                  key={s.relId}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-sky-950/70 border border-sky-800/80 text-sky-200 text-[10px]"
                                >
                                  <span>{s.title}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRelation(s.relId)}
                                    className="hover:text-rose-400 p-0.5 rounded transition text-slate-400 hover:bg-slate-800"
                                    title={`解绑演化至「${s.title}」的后继关系`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleOpenEditTrait(t)}
                        className="text-xs text-slate-400 hover:text-amber-300 flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>编辑</span>
                      </button>
                      <button
                        onClick={() => handleArchiveTrait(t.id, !!t.archived_at)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{t.archived_at ? '取消归档' : '归档'}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTrait(t.id, t.title)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>删除</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Create Trait Modal (With Direct Predecessor Selection) */}
      {showTraitModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-strategy-gold/60 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>新建心智特质卡片</span>
            </h3>
            <form onSubmit={handleCreateTrait} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">特质名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：战略定力、技术偏执、敏锐直觉..."
                  value={traitTitle}
                  onChange={(e) => setTraitTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* 前身特质直接下拉指定 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  演化前身特质（Predecessor，可选）
                </label>
                <select
                  value={newTraitPredecessorId}
                  onChange={(e) => setNewTraitPredecessorId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="">无前身（作为独立新特质）</option>
                  {traits.map((t) => (
                    <option key={t.id} value={t.id}>
                      由「{t.title}」演进继承而来
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  若选择前身，创建时将自动在谱系树中将该特质挂载为下一阶节点。
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">描述与具体表现</label>
                <textarea
                  rows={3}
                  placeholder="说明这一特质在日常决断中的具体表现与长期影响..."
                  value={traitBody}
                  onChange={(e) => setTraitBody(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTraitModal(false)}
                  className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!traitTitle.trim()}
                  className="px-4 py-1.5 text-sm rounded bg-strategy-gold hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  确认新建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trait Evolution Modal (A -> B) */}
      {showEvolutionModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <GitCommit className="w-5 h-5 text-amber-400" />
              <span>建立特质演化谱系 (A → B)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              表达由旧特征演进至新特征的继承关系，不强制自动归档前身，也不影响数值。
            </p>
            <form onSubmit={handleAddEvolution} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">前身特质 (Predecessor A)</label>
                <select
                  value={predId}
                  onChange={(e) => setPredId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="">请选择前身特质...</option>
                  {traits.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">后继演化特质 (Successor B)</label>
                <select
                  value={succId}
                  onChange={(e) => setSuccId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="">请选择后继特质...</option>
                  {traits.map((t) => {
                    const isSelf = t.id === predId;
                    const wouldLoop = predId ? hasDirectedPath(relations, t.id, predId) : false;
                    const alreadyLinked = predId ? relations.some((r) => r.predecessor_id === predId && r.successor_id === t.id) : false;
                    const disabled = isSelf || wouldLoop || alreadyLinked;

                    return (
                      <option key={t.id} value={t.id} disabled={disabled}>
                        {t.title}
                        {isSelf
                          ? ' (自身不可选)'
                          : alreadyLinked
                          ? ' (已建立关联)'
                          : wouldLoop
                          ? ' (将导致死锁闭环 ✕)'
                          : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {predId && succId && hasDirectedPath(relations, succId, predId) && (
                <div className="p-2.5 bg-rose-950/80 border border-rose-700/80 rounded-lg text-xs text-rose-300 flex items-center space-x-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>无法建立：该选择会导致循环依赖死锁！该后继特质已是前身的祖先。</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">演化备注（可选）</label>
                <input
                  type="text"
                  placeholder="例如：经过长期实践沉淀出的深层模式..."
                  value={evolutionNote}
                  onChange={(e) => setEvolutionNote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEvolutionModal(false)}
                  className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!predId || !succId || predId === succId || hasDirectedPath(relations, succId, predId)}
                  className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold disabled:opacity-50 transition shadow"
                >
                  确认建立关联
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
        title={aiCmdMode === 'leader_profile' ? 'AI 润色统帅画像与心智风格' : 'AI 推演心智演化特质候选'}
        subtitle={
          aiCmdMode === 'leader_profile'
            ? '请告诉参谋部你的心智倾向、决断风格或重点凸显的特质（例如：坚韧防守/反脆弱/决断力强）'
            : '输入你当前期望突破的心智瓶颈或培养目标，参谋部将推演契合当前局势的演化特质'
        }
        placeholder={
          aiCmdMode === 'leader_profile'
            ? '例如：语言风格更冷峻严谨，突出在迷雾中保持定力与自我复盘的决断心智...'
            : '例如：希望形成能够化解焦虑的韧性特质，或是提升技术架构与战略执行力的进阶特质...'
        }
        onGenerate={handleRunAi}
        isGenerating={isGeneratingAi}
        showStyleSelector={aiCmdMode === 'leader_profile'}
      />

      {/* AI Leader Profile Proposal Modal */}
      <AIProposalModal
        isOpen={leaderProposalOpen}
        onClose={() => setLeaderProposalOpen(false)}
        title="AI 统帅画像润色预览"
        originalText={leaderBody}
        proposedText={refinedLeaderProposal}
        onAccept={handleAcceptLeaderProposal}
      />

      {/* AI Trait Proposals Preview Modal (§12.1: 先预览、后接受) */}
      {traitProposalsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-strategy-gold/60 rounded-xl shadow-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-strategy-gold" />
                <h3 className="text-base font-serif font-bold text-slate-100">
                  AI 推荐演化特质预览
                </h3>
              </div>
              <button onClick={() => setTraitProposalsOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              参谋部推演出以下候选心智特质。勾选所需项、编辑内容后，将批量建立特质并自动衔接继承脉络：
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {proposedTraits.map((item, idx) => {
                const isChecked = selectedTraitIndices.includes(idx);
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
                          setSelectedTraitIndices((prev) =>
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
                              setProposedTraits((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, title: val } : p))
                              );
                            }}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-bold text-strategy-gold focus:outline-none focus:border-strategy-gold"
                          />
                          {item.evolutionFrom && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/70 border border-strategy-gold/40 text-strategy-gold shrink-0">
                              继承自：{item.evolutionFrom}
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={item.body}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProposedTraits((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, body: val } : p))
                            );
                          }}
                          placeholder="阐明该特质的心智特征与决断影响..."
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
                已选中 {selectedTraitIndices.length} / {proposedTraits.length} 项
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setTraitProposalsOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAcceptTraitProposals}
                  disabled={selectedTraitIndices.length === 0}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-strategy-gold text-slate-950 font-bold rounded-lg text-xs hover:brightness-110 disabled:opacity-40 transition flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>确认采纳并建立演化</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 子特征阶梯弹窗 (Sub-Traits Ladder Modal) */}
      {showSubTraitsModal && selectedMasterGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn select-none">
          <div className="w-full max-w-2xl dossier-card border-2 border-[#967b36] rounded-sm shadow-[0_12px_48px_rgba(0,0,0,0.95)] flex flex-col max-h-[85vh] overflow-hidden relative">
            <div className="absolute top-2 left-2 screw-rivet" />
            <div className="absolute top-2 right-2 screw-rivet" />

            {/* Header */}
            {(() => {
              const modalHasActive = selectedMasterGroup.subTraits.some((s) => s.icon === 'active');
              const modalHasBenched = selectedMasterGroup.subTraits.some((s) => s.icon === 'benched');
              const modalIsEquipped = modalHasActive || (!modalHasBenched && selectedMasterGroup.subTraits.length > 0);
              return (
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#334237] bg-gradient-to-r from-[#19221b] via-[#1c271f] to-[#141c16]">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-[#292211] rounded-sm text-strategy-gold border border-strategy-gold/40 shadow-inner">
                      <Crown className="w-5 h-5 text-strategy-gold" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-base font-serif font-bold text-[#f0eae0]">
                          【{selectedMasterGroup.masterTitle}】演化阶梯与上阵调令
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-sm bg-[#261f12] text-amber-300 border border-amber-700/60 font-mono font-bold">
                          共 {selectedMasterGroup.subTraits.length} 阶
                        </span>
                        {modalIsEquipped ? (
                          <span className="text-xs px-2 py-0.5 rounded-sm bg-emerald-950/90 text-emerald-300 border border-emerald-600/80 font-mono font-bold flex items-center space-x-1 shadow-sm">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            <span>已上阵活跃</span>
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-sm bg-[#18211a] text-[#7d8e82] border border-[#2e3c31] font-mono">
                            待命中 (后备)
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-serif text-[#8b9b8f]">
                        垂直纵向演化阶梯：演化谱系严格互斥仅生效单阶，历史阶段为基石，远期阶段为演化目标
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleEquipGroup(selectedMasterGroup, !modalIsEquipped)}
                      className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold transition flex items-center space-x-1.5 shadow ${
                        modalIsEquipped
                          ? 'bg-[#18211a] hover:bg-rose-950/80 hover:text-rose-200 hover:border-rose-700 text-[#8b9b8f] border border-[#334237]'
                          : 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black shadow-md'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>{modalIsEquipped ? '设为待命 (下阵)' : '佩戴上阵'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSubTraitsModal(false)}
                      className="p-1 text-[#8b9b8f] hover:text-[#e7e0cc] rounded transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Content: Sub-Traits Vertical Progression Ladder */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="relative border-l-2 border-[#967b36]/60 ml-4 pl-6 space-y-6">
                {selectedMasterGroup.subTraits.map((sub, idx) => {
                  const modalHasActive = selectedMasterGroup.subTraits.some((s) => s.icon === 'active');
                  const modalHasBenched = selectedMasterGroup.subTraits.some((s) => s.icon === 'benched');
                  const modalIsEquipped = modalHasActive || (!modalHasBenched && selectedMasterGroup.subTraits.length > 0);
                  const activeSubIndex = selectedMasterGroup.subTraits.findIndex((s) => s.icon === 'active');
                  const currentActiveIdx = activeSubIndex >= 0 ? activeSubIndex : 0;
                  const isActive = idx === currentActiveIdx;
                  const isPast = idx < currentActiveIdx;
                  const isFuture = idx > currentActiveIdx;
                  const predRel = relations.find((r) => r.successor_id === sub.id);
                  return (
                    <div key={sub.id} className="relative group/step">
                      {/* Left timeline rung marker */}
                      <div
                        className={`absolute -left-[31px] top-3.5 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          isActive && modalIsEquipped
                            ? 'bg-amber-400 border-black shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-125'
                            : isPast && modalIsEquipped
                            ? 'bg-emerald-500 border-black'
                            : 'bg-[#18211a] border-[#38483c]'
                        }`}
                      >
                        <span className="text-[8px] font-mono font-bold text-black">{idx + 1}</span>
                      </div>

                      {/* Card */}
                      <div
                        className={`p-4 rounded-sm border-2 transition-all space-y-2 relative ${
                          isActive && modalIsEquipped
                            ? 'bg-gradient-to-b from-[#2a2211] to-[#15120a] border-[#d4af37] shadow-[0_0_24px_rgba(212,175,55,0.25)]'
                            : isPast && modalIsEquipped
                            ? 'bg-[#121c15] border-emerald-800/70 hover:border-emerald-600'
                            : 'bg-[#111713] border-[#2b382d] hover:border-[#3d4f40]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className={`font-serif font-bold text-sm ${isActive && modalIsEquipped ? 'text-strategy-gold' : 'text-slate-100'}`}>
                              {sub.title}
                            </span>
                            {isActive && modalIsEquipped && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-950 text-strategy-gold border border-strategy-gold shadow-sm flex items-center space-x-1">
                                <span>★ 当前所处阶段 (已上阵)</span>
                              </span>
                            )}
                            {isActive && !modalIsEquipped && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-400 border border-slate-700">
                                标定阶段 (待命中)
                              </span>
                            )}
                            {isPast && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-700/60">
                                ✓ 已达成基石
                              </span>
                            )}
                            {isFuture && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-900 text-slate-400 border border-slate-700">
                                ⏳ 远期演化目标
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {(!isActive || !modalIsEquipped) && (
                              <button
                                type="button"
                                onClick={() => handleSetActiveStage(selectedMasterGroup.subTraits.map((t) => t.id), sub.id)}
                                className="text-[11px] px-2.5 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/70 text-amber-300 flex items-center space-x-1 transition font-bold shadow-sm"
                                title="标定自身当前心智境界所处阶层并立即激活上阵"
                              >
                                <Flag className="w-3 h-3 text-strategy-gold" />
                                <span>设为当前阶段并上阵</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditTrait(sub)}
                              className="text-slate-400 hover:text-amber-300 p-1 rounded hover:bg-slate-850 transition"
                              title="编辑此特征"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {predRel && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm(`确认解除「${sub.title}」与前身的演化关联？`)) return;
                                  await handleDeleteRelation(predRel.id);
                                  setShowSubTraitsModal(false);
                                }}
                                className="text-[11px] text-rose-400 hover:text-rose-300 hover:underline px-1.5 py-0.5 rounded bg-rose-950/40 border border-rose-800/50 flex items-center space-x-1"
                                title="解除与前身的前后置依赖"
                              >
                                <X className="w-3 h-3" />
                                <span>解除关联</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteTrait(sub.id, sub.title);
                                setShowSubTraitsModal(false);
                              }}
                              className="text-[11px] text-slate-500 hover:text-rose-400 p-1"
                              title="删除此特质"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {sub.body_md || '暂无详细阐述'}
                        </p>

                        {predRel && (
                          <div className="pt-1 flex items-center text-[10px] text-slate-500 space-x-1">
                            <span>前驱基石：</span>
                            <span className="text-strategy-gold font-mono">
                              {traits.find((t) => t.id === predRel.predecessor_id)?.title || '未知前身'}
                            </span>
                            {predRel.note && <span className="text-slate-400">({predRel.note})</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Sub Trait Box */}
              {isAddingSubTrait ? (
                <form
                  onSubmit={handleAddSubTraitSubmit}
                  className="p-4 rounded-xl bg-slate-950 border-2 border-strategy-gold/70 space-y-3 animate-fadeIn mt-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-strategy-gold">
                      追加第 {selectedMasterGroup.subTraits.length + 1} 阶子特征
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingSubTrait(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">子特征名称 (Title)</label>
                    <input
                      type="text"
                      value={newSubTitle}
                      onChange={(e) => setNewSubTitle(e.target.value)}
                      placeholder="例如：能力等级四 或 终极破局心智..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-strategy-gold font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">心智特征与决断表现说明 (Markdown)</label>
                    <textarea
                      rows={2}
                      value={newSubBody}
                      onChange={(e) => setNewSubBody(e.target.value)}
                      placeholder="阐述晋升该阶层后统帅所获得的更高阶认知优势..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-strategy-gold resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingSubTrait(false)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={!newSubTitle.trim()}
                      className="px-4 py-1 bg-gradient-to-r from-amber-600 to-strategy-gold text-slate-950 font-bold rounded text-xs hover:brightness-110 disabled:opacity-40 transition shadow"
                    >
                      确认建立并自动继承上一阶
                    </button>
                  </div>
                </form>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewSubTitle(`${selectedMasterGroup.masterTitle} 等级${selectedMasterGroup.subTraits.length + 1}`);
                      setNewSubBody('');
                      setIsAddingSubTrait(true);
                    }}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-strategy-gold/50 bg-strategy-gold/10 hover:bg-strategy-gold/20 text-strategy-gold text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow"
                  >
                    <Plus className="w-4 h-4" />
                    <span>为「{selectedMasterGroup.masterTitle}」追加下一阶子特征 (第 {selectedMasterGroup.subTraits.length + 1} 阶)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/90">
              <button
                type="button"
                onClick={() => setShowSubTraitsModal(false)}
                className="px-5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
              >
                关闭阶梯视图
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 统帅自定义头像弹窗 (AvatarModal) */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border-2 border-strategy-gold/70 rounded-xl shadow-[0_0_50px_rgba(217,119,6,0.3)] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-strategy-gold" />
                <h3 className="text-base font-serif font-bold text-slate-100">自定义最高统帅头像</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Avatar Preview */}
            <div className="flex items-center space-x-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="w-16 h-16 rounded-lg bg-slate-800 border-2 border-strategy-gold flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {renderLeaderAvatar(leaderAvatar, leaderName)}
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <div className="font-bold text-strategy-gold">{leaderName || '最高统帅'}</div>
                <div className="text-slate-400">
                  {leaderAvatar ? (leaderAvatar.startsWith('preset:') ? '使用战略军工预设肖像' : '已配置自定义头像图像') : '当前使用首字徽标'}
                </div>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">① 战略军工预设肖像库</label>
              <div className="grid grid-cols-3 gap-2.5">
                {PRESET_AVATARS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSaveAvatar(preset.id)}
                    className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1.5 ${
                      leaderAvatar === preset.id
                        ? 'bg-amber-950/70 border-strategy-gold shadow-[0_0_12px_rgba(217,119,6,0.3)]'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded bg-gradient-to-br ${preset.bg} ${preset.color} flex items-center justify-center shadow`}>
                      {preset.svg}
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Local Upload */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300">② 上传本地图片文件 (支持 JPG / PNG / SVG)</label>
              <label className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 transition flex items-center justify-center space-x-2 cursor-pointer">
                <Upload className="w-4 h-4 text-strategy-gold" />
                <span>选择本地文件并转换为头像</span>
                <input type="file" accept="image/*" onChange={handleUploadAvatarFile} className="hidden" />
              </label>
            </div>

            {/* Image URL Input */}
            <div className="space-y-2 pt-1 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300">③ 网络图片直链 URL</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="https://example.com/commander.png"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-strategy-gold font-mono"
                />
                <button
                  type="button"
                  disabled={!customAvatarUrl.trim()}
                  onClick={() => handleSaveAvatar(customAvatarUrl.trim())}
                  className="px-3 py-1.5 bg-strategy-gold hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs transition"
                >
                  应用直链
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleSaveAvatar(undefined)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                重置为默认文字头像
              </button>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trait Modal */}
      {showEditTraitModal && editingTrait && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-strategy-gold/70 rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-strategy-gold" />
                <h3 className="text-base font-serif font-bold text-amber-300">编辑心智特质</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditTraitModal(false);
                  setEditingTrait(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTrait} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">特质名称</label>
                <input
                  type="text"
                  required
                  value={editTraitTitle}
                  onChange={(e) => setEditTraitTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-strategy-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">详细心智模式与实践总结 (Markdown)</label>
                <textarea
                  rows={4}
                  value={editTraitBody}
                  onChange={(e) => setEditTraitBody(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-strategy-gold leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTraitModal(false);
                    setEditingTrait(null);
                  }}
                  className="px-4 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!editTraitTitle.trim()}
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
