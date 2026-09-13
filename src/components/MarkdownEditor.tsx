import React, { useState } from 'react';
import { Eye, Edit3, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  defaultMode?: 'preview' | 'edit';
  readOnly?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  rows = 8,
  placeholder = '在此输入 Markdown 文本...',
  minHeight = '180px',
  className = '',
  defaultMode = 'preview',
  readOnly = false,
}) => {
  const [mode, setMode] = useState<'preview' | 'edit'>(defaultMode);

  return (
    <div className={`border border-slate-700/80 rounded-xl overflow-hidden bg-slate-950/80 flex flex-col ${className}`}>
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
              mode === 'preview'
                ? 'bg-strategy-gold/20 text-strategy-gold border border-strategy-gold/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>渲染预览</span>
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                mode === 'edit'
                  ? 'bg-strategy-gold/20 text-strategy-gold border border-strategy-gold/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>编辑源码</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-slate-500">
          <span>{value.length} 字符</span>
          <span>·</span>
          <span className="flex items-center space-x-0.5 text-amber-400/80">
            <Sparkles className="w-3 h-3" />
            <span>支持 GFM 语法</span>
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3.5 flex-1 overflow-y-auto" style={{ minHeight }}>
        {mode === 'preview' ? (
          value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <div className="text-slate-500 italic text-xs py-4 text-center">
              暂无内容，点击上方「编辑源码」开始撰写...
            </div>
          )
        ) : (
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full bg-transparent text-xs text-slate-100 font-mono focus:outline-none leading-relaxed resize-none selection:bg-amber-600/40"
          />
        )}
      </div>
    </div>
  );
};
