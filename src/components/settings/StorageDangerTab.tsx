import React, { useState } from 'react';
import { Shield, AlertTriangle, Trash2 } from 'lucide-react';

interface StorageDangerTabProps {
  lifeId: string;
  lifeName: string;
  onDeleteLife?: (lifeId: string) => void;
  onClose: () => void;
}

export const StorageDangerTab: React.FC<StorageDangerTabProps> = ({
  lifeId,
  lifeName,
  onDeleteLife,
  onClose,
}) => {
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [isDeletingLife, setIsDeletingLife] = useState(false);

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div className="flex items-center space-x-2 text-strategy-gold font-bold text-sm">
          <Shield className="w-4 h-4" />
          <span>本地优先架构 (Local-First Architecture)</span>
        </div>
        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            • **数据存储物理路径**：本应用所有战略数据统一持久化于本机 SQLite
            数据库中。普通模式位于操作系统用户本地目录，便携模式位于同级 data 目录。
          </p>
          <p>
            • **网络通信说明**：未启用第三方 AI 服务时，不会发生外部 AI 云端请求；启用云端 AI
            后，相关上下文将发送给所选服务商。
          </p>
          <p>
            • **版本迁移保障**：内置 SQLite 迁移引擎，新增表或字段通过自动化迁移脚本有序演进。
          </p>
        </div>
      </div>

      {/* 危险区：彻底删档 (Delete Save Slot) */}
      {onDeleteLife && (
        <div className="p-4 rounded-xl bg-rose-950/30 border-2 border-rose-800/80 space-y-3">
          <div className="flex items-center space-x-2 text-rose-400 font-serif font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>危险操作：彻底删除当前人生空间 (删档)</span>
          </div>
          <p className="text-xs text-rose-200/80 leading-relaxed">
            此操作将通过 SQLite 外键级联彻底清除当前人生空间「
            <strong className="text-amber-300 font-mono">{lifeName}</strong>
            」下的全部数据（包括所有国策树、心智特质、内阁会议记录、意识形态、随笔与历史事件）。
            <strong>该操作不可逆，数据无法恢复！</strong>{' '}
            若删除了最后一个空间，系统将自动重新创建一个崭新的默认空间。
          </p>
          <div className="pt-2 border-t border-rose-900/60 space-y-2">
            <label className="block text-xs text-slate-300 font-medium">
              请输入当前人生空间名称{' '}
              <span className="text-strategy-gold font-bold font-mono">"{lifeName}"</span> 确认删档：
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                placeholder={`输入 ${lifeName} 确认`}
                className="flex-1 bg-slate-900 border border-rose-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
              />
              <button
                type="button"
                disabled={confirmDeleteInput.trim() !== lifeName || isDeletingLife}
                onClick={async () => {
                  if (
                    !window.confirm(
                      `二次确认：真的要彻底清除「${lifeName}」的所有档案数据吗？`
                    )
                  )
                    return;
                  setIsDeletingLife(true);
                  try {
                    await onDeleteLife(lifeId);
                    setConfirmDeleteInput('');
                    onClose();
                  } finally {
                    setIsDeletingLife(false);
                  }
                }}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-1 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingLife ? '正在删除...' : '彻底删档 (不可撤销)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
