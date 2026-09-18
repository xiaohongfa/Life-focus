import React from 'react';
import type { WorldOverview, Focus, Essay } from '../../api/types';
import { Shield, Compass, BookOpen, Flag, AlertCircle, ChevronRight, PenLine, Gauge, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { soundFx } from '../../utils/soundEffects';

interface DashboardViewProps {
  overview: WorldOverview;
  onNavigateTab: (tab: string) => void;
  onOpenStabilityModal: () => void;
  essays: Essay[];
  onWriteEssay: () => void;
  onEditEssay: (essay: Essay) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  overview,
  onNavigateTab,
  onOpenStabilityModal,
  essays,
  onWriteEssay,
  onEditEssay,
}) => {
  const { leader, situation, stability, traits, ideologies, national_spirits, active_foci, recent_events } = overview;

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] select-none">
      {/* Top Banner: Supreme Commander Dossier, Current Situation, Stability & Spirits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leader & Commander Dossier Card (HOI4 Supreme Commander Panel - 素材图 5) */}
        <div className="hoi4-window p-5 rounded-lg space-y-4 relative border-2 border-[#475466] shadow-[0_8px_25px_rgba(0,0,0,0.85)]">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />
          <div className="absolute bottom-2 left-2 screw-rivet" />
          <div className="absolute bottom-2 right-2 screw-rivet" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#374251] pb-2.5">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#fbbf24]" />
              <span className="font-serif font-black text-sm tracking-wider text-[#ffffff]">
                最高统帅部档案 (COMMANDER)
              </span>
            </div>
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('leader');
              }}
              className="text-xs text-[#94a3b8] hover:text-[#fbbf24] flex items-center space-x-0.5 font-mono font-bold transition"
            >
              <span>人事调令</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Portrait & Leadership Status */}
          <div className="flex items-start space-x-4 pt-1">
            {/* HOI4 Portrait Frame */}
            <div className="relative p-1 bg-[#14181f] border-2 border-[#576579] rounded shadow-md shrink-0">
              <div className="w-16 h-20 bg-gradient-to-br from-[#26303d] to-[#12161c] rounded border border-[#fbbf24]/50 flex items-center justify-center overflow-hidden">
                <span className="text-3xl font-serif font-black text-[#fbbf24] drop-shadow">
                  {leader?.name ? leader.name[0] : '帅'}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-0.5 space-y-1">
              <h4 className="text-lg font-serif font-black text-[#ffffff] truncate tracking-wide">
                {leader?.name || '最高统帅'}
              </h4>
              <div className="text-[10px] font-mono text-[#fbbf24] font-bold uppercase">
                {leader?.name ? 'SUPREME COMMANDER' : 'COMMANDER'}
              </div>

              <div className="pt-1 space-y-1 text-xs font-serif text-[#cbd5e1]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-mono text-[#94a3b8] font-bold">职衔:</span>
                  <span className="font-bold text-[#ffffff]">最高统帅 (COMMANDER)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-mono text-[#94a3b8] font-bold">状态:</span>
                  <span className="font-bold text-emerald-400 flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>在役 Active</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 绝密特质勋章展示区 */}
          <div className="space-y-2 pt-2 border-t border-[#374251]">
            <div className="flex items-center justify-center space-x-2 text-[11px] font-mono text-[#94a3b8] font-bold">
              <div className="h-px w-10 bg-[#374251]" />
              <span className="text-[#fbbf24]">◇ 佩戴功勋特质勋章 (TRAITS) ◇</span>
              <div className="h-px w-10 bg-[#374251]" />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {traits.length === 0 ? (
                <div className="col-span-2 text-center py-2 text-xs text-[#94a3b8] italic font-serif">
                  暂无佩戴特质勋章，请前往人事调令装配
                </div>
              ) : (
                traits.slice(0, 4).map((t, idx) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      soundFx.playMedalEquip();
                      onNavigateTab('leader');
                    }}
                    className="flex items-center space-x-2 p-2 rounded hoi4-inset-panel border border-[#404c5e] hover:border-[#fbbf24] transition cursor-pointer text-left group"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0 shadow border border-amber-300">
                      <Award className="w-4 h-4 text-black" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-serif font-bold text-xs text-[#ffffff] truncate group-hover:text-[#fbbf24] transition">
                        {t.title}
                      </span>
                      <span className="text-[8px] font-mono font-bold text-[#94a3b8] uppercase tracking-wider">
                        {`MEDAL #${idx + 1}`}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 意识形态通报 */}
          <div className="pt-2 border-t border-[#374251] flex items-center justify-between text-xs font-serif">
            <span className="text-[11px] font-mono text-[#94a3b8] font-bold">指导教条:</span>
            <div className="flex flex-wrap gap-1">
              {ideologies.length === 0 ? (
                <span className="text-xs text-[#94a3b8] italic">暂无教条</span>
              ) : (
                ideologies.slice(0, 2).map((i) => (
                  <span
                    key={i.id}
                    className="px-2 py-0.5 bg-[#171c24] text-[#fbbf24] border border-[#3b4756] rounded text-[11px] font-bold font-serif"
                  >
                    {i.title}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Current Situation (当前大势战区通报) */}
        <div className="hoi4-window p-5 rounded-lg space-y-3 flex flex-col relative border-2 border-[#475466] shadow-[0_8px_25px_rgba(0,0,0,0.85)]">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />
          <div className="absolute bottom-2 left-2 screw-rivet" />
          <div className="absolute bottom-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#374251] pb-2.5">
            <span className="text-xs uppercase tracking-wider text-[#ffffff] font-serif font-bold flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-[#fbbf24]" />
              <span>战区人生大势简报 (SITUATION)</span>
            </span>
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('ideology_philosophy');
              }}
              className="text-xs text-[#94a3b8] hover:text-[#fbbf24] flex items-center space-x-0.5 font-mono transition"
            >
              <span>哲学全文</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 text-[#e2e8f0] overflow-y-auto max-h-[190px] pr-1 font-serif leading-relaxed p-3.5 hoi4-inset-panel rounded">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {situation?.body_md || '当下无明确局势描述，可在意识形态与哲学页面中维护。'}
            </ReactMarkdown>
          </div>
        </div>

        {/* Stability & Strategic Spirits */}
        <div className="hoi4-window p-5 rounded-lg space-y-4 relative border-2 border-[#475466] shadow-[0_8px_25px_rgba(0,0,0,0.85)]">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />
          <div className="absolute bottom-2 left-2 screw-rivet" />
          <div className="absolute bottom-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#374251] pb-2.5">
            <span className="text-xs uppercase tracking-wider text-[#ffffff] font-serif font-bold flex items-center space-x-1.5">
              <Gauge className="w-4 h-4 text-[#fbbf24]" />
              <span>战略稳定度与外部约束</span>
            </span>
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenStabilityModal();
              }}
              className="text-xs font-mono text-[#fbbf24] hover:underline"
            >
              校准数值
            </button>
          </div>

          {/* Analog Dial style box */}
          <div className="p-3.5 hoi4-inset-panel rounded flex items-center justify-between shadow-inner border border-[#3b4756]">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#94a3b8]">心智战略稳定度</div>
              <div className="text-2xl font-black font-mono text-[#fbbf24]">
                {stability.current_value !== null ? `${Math.round(stability.current_value)}%` : '未设定'}
              </div>
            </div>
            <div className="text-[10px] font-serif text-[#cbd5e1] text-right max-w-[150px] leading-relaxed">
              由统帅自主裁量评定，反映意志稳态与抗干扰韧性。
            </div>
          </div>

          {/* National Spirits List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#cbd5e1] flex items-center space-x-1">
                <Flag className="w-3.5 h-3.5 text-[#fbbf24]" />
                <span>活跃国家精神 (外部环境条件):</span>
              </span>
              <button
                onClick={() => {
                  soundFx.playClick();
                  onNavigateTab('spirit');
                }}
                className="text-[10px] font-mono text-[#94a3b8] hover:text-[#fbbf24]"
              >
                查看全部
              </button>
            </div>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {national_spirits.length === 0 ? (
                <div className="text-xs text-[#94a3b8] italic font-serif">暂无外部环境精神卡片</div>
              ) : (
                national_spirits.slice(0, 3).map((ns) => (
                  <div
                    key={ns.id}
                    className="p-2 hoi4-inset-panel rounded text-xs flex items-center justify-between border border-[#333d4b]"
                  >
                    <span className="font-serif font-bold text-[#ffffff]">{ns.title}</span>
                    <span className="text-[10px] font-serif text-[#cbd5e1] truncate max-w-[150px]">{ns.body_md}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Focuses & Strategic Essays Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ongoing Focuses (前线执行中国策调令) */}
        <div className="lg:col-span-2 hoi4-window p-5 rounded-lg space-y-4 border-2 border-[#475466] shadow-[0_8px_25px_rgba(0,0,0,0.85)] relative">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />
          <div className="absolute bottom-2 left-2 screw-rivet" />
          <div className="absolute bottom-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#374251] pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-wider text-[#ffffff] font-serif font-bold">
                前线推进中国策 (ACTIVE DIRECTIVES)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 text-[10px] font-mono font-bold shadow-sm">
                {active_foci.length} 战役推进中
              </span>
            </div>
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('focus');
              }}
              className="text-xs font-serif font-bold text-[#fbbf24] hover:text-amber-300 flex items-center space-x-1"
            >
              <span>进入战略推演沙盘</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active_foci.length === 0 ? (
              <div className="col-span-2 py-10 text-center text-[#94a3b8] text-sm italic font-serif">
                当前没有正在推进的国策。可前往「国策路线」启动长期战略政策。
              </div>
            ) : (
              active_foci.map((f: Focus) => (
                <div
                  key={f.id}
                  onClick={() => {
                    soundFx.playFocusSelect();
                    onNavigateTab('focus');
                  }}
                  className="p-4 hoi4-inset-panel rounded-lg cursor-pointer transition space-y-2 hover:border-[#fbbf24] border border-[#3b4756] relative group"
                >
                  <div className="flex items-start justify-between">
                    <h5 className="font-serif font-bold text-sm text-[#ffffff] group-hover:text-[#fbbf24] transition">
                      {f.title}
                    </h5>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500 rounded text-[10px] font-mono font-bold">
                      ● 执行中
                    </span>
                  </div>
                  <p className="text-xs text-[#cbd5e1] line-clamp-2 font-serif leading-relaxed">
                    {f.body_md || '无正文说明'}
                  </p>
                  <div className="pt-2 border-t border-[#29323e] text-[10px] font-mono text-[#fbbf24] flex justify-between">
                    <span>点击调取沙盘节点</span>
                    <span>{f.created_at.slice(0, 10)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Strategic Essays (战略随笔与灵感复盘) */}
        <div className="hoi4-window p-5 rounded-lg space-y-4 border-2 border-[#475466] shadow-[0_8px_25px_rgba(0,0,0,0.85)] relative">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />
          <div className="absolute bottom-2 left-2 screw-rivet" />
          <div className="absolute bottom-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#374251] pb-2.5">
            <span className="text-xs uppercase tracking-wider text-[#ffffff] font-serif font-bold flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-[#fbbf24]" />
              <span>战略随笔与灵感复盘</span>
            </span>
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('archive');
              }}
              className="text-xs font-mono text-[#94a3b8] hover:text-[#fbbf24]"
            >
              历史机要
            </button>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onWriteEssay();
            }}
            className="w-full hoi4-btn-military flex items-center justify-center space-x-1.5 px-3 py-2 rounded text-xs font-serif font-bold transition shadow"
          >
            <PenLine className="w-3.5 h-3.5 text-[#fbbf24]" />
            <span>撰写绝密战略随笔 (NEW LOG)</span>
          </button>

          <div className="space-y-2.5">
            {essays.length === 0 ? (
              <div className="text-xs text-[#94a3b8] italic py-4 text-center font-serif">
                暂无战略随笔，点击上方按钮开始记录灵感与战役复盘。
              </div>
            ) : (
              essays.slice(0, 5).map((essay: Essay) => (
                <div
                  key={essay.id}
                  onClick={() => {
                    soundFx.playClick();
                    onEditEssay(essay);
                  }}
                  className="p-3 hoi4-inset-panel rounded hover:border-[#fbbf24] transition cursor-pointer space-y-1 border border-[#323d4c]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold text-[#ffffff] truncate">{essay.title}</span>
                    <span className="text-[10px] text-[#94a3b8] font-mono shrink-0 ml-2">
                      {essay.updated_at?.slice(0, 10) || ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#cbd5e1] line-clamp-2 font-serif">{essay.body_md || '（空白随笔）'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Events Bar: Teletype Intelligence Dispatches */}
      <div className="hoi4-window p-5 rounded-lg space-y-3 border-2 border-[#475466] shadow-[0_8px_25px_rgba(0,0,0,0.85)] relative">
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />
        <div className="absolute bottom-2 left-2 screw-rivet" />
        <div className="absolute bottom-2 right-2 screw-rivet" />

        <div className="flex items-center justify-between border-b border-[#374251] pb-2">
          <span className="text-xs uppercase tracking-wider text-[#ffffff] font-serif font-bold flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 text-[#fbbf24]" />
            <span>战区加急情报与大事记 (TELETYPE DISPATCHES)</span>
          </span>
          <button
            onClick={() => {
              soundFx.playClick();
              onNavigateTab('archive');
            }}
            className="text-xs font-mono text-[#94a3b8] hover:text-[#fbbf24]"
          >
            历史战报流
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recent_events.length === 0 ? (
            <div className="col-span-3 text-xs text-[#94a3b8] italic py-2 font-serif">暂无历史情报事件记录</div>
          ) : (
            recent_events.map((evt) => (
              <div
                key={evt.id}
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  evt.kind === 'super'
                    ? 'hoi4-inset-panel border-[#fbbf24]/60 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                    : 'hoi4-inset-panel border-[#333d4b]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-[#ffffff]">{evt.title}</span>
                  <span className="text-[10px] font-mono text-[#94a3b8]">{evt.occurred_on}</span>
                </div>
                {evt.quote && (
                  <div className="text-[11px] text-[#fbbf24] italic border-l-2 border-[#fbbf24] pl-2 font-serif">
                    "{evt.quote}"
                  </div>
                )}
                <p className="text-[#cbd5e1] line-clamp-2 text-[11px] font-serif leading-relaxed">{evt.body_md}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
