import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Volume2, Edit3, Trash2, Eye, EyeOff, Sparkles, Layers, Flame, Brain, ShieldAlert, ShieldCheck, Shield, Zap, Lock, Unlock, Award, Gamepad2 } from 'lucide-react';
import { VocabItem, GrammarItem, ReviewRating, UserRankData } from '../types';
import {
  getTodayDate,
  addDays,
  formatRelativeDate,
  previewNextFSRSIntervals,
  getFSRSStateInfo,
  calculateOverdueIndex,
  scheduleCardsPriorityQueue,
} from '../utils/fsrs';
import { AudioPlayerButton } from './AudioPlayerButton';
import { useFSRSSettings } from '../hooks/useFSRSSettings';

interface DailyReviewTabProps {
  vocabList: VocabItem[];
  grammarList: GrammarItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onRateVocab: (id: string, rating: ReviewRating) => void;
  onRateGrammar: (id: string, rating: ReviewRating) => void;
  onMarkAllReviewed: (type: 'vocab' | 'grammar') => void;
  onEditVocab: (item: VocabItem) => void;
  onEditGrammar: (item: GrammarItem) => void;
  onDeleteVocab: (id: string) => void;
  onDeleteGrammar: (id: string) => void;
  onOpenImageLightbox: (url: string, caption?: string) => void;
  onSwitchToFlashcard: () => void;
  onSwitchToGames?: () => void;
  onOpenContextOutputModal: (item: VocabItem | GrammarItem) => void;
  rankData?: UserRankData;
  onOpenRankModal?: () => void;
}

