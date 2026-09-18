import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, FolderSync, CheckCircle2, HardDrive, RefreshCw } from 'lucide-react';
import { api, isTauri, PortableStatus, PortableCandidate } from '../../api';
import { soundFx } from '../../utils/soundEffects';

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

  // 便携版状态与迁移候选
  const [status, setStatus] = useState<PortableStatus | null>(null);
  const [candidates, setCandidates] = useState<PortableCandidate[]>([]);
  const [customPath, setCustomPath] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationMsg, setMigrationMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isTauri) {
      api.portable.getPortableStatus().then(setStatus).catch(() => {});
      api.portable.scanPortableCandidates().then(setCandidates).catch(() => {});
    }
  }, []);

  const handleMigrate = async (sourceDir: string) => {
    if (!window.confirm(`确认要从旧版本目录：\n${sourceDir}\n无缝迁移数据库及 API 密钥至当前版本吗？\n当前数据将自动生成 .bak 备份。`)) {
      return;
    }
    setIsMigrating(true);
    setMigrationMsg(null);
    try {
      const res = await api.portable.migratePortableData(sourceDir);
      soundFx.playStamp();
      setMigrationMsg(res);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      alert(`迁移失败: ${err?.message || String(err)}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5 select-none">
      {/* 存储路径与便携状态信息 */}
      <div className="p-4 rounded-lg hoi4-inset-panel border border-[#3c4654] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#fbbf24] font-bold text-sm">
            <HardDrive className="w-4 h-4" />
            <span>本地存储与便携版本状态</span>
          </div>
          {status?.is_portable ? (
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-[10px] font-mono font-bold">
              ⚡ 绿色便携模式 (PORTABLE)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono">
              系统应用模式 (STANDARD)
            </span>
          )}
        </div>

        <div className="text-xs text-[#cbd5e1] space-y-1 font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-[#94a3b8]">数据物理目录:</span>
            <span className="text-[#ffffff] font-bold truncate max-w-[360px] bg-[#161a20] px-2 py-0.5 rounded border border-[#2b333e]">
              {status?.data_dir || '本地隔离存储区'}
            </span>
          </div>
          <div className="flex items-center space-x-4 pt-1">
            <div className="flex items-center space-x-1.5">
              <span className="text-[#94a3b8]">SQLite 数据库:</span>
              <span className={status?.db_exists ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {status?.db_exists ? `就绪 (${formatBytes(status.db_size_bytes)})` : '未就绪'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[#94a3b8]">本地密钥保险库:</span>
              <span className={status?.has_llm_vault ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {status?.has_llm_vault ? '永久存储就绪 (.llm_vault)' : '待配置'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 便携版无感数据迁移助手 (Portable Migration Hub) */}
      <div className="p-4 rounded-lg hoi4-window border-2 border-[#d4af37]/70 space-y-3 shadow-lg">
        <div className="flex items-center space-x-2 text-[#fbbf24] font-serif font-bold text-sm">
          <FolderSync className="w-4 h-4 text-[#fbbf24]" />
          <span>便携版无感更新与数据接力助手 (PORTABLE MIGRATION)</span>
        </div>
        <p className="text-xs text-[#e2e8f0] leading-relaxed">
          升级便携版时，解压新版本通常是一个全新的文件夹。本助手已自动为您探测邻近目录的历史版本数据，点击下方按钮即可一键将旧版本的<strong>全部人生记录、国策树、心智特质与 API 密钥</strong>无损迁移接力到当前版本！
        </p>

        {migrationMsg && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-600 rounded text-xs text-emerald-200 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{migrationMsg}</span>
          </div>
        )}

        {/* 自动探测到的旧版目录 */}
        {candidates.length > 0 ? (
          <div className="space-y-2 pt-1">
            <div className="text-[11px] font-mono text-[#94a3b8] font-bold uppercase">
              自动发现的旧版本便携数据源：
            </div>
            {candidates.map((c) => (
              <div
                key={c.full_path}
                className="p-3 bg-[#12161b] border border-[#3f4a58] rounded flex items-center justify-between hover:border-[#fbbf24] transition"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-serif font-bold text-xs text-[#ffffff] truncate">
                    📂 {c.folder_name}
                  </div>
                  <div className="text-[10px] font-mono text-[#94a3b8] truncate mt-0.5">
                    路径: {c.full_path} · 档案大小: {formatBytes(c.db_size_bytes)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isMigrating}
                  onClick={() => handleMigrate(c.full_path)}
                  className="hoi4-btn-military px-3 py-1.5 text-xs font-serif font-bold rounded shrink-0 flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isMigrating ? 'animate-spin' : ''}`} />
                  <span>一键无感迁移</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 bg-[#12161b] border border-[#2f3844] rounded text-xs text-[#94a3b8]">
            同级及上级目录未检测到其他旧版本便携包。如需手动指定旧版本目录，请在下方输入路径：
          </div>
        )}

        {/* 手动指定目录 */}
        <div className="flex items-center space-x-2 pt-1">
          <input
            type="text"
            placeholder="旧版便携文件夹路径（例如：D:\LifeFocus_old\data）"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            className="flex-1 hoi4-inset-panel px-3 py-1.5 text-xs text-[#ffffff] font-mono placeholder-[#64748b] rounded focus:outline-none focus:border-[#fbbf24]"
          />
          <button
            type="button"
            disabled={!customPath.trim() || isMigrating}
            onClick={() => handleMigrate(customPath.trim())}
            className="hoi4-btn-steel px-3 py-1.5 text-xs font-mono rounded text-[#ffffff] hover:border-[#fbbf24] disabled:opacity-40"
          >
            执行迁移
          </button>
        </div>
      </div>

      {/* 危险区：彻底删档 (Delete Save Slot) */}
      {onDeleteLife && (
        <div className="p-4 rounded-lg bg-rose-950/20 border-2 border-rose-800/80 space-y-3">
          <div className="flex items-center space-x-2 text-rose-400 font-serif font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>危险操作：彻底删除当前人生空间 (删档)</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            此操作将通过 SQLite 外键级联彻底清除当前人生空间「
            <strong className="text-amber-300 font-mono">{lifeName}</strong>
            」下的全部数据（包括所有国策树、心智特质、内阁会议记录、意识形态、随笔与历史事件）。
            <strong>该操作不可逆，数据无法恢复！</strong>{' '}
            若删除了最后一个空间，系统将自动重新创建一个崭新的默认空间。
          </p>
          <div className="pt-2 border-t border-rose-900/60 space-y-2">
            <label className="block text-xs text-slate-300 font-medium">
              请输入当前人生空间名称{' '}
              <span className="text-amber-300 font-bold font-mono">"{lifeName}"</span> 确认删档：
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={confirmDeleteInput}
                onChange={(e) => setConfirmDeleteInput(e.target.value)}
                placeholder={`输入 ${lifeName} 确认`}
                className="flex-1 hoi4-inset-panel border-rose-800/80 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono rounded"
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
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded text-xs transition shadow flex items-center justify-center space-x-1 shrink-0"
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
