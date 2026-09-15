import React, { useState } from 'react';
import { Sparkles, X, Check, RotateCcw } from 'lucide-react';
import { MarkdownEditor } from './MarkdownEditor';

export interface AIProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  originalText: string;
  proposedText: string;
  onAccept: (finalText: string) => Promise<void>;
  onRetry?: () => void;
}

export const AIProposalModal: React.FC<AIProposalModalProps> = ({
  isOpen,
  onClose,
  title,
  originalText,
  proposedText,
  onAccept,
  onRetry,
}) => {
  const [editedText, setEditedText] = useState(proposedText);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update state when proposedText changes
  React.useEffect(() => {
    setEditedText(proposedText);
  }, [proposedText]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onAccept(editedText);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to accept proposal', err);
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-strategy-gold/70 rounded-xl shadow-[0_0_40px_rgba(217,119,6,0.3)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-strategy-gold/15 border border-strategy-gold/40 rounded-lg text-strategy-gold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-slate-100">{title} (Proposal 预览)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                §12.1: 建议仅留存临时内存。你可自由修改下方内容，只有点击“确认采纳”后才正式落库覆盖。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Comparison View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {saveError && (
            <div role="alert" className="rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              保存失败：{saveError}
            </div>
          )}
          {originalText.trim() && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                原文本参考（供对比）
              </label>
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                {originalText}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-strategy-gold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI 建议文本（可在此直接编辑润色后落库）</span>
              </label>
              <span className="text-[11px] text-slate-400">支持 Markdown 语法</span>
            </div>
            <MarkdownEditor
              value={editedText}
              onChange={(val) => setEditedText(val)}
              defaultMode="preview"
              minHeight="260px"
              rows={12}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/90">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重新设定需求推演</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
            >
              放弃建议
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || !editedText.trim()}
              className="px-5 py-1.5 bg-gradient-to-r from-amber-600 to-strategy-gold hover:brightness-110 text-slate-950 font-bold rounded-lg text-xs transition shadow flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? '正在落库保存...' : '确认采纳并替换正文'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