export const DailyReviewTab: React.FC<DailyReviewTabProps> = ({
  vocabList,
  grammarList,
  selectedDate,
  onSelectDate,
  onRateVocab,
  onRateGrammar,
  onMarkAllReviewed,
  onEditVocab,
  onEditGrammar,
  onDeleteVocab,
  onDeleteGrammar,
  onOpenImageLightbox,
  onSwitchToFlashcard,
  onSwitchToGames,
  onOpenContextOutputModal,
  rankData,
  onOpenRankModal,
}) => {
  // Cài đặt FSRS dùng chung: đổi cài đặt -> tính lại khoảng cách 4 nút ngay
  const fsrsSettings = useFSRSSettings();
  // Toggle reveal meaning per card (if user wants to test themselves before rating)
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAttemptRateVocab = (item: VocabItem, rating: ReviewRating) => {
    onRateVocab(item.id, rating);
  };

  const handleAttemptRateGrammar = (item: GrammarItem, rating: ReviewRating) => {
    onRateGrammar(item.id, rating);
  };

  const scrollToCards = () => {
    const el = document.getElementById('daily-review-cards-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter and prioritize cards using FSRS Priority Queue
  const dueVocab = scheduleCardsPriorityQueue(vocabList, { todayDate: selectedDate, filterDueTodayOnly: true });
  const dueGrammar = scheduleCardsPriorityQueue(grammarList, { todayDate: selectedDate, filterDueTodayOnly: true });

  const relativeInfo = formatRelativeDate(selectedDate);

  const scrollToVocab = () => {
    const el = document.getElementById('section-vocab-due');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToGrammar = () => {
    const el = document.getElementById('section-grammar-due');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Daily Review Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-800 shadow-sm">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(36rem 14rem at 100% 0%, rgba(16,185,129,0.10), transparent 70%)' }}
        />
        <div className="relative p-5 sm:p-7 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Lịch ôn tập</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="font-mono tabular-nums">{selectedDate}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-5xl sm:text-6xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
                {dueVocab.length + dueGrammar.length}
              </span>
              <span className="text-base sm:text-lg font-medium text-slate-500 dark:text-slate-400">thẻ cần ôn hôm nay</span>
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={scrollToVocab}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Bấm để cuộn xem danh sách từ vựng cần ôn"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="tabular-nums font-semibold">{dueVocab.length}</span> từ vựng
              </button>
              <button
                type="button"
                onClick={scrollToGrammar}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Bấm để cuộn xem danh sách ngữ pháp cần ôn"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="tabular-nums font-semibold">{dueGrammar.length}</span> ngữ pháp
              </button>
            </div>
          </div>

          {/* Action buttons (Flashcard & Arcade Mode) */}
          {(dueVocab.length > 0 || dueGrammar.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="btn-switch-flashcard-mode"
                onClick={onSwitchToFlashcard}
                className="h-11 px-5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl shadow-md shadow-emerald-600/20 ring-1 ring-inset ring-white/10 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Layers size={16} />
                <span>Bắt đầu ôn bằng thẻ lật</span>
              </button>

              {onSwitchToGames && (
                <button
                  type="button"
                  id="btn-switch-games-mode"
                  onClick={onSwitchToGames}
                  className="h-11 px-4 text-sm font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 ring-1 ring-inset ring-slate-200 dark:ring-slate-700 rounded-xl active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Gamepad2 size={16} className="text-indigo-500" />
                  <span>Đấu trường 3D</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ALL ITEMS COMPLETED BANNER */}
      {dueVocab.length === 0 && dueGrammar.length === 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-rose-500/15 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-rose-950/40 rounded-2xl border-2 border-amber-400/80 dark:border-amber-500/60 p-5 sm:p-6 text-center shadow-sm flex flex-col items-center animate-fade-in space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 flex items-center justify-center text-white shadow-lg shadow-orange-500/30">
            <Flame size={28} className="flame-burning fill-amber-200" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              CHÁY HẾT MÌNH! BẠN ĐÃ ÔN XONG HÔM NAY! 🔥
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mt-1 max-w-lg mx-auto">
              Không còn mục từ vựng hay ngữ pháp nào tồn đọng cho ngày này. Trí nhớ dài hạn của bạn đang được bồi đắp cực kỳ hiệu quả!
            </p>
          </div>

          {onSwitchToGames && (
            <button
              type="button"
              onClick={onSwitchToGames}
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 cursor-pointer transition-all active:scale-95"
            >
              <Gamepad2 size={16} />
              <span>Đấu trường 3D rèn phản xạ</span>
            </button>
          )}
        </div>
      )}

      {/* CARDS CONTAINER */}
      <div id="daily-review-cards-container" className="space-y-6 scroll-mt-36">
        {/* SECTION 1: VOCABULARY DUE */}
        <div id="section-vocab-due" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors scroll-mt-36">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Từ vựng cần ôn tập ({dueVocab.length})
            </h3>
          </div>
          {dueVocab.length > 0 && (
            <button
              type="button"
              onClick={() => onMarkAllReviewed('vocab')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 rounded-xl transition-colors cursor-pointer"
            >
              <CheckCircle2 size={14} />
              Đánh dấu tất cả đã ôn
            </button>
          )}
        </div>

        {dueVocab.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <p className="font-bold text-slate-800 dark:text-slate-200 text-base">
              Tuyệt vời! Không có từ vựng nào cần ôn vào ngày này.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Bạn đã hoàn thành các mục hoặc có thể chọn ngày khác trên thanh lịch phía trên.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dueVocab.map((item) => {
              const isRevealed = revealedIds[item.id] ?? false;
              const fsrsPreviews = previewNextFSRSIntervals(item, new Date(), fsrsSettings);
              const stateInfo = getFSRSStateInfo(item.state);
              const overdueInfo = calculateOverdueIndex(item, selectedDate);

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row gap-3.5 sm:gap-4 justify-between"
                >
                  {/* Left Column: Word details, Audio, Image */}
                  <div className="flex gap-3 sm:gap-4 items-start flex-1 min-w-0">
                    {/* Image Thumbnail (if exists) */}
                    {item.imageUrl ? (
                      <div
                        onClick={() => onOpenImageLightbox(item.imageUrl!, item.word)}
                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 cursor-pointer group shadow-2xs"
                        title="Bấm để xem ảnh lớn"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.word}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye size={16} />
                        </div>
                      </div>
                    ) : null}

                    {/* Word Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            {item.word}
                          </span>
                          {item.phonetic && (
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
                              {item.phonetic}
                            </span>
                          )}
                          {item.type && (
                            <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {item.type}
                            </span>
                          )}
                          {item.topic && (
                            <span className="px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60">
                              {item.topic}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${stateInfo.badgeBg} ${stateInfo.badgeColor} border`}>
                            {stateInfo.nameVi}
                          </span>
                          {overdueInfo.isOverdue && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                              <ShieldAlert size={11} />
                              Quá hạn ({overdueInfo.overdueDays}d)
                            </span>
                          )}
                          <AudioPlayerButton
                            audioUrl={item.audioUrl}
                            fallbackText={item.word}
                            size="sm"
                          />
                        </div>

                        {/* Quick action buttons on mobile & desktop */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onEditVocab(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa từ này"
                            aria-label="Sửa"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteVocab(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Xóa từ"
                            aria-label="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Meaning (toggle revealable for self-testing) */}
                      <div>
                        {isRevealed ? (
                          <div className="p-2.5 sm:p-3 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-800/60 text-sm sm:text-base font-bold text-emerald-950 dark:text-emerald-200 flex items-start justify-between gap-2 shadow-2xs">
                            <span className="leading-snug">{item.meaning}</span>
                            <button
                              type="button"
                              onClick={() => toggleReveal(item.id)}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5"
                              title="Ẩn nghĩa"
                              aria-label="Ẩn nghĩa"
                            >
                              <EyeOff size={15} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleReveal(item.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors shadow-2xs"
                          >
                            <Eye size={13} />
                            <span>Bấm để hiện nghĩa tiếng Việt</span>
                          </button>
                        )}
                      </div>

                      {/* Example sentence */}
                      {item.example && (
                        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 not-italic">"{item.example}"</p>
                          {item.exampleVi && isRevealed && (
                            <p className="text-slate-500 dark:text-slate-400 not-italic mt-1 text-xs">
                              → {item.exampleVi}
                            </p>
                          )}
                        </div>
                      )}

                      {/* FSRS Metadata tag */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 flex-wrap">
                        <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Brain size={12} className="text-emerald-500" />
                          FSRS S: {(item.stability || item.interval || 1).toFixed(1)}d
                        </span>
                        <span>·</span>
                        <span>Độ khó D: {(item.difficulty || 5).toFixed(1)}/10</span>
                        <span>·</span>
                        <span>Khoảng cách: {item.interval} ngày</span>
                        <span>·</span>
                        <span>Lặp: {item.repetition} lần</span>
                        {item.lapses ? (
                          <>
                            <span>·</span>
                            <span className="text-rose-500 font-medium">Quên: {item.lapses} lần</span>
                          </>
                        ) : null}
                      </div>

                      {/* 5-Context Output Status (Optional Practice Boost) */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs flex-wrap gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Flame size={14} className="text-amber-500 shrink-0" />
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Output: {item.completedContextsCount ?? 0}/5 ngữ cảnh
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800/50">
                              +50 EXP thưởng
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenContextOutputModal(item)}
                            className="px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 active:scale-95 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Zap size={13} className="text-amber-500 fill-amber-500" />
                            <span>{(item.completedContextsCount ?? 0) >= 5 ? 'Xem lại 5 ngữ cảnh' : 'Luyện 5 ngữ cảnh'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: FSRS Rating Buttons (Directly Clickable on Mobile & Desktop) */}
                  <div className="flex flex-col justify-end gap-1.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between lg:justify-end gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>Đánh giá FSRS:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Đánh giá ngay
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full lg:w-80">
                      {/* Rating 1: Again -> Làm lại */}
                      <button
                        type="button"
                        onClick={() => handleAttemptRateVocab(item, 1)}
                        className="min-h-[48px] sm:min-h-[52px] px-1 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 shadow-2xs text-center"
                        title="Chưa nhớ (Cần làm lại ngay)"
                      >
                        <span className="font-black text-[11px] sm:text-xs leading-tight">Làm lại</span>
                        <span className="text-[10px] font-bold opacity-80">{fsrsPreviews[1].label}</span>
                      </button>

                      {/* Rating 2: Hard -> Cần gọt giũa */}
                      <button
                        type="button"
                        onClick={() => handleAttemptRateVocab(item, 2)}
                        className="min-h-[48px] sm:min-h-[52px] px-1 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 active:scale-95 shadow-2xs text-center"
                        title="Nhớ hơi chật vật (Cần gọt giũa thêm)"
                      >
                        <span className="font-black text-[10px] sm:text-xs leading-tight">Cần gọt giũa</span>
                        <span className="text-[10px] font-bold opacity-80">{fsrsPreviews[2].label}</span>
                      </button>

                      {/* Rating 3: Good -> Trôi chảy */}
                      <button
                        type="button"
                        onClick={() => handleAttemptRateVocab(item, 3)}
                        className="min-h-[48px] sm:min-h-[52px] px-1 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-95 ring-1 ring-emerald-500/40 shadow-2xs text-center"
                        title="Nhớ tốt, phản xạ trôi chảy"
                      >
                        <span className="font-black text-[11px] sm:text-xs leading-tight">Trôi chảy</span>
                        <span className="text-[10px] font-bold opacity-80">{fsrsPreviews[3].label}</span>
                      </button>

                      {/* Rating 4: Easy -> Thành thạo */}
                      <button
                        type="button"
                        onClick={() => handleAttemptRateVocab(item, 4)}
                        className="min-h-[48px] sm:min-h-[52px] px-1 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95 shadow-2xs text-center"
                        title="Rất dễ, nắm rất vững và thành thạo"
                      >
                        <span className="font-black text-[11px] sm:text-xs leading-tight">Thành thạo</span>
                        <span className="text-[10px] font-bold opacity-80">{fsrsPreviews[4].label}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: GRAMMAR DUE */}
      <div id="section-grammar-due" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors scroll-mt-36">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Ngữ pháp cần ôn tập ({dueGrammar.length})
            </h3>
          </div>
          {dueGrammar.length > 0 && (
            <button
              type="button"
              onClick={() => onMarkAllReviewed('grammar')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30 rounded-xl transition-colors cursor-pointer"
            >
              <CheckCircle2 size={14} />
              Đánh dấu tất cả đã ôn
            </button>
          )}
        </div>

        {dueGrammar.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            Không có điểm ngữ pháp nào cần ôn vào ngày này.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dueGrammar.map((item) => {
              const fsrsPreviews = previewNextFSRSIntervals(item, new Date(), fsrsSettings);
              const stateInfo = getFSRSStateInfo(item.state);
              const overdueInfo = calculateOverdueIndex(item, selectedDate);

              return (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col lg:flex-row gap-3.5 sm:gap-4 justify-between"
                >
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30">
                          {item.type}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${stateInfo.badgeBg} ${stateInfo.badgeColor} border`}>
                          {stateInfo.nameVi}
                        </span>
                        {overdueInfo.isOverdue && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                            <ShieldAlert size={11} />
                            Quá hạn ({overdueInfo.overdueDays}d)
                          </span>
                        )}
                        {item.audioUrl && (
                          <AudioPlayerButton
                            audioUrl={item.audioUrl}
                            fallbackText={item.example || item.title}
                            size="sm"
                          />
                        )}
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onEditGrammar(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Sửa ngữ pháp"
                          aria-label="Sửa"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteGrammar(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                          title="Xóa ngữ pháp"
                          aria-label="Xóa"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-slate-900 dark:bg-slate-950 text-emerald-400 font-mono text-xs sm:text-sm rounded-xl shadow-inner overflow-x-auto border border-slate-800">
                      {item.formula}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {item.explanation}
                    </p>

                    {item.example && (
                      <div className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Ví dụ: </span>
                        <span className="text-slate-700 dark:text-slate-300 italic">"{item.example}"</span>
                        {item.exampleVi && (
                          <span className="text-slate-500 dark:text-slate-400 block mt-1 text-xs not-italic">
                            → {item.exampleVi}
                          </span>
                        )}
                      </div>
                    )}

                    {/* FSRS Metadata */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 flex-wrap">
                      <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Brain size={12} className="text-indigo-500" />
                        FSRS S: {(item.stability || item.interval || 1).toFixed(1)}d
                      </span>
                      <span>·</span>
                      <span>Độ khó D: {(item.difficulty || 5).toFixed(1)}/10</span>
                      <span>·</span>
                      <span>Khoảng cách: {item.interval} ngày</span>
                      <span>·</span>
                      <span>Lặp: {item.repetition} lần</span>
                    </div>

                    {/* 5-Context Output Status for Grammar (Optional Practice Boost) */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Flame size={14} className="text-amber-500 shrink-0" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Output: {item.completedContextsCount ?? 0}/5 ngữ cảnh
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800/50">
                            +50 EXP thưởng
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenContextOutputModal(item)}
                          className="px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 active:scale-95 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Zap size={13} className="text-amber-500 fill-amber-500" />
                          <span>{(item.completedContextsCount ?? 0) >= 5 ? 'Xem lại 5 ngữ cảnh' : 'Luyện 5 ngữ cảnh'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rating Buttons (Directly Clickable on Mobile & Desktop) */}
                  <div className="flex flex-col justify-end gap-1.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between lg:justify-end gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>Đánh giá FSRS:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[10px] font-bold">
                        <CheckCircle2 size={12} className="text-emerald-500" /> Đánh giá ngay
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full lg:w-80">
                      <button
                        type="button"
                        onClick={() => handleAttemptRateGrammar(item, 1)}
                        className="min-h-[48px] sm:min-h-[52px] px-1 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 shadow-2xs text-center"
                        title="Chưa nhớ (Cần làm lại ngay)"
                      >
                        <span className="font-black text-[11px] sm:text-xs leading-tight">Làm lại</span>
                        <span className="text-[10px] font-bold opacity-80">{fsrsPreviews[1].label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttemptRateGrammar(item, 2)}
                        className="min-h-[48px] sm:min-h-[52px] px-1 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 active:scale-95 shadow-2xs text-center"
                        title="Nhớ hơi chật vật (Cần gọt giũa thêm)"
                      >
                        <span className="font-black text-[10px] sm:text-xs leading-tight">Cần gọt giũa</span>
                        <span className="text-[10px] font-bold opacity-80">{fsrsPreviews[2].label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttemptRateGrammar(item, 3)}
                        className="min-h-[48px] sm:min-h-[52px] px-1 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-95 ring-1 ring-emerald-500/40 shadow-2xs text-center"
                        title="Nhớ tốt, phản xạ trôi chảy"
                      >
                        <span className="font-black text-[11px] sm:text-xs leading-tight">Trôi chảy</span>
                        <span className="text-[10px] font-bold opacity-80">{fsrsPreviews[3].label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAttemptRateGrammar(item, 4)}
                        className="min-h-[48px] sm:min-h-[52px] px-1 py-1.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95 shadow-2xs text-center"
                        title="Rất dễ, nắm rất vững và thành thạo"
                      >
                        <span className="font-black text-[11px] sm:text-xs leading-tight">Thành thạo</span>
                        <span className="text-[10px] font-bold opacity-80">{fsrsPreviews[4].label}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
