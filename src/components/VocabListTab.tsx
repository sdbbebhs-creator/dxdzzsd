import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, Plus, Edit3, Trash2, Eye, Volume2, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
import { VocabItem } from '../types';
import { formatRelativeDate, getTodayDate } from '../utils/fsrs';
import { AudioPlayerButton } from './AudioPlayerButton';

interface VocabListTabProps {
  vocabList: VocabItem[];
  onOpenAddModal: () => void;
  onEditVocab: (item: VocabItem) => void;
  onDeleteVocab: (id: string) => void;
  onOpenImageLightbox: (url: string, caption?: string) => void;
  onOpenContextOutputModal?: (item: VocabItem) => void;
}

export const VocabListTab: React.FC<VocabListTabProps> = ({
  vocabList,
  onOpenAddModal,
  onEditVocab,
  onDeleteVocab,
  onOpenImageLightbox,
  onOpenContextOutputModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'learning' | 'mastered' | 'has_media'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'alpha' | 'ef' | 'newest'>('date');

  const today = getTodayDate();

  // Extract unique topics
  const topics = useMemo(() => {
    return Array.from(
      new Set(
        vocabList
          .map((v) => v.topic)
          .filter((t): t is string => Boolean(t && t.trim() !== ''))
      )
    );
  }, [vocabList]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return vocabList
      .filter((item) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchWord = item.word.toLowerCase().includes(q);
          const matchMeaning = item.meaning.toLowerCase().includes(q);
          const matchExample = (item.example || '').toLowerCase().includes(q);
          const matchTopic = (item.topic || '').toLowerCase().includes(q);
          if (!matchWord && !matchMeaning && !matchExample && !matchTopic) {
            return false;
          }
        }

        // Topic filter
        if (selectedTopic !== 'all' && item.topic !== selectedTopic) {
          return false;
        }

        // Status filter
        if (statusFilter === 'due') {
          return item.reviewDate <= today;
        }
        if (statusFilter === 'learning') {
          return (item.interval ?? 0) < 21;
        }
        if (statusFilter === 'mastered') {
          return (item.interval ?? 0) >= 21;
        }
        if (statusFilter === 'has_media') {
          return Boolean(item.imageUrl || item.audioUrl);
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return a.reviewDate.localeCompare(b.reviewDate);
        }
        if (sortBy === 'alpha') {
          return a.word.localeCompare(b.word);
        }
        if (sortBy === 'ef') {
          const diffA = a.difficulty ?? (a.easeFactor ? 10 - a.easeFactor * 2 : 5);
          const diffB = b.difficulty ?? (b.easeFactor ? 10 - b.easeFactor * 2 : 5);
          return diffB - diffA;
        }
        if (sortBy === 'newest') {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return 0;
      });
  }, [vocabList, searchQuery, selectedTopic, statusFilter, sortBy, today]);

  const scrollToResults = () => {
    const el = document.getElementById('vocab-list-results');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Controls & Search Header */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              id="input-search-vocab"
              placeholder="Tìm từ vựng, nghĩa, ví dụ..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                scrollToResults();
              }}
              className="w-full pl-10 pr-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Action button */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Plus size={15} />
              <span>Thêm từ vựng</span>
            </button>
          </div>
        </div>

        {/* Filters and sorting */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter size={13} /> Lọc:
            </span>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                scrollToResults();
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer text-xs focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="due">Cần ôn (Hôm nay / Quá hạn)</option>
              <option value="learning">Đang ghi nhớ (&lt; 21 ngày)</option>
              <option value="mastered">Đã thuộc lòng (&ge; 21 ngày)</option>
              <option value="has_media">Có hình ảnh hoặc audio</option>
            </select>

            {/* Topic filter */}
            {topics.length > 0 && (
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  scrollToResults();
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer text-xs max-w-[140px] truncate focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Mọi chủ đề ({topics.length})</option>
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <ArrowUpDown size={13} /> Xếp:
            </span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                scrollToResults();
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer text-xs focus:ring-1 focus:ring-emerald-500"
            >
              <option value="date">Lịch ôn gần nhất</option>
              <option value="alpha">Tên A → Z</option>
              <option value="ef">Độ khó FSRS (Khó nhất trước)</option>
              <option value="newest">Mới thêm gần đây</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div id="vocab-list-results" className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-slate-400 font-semibold scroll-mt-36">
        <span>Hiển thị {filteredItems.length} / {vocabList.length} từ vựng</span>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-xs">
          <p className="font-bold text-slate-700 dark:text-slate-300 text-base">
            Không tìm thấy từ vựng nào khớp với bộ lọc
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Thử thay đổi từ khóa tìm kiếm hoặc bấm nút "Thêm từ vựng" để bổ sung từ mới.
          </p>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredItems.map((item) => {
            const relDate = formatRelativeDate(item.reviewDate);

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-md transition-all p-3.5 sm:p-4 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar on Card: Image + Word + Audio */}
                  <div className="flex items-start gap-3 mb-2.5">
                    {item.imageUrl ? (
                      <div
                        onClick={() => onOpenImageLightbox(item.imageUrl!, item.word)}
                        className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0 cursor-zoom-in shadow-2xs"
                        title="Bấm để xem ảnh lớn"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.word}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : null}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          {item.word}
                        </span>
                        {item.type && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.type}
                          </span>
                        )}
                        {item.topic && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60">
                            {item.topic}
                          </span>
                        )}
                      </div>

                      {item.phonetic && (
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          {item.phonetic}
                        </p>
                      )}
                    </div>

                    {/* Audio play button */}
                    <AudioPlayerButton
                      audioUrl={item.audioUrl}
                      fallbackText={item.word}
                      size="sm"
                      iconOnly
                    />
                  </div>

                  {/* Vietnamese Meaning */}
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2 mb-2">
                    {item.meaning}
                  </p>

                  {/* Example */}
                  {item.example && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2 bg-slate-50 dark:bg-slate-800/70 p-2 sm:p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-2">
                      "{item.example}"
                    </p>
                  )}

                  {/* 5-Context Output Quick Practice Button */}
                  {onOpenContextOutputModal && (
                    <div className="mb-2.5">
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

                {/* Card Footer: Review Date Status & Edit / Delete */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        relDate.isOverdue
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                          : relDate.isToday
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {relDate.label}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      ({item.interval}d)
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditVocab(item)}
                      className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Sửa từ"
                      aria-label="Sửa từ"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteVocab(item.id)}
                      className="p-2 sm:p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Xóa từ"
                      aria-label="Xóa từ"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
