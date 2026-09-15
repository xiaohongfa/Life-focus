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

import type { Focus, FocusRelation, FocusStatus, FocusStatusHistory } from '../../api/types';
import { api } from '../../api/client';
import { FocusNode, FocusNodeData } from './FocusNode';
import { SubFocusModal } from './SubFocusModal';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { soundFx } from '../../utils/soundEffects';
import {
  Plus,
  Sparkles,
  X,
  Trash2,
  History,
  GitBranch,
  ShieldAlert,
  RotateCcw,
  Save,
  Check,
  ArrowRight,
  ShieldMinus,
  ListTodo,
  Maximize2,
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
    try {
      const history = await api.getFocusHistory(lifeId, focus.id);
      setFocusHistory(history);
    } catch (err) {
      console.error('Failed to load node history', err);
    }
  }, [lifeId]);

  // 将领域 Focus 集合同步转换为 React Flow 节点，保留已测量尺寸与初始宽高，杜绝 visibility: hidden
  // 不直接依赖 subCounts state，避免循环渲染
  const syncNodesFromFoci = useCallback(
    (fociList: Focus[], counts?: Record<string, { total: number; done: number }>) => {
      const activeCounts = counts || subCountsRef.current;
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
            },
          };
        });
      });
    },
    [handleSelectNode, handleOpenSubFocus, setNodes]
  );

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
              stroke: isMutual ? '#991b1b' : '#5c482e',
              strokeWidth: isMutual ? 2.5 : 2,
              strokeDasharray: '6,6',
            },
            label: isMutual ? '互斥路线' : undefined,
            labelStyle: { fill: '#ef4444', fontSize: 10, fontWeight: 'bold' },
            labelBgStyle: { fill: '#1a1309', fillOpacity: 0.85 },
            markerEnd: isMutual
              ? undefined
              : {
                  type: MarkerType.ArrowClosed,
                  color: '#735b31',
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
      const [fociData, relData, allSubFoci, overview] = await Promise.all([
        api.getFoci(lifeId),
        api.getFocusRelations(lifeId),
        api.listAllSubFoci(lifeId),
        api.getWorldOverview(lifeId).catch(() => null),
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
      setSubCounts(countsMap);
      setFoci(fociData);
      setRelations(relData);
      syncNodesFromFoci(fociData, countsMap);
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
      await api.updateFocusContent(lifeId, selectedFocus.id, editTitle.trim(), editBodyMd.trim());
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
        soundFx.playStamp();
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

  // 关系一键解绑
  const handleDeleteRelation = async (relId: string) => {
    const rel = relations.find((r) => r.id === relId);
    if (!rel) return;
    try {
      await api.deleteFocusRelation(lifeId, relId);
      const nextRels = relations.filter((r) => r.id !== relId);
      setRelations(nextRels);
      syncEdgesFromRelations(nextRels);
      setUndoStack((prev) => [...prev, { type: 'DELETE_RELATION', relation: rel }]);
      toast.info('路线联系已解绑');
    } catch (err: unknown) {
      console.error('Failed to delete relation', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`解绑路线联系失败: ${msg}`);
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
      if (selectedFocus) {
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
        posY
      );
      const updatedFoci = [...foci, created];
      setFoci(updatedFoci);
      syncNodesFromFoci(updatedFoci);
      setUndoStack((prev) => [...prev, { type: 'CREATE_NODE', focusId: created.id }]);
      setNewTitle('');
      setNewBodyMd('');
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

  const currentOutgoing = useMemo(() => {
    if (!selectedFocus) return [];
    return relations.filter((r) => r.source_focus_id === selectedFocus.id && r.relation_type === 'prerequisite');
  }, [relations, selectedFocus]);

  const currentMutuallyExclusive = useMemo(() => {
    if (!selectedFocus) return [];
    return relations.filter(
      (r) =>
        r.relation_type === 'mutually_exclusive' &&
        (r.source_focus_id === selectedFocus.id || r.target_focus_id === selectedFocus.id)
    );
  }, [relations, selectedFocus]);

  return (
    <div className="relative w-full h-[calc(100vh-80px)] parchment-map overflow-hidden flex select-none border-t-2 border-[#3d2f14]">
      {/* 战役发展路线图顶部羊皮纸铭文水印 (Life Development Roadmap Header) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none opacity-85">
        <div className="flex items-center space-x-3">
          <div className="h-px w-20 bg-[#8a724d]" />
          <div className="w-2.5 h-2.5 rotate-45 border border-[#8a724d] bg-[#d5c6aa]" />
          <h2 className="font-serif font-black text-xl tracking-widest text-[#3d2f19] drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
            人生发展路线图
          </h2>
          <div className="w-2.5 h-2.5 rotate-45 border border-[#8a724d] bg-[#d5c6aa]" />
          <div className="h-px w-20 bg-[#8a724d]" />
        </div>
        <span className="text-[10px] font-mono tracking-widest uppercase text-[#735e3b] font-black mt-0.5">
          LIFE DEVELOPMENT ROADMAP
        </span>
      </div>

      {/* 战略沙盘角落真实绝密火漆印章 */}
      <div className="distressed-stamp-red absolute top-5 right-8 text-xs px-2.5 py-1 pointer-events-none opacity-75 z-10">
        绝密 256
      </div>
      <div className="distressed-stamp-red absolute bottom-6 left-8 text-[11px] px-2.5 py-1 pointer-events-none opacity-60 z-10">
        TOP SECRET 绝密 256
      </div>

      {/* React Flow 2D Canvas */}
      <div className="flex-1 h-full">
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
          <Background color="#6b5333" gap={36} size={1.2} style={{ opacity: 0.16 }} />
          <Controls className="!bg-[#151c17] !border-2 !border-[#967b36] !text-[#e7e0cc] !rounded-sm shadow-xl" position="bottom-left" />
          <MiniMap
            nodeColor="#8a6c37"
            maskColor="rgba(43, 34, 21, 0.75)"
            className="!bg-[#e8decb] !border-2 !border-[#8a6c37] !rounded-sm opacity-90 hover:opacity-100 transition shadow-2xl"
            position="bottom-left"
            style={{ marginLeft: 50, width: 140, height: 90 }}
          />
        </ReactFlow>
      </div>

      {/* Floating Canvas Top Action Bar (战区战略控制台) */}
      <div className="absolute top-4 left-4 z-20 flex items-center space-x-3 tactical-panel border-2 border-[#967b36] px-4 py-2 rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.85)]">
        <div className="absolute top-1 left-1.5 screw-rivet" />
        <div className="absolute top-1 right-1.5 screw-rivet" />

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-gradient-to-r from-[#d4af37] to-[#f7e192] hover:from-[#c59e2a] hover:to-[#ebcf77] text-black font-serif font-bold text-xs transition shadow-md"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>制定新国策</span>
        </button>

        <button
          onClick={handleOpenAiInitialLine}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#221a10] hover:bg-[#2d2214] border border-[#a38237] text-strategy-gold font-mono font-bold text-xs transition shadow"
          title="输入定制需求让 AI 启发全新战略攻坚主线"
        >
          <Sparkles className="w-3.5 h-3.5 text-strategy-gold" />
          <span>AI 启发战略主线</span>
        </button>

        {/* Connection Mode Selector (§7.3) */}
        <div className="flex items-center space-x-1 bg-[#121814] p-1 rounded-sm border border-[#2d3a30]">
          <span className="text-[11px] font-mono text-[#8b9b8f] px-1.5">战线类型:</span>
          <button
            onClick={() => setConnectionMode('prerequisite')}
            className={`px-2.5 py-1 text-xs font-serif rounded-sm font-bold transition ${
              connectionMode === 'prerequisite'
                ? 'bg-[#cfa847] text-black shadow-sm'
                : 'text-[#8b9b8f] hover:text-[#e7e0cc]'
            }`}
          >
            前置承接路线
          </button>
          <button
            onClick={() => setConnectionMode('mutually_exclusive')}
            className={`px-2.5 py-1 text-xs font-serif rounded-sm font-bold transition ${
              connectionMode === 'mutually_exclusive'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'text-[#8b9b8f] hover:text-[#e7e0cc]'
            }`}
          >
            互斥抉择战线
          </button>
        </div>

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="flex items-center space-x-1 px-3 py-1.5 bg-[#1a231d] hover:bg-[#253229] disabled:opacity-40 disabled:hover:bg-[#1a231d] text-[#e7e0cc] border border-[#38483c] rounded-sm text-xs font-mono transition"
          title="撤销最近移动或操作 (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>撤销 {undoStack.length > 0 ? `(${undoStack.length})` : ''}</span>
        </button>

        {/* Manual Fit View Button */}
        <button
          onClick={() => reactFlowInstanceRef.current?.fitView({ padding: 0.3, maxZoom: 1.2, duration: 300 })}
          className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#1a231d] hover:bg-[#253229] text-[#e7e0cc] border border-[#38483c] rounded-sm text-xs font-serif font-semibold transition shadow-sm"
          title="将所有国策自适应居中到视口中央"
        >
          <Maximize2 className="w-3.5 h-3.5 text-strategy-gold" />
          <span>沙盘复位</span>
        </button>
      </div>

      {/* Right Detail / Drawer Panel (绝密作战指令 Manila 档案纸板) */}
      {selectedFocus && (
        <div className="w-96 h-full manila-paper border-l-4 border-[#8c6f31] p-5 flex flex-col z-20 shadow-[0_0_35px_rgba(0,0,0,0.9)] overflow-y-auto space-y-4 relative text-[#2b2214]">
          <div className="flex items-center justify-between border-b-2 border-[#b39f76] pb-3">
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-[#8a6b29]" />
              <h4 className="font-serif font-black text-sm text-[#2d2212]">
                国策战役档案与调令
              </h4>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-200 border border-rose-800 font-bold">
                DOSSIER
              </span>
            </div>
            <button
              onClick={() => setSelectedFocus(null)}
              className="text-[#6d5b3d] hover:text-black transition p-1"
            >
            </button>
          </div>

          {/* Tactical Status Stamp Ribbon (具有解压实体印章动效与明确作战状态) */}
          {selectedFocus.status === 'completed' && (
            <div className="py-2.5 px-3 bg-[#1c180d] border border-[#d4af37]/40 rounded-sm flex items-center justify-center">
              <div
                key={`stamp-${selectedFocus.id}-${selectedFocus.status}`}
                className="stamp-gold-order animate-stamp-slam text-xs font-black border-2 border-[#d4af37] px-3 py-1 shadow-[0_0_15px_rgba(212,175,55,0.4)]"
              >
                ★ 战略决议达成 · STRATEGY APPROVED ★
              </div>
            </div>
          )}
          {selectedFocus.status === 'revoked' && (
            <div className="py-2.5 px-3 bg-[#241212] border border-rose-800/40 rounded-sm flex items-center justify-center">
              <div
                key={`stamp-${selectedFocus.id}-${selectedFocus.status}`}
                className="stamp-top-secret animate-stamp-slam text-xs font-black border-2 border-rose-600 px-3 py-1 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
              >
                ✕ 战略调令中止 · VOID DIRECTIVE ✕
              </div>
            </div>
          )}
          {selectedFocus.status === 'active' && (
            <div className="py-2 px-3 bg-[#111c15] border border-emerald-500/40 rounded-sm flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">战略战役主攻中 · ACTIVE CAMPAIGN</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-500/80">IN PROGRESS</span>
            </div>
          )}
          {selectedFocus.status === 'paused' && (
            <div className="py-2 px-3 bg-[#1e170e] border border-amber-600/40 rounded-sm flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400">⏳ 战线战略休整 · STRATEGIC PAUSE</span>
              <span className="text-[10px] font-mono text-amber-500/80">STANDBY</span>
            </div>
          )}

          {/* Editable Title & Body Markdown */}
          <div className="space-y-3 dossier-card p-3.5 rounded-sm border border-[#334237]">
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#8b9b8f] mb-1">国策番号与主标题</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-[#0d120f] border border-[#3d4f42] rounded px-2.5 py-1 text-sm font-serif font-bold text-amber-300 focus:outline-none focus:border-strategy-gold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-[#8b9b8f] mb-1">战略内涵与行动纲领 (MARKDOWN)</label>
              <MarkdownEditor
                value={editBodyMd}
                onChange={(val) => setEditBodyMd(val)}
                placeholder="在此阐述该国策的战略内涵与具体攻坚方向..."
                defaultMode="preview"
                minHeight="120px"
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] font-mono">
                {saveStatus === 'saving' && <span className="text-amber-400 animate-pulse">正在存盘...</span>}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-400 flex items-center space-x-0.5">
                    <Check className="w-3 h-3" />
                    <span>档案已保存</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleOpenAiRefineBody}
                  className="flex items-center space-x-1 px-2.5 py-1 bg-[#221a10] hover:bg-[#2e2316] border border-[#a38237]/70 text-strategy-gold rounded text-xs font-mono transition"
                  title="唤起 AI 指令对话框，输入要求后润色战略说明"
                >
                  <Sparkles className="w-3 h-3 text-strategy-gold" />
                  <span>AI 参谋润色</span>
                </button>
                <button
                  onClick={handleSaveNodeContent}
                  className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded text-xs shadow-sm"
                >
                  <Save className="w-3 h-3" />
                  <span>保存档案</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Change Buttons (§7.2: 四状态任意转换，记录历史) */}
          <div className="space-y-2 pt-2 border-t border-[#2d3a30]">
            <span className="text-xs font-mono uppercase font-bold text-[#8b9b8f]">指令状态调令:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStatusChange('active')}
                className={`py-1.5 px-2 rounded-sm text-xs font-mono font-bold border transition ${
                  selectedFocus.status === 'active'
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-[0_0_8px_rgba(74,222,128,0.3)]'
                    : 'bg-[#18211a] text-[#8b9b8f] border-[#2e3c31] hover:text-[#e7e0cc] hover:bg-[#202b23]'
                }`}
              >
                ● 战役进行中
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                className={`py-1.5 px-2 rounded-sm text-xs font-mono font-bold border transition ${
                  selectedFocus.status === 'completed'
                    ? 'bg-[#292211] text-[#f7e192] border-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.4)]'
                    : 'bg-[#18211a] text-[#8b9b8f] border-[#2e3c31] hover:text-[#e7e0cc] hover:bg-[#202b23]'
                }`}
              >
                ★ 达成战略
              </button>
              <button
                onClick={() => handleStatusChange('paused')}
                className={`py-1.5 px-2 rounded-sm text-xs font-mono font-bold border transition ${
                  selectedFocus.status === 'paused'
                    ? 'bg-[#231d13] text-amber-300 border-amber-600/80'
                    : 'bg-[#18211a] text-[#8b9b8f] border-[#2e3c31] hover:text-[#e7e0cc] hover:bg-[#202b23]'
                }`}
              >
                ⏳ 战略休整
              </button>
              <button
                onClick={() => handleStatusChange('revoked')}
                className={`py-1.5 px-2 rounded-sm text-xs font-mono font-bold border transition ${
                  selectedFocus.status === 'revoked'
                    ? 'bg-[#291212] text-rose-300 border-rose-600/80 line-through'
                    : 'bg-[#18211a] text-[#8b9b8f] border-[#2e3c31] hover:text-[#e7e0cc] hover:bg-[#202b23]'
                }`}
              >
                ✕ 作战中止
              </button>
            </div>
            <input
              type="text"
              placeholder="可选：调令事由（如：阶段达标、战术转向...）"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              className="w-full bg-[#0d120f] border border-[#38483c] rounded px-2.5 py-1 text-xs text-[#e7e0cc] placeholder-[#5c6e62] focus:outline-none focus:border-strategy-gold mt-1 font-serif"
            />
          </div>

          {/* Sub-Focus Section */}
          <div className="space-y-2 pt-2 border-t border-[#2d3a30]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-[#8b9b8f]">战役执行拆解清单:</span>
              <span className="text-[11px] font-mono text-strategy-gold font-bold">
                {subCounts[selectedFocus.id]?.done || 0} / {subCounts[selectedFocus.id]?.total || 0} 步骤达成
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSubFocusModalTarget(selectedFocus);
                setIsSubFocusModalOpen(true);
              }}
              className="w-full py-2 px-3 bg-[#18221b] hover:bg-[#223026] text-strategy-gold border border-strategy-gold/40 rounded-sm text-xs font-mono font-bold transition flex items-center justify-center space-x-2 shadow-inner"
            >
              <ListTodo className="w-4 h-4 text-strategy-gold" />
              <span>展开管理战役子任务清单</span>
            </button>
          </div>

          {/* Relations Inspector (§7.3: 互斥与前置线路展示与解绑) */}
          <div className="space-y-2 pt-2 border-t border-[#2d3a30] text-xs">
            <span className="font-mono uppercase font-bold text-[#8b9b8f]">战略路线战区图网:</span>

            {/* Incoming Prerequisites */}
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-[#7d8e82]">前置战略依赖:</span>
              {currentIncoming.length === 0 ? (
                <div className="text-[11px] text-[#637367] italic font-serif">无前置依赖（根基首发起点）</div>
              ) : (
                currentIncoming.map((r) => {
                  const src = foci.find((f) => f.id === r.source_focus_id);
                  return (
                    <div key={r.id} className="p-1.5 bg-[#17201a] border border-[#2b392e] rounded-sm flex items-center justify-between text-[11px]">
                      <span className="text-amber-300 font-serif truncate">{src?.title || '未知国策'}</span>
                      <button
                        onClick={() => handleDeleteRelation(r.id)}
                        className="text-rose-400 hover:underline shrink-0 ml-2 font-mono text-[10px]"
                      >
                        解绑
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Outgoing Prerequisites */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-mono text-[#7d8e82]">后续开拓路线:</span>
              {currentOutgoing.length === 0 ? (
                <div className="text-[11px] text-[#637367] italic font-serif">暂无后续衍生国策</div>
              ) : (
                currentOutgoing.map((r) => {
                  const tgt = foci.find((f) => f.id === r.target_focus_id);
                  return (
                    <div key={r.id} className="p-1.5 bg-[#17201a] border border-[#2b392e] rounded-sm flex items-center justify-between text-[11px]">
                      <span className="text-sky-300 font-serif truncate">{tgt?.title || '未知国策'}</span>
                      <button
                        onClick={() => handleDeleteRelation(r.id)}
                        className="text-rose-400 hover:underline shrink-0 ml-2 font-mono text-[10px]"
                      >
                        解绑
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mutually Exclusive */}
            <div className="space-y-1 pt-1">
              <span className="text-[11px] text-rose-400 flex items-center space-x-1 font-mono">
                <ShieldMinus className="w-3 h-3" />
                <span>互斥冲突战线:</span>
              </span>
              {currentMutuallyExclusive.length === 0 ? (
                <div className="text-[11px] text-[#637367] italic font-serif">无互斥路线</div>
              ) : (
                currentMutuallyExclusive.map((r) => {
                  const otherId = r.source_focus_id === selectedFocus.id ? r.target_focus_id : r.source_focus_id;
                  const other = foci.find((f) => f.id === otherId);
                  return (
                    <div key={r.id} className="p-1.5 bg-rose-950/40 border border-rose-900/60 rounded-sm flex items-center justify-between text-[11px]">
                      <span className="text-rose-300 font-serif truncate">{other?.title || '未知国策'}</span>
                      <button
                        onClick={() => handleDeleteRelation(r.id)}
                        className="text-rose-400 hover:underline shrink-0 ml-2 font-mono text-[10px]"
                      >
                        解绑
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Next Node Suggestion Trigger (§7.4) */}
          <div className="pt-2 border-t border-[#2d3a30]">
            <button
              onClick={handleOpenAiNextNode}
              className="w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs flex items-center justify-center space-x-1.5 transition shadow-md"
              title="打开 AI 对话指令框，输入定制策略方向并推演后续国策候选"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>AI 参谋定制推演下阶段</span>
            </button>
          </div>

          {/* Status History */}
          <div className="space-y-2 pt-2 border-t border-[#2d3a30] flex-1">
            <span className="text-xs font-mono uppercase font-bold text-[#8b9b8f] flex items-center space-x-1">
              <History className="w-3.5 h-3.5 text-strategy-gold" />
              <span>调令流转历史记录</span>
            </span>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {focusHistory.map((h) => (
                <div key={h.id} className="p-2 bg-[#161f19] border border-[#2b392e] rounded-sm text-[11px] space-y-0.5 font-mono">
                  <div className="flex items-center justify-between font-bold text-amber-300">
                    <span>{h.from_status ? `${h.from_status} → ${h.to_status}` : `初始: ${h.to_status}`}</span>
                    <span className="text-[10px] text-[#7d8e82]">{h.occurred_at.slice(0, 10)}</span>
                  </div>
                  {h.reason && <p className="text-[#a2b2a6] font-serif text-[11px]">{h.reason}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Delete Action */}
          <div className="pt-3 border-t border-[#2d3a30]">
            <button
              onClick={handleDeleteFocus}
              className="w-full py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 rounded-sm text-xs font-serif font-bold flex items-center justify-center space-x-1 transition shadow"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>销毁此项国策档案</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Focus Modal (制定全新国策战役公函) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dossier-card border-2 border-[#967b36] rounded-sm shadow-[0_12px_36px_rgba(0,0,0,0.9)] p-6 w-full max-w-md relative">
            <div className="absolute top-2 left-2 screw-rivet" />
            <div className="absolute top-2 right-2 screw-rivet" />

            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-strategy-gold" />
              <span>制定战略国策 (NEW DIRECTIVE)</span>
            </h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-[#8b9b8f] mb-1">国策番号与名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：攻克核心系统架构师、主导业务项目落地..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0d120f] border border-[#38483c] rounded px-3 py-1.5 text-sm font-serif text-[#e7e0cc] placeholder-[#5c6e62] focus:outline-none focus:border-strategy-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#8b9b8f] mb-1">战略意图与攻坚方向 (MARKDOWN)</label>
                <textarea
                  rows={3}
                  placeholder="详细描述该国策的核心战略意图与阶段目标..."
                  value={newBodyMd}
                  onChange={(e) => setNewBodyMd(e.target.value)}
                  className="w-full bg-[#0d120f] border border-[#38483c] rounded px-3 py-1.5 text-sm font-serif text-[#e7e0cc] placeholder-[#5c6e62] focus:outline-none focus:border-strategy-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#8b9b8f] mb-1">初始战役态势</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('active')}
                    className={`py-1.5 text-xs font-mono font-bold rounded-sm border ${
                      newStatus === 'active' ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm' : 'bg-[#18211a] border-[#2e3c31] text-[#8b9b8f]'
                    }`}
                  >
                    ● 战役执行中 (Active)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('paused')}
                    className={`py-1.5 text-xs font-mono font-bold rounded-sm border ${
                      newStatus === 'paused' ? 'bg-[#231d13] text-amber-300 border-amber-600/80 shadow-sm' : 'bg-[#18211a] border-[#2e3c31] text-[#8b9b8f]'
                    }`}
                  >
                    ⏳ 战略休整 (Paused)
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-1.5 text-xs font-mono rounded-sm bg-[#1e2720] hover:bg-[#28352b] text-slate-300 border border-slate-600"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-serif font-bold rounded-sm bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black shadow-md"
                >
                  签署立项
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
    </div>
  );
};
