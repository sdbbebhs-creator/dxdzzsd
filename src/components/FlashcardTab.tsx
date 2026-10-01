import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw, ChevronLeft, ChevronRight, Shuffle, Volume2, Sparkles, CheckCircle, CheckCircle2, RefreshCcw, Layers, Flame, Brain, Zap, Lock, Unlock } from 'lucide-react';
import { VocabItem, GrammarItem, ReviewRating } from '../types';
import { AudioPlayerButton } from './AudioPlayerButton';
import {
  previewNextFSRSIntervals,
  getFSRSStateInfo,
  scheduleCardsPriorityQueue,
} from '../utils/fsrs';
import { playAudioOrTTS } from '../utils/audio';
import { useFSRSSettings } from '../hooks/useFSRSSettings';

interface FlashcardTabProps {
  vocabList: VocabItem[];
  grammarList: GrammarItem[];
  selectedDate: string;
  onRateVocab: (id: string, rating: ReviewRating) => void;
  onRateGrammar: (id: string, rating: ReviewRating) => void;
  onOpenImageLightbox: (url: string, caption?: string) => void;
  onOpenContextOutputModal: (item: VocabItem | GrammarItem) => void;
}

type CardItem =
  | { kind: 'vocab'; item: VocabItem }
  | { kind: 'grammar'; item: GrammarItem };

