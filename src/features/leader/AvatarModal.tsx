import React, { useState } from 'react';
import { Camera, X, Upload } from 'lucide-react';
import { PRESET_AVATARS } from './avatars';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaderAvatar?: string;
  leaderName: string;
  renderLeaderAvatar: (avatar?: string, name?: string) => React.ReactNode;
  onSaveAvatar: (avatar?: string) => void;
  onUploadAvatarFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AvatarModal: React.FC<AvatarModalProps> = ({
  isOpen,
  onClose,
  leaderAvatar,
  leaderName,
  renderLeaderAvatar,
  onSaveAvatar,
  onUploadAvatarFile,
}) => {
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 border-2 border-strategy-gold/70 rounded-xl shadow-[0_0_50px_rgba(217,119,6,0.3)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-strategy-gold" />
            <h3 className="text-base font-serif font-bold text-slate-100">自定义最高统帅头像</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Avatar Preview */}
        <div className="flex items-center space-x-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="w-16 h-16 rounded-lg bg-slate-800 border-2 border-strategy-gold flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {renderLeaderAvatar(leaderAvatar, leaderName)}
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            <div className="font-bold text-strategy-gold">{leaderName || '最高统帅'}</div>
            <div className="text-slate-400">
              {leaderAvatar
                ? leaderAvatar.startsWith('preset:')
                  ? '使用战略军工预设肖像'
                  : '已配置自定义头像图像'
                : '当前使用首字徽标'}
            </div>
          </div>
        </div>

        {/* Presets Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">① 战略军工预设肖像库</label>
          <div className="grid grid-cols-3 gap-2.5">
            {PRESET_AVATARS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSaveAvatar(preset.id)}
                className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1.5 ${
                  leaderAvatar === preset.id
                    ? 'bg-amber-950/70 border-strategy-gold shadow-[0_0_12px_rgba(217,119,6,0.3)]'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded bg-gradient-to-br ${preset.bg} ${preset.color} flex items-center justify-center shadow`}
                >
                  {preset.svg}
                </div>
                <span className="text-[11px] text-slate-300 font-medium">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Local Upload */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <label className="block text-xs font-bold text-slate-300">
            ② 上传本地图片文件 (支持 JPG / PNG / SVG)
          </label>
          <label className="w-full py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 transition flex items-center justify-center space-x-2 cursor-pointer">
            <Upload className="w-4 h-4 text-strategy-gold" />
            <span>选择本地文件并转换为头像</span>
            <input
              type="file"
              accept="image/*"
              onChange={onUploadAvatarFile}
              className="hidden"
            />
          </label>
        </div>

        {/* Image URL Input */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <label className="block text-xs font-bold text-slate-300">③ 网络图片直链 URL</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={customAvatarUrl}
              onChange={(e) => setCustomAvatarUrl(e.target.value)}
              placeholder="https://example.com/commander.png"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-strategy-gold font-mono"
            />
            <button
              type="button"
              disabled={!customAvatarUrl.trim()}
              onClick={() => onSaveAvatar(customAvatarUrl.trim())}
              className="px-3 py-1.5 bg-strategy-gold hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg text-xs transition"
            >
              应用直链
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => onSaveAvatar(undefined)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            重置为默认文字头像
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
