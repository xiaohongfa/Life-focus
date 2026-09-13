import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`text-xs text-slate-200 leading-relaxed font-sans select-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-serif font-bold text-amber-300 border-b border-strategy-gold/40 pb-1.5 mt-3 mb-2 flex items-center space-x-1.5">
              <span className="text-strategy-gold">■</span>
              <span>{children}</span>
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-serif font-bold text-amber-300 border-b border-slate-700/80 pb-1 mt-3 mb-2 flex items-center space-x-1">
              <span className="text-strategy-gold">▶</span>
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-serif font-bold text-amber-400/90 mt-2.5 mb-1.5 flex items-center space-x-1">
              <span className="text-strategy-gold/70">◆</span>
              <span>{children}</span>
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-bold text-slate-200 mt-2 mb-1">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-2 leading-relaxed text-slate-300">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-bold text-amber-300 bg-amber-950/40 px-1 py-0.5 rounded border border-amber-900/40">
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic text-amber-200/80">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 mb-2.5 pl-1 text-slate-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 mb-2.5 pl-1 text-slate-300">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-strategy-gold/70 bg-slate-900/60 pl-3 py-1.5 my-2 text-slate-400 italic rounded-r">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-t border-slate-800 my-3" />,
          code: ({ children, className }) => {
            const isBlock = Boolean(className);
            if (isBlock) {
              return (
                <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-amber-300 overflow-x-auto my-2">
                  <code>{children}</code>
                </pre>
              );
            }
            return (
              <code className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded font-mono text-[11px]">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-900 text-slate-300">{children}</thead>,
          th: ({ children }) => (
            <th className="p-2 border-b border-slate-700 font-bold text-strategy-gold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="p-2 border-b border-slate-800/80 text-slate-300">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
