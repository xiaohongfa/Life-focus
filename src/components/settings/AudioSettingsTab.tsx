import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Sliders, Music } from 'lucide-react';
import { soundFx } from '../../utils/soundEffects';

export const AudioSettingsTab: React.FC = () => {
  const [enabled, setEnabled] = useState(() => soundFx.isEnabled());
  const [volume, setVolume] = useState(() => Math.round(soundFx.getVolume() * 100));

  const handleToggle = () => {
    const next = soundFx.toggle();
    setEnabled(next);
  };

  const handleVolumeChange = (newVal: number) => {
    setVolume(newVal);
    soundFx.setVolume(newVal / 100);
    soundFx.playClick();
  };

  const soundTests = [
    { label: '机械按键点击', fn: () => soundFx.playClick() },
    { label: '国策节点聚焦', fn: () => soundFx.playFocusSelect() },
    { label: '国策推进启动', fn: () => soundFx.playFocusStart() },
    { label: '国策达成凯旋音', fn: () => soundFx.playFocusComplete() },
    { label: '绝密电报/报纸', fn: () => soundFx.playEventPopup() },
    { label: '内阁参谋任命', fn: () => soundFx.playCabinetAssign() },
    { label: '战略警报', fn: () => soundFx.playAlert() },
    { label: '火漆印章盖印', fn: () => soundFx.playStamp() },
    { label: '特质勋章佩戴', fn: () => soundFx.playMedalEquip() },
  ];

  return (
    <div className="space-y-5 select-none">
      {/* 声音状态总览 */}
      <div className="p-4 rounded-lg hoi4-inset-panel border border-[#3c4654] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#fbbf24] font-bold text-sm">
            <Music className="w-4 h-4" />
            <span>战役声学引擎设定 (AUDIO ENGINE)</span>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-mono font-bold transition ${
              enabled
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                : 'bg-rose-950 border border-rose-600 text-rose-300'
            }`}
          >
            {enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{enabled ? '音效已启用 (ON)' : '全系统静音 (OFF)'}</span>
          </button>
        </div>

        {/* 主音量调节 */}
        <div className="space-y-2 pt-2 border-t border-[#252c36]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#ffffff] flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>主音量 (MASTER VOLUME)</span>
            </span>
            <span className="font-mono font-bold text-[#fbbf24] text-sm">{volume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer h-2 bg-[#1c222b] rounded-lg"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#94a3b8]">
            <span>静音 (0%)</span>
            <span>适中 (50%)</span>
            <button
              type="button"
              onClick={() => handleVolumeChange(100)}
              className="text-[#fbbf24] font-bold hover:underline"
            >
              拉满高响度 (100%)
            </button>
          </div>
        </div>

        <p className="text-[11px] text-[#cbd5e1] leading-relaxed">
          💡 本引擎采用 Web Audio 原生多段动态压缩器 (DynamicsCompressorNode)
          合成重工业战役音效，100% 离线运行，声音雄浑饱满且高分贝下绝不爆音。
        </p>
      </div>

      {/* 音效试听测试区 */}
      <div className="p-4 rounded-lg hoi4-window border border-[#3f4a58] space-y-3">
        <div className="text-xs font-serif font-bold text-[#ffffff] flex items-center space-x-1.5">
          <Play className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span>战役音效试听测试 (SOUND AUDITION)</span>
        </div>
        <p className="text-xs text-[#94a3b8]">
          点击下方按钮即时检验音效响应与音量效果：
        </p>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {soundTests.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                t.fn();
              }}
              className="hoi4-btn-steel px-3 py-2 rounded text-xs font-serif flex items-center justify-center space-x-1.5 transition text-[#ffffff] hover:border-[#fbbf24]"
            >
              <Play className="w-3 h-3 text-[#fbbf24]" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
