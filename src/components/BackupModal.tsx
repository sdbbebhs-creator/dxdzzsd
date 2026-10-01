import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Upload, Sparkles, Database, Trash2, Check, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { VocabItem, GrammarItem } from '../types';
import { exportBackup } from '../utils/storage';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabList: VocabItem[];
  grammarList: GrammarItem[];
  onImportData: (vocab: VocabItem[], grammar: GrammarItem[], mode: 'merge' | 'replace') => void;
  onLoadSampleData: () => void;
  onClearAllData: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  vocabList,
  grammarList,
  onImportData,
  onLoadSampleData,
  onClearAllData,
}) => {
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Support closing with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Export File Download
  const handleExportDownload = () => {
    const jsonStr = exportBackup(vocabList, grammarList);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `on-tap-thong-minh-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setFeedbackMsg({ type: 'success', text: 'Đã xuất file sao lưu JSON thành công!' });
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    const jsonStr = exportBackup(vocabList, grammarList);
    navigator.clipboard.writeText(jsonStr);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Handle Import JSON file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.vocab && Array.isArray(parsed.vocab)) {
          onImportData(parsed.vocab, parsed.grammar || [], importMode);
          setFeedbackMsg({
            type: 'success',
            text: `Đã nạp thành công ${parsed.vocab.length} từ vựng và ${parsed.grammar?.length || 0} điểm ngữ pháp!`,
          });
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setFeedbackMsg({ type: 'error', text: 'Tệp JSON không đúng định dạng sao lưu của ứng dụng.' });
        }
      } catch {
        setFeedbackMsg({ type: 'error', text: 'Không thể đọc file JSON. Vui lòng kiểm tra lại định dạng tệp.' });
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      id="modal-backup"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden m-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] max-h-[calc(100dvh-2rem)]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 rounded-lg">
              <Database size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Sao lưu, Phục hồi & Dữ liệu mẫu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu giữ an toàn toàn bộ từ vựng, hình ảnh và audio
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-2 border-b animate-fade-in ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Section 1: Export */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Download size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Xuất dữ liệu dự phòng (JSON)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hiện có {vocabList.length} từ vựng và {grammarList.length} điểm ngữ pháp
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportDownload}
                className="flex-1 py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                Tải file .JSON về máy
              </button>
              <button
                type="button"
                onClick={handleCopyJson}
                className="py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                {copiedNotification ? '✓ Đã sao chép!' : 'Sao chép văn bản'}
              </button>
            </div>
          </div>

          {/* Section 2: Import */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Upload size={16} className="text-indigo-600 dark:text-indigo-400" />
              Khôi phục từ tệp JSON đã lưu
            </h3>

            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Hợp nhất (giữ từ hiện có)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Ghi đè toàn bộ</span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload size={14} />
              Chọn tệp sao lưu (.json) từ thiết bị
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Section 3: Sample data */}
          <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-100 dark:border-teal-900/50 space-y-2">
            <h3 className="text-sm font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
              <Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
              Bộ dữ liệu mẫu (Vocabulary & Grammar Pack)
            </h3>
            <p className="text-xs text-teal-800 dark:text-teal-300/90">
              Chứa các từ vựng học thuật cao cấp và ngữ pháp chọn lọc kèm hình ảnh minh họa chất lượng cao để trải nghiệm ngay.
            </p>
            <button
              type="button"
              onClick={() => {
                onLoadSampleData();
                onClose();
              }}
              className="py-2 px-3 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={13} />
              Nạp bộ thẻ mẫu
            </button>
          </div>

          {/* Section 4: Clear all with safe inline confirmation */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            {confirmClearOpen ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-2">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  ⚠️ Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu không? Hành động này không thể hoàn tác!
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllData();
                      setConfirmClearOpen(false);
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Xác nhận xóa sạch
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">Xóa dữ liệu để làm mới hoàn toàn</span>
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/35 border border-rose-200 dark:border-rose-900/60 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 size={13} />
                  Xóa tất cả
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
