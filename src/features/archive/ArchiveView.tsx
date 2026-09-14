import React, { useState, useEffect, useRef } from 'react';
import type { ArchiveItem, Event, Essay } from '../../api/types';
import { api } from '../../api/client';
import { SuperEventModal } from '../../components/SuperEventModal';
import { useToast } from '../../components/ToastProvider';
import { Archive, Plus, AlertCircle, Camera, BookOpen, GitCommit, Filter, Sparkles, PenLine } from 'lucide-react';
import { soundFx } from '../../utils/soundEffects';

interface ArchiveViewProps {
  lifeId: string;
  onWriteEssay?: () => void;
  onEditEssay?: (essay: Essay) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ lifeId, onWriteEssay, onEditEssay }) => {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [showEventModal, setShowEventModal] = useState(false);

  // Super Event Stage Modal State (§9.2)
  const [selectedSuperEvent, setSelectedSuperEvent] = useState<Event | null>(null);
  const [isSuperModalOpen, setIsSuperModalOpen] = useState(false);

  // New event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventBody, setEventBody] = useState('');
  const [eventKind, setEventKind] = useState<'normal' | 'super'>('normal');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventQuote, setEventQuote] = useState('');

  const toast = useToast();
  const activeLifeIdRef = useRef(lifeId);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    loadArchive();
  }, [lifeId, filterType]);

  const loadArchive = async () => {
    activeLifeIdRef.current = lifeId;
    const currentSeq = ++loadSeqRef.current;
    try {
      const typeParam = filterType === 'all' ? undefined : filterType;
      const data = await api.getArchiveFeed(lifeId, typeParam);
      if (activeLifeIdRef.current !== lifeId || loadSeqRef.current !== currentSeq) {
        return;
      }
      setItems(data);
    } catch (err: unknown) {
      if (activeLifeIdRef.current === lifeId && loadSeqRef.current === currentSeq) {
        console.error('Failed to load archive feed', err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`加载战略档案流失败: ${msg}`);
      }
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) return;
    try {
      const created = await api.createEvent(
        lifeId,
        eventTitle.trim(),
        eventBody.trim(),
        eventKind,
        eventDate,
        eventQuote.trim() || undefined
      );
      setEventTitle('');
      setEventBody('');
      setEventQuote('');
      setShowEventModal(false);
      await loadArchive();
      toast.success(eventKind === 'super' ? `【超大事件】已发生并载入史册` : `大事记【${created.title}】已收录归档`);
      if (created && created.kind === 'super') {
        setSelectedSuperEvent(created);
        setIsSuperModalOpen(true);
      }
    } catch (err: unknown) {
      console.error('Failed to create event', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`收录大事记失败: ${msg}`);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'event':
      case 'super_event':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      case 'snapshot':
        return <Camera className="w-4 h-4 text-sky-400" />;
      case 'essay':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'focus_history':
        return <GitCommit className="w-4 h-4 text-strategy-gold" />;
      default:
        return <Archive className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-80px)] select-none">
      <div className="dossier-card border-2 border-[#967b36] p-6 rounded-sm space-y-4 shadow-[0_6px_24px_rgba(0,0,0,0.65)] relative">
        <div className="absolute top-2 left-2 screw-rivet" />
        <div className="absolute top-2 right-2 screw-rivet" />

        <div className="flex items-center justify-between border-b border-[#334237] pb-3">
          <div>
            <h3 className="font-serif font-bold text-base text-strategy-gold flex items-center space-x-2">
              <Archive className="w-5 h-5 text-strategy-gold" />
              <span className="gold-gradient-text">统一历史战略档案库 (ARCHIVE FEED · 纯查询聚合层)</span>
            </h3>
            <p className="text-xs text-[#8b9b8f] mt-1 font-serif">
              无损动态聚合人生大事记、世界快照、战略随笔与国策决议流转史，编织不可磨灭的历史全景。
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {onWriteEssay && (
              <button
                onClick={() => {
                  soundFx.playClick();
                  onWriteEssay();
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#17261c] hover:bg-[#203426] border border-emerald-600/70 text-emerald-300 font-serif font-bold rounded-sm text-xs shadow-sm transition"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>撰写战略随笔</span>
              </button>
            )}
            <button
              onClick={() => {
                soundFx.playClick();
                setShowEventModal(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>记入新历史大事件</span>
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center space-x-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-strategy-gold mr-1" />
          {[
            { id: 'all', label: '全部历程' },
            { id: 'event', label: '重要事件' },
            { id: 'super_event', label: '超事件' },
            { id: 'snapshot', label: '世界快照' },
            { id: 'essay', label: '思考随笔' },
            { id: 'focus_history', label: '国策动向' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                soundFx.playClick();
                setFilterType(f.id);
              }}
              className={`px-3 py-1 rounded-sm font-mono transition ${
                filterType === f.id
                  ? 'bg-[#cfa847] text-black font-bold shadow-sm'
                  : 'text-[#8b9b8f] hover:text-[#e7e0cc] bg-[#141b16] border border-[#2b382d]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline feed */}
        <div className="space-y-3 pt-2">
          {items.length === 0 ? (
            <div className="text-center py-12 text-[#6e8073] italic font-serif text-xs">
              暂无符合条件的历史档案记录。
            </div>
          ) : (
            items.map((item) => {
              const isSuper = item.item_type === 'super_event';
              const isEssay = item.item_type === 'essay';
              return (
                <div
                  key={item.id}
                  onClick={isEssay && onEditEssay ? () => {
                    soundFx.playClick();
                    onEditEssay({
                      id: item.source_id,
                      life_id: lifeId,
                      title: item.title.replace(/^随笔:\s*/, ''),
                      body_md: item.summary,
                      created_at: item.occurred_at,
                      updated_at: item.occurred_at,
                    });
                  } : undefined}
                  className={`p-4 rounded-sm border transition flex items-start space-x-3 shadow-md ${
                    isSuper
                      ? 'dossier-card border-2 border-amber-600 shadow-[0_0_18px_rgba(217,119,6,0.25)]'
                      : isEssay
                      ? 'dossier-card border border-emerald-600/70 hover:border-emerald-500 cursor-pointer'
                      : 'bg-[#131915] border border-[#2d3a30] hover:border-[#967b36]'
                  }`}
                >
                  <div className="p-2 rounded-sm bg-[#1c261f] border border-[#334237] text-strategy-gold shrink-0 mt-0.5 shadow-inner">
                    {getItemIcon(item.item_type)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h5 className={`font-serif font-bold text-sm ${isSuper ? 'text-amber-300 gold-gradient-text' : isEssay ? 'text-emerald-300' : 'text-[#f0eae0]'}`}>
                          {item.title}
                        </h5>
                        {item.extra_badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-sm border font-mono font-bold ${
                              isSuper
                                ? 'bg-amber-950 text-amber-300 border-amber-600'
                                : 'bg-[#1a231d] text-[#8b9b8f] border-[#2e3e31]'
                            }`}
                          >
                            {item.extra_badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-[#8b9b8f] shrink-0">
                        {item.occurred_at.slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-xs text-[#cbd6cd] leading-relaxed whitespace-pre-wrap font-serif">{item.summary}</p>
                    {isSuper && (
                      <div className="pt-2 flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSuperEvent({
                              id: item.source_id,
                              life_id: lifeId,
                              title: item.title,
                              body_md: item.summary,
                              kind: 'super',
                              occurred_on: item.occurred_at.slice(0, 10),
                              quote: item.extra_badge && item.extra_badge !== '超事件' ? item.extra_badge : undefined,
                              created_at: item.occurred_at,
                              updated_at: item.occurred_at,
                            });
                            setIsSuperModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/50 rounded-lg text-xs flex items-center space-x-1.5 transition font-bold shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                          <span>重播全屏超事件演出</span>
                        </button>
                      </div>
                    )}
                    {isEssay && onEditEssay && (
                      <div className="pt-1 text-[11px] text-emerald-400/70 italic">
                        点击查看或编辑随笔全文 →
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Record Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>记录新历史事件</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              §9.1: 事件本身不自动施加效果，保存后可手动在对应模块中体现其深远影响。
            </p>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">事件标题 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：顺利毕业、签订首笔核心合作..."
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">事件类型</label>
                  <select
                    value={eventKind}
                    onChange={(e) => setEventKind(e.target.value as 'normal' | 'super')}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                  >
                    <option value="normal">普通事件 (Normal)</option>
                    <option value="super">超事件 (Super Event · 时代转折)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">发生日期</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">叙事引言（可选）</label>
                <input
                  type="text"
                  placeholder="例如：历史在此刻拐弯..."
                  value={eventQuote}
                  onChange={(e) => setEventQuote(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">正文详细记录</label>
                <textarea
                  rows={3}
                  placeholder="记录该事件发生的关键经过与主观体悟..."
                  value={eventBody}
                  onChange={(e) => setEventBody(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!eventTitle.trim()}
                  className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold disabled:opacity-50"
                >
                  确认记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Event Fullscreen Stage Modal (§9.2) */}
      <SuperEventModal
        event={selectedSuperEvent}
        isOpen={isSuperModalOpen}
        onClose={() => setIsSuperModalOpen(false)}
      />
    </div>
  );
};
