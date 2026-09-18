import React, { useEffect } from 'react';
import type { Event } from '../api/types';
import { Calendar, Quote, X, Newspaper } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface SuperEventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SuperEventModal: React.FC<SuperEventModalProps> = ({ event, isOpen, onClose }) => {
  useEffect(() => {
    if (isOpen && event) {
      soundFx.playEventPopup();
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.95)]" />

      {/* HOI4 World News Newspaper Stage (素材图 1 真实世界新闻报纸) */}
      <div className="relative w-full max-w-2xl hoi4-newspaper rounded-sm shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col border-4 border-[#8c7b60]">
        {/* Top Newspaper Masthead (双重分割线报头) */}
        <div className="px-8 pt-5 pb-3 text-center relative border-b-2 border-[#5c4e3a]">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-1 text-[#5c4e3a] hover:text-black rounded transition"
            title="关闭通报"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Newspaper Title */}
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-[#5c4e3a] border-b border-[#8c7b60] pb-1 mb-2">
            <span>EXTRA EDITION · 命运特辑</span>
            <span className="font-bold flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-[#5c4e3a]" />
              <span>{event.occurred_on || '1936.01.01'}</span>
            </span>
            <span>ISSUE NO. 104</span>
          </div>

          <h1 className="text-3xl font-serif font-black tracking-widest text-[#1a140d] uppercase drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
            WORLD NEWS · 世界要闻
          </h1>
          <div className="text-[10px] font-serif italic text-[#5c4e3a] mt-0.5">
            — 全球战局走向与重大人生命运转折实录 —
          </div>
        </div>

        {/* Headline Banner */}
        <div className="px-8 py-3 bg-[#cfc2a9]/50 border-b border-[#a8987d] text-center">
          <h2 className="text-xl font-serif font-black text-[#140f09] tracking-wide leading-snug">
            {event.title}
          </h2>
        </div>

        {/* Content Body: Newspaper Photo & Story */}
        <div className="px-8 py-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Vintage Monochromatic Press Photo Box (素材图 1 照片框) */}
          <div className="hoi4-news-photo-frame p-1 rounded-xs flex flex-col items-center justify-center bg-[#2b251d] text-center">
            <div className="w-full h-36 bg-gradient-to-br from-[#3b3226] to-[#1a1713] flex flex-col items-center justify-center p-4 border border-[#443828]">
              <Newspaper className="w-12 h-12 text-[#9c8970] mb-2 opacity-80" />
              <span className="text-xs font-serif font-bold text-[#cfc2a9] tracking-wider uppercase">
                STRATEGIC PRESS WIRE
              </span>
              <span className="text-[10px] font-mono text-[#8a7962]">
                现场战况通讯社发回电报记录
              </span>
            </div>
          </div>

          {/* Quote Banner */}
          {event.quote && (
            <div className="relative p-3 bg-[#c9bba0]/40 border-l-4 border-[#5c4e3a] border-y border-r border-[#a8987d] shadow-inner">
              <Quote className="w-5 h-5 text-[#5c4e3a]/40 absolute top-2 right-2" />
              <p className="font-serif italic text-sm text-[#261d13] font-bold leading-relaxed pr-5">
                “{event.quote}”
              </p>
            </div>
          )}

          {/* Event Narrative Body */}
          <div className="text-sm text-[#1f1911] leading-relaxed font-serif text-justify indent-8 space-y-2">
            <p>{event.body_md || '重大人生命运在此刻发生重大变迁与历史收束...'}</p>
          </div>
        </div>

        {/* Classic HOI4 News Decision Footer */}
        <div className="px-8 py-4 bg-[#c8baa0] border-t-2 border-[#5c4e3a] flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              soundFx.playStamp();
              onClose();
            }}
            className="hoi4-btn-military w-full sm:w-auto px-12 py-2.5 rounded text-sm font-serif font-bold tracking-widest uppercase transition shadow-lg"
          >
            历史的车轮滚滚向前 · 确认
          </button>
        </div>
      </div>
    </div>
  );
};
