import React from 'react';

export interface PresetAvatar {
  id: string;
  name: string;
  bg: string;
  color: string;
  svg: React.ReactNode;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'preset:marshal',
    name: '铁血元帅',
    bg: 'from-amber-700 to-amber-950',
    color: 'text-amber-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 4a3 3 0 110 6 3 3 0 010-6zm0 14.9c-3.11-1.07-5.54-4.57-5.93-8.4h11.86c-.39 3.83-2.82 7.33-5.93 8.4z" />
      </svg>
    ),
  },
  {
    id: 'preset:commander',
    name: '最高统帅',
    bg: 'from-yellow-600 to-amber-900',
    color: 'text-yellow-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z" />
      </svg>
    ),
  },
  {
    id: 'preset:strategist',
    name: '战略谋士',
    bg: 'from-sky-700 to-slate-950',
    color: 'text-sky-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    id: 'preset:tactical',
    name: '战术指挥',
    bg: 'from-emerald-800 to-slate-950',
    color: 'text-emerald-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
      </svg>
    ),
  },
  {
    id: 'preset:cyber',
    name: '赛博先锋',
    bg: 'from-violet-800 to-slate-950',
    color: 'text-fuchsia-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.29.02-.58.05-.86l5.95 5.95v1.91c0 .55.45 1 1 1h2zm6.71-3.29c-.19-.18-.44-.29-.71-.29h-2v-3c0-.55-.45-1-1-1h-4v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    id: 'preset:philosopher',
    name: '深邃哲人',
    bg: 'from-indigo-900 to-slate-950',
    color: 'text-indigo-300',
    svg: (
      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="currentColor">
        <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
      </svg>
    ),
  },
];
