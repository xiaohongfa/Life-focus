import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { Focus, FocusStatus } from '../../api/types';
import {
  Briefcase,
  Home,
  Heart,
  Shield,
  Compass,
  Star,
  Coins,
  Factory,
  Wrench,
  GraduationCap,
  Trophy,
  Zap,
} from 'lucide-react';
import { soundFx } from '../../utils/soundEffects';

export interface FocusNodeData {
  focus: Focus;
  onSelectNode: (focus: Focus) => void;
  onOpenSubFocus?: (focus: Focus) => void;
  subCount?: { total: number; done: number };
  essayCount?: number;
}

// 智能提取国策徽章中心象征图案 (匹配 HOI4 军政企社各领域)
function getFocusEmblem(title: string) {
  if (/学|读|课|校|研|教育|考|智|书/i.test(title)) return GraduationCap;
  if (/职|工|业|商|企|升|拼/i.test(title)) return Briefcase;
  if (/钱|资|财|薪|金|币|富/i.test(title)) return Coins;
  if (/产|造|建|工|厂|实/i.test(title)) return Factory;
  if (/家|亲|子|房|居|友|室/i.test(title)) return Home;
  if (/健|身|体|心|医|跑|炼|病|生/i.test(title)) return Heart;
  if (/政|法|权|领|导|官|令|防|卫/i.test(title)) return Shield;
  if (/创|新|拓|探|旅|行/i.test(title)) return Compass;
  if (/具|技|修|研|法/i.test(title)) return Wrench;
  if (/成|胜|荣|奖|勋/i.test(title)) return Trophy;
  return Star;
}

// HOI4 风格月桂花环与铭牌状态配置
const statusConfig: Record<
  FocusStatus,
  {
    wreathColor: string;
    wreathGlow: string;
    innerRing: string;
    statusText: string;
    statusColor: string;
    badgeBorder: string;
    stampBadge?: string;
  }
> = {
  active: {
    wreathColor: 'text-[#4ade80]',
    wreathGlow: 'animate-radar-pulse drop-shadow-[0_0_10px_rgba(74,222,128,0.7)]',
    innerRing: 'border-emerald-500/80 bg-[#122316]',
    statusText: '● 进行中',
    statusColor: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/60',
  },
  completed: {
    wreathColor: 'text-[#fbbf24]',
    wreathGlow: 'animate-golden-aura drop-shadow-[0_0_12px_rgba(245,158,11,0.85)]',
    innerRing: 'border-[#f59e0b] bg-[#291f0c]',
    statusText: '★ 已达成',
    statusColor: 'text-amber-300',
    badgeBorder: 'border-[#d4af37]',
    stampBadge: '达成',
  },
  paused: {
    wreathColor: 'text-[#d97706]',
    wreathGlow: 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
    innerRing: 'border-amber-700/60 bg-[#1f1810]',
    statusText: '⏳ 休整中',
    statusColor: 'text-amber-500',
    badgeBorder: 'border-amber-700/50',
  },
  revoked: {
    wreathColor: 'text-[#71717a]',
    wreathGlow: 'grayscale opacity-75',
    innerRing: 'border-zinc-700 bg-[#18181b]',
    statusText: '✕ 作废',
    statusColor: 'text-rose-400 line-through',
    badgeBorder: 'border-zinc-700',
    stampBadge: '作废',
  },
};

// 遭遇型国策专属警戒配色 (HOI4 Hazard / Encounter Style)
const encounterStatusConfig: Record<
  FocusStatus,
  {
    wreathColor: string;
    wreathGlow: string;
    innerRing: string;
    statusText: string;
    statusColor: string;
    badgeBorder: string;
    stampBadge?: string;
  }
> = {
  active: {
    wreathColor: 'text-[#f97316]',
    wreathGlow: 'animate-radar-pulse drop-shadow-[0_0_12px_rgba(249,115,22,0.95)]',
    innerRing: 'border-orange-500/90 bg-[#2b1408]',
    statusText: '⚡ 突发遭遇',
    statusColor: 'text-orange-400 font-black',
    badgeBorder: 'border-orange-500/80',
  },
  completed: {
    wreathColor: 'text-[#fbbf24]',
    wreathGlow: 'animate-golden-aura drop-shadow-[0_0_12px_rgba(245,158,11,0.85)]',
    innerRing: 'border-[#f59e0b] bg-[#291f0c]',
    statusText: '★ 遭遇化解',
    statusColor: 'text-amber-300 font-bold',
    badgeBorder: 'border-[#d4af37]',
    stampBadge: '化解',
  },
  paused: {
    wreathColor: 'text-[#d97706]',
    wreathGlow: 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
    innerRing: 'border-amber-700/60 bg-[#1f1810]',
    statusText: '⏳ 暂缓处置',
    statusColor: 'text-amber-500',
    badgeBorder: 'border-amber-700/50',
  },
  revoked: {
    wreathColor: 'text-[#71717a]',
    wreathGlow: 'grayscale opacity-75',
    innerRing: 'border-zinc-700 bg-[#18181b]',
    statusText: '✕ 遭遇中止',
    statusColor: 'text-rose-400 line-through',
    badgeBorder: 'border-zinc-700',
    stampBadge: '中止',
  },
};

