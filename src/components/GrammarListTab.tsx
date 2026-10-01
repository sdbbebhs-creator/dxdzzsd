import React, { useState, useMemo } from 'react';
import { Search, Plus, Edit3, Trash2, BookOpen, Volume2, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
import { GrammarItem } from '../types';
import { formatRelativeDate } from '../utils/fsrs';
import { AudioPlayerButton } from './AudioPlayerButton';

interface GrammarListTabProps {
  grammarList: GrammarItem[];
  onOpenAddModal: () => void;
  onEditGrammar: (item: GrammarItem) => void;
  onDeleteGrammar: (id: string) => void;
  onOpenImageLightbox: (url: string, caption?: string) => void;
  onOpenContextOutputModal?: (item: GrammarItem) => void;
}

export const GrammarListTab: React.FC<GrammarListTabProps> = ({
  grammarList,
  onOpenAddModal,
  onEditGrammar,
  onDeleteGrammar,
  onOpenImageLightbox,
  onOpenContextOutputModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const types = useMemo(() => {
    return Array.from(
      new Set(
        grammarList
          .map((g) => g.type)
          .filter((t): t is string => Boolean(t && t.trim() !== ''))
      )
    );
  }, [grammarList]);

  const filteredItems = useMemo(() => {
    return grammarList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchFormula = item.formula.toLowerCase().includes(q);
        const matchExp = item.explanation.toLowerCase().includes(q);
        const matchEx = (item.example || '').toLowerCase().includes(q);
        if (!matchTitle && !matchFormula && !matchExp && !matchEx) return false;
      }

      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [grammarList, searchQuery, selectedType]);

  const scrollToResults = () => {
    const el = document.getElementById('grammar-list-results');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Search & Header */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              id="input-search-grammar"
              placeholder="Tìm điểm ngữ pháp, công thức..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                scrollToResults();
              }}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {types.length > 0 && (
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                scrollToResults();
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả phân loại ({types.length})</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer justify-center min-h-[40px]"
        >
          <Plus size={15} />
          <span>Thêm ngữ pháp</span>
        </button>
      </div>

      {/* Grammar Cards List */}
      <div id="grammar-list-results" className="scroll-mt-36">
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
          <p className="font-bold text-slate-700 dark:text-slate-300 text-base">
            Không tìm thấy điểm ngữ pháp nào
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Bấm "Thêm ngữ pháp" để tạo cấu trúc câu hoặc thì mới cần ôn tập.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {filteredItems.map((item) => {
            const relDate = formatRelativeDate(item.reviewDate);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          {item.title}
                        </h3>
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60">
                          {item.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Audio Button */}
                      <AudioPlayerButton
                        audioUrl={item.audioUrl}
                        fallbackText={item.example || item.title}
                        size="sm"
                        iconOnly
                      />
                      <button
                        type="button"
                        onClick={() => onEditGrammar(item)}
                        className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Sửa"
                        aria-label="Sửa ngữ pháp"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteGrammar(item.id)}
                        className="p-2 sm:p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Xóa"
                        aria-label="Xóa ngữ pháp"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Formula box */}
                  <div className="p-2.5 sm:p-3 bg-slate-900 dark:bg-slate-950 text-emerald-400 dark:text-emerald-300 font-mono text-xs sm:text-sm rounded-xl shadow-inner overflow-x-auto border border-slate-800">
                    {item.formula}
                  </div>

                  {/* Explanation */}
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {item.explanation}
                  </p>

                  {/* Example */}
                  {item.example && (
                    <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-100 dark:border-slate-800 text-xs sm:text-sm">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Ví dụ: </span>
                      <span className="text-slate-700 dark:text-slate-300 italic font-medium">"{item.example}"</span>
                      {item.exampleVi && (
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                          → {item.exampleVi}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Diagram / Image if exists */}
                  {item.imageUrl && (
                    <div
                      onClick={() => onOpenImageLightbox(item.imageUrl!, item.title)}
                      className="h-28 sm:h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 cursor-zoom-in group relative"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}

                  {/* 5-Context Output Quick Practice Button */}
                  {onOpenContextOutputModal && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenContextOutputModal(item)}
                        className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-between transition-all cursor-pointer ${
                          (item.completedContextsCount ?? 0) >= 5
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {(item.completedContextsCount ?? 0) >= 5 ? (
                            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Zap size={13} className="text-amber-500 fill-amber-500" />
                          )}
                          <span>Output: {item.completedContextsCount ?? 0}/5 ngữ cảnh</span>
                        </span>
                        <span className="text-[10px] uppercase font-bold opacity-80">
                          {(item.completedContextsCount ?? 0) >= 5 ? 'Xem lại' : 'Luyện ngay'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer Review Status */}
                <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        relDate.isOverdue
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                          : relDate.isToday
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {relDate.label}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      ({item.reviewDate})
                    </span>
                  </div>
                  <span className="font-medium text-slate-400 dark:text-slate-500">Khoảng cách: {item.interval} ngày</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};
