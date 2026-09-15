import React, { useState } from 'react';
import { Download, FileCode, FileText, Check, Copy } from 'lucide-react';
import { api } from '../../api/client';
import { useToast } from '../../components/ToastProvider';

interface ExportSettingsTabProps {
  lifeId: string;
  lifeName: string;
}

export const ExportSettingsTab: React.FC<ExportSettingsTabProps> = ({ lifeId, lifeName }) => {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = async () => {
    setExporting(true);
    try {
      const md = await api.exportLifeMarkdown(lifeId);
      downloadFile(
        `${lifeName}_战略档案_${new Date().toISOString().slice(0, 10)}.md`,
        md,
        'text/markdown'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`导出 Markdown 失败: ${message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = async () => {
    setExporting(true);
    try {
      const json = await api.exportLifeJson(lifeId);
      downloadFile(
        `${lifeName}_结构化数据包_${new Date().toISOString().slice(0, 10)}.json`,
        json,
        'application/json'
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`导出 JSON 失败: ${message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      const md = await api.exportLifeMarkdown(lifeId);
      await navigator.clipboard.writeText(md);
      setCopySuccess('md');
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`复制 Markdown 失败: ${message}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-slate-400 leading-relaxed">
        §16: 提供面向人类可读的 **Markdown 战略档案** 与机器可解析的 **版本化 JSON 数据包**。导出严格限定于当前人生空间「{lifeName}」，不包含任何敏感密钥。
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Markdown Export Card */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-strategy-gold font-serif font-bold text-sm">
              <FileText className="w-4 h-4" />
              <span>Markdown 战略纪实档案</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              将领袖自述、当前局势、哲学底座、特质谱系、进行中国策及待执行决议一键排版为清晰的 Markdown 文档。
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportMarkdown}
              className="flex-1 py-2 px-3 bg-strategy-gold hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .md 档案</span>
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs border border-slate-700 transition"
              title="复制 Markdown 正文到剪贴板"
            >
              {copySuccess === 'md' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* JSON Export Card */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sky-400 font-serif font-bold text-sm">
              <FileCode className="w-4 h-4" />
              <span>JSON 完整结构化数据</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              包含 Schema 版本清单、所有领域对象及子国策阶段任务完整 ID 与关系，供异地冷备或二次开发分析。
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportJson}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-600/50 font-bold rounded-lg text-xs transition shadow flex items-center justify-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 .json 数据包</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
