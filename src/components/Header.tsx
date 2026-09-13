import React, { useState } from 'react';
import type { Life, Stability, WorldOverview } from '../api/types';
import { Shield, Plus, Compass, GitFork, User, BookOpen, Flag, Archive, Camera, Users, Settings, Trash2 } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface HeaderProps {
  lives: Life[];
  currentLife: Life | null;
  stability: Stability | null;
  overview?: WorldOverview | null;
  activeTab: string;
  onSelectLife: (lifeId: string) => void;
  onCreateLife: (name: string) => void;
  onDeleteLife?: (lifeId: string) => void;
  onOpenStabilityModal: () => void;
  onOpenSettingsModal: () => void;
  onSelectTab: (tab: string) => void;
}



export const Header: React.FC<HeaderProps> = ({
  lives,
  currentLife,
  stability,
  overview,
  activeTab,
  onSelectLife,
  onCreateLife,
  onDeleteLife,
  onOpenStabilityModal,
  onOpenSettingsModal,
  onSelectTab,
}) => {
  const [showLifeMenu, setShowLifeMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLifeName, setNewLifeName] = useState('');
  const [isSoundOn, setIsSoundOn] = useState(() => soundFx.isEnabled());

  // 仪表盘绑定的真实战役数据
  const stabVal = stability?.current_value ?? 70;
  
  // 战略士气：根据活跃与达成国策数计算
  const activeFociCount = overview?.active_foci?.length ?? 1;
  const moraleVal = Math.min(95, Math.max(30, 60 + activeFociCount * 5));

  // 行动储备 / 财富能源：根据国家精神与内政状态计算
  const spiritsCount = overview?.national_spirits?.length ?? 2;
  const reserveVal = Math.min(98, Math.max(40, 50 + spiritsCount * 12));



  const navItems = [
    { id: 'dashboard', label: '战略总览', sub: 'OVERVIEW', code: 'CMD-01', icon: Compass },
    { id: 'focus', label: '国策路线', sub: 'ROADMAP', code: 'STRAT-02', icon: GitFork },
    { id: 'leader', label: '领袖人事', sub: 'LEADERSHIP', code: 'LEAD-03', icon: User },
    { id: 'cabinet', label: '内阁参谋', sub: 'STAFF', code: 'STAFF-04', icon: Users },
    { id: 'ideology_philosophy', label: '意识形态', sub: 'DOCTRINE', code: 'DOCT-05', icon: BookOpen },
    { id: 'spirit', label: '国家精神', sub: 'SPIRIT', code: 'NAT-06', icon: Flag },
    { id: 'archive', label: '历史档案', sub: 'ARCHIVES', code: 'HIST-07', icon: Archive },
    { id: 'snapshots', label: '世界快照', sub: 'SNAPSHOTS', code: 'SNAP-08', icon: Camera },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLifeName.trim()) {
      onCreateLife(newLifeName.trim());
      setNewLifeName('');
      setShowCreateModal(false);
    }
  };

  const handleToggleSound = () => {
    const next = soundFx.toggle();
    setIsSoundOn(next);
    soundFx.playClick();
  };

  return (
    <header className="flex flex-col select-none shadow-[0_8px_25px_rgba(0,0,0,0.9)] z-30 border-b-2 border-[#3d2f14]">
      {/* 顶部重工业拉丝黄铜指挥控制台 (Top Brushed Brass Console) */}
      <div className="brushed-brass-console px-4 py-2 flex items-center justify-between relative">
        {/* 左侧和右侧螺丝铆钉 */}
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute bottom-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />
        <div className="absolute bottom-2 right-2 screw-rivet" />

        {/* ===================== 左侧：指挥面板标识与战况速报 ===================== */}
        <div className="flex items-center space-x-3 pl-4 py-1">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-gradient-to-b from-[#211a0e] to-[#120e07] border-2 border-[#82662c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_2px_6px_rgba(0,0,0,0.6)]">
            <Shield className="w-4 h-4 text-amber-300 drop-shadow" />
            <span className="font-serif font-black text-base tracking-widest text-[#f5ebd2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              指挥面板
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-semibold tracking-wider">
              COMMAND PANEL
            </span>
          </div>

          {/* 战况即时战备通报条目 */}
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold">
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenStabilityModal();
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#101712] border border-[#2d3f32] text-emerald-400 hover:border-emerald-500 transition cursor-pointer"
              title="心智稳定度（点击调节与复盘）"
            >
              <span>🛡️ 稳定性</span>
              <span className="text-amber-300 font-sans">{stabVal.toFixed(0)}%</span>
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                onSelectTab('focus');
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1c160e] border border-[#48371d] text-amber-300 hover:border-amber-500 transition cursor-pointer"
              title="战略士气（点击前往国策）"
            >
              <span>👥 士气</span>
              <span className="text-yellow-200 font-sans">{moraleVal}%</span>
            </button>
            <button
              onClick={() => {
                soundFx.playClick();
                onSelectTab('spirit');
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1a1410] border border-[#48301d] text-orange-300 hover:border-orange-500 transition cursor-pointer"
              title="行动储备（点击前往国家精神）"
            >
              <span>⚡ 储备</span>
              <span className="text-amber-200 font-sans">{reserveVal}%</span>
            </button>
          </div>
        </div>

        {/* ===================== 右侧：机械拨动开关、档案切换与战略控制台 ===================== */}
        <div className="flex items-center space-x-3 pr-4">
          {/* 战役机械音效 3D 实体拨动开关 (Tactile Rocker Switch) */}
          <div className="flex flex-col items-center bg-[#151b17] px-2.5 py-1 rounded border border-[#3b4c3e] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
            <span className="text-[9px] font-mono font-bold text-[#9bb09f] uppercase mb-0.5">
              战役音效
            </span>
            <button
              onClick={handleToggleSound}
              className={`flex items-center rounded-sm p-0.5 transition cursor-pointer border ${
                isSoundOn
                  ? 'bg-gradient-to-r from-emerald-900 to-[#12281a] border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                  : 'bg-gradient-to-r from-[#291717] to-[#1a1010] border-rose-800'
              }`}
              title={isSoundOn ? '机械音效：开启 (ON) - 点击切为静音' : '机械音效：静音 (OFF) - 点击开启'}
            >
              <span
                className={`px-1.5 py-0.5 text-[9px] font-mono font-black rounded transition ${
                  isSoundOn
                    ? 'bg-emerald-500 text-black shadow-sm font-bold'
                    : 'text-slate-500'
                }`}
              >
                ON
              </span>
              <span
                className={`px-1.5 py-0.5 text-[9px] font-mono font-black rounded transition ${
                  !isSoundOn
                    ? 'bg-rose-600 text-white shadow-sm font-bold'
                    : 'text-slate-500'
                }`}
              >
                OFF
              </span>
            </button>
          </div>

          {/* 空间机密档案切换器 */}
          <div className="relative">
            <button
              onClick={() => {
                soundFx.playClick();
                setShowLifeMenu(!showLifeMenu);
              }}
              className="flex items-center space-x-2 px-3 py-1.5 rounded bg-gradient-to-b from-[#2a2216] to-[#16120b] hover:from-[#352c1e] hover:to-[#1e1910] border border-[#a88944] text-xs text-[#f1ebdb] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] transition group"
            >
              <span className="text-[10px] font-mono text-[#baa37b] uppercase">档案:</span>
              <span className="font-serif font-bold text-amber-300 drop-shadow truncate max-w-[110px]">
                {currentLife?.name || '加载档案中...'}
              </span>
              <span className="text-[10px] text-strategy-gold">▼</span>
            </button>

            {showLifeMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-[#141b16] border-2 border-[#967b36] rounded shadow-[0_8px_24px_rgba(0,0,0,0.9)] py-1.5 z-50">
                <div className="px-3 py-1 text-[11px] font-mono uppercase text-[#9bb09f] border-b border-[#29362c] flex items-center justify-between">
                  <span>切换空间机密档案</span>
                  <span className="text-[9px] text-strategy-gold font-bold">DOSSIERS</span>
                </div>
                {lives.map((l) => (
                  <div
                    key={l.id}
                    className={`group w-full px-3 py-2 text-sm flex items-center justify-between hover:bg-[#202b23] transition ${
                      l.id === currentLife?.id ? 'text-amber-300 font-bold bg-[#1b251e] border-l-2 border-strategy-gold' : 'text-[#d6d0be]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        onSelectLife(l.id);
                        setShowLifeMenu(false);
                      }}
                      className="flex-1 text-left flex items-center justify-between truncate mr-2"
                    >
                      <span className="truncate font-serif">{l.name}</span>
                      {l.id === currentLife?.id && (
                        <span className="text-[10px] text-amber-300 shrink-0 ml-1.5 px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-700/80 font-mono tracking-wider">
                          ACTIVE
                        </span>
                      )}
                    </button>
                    {onDeleteLife && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`确定要彻底删除人生空间「${l.name}」吗？\n\n警告：此操作将级联清空其下全部国策、特质、内阁和历史数据，彻底删档且不可恢复！`)) {
                            onDeleteLife(l.id);
                            setShowLifeMenu(false);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition shrink-0"
                        title={`彻底删除空间「${l.name}」`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="border-t border-[#29362c] mt-1 pt-1">
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      setShowLifeMenu(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-serif font-semibold text-strategy-gold hover:bg-[#202b23] flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4 text-strategy-gold" />
                    <span>开辟新人生命运空间 (NEW THEATER)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 统帅战略控制台按钮 */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenSettingsModal();
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-gradient-to-b from-[#242d27] to-[#151c17] hover:from-[#2e3a32] hover:to-[#1a231d] text-[#e7e0cc] border border-[#485b4c] text-xs font-mono tracking-wider transition shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            title="统帅战略控制台：模型设置、删档重开与数据导出"
          >
            <Settings className="w-3.5 h-3.5 text-strategy-gold" />
            <span className="font-bold">控制台</span>
          </button>
        </div>
      </div>

      {/* 军事战役下沉凹槽导航标签栏 (Recessed Metal Military Plaque Tabs) */}
      <div className="brass-recessed-chassis px-4 py-1 flex items-center space-x-1.5 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundFx.playClick();
                onSelectTab(item.id);
              }}
              className={`flex flex-col items-center px-4 py-1.5 rounded transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'btn-console-tab-active scale-[1.02]'
                  : 'btn-console-tab-inactive'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#3b2b0a]' : 'text-[#8b9b8f]'}`} />
                <span className="text-xs font-serif font-bold tracking-wide">
                  {item.label}
                </span>
              </div>
              <span className={`text-[8px] font-mono tracking-widest uppercase ${isActive ? 'text-[#5a4212] font-extrabold' : 'text-[#55665a]'}`}>
                {item.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* 新建空间弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="manila-paper p-6 rounded shadow-2xl w-full max-w-md relative border-2 border-[#967b36]">
            <div className="absolute top-2 right-2 screw-rivet" />
            <div className="absolute top-2 left-2 screw-rivet" />
            <div className="distressed-stamp-red absolute right-6 top-5 text-[10px] px-2 py-0.5">
              CONFIDENTIAL
            </div>

            <h3 className="text-lg font-serif font-bold text-[#2d2212] mb-1 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-[#886526]" />
              <span>建立全新人生空间战区 (NEW THEATER)</span>
            </h3>
            <p className="text-xs text-[#5f5139] mb-4 font-serif leading-relaxed">
              每个空间拥有完全独立的战役国策沙盘、活跃特质勋章、内阁参谋推演和历史快照，彼此严格隔离。
            </p>
            <form onSubmit={handleCreateSubmit}>
              <input
                type="text"
                autoFocus
                placeholder="例如：主线人生战役、商业版图、学术高峰..."
                value={newLifeName}
                onChange={(e) => setNewLifeName(e.target.value)}
                className="w-full bg-[#f6efe1] border-2 border-[#b3a078] rounded px-3 py-2 text-sm text-[#2b2318] placeholder-[#9a8d73] focus:outline-none focus:border-[#82662c] mb-4 font-serif font-semibold"
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-1.5 text-xs font-mono rounded bg-[#d6c7ab] hover:bg-[#c9b898] text-[#3d3221] border border-[#a4916a]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newLifeName.trim()}
                  className="px-4 py-1.5 text-xs font-serif font-bold rounded bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 text-white shadow-md disabled:opacity-50"
                >
                  确认建立档案
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
