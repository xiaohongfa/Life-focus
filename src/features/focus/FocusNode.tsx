import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { Focus, FocusStatus } from '../../api/types';
import {
  BookOpen,
  Briefcase,
  Home,
  Heart,
  Shield,
  Compass,
  Star,
} from 'lucide-react';

export interface FocusNodeData {
  focus: Focus;
  onSelectNode: (focus: Focus) => void;
  onOpenSubFocus?: (focus: Focus) => void;
  subCount?: { total: number; done: number };
}

// 智能提取国策徽章中心象征图案
function getFocusEmblem(title: string) {
  if (/学|读|课|校|研|教育|考|智|书/i.test(title)) return BookOpen;
  if (/职|工|业|商|企|升|资|钱|薪|拼/i.test(title)) return Briefcase;
  if (/家|亲|子|房|居|友|室/i.test(title)) return Home;
  if (/健|身|体|心|医|跑|炼|病|生/i.test(title)) return Heart;
  if (/政|法|权|领|导|官|令/i.test(title)) return Shield;
  if (/创|新|拓|探|旅|行/i.test(title)) return Compass;
  return Star;
}

// 状态对应的勋章与铭牌配置
const statusMedalConfig: Record<
  FocusStatus,
  {
    medallionClass: string;
    ribbonClass: string;
    subText: string;
    subColor: string;
    stampText?: string;
  }
> = {
  active: {
    medallionClass: 'medallion-badge-emerald animate-radar-pulse',
    ribbonClass: 'grosgrain-ribbon-emerald',
    subText: 'IN PROGRESS',
    subColor: 'text-emerald-400',
  },
  completed: {
    medallionClass: 'medallion-badge-gold',
    ribbonClass: 'grosgrain-ribbon-red',
    subText: 'ACHIEVED',
    subColor: 'text-amber-300',
    stampText: '战略达成',
  },
  paused: {
    medallionClass: 'medallion-badge-bronze',
    ribbonClass: 'grosgrain-ribbon-red opacity-60',
    subText: 'STANDBY',
    subColor: 'text-amber-500',
  },
  revoked: {
    medallionClass: 'medallion-badge-bronze grayscale opacity-60',
    ribbonClass: 'bg-zinc-800 opacity-40',
    subText: 'VOID',
    subColor: 'text-rose-400',
    stampText: '作废撤销',
  },
};

