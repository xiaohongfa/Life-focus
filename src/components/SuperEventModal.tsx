import React from 'react';
import type { Event } from '../api/types';
import { Sparkles, Calendar, Quote, X } from 'lucide-react';

interface SuperEventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SuperEventModal: React.FC<SuperEventModalProps> = ({ event, isOpen, onClose }) => {
  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn select-none">
      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />

      {/* Main Super Event Stage Panel */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-[#161a22] to-slate-950 border-2 border-strategy-gold/80 rounded-2xl shadow-[0_0_50px_rgba(217,119,6,0.35)] overflow-hidden flex flex-col">
        {/* Top Header Banner */}
        <div className="relative px-8 py-5 border-b border-strategy-gold/40 bg-slate-950/90 text-center flex flex-col items-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
            title="关闭演出"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-600 text-rose-300 text-[11px] font-mono uppercase tracking-widest mb-2 shadow">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>命运转折 · 超事件演播</span>
          </div>

          <h2 className="text-2xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-strategy-gold tracking-wide">
            {event.title}
          </h2>

          <div className="flex items-center space-x-1 text-xs font-mono text-slate-400 mt-2">
            <Calendar className="w-3.5 h-3.5 text-strategy-gold" />
            <span>发生日期：{event.occurred_on}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-8 py-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Quote Banner */}
          {event.quote && (
            <div className="relative p-4 rounded-xl bg-slate-950/80 border-l-4 border-strategy-gold border-y border-r border-slate-800 shadow-inner">
              <Quote className="w-6 h-6 text-strategy-gold/30 absolute top-2 right-3" />
              <p className="font-serif italic text-sm text-amber-200/90 leading-relaxed pr-6">
                “{event.quote}”
              </p>
            </div>
          )}

          {/* Event Narrative Body */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-serif">
              {event.body_md || '重大人生命运在此刻发生重大变迁与历史收束...'}
            </p>
          </div>
        </div>

        {/* Cinematic Decision Footer */}
        <div className="px-8 py-4 bg-slate-950 border-t border-strategy-gold/30 flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-2.5 bg-gradient-to-r from-amber-600 via-strategy-gold to-amber-500 hover:brightness-110 text-slate-950 font-serif font-bold text-sm tracking-widest rounded-xl transition shadow-[0_0_20px_rgba(217,119,6,0.3)] uppercase"
          >
            时代的车轮滚滚向前 · 确认
          </button>
        </div>
      </div>
    </div>
  );
};