export const FlashcardTab: React.FC<FlashcardTabProps> = ({
  vocabList,
  grammarList,
  selectedDate,
  onRateVocab,
  onRateGrammar,
  onOpenImageLightbox,
  onOpenContextOutputModal,
}) => {
  // Cài đặt FSRS dùng chung: đổi cài đặt -> tính lại khoảng cách 4 nút ngay
  const fsrsSettings = useFSRSSettings();
  const [filterMode, setFilterMode] = useState<'due' | 'all'>('due');
  const [deckType, setDeckType] = useState<'all' | 'vocab' | 'grammar'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);

  // Available topics for filtering
  const allTopics = Array.from(
    new Set(
      vocabList
        .map((v) => v.topic)
        .filter((t): t is string => Boolean(t && t.trim() !== ''))
    )
  );

  // Build deck based on filters
  const buildDeck = useCallback(() => {
    let rawVocab = vocabList;
    let rawGrammar = grammarList;

    if (filterMode === 'due') {
      rawVocab = scheduleCardsPriorityQueue(rawVocab, { todayDate: selectedDate, filterDueTodayOnly: true });
      rawGrammar = scheduleCardsPriorityQueue(rawGrammar, { todayDate: selectedDate, filterDueTodayOnly: true });
    } else {
      rawVocab = scheduleCardsPriorityQueue(rawVocab, { todayDate: selectedDate, filterDueTodayOnly: false });
      rawGrammar = scheduleCardsPriorityQueue(rawGrammar, { todayDate: selectedDate, filterDueTodayOnly: false });
    }

    if (selectedTopic !== 'all') {
      rawVocab = rawVocab.filter((v) => v.topic === selectedTopic);
    }

    const deck: CardItem[] = [];
    if (deckType === 'all' || deckType === 'vocab') {
      rawVocab.forEach((v) => deck.push({ kind: 'vocab', item: v }));
    }
    if (deckType === 'all' || deckType === 'grammar') {
      rawGrammar.forEach((g) => deck.push({ kind: 'grammar', item: g }));
    }

    setCards(deck);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [vocabList, grammarList, selectedDate, filterMode, deckType, selectedTopic]);

  useEffect(() => {
    buildDeck();
  }, [buildDeck]);

  const currentCard = cards[currentIndex];

  // Auto-play audio on new card if enabled
  useEffect(() => {
    if (autoPlayAudio && currentCard && !isFlipped) {
      if (currentCard.kind === 'vocab') {
        playAudioOrTTS(currentCard.item.audioUrl, currentCard.item.word);
      }
    }
  }, [currentIndex, autoPlayAudio, currentCard, isFlipped]);

  // Handle keyboard shortcuts (Space: Flip, 1-4: Rating, Left/Right: Navigate, R: Replay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key.toLowerCase() === 'r') {
        if (currentCard) {
          if (currentCard.kind === 'vocab') {
            playAudioOrTTS(currentCard.item.audioUrl, currentCard.item.word);
          } else {
            playAudioOrTTS(currentCard.item.audioUrl, currentCard.item.example || currentCard.item.title);
          }
        }
      } else if (isFlipped && ['1', '2', '3', '4'].includes(e.key)) {
        handleRate(Number(e.key) as ReviewRating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleRate = (rating: ReviewRating) => {
    if (!currentCard) return;

    if (currentCard.kind === 'vocab') {
      onRateVocab(currentCard.item.id, rating);
    } else {
      onRateGrammar(currentCard.item.id, rating);
    }

    // Move to next card or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      // Finished deck
      setIsFlipped(false);
      setCurrentIndex(cards.length); // triggers completed screen
    }
  };

  // If no cards match criteria
  if (cards.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-10 text-center max-w-xl mx-auto shadow-xs">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <Layers size={32} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Chưa có thẻ nào trong bộ lọc này
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6">
          {filterMode === 'due'
            ? 'Bạn không có từ nào cần ôn đến hạn cho ngày này. Hãy chuyển sang chế độ "Tất cả các thẻ" để học trước.'
            : 'Kho từ vựng hoặc ngữ pháp đang trống. Bạn hãy thêm từ mới hoặc nạp dữ liệu mẫu nhé!'}
        </p>
        <div className="flex justify-center gap-3">
          {filterMode === 'due' && (
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs hover:bg-emerald-700 cursor-pointer"
            >
              Học tất cả các thẻ
            </button>
          )}
        </div>
      </div>
    );
  }

  // Completed deck screen
  if (currentIndex >= cards.length) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-4 animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
          <Flame size={40} className="fill-amber-200 animate-bounce" />
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
          CHÁY HẾT MÌNH! HOÀN THÀNH BỘ THẺ! 🔥
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 mb-6 leading-relaxed">
          Bạn vừa hoàn thành xuất sắc {cards.length} thẻ theo thuật toán Spaced Repetition SM-2. Não bộ đã được kích hoạt ghi nhớ sâu!
        </p>
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className="px-6 py-2.5 text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <RefreshCcw size={16} />
            <span>Ôn lại từ đầu</span>
          </button>
        </div>
      </div>
    );
  }

  // Pre-calculate FSRS intervals & state info for card
  const fsrsPreviews = previewNextFSRSIntervals(currentCard.item, new Date(), fsrsSettings);
  const stateInfo = getFSRSStateInfo(currentCard.item.state);

  const scrollToDeck = () => {
    const el = document.getElementById('flashcard-deck-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div id="flashcard-deck-container" className="space-y-5 max-w-3xl mx-auto scroll-mt-36">
      {/* Deck Controls & Filters */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Due vs All toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1 font-bold">
            <button
              type="button"
              onClick={() => {
                setFilterMode('due');
                scrollToDeck();
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                filterMode === 'due'
                  ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Cần ôn
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                scrollToDeck();
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all cursor-pointer text-xs ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Type filter */}
          <select
            value={deckType}
            onChange={(e) => {
              setDeckType(e.target.value as any);
              scrollToDeck();
            }}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer text-xs focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Tất cả</option>
            <option value="vocab">Chỉ từ vựng</option>
            <option value="grammar">Chỉ ngữ pháp</option>
          </select>

          {/* Topic filter */}
          {allTopics.length > 0 && (
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                scrollToDeck();
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer text-xs max-w-[130px] truncate focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Mọi chủ đề</option>
              {allTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Auto play toggle */}
          <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer font-medium text-xs">
            <input
              type="checkbox"
              checked={autoPlayAudio}
              onChange={(e) => setAutoPlayAudio(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="hidden sm:inline">Phát âm</span>
          </label>

          {/* Shuffle button */}
          <button
            type="button"
            onClick={handleShuffle}
            className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Trộn ngẫu nhiên"
            aria-label="Trộn thẻ"
          >
            <Shuffle size={16} />
          </button>
        </div>
      </div>

      {/* Progress Counter & Bar */}
      <div>
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 px-1">
          <span>
            Thẻ {currentIndex + 1} / {cards.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / cards.length) * 100)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 3D FLASHCARD */}
      <div
        id="flashcard-container"
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[350px] sm:min-h-[420px] rounded-2xl sm:rounded-3xl cursor-pointer select-none perspective-1000 relative group transition-transform"
      >
        <div
          className={`w-full h-full min-h-[350px] sm:min-h-[420px] rounded-2xl sm:rounded-3xl p-4 sm:p-8 border shadow-md transition-all duration-500 flex flex-col justify-between ${
            isFlipped
              ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-white dark:from-slate-900 dark:via-slate-850 dark:to-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-600/60 hover:shadow-lg'
          }`}
        >
          {/* Top header on card */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold uppercase rounded-lg ${
                  currentCard.kind === 'vocab'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300'
                }`}
              >
                {currentCard.kind === 'vocab'
                  ? `Từ vựng · ${currentCard.item.type || 'n'}`
                  : `Ngữ pháp · ${currentCard.item.type}`}
              </span>

              {currentCard.kind === 'vocab' && currentCard.item.topic && (
                <span className="px-2 py-0.5 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md truncate max-w-[120px]">
                  {currentCard.item.topic}
                </span>
              )}

              {/* FSRS State Badge */}
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${stateInfo.badgeBg} ${stateInfo.badgeColor} border`}>
                {stateInfo.nameVi}
              </span>
            </div>

            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {/* Audio button on card */}
              <AudioPlayerButton
                audioUrl={currentCard.item.audioUrl}
                fallbackText={
                  currentCard.kind === 'vocab'
                    ? currentCard.item.word
                    : currentCard.item.example || currentCard.item.title
                }
                size="md"
              />
            </div>
          </div>

          {/* Center Content: Front vs Back */}
          {!isFlipped ? (
            /* FRONT OF CARD */
            <div className="my-auto text-center space-y-3 sm:space-y-4 py-4">
              {currentCard.kind === 'vocab' ? (
                <>
                  {currentCard.item.imageUrl && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenImageLightbox(currentCard.item.imageUrl!, currentCard.item.word);
                      }}
                      className="w-24 h-24 sm:w-36 sm:h-36 mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs bg-slate-50 dark:bg-slate-800 cursor-zoom-in"
                    >
                      <img
                        src={currentCard.item.imageUrl}
                        alt={currentCard.item.word}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  )}

                  <div>
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      {currentCard.item.word}
                    </h2>
                    {currentCard.item.phonetic && (
                      <p className="text-sm sm:text-base font-mono text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {currentCard.item.phonetic}
                      </p>
                    )}
                  </div>

                  {currentCard.item.example && (
                    <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto italic border border-slate-100 dark:border-slate-800">
                      "{currentCard.item.example}"
                    </div>
                  )}
                </>
              ) : (
                /* Grammar Front */
                <>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                    {currentCard.item.title}
                  </h2>
                  <div className="p-2.5 sm:p-3 bg-slate-900 dark:bg-slate-950 text-emerald-400 font-mono text-xs sm:text-sm rounded-xl max-w-lg mx-auto shadow-inner overflow-x-auto border border-slate-800">
                    {currentCard.item.formula}
                  </div>
                  {currentCard.item.example && (
                    <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-lg mx-auto border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-slate-100">Ví dụ: </span>
                      <span className="italic">"{currentCard.item.example}"</span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* BACK OF CARD */
            <div className="my-auto text-center space-y-3 sm:space-y-4 py-4 animate-fade-in">
              {currentCard.kind === 'vocab' ? (
                <>
                  <div className="text-slate-400 dark:text-slate-500 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                    Nghĩa tiếng Việt
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-300">
                    {currentCard.item.meaning}
                  </h3>

                  {currentCard.item.exampleVi && (
                    <div className="p-2.5 sm:p-3 bg-white/90 dark:bg-slate-800/90 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 max-w-lg mx-auto border border-emerald-100 dark:border-emerald-800/50 shadow-2xs">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 italic">
                        "{currentCard.item.example}"
                      </p>
                      <p className="text-emerald-800 dark:text-emerald-400 mt-1 font-bold">
                        → {currentCard.item.exampleVi}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-slate-400 dark:text-slate-500 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                    Giải thích & Ứng dụng
                  </div>
                  <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 max-w-lg mx-auto leading-relaxed">
                    {currentCard.item.explanation}
                  </p>
                  {currentCard.item.exampleVi && (
                    <div className="p-2.5 bg-white/90 dark:bg-slate-800/90 rounded-xl text-xs sm:text-sm text-indigo-900 dark:text-indigo-300 max-w-lg mx-auto border border-indigo-100 dark:border-indigo-800/50">
                      <strong>Dịch: </strong>{currentCard.item.exampleVi}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Bottom Flip Hint or SM-2 Rating Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            {!isFlipped ? (
              <div className="w-full text-center flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium py-1">
                <RotateCw size={14} className="animate-spin-slow" />
                <span>Bấm vào thẻ hoặc phím [Space] để xem nghĩa</span>
              </div>
            ) : (
              <div className="w-full" onClick={(e) => e.stopPropagation()}>
                {/* 5-Context Output Practice Block (Optional Practice Boost) */}
                <div className="mb-3">
                  {(currentCard.item.completedContextsCount ?? 0) >= 5 ? (
                    <div className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs gap-2">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Output: Đã hoàn thành 5/5 ngữ cảnh (+50 EXP thưởng)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenContextOutputModal(currentCard.item)}
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg cursor-pointer shrink-0"
                      >
                        Xem lại
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 sm:p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Flame size={14} className="text-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Output: {currentCard.item.completedContextsCount ?? 0}/5 ngữ cảnh (+50 EXP thưởng tùy chọn)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenContextOutputModal(currentCard.item)}
                        className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Zap size={13} className="fill-white" />
                        <span>Luyện 5 Ngữ Cảnh</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between font-bold text-slate-600 dark:text-slate-400 mb-2 text-xs flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <span>Đánh giá FSRS (Bấm chọn hoặc phím 1-4):</span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 size={12} /> Đánh giá ngay
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Brain size={12} />
                    S: {(currentCard.item.stability || currentCard.item.interval || 1).toFixed(1)}d · D: {(currentCard.item.difficulty || 5).toFixed(1)}/10
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handleRate(1)}
                    className="min-h-[46px] sm:min-h-[50px] rounded-xl bg-rose-50 dark:bg-rose-950/35 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 active:scale-95 transition-all font-bold flex flex-col items-center justify-center cursor-pointer p-1 shadow-2xs text-center"
                    title="Chưa nhớ được / Cần làm lại ngay"
                  >
                    <span className="text-[11px] sm:text-xs font-black leading-tight">1 · Làm lại</span>
                    <span className="text-[10px] font-bold opacity-75">{fsrsPreviews[1].label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate(2)}
                    className="min-h-[46px] sm:min-h-[50px] rounded-xl bg-amber-50 dark:bg-amber-950/35 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 active:scale-95 transition-all font-bold flex flex-col items-center justify-center cursor-pointer p-1 shadow-2xs text-center"
                    title="Nhớ chật vật / Cần gọt giũa thêm"
                  >
                    <span className="text-[10px] sm:text-xs font-black leading-tight">2 · Cần gọt giũa</span>
                    <span className="text-[10px] font-bold opacity-75">{fsrsPreviews[2].label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate(3)}
                    className="min-h-[46px] sm:min-h-[50px] rounded-xl bg-emerald-50 dark:bg-emerald-950/35 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 transition-all font-bold flex flex-col items-center justify-center cursor-pointer p-1 shadow-2xs text-center"
                    title="Nhớ tự nhiên / Phản xạ trôi chảy"
                  >
                    <span className="text-[11px] sm:text-xs font-black leading-tight">3 · Trôi chảy</span>
                    <span className="text-[10px] font-bold opacity-75">{fsrsPreviews[3].label}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate(4)}
                    className="min-h-[46px] sm:min-h-[50px] rounded-xl bg-blue-50 dark:bg-blue-950/35 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 active:scale-95 transition-all font-bold flex flex-col items-center justify-center cursor-pointer p-1 shadow-2xs text-center"
                    title="Nắm rất vững / Sử dụng thành thạo"
                  >
                    <span className="text-[11px] sm:text-xs font-black leading-tight">4 · Thành thạo</span>
                    <span className="text-[10px] font-bold opacity-75">{fsrsPreviews[4].label}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-1">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Thẻ trước</span>
          <span className="sm:hidden">Trước</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="min-h-[44px] px-4 sm:px-6 py-2 text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <RotateCw size={15} />
          <span>{isFlipped ? 'Xem mặt trước' : 'Lật xem nghĩa'}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex >= cards.length - 1}
          className="min-h-[44px] px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
        >
          <span className="hidden sm:inline">Thẻ sau</span>
          <span className="sm:hidden">Sau</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
