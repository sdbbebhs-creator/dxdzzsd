import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Gamepad2,
  Zap,
  Target,
  Rocket,
  Flame,
  Trophy,
  Sparkles,
  BookOpen,
  FileText,
  Calendar,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Shield,
  Award,
  Lock,
  CheckCircle2,
  Clock,
  Info
} from 'lucide-react';
import { VocabItem, GrammarItem } from '../../types';
import { generateGameQuestions, GameQuestion } from '../../utils/gameQuestions';
import { SpaceShooterGame } from './SpaceShooterGame';
import { WildWestDuelGame } from './WildWestDuelGame';
import { GrammarMissileGame } from './GrammarMissileGame';
import { isGameAudioMuted, setGameAudioMuted } from '../../utils/gameAudio';
import { getTodayDate } from '../../utils/fsrs';
import {
  getAllGameBadges,
  evaluateGameMatchForBadges,
  getArcadeStats,
  GameBadge,
  ArcadeStats
} from '../../utils/gameBadges';
import { BadgeUnlockModal } from './BadgeUnlockModal';

interface GameHubTabProps {
  vocabList: VocabItem[];
  grammarList: GrammarItem[];
  onShowToast: (msg: string) => void;
}

type SelectedGame = 'space-shooter' | 'wild-west' | 'grammar-missile';
type ContentSource = 'all' | 'vocab' | 'grammar' | 'due-today';
type ActiveSubView = 'games' | 'badges';

interface HighScores {
  spaceShooter: number;
  wildWest: number;
  grammarMissile: number;
}