export const FocusNode: React.FC<NodeProps> = memo(({ data }) => {
  const nodeData = data as unknown as FocusNodeData;
  const focus = nodeData?.focus;
  const onSelectNode = nodeData?.onSelectNode;

  if (!focus) {
    return null;
  }

  const status = (focus.status || 'active') as FocusStatus;
  const config = statusMedalConfig[status] || statusMedalConfig.active;
  const EmblemIcon = getFocusEmblem(focus.title);
  const subCount = nodeData?.subCount;

  return (
    <div
      onClick={() => onSelectNode && onSelectNode(focus)}
      className="relative flex flex-col items-center select-none cursor-pointer group transition duration-200 hover:scale-105"
      style={{ width: 148 }}
    >
      {/* 1. 顶部折叠式织锦勋带 (Folded Hanging Grosgrain Ribbon) */}
      <div className="flex flex-col items-center -mb-2 z-10">
        {/* 铜质挂带条扣 (Brass Ribbon Bar Clip) */}
        <div className="w-10 h-1.5 rounded-sm bg-gradient-to-r from-[#947432] via-[#e5c777] to-[#785b20] border border-[#3b2b09] shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
        
        {/* 丝织勋带本体 */}
        <div
          className={`w-7 h-5 ${config.ribbonClass} relative overflow-hidden`}
          style={{
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 80%, 50% 100%, 0% 80%)',
          }}
        >
          {/* 勋带微弱金丝织纹质感 */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.8)_0%,transparent_70%)]" />
        </div>
      </div>

      {/* 2. 核心 3D 浮雕金属勋章 (3D Embossed Medal Badge) */}
      <div className="relative flex items-center justify-center z-20">
        {/* 勋章外圈月桂花环 / 齿轮轮廓 */}
        <div
          className={`w-18 h-18 rounded-full flex items-center justify-center ${config.medallionClass} relative`}
          style={{
            clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          }}
        >
          {/* 勋章内圈月桂叶压花底纹 SVG */}
          <svg viewBox="0 0 100 100" className="absolute inset-1 w-full h-full pointer-events-none opacity-40">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#2b1f09" strokeWidth="2.5" strokeDasharray="3 4" />
            <circle cx="50" cy="50" r="36" fill="none" stroke="#fff" strokeWidth="1" opacity="0.6" />
          </svg>

          {/* 勋章中心高浮雕核心徽记 (Embossed Center Emblem) */}
          <div className="p-2.5 rounded-full bg-gradient-to-br from-[#2a2012] via-[#1a140b] to-[#0d0a06] border border-[#d4af37]/70 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9),0_2px_4px_rgba(255,255,255,0.15)] flex items-center justify-center z-10">
            <EmblemIcon className="w-5 h-5 text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
          </div>

          {/* 勋章表面玻璃反光弧光 */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
        </div>

        {/* 达成 / 作废状态倾斜红色火漆印章 (Distressed Red Rubber Stamp) */}
        {config.stampText && (
          <div className="absolute -top-1 -right-3 z-30 pointer-events-none">
            <span
              className={`distressed-stamp-red text-[9px] px-1 py-0.2 rounded-sm shadow-md font-mono font-black ${
                status === 'completed'
                  ? 'border-[#991b1b] text-[#991b1b] bg-amber-50/80 shadow-[0_0_8px_rgba(185,28,28,0.4)]'
                  : 'border-zinc-700 text-zinc-400 bg-black/80'
              }`}
            >
              {config.stampText}
            </span>
          </div>
        )}
      </div>

      {/* 3. 底部复古深铜椭圆铭牌 (Engraved Brass Plaque / Nameplate) */}
      <div className="relative -mt-2 z-20 w-full flex flex-col items-center">
        <div className="w-full px-2 py-1.5 rounded-md bg-gradient-to-b from-[#2a2216] via-[#1a150d] to-[#100d08] border-1.5 border-[#8c6f31] shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,235,165,0.4)] flex flex-col items-center text-center">
          {/* 铭牌两侧微型螺栓 */}
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#caa858] border border-[#3b2b09] shadow-inner" />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#caa858] border border-[#3b2b09] shadow-inner" />

          {/* 国策主标题 */}
          <span
            className="font-serif font-black text-xs text-[#f4edd9] group-hover:text-amber-200 transition drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate max-w-[115px]"
            title={focus.title}
          >
            {focus.title}
          </span>

          {/* 战备英文字根与子任务微型达成状态 */}
          <div className="flex items-center space-x-1 mt-0.5">
            <span className={`text-[8px] font-mono tracking-wider font-extrabold uppercase ${config.subColor}`}>
              {config.subText}
            </span>
            {subCount && subCount.total > 0 && (
              <span className="text-[8px] font-mono px-1 py-0.1 rounded bg-[#0d120f] border border-strategy-gold/40 text-amber-200">
                {subCount.done}/{subCount.total}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. 真实战术连线手柄：黄铜圆珠连接点 (Ball-Joint Connection Pins) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-4 !h-4 !-top-1 !bg-gradient-to-b !from-[#ffd778] !to-[#966b1a] !border-1.5 !border-[#261c06] !rounded-full shadow-[0_0_8px_rgba(234,179,8,0.7)] transition-all hover:scale-130 hover:!bg-yellow-100 cursor-crosshair z-30"
        title="接收前置战略依赖（点击拖拽连线）"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-4 !h-4 !-bottom-1 !bg-gradient-to-b !from-[#ffd778] !to-[#966b1a] !border-1.5 !border-[#261c06] !rounded-full shadow-[0_0_8px_rgba(234,179,8,0.7)] transition-all hover:scale-130 hover:!bg-yellow-100 cursor-crosshair z-30"
        title="引出后续战略路线（点击拖拽连线）"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-3.5 !h-3.5 !left-0.5 !top-1/2 !-translate-y-1/2 !bg-gradient-to-b !from-[#eab308] !to-[#854d0e] !border-1.5 !border-[#261c06] !rounded-full shadow-[0_0_6px_rgba(234,179,8,0.6)] transition-all hover:scale-130 hover:!bg-yellow-100 cursor-crosshair z-30"
        title="接收横向关联（点击拖拽连线）"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-3.5 !h-3.5 !right-0.5 !top-1/2 !-translate-y-1/2 !bg-gradient-to-b !from-[#eab308] !to-[#854d0e] !border-1.5 !border-[#261c06] !rounded-full shadow-[0_0_6px_rgba(234,179,8,0.6)] transition-all hover:scale-130 hover:!bg-yellow-100 cursor-crosshair z-30"
        title="引出横向/互斥路线（点击拖拽连线）"
      />
    </div>
  );
});

