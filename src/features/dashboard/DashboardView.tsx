import React from 'react';
import type { WorldOverview, Focus, Essay } from '../../api/types';
import { Shield, Compass, BookOpen, Flag, AlertCircle, ChevronRight, PenLine, Gauge } from 'lucide-react';
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
        {/* Leader & Commander Dossier Card (1:1 概念图真实黄色纸袋绝密档案) */}
        <div className="manila-paper p-5 rounded space-y-4 relative border-2 border-[#b3a078] shadow-[0_8px_25px_rgba(0,0,0,0.7)] text-[#2b2214]">
          {/* Manila Folder Tab on top */}
          <div className="manila-folder-tab -mt-5 -mx-5 px-5 py-2 flex items-center justify-between border-b border-[#bfae8b]">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-[#8a6b29]" />
              <span className="font-serif font-black text-sm tracking-wider text-[#2d2212]">
                指挥官档案 COMMANDER DOSSIER
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('leader')}
              className="text-xs text-[#6e5a3c] hover:text-black flex items-center space-x-0.5 font-mono font-bold"
            >
              <span>人事调令</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* 斜角红色绝密火漆印章 */}
          <div className="distressed-stamp-red absolute top-12 right-4 text-xs px-2 py-0.5 pointer-events-none z-10 opacity-85">
            绝密 256
          </div>

          {/* 照片与军衔人事栏 */}
          <div className="flex items-start space-x-4 pt-1">
            {/* 黑白复古军官照片带白边与相角 */}
            <div className="relative p-1 bg-[#faf6ee] border border-[#cfc1a5] shadow-md rounded-xs rotate-[-1deg] shrink-0">
              <div className="w-16 h-20 bg-gradient-to-br from-[#2a362e] to-[#141b16] rounded-xs border border-[#a38237] flex items-center justify-center overflow-hidden">
                <span className="text-3xl font-serif font-black gold-gradient-text drop-shadow">
                  {leader?.name ? leader.name[0] : '帅'}
                </span>
              </div>
              {/* 复古金属回形针或相角 */}
              <div className="absolute -top-1.5 left-2 w-3 h-5 border-2 border-[#b59955] rounded-t-full bg-transparent shadow-sm pointer-events-none" />
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-lg font-serif font-black text-[#1f190e] truncate tracking-wide">
                {leader?.name || '最高统帅'}
              </h4>
              <div className="text-[10px] font-mono text-[#735e3b] font-bold uppercase -mt-0.5">
                {leader?.name ? 'SUPREME COMMANDER' : 'COMMANDER'}
              </div>

              <div className="mt-2 space-y-0.5 text-xs font-serif text-[#4a3e2e]">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-mono text-[#78664a] font-bold">Role:</span>
                  <span className="font-bold text-[#1f190e]">最高统帅 (COMMANDER)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-mono text-[#78664a] font-bold">Status:</span>
                  <span className="font-bold text-emerald-800 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
                    <span>在役 Active</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 绝密特质勋章展示区：复刻概念图4枚立体黄铜勋章 */}
          <div className="space-y-2 pt-2 border-t border-[#c5b593]">
            {/* 分割装饰标牌 */}
            <div className="flex items-center justify-center space-x-2 text-[11px] font-mono text-[#735e3b] font-bold">
              <div className="h-px w-10 bg-[#bfae8b]" />
              <span>◇ Traits 功勋特质勋章 ◇</span>
              <div className="h-px w-10 bg-[#bfae8b]" />
            </div>

            {/* 4枚 3D 实体军功勋章展柜 */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {traits.length === 0 ? (
                <div className="col-span-2 text-center py-2 text-xs text-[#735e3b] italic font-serif">
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
                    className="flex items-center space-x-2 p-1.5 rounded bg-gradient-to-b from-[#f7f2e4] to-[#e6dcc6] border border-[#bfae8b] shadow-[0_2px_4px_rgba(0,0,0,0.15)] hover:brightness-105 transition cursor-pointer text-left group"
                  >
                    {/* 3D 独立金色/青铜月桂花环勋章徽记 */}
                    <div className="w-8 h-8 rounded-full medallion-badge-gold flex items-center justify-center shrink-0 shadow-md">
                      <span className="text-xs text-[#3b2b09] font-black">★</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-serif font-black text-xs text-[#2b2214] truncate group-hover:text-amber-900 transition">
                        {t.title}
                      </span>
                      <span className="text-[8px] font-mono font-bold text-[#735e3b] uppercase tracking-wider">
                        {`MEDAL #${idx + 1}`}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 底部教条通报 */}
          <div className="space-y-1 pt-2 border-t border-[#c5b593] flex items-center justify-between text-xs font-serif">
            <span className="text-[11px] font-mono text-[#735e3b] font-bold">意识形态教条:</span>
            <div className="flex flex-wrap gap-1">
              {ideologies.length === 0 ? (
                <span className="text-xs text-[#735e3b] italic">暂无教条</span>
              ) : (
                ideologies.slice(0, 2).map((i) => (
                  <span
                    key={i.id}
                    className="px-1.5 py-0.2 bg-[#d8ccb0] text-[#2b2214] border border-[#b3a078] rounded text-[11px] font-bold"
                  >
                    {i.title}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Current Situation (当前大势战区通报) */}
        <div className="dossier-card p-5 rounded-sm space-y-3 flex flex-col relative border-2 border-[#967b36]/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#334237] pb-2.5">
            <span className="text-xs uppercase tracking-wider text-strategy-gold font-serif font-bold flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-strategy-gold" />
              <span>战区人生大势简报 (SITUATION)</span>
            </span>
            <button
              onClick={() => onNavigateTab('ideology_philosophy')}
              className="text-xs text-[#9bb09f] hover:text-amber-300 flex items-center space-x-0.5 font-mono"
            >
              <span>哲学全文</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1 prose prose-invert prose-xs text-[#cbd6cd] overflow-y-auto max-h-[190px] pr-1 font-serif leading-relaxed p-3 bg-[#0f1411] border border-[#28352b] rounded-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {situation?.body_md || '当下无明确局势描述，可在意识形态与哲学页面中维护。'}
            </ReactMarkdown>
          </div>
        </div>

        {/* Stability & Strategic Spirits */}
        <div className="dossier-card p-5 rounded-sm space-y-4 relative border-2 border-[#967b36]/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)]">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#334237] pb-2.5">
            <span className="text-xs uppercase tracking-wider text-strategy-gold font-serif font-bold flex items-center space-x-1.5">
              <Gauge className="w-4 h-4 text-strategy-gold" />
              <span>战略稳定度与外部约束</span>
            </span>
            <button
              onClick={() => {
                soundFx.playClick();
                onOpenStabilityModal();
              }}
              className="text-xs font-mono text-amber-300 hover:underline"
            >
              校准数值
            </button>
          </div>

          {/* Analog Dial style box */}
          <div className="p-3.5 bg-gradient-to-r from-[#121914] to-[#18221b] border-2 border-[#384a3c] rounded-sm flex items-center justify-between shadow-inner">
            <div className="space-y-0.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#8b9b8f]">战略心智稳定度</div>
              <div className="text-2xl font-black font-mono text-amber-300 gold-gradient-text">
                {stability.current_value !== null ? `${stability.current_value}%` : '未设定'}
              </div>
            </div>
            <div className="text-[10px] font-serif text-[#86998b] text-right max-w-[150px] leading-relaxed">
              由统帅自主裁量评定，反映意志稳态与抗干扰韧性。
            </div>
          </div>

          {/* National Spirits List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#8b9b8f] flex items-center space-x-1">
                <Flag className="w-3.5 h-3.5 text-strategy-gold" />
                <span>活跃国家精神 (外部现实条件):</span>
              </span>
              <button
                onClick={() => {
                  soundFx.playClick();
                  onNavigateTab('spirit');
                }}
                className="text-[10px] font-mono text-[#8b9b8f] hover:text-amber-300"
              >
                查看全部
              </button>
            </div>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {national_spirits.length === 0 ? (
                <div className="text-xs text-[#6e8073] italic font-serif">暂无外部环境精神卡片</div>
              ) : (
                national_spirits.slice(0, 3).map((ns) => (
                  <div
                    key={ns.id}
                    className="p-2 bg-[#121814] border border-[#2b392e] rounded-sm text-xs flex items-center justify-between"
                  >
                    <span className="font-serif font-bold text-[#e7e0cc]">{ns.title}</span>
                    <span className="text-[10px] font-serif text-[#86998b] truncate max-w-[150px]">{ns.body_md}</span>
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
        <div className="lg:col-span-2 dossier-card p-5 rounded-sm space-y-4 border-2 border-[#967b36]/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)] relative">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#334237] pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase tracking-wider text-strategy-gold font-serif font-bold">
                前线推进中国策 (ACTIVE DIRECTIVES)
              </span>
              <span className="px-2 py-0.5 rounded-sm bg-emerald-950/90 text-emerald-300 border border-emerald-600/80 text-[10px] font-mono font-bold shadow-sm">
                {active_foci.length} 战役攻坚中
              </span>
            </div>
            <button
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('focus');
              }}
              className="text-xs font-serif font-bold text-amber-300 hover:text-yellow-200 flex items-center space-x-1"
            >
              <span>进入战略推演沙盘</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active_foci.length === 0 ? (
              <div className="col-span-2 py-10 text-center text-[#6e8073] text-sm italic font-serif">
                当前没有正在推进的国策。可前往「国策画布」启动长期战略政策。
              </div>
            ) : (
              active_foci.map((f: Focus) => (
                <div
                  key={f.id}
                  onClick={() => {
                    soundFx.playClick();
                    onNavigateTab('focus');
                  }}
                  className="p-4 node-plaque-active rounded-sm cursor-pointer transition space-y-2 shadow-lg hover:brightness-110 relative"
                >
                  <div className="flex items-start justify-between">
                    <h5 className="font-serif font-bold text-sm text-[#f0eae0]">{f.title}</h5>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500 rounded-sm text-[10px] font-mono font-bold">
                      ● 执行中
                    </span>
                  </div>
                  <p className="text-xs text-[#a2b2a6] line-clamp-2 font-serif leading-relaxed">
                    {f.body_md || '无正文说明'}
                  </p>
                  <div className="pt-2 border-t border-[#2d3a30] text-[10px] font-mono text-strategy-gold flex justify-between">
                    <span>点击调取沙盘节点</span>
                    <span>{f.created_at.slice(0, 10)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Strategic Essays (战略随笔与灵感复盘) */}
        <div className="dossier-card p-5 rounded-sm space-y-4 border-2 border-[#967b36]/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)] relative">
          <div className="absolute top-2 left-2 screw-rivet" />
          <div className="absolute top-2 right-2 screw-rivet" />

          <div className="flex items-center justify-between border-b border-[#334237] pb-2.5">
            <span className="text-xs uppercase tracking-wider text-strategy-gold font-serif font-bold flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-strategy-gold" />
              <span>战略随笔与灵感复盘</span>
            </span>
            <button
              onClick={() => onNavigateTab('archive')}
              className="text-xs font-mono text-[#8b9b8f] hover:text-amber-300"
            >
              历史机要
            </button>
          </div>

          <button
            onClick={onWriteEssay}
            className="w-full flex items-center justify-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-[#202b23] to-[#1a231d] hover:from-[#29382d] hover:to-[#222e25] text-strategy-gold border border-strategy-gold/60 rounded-sm text-xs font-serif font-bold transition shadow-sm"
          >
            <PenLine className="w-3.5 h-3.5 text-strategy-gold" />
            <span>撰写绝密战略随笔 (NEW LOG)</span>
          </button>

          <div className="space-y-2.5">
            {essays.length === 0 ? (
              <div className="text-xs text-[#6e8073] italic py-4 text-center font-serif">
                暂无战略随笔，点击上方按钮开始记录灵感与战役复盘。
              </div>
            ) : (
              essays.slice(0, 5).map((essay: Essay) => (
                <div
                  key={essay.id}
                  onClick={() => onEditEssay(essay)}
                  className="p-3 bg-[#111713] border border-[#2b382d] rounded-sm hover:border-strategy-gold hover:bg-[#161f18] transition cursor-pointer space-y-1 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold text-[#e7e0cc] truncate">{essay.title}</span>
                    <span className="text-[10px] text-[#7d8e82] font-mono shrink-0 ml-2">
                      {essay.updated_at?.slice(0, 10) || ''}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#9bb09f] line-clamp-2 font-serif">{essay.body_md || '（空白随笔）'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Events Bar: Teletype Intelligence Dispatches */}
      <div className="dossier-card p-5 rounded-sm space-y-3 border-2 border-[#967b36]/80 shadow-[0_6px_20px_rgba(0,0,0,0.6)] relative">
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />

        <div className="flex items-center justify-between border-b border-[#334237] pb-2">
          <span className="text-xs uppercase tracking-wider text-strategy-gold font-serif font-bold flex items-center space-x-1.5">
            <AlertCircle className="w-4 h-4 text-strategy-gold" />
            <span>战区加急情报与大事记 (TELETYPE DISPATCHES)</span>
          </span>
          <button
            onClick={() => onNavigateTab('archive')}
            className="text-xs font-mono text-[#8b9b8f] hover:text-amber-300"
          >
            历史战报流
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recent_events.length === 0 ? (
            <div className="col-span-3 text-xs text-[#6e8073] italic py-2 font-serif">暂无历史情报事件记录</div>
          ) : (
            recent_events.map((evt) => (
              <div
                key={evt.id}
                className={`p-3 rounded-sm border text-xs space-y-1.5 ${
                  evt.kind === 'super'
                    ? 'bg-[#261e12] border-[#a38237] shadow-sm'
                    : 'bg-[#111713] border-[#2b382d]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-[#f0eae0]">{evt.title}</span>
                  <span className="text-[10px] font-mono text-[#7d8e82]">{evt.occurred_on}</span>
                </div>
                {evt.quote && (
                  <div className="text-[11px] text-amber-300 italic border-l-2 border-[#d4af37] pl-2 font-serif">
                    "{evt.quote}"
                  </div>
                )}
                <p className="text-[#9bb09f] line-clamp-2 text-[11px] font-serif leading-relaxed">{evt.body_md}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