export const GameHubTab: React.FC<GameHubTabProps> = ({
  vocabList,
  grammarList,
  onShowToast,
}) => {
  const [activeGame, setActiveGame] = useState<SelectedGame | null>(null);
  const [selectedGameChoice, setSelectedGameChoice] = useState<SelectedGame>('space-shooter');
  const [contentSource, setContentSource] = useState<ContentSource>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [questionCount, setQuestionCount] = useState<'all' | number>('all');
  const [gameQuestions, setGameQuestions] = useState<GameQuestion[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(isGameAudioMuted());
  const [subView, setSubView] = useState<ActiveSubView>('games');

  // Dynamically extract available topics from both vocab and grammar
  const availableTopics = React.useMemo(() => {
    const set = new Set<string>();
    vocabList.forEach((v) => {
      if (v.topic && v.topic.trim()) set.add(v.topic.trim());
    });
    grammarList.forEach((g) => {
      if (g.type && g.type.trim()) set.add(g.type.trim());
    });
    return Array.from(set).sort();
  }, [vocabList, grammarList]);

  // Hard badges & achievements state
  const [badges, setBadges] = useState<GameBadge[]>(getAllGameBadges);
  const [arcadeStats, setArcadeStats] = useState<ArcadeStats>(getArcadeStats);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<GameBadge[]>([]);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);

  // High score tracking
  const [highScores, setHighScores] = useState<HighScores>(() => {
    try {
      const saved = localStorage.getItem('review_game_high_scores');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { spaceShooter: 0, wildWest: 0, grammarMissile: 0 };
  });

  const saveHighScores = (newScores: HighScores) => {
    setHighScores(newScores);
    try {
      localStorage.setItem('review_game_high_scores', JSON.stringify(newScores));
    } catch {}
  };

  const today = getTodayDate();
  const todayDueCount =
    vocabList.filter((v) => v.reviewDate <= today).length +
    grammarList.filter((g) => g.reviewDate <= today).length;

  // Calculate items matching current content source and topic filter
  const matchingItemCount = React.useMemo(() => {
    let vList = vocabList;
    let gList = grammarList;

    if (selectedTopic !== 'all') {
      const norm = selectedTopic.trim().toLowerCase();
      vList = vList.filter((v) => v.topic && v.topic.trim().toLowerCase() === norm);
      gList = gList.filter(
        (g) =>
          (g.type && g.type.trim().toLowerCase() === norm) ||
          (g.title && g.title.trim().toLowerCase().includes(norm))
      );
    }

    if (contentSource === 'due-today') {
      vList = vList.filter((v) => v.reviewDate <= today);
      gList = gList.filter((g) => g.reviewDate <= today);
      return vList.length + gList.length;
    }
    if (contentSource === 'vocab') return vList.length;
    if (contentSource === 'grammar') return gList.length;
    return vList.length + gList.length;
  }, [vocabList, grammarList, selectedTopic, contentSource, today]);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    setGameAudioMuted(next);
  };

  const handleStartGame = (gameType: SelectedGame) => {
    setSelectedGameChoice(gameType);
    const mode = contentSource === 'due-today' ? 'all' : contentSource;
    const dueOnly = contentSource === 'due-today';
    const limit = questionCount === 'all' ? undefined : questionCount;

    const questions = generateGameQuestions({
      vocabList,
      grammarList,
      mode,
      dueOnly,
      todayDate: today,
      topic: selectedTopic,
      limit,
    });

    if (questions.length === 0) {
      onShowToast('Không có dữ liệu từ vựng hay ngữ pháp để chơi! Vui lòng thêm thẻ vào danh sách trước.');
      return;
    }

    setGameQuestions(questions);
    setActiveGame(gameType);
    // Instant scroll to top so the 3D game arena and HUD appear immediately in view
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleExitGame = () => {
    setActiveGame(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSetSubView = (nextView: ActiveSubView) => {
    setSubView(nextView);
    const el = document.getElementById('game-subview-content');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Called when any game is completed
  const handleGameFinish = (result: {
    score: number;
    combo: number;
    correctCount: number;
    totalCount: number;
    livesRemaining?: number;
    fastestReflexMs?: number;
    cityHealthRemaining?: number;
  }) => {
    // 1. Evaluate for Hard Badges (NO RANK UP / NO EXP TO RANK!)
    const evalResult = evaluateGameMatchForBadges({
      gameType: activeGame || 'space-shooter',
      score: result.score,
      combo: result.combo,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      livesRemaining: result.livesRemaining,
      fastestReflexMs: result.fastestReflexMs,
      cityHealthRemaining: result.cityHealthRemaining,
    });

    setBadges(evalResult.allBadges);
    setArcadeStats(getArcadeStats());

    // 2. Update High scores
    if (activeGame === 'space-shooter' && result.score > highScores.spaceShooter) {
      saveHighScores({ ...highScores, spaceShooter: result.score });
    } else if (activeGame === 'wild-west' && result.score > highScores.wildWest) {
      saveHighScores({ ...highScores, wildWest: result.score });
    } else if (activeGame === 'grammar-missile' && result.score > highScores.grammarMissile) {
      saveHighScores({ ...highScores, grammarMissile: result.score });
    }

    // 3. Check if any difficult badges were unlocked!
    if (evalResult.newlyUnlockedBadges.length > 0) {
      setNewlyUnlockedBadges(evalResult.newlyUnlockedBadges);
      setIsBadgeModalOpen(true);
      onShowToast(`🏆 CHIẾN TÍCH ĐỈNH CAO: Bạn đã mở khóa ${evalResult.newlyUnlockedBadges.length} Huy Hiệu Khó!`);
    } else {
      const accuracy = Math.round((result.correctCount / Math.max(1, result.totalCount)) * 100);
      onShowToast(`🎯 Trận đấu kết thúc! Điểm: ${result.score.toLocaleString()} · Độ chính xác: ${accuracy}%`);
    }

    setActiveGame(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Lock body scroll and trigger 3D canvas resize when a game opens full-screen
  useEffect(() => {
    if (activeGame) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 60);
      return () => {
        document.body.style.overflow = prevOverflow;
        clearTimeout(timer);
      };
    }
  }, [activeGame]);

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  return (
    <div className="space-y-6">
      {/* Fullscreen Game Stage: Phủ kín toàn bộ màn hình khi chơi */}
      {activeGame &&
        createPortal(
          <div
            id="fullscreen-game-stage"
            className="fixed inset-0 z-[100] w-screen h-screen h-[100dvh] bg-slate-950 flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.98] duration-200"
            style={{ width: '100vw', height: '100dvh' }}
          >
            {activeGame === 'space-shooter' && (
              <SpaceShooterGame
                questions={gameQuestions}
                onFinish={handleGameFinish}
                onExit={handleExitGame}
              />
            )}

            {activeGame === 'wild-west' && (
              <WildWestDuelGame
                questions={gameQuestions}
                onFinish={handleGameFinish}
                onExit={handleExitGame}
              />
            )}

            {activeGame === 'grammar-missile' && (
              <GrammarMissileGame
                questions={gameQuestions}
                onFinish={handleGameFinish}
                onExit={handleExitGame}
              />
            )}
          </div>,
          document.body
        )}
      {/* Badge Unlock Celebration Modal */}
      <BadgeUnlockModal
        badges={newlyUnlockedBadges}
        isOpen={isBadgeModalOpen}
        onClose={() => {
          setIsBadgeModalOpen(false);
          setNewlyUnlockedBadges([]);
        }}
      />

      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl p-5 sm:p-7 bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Gamepad2 size={16} />
              <span>Đấu Trường Phản Xạ Ngôn Ngữ</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400">Arcade 3D</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Rèn Luyện Phản Xạ Từ Vựng & Cú Pháp
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Các mini-game 3D giúp bạn phản xạ nhanh với từ vựng và cấu trúc ngữ pháp. Chế độ giải trí này độc lập với thuật toán FSRS học thuật, thử thách tốc độ và trao tặng các huy hiệu arcade danh giá.
            </p>
          </div>

          {/* Badge Cabinet Summary Box */}
          <button
            type="button"
            onClick={() => handleSetSubView('badges')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shrink-0 shadow-sm text-left cursor-pointer transition-all group w-full md:w-auto"
          >
            <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
              <Trophy size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Bộ sưu tập huy hiệu</span>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-amber-400">
                  {unlockedCount}/{badges.length} mở
                </span>
              </div>
              <div className="text-sm font-bold text-white truncate mt-0.5">
                {unlockedCount === badges.length ? 'Đã mở khóa toàn bộ' : 'Xem tiến độ thử thách'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {arcadeStats.gamesPlayed} trận · Kỷ lục {arcadeStats.highestScore.toLocaleString()} đ
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Subview Nav Tabs: Chọn Game vs Tủ Huy Hiệu */}
      <div id="game-subview-content" className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleSetSubView('games')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              subView === 'games'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Gamepad2 size={15} />
            <span>3 Trò Chơi</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetSubView('badges')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              subView === 'badges'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Trophy size={15} className="text-amber-500" />
            <span>Huy Hiệu ({unlockedCount}/{badges.length})</span>
          </button>
        </div>

        {/* Sound Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium cursor-pointer transition-colors border border-slate-200 dark:border-slate-800"
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-emerald-500" />}
          <span className="hidden sm:inline">Âm thanh: {isMuted ? 'Tắt' : 'Bật'}</span>
        </button>
      </div>

      {/* VIEW 1: GAME HUB SELECTION */}
      {subView === 'games' && (
        <>
          {/* Subtle rule note */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
            <Info size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-slate-900 dark:text-white">Lưu ý:</span> Kết quả trận đấu arcade rèn luyện phản xạ ngôn ngữ nhanh, không làm ảnh hưởng đến chu kỳ giãn cách FSRS của thẻ học.
            </div>
          </div>

          {/* Game Source & Topic Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Nguồn câu hỏi & Chủ đề luyện tập
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tùy chọn danh mục thẻ và chủ đề để rèn luyện phản xạ (Có thể chơi hết toàn bộ)
                </p>
              </div>

              {/* Question Count Selector: Chơi tất cả hoặc theo số lượng */}
              <div className="flex items-center gap-1.5 self-start sm:self-center flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-1 font-medium">Chế độ chơi:</span>
                <button
                  type="button"
                  onClick={() => setQuestionCount('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    questionCount === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Chơi tất cả ({matchingItemCount} câu)
                </button>
                {[10, 20].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      questionCount === cnt
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cnt} câu
                  </button>
                ))}
              </div>
            </div>

            {/* Source Category Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setContentSource('all')}
                className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  contentSource === 'all'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles size={17} className="text-emerald-500" />
                <span>Tất cả ({vocabList.length + grammarList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setContentSource('due-today')}
                className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex flex-col items-center gap-1.5 relative ${
                  contentSource === 'due-today'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar size={17} className="text-amber-500" />
                <span>Đến hạn hôm nay ({todayDueCount})</span>
                {todayDueCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 animate-ping" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setContentSource('vocab')}
                className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  contentSource === 'vocab'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen size={17} className="text-blue-500" />
                <span>Từ vựng ({vocabList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setContentSource('grammar')}
                className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  contentSource === 'grammar'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <FileText size={17} className="text-purple-500" />
                <span>Ngữ pháp ({grammarList.length})</span>
              </button>
            </div>

            {/* Topic Filter Selection */}
            {availableTopics.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Lọc theo chủ đề:
                  </span>
                  {selectedTopic !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedTopic('all')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 underline cursor-pointer"
                    >
                      Bỏ lọc chủ đề (xem tất cả)
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedTopic('all')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTopic === 'all'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    Tất cả chủ đề
                  </button>
                  {availableTopics.map((top) => (
                    <button
                      key={top}
                      type="button"
                      onClick={() => setSelectedTopic(top)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedTopic === top
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      #{top}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty Knowledge State Alert */}
            {matchingItemCount === 0 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
                <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm space-y-1">
                  <div className="font-bold text-amber-200">
                    Chưa có dữ liệu kiến thức để tạo trò chơi!
                  </div>
                  <div className="text-slate-300">
                    Không có thẻ từ vựng hoặc ngữ pháp nào phù hợp với danh mục/chủ đề đang chọn. Game sẽ không có dữ liệu kiến thức để chơi cho đến khi bạn thêm thẻ mới vào hệ thống.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3 Game Cards - Refined, Clean, High Legibility */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Game 1: Vũ Trụ Xạ Thủ */}
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                    <Zap size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Kỷ lục</div>
                    <div className="text-sm font-mono font-bold text-amber-500 dark:text-amber-400">
                      {highScores.spaceShooter.toLocaleString()} đ
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Vũ Trụ Xạ Thủ 3D
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Điều khiển phi thuyền trong không gian, quan sát 4 luồng thiên thạch đáp án và khai hỏa laser chính xác vào từ vựng tương ứng.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Thao tác PC:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">Phím 1-4 hoặc Chuột/Space</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Thao tác Mobile:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Chạm ô đáp án trực tiếp</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  type="button"
                  disabled={matchingItemCount === 0}
                  onClick={() => handleStartGame('space-shooter')}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    matchingItemCount === 0
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm'
                  }`}
                  title={matchingItemCount === 0 ? 'Chưa có thẻ phù hợp để chơi' : 'Bắt đầu chơi Vũ Trụ Xạ Thủ'}
                >
                  <Play size={15} fill="currentColor" />
                  <span>{matchingItemCount === 0 ? 'Không Có Dữ Liệu' : 'Bắt Đầu Chơi'}</span>
                </button>
              </div>
            </div>

            {/* Game 2: Đấu Súng Cao Bồi */}
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-amber-500/50 transition-colors">
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                    <Target size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Kỷ lục</div>
                    <div className="text-sm font-mono font-bold text-amber-500 dark:text-amber-400">
                      {highScores.wildWest.toLocaleString()} đ
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Đấu Súng Cao Bồi 3D
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Bắn bia phản xạ tại quán rượu Saloon. Nhận diện nhanh nghĩa từ vựng, ngắm bắn vỡ chai rượu đúng trước khi đối thủ nổ súng.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Thao tác PC:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">Phím 1-4, Chuột & Nạp [R]</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Thao tác Mobile:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Chạm bia ngắm bắn</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  type="button"
                  disabled={matchingItemCount === 0}
                  onClick={() => handleStartGame('wild-west')}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    matchingItemCount === 0
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-sm'
                  }`}
                  title={matchingItemCount === 0 ? 'Chưa có thẻ phù hợp để chơi' : 'Bắt đầu chơi Đấu Súng Cao Bồi'}
                >
                  <Play size={15} fill="currentColor" />
                  <span>{matchingItemCount === 0 ? 'Không Có Dữ Liệu' : 'Bắt Đầu Chơi'}</span>
                </button>
              </div>
            </div>

            {/* Game 3: Phòng Thủ Căn Cứ */}
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shrink-0">
                    <Rocket size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Kỷ lục</div>
                    <div className="text-sm font-mono font-bold text-amber-500 dark:text-amber-400">
                      {highScores.grammarMissile.toLocaleString()} đ
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Phòng Thủ Căn Cứ 3D
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Tên lửa ICBM đang lao xuống căn cứ. Chọn đúng cấu trúc ngữ pháp để nạp mã phóng tên lửa phòng không SAM đánh chặn kịp thời.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Thao tác PC:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">Phím 1-4 hoặc Space phóng</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Thao tác Mobile:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Chạm 1 chạm để phóng SAM</span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  type="button"
                  disabled={matchingItemCount === 0}
                  onClick={() => handleStartGame('grammar-missile')}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    matchingItemCount === 0
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm'
                  }`}
                  title={matchingItemCount === 0 ? 'Chưa có thẻ phù hợp để chơi' : 'Bắt đầu chơi Phòng Thủ Căn Cứ'}
                >
                  <Play size={15} fill="currentColor" />
                  <span>{matchingItemCount === 0 ? 'Không Có Dữ Liệu' : 'Bắt Đầu Chơi'}</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: HARD BADGES & TROPHY CABINET */}
      {subView === 'badges' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/90 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                <span>Bảng Danh Dự: Bộ Sưu Tập Huy Hiệu Khó</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Các danh hiệu cao quý này chỉ trao cho người chơi đạt độ chính xác hoàn hảo, phản xạ dưới 0.75s hoặc chuỗi combo 10+
              </p>
            </div>

            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold shrink-0">
              Đã mở khóa: {unlockedCount}/{badges.length} Huy Hiệu
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`relative rounded-3xl p-5 border flex flex-col justify-between transition-all duration-300 ${
                  badge.isUnlocked
                    ? `${badge.badgeBorder} shadow-lg ${badge.glowColor} badge-shimmer-active scale-[1.01]`
                    : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-3xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 inline-block">
                      {badge.icon}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        badge.isUnlocked
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {badge.rarityLabel}
                    </span>
                  </div>

                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {badge.name}
                  </h4>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 block mb-1">
                    {badge.titleVi}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {badge.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">Tiến độ:</span>
                    <span
                      className={`font-mono font-bold ${
                        badge.isUnlocked ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {badge.progressText}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        badge.isUnlocked ? 'bg-amber-400' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>

                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {badge.isUnlocked ? (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        <span>Mở khóa vào: {badge.unlockedAt || 'Gần đây'}</span>
                      </>
                    ) : (
                      <>
                        <Lock size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{badge.conditionDescription}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setSubView('games')}
              className="py-3 px-6 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs sm:text-sm cursor-pointer shadow-md transition-all hover:scale-105 active:scale-95"
            >
              Vào Game Thử Thách Ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