export const FocusNode: React.FC<NodeProps> = memo(({ data }) => {
  const nodeData = data as unknown as FocusNodeData;
  const focus = nodeData?.focus;
  const onSelectNode = nodeData?.onSelectNode;

  if (!focus) {
    return null;
  }

  const isEncounter = focus.icon === 'encounter';
  const status = (focus.status || 'active') as FocusStatus;
  const cfg = isEncounter
    ? encounterStatusConfig[status] || encounterStatusConfig.active
    : statusConfig[status] || statusConfig.active;
  const EmblemIcon = isEncounter ? Zap : getFocusEmblem(focus.title);
  const subCount = nodeData?.subCount;

  const handleClick = () => {
    soundFx.playFocusSelect();
    if (onSelectNode) {
      onSelectNode(focus);
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => soundFx.playHover()}
      className="relative flex flex-col items-center select-none cursor-pointer group transition duration-200 hover:scale-105"
      style={{ width: 154 }}
    >
      {/* 1. HOI4 原生金色月桂冠大徽记 (Golden Laurel Wreath) */}
      <div className={`relative flex items-center justify-center z-20 ${cfg.wreathGlow}`}>
        {/* SVG 月桂花环外圈 (高精浮雕月桂叶) */}
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
        >
          <defs>
            <linearGradient id={`goldGrad-${focus.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff8db" />
              <stop offset="35%" stopColor="#f5c742" />
              <stop offset="70%" stopColor="#b8861b" />
              <stop offset="100%" stopColor="#634509" />
            </linearGradient>
            <linearGradient id={`emeraldGrad-${focus.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <linearGradient id={`ironGrad-${focus.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d1d5db" />
              <stop offset="60%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#374151" />
            </linearGradient>
            <linearGradient id={`orangeGrad-${focus.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="35%" stopColor="#f97316" />
              <stop offset="70%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>
          </defs>

          {/* 左侧月桂叶枝 */}
          <path
            d="M 50 90 C 25 86 10 65 14 42 C 16 30 26 18 38 12 C 34 20 33 30 38 38 C 30 34 22 44 26 54 C 22 58 24 70 34 76 C 38 78 44 84 50 90 Z"
            fill={
              status === 'revoked'
                ? `url(#ironGrad-${focus.id})`
                : isEncounter
                ? `url(#orangeGrad-${focus.id})`
                : status === 'active'
                ? `url(#emeraldGrad-${focus.id})`
                : `url(#goldGrad-${focus.id})`
            }
            stroke="#261b05"
            strokeWidth="1"
          />
          {/* 右侧月桂叶枝 */}
          <path
            d="M 50 90 C 75 86 90 65 86 42 C 84 30 74 18 62 12 C 66 20 67 30 62 38 C 70 34 78 44 74 54 C 78 58 76 70 66 76 C 62 78 56 84 50 90 Z"
            fill={
              status === 'revoked'
                ? `url(#ironGrad-${focus.id})`
                : isEncounter
                ? `url(#orangeGrad-${focus.id})`
                : status === 'active'
                ? `url(#emeraldGrad-${focus.id})`
                : `url(#goldGrad-${focus.id})`
            }
            stroke="#261b05"
            strokeWidth="1"
          />
          {/* 底部扎带蝴蝶结金环 */}
          <circle cx="50" cy="88" r="4.5" fill="#f59e0b" stroke="#3b2605" strokeWidth="1" />
        </svg>

        {/* 徽记中心深色内凹盘 */}
        <div
          className={`absolute w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-[inset_0_3px_6px_rgba(0,0,0,0.9),0_2px_4px_rgba(0,0,0,0.7)] ${cfg.innerRing}`}
        >
          <EmblemIcon
            className={`w-6 h-6 ${
              status === 'completed'
                ? 'text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                : isEncounter
                ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.95)] animate-pulse'
                : status === 'active'
                ? 'text-emerald-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                : 'text-slate-300'
            }`}
          />
        </div>

        {/* 达成 / 作废状态火漆小印章 */}
        {cfg.stampBadge && (
          <div className="absolute -top-1 -right-2 z-30 pointer-events-none">
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-sm font-mono font-black border shadow-md ${
                status === 'completed'
                  ? 'border-amber-400 text-amber-300 bg-black/85 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                  : 'border-rose-500 text-rose-400 bg-black/85'
              }`}
            >
              {cfg.stampBadge}
            </span>
          </div>
        )}
      </div>

      {/* 2. HOI4 原生枪钢铆钉铭牌 (Gunmetal Nameplate with Crisp White Text) */}
      <div className="relative -mt-2.5 z-20 w-full flex flex-col items-center">
        <div
          className={`w-full px-2 py-1.5 rounded-sm bg-gradient-to-b from-[#252c34] via-[#1a1f25] to-[#121518] border-1.5 border-[#465261] border-t-[#67778c] border-l-[#546274] shadow-[0_6px_16px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.25)] flex flex-col items-center text-center ${cfg.badgeBorder}`}
        >
          {/* 铭牌四角金属微型柳钉 */}
          <div className="absolute left-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-[#8392a5] border border-[#16191f] shadow-inner" />
          <div className="absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-[#8392a5] border border-[#16191f] shadow-inner" />
          <div className="absolute left-1.5 bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#8392a5] border border-[#16191f] shadow-inner" />
          <div className="absolute right-1.5 bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#8392a5] border border-[#16191f] shadow-inner" />

          {/* 国策主标题：高对比度纯白字体，清晰锐利 */}
          <span
            className="font-sans font-bold text-[11px] leading-tight text-[#ffffff] group-hover:text-amber-200 transition drop-shadow-[0_1px_2px_rgba(0,0,0,1)] truncate max-w-[124px]"
            title={focus.title}
          >
            {focus.title}
          </span>

          {/* 战役态势标签与步骤徽章 */}
          <div className="flex items-center space-x-1.5 mt-1">
            <span
              className={`text-[8.5px] font-mono tracking-wider font-extrabold uppercase ${cfg.statusColor}`}
            >
              {cfg.statusText}
            </span>
            {subCount && subCount.total > 0 && (
              <span className="text-[8px] font-mono px-1 py-0.2 rounded-sm bg-[#0a0d10] border border-[#3b4452] text-amber-300 font-bold shadow-inner">
                {subCount.done}/{subCount.total}
              </span>
            )}
            {nodeData?.essayCount && nodeData.essayCount > 0 ? (
              <span
                className="text-[8px] font-mono px-1 py-0.2 rounded-sm bg-[#0a0d10] border border-[#3b4452] text-amber-200 font-bold shadow-inner flex items-center space-x-0.5"
                title={`已挂载 ${nodeData.essayCount} 篇战地随笔`}
              >
                <span>📜</span>
                <span>{nodeData.essayCount}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 3. 真实战术连线手柄：金色圆珠点 */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-4 !h-4 !-top-1 !bg-gradient-to-b !from-[#fef08a] !to-[#ca8a04] !border-1.5 !border-[#1c1917] !rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)] transition-all hover:scale-130 hover:!bg-white cursor-crosshair z-30"
        title="接收前置战略依赖"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-4 !h-4 !-bottom-1 !bg-gradient-to-b !from-[#fef08a] !to-[#ca8a04] !border-1.5 !border-[#1c1917] !rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)] transition-all hover:scale-130 hover:!bg-white cursor-crosshair z-30"
        title="引出后续开拓路线"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-3.5 !h-3.5 !left-0.5 !top-1/2 !-translate-y-1/2 !bg-gradient-to-b !from-[#fde047] !to-[#a16207] !border-1.5 !border-[#1c1917] !rounded-full shadow-[0_0_6px_rgba(234,179,8,0.7)] transition-all hover:scale-130 hover:!bg-white cursor-crosshair z-30"
        title="接收横向关联"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-3.5 !h-3.5 !right-0.5 !top-1/2 !-translate-y-1/2 !bg-gradient-to-b !from-[#fde047] !to-[#a16207] !border-1.5 !border-[#1c1917] !rounded-full shadow-[0_0_6px_rgba(234,179,8,0.7)] transition-all hover:scale-130 hover:!bg-white cursor-crosshair z-30"
        title="引出横向/互斥路线"
      />
    </div>
  );
});


