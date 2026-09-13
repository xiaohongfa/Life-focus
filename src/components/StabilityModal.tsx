import React, { useState, useEffect } from 'react';
import type { Stability, StabilityChange } from '../api/types';
import { api } from '../api/client';
import { Activity, History, ArrowRight, X } from 'lucide-react';

interface StabilityModalProps {
  lifeId: string;
  stability: Stability | null;
  onClose: () => void;
  onUpdated: (newStab: Stability) => void;
}

export const StabilityModal: React.FC<StabilityModalProps> = ({ lifeId, stability, onClose, onUpdated }) => {
  const [mode, setMode] = useState<'direct' | 'delta'>('direct');
  const [directVal, setDirectVal] = useState<string>(
    stability?.current_value !== null && stability?.current_value !== undefined
      ? stability.current_value.toString()
      : '50'
  );
  const [deltaVal, setDeltaVal] = useState<string>('5');
  const [reason, setReason] = useState<string>('');
  const [history, setHistory] = useState<StabilityChange[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [lifeId]);

  const loadHistory = async () => {
    try {
      const data = await api.getStabilityHistory(lifeId, 20);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load stability history', err);
    }
  };

  // 算术辅助计算预览 (§6.5: 纯预览辅助，确认前不写入)
  const currentVal = stability?.current_value;
  const calculatedTarget: number =
    mode === 'direct'
      ? parseFloat(directVal) || 0
      : (currentVal ?? 0) + (parseFloat(deltaVal) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(calculatedTarget)) return;

    setLoading(true);
    try {
      const change = await api.setStability(lifeId, calculatedTarget, reason.trim() || undefined);
      onUpdated({
        life_id: lifeId,
        current_value: change.after_value,
        updated_at: change.occurred_at,
      });
      setReason('');
      await loadHistory();
    } catch (err) {
      console.error('Failed to update stability', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-lg text-slate-100">稳定度设定与历史记录</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Input & Preview */}
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded">
              <span className="text-xs text-slate-400">当前世界稳定度</span>
              <div className="text-2xl font-bold text-amber-300 mt-1">
                {currentVal !== null && currentVal !== undefined ? `${currentVal}%` : '未设定 (等待初次设定)'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                稳定度由你主观维护，不强制限于 0-100，支持任意真实值（如 135% 或 -20%）。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mode switch */}
              <div className="flex space-x-2 bg-slate-800 p-1 rounded">
                <button
                  type="button"
                  onClick={() => setMode('direct')}
                  className={`flex-1 py-1 text-xs rounded transition ${
                    mode === 'direct' ? 'bg-amber-600 text-black font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  直接设定新数值
                </button>
                <button
                  type="button"
                  disabled={currentVal === null}
                  onClick={() => setMode('delta')}
                  className={`flex-1 py-1 text-xs rounded transition ${
                    mode === 'delta' ? 'bg-amber-600 text-black font-semibold' : 'text-slate-400 hover:text-slate-200'
                  } disabled:opacity-40`}
                >
                  手动输入增减量
                </button>
              </div>

              {mode === 'direct' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">目标稳定度数值 (%)</label>
                  <input
                    type="number"
                    step="any"
                    value={directVal}
                    onChange={(e) => setDirectVal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">变化量增减 (+ / -)</label>
                  <input
                    type="number"
                    step="any"
                    value={deltaVal}
                    onChange={(e) => setDeltaVal(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Preview */}
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded flex items-center justify-between text-xs">
                <span className="text-slate-400">调整结果预览:</span>
                <div className="flex items-center space-x-2 font-mono font-semibold">
                  <span className="text-slate-300">{currentVal !== null ? `${currentVal}%` : '未设定'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 text-sm font-bold">{calculatedTarget}%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">调整原因（可选）</label>
                <input
                  type="text"
                  placeholder="例如：攻克难关、受到现实阻碍..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading || isNaN(calculatedTarget)}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded text-sm transition disabled:opacity-50"
              >
                {loading ? '记录中...' : '确认并记入历史'}
              </button>
            </form>
          </div>

          {/* Right: History */}
          <div className="flex flex-col border-l border-slate-800 pl-6">
            <div className="flex items-center space-x-2 text-sm font-medium text-slate-300 mb-3">
              <History className="w-4 h-4 text-slate-400" />
              <span>变更历史曲线/轨迹</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[340px]">
              {history.length === 0 ? (
                <div className="text-xs text-slate-500 italic py-4">暂无历史记录</div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="p-2.5 bg-slate-800/40 border border-slate-800 rounded text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-300">
                        {item.after_value}%
                        {item.delta !== null && (
                          <span
                            className={`ml-1.5 font-normal ${
                              item.delta > 0 ? 'text-emerald-400' : item.delta < 0 ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          >
                            ({item.delta > 0 ? `+${item.delta}` : item.delta}%)
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.occurred_at.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    {item.reason && <p className="text-slate-300 text-[11px]">{item.reason}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
