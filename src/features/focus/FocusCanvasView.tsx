import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  EdgeChange,
  Connection,
  MarkerType,
  ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { Focus, FocusRelation, FocusStatus, FocusStatusHistory, Essay } from '../../api/types';
import { api } from '../../api/client';
import { FocusNode, FocusNodeData } from './FocusNode';
import { SubFocusModal } from './SubFocusModal';
import { EssayModal } from '../../components/EssayModal';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { soundFx } from '../../utils/soundEffects';
import {
  Plus,
  Sparkles,
  X,
  Trash2,
  ShieldAlert,
  RotateCcw,
  Save,
  ArrowRight,
  ListTodo,
  Maximize2,
  Coins,
  BookOpen,
  Link,
  Unlink,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  generateNextFocusProposals,
  generateInitialFocuses,
  refineText,
  StrategyContext,
} from '../../services/llmService';
import { AICommandModal } from '../../components/AICommandModal';
import { AIProposalModal } from '../../components/AIProposalModal';
import { useToast } from '../../components/ToastProvider';

interface FocusCanvasViewProps {
  lifeId: string;
}

// 撤销动作定义 (§15 会话内撤销栈)
type UndoAction =
  | { type: 'MOVE'; focusId: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: 'STATUS'; focusId: string; from: FocusStatus; to: FocusStatus }
  | { type: 'DELETE_NODE'; focus: Focus; relations: FocusRelation[] }
  | { type: 'CREATE_NODE'; focusId: string }
  | { type: 'ADD_RELATION'; relation: FocusRelation }
  | { type: 'DELETE_RELATION'; relation: FocusRelation };

interface AIProposalItem {
  id: string;
  direction: string;
  title: string;
  bodyMd: string;
  status: FocusStatus;
  relationType: 'prerequisite' | 'mutually_exclusive';
}

