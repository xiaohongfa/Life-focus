import React, { useState, useEffect } from 'react';
import type { WorldSnapshot } from '../../api/types';
import { api } from '../../api/client';
import { Camera, Plus, Trash2, Eye, X, ShieldAlert } from 'lucide-react';
import { soundFx } from '../../utils/soundEffects';

interface SnapshotsViewProps {
  lifeId: string;
}

export const SnapshotsView: React.FC<SnapshotsViewProps> = ({ lifeId }) => {
  const [snapshots, setSnapshots] = useState<WorldSnapshot[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inspectingSnapshot, setInspectingSnapshot] = useState<WorldSnapshot | null>(null);

  useEffect(() => {
    loadSnapshots();
  }, [lifeId]);

  const loadSnapshots = async () => {
    try {
      const data = await api.listWorldSnapshots(lifeId);
      setSnapshots(data);
    } catch (err) {
      console.error('Failed to load snapshots', err);
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      soundFx.playStamp();
      // 聚合当前完整世界状态 payload (§11.1 / P1-DATA-07)
      const exportJson = await api.exportLifeJson(lifeId);
      const payloadJson = typeof exportJson === 'string' ? exportJson : JSON.stringify(exportJson || {});

      await api.createWorldSnapshot(lifeId, name.trim(), description.trim() || undefined, payloadJson);
      setName('');
      setDescription('');
      setShowCreateModal(false);
      loadSnapshots();
    } catch (err) {
      console.error('Failed to create world snapshot', err);
    }
  };

  const handleDelete = async (snapshotId: string, snapName: string) => {
    if (!window.confirm(`确定删除世界快照「${snapName}」？`)) return;
    try {
      soundFx.playVoid();
      await api.deleteWorldSnapshot(lifeId, snapshotId);
      loadSnapshots();
    } catch (err) {
      console.error('Failed to delete snapshot', err);
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
              <Camera className="w-5 h-5 text-strategy-gold" />
              <span className="gold-gradient-text">世界快照与人生存档 (WORLD SNAPSHOTS · 阶段封存)</span>
            </h3>
            <p className="text-xs text-[#8b9b8f] mt-1 font-serif">
              用户主动命名的世界战略冻结状态，支持只读回溯，不覆盖当前世界，留下历史脚印。
            </p>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-serif font-bold rounded-sm text-xs shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>封存当下世界快照</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {snapshots.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-[#6e8073] italic font-serif text-xs">
              暂无世界快照。可在重大人生关口主动保存世界状态用于未来回溯对比。
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-4 bg-[#131915] border border-[#2d3a30] hover:border-[#967b36] rounded-sm space-y-3 flex flex-col justify-between transition shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h5 className="font-serif font-bold text-sm text-[#f7e192]">{snap.name}</h5>
                    <span className="text-[10px] text-[#8b9b8f] font-mono">
                      {snap.created_at.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                  {snap.description && (
                    <p className="text-xs text-[#cbd6cd] mt-1 line-clamp-2 font-serif">{snap.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#263229] text-xs font-mono">
                  <button
                    onClick={() => {
                      soundFx.playClick();
                      setInspectingSnapshot(snap);
                    }}
                    className="text-strategy-gold hover:underline flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>只读回溯查看</span>
                  </button>
                  <button
                    onClick={() => handleDelete(snap.id, snap.name)}
                    className="text-[#7d8e82] hover:text-rose-400 flex items-center space-x-1"
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
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-bold text-amber-300 mb-4 flex items-center space-x-2">
              <Camera className="w-5 h-5 text-amber-400" />
              <span>创建世界快照</span>
            </h3>
            <form onSubmit={handleCreateSnapshot} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">快照名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="例如：2026年秋·战略转向前夕、毕业时刻..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">快照说明 / 备忘</label>
                <textarea
                  rows={3}
                  placeholder="记录保存当下世界状态的背景与想法..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-black font-semibold disabled:opacity-50"
                >
                  确认冻结并保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspecting Snapshot Modal (Read-only backtrace §11.3) */}
      {inspectingSnapshot && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-sky-600/60 rounded-lg shadow-2xl p-6 w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-sky-400" />
                <h3 className="font-serif font-bold text-lg text-slate-100">
                  只读回溯查看快照 · {inspectingSnapshot.name}
                </h3>
              </div>
              <button onClick={() => setInspectingSnapshot(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded text-xs text-sky-300 mb-4 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                §11.3: 快照回溯为纯只读展示模式，退出后返回当前世界，不会修改或覆盖当前人生数据。
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950 border border-slate-800 rounded p-4 font-mono text-xs text-slate-300 leading-relaxed">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(JSON.parse(inspectingSnapshot.payload_json || '{}'), null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setInspectingSnapshot(null)}
                className="px-4 py-1.5 text-sm rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                退出回溯
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
