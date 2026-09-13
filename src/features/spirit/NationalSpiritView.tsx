import React, { useState, useEffect } from 'react';
import type { NationalSpirit } from '../../api/types';
import { api } from '../../api/client';
import { Flag, Plus, Archive, Edit3, Trash2, X } from 'lucide-react';
import { soundFx } from '../../utils/soundEffects';

interface NationalSpiritViewProps {
  lifeId: string;
}

export const NationalSpiritView: React.FC<NationalSpiritViewProps> = ({ lifeId }) => {
  const [spirits, setSpirits] = useState<NationalSpirit[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [bodyMd, setBodyMd] = useState('');

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSpirit, setEditingSpirit] = useState<NationalSpirit | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBodyMd, setEditBodyMd] = useState('');

  useEffect(() => {
    loadData();
  }, [lifeId, includeArchived]);

  const loadData = async () => {
    try {
      const data = await api.getNationalSpirits(lifeId, includeArchived);
      setSpirits(data);
    } catch (err) {
      console.error('Failed to load national spirits', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const created = await api.createNationalSpirit(lifeId, title.trim(), bodyMd.trim());
      setSpirits((prev) => [...prev, created]);
      setTitle('');
      setBodyMd('');
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create spirit', err);
    }
  };

  const handleArchive = async (id: string, currentArchived: boolean) => {
    try {
      await api.archiveNationalSpirit(lifeId, id, !currentArchived);
      loadData();
    } catch (err) {
      console.error('Failed to archive spirit', err);
    }
  };

  const handleOpenEdit = (s: NationalSpirit) => {
    setEditingSpirit(s);
    setEditTitle(s.title);
    setEditBodyMd(s.body_md);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSpirit || !editTitle.trim()) return;
    try {
      await api.updateNationalSpirit(lifeId, editingSpirit.id, editTitle.trim(), editBodyMd.trim(), editingSpirit.icon);
      setShowEditModal(false);
      setEditingSpirit(null);
      await loadData();
    } catch (err) {
      console.error('Failed to update spirit', err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`确认彻底删除国家精神「${title}」？此操作不可撤销。`)) return;
    try {
      await api.deleteNationalSpirit(lifeId, id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete spirit', err);
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
              <Flag className="w-5 h-5 text-strategy-gold" />
              <span className="gold-gradient-text">国家精神 (NATIONAL SPIRITS · 外部现实与阶段约束)</span>
            </h3>
            <p className="text-xs text-[#8b9b8f] mt-1 font-serif">
              陈述你当下所面临的外部现实客观条件、行业风口或阶段限制，不设数值强加，尊重客观现实。
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 text-xs text-[#8b9b8f] font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => {
                  soundFx.playClick();
                  setIncludeArchived(e.target.checked);
                }}
                className="rounded bg-[#0d120f] border-[#38483c] text-strategy-gold focus:ring-0"
              />
              <span>显示已归档</span>
            </label>
            <button
              onClick={() => {
                soundFx.playClick();
                setShowModal(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>制定新精神卡片</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {spirits.length === 0 ? (
            <div className="col-span-3 text-center py-10 text-[#6e8073] italic font-serif text-xs">
              暂无外部环境精神卡片。点击右上角新建如「紧缩周期」「行业风口」等外部约束条目。
            </div>
          ) : (
            spirits.map((s) => (
              <div
                key={s.id}
                className={`p-4 rounded-sm border space-y-2 flex flex-col justify-between transition shadow-sm ${
                  s.archived_at
                    ? 'bg-[#111713]/50 border-[#263329] opacity-60'
                    : 'dossier-card border-[#967b36]/70 hover:border-[#d4af37]'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full medallion-badge-gold flex items-center justify-center shrink-0 shadow-sm">
                      <Flag className="w-3.5 h-3.5 text-[#3b2b09]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-serif font-bold text-sm text-[#f7e192] truncate">{s.title}</h5>
                      <span className="text-[8px] font-mono text-amber-500 uppercase tracking-widest font-bold">NATIONAL SPIRIT</span>
                    </div>
                    {s.archived_at && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#1a231d] text-[#7d8e82] border border-[#2b382d] font-mono">已归档</span>
                    )}
                  </div>
                  <p className="text-xs text-[#cbd6cd] mt-2 leading-relaxed whitespace-pre-wrap font-serif">{s.body_md}</p>
                </div>
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#263229] font-mono text-xs">
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      handleOpenEdit(s);
                    }}
                    className="text-[#8b9b8f] hover:text-[#e7e0cc] flex items-center space-x-1"
                    title="编辑国家精神"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>编辑</span>
                  </button>
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      handleArchive(s.id, !!s.archived_at);
                    }}
                    className="text-[#8b9b8f] hover:text-[#e7e0cc] flex items-center space-x-1"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{s.archived_at ? '恢复当前展示' : '归档'}</span>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.title)}
                    className="text-[#7d8e82] hover:text-rose-400 flex items-center space-x-1"
                    title="彻底删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>新建国家精神卡片</span>
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">精神标题 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：市场寒冬、技术革新潮、阶段资源受限..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">描述与现实约束</label>
                <textarea
                  rows={3}
                  placeholder="客观陈述该环境条件带来的现实挑战与约束..."
                  value={bodyMd}
                  onChange={(e) => setBodyMd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold disabled:opacity-50"
                >
                  确认新建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSpirit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-strategy-gold/70 rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-strategy-gold" />
                <h3 className="text-base font-serif font-bold text-amber-300">编辑国家精神卡片</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSpirit(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">精神标题 *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-strategy-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">描述与现实约束 (Markdown)</label>
                <textarea
                  rows={4}
                  value={editBodyMd}
                  onChange={(e) => setEditBodyMd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-strategy-gold leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSpirit(null);
                  }}
                  className="px-4 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!editTitle.trim()}
                  className="px-4 py-1.5 text-xs rounded bg-gradient-to-r from-amber-600 to-strategy-gold hover:brightness-110 text-slate-950 font-bold disabled:opacity-50 transition shadow"
                >
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
