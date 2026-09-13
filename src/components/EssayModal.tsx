import React, { useState, useEffect } from 'react';
import type { Essay } from '../api/types';
import type { StrategyContext } from '../services/llmService';
import { api } from '../api/client';
import { MarkdownEditor } from './MarkdownEditor';
import { refineText } from '../services/llmService';
import { BookOpen, Sparkles, Trash2, X, Save, AlertCircle, Loader2 } from 'lucide-react';

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
    } catch (err: any) {
      setError(`AI 润色失败: ${err.message || String(err)}`);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入随笔标题');
      return;
    }
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialEssay?.id) return;
    if (!window.confirm(`确定要永久删除随笔「${initialEssay.title}」吗？此操作无法撤销。`)) {
      return;
    }
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/80 text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-slate-100 flex items-center space-x-2">
                <span>{initialEssay ? '编辑战略随笔' : '撰写新战略随笔'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/80">
                  Markdown · §9.3
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                记录远期战略推演、深度复盘思考与宏观心智洞见，自动汇入统一历史档案流。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Title input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              随笔标题 <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入随笔标题，例如：论第二曲线攻坚之胜负手与精力防线..."
              className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-strategy-gold focus:ring-1 focus:ring-strategy-gold transition"
            />
          </div>

          {/* AI Polish Toolbar */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <Sparkles className="w-4 h-4 text-strategy-gold" />
                <span className="font-semibold text-slate-300">AI 最高参谋部随笔润色支持</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAiInput(!showAiInput)}
                  className="text-xs text-slate-400 hover:text-strategy-gold transition"
                >
                  {showAiInput ? '收起定制需求' : '添加定制意向...'}
                </button>
                <button
                  type="button"
                  onClick={handleAiPolish}
                  disabled={isPolishing}
                  className="px-3 py-1.5 bg-strategy-gold hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-lg text-xs flex items-center space-x-1.5 transition shadow-sm"
                >
                  {isPolishing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>参谋部推演润色中...</span>
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
              <div className="pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  value={userGuidance}
                  onChange={(e) => setUserGuidance(e.target.value)}
                  placeholder="可输入统帅指示，如：以《资治通鉴》笔触强调不可无节制透支身心，突出长期主义复利..."
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-strategy-gold"
                />
              </div>
            )}
          </div>

          {/* Markdown Content Editor */}
          <div className="space-y-1.5 flex-1">
            <label className="block text-xs font-semibold text-slate-300">
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
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div>
            {initialEssay && onDeleted && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? '正在删除...' : '删除随笔'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !title.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-md shadow-emerald-950"
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
