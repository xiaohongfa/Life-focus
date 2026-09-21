import React, { useState, useRef, useEffect } from 'react';
import type { Life, Stability } from '../api/types';
import {
  Shield,
  Plus,
  Compass,
  GitFork,
  User,
  BookOpen,
  Flag,
  Archive,
  Camera,
  Users,
  Settings,
  Trash2,
  Volume2,
  VolumeX,
  Sliders,
  ChevronDown,
  Clock,
  Calendar,
} from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import {
  getStoredBirthDate,
  setStoredBirthDate,
  calculateSurvivalTime,
} from '../utils/survivalTime';

interface HeaderProps {
  lives: Life[];
  currentLife: Life | null;
  stability: Stability | null;
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
  const [volume, setVolume] = useState(() => Math.round(soundFx.getVolume() * 100));
  const [showVolumePopup, setShowVolumePopup] = useState(false);
  const volumePopupRef = useRef<HTMLDivElement>(null);

  // 冒险时长与出生时刻 (Survival Duration)
  const [birthDate, setBirthDate] = useState(() => getStoredBirthDate(currentLife?.id));
  const [survival, setSurvival] = useState(() => calculateSurvivalTime(getStoredBirthDate(currentLife?.id)));
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [tempBirthDate, setTempBirthDate] = useState('');

  // 监听生命周期与时间流逝 (每秒更新冒险时长)
  useEffect(() => {
    const b = getStoredBirthDate(currentLife?.id);
    setBirthDate(b);
    setSurvival(calculateSurvivalTime(b));
  }, [currentLife?.id]);

  useEffect(() => {
    const update = () => setSurvival(calculateSurvivalTime(birthDate));
    update();
    const interval = setInterval(update, 1000);
    const handleChanged = () => {
      const updated = getStoredBirthDate(currentLife?.id);
      setBirthDate(updated);
      setSurvival(calculateSurvivalTime(updated));
    };
    window.addEventListener('birthdate-changed', handleChanged);
    return () => {
      clearInterval(interval);
      window.removeEventListener('birthdate-changed', handleChanged);
    };
  }, [birthDate, currentLife?.id]);

