import React, { useState, useEffect } from 'react';
import type { Essay } from '../api/types';
import type { StrategyContext } from '../services/llmService';
import { api } from '../api/client';
import { MarkdownEditor } from './MarkdownEditor';
import { refineText } from '../services/llmService';
import { BookOpen, Sparkles, Trash2, X, Save, AlertCircle, Loader2 } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface EssayModalProps {
  isOpen: boolean;
  onClose: () => void;
  lifeId: string;
  initialEssay?: Essay | null;
  onSaved: (essay: Essay) => void;
  onDeleted?: (id: string) => void;
  context?: StrategyContext;
}

export const EssayModal: React.FC<EssayModalProps> = ({
  isOpen,
  onClose,
  lifeId,
  initialEssay,
  onSaved,
  onDeleted,
  context,
}) => {
  const [title, setTitle] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [userGuidance, setUserGuidance] = useState('');
  const [showAiInput, setShowAiInput] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialEssay) {
        setTitle(initialEssay.title);
        setBodyMd(initialEssay.body_md);
      } else {
        setTitle('');
        setBodyMd('');
      }
      setUserGuidance('');
      setShowAiInput(false);
      setError(null);
    }
  }, [isOpen, initialEssay]);

  if (!isOpen) return null;

  const handleAiPolish = async () => {
    if (!bodyMd.trim() && !title.trim() && !userGuidance.trim()) {
      setError('请先在标题或随笔内容中录入初步构想，以便 AI 参谋进行提炼润色');
      return;
    }
    soundFx.playClick();
    setError(null);
    setIsPolishing(true);
    try {
      const polished = await refineText(
        bodyMd || title,
        'essay',
        '战略史书',
        context || {},
        userGuidance.trim() || title
      );
      setBodyMd(polished);
      setShowAiInput(false);
      soundFx.playFocusStart();
    } catch (err: any) {
      setError(`AI 润色失败: ${err.message || String(err)}`);
      soundFx.playAlert();
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入随笔标题');
      return;
    }
    soundFx.playStamp();
    setError(null);
    setIsSaving(true);
    try {
      let saved: Essay;
      if (initialEssay?.id) {
        saved = await api.updateEssay(lifeId, initialEssay.id, title.trim(), bodyMd.trim());
      } else {
        saved = await api.createEssay(lifeId, title.trim(), bodyMd.trim());
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(`保存随笔失败: ${err.message || String(err)}`);
      soundFx.playAlert();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEssay?.id) return;
    if (!window.confirm(`确定要永久删除随笔「${initialEssay.title}」吗？此操作无法撤销。`)) {
      return;
    }
    soundFx.playVoid();
    setError(null);
    setIsDeleting(true);
    try {
      await api.deleteEssay(lifeId, initialEssay.id);
      if (onDeleted) onDeleted(initialEssay.id);
      onClose();
    } catch (err: any) {
      setError(`删除随笔失败: ${err.message || String(err)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="hoi4-window rounded-lg border-2 border-[#434e5c] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="hoi4-header-bar px-6 py-3.5 flex items-center justify-between border-b border-[#3b4452]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded bg-[#171c22] border border-[#444f5e] text-[#fbbf24]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-base text-[#ffffff] flex items-center space-x-2">
                <span>{initialEssay ? '编辑战役战略随笔' : '撰写新战略随笔'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded hoi4-pill-badge text-[#fbbf24]">
                  Markdown · 档案纪要
                </span>
              </h3>
              <p className="text-xs text-[#94a3b8]">
                记录远期战略推演、深度复盘思考与宏观心智洞见，自动汇入统一历史档案流。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="hoi4-close-btn rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#14181e]">
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-700 rounded text-xs text-red-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Title input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#ffffff]">
              随笔标题 <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入随笔标题，例如：论第二曲线攻坚之胜负手与精力防线..."
              className="w-full px-3.5 py-2 hoi4-inset-panel rounded text-sm text-[#ffffff] placeholder-[#64748b] focus:outline-none focus:border-[#fbbf24] font-serif font-semibold"
            />
          </div>

          {/* AI Polish Toolbar */}
          <div className="hoi4-inset-panel rounded p-3 space-y-2 border border-[#323b47]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-[#94a3b8]">
                <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                <span className="font-bold text-[#ffffff]">AI 最高参谋部随笔润色支持</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAiInput(!showAiInput)}
                  className="text-xs text-[#94a3b8] hover:text-[#fbbf24] transition"
                >
                  {showAiInput ? '收起定制需求' : '添加定制意向...'}
                </button>
                <button
                  type="button"
                  onClick={handleAiPolish}
                  disabled={isPolishing}
                  className="hoi4-btn-steel px-3 py-1.5 rounded text-xs font-serif font-bold text-[#fbbf24] flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {isPolishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>参谋部推演中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>一键润色随笔</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {showAiInput && (
              <div className="pt-2 border-t border-[#2d3642]">
                <input
                  type="text"
                  value={userGuidance}
                  onChange={(e) => setUserGuidance(e.target.value)}
                  placeholder="可输入统帅指示，如：以《资治通鉴》笔触强调不可无节制透支身心，突出长期主义复利..."
                  className="w-full px-3 py-1.5 hoi4-inset-panel rounded text-xs text-[#ffffff] placeholder-[#64748b] focus:outline-none focus:border-[#fbbf24]"
                />
              </div>
            )}
          </div>

          {/* Markdown Content Editor */}
          <div className="space-y-1.5 flex-1">
            <label className="block text-xs font-bold text-[#ffffff]">
              随笔正文 (Markdown 格式)
            </label>
            <MarkdownEditor
              value={bodyMd}
              onChange={setBodyMd}
              rows={14}
              minHeight="260px"
              placeholder="在此记录您的战略反思、心智洞察、决策复盘或灵感火花（支持 Markdown 标题、列表、粗体、数学公式与引用）..."
              defaultMode={initialEssay ? 'preview' : 'edit'}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-[#121519] border-t border-[#2d3642] flex items-center justify-between">
          <div>
            {initialEssay && onDeleted && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800 rounded text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? '正在删除...' : '删除随笔'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="hoi4-btn-steel px-4 py-1.5 rounded text-xs transition text-[#e2e8f0]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="hoi4-btn-military px-6 py-1.5 rounded text-xs font-serif font-bold flex items-center space-x-1.5 transition shadow disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>保存战略随笔</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