export const FocusCanvasView: React.FC<FocusCanvasViewProps> = ({ lifeId }) => {
  const toast = useToast();
  const activeLifeIdRef = useRef(lifeId);
  const loadSeqRef = useRef(0);

  const [foci, setFoci] = useState<Focus[]>([]);
  const [relations, setRelations] = useState<FocusRelation[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const [selectedFocus, setSelectedFocus] = useState<Focus | null>(null);
  const [focusHistory, setFocusHistory] = useState<FocusStatusHistory[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New focus form
  const [newTitle, setNewTitle] = useState('');
  const [newBodyMd, setNewBodyMd] = useState('');
  const [newStatus, setNewStatus] = useState<FocusStatus>('active');
  const [newIcon, setNewIcon] = useState<string>('');
  const [parentFocusForCreation, setParentFocusForCreation] = useState<Focus | null>(null);

  // Drawer edit mode
  const [editTitle, setEditTitle] = useState('');
  const [editBodyMd, setEditBodyMd] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Connection mode (§7.3: 前置路线 vs 互斥路线切换)
  const [connectionMode, setConnectionMode] = useState<'prerequisite' | 'mutually_exclusive'>('prerequisite');

  // Status transition reason
  const [statusReason, setStatusReason] = useState('');

  // Undo stack
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const dragStartPosRef = useRef<{ id: string; x: number; y: number } | null>(null);

  // Focus & Canvas View refs (彻底消除重绘死锁与漂移)
  const isInitialFitDoneRef = useRef(false);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const subCountsRef = useRef<Record<string, { total: number; done: number }>>({});

  // AI Proposal & Command state (§7.4, §12)
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiProposals, setAiProposals] = useState<AIProposalItem[]>([]);
  const [aiCmdModalOpen, setAiCmdModalOpen] = useState(false);
  const [aiCmdMode, setAiCmdMode] = useState<'next_node' | 'initial_line' | 'refine_body'>('next_node');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [strategyContext, setStrategyContext] = useState<StrategyContext>({});

  // Proposal modal for text refine
  const [refineModalOpen, setRefineModalOpen] = useState(false);
  const [refinedTextProposal, setRefinedTextProposal] = useState('');

  // 挂载随笔状态 (Focus Essay Mounting)
  const [focusEssays, setFocusEssays] = useState<Essay[]>([]);
  const [allLifeEssays, setAllLifeEssays] = useState<Essay[]>([]);
  const [showAttachDropdown, setShowAttachDropdown] = useState(false);
  const [showEssayModal, setShowEssayModal] = useState(false);
  const [editingEssay, setEditingEssay] = useState<Essay | null>(null);
  const [isNewEssayForFocus, setIsNewEssayForFocus] = useState(false);
  const [, setEssayCounts] = useState<Record<string, number>>({});
  const essayCountsRef = useRef<Record<string, number>>({});

  // Sub-Focus Checklist state
  const [subFocusModalTarget, setSubFocusModalTarget] = useState<Focus | null>(null);
  const [isSubFocusModalOpen, setIsSubFocusModalOpen] = useState(false);
  const [subCounts, setSubCounts] = useState<Record<string, { total: number; done: number }>>({});

  const handleOpenSubFocus = useCallback((focus: Focus) => {
    setSubFocusModalTarget(focus);
    setIsSubFocusModalOpen(true);
  }, []);

  const nodeTypes = useMemo(() => ({ focusNode: FocusNode }), []);

  const handleSelectNode = useCallback(async (focus: Focus) => {
    setSelectedFocus(focus);
    setEditTitle(focus.title);
    setEditBodyMd(focus.body_md);
    setShowAttachDropdown(false);
    try {
      const [history, essays, lifeEssays] = await Promise.all([
        api.getFocusHistory(lifeId, focus.id).catch(() => []),
        api.getFocusEssays(lifeId, focus.id).catch(() => []),
        api.getEssays(lifeId).catch(() => []),
      ]);
      setFocusHistory(history);
      setFocusEssays(essays);
      setAllLifeEssays(lifeEssays);
    } catch (err) {
      console.error('Failed to load node history or essays', err);
    }
  }, [lifeId]);

  // 将领域 Focus 集合同步转换为 React Flow 节点，保留已测量尺寸与初始宽高，杜绝 visibility: hidden
  // 不直接依赖 subCounts state，避免循环渲染
  const syncNodesFromFoci = useCallback(
    (
      fociList: Focus[],
      counts?: Record<string, { total: number; done: number }>,
      essayCountsMap?: Record<string, number>
    ) => {
      const activeCounts = counts || subCountsRef.current;
      const activeEssayCounts = essayCountsMap || essayCountsRef.current;
      setNodes((prevNodes) => {
        const prevMap = new Map(prevNodes.map((n) => [n.id, n]));
        return fociList.map((f) => {
          const prev = prevMap.get(f.id);
          return {
            id: f.id,
            type: 'focusNode',
            position: prev?.position ? prev.position : { x: f.position_x, y: f.position_y },
            initialWidth: 148,
            initialHeight: 125,
            measured: prev?.measured || { width: 148, height: 125 },
            data: {
              focus: f,
              onSelectNode: handleSelectNode,
              onOpenSubFocus: handleOpenSubFocus,
              subCount: activeCounts[f.id],
              essayCount: activeEssayCounts[f.id] || 0,
            },
          };
        });
      });
    },
    [handleSelectNode, handleOpenSubFocus, setNodes]
  );

  // 刷新当前国策挂载的随笔与角标计数
  const refreshFocusEssays = useCallback(
    async (focusId: string) => {
      try {
        const [essays, lifeEssays, counts] = await Promise.all([
          api.getFocusEssays(lifeId, focusId).catch(() => []),
          api.getEssays(lifeId).catch(() => []),
          api.getAllFocusEssayCounts(lifeId).catch(() => ({})),
        ]);
        setFocusEssays(essays);
        setAllLifeEssays(lifeEssays);
        essayCountsRef.current = counts;
        setEssayCounts(counts);
        syncNodesFromFoci(foci, subCountsRef.current, counts);
      } catch (err) {
        console.error('Failed to refresh focus essays', err);
      }
    },
    [lifeId, foci, syncNodesFromFoci]
  );

  const handleDetachEssay = async (essayId: string, essayTitle: string) => {
    if (!selectedFocus) return;
    if (!window.confirm(`确定将随笔「${essayTitle}」从该国策中解除挂载吗？（随笔本身仍完好保留在档案库中）`)) return;
    try {
      soundFx.playVoid();
      await api.detachEssayFromFocus(lifeId, selectedFocus.id, essayId);
      toast.info(`已解除随笔「${essayTitle}」的挂载`);
      await refreshFocusEssays(selectedFocus.id);
    } catch (err: any) {
      toast.error(`解除挂载失败: ${err.message || String(err)}`);
    }
  };

  const handleAttachExistingEssay = async (essayId: string) => {
    if (!selectedFocus || !essayId) return;
    try {
      soundFx.playStamp();
      await api.attachEssayToFocus(lifeId, selectedFocus.id, essayId);
      toast.success('已成功挂载随笔');
      setShowAttachDropdown(false);
      await refreshFocusEssays(selectedFocus.id);
    } catch (err: any) {
      toast.error(`挂载失败: ${err.message || String(err)}`);
    }
  };

  const handleOpenCreateEssayForFocus = () => {
    soundFx.playClick();
    setEditingEssay(null);
    setIsNewEssayForFocus(true);
    setShowEssayModal(true);
  };

  const handleReadOrEditEssay = (essay: Essay) => {
    soundFx.playClick();
    setEditingEssay(essay);
    setIsNewEssayForFocus(false);
    setShowEssayModal(true);
  };

  const handleEssaySaved = async (saved: Essay) => {
    if (isNewEssayForFocus && selectedFocus) {
      try {
        await api.attachEssayToFocus(lifeId, selectedFocus.id, saved.id);
        toast.success(`新随笔「${saved.title}」已撰写并挂载至国策`);
      } catch (e) {
        console.error(e);
      }
    }
    setIsNewEssayForFocus(false);
    setShowEssayModal(false);
    setEditingEssay(null);
    if (selectedFocus) {
      await refreshFocusEssays(selectedFocus.id);
    }
  };

  const handleEssayDeleted = async () => {
    setShowEssayModal(false);
    setEditingEssay(null);
    if (selectedFocus) {
      await refreshFocusEssays(selectedFocus.id);
    }
  };

  // 将领域关系集合转换为 React Flow 连线
  const syncEdgesFromRelations = useCallback(
    (relList: FocusRelation[]) => {
      setEdges(
        relList.map((r) => {
          const isMutual = r.relation_type === 'mutually_exclusive';
          return {
            id: r.id,
            source: r.source_focus_id,
            target: r.target_focus_id,
            sourceHandle: isMutual ? 'source-right' : 'source-bottom',
            targetHandle: isMutual ? 'target-left' : 'target-top',
            animated: isMutual,
            style: {
              stroke: isMutual ? '#ef4444' : '#64748b',
              strokeWidth: isMutual ? 2.5 : 2,
              strokeDasharray: isMutual ? '6,6' : undefined,
            },
            label: isMutual ? '< ! >' : undefined,
            labelStyle: { fill: '#f87171', fontSize: 11, fontWeight: '900', fontFamily: 'monospace' },
            labelBgStyle: { fill: '#181b20', fillOpacity: 0.95, rx: 3, stroke: '#ef4444', strokeWidth: 1.5 },
            labelBgPadding: [6, 3] as [number, number],
            markerEnd: isMutual
              ? undefined
              : {
                  type: MarkerType.ArrowClosed,
                  color: '#94a3b8',
                  width: 14,
                  height: 14,
                },
          };
        })
      );
    },
    [setEdges]
  );

  const loadData = useCallback(async () => {
    activeLifeIdRef.current = lifeId;
    const currentSeq = ++loadSeqRef.current;
    try {
      const [fociData, relData, allSubFoci, overview, essayCountsMap] = await Promise.all([
        api.getFoci(lifeId),
        api.getFocusRelations(lifeId),
        api.listAllSubFoci(lifeId).catch(() => []),
        api.getWorldOverview(lifeId).catch(() => null),
        api.getAllFocusEssayCounts(lifeId).catch(() => ({})),
      ]);

      if (activeLifeIdRef.current !== lifeId || loadSeqRef.current !== currentSeq) {
        return;
      }

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

      const countsMap: Record<string, { total: number; done: number }> = {};
      for (const s of allSubFoci || []) {
        if (!countsMap[s.focus_id]) {
          countsMap[s.focus_id] = { total: 0, done: 0 };
        }
        countsMap[s.focus_id].total += 1;
        if (s.status === 'done') {
          countsMap[s.focus_id].done += 1;
        }
      }
      subCountsRef.current = countsMap;
      essayCountsRef.current = essayCountsMap || {};
      setSubCounts(countsMap);
      setEssayCounts(essayCountsMap || {});
      setFoci(fociData);
      setRelations(relData);
      syncNodesFromFoci(fociData, countsMap, essayCountsMap || {});
      syncEdgesFromRelations(relData);

      // 仅在首次挂载且未居中过时执行一次 fitView，彻底避免拖拽中被动画打断和慢速漂移
      if (fociData.length > 0 && !isInitialFitDoneRef.current) {
        isInitialFitDoneRef.current = true;
        setTimeout(() => {
          reactFlowInstanceRef.current?.fitView({ padding: 0.3, maxZoom: 1.2, duration: 300 });
        }, 100);
      }
    } catch (err: unknown) {
      if (activeLifeIdRef.current === lifeId && loadSeqRef.current === currentSeq) {
        console.error('Failed to load focus canvas data', err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`加载国策树数据失败: ${msg}`);
      }
    }
  }, [lifeId, syncNodesFromFoci, syncEdgesFromRelations, toast]);

  useEffect(() => {
    isInitialFitDoneRef.current = false;
    setNodes([]);
    setEdges([]);
    setSelectedFocus(null);
    loadData();
  }, [lifeId, loadData, setNodes, setEdges]);

  // Save node content edits
  const handleSaveNodeContent = async () => {
    if (!selectedFocus || !editTitle.trim()) return;
    setSaveStatus('saving');
    try {
      await api.updateFocusContent(
        lifeId,
        selectedFocus.id,
        editTitle.trim(),
        editBodyMd.trim(),
        selectedFocus.icon || undefined
      );
      const updated = { ...selectedFocus, title: editTitle.trim(), body_md: editBodyMd.trim() };
      setSelectedFocus(updated);
      const updatedFoci = foci.map((f) => (f.id === selectedFocus.id ? updated : f));
      setFoci(updatedFoci);
      syncNodesFromFoci(updatedFoci);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err: unknown) {
      console.error('Failed to save focus content', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`保存国策内容失败: ${msg}`);
      setSaveStatus('idle');
    }
  };

  // 切换常规国策与突发遭遇国策类型
  const toggleEncounterType = async () => {
    if (!selectedFocus) return;
    const nextIcon = selectedFocus.icon === 'encounter' ? null : 'encounter';
    try {
      await api.updateFocusContent(
        lifeId,
        selectedFocus.id,
        selectedFocus.title,
        selectedFocus.body_md,
        nextIcon || undefined
      );
      const updated = { ...selectedFocus, icon: nextIcon };
      setSelectedFocus(updated);
      const updatedFoci = foci.map((f) => (f.id === selectedFocus.id ? updated : f));
      setFoci(updatedFoci);
      syncNodesFromFoci(updatedFoci);
      toast.success(nextIcon === 'encounter' ? '已标记为【突发遭遇】' : '已转为【常规战略】');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`切换国策类型失败: ${msg}`);
    }
  };

  const onNodeDragStart = useCallback((_: unknown, node: Node) => {
    dragStartPosRef.current = { id: node.id, x: node.position.x, y: node.position.y };
  }, []);

  // 严格保障拖拽坐标持久化 (§7.1 / A03)
  const onNodeDragStop = useCallback(
    async (_: unknown, node: Node) => {
      if (dragStartPosRef.current && dragStartPosRef.current.id === node.id) {
        const from = { x: dragStartPosRef.current.x, y: dragStartPosRef.current.y };
        const to = { x: node.position.x, y: node.position.y };
        if (from.x !== to.x || from.y !== to.y) {
          setUndoStack((prev) => [...prev, { type: 'MOVE', focusId: node.id, from, to }]);
        }
      }
      setFoci((prev) =>
        prev.map((f) =>
          f.id === node.id ? { ...f, position_x: node.position.x, position_y: node.position.y } : f
        )
      );
      try {
        await api.updateFocusPosition(lifeId, node.id, node.position.x, node.position.y);
      } catch (err) {
        console.error('Failed to persist node position', err);
        toast.error('保存节点位置失败，已保留当前画布位置，请稍后重试');
      }
    },
    [lifeId]
  );

  const onEdgesChangeHandler = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      for (const change of changes) {
        if (change.type === 'remove') {
          const rel = relations.find((r) => r.id === change.id);
          if (rel) {
            api.deleteFocusRelation(lifeId, rel.id).catch((err) => {
              console.error('Failed to delete focus relation', err);
              toast.error('删除关系失败，请刷新后重试');
            });
            setRelations((prev) => prev.filter((r) => r.id !== rel.id));
            setUndoStack((prev) => [...prev, { type: 'DELETE_RELATION', relation: rel }]);
          }
        }
      }
    },
    [lifeId, relations, onEdgesChange]
  );

  // 连线创建：依据当前连接模式 (前置路线 vs 互斥路线)
  const onConnect = useCallback(
    async (params: Connection) => {
      if (!params.source || !params.target || params.source === params.target) return;
      try {
        const rel = await api.addFocusRelation(
          lifeId,
          params.source,
          params.target,
          connectionMode
        );
        const nextRelations = [...relations, rel];
        setRelations(nextRelations);
        syncEdgesFromRelations(nextRelations);
        setUndoStack((prev) => [...prev, { type: 'ADD_RELATION', relation: rel }]);
        toast.success('路线连线已确立');
      } catch (err: unknown) {
        console.error('Failed to add focus relation', err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`建立国策联系失败: ${msg}`);
      }
    },
    [lifeId, connectionMode, relations, syncEdgesFromRelations, toast]
  );

  // Status transition handler (§7.2: 四状态任意流转)
  const handleStatusChange = async (targetStatus: FocusStatus) => {
    if (!selectedFocus || selectedFocus.status === targetStatus) return;
    const oldStatus = selectedFocus.status;
    try {
      if (targetStatus === 'completed') {
        soundFx.playFocusComplete();
      } else if (targetStatus === 'active') {
        soundFx.playFocusStart();
      } else if (targetStatus === 'revoked') {
        soundFx.playVoid();
      } else {
        soundFx.playClick();
      }

      await api.updateFocusStatus(
        lifeId,
        selectedFocus.id,
        targetStatus,
        statusReason.trim() || undefined
      );
      setStatusReason('');
      const updatedFoci = foci.map((f) =>
        f.id === selectedFocus.id ? { ...f, status: targetStatus } : f
      );
      setFoci(updatedFoci);
      syncNodesFromFoci(updatedFoci);
      setSelectedFocus({ ...selectedFocus, status: targetStatus });
      setUndoStack((prev) => [
        ...prev,
        { type: 'STATUS', focusId: selectedFocus.id, from: oldStatus, to: targetStatus },
      ]);
      const hist = await api.getFocusHistory(lifeId, selectedFocus.id);
      setFocusHistory(hist);
      toast.success(`国策状态已流转为【${targetStatus}】`);
    } catch (err: unknown) {
      console.error('Failed to update focus status', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`更新国策状态失败: ${msg}`);
    }
  };

  // Node deletion handler
  const handleDeleteFocus = async () => {
    if (!selectedFocus) return;
    if (!window.confirm(`确定删除国策「${selectedFocus.title}」？相关连线与状态记录也将移除。支持 Ctrl+Z 撤销。`)) return;
    try {
      soundFx.playVoid();

      const associatedRels = relations.filter(
        (r) => r.source_focus_id === selectedFocus.id || r.target_focus_id === selectedFocus.id
      );
      await api.deleteFocus(lifeId, selectedFocus.id);
      const nextFoci = foci.filter((f) => f.id !== selectedFocus.id);
      const nextRels = relations.filter(
        (r) => r.source_focus_id !== selectedFocus.id && r.target_focus_id !== selectedFocus.id
      );
      setFoci(nextFoci);
      setRelations(nextRels);
      syncNodesFromFoci(nextFoci);
      syncEdgesFromRelations(nextRels);
      setUndoStack((prev) => [
        ...prev,
        { type: 'DELETE_NODE', focus: selectedFocus, relations: associatedRels },
      ]);
      toast.info(`国策【${selectedFocus.title}】已撤除`);
      setSelectedFocus(null);
    } catch (err: unknown) {
      console.error('Failed to delete focus', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`撤除国策失败: ${msg}`);
    }
  };

  // 撤销栈执行器 (§15 / A28: Ctrl+Z 回退画面并同步数据库)
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    try {
      switch (action.type) {
        case 'MOVE': {
          await api.updateFocusPosition(lifeId, action.focusId, action.from.x, action.from.y);
          const nextFoci = foci.map((f) =>
            f.id === action.focusId ? { ...f, position_x: action.from.x, position_y: action.from.y } : f
          );
          setFoci(nextFoci);
          syncNodesFromFoci(nextFoci);
          if (selectedFocus?.id === action.focusId) {
            setSelectedFocus((prev) =>
              prev ? { ...prev, position_x: action.from.x, position_y: action.from.y } : null
            );
          }
          break;
        }
        case 'STATUS': {
          await api.updateFocusStatus(lifeId, action.focusId, action.from, 'Ctrl+Z 撤销状态');
          const nextFoci = foci.map((f) => (f.id === action.focusId ? { ...f, status: action.from } : f));
          setFoci(nextFoci);
          syncNodesFromFoci(nextFoci);
          if (selectedFocus?.id === action.focusId) {
            setSelectedFocus((prev) => (prev ? { ...prev, status: action.from } : null));
            const hist = await api.getFocusHistory(lifeId, action.focusId);
            setFocusHistory(hist);
          }
          break;
        }
        case 'ADD_RELATION': {
          await api.deleteFocusRelation(lifeId, action.relation.id);
          const nextRels = relations.filter((r) => r.id !== action.relation.id);
          setRelations(nextRels);
          syncEdgesFromRelations(nextRels);
          break;
        }
        case 'DELETE_RELATION': {
          const rel = await api.addFocusRelation(
            lifeId,
            action.relation.source_focus_id,
            action.relation.target_focus_id,
            action.relation.relation_type,
            action.relation.note || undefined
          );
          const nextRels = [...relations, rel];
          setRelations(nextRels);
          syncEdgesFromRelations(nextRels);
          break;
        }
        case 'DELETE_NODE': {
          const restored = await api.createFocus(
            lifeId,
            action.focus.title,
            action.focus.body_md,
            action.focus.status,
            action.focus.position_x,
            action.focus.position_y,
            action.focus.icon || undefined
          );
          // 重新建立连线
          const restoredRels: FocusRelation[] = [];
          for (const r of action.relations) {
            const src = r.source_focus_id === action.focus.id ? restored.id : r.source_focus_id;
            const tgt = r.target_focus_id === action.focus.id ? restored.id : r.target_focus_id;
            const rel = await api.addFocusRelation(lifeId, src, tgt, r.relation_type, r.note || undefined);
            restoredRels.push(rel);
          }
          const nextFoci = [...foci, restored];
          const nextRels = [...relations, ...restoredRels];
          setFoci(nextFoci);
          setRelations(nextRels);
          syncNodesFromFoci(nextFoci);
          syncEdgesFromRelations(nextRels);
          setSelectedFocus(restored);
          break;
        }
        case 'CREATE_NODE': {
          await api.deleteFocus(lifeId, action.focusId);
          const nextFoci = foci.filter((f) => f.id !== action.focusId);
          const nextRels = relations.filter(
            (r) => r.source_focus_id !== action.focusId && r.target_focus_id !== action.focusId
          );
          setFoci(nextFoci);
          setRelations(nextRels);
          syncNodesFromFoci(nextFoci);
          syncEdgesFromRelations(nextRels);
          if (selectedFocus?.id === action.focusId) setSelectedFocus(null);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to execute undo', err);
    }
  }, [lifeId, undoStack, foci, relations, selectedFocus, syncNodesFromFoci, syncEdgesFromRelations]);

  // 全局 Ctrl+Z 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        // 如果当前聚焦在输入框内，不拦截原生文本撤销
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Create new focus
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      let posX = 250;
      let posY = 150;
      if (parentFocusForCreation) {
        // If created from an existing parent node
        posX = parentFocusForCreation.position_x;
        posY = parentFocusForCreation.position_y + 190;
      } else if (selectedFocus) {
        // If a focus was selected, place the new focus underneath it as a logical next step
        posX = selectedFocus.position_x;
        posY = selectedFocus.position_y + 190;
      } else if (foci.length > 0) {
        // Stagger cleanly across columns or below the latest node
        const maxX = Math.max(...foci.map((f) => f.position_x));
        const matchingFoci = foci.filter((f) => Math.abs(f.position_x - maxX) < 50);
        const maxY = Math.max(...matchingFoci.map((f) => f.position_y));
        if (matchingFoci.length >= 3) {
          // start new column
          posX = maxX + 300;
          posY = 150;
        } else {
          posX = maxX;
          posY = maxY + 190;
        }
      } else if (reactFlowInstance) {
        const zoom = reactFlowInstance.getZoom() || 1;
        const { x: vx, y: vy } = reactFlowInstance.getViewport();
        const centerCanvasX = (window.innerWidth / 2 - vx) / zoom;
        const centerCanvasY = (window.innerHeight / 2 - vy) / zoom;
        if (Number.isFinite(centerCanvasX) && Number.isFinite(centerCanvasY)) {
          posX = Math.round(centerCanvasX - 128);
          posY = Math.round(centerCanvasY - 70);
        }
      }
      const created = await api.createFocus(
        lifeId,
        newTitle.trim(),
        newBodyMd.trim(),
        newStatus,
        posX,
        posY,
        newIcon || undefined
      );

      if (parentFocusForCreation) {
        try {
          const newRel = await api.addFocusRelation(
            lifeId,
            parentFocusForCreation.id,
            created.id,
            'prerequisite'
          );
          const nextRels = [...relations, newRel];
          setRelations(nextRels);
          syncEdgesFromRelations(nextRels);
          setUndoStack((prev) => [
            ...prev,
            { type: 'CREATE_NODE', focusId: created.id },
            { type: 'ADD_RELATION', relation: newRel },
          ]);
        } catch (relErr) {
          console.error('Failed to link parent focus relation', relErr);
          setUndoStack((prev) => [...prev, { type: 'CREATE_NODE', focusId: created.id }]);
        }
      } else {
        setUndoStack((prev) => [...prev, { type: 'CREATE_NODE', focusId: created.id }]);
      }

      const updatedFoci = [...foci, created];
      setFoci(updatedFoci);
      syncNodesFromFoci(updatedFoci);
      setNewTitle('');
      setNewBodyMd('');
      setNewIcon('');
      setParentFocusForCreation(null);
      setShowCreateModal(false);
      setSelectedFocus(created);
      setEditTitle(created.title);
      setEditBodyMd(created.body_md);
      toast.success(`国策【${created.title}】已立项制定`);
    } catch (err: unknown) {
      console.error('Failed to create focus', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`创建国策失败: ${msg}`);
    }
  };

  // 打开 AI 指令推演弹窗 (允许统帅输入特定需求、意图与文风，不再单调死板)
  const handleOpenAiNextNode = () => {
    if (!selectedFocus) return;
    setAiCmdMode('next_node');
    setAiCmdModalOpen(true);
  };

  const handleOpenAiInitialLine = () => {
    setAiCmdMode('initial_line');
    setAiCmdModalOpen(true);
  };

  const handleOpenAiRefineBody = () => {
    if (!selectedFocus) return;
    setAiCmdMode('refine_body');
    setAiCmdModalOpen(true);
  };

  const handleRunAiCommand = async (requirement: string, style: string) => {
    setIsGeneratingAi(true);
    try {
      if (aiCmdMode === 'next_node' && selectedFocus) {
        const proposals = await generateNextFocusProposals(selectedFocus, strategyContext, style, requirement);
        setAiProposals(proposals);
        setAiCmdModalOpen(false);
        setShowAiModal(true);
      } else if (aiCmdMode === 'initial_line') {
        const proposals = await generateInitialFocuses(strategyContext, style, requirement);
        setAiProposals(proposals);
        setAiCmdModalOpen(false);
        setShowAiModal(true);
      } else if (aiCmdMode === 'refine_body' && selectedFocus) {
        const refined = await refineText(editBodyMd, 'focus', style, strategyContext, requirement);
        setRefinedTextProposal(refined);
        setAiCmdModalOpen(false);
        setRefineModalOpen(true);
      }
    } catch (err) {
      console.error('AI command generation failed:', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // 接受 AI 建议落库 (§7.4: 允许用户自主选择四状态之一与编辑内容)
  const handleAcceptProposal = async (proposal: AIProposalItem) => {
    try {
      const created = await api.createFocus(
        lifeId,
        proposal.title,
        proposal.bodyMd,
        proposal.status,
        selectedFocus ? selectedFocus.position_x + 80 : 300,
        selectedFocus ? selectedFocus.position_y + 160 : 300
      );
      let newRel: FocusRelation | null = null;
      let nextRels = relations;
      if (selectedFocus) {
        newRel = await api.addFocusRelation(
          lifeId,
          selectedFocus.id,
          created.id,
          proposal.relationType
        );
        nextRels = [...relations, newRel];
        setRelations(nextRels);
        syncEdgesFromRelations(nextRels);
      }
      const nextFoci = [...foci, created];
      setFoci(nextFoci);
      syncNodesFromFoci(nextFoci);
      setUndoStack((prev) => [
        ...prev,
        { type: 'CREATE_NODE', focusId: created.id },
      ]);
      setAiProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      if (aiProposals.length <= 1) {
        setShowAiModal(false);
      }
      setSelectedFocus(created);
      setEditTitle(created.title);
      setEditBodyMd(created.body_md);
    } catch (err) {
      console.error('Failed to accept proposal', err);
    }
  };

  // 计算当前选中节点的关联关系集合
  const currentIncoming = useMemo(() => {
    if (!selectedFocus) return [];
    return relations.filter((r) => r.target_focus_id === selectedFocus.id && r.relation_type === 'prerequisite');
  }, [relations, selectedFocus]);


  const currentMutuallyExclusive = useMemo(() => {
    if (!selectedFocus) return [];
    return relations.filter(
      (r) =>
        r.relation_type === 'mutually_exclusive' &&
        (r.source_focus_id === selectedFocus.id || r.target_focus_id === selectedFocus.id)
    );
  }, [relations, selectedFocus]);

  const attachedEssayIds = useMemo(() => new Set(focusEssays.map((e) => e.id)), [focusEssays]);
  const availableToAttach = useMemo(
    () => allLifeEssays.filter((e) => !attachedEssayIds.has(e.id)),
    [allLifeEssays, attachedEssayIds]
  );

  return (
    <div className="relative w-full h-[calc(100vh-80px)] bg-[#121518] overflow-hidden flex flex-col select-none border-t-2 border-[#2b333c]">
      {/* 1. HOI4 原生顶部工业铁轨人字防滑饰条 (Top Chevron Girder Bar matching HOI4 Image 4) */}
      <div className="hoi4-canvas-girder w-full shrink-0 flex items-center justify-between px-6 z-10 select-none">
        <div className="flex items-center space-x-3">
          <div className="screw-rivet" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#cbd5e1] font-bold">
            NATIONAL FOCUS TREE · 战略国策树
          </span>
          <div className="screw-rivet" />
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="text-[#94a3b8]">已达成战略:</span>
            <span className="text-amber-300 font-bold text-sm">
              {foci.filter((f) => f.status === 'completed').length}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[#94a3b8]">执行推进中:</span>
            <span className="text-emerald-400 font-bold text-sm">
              {foci.filter((f) => f.status === 'active').length}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[#94a3b8]">战略总谱:</span>
            <span className="text-[#f8fafc] font-bold">{foci.length} 项</span>
          </div>

          <span className="text-slate-600">|</span>

          {/* 常驻显著的新建国策与突发遭遇入口 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                soundFx.playClick();
                setParentFocusForCreation(null);
                setNewIcon('');
                setShowCreateModal(true);
              }}
              className="hoi4-btn-military flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-bold transition shadow hover:brightness-110 cursor-pointer"
              title="制定新的战略国策节点"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>+ 新建国策</span>
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                setParentFocusForCreation(null);
                setNewIcon('encounter');
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-bold transition shadow bg-gradient-to-r from-orange-800 to-amber-800 hover:from-orange-700 hover:to-amber-700 text-orange-100 border border-orange-500/70 cursor-pointer"
              title="录入突发考验或意外事件，作为遭遇型国策应急攻坚"
            >
              <Zap className="w-3 h-3 text-orange-300 animate-pulse" />
              <span>⚡ 突发遭遇</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. React Flow 2D Canvas (深钢冷铸铁暗色网格沙盘) */}
      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChangeHandler}
          onConnect={onConnect}
          onNodeClick={(_e, node) => {
            const f = (node.data as unknown as FocusNodeData)?.focus;
            if (f) handleSelectNode(f);
          }}
          onInit={(instance) => {
            reactFlowInstanceRef.current = instance;
            setReactFlowInstance(instance);
          }}
          nodeTypes={nodeTypes}
          minZoom={0.2}
          maxZoom={2}
          snapToGrid={true}
          snapGrid={[15, 15]}
          panOnDrag={true}
          panOnScroll={false}
          autoPanOnNodeDrag={false}
          autoPanOnConnect={false}
          nodesDraggable={true}
          preventScrolling={false}
        >
          <Background color="#475569" gap={32} size={1} style={{ opacity: 0.16 }} />
          <Controls
            className="!bg-[#1a1e23] !border-2 !border-[#3d4652] !text-[#f8fafc] !rounded-sm shadow-2xl"
            position="bottom-left"
          />
          <MiniMap
            nodeColor="#d4af37"
            maskColor="rgba(18, 21, 24, 0.85)"
            className="!bg-[#14171a] !border-2 !border-[#3d4652] !rounded-sm opacity-90 hover:opacity-100 transition shadow-2xl"
            position="bottom-left"
            style={{ marginLeft: 50, width: 140, height: 90 }}
          />
        </ReactFlow>

        {/* Floating Canvas Top Action Bar (HOI4 沉浸式战区控制台) */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2.5 hoi4-window px-4 py-2 rounded shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
          <button
            onClick={() => {
              soundFx.playClick();
              setParentFocusForCreation(null);
              setNewIcon('');
              setShowCreateModal(true);
            }}
            className="hoi4-btn-military flex items-center space-x-1.5 px-3.5 py-1.5 rounded-sm text-xs font-bold transition shadow-md hover:brightness-110 border border-[#d4af37]/60 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>新建国策</span>
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setParentFocusForCreation(null);
              setNewIcon('encounter');
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition shadow-md bg-gradient-to-r from-orange-800/90 to-amber-800/90 hover:from-orange-700 hover:to-amber-700 text-orange-100 border border-orange-500/70 shadow-[0_0_12px_rgba(249,115,22,0.3)] cursor-pointer"
            title="录入突发考验或意外事件，作为遭遇型国策应急攻坚"
          >
            <Zap className="w-3.5 h-3.5 text-orange-300 animate-pulse" />
            <span>⚡ 录入突发遭遇</span>
          </button>

          <button
            onClick={handleOpenAiInitialLine}
            className="hoi4-btn-steel flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition shadow"
            title="输入定制需求让 AI 启发全新战略攻坚主线"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI 启发战略主线</span>
          </button>

          {/* Connection Mode Selector (§7.3: 前置路线 vs 互斥路线切换) */}
          <div className="flex items-center space-x-1 bg-[#101316] p-1 rounded-sm border border-[#2b333c]">
            <span className="text-[11px] font-mono text-[#94a3b8] px-1.5 font-bold">连线模式:</span>
            <button
              onClick={() => setConnectionMode('prerequisite')}
              className={`px-2.5 py-1 text-xs rounded-sm font-bold transition ${
                connectionMode === 'prerequisite'
                  ? 'bg-[#d4af37] text-black shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              前置路线
            </button>
            <button
              onClick={() => setConnectionMode('mutually_exclusive')}
              className={`px-2.5 py-1 text-xs rounded-sm font-bold transition ${
                connectionMode === 'mutually_exclusive'
                  ? 'bg-rose-700 text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-[#f8fafc]'
              }`}
            >
              互斥路线 &lt; ! &gt;
            </button>
          </div>

          {/* Undo Button */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="hoi4-btn-steel flex items-center space-x-1 px-3 py-1.5 disabled:opacity-40 rounded-sm text-xs font-mono transition"
            title="撤销最近移动或操作 (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>撤销 {undoStack.length > 0 ? `(${undoStack.length})` : ''}</span>
          </button>

          {/* Manual Fit View Button */}
          <button
            onClick={() => reactFlowInstanceRef.current?.fitView({ padding: 0.3, maxZoom: 1.2, duration: 300 })}
            className="hoi4-btn-steel flex items-center space-x-1 px-2.5 py-1.5 rounded-sm text-xs font-semibold transition shadow-sm text-amber-300"
            title="将所有国策自适应居中到视口中央"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>沙盘复位</span>
          </button>
        </div>
      </div>

      {/* 3. HOI4 原生国策详情大弹窗 (严格复刻素材图 3 media_1789656055585.png) */}
      {selectedFocus && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="hoi4-window w-full max-w-xl rounded shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col border-2 border-[#3e4754] text-[#ffffff] animate-in fade-in zoom-in-95 duration-150">
            {/* 顶部标题栏：居中大写标题 + 金属铆钉 + 右上角铜质十字叉关闭按钮 (素材图 3 顶部) */}
            <div className="hoi4-header-bar px-4 py-2.5 flex items-center justify-between relative select-none">
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full border border-[#1a1d22] shadow-inner ${
                    selectedFocus.icon === 'encounter' ? 'bg-orange-500 animate-pulse' : 'bg-[#caa858]'
                  }`}
                />
                <span
                  className={`font-sans font-bold text-[10.5px] uppercase tracking-wider ${
                    selectedFocus.icon === 'encounter' ? 'text-orange-400' : 'text-[#94a3b8]'
                  }`}
                >
                  {selectedFocus.icon === 'encounter' ? '⚡ 突发遭遇 · ENCOUNTER' : 'NATIONAL FOCUS'}
                </span>
              </div>

              {/* 居中加大纯白标题：字体高对比度，清晰易读 */}
              <h3 className="font-serif font-black text-sm uppercase tracking-widest text-[#ffffff] text-center drop-shadow-[0_1px_2px_rgba(0,0,0,1)] truncate max-w-md px-2">
                {selectedFocus.title}
              </h3>

              {/* 右上角方形古铜十字叉关闭按钮 */}
              <button
                onClick={() => setSelectedFocus(null)}
                className="hoi4-close-btn rounded-xs shrink-0"
                title="关闭 (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 bg-[#14171a]">
              {/* 顶部操作行：胶囊天数框 + 军绿战备推进大按钮 (素材图 3 顶部：35 days + Start) */}
              <div className="flex items-center justify-between pb-1">
                {/* 35 days 胶囊框 */}
                <div
                  className={`hoi4-pill-badge px-6 py-1 text-xs font-mono font-bold tracking-wider flex items-center space-x-2 ${
                    selectedFocus.icon === 'encounter'
                      ? '!border-orange-500/80 !text-orange-200 bg-orange-950/40 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                      : ''
                  }`}
                >
                  {selectedFocus.icon === 'encounter' && (
                    <Zap className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                  )}
                  <span>
                    {selectedFocus.icon === 'encounter'
                      ? selectedFocus.status === 'completed'
                        ? '★ 遭遇已化解 (RESOLVED)'
                        : selectedFocus.status === 'active'
                        ? '⚡ 突发遭遇 · 应急推进'
                        : selectedFocus.status === 'paused'
                        ? '⏳ 暂缓处置 (STANDBY)'
                        : '✕ 遭遇中止 (ABANDONED)'
                      : selectedFocus.status === 'completed'
                      ? '战略达成 (ACHIEVED)'
                      : selectedFocus.status === 'active'
                      ? '35 天 · 进行中 (35 DAYS)'
                      : selectedFocus.status === 'paused'
                      ? '战略休整中 (STANDBY)'
                      : '战略中止 (VOID)'}
                  </span>
                </div>

                {/* 军工橄榄绿主动作按钮 (Start / Complete / Standby) */}
                <div className="flex items-center space-x-2">
                  {/* 类型切换按钮 (常规战略 vs 突发遭遇) */}
                  <button
                    type="button"
                    onClick={toggleEncounterType}
                    className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold border transition flex items-center space-x-1.5 ${
                      selectedFocus.icon === 'encounter'
                        ? 'bg-orange-950/80 border-orange-500 text-orange-200 hover:bg-orange-900 shadow-[0_0_8px_rgba(249,115,22,0.3)]'
                        : 'bg-[#1a1e23] border-[#3d4652] text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#64748b]'
                    }`}
                    title={
                      selectedFocus.icon === 'encounter'
                        ? '点击转为常规战略国策'
                        : '点击转为突发遭遇国策'
                    }
                  >
                    <Zap
                      className={`w-3.5 h-3.5 ${
                        selectedFocus.icon === 'encounter' ? 'text-orange-400' : 'text-[#94a3b8]'
                      }`}
                    />
                    <span>{selectedFocus.icon === 'encounter' ? '突发遭遇' : '转为遭遇'}</span>
                  </button>

                  {selectedFocus.status !== 'completed' ? (
                    <button
                      onClick={() => handleStatusChange('completed')}
                      className="hoi4-btn-military px-5 py-1.5 rounded-sm text-xs font-serif font-bold flex items-center space-x-1.5"
                      title="完成并达成此战略国策"
                    >
                      <span>达成战略 (Complete)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="hoi4-btn-steel px-4 py-1.5 rounded-sm text-xs font-serif font-bold text-emerald-300"
                      title="重置回进行中状态"
                    >
                      <span>重新推进 (Start)</span>
                    </button>
                  )}

                  {selectedFocus.status === 'active' ? (
                    <button
                      onClick={() => handleStatusChange('paused')}
                      className="hoi4-btn-steel px-3 py-1.5 rounded-sm text-xs font-serif font-bold text-amber-300"
                      title="将国策挂起休整"
                    >
                      <span>休整</span>
                    </button>
                  ) : selectedFocus.status === 'paused' ? (
                    <button
                      onClick={() => handleStatusChange('active')}
                      className="hoi4-btn-military px-4 py-1.5 rounded-sm text-xs font-serif font-bold"
                      title="恢复进行此国策"
                    >
                      <span>恢复推进</span>
                    </button>
                  ) : null}

                  {selectedFocus.status !== 'revoked' && (
                    <button
                      onClick={() => handleStatusChange('revoked')}
                      className="px-2.5 py-1.5 rounded-sm bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-mono font-bold"
                      title="作废中止此国策"
                    >
                      <span>作废</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 中间核心区：左侧月桂花环大徽章 + 右侧暗纹凹槽条件要求面板 (素材图 3 中间) */}
              <div className="grid grid-cols-12 gap-3 items-center">
                {/* 左侧：3D 金属月桂花环徽章 */}
                <div className="col-span-4 flex flex-col items-center justify-center p-2">
                  <div className="relative flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                      <path
                        d="M 50 90 C 25 86 10 65 14 42 C 16 30 26 18 38 12 C 34 20 33 30 38 38 C 30 34 22 44 26 54 C 22 58 24 70 34 76 C 38 78 44 84 50 90 Z"
                        fill={
                          selectedFocus.icon === 'encounter'
                            ? 'url(#orangeGradModal)'
                            : 'url(#goldGradModal)'
                        }
                        stroke={selectedFocus.icon === 'encounter' ? '#431407' : '#261b05'}
                        strokeWidth="1"
                      />
                      <path
                        d="M 50 90 C 75 86 90 65 86 42 C 84 30 74 18 62 12 C 66 20 67 30 62 38 C 70 34 78 44 74 54 C 78 58 76 70 66 76 C 62 78 56 84 50 90 Z"
                        fill={
                          selectedFocus.icon === 'encounter'
                            ? 'url(#orangeGradModal)'
                            : 'url(#goldGradModal)'
                        }
                        stroke={selectedFocus.icon === 'encounter' ? '#431407' : '#261b05'}
                        strokeWidth="1"
                      />
                      <circle
                        cx="50"
                        cy="88"
                        r="4.5"
                        fill={selectedFocus.icon === 'encounter' ? '#ea580c' : '#f59e0b'}
                        stroke={selectedFocus.icon === 'encounter' ? '#431407' : '#3b2605'}
                        strokeWidth="1"
                      />
                      <defs>
                        <linearGradient id="goldGradModal" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fff8db" />
                          <stop offset="35%" stopColor="#f5c742" />
                          <stop offset="70%" stopColor="#b8861b" />
                          <stop offset="100%" stopColor="#634509" />
                        </linearGradient>
                        <linearGradient id="orangeGradModal" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffedd5" />
                          <stop offset="35%" stopColor="#fb923c" />
                          <stop offset="70%" stopColor="#c2410c" />
                          <stop offset="100%" stopColor="#7c2d12" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div
                      className={`absolute w-14 h-14 rounded-full bg-gradient-to-br shadow-[inset_0_3px_6px_rgba(0,0,0,0.9),0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center ${
                        selectedFocus.icon === 'encounter'
                          ? 'from-[#3a1a08] via-[#210f04] to-[#0a0502] border-2 border-orange-500'
                          : 'from-[#261f10] via-[#161208] to-[#0a0804] border-2 border-[#d4af37]'
                      }`}
                    >
                      {selectedFocus.icon === 'encounter' ? (
                        <Zap className="w-7 h-7 text-orange-400 drop-shadow-[0_2px_6px_rgba(249,115,22,0.9)] animate-pulse" />
                      ) : (
                        <Coins className="w-7 h-7 text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8] mt-1.5">
                    战略标志徽记
                  </span>
                </div>

                {/* 右侧：HOI4 暗纹凹槽条件清单 (绿色勾选框 + 金黄色修饰词高亮) */}
                <div className="col-span-8 hoi4-inset-panel p-3 rounded-sm min-h-[110px] flex flex-col justify-center space-y-2 text-xs font-sans">
                  {/* 前置需求 */}
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400 font-bold">✔</span>
                    <span className="text-[#d1d5db]">
                      {currentIncoming.length === 0 ? (
                        <span>
                          前置战略需求：
                          <strong className="text-[#fef08a] font-bold">无前置依赖条件 (起点根基)</strong>
                        </span>
                      ) : (
                        <span>
                          前置战略需求：
                          {currentIncoming.map((r, i) => {
                            const src = foci.find((f) => f.id === r.source_focus_id);
                            return (
                              <span key={r.id} className="text-[#fbbf24] font-bold">
                                {i > 0 ? '、' : ' '}
                                {src?.title || '未知国策'}
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* 互斥警告 (Mutually exclusive with...) */}
                  {currentMutuallyExclusive.length > 0 ? (
                    <div className="flex items-start space-x-2 text-rose-400">
                      <span className="font-bold text-amber-400">⚠️</span>
                      <span>
                        互斥排他战线：
                        {currentMutuallyExclusive.map((r, i) => {
                          const otherId =
                            r.source_focus_id === selectedFocus.id ? r.target_focus_id : r.source_focus_id;
                          const other = foci.find((f) => f.id === otherId);
                          return (
                            <strong key={r.id} className="text-[#fbbf24] font-bold underline ml-1">
                              {i > 0 ? '、' : ''}
                              {other?.title || '未知国策'}
                            </strong>
                          );
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-[#94a3b8]">
                      <span className="text-emerald-400 font-bold">✔</span>
                      <span>无互斥冲突路线</span>
                    </div>
                  )}

                  {/* 拆解步骤徽章 */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#252c36]">
                    <span className="text-[#94a3b8] text-[11px] font-mono">战役执行拆解步骤:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSubFocusModalTarget(selectedFocus);
                        setIsSubFocusModalOpen(true);
                      }}
                      className="text-[11px] text-[#fbbf24] hover:underline font-mono font-bold flex items-center space-x-1"
                    >
                      <span>
                        {subCounts[selectedFocus.id]?.done || 0} / {subCounts[selectedFocus.id]?.total || 0} 步骤已推进
                      </span>
                      <span className="text-xs">↗</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 底部战略意图与描述区：纯白高对比度文字 (严格解决文字可读性问题) */}
              <div className="hoi4-inset-panel p-3.5 rounded-sm space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[#252c36]">
                  <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#94a3b8]">
                    STRATEGIC DOCTRINE & FLAVOR (战略内涵与行动意图)
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleOpenAiRefineBody}
                      className="text-[11px] font-mono text-[#fbbf24] hover:text-[#fef08a] flex items-center space-x-1 transition"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>AI 参谋润色</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNodeContent}
                      disabled={saveStatus === 'saving'}
                      className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      <span>{saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中...' : '保存修改'}</span>
                    </button>
                  </div>
                </div>

                {/* 高对比度纯白正文 */}
                <div className="text-xs leading-relaxed text-[#ffffff] max-h-36 overflow-y-auto pr-1 font-sans">
                  <MarkdownEditor
                    value={editBodyMd}
                    onChange={(val) => setEditBodyMd(val)}
                    placeholder="在此详细叙述该国策的战略内涵、推进步骤与历史意图..."
                    defaultMode="preview"
                    minHeight="90px"
                    rows={3}
                  />
                </div>

                {focusHistory.length > 0 && (
                  <div className="pt-2 border-t border-[#29323e] text-[10px] font-mono text-[#94a3b8] flex items-center space-x-2">
                    <span>状态演进记录: {focusHistory.length} 条</span>
                    <span className="text-[#64748b]">
                      (最新: {focusHistory[0]?.to_status} · {focusHistory[0]?.recorded_at?.slice(0, 10)})
                    </span>
                  </div>
                )}
              </div>

              {/* 挂载随笔管理面板 (HOI4 Attached Essays / Operational Memoirs) */}
              <div className="hoi4-inset-panel p-3 rounded-sm space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-[#252c36]">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#fbbf24]" />
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#ffffff]">
                      挂载战地随笔 · 心得与推演记录 ({focusEssays.length})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* 挂载已有随笔按钮 */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAttachDropdown(!showAttachDropdown)}
                        className="text-[11px] font-mono text-[#cbd5e1] hover:text-[#fbbf24] flex items-center space-x-1 px-2 py-1 rounded bg-[#13171c] border border-[#323c4a] hover:border-[#fbbf24] transition cursor-pointer"
                        title="从当前空间中选择已有随笔挂载至此国策"
                      >
                        <Link className="w-3 h-3 text-[#d4af37]" />
                        <span>挂载已有</span>
                      </button>

                      {showAttachDropdown && (
                        <div className="absolute right-0 bottom-full mb-1.5 w-64 p-2.5 rounded hoi4-window z-50 shadow-2xl border-2 border-[#434e5c] max-h-52 overflow-y-auto">
                          <div className="text-[10px] font-mono text-[#94a3b8] pb-1 border-b border-[#2b3440] mb-1.5 flex justify-between items-center">
                            <span>选择空间内随笔挂载:</span>
                            <button
                              type="button"
                              onClick={() => setShowAttachDropdown(false)}
                              className="text-rose-400 hover:text-white px-1 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                          {availableToAttach.length === 0 ? (
                            <div className="text-[11px] text-[#64748b] py-3 text-center font-serif">
                              暂无其他未挂载的随笔
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {availableToAttach.map((e) => (
                                <button
                                  key={e.id}
                                  type="button"
                                  onClick={() => handleAttachExistingEssay(e.id)}
                                  className="w-full text-left p-1.5 rounded hover:bg-[#202731] transition text-xs text-[#e2e8f0] truncate flex items-center justify-between group border border-transparent hover:border-[#3d4857]"
                                >
                                  <span className="truncate flex-1 text-[#ffffff] group-hover:text-[#fbbf24] font-serif">
                                    {e.title}
                                  </span>
                                  <span className="text-[10px] font-mono text-emerald-400 ml-1.5 shrink-0 font-bold">
                                    +挂载
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 撰写新随笔并挂载 */}
                    <button
                      type="button"
                      onClick={handleOpenCreateEssayForFocus}
                      className="text-[11px] font-mono text-emerald-300 hover:text-emerald-200 flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-700 hover:border-emerald-500 transition cursor-pointer font-bold"
                      title="直接新建一篇随笔并自动挂载至此国策"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>新建并挂载</span>
                    </button>
                  </div>
                </div>

                {/* 挂载随笔列表 */}
                {focusEssays.length === 0 ? (
                  <div className="text-xs text-[#64748b] py-2 text-center font-serif">
                    尚未挂载随笔。可将战役推进心得、战略推演或复盘备忘挂载于此。
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {focusEssays.map((essay) => (
                      <div
                        key={essay.id}
                        className="flex items-center justify-between p-2 rounded bg-[#101317] border border-[#262f3a] hover:border-[#4b596c] transition group"
                      >
                        <div
                          onClick={() => handleReadOrEditEssay(essay)}
                          className="flex-1 min-w-0 cursor-pointer pr-2"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-serif font-bold text-[#ffffff] group-hover:text-[#fbbf24] truncate transition">
                              {essay.title}
                            </span>
                            <span className="text-[9px] font-mono text-[#64748b] shrink-0">
                              {essay.created_at?.slice(0, 10)}
                            </span>
                          </div>
                          {essay.body_md && (
                            <p className="text-[11px] text-[#94a3b8] truncate font-serif mt-0.5">
                              {essay.body_md.slice(0, 80)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleReadOrEditEssay(essay)}
                            className="p-1 text-[#94a3b8] hover:text-[#fbbf24] rounded hover:bg-[#1f2631] transition"
                            title="阅读与编辑随笔"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDetachEssay(essay.id, essay.title)}
                            className="p-1 text-[#64748b] hover:text-rose-400 rounded hover:bg-[#281818] transition"
                            title="解除挂载（不删除随笔本体）"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部辅助操作区 */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      setParentFocusForCreation(selectedFocus);
                      setNewIcon('');
                      setShowCreateModal(true);
                      setSelectedFocus(null);
                    }}
                    className="hoi4-btn-military px-3 py-1.5 rounded-sm flex items-center space-x-1 text-white font-bold cursor-pointer"
                    title="在当前国策之后创建新的后续国策分支"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span>在此节点后新建国策</span>
                  </button>
                  <button
                    onClick={handleOpenAiNextNode}
                    className="hoi4-btn-steel px-3 py-1.5 rounded-sm flex items-center space-x-1 text-amber-300 cursor-pointer"
                    title="根据当前战局定制推演后续分支"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI 参谋推演后续候选</span>
                  </button>
                  <button
                    onClick={() => {
                      setSubFocusModalTarget(selectedFocus);
                      setIsSubFocusModalOpen(true);
                    }}
                    className="hoi4-btn-steel px-3 py-1.5 rounded-sm flex items-center space-x-1 text-[#cbd5e1] cursor-pointer"
                  >
                    <ListTodo className="w-3.5 h-3.5 text-[#94a3b8]" />
                    <span>管理战役拆解清单</span>
                  </button>
                </div>

                <button
                  onClick={handleDeleteFocus}
                  className="text-rose-400 hover:text-rose-300 text-xs font-mono flex items-center space-x-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>销毁此项国策</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. HOI4 原生立项公函弹窗 (Create Focus Modal) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="hoi4-window w-full max-w-md rounded shadow-2xl p-5 relative border-2 border-[#3d4652] text-[#ffffff]">
            <div className="absolute top-2 left-2 screw-rivet" />
            <div className="absolute top-2 right-2 screw-rivet" />

            <h3 className="text-base font-serif font-black text-[#ffffff] mb-4 flex items-center space-x-2 drop-shadow">
              {newIcon === 'encounter' ? (
                <>
                  <Zap className="w-4 h-4 text-orange-400 animate-pulse" />
                  <span>录入突发遭遇 (EMERGENCY ENCOUNTER)</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-[#d4af37]" />
                  <span>制定战略国策 (NEW DIRECTIVE)</span>
                </>
              )}
            </h3>

            {parentFocusForCreation && (
              <div className="mb-3 px-3 py-2 bg-[#17202a] border border-sky-600/50 rounded flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-sky-200">
                  <span className="text-slate-400 font-mono">前置依托国策:</span>
                  <span className="font-bold text-amber-300 font-serif">【{parentFocusForCreation.title}】</span>
                </div>
                <button
                  type="button"
                  onClick={() => setParentFocusForCreation(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  取消关联 (改为独立国策)
                </button>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono font-bold text-[#94a3b8] mb-1">
                  国策类型与定位
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewIcon('')}
                    className={`py-1.5 text-xs font-mono font-bold rounded-sm border transition flex items-center justify-center space-x-1.5 ${
                      newIcon !== 'encounter'
                        ? 'bg-amber-950/70 text-amber-300 border-[#d4af37] shadow'
                        : 'bg-[#1a1e23] border-[#373e47] text-[#94a3b8]'
                    }`}
                  >
                    <span>🎖️ 常规战略规划</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewIcon('encounter')}
                    className={`py-1.5 text-xs font-mono font-bold rounded-sm border transition flex items-center justify-center space-x-1.5 ${
                      newIcon === 'encounter'
                        ? 'bg-orange-950/80 text-orange-300 border-orange-500 shadow'
                        : 'bg-[#1a1e23] border-[#373e47] text-[#94a3b8]'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-orange-400" />
                    <span>⚡ 突发遭遇考验</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-[#94a3b8] mb-1">
                  国策番号与名称 *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newIcon === 'encounter'
                      ? '例如：突发考研改革、项目突击攻关、临时资金缺口...'
                      : '例如：优先经济建设、攻克核心系统架构师...'
                  }
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0d1013] border border-[#373e47] rounded px-3 py-1.5 text-xs text-[#ffffff] placeholder-[#64748b] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-[#94a3b8] mb-1">
                  战略意图与攻坚方向 (MARKDOWN)
                </label>
                <textarea
                  rows={3}
                  placeholder={
                    newIcon === 'encounter'
                      ? '详细记录此次突发遭遇的起因、紧迫性与应急化解措施...'
                      : '详细描述该国策的核心战略意图与推进步骤...'
                  }
                  value={newBodyMd}
                  onChange={(e) => setNewBodyMd(e.target.value)}
                  className="w-full bg-[#0d1013] border border-[#373e47] rounded px-3 py-1.5 text-xs text-[#ffffff] placeholder-[#64748b] focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-[#94a3b8] mb-1">
                  初始战役态势
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('active')}
                    className={`py-1.5 text-xs font-mono font-bold rounded-sm border transition ${
                      newStatus === 'active'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow'
                        : 'bg-[#1a1e23] border-[#373e47] text-[#94a3b8]'
                    }`}
                  >
                    ● 战役执行中 (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('paused')}
                    className={`py-1.5 text-xs font-mono font-bold rounded-sm border transition ${
                      newStatus === 'paused'
                        ? 'bg-[#291f0c] text-amber-300 border-amber-600 shadow'
                        : 'bg-[#1a1e23] border-[#373e47] text-[#94a3b8]'
                    }`}
                  >
                    ⏳ 战略休整 (Paused)
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setParentFocusForCreation(null);
                  }}
                  className="hoi4-btn-steel px-4 py-1.5 text-xs font-mono rounded-sm cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`px-5 py-1.5 text-xs font-serif font-bold rounded-sm text-white shadow-md transition ${
                    newIcon === 'encounter'
                      ? 'bg-gradient-to-r from-orange-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 border border-orange-500'
                      : 'hoi4-btn-military'
                  }`}
                >
                  {newIcon === 'encounter' ? '发布应急遭遇' : '签署立项'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Proposals Modal (§7.4: 独立预览区，用户可修改标题、正文及初始状态) */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-lg text-slate-100">
                  后续国策候选建议 (Proposal 预览)
                </h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded text-xs text-amber-300/80 mb-4 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                §7.4: 候选仅留存内存。接受前你可编辑标题正文，并自主挑选四状态之一。未接受的草案绝不进入数据库。
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {aiProposals.length === 0 ? (
                <div className="text-center text-slate-500 py-8 italic text-sm">所有候选已处理完成</div>
              ) : (
                aiProposals.map((prop, idx) => (
                  <div key={prop.id} className="p-4 bg-slate-800/60 border border-slate-700 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-serif text-xs font-semibold">
                        {prop.direction}
                      </span>
                      <div className="flex items-center space-x-2">
                        <label className="text-[11px] text-slate-400">路线关系:</label>
                        <select
                          value={prop.relationType}
                          onChange={(e) => {
                            const val = e.target.value as 'prerequisite' | 'mutually_exclusive';
                            setAiProposals((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, relationType: val } : p))
                            );
                          }}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                        >
                          <option value="prerequisite">前置路线 (Prerequisite)</option>
                          <option value="mutually_exclusive">互斥路线 (Mutually Exclusive)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={prop.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAiProposals((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, title: val } : p))
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-sm font-bold text-slate-100 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        value={prop.bodyMd}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAiProposals((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, bodyMd: val } : p))
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none"
                      />
                    </div>

                    {/* Choose initial status (§7.4) */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-slate-400">初始状态:</span>
                        {(['active', 'paused', 'completed'] as FocusStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => {
                              setAiProposals((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, status: st } : p))
                              );
                            }}
                            className={`px-2 py-0.5 rounded text-[11px] border transition ${
                              prop.status === st
                                ? 'bg-amber-600 text-black font-semibold border-amber-500'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {st === 'active' ? '进行中' : st === 'paused' ? '暂时搁置' : '已完成'}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setAiProposals((prev) => prev.filter((_, i) => i !== idx))}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                        >
                          丢弃
                        </button>
                        <button
                          onClick={() => handleAcceptProposal(prop)}
                          className="flex items-center space-x-1 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded text-xs"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>确认接受并落库</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Focus Checklist Modal */}
      <SubFocusModal
        isOpen={isSubFocusModalOpen}
        onClose={() => setIsSubFocusModalOpen(false)}
        lifeId={lifeId}
        focus={subFocusModalTarget}
        onUpdated={loadData}
      />

      {/* AI Command Input Modal (§12, §7.4: 允许统帅输入具体诉求与约束) */}
      <AICommandModal
        isOpen={aiCmdModalOpen}
        onClose={() => setAiCmdModalOpen(false)}
        title={
          aiCmdMode === 'next_node'
            ? `推演「${selectedFocus?.title || '当前国策'}」的后续国策`
            : aiCmdMode === 'initial_line'
            ? '推演全新战略攻坚主线'
            : `AI 润色国策「${selectedFocus?.title || ''}」战略说明`
        }
        subtitle={
          aiCmdMode === 'next_node'
            ? '请告诉参谋部你的战略意图、侧重点或现实约束（例如：偏重防守/侧重技术/速胜/平稳过渡）'
            : aiCmdMode === 'initial_line'
            ? '输入你当前的年度大目标或阶段痛点，参谋部将基于全局局势生成3个开拓主线'
            : '输入具体润色要求（例如：“增强气势”、“量化目标指标”、“列举3点里程碑”）'
        }
        placeholder={
          aiCmdMode === 'next_node'
            ? '例如：希望后续偏重技能巩固，规避高风险投入；或者是开辟新的交叉学科支线...'
            : aiCmdMode === 'initial_line'
            ? '例如：未来半年重点转行前端全栈开发，时间有限，需要兼顾日常工作...'
            : '例如：修改得更加严肃客观，并增加可落地的量化交付物...'
        }
        onGenerate={handleRunAiCommand}
        isGenerating={isGeneratingAi}
      />

      {/* AI Proposal Modal for Text Refine (§12.1: 先预览、可编辑、后接受) */}
      <AIProposalModal
        isOpen={refineModalOpen}
        onClose={() => setRefineModalOpen(false)}
        title="AI 润色战略说明预览"
        originalText={editBodyMd}
        proposedText={refinedTextProposal}
        onAccept={async (finalText) => {
          setEditBodyMd(finalText);
          setRefineModalOpen(false);
          if (selectedFocus) {
            await api.updateFocusContent(lifeId, selectedFocus.id, selectedFocus.title, finalText);
            setSelectedFocus((prev) => (prev ? { ...prev, body_md: finalText } : null));
            const updatedFoci = foci.map((f) => (f.id === selectedFocus.id ? { ...f, body_md: finalText } : f));
            setFoci(updatedFoci);
            syncNodesFromFoci(updatedFoci);
          }
        }}
      />

      {/* 国策挂载随笔：随笔撰写、阅读与编辑弹窗 */}
      <EssayModal
        isOpen={showEssayModal}
        onClose={() => {
          setShowEssayModal(false);
          setEditingEssay(null);
          setIsNewEssayForFocus(false);
        }}
        lifeId={lifeId}
        initialEssay={editingEssay}
        onSaved={handleEssaySaved}
        onDeleted={handleEssayDeleted}
        context={strategyContext}
      />
    </div>
  );
};