  // Close volume popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (volumePopupRef.current && !volumePopupRef.current.contains(e.target as Node)) {
        setShowVolumePopup(false);
      }
    };
    if (showVolumePopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVolumePopup]);

  // 仪表盘绑定的真实战役数据
  const hasStab = stability?.current_value != null;
  const stabVal = hasStab ? Math.round(stability!.current_value!) : null;
  const stabDisplay = hasStab ? `${stabVal}%` : '未设定';

  const stabColor =
    stabVal === null
      ? 'text-slate-400'
      : stabVal >= 50
      ? 'text-emerald-400'
      : stabVal >= 30
      ? 'text-amber-400'
      : 'text-rose-400';

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
      soundFx.playStamp();
    }
  };

  const handleToggleSound = () => {
    const next = soundFx.toggle();
    setIsSoundOn(next);
    if (next) soundFx.playClick();
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    soundFx.setVolume(newVal / 100);
    soundFx.playClick();
  };

  return (
    <header className="flex flex-col select-none shadow-[0_8px_30px_rgba(0,0,0,0.95)] z-30 border-b-2 border-[#2b333e]">
      {/* 顶部重工业钢铁指挥控制台 (Authentic HOI4 Gunmetal Steel Chassis) */}
      <div className="hoi4-header-bar px-4 py-2.5 flex items-center justify-between relative bg-gradient-to-b from-[#252c34] to-[#14181d]">
        {/* 四角螺丝铆钉 */}
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute bottom-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />
        <div className="absolute bottom-2 right-2 screw-rivet" />

        {/* ===================== 左侧：指挥面板标识与战况速报 ===================== */}
        <div className="flex items-center space-x-3 pl-4 py-0.5">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded bg-gradient-to-b from-[#1c222a] to-[#101418] border border-[#3f4a58] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8),0_2px_4px_rgba(0,0,0,0.5)]">
            <Shield className="w-4 h-4 text-amber-400 drop-shadow" />
            <span className="font-serif font-black text-sm tracking-wider text-[#ffffff] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              人生战略指挥部
            </span>
            <span className="text-[10px] font-mono text-[#d4af37] font-semibold tracking-wider">
              HQ COMMAND
            </span>
          </div>

          {/* 核心真实战况指标：心智稳定度 (HOI4 Status Badge) */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenStabilityModal();
            }}
            className="flex items-center space-x-2 px-3 py-1.5 rounded hoi4-pill-badge hover:border-[#5a677a] transition cursor-pointer"
            title="心智稳定度（点击调节与查看历史战况推演）"
          >
            <span className="text-xs font-serif text-[#ffffff] flex items-center space-x-1">
              <span>🛡️ 稳定度</span>
            </span>
            <span className={`font-mono text-xs font-black ${stabColor}`}>
              {stabDisplay}
            </span>
          </button>
        </div>

        {/* ===================== 右侧：冒险时长、音效调控、档案切换与战略控制台 ===================== */}
        <div className="flex items-center space-x-3 pr-4">
          {/* 冒险时长与出生时刻 (HOI4 Survival Duration Clock) */}
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              setTempBirthDate(birthDate || '2000-01-01T00:00');
              setShowBirthModal(true);
            }}
            onMouseEnter={() => soundFx.playHover()}
            className="hoi4-pill-badge px-3 py-1.5 flex items-center space-x-2 transition group hover:border-[#fbbf24] cursor-pointer shadow-sm"
            title="点击设定最高统帅出生日期与降生时间（实时推算年月日时分）"
          >
            <Clock className="w-3.5 h-3.5 text-[#fbbf24] group-hover:rotate-45 transition-transform shrink-0" />
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase tracking-wider font-semibold">
                冒险时长:
              </span>
              <span className="text-xs font-mono font-black text-[#ffffff] group-hover:text-[#fbbf24] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {survival.formatted}
              </span>
            </div>
            <Calendar className="w-3 h-3 text-[#64748b] group-hover:text-[#fbbf24] transition-colors ml-0.5 shrink-0" />
          </button>

          {/* 战役机械音效与音量调控 (Tactile Audio & Loud Volume Master Control) */}
          <div className="relative" ref={volumePopupRef}>
            <div className="flex items-center bg-[#13171c] p-0.5 rounded border border-[#323b47] shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]">
              {/* 开关拨钮 */}
              <button
                type="button"
                onClick={handleToggleSound}
                className={`flex items-center space-x-1 px-2 py-1 rounded-xs transition cursor-pointer text-[10px] font-mono font-bold ${
                  isSoundOn
                    ? 'bg-gradient-to-r from-emerald-800 to-emerald-950 text-[#ffffff] border border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-[#221818] text-[#94a3b8] hover:text-white border border-rose-900/60'
                }`}
                title={isSoundOn ? '战役机械音效：已开启（点击切换静音）' : '战役机械音效：已静音（点击开启）'}
              >
                {isSoundOn ? <Volume2 className="w-3 h-3 text-emerald-400" /> : <VolumeX className="w-3 h-3 text-rose-400" />}
                <span>{isSoundOn ? '音效开' : '静音'}</span>
              </button>

              {/* 音量滑块调出按钮 */}
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setShowVolumePopup(!showVolumePopup);
                }}
                className="px-1.5 py-1 text-[10px] font-mono font-bold text-[#e2e8f0] hover:text-[#ffffff] hover:bg-[#202731] rounded-xs transition flex items-center space-x-0.5"
                title="调节战役音效主音量"
              >
                <Sliders className="w-2.5 h-2.5 text-[#fbbf24]" />
                <span>{volume}%</span>
              </button>
            </div>

            {/* 音量调节浮层 */}
            {showVolumePopup && (
              <div className="absolute right-0 mt-2 w-48 p-3 rounded-lg hoi4-window z-50 animate-fadeIn border border-[#4a5666]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-serif font-bold text-[#ffffff]">战役总音量</span>
                  <span className="text-xs font-mono font-bold text-[#fbbf24]">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer mb-2"
                />
                <div className="flex justify-between items-center text-[10px] font-mono text-[#94a3b8]">
                  <span>静音</span>
                  <button
                    type="button"
                    onClick={() => handleVolumeChange(100)}
                    className="text-[#fbbf24] hover:underline"
                  >
                    拉满 (100%)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 空间机密档案切换器 */}
          <div className="relative">
            <button
              onClick={() => {
                soundFx.playClick();
                setShowLifeMenu(!showLifeMenu);
              }}
              className="hoi4-btn-steel flex items-center space-x-2 px-3 py-1.5 rounded text-xs transition group"
            >
              <span className="text-[10px] font-mono text-[#94a3b8] uppercase">档案:</span>
              <span className="font-serif font-bold text-[#fbbf24] truncate max-w-[110px]">
                {currentLife?.name || '加载档案中...'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#d4af37]" />
            </button>

            {showLifeMenu && (
              <div className="absolute right-0 mt-1.5 w-64 hoi4-window rounded py-1.5 z-50 border-2 border-[#434e5c]">
                <div className="px-3 py-1 text-[11px] font-mono uppercase text-[#94a3b8] border-b border-[#29323d] flex items-center justify-between">
                  <span>切换人生空间战区</span>
                  <span className="text-[9px] text-[#fbbf24] font-bold">DOSSIERS</span>
                </div>
                {lives.map((l) => (
                  <div
                    key={l.id}
                    className={`group w-full px-3 py-2 text-sm flex items-center justify-between hover:bg-[#202731] transition ${
                      l.id === currentLife?.id
                        ? 'text-[#fbbf24] font-bold bg-[#1b222a] border-l-2 border-[#d4af37]'
                        : 'text-[#e2e8f0]'
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
                        <span className="text-[10px] text-amber-300 shrink-0 ml-1.5 px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-600 font-mono tracking-wider">
                          ACTIVE
                        </span>
                      )}
                    </button>
                    {onDeleteLife && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `确定要彻底删除人生空间「${l.name}」吗？\n\n警告：此操作将级联清空其下全部国策、特质、内阁和历史数据，彻底删档且不可恢复！`
                            )
                          ) {
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
                <div className="border-t border-[#29323d] mt-1 pt-1">
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      setShowLifeMenu(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-serif font-semibold text-[#fbbf24] hover:bg-[#202731] flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4 text-[#fbbf24]" />
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
            className="hoi4-btn-steel flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono tracking-wider transition"
            title="统帅战略控制台：模型设置、删档重开与数据导出"
          >
            <Settings className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span className="font-bold text-[#ffffff]">控制台</span>
          </button>
        </div>
      </div>

      {/* 军事战役下沉凹槽导航标签栏 (HOI4 Beveled Steel Tabs Bar) */}
      <div className="px-4 py-1.5 flex items-center space-x-2 overflow-x-auto bg-[#13161a] border-t border-[#242b33]">
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
              onMouseEnter={() => soundFx.playHover()}
              className={`flex flex-col items-center px-4 py-1.5 rounded transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'hoi4-btn-steel-active scale-[1.02] border-b-2 border-b-[#d4af37]'
                  : 'hoi4-btn-steel hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-[#fbbf24]' : 'text-[#94a3b8]'
                  }`}
                />
                <span className="text-xs font-serif font-bold tracking-wide text-[#ffffff]">
                  {item.label}
                </span>
              </div>
              <span
                className={`text-[8px] font-mono tracking-widest uppercase ${
                  isActive ? 'text-[#fbbf24] font-extrabold' : 'text-[#64748b]'
                }`}
              >
                {item.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* 新建空间战区弹窗 (HOI4 Heavy Gunmetal Window) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="hoi4-window p-6 rounded-lg shadow-2xl w-full max-w-md relative border-2 border-[#4a5768]">
            <div className="absolute top-2 right-2 screw-rivet" />
            <div className="absolute top-2 left-2 screw-rivet" />
            <div className="absolute bottom-2 right-2 screw-rivet" />
            <div className="absolute bottom-2 left-2 screw-rivet" />

            <div className="inline-block bg-rose-950/80 border border-rose-600 text-rose-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2">
              CONFIDENTIAL · 战区建档
            </div>

            <h3 className="text-lg font-serif font-bold text-[#ffffff] mb-1 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-[#fbbf24]" />
              <span>建立全新人生空间战区 (NEW THEATER)</span>
            </h3>
            <p className="text-xs text-[#cbd5e1] mb-4 font-serif leading-relaxed">
              每个空间拥有完全独立的战役国策沙盘、活跃特质勋章、内阁参谋推演和历史快照，彼此严格隔离。
            </p>
            <form onSubmit={handleCreateSubmit}>
              <input
                type="text"
                autoFocus
                placeholder="例如：主线人生战役、商业版图、学术高峰..."
                value={newLifeName}
                onChange={(e) => setNewLifeName(e.target.value)}
                className="w-full hoi4-inset-panel px-3 py-2 text-sm text-[#ffffff] placeholder-[#64748b] focus:outline-none focus:border-[#fbbf24] mb-4 font-serif font-semibold rounded"
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="hoi4-btn-steel px-4 py-1.5 text-xs font-mono rounded text-[#e2e8f0]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!newLifeName.trim()}
                  className="hoi4-btn-military px-5 py-1.5 text-xs font-serif font-bold rounded disabled:opacity-50"
                >
                  确认建立档案
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 设定出生时刻弹窗 (HOI4 Commander Birth Date Modal) */}
      {showBirthModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="hoi4-window p-6 rounded-lg shadow-2xl w-full max-w-md relative border-2 border-[#4a5768] text-white">
            <div className="absolute top-2 right-2 screw-rivet" />
            <div className="absolute top-2 left-2 screw-rivet" />
            <div className="absolute bottom-2 right-2 screw-rivet" />
            <div className="absolute bottom-2 left-2 screw-rivet" />

            <div className="inline-block bg-amber-950/80 border border-amber-600 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2">
              COMMANDER DOSSIER · 出生档案
            </div>

            <h3 className="text-lg font-serif font-black text-[#ffffff] mb-1 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-[#fbbf24]" />
              <span>设定最高统帅降生时刻 (BIRTH DATE)</span>
            </h3>
            <p className="text-xs text-[#cbd5e1] mb-4 font-serif leading-relaxed">
              系统将根据您的出生日期与当前现实世界时间，实时推演您在整个人生宏大战略战役中的已存活冒险历程（年月日时分）。
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-mono text-[#94a3b8] mb-1.5">
                  出生公历日期与时间 (精确到分钟):
                </label>
                <input
                  type="datetime-local"
                  value={tempBirthDate}
                  onChange={(e) => setTempBirthDate(e.target.value)}
                  className="w-full hoi4-inset-panel px-3 py-2 text-sm text-[#ffffff] font-mono font-bold rounded focus:outline-none focus:border-[#fbbf24]"
                />
              </div>

              {tempBirthDate && (
                <div className="hoi4-inset-panel p-2.5 rounded text-xs font-mono flex items-center justify-between text-[#e2e8f0]">
                  <span className="text-[#94a3b8]">即时推算时长:</span>
                  <span className="text-[#fbbf24] font-black">
                    {calculateSurvivalTime(tempBirthDate).formatted}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowBirthModal(false)}
                className="hoi4-btn-steel px-4 py-1.5 text-xs font-mono rounded text-[#e2e8f0]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playStamp();
                  setStoredBirthDate(tempBirthDate, currentLife?.id);
                  setBirthDate(tempBirthDate);
                  setShowBirthModal(false);
                }}
                className="hoi4-btn-military px-5 py-1.5 text-xs font-serif font-bold rounded"
              >
                确认并载入史册
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
