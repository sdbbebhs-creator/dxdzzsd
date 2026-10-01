import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Trophy,
  Heart,
  Flame,
  CheckCircle2,
  XCircle,
  Zap,
  RotateCcw,
  Award,
  Target,
  Skull,
  ShieldAlert,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { GameQuestion } from '../../utils/gameQuestions';
import {
  playGunshot,
  playRicochet,
  playDamageBuzz,
  playVictoryFanfare,
  playTick,
  playRevolverCock,
  playDrawSignal,
  playComboStreak,
  isGameAudioMuted,
  setGameAudioMuted,
  startWesternBGM,
  stopGameBGM,
  isGameBGMMuted,
  setGameBGMMuted,
} from '../../utils/gameAudio';
import { playAudioOrTTS } from '../../utils/audio';
import { WildWestDuel3DView } from './WildWestDuel3DView';

interface WildWestDuelGameProps {
  questions: GameQuestion[];
  onFinish: (result: {
    score: number;
    combo: number;
    correctCount: number;
    totalCount: number;
    livesRemaining: number;
    fastestReflexMs: number;
  }) => void;
  onExit: () => void;
}

interface SaloonTarget {
  id: string;
  text: string;
  subText?: string;
  isCorrect: boolean;
  spotName: string;
  xPercent: number; // 0 to 100%
  yPercent: number; // 0 to 100%
  isPoppedUp: boolean;
  isShattered: boolean;
}

const SALOON_BOTTLE_THEMES = [
  {
    name: 'Bia 1',
    border: 'border-amber-500/70',
    bg: 'bg-stone-900/90',
    activeBg: 'bg-amber-950/95',
    text: 'text-stone-100',
    sub: 'text-stone-300',
    badge: 'bg-amber-500 text-stone-950 font-bold',
    colorHex: '#f59e0b',
    mobileBtn: 'bg-stone-900/90 hover:bg-stone-850 border-amber-500/60 text-stone-100',
  },
  {
    name: 'Bia 2',
    border: 'border-emerald-500/70',
    bg: 'bg-stone-900/90',
    activeBg: 'bg-emerald-950/95',
    text: 'text-stone-100',
    sub: 'text-stone-300',
    badge: 'bg-emerald-500 text-stone-950 font-bold',
    colorHex: '#10b981',
    mobileBtn: 'bg-stone-900/90 hover:bg-stone-850 border-emerald-500/60 text-stone-100',
  },
  {
    name: 'Bia 3',
    border: 'border-orange-500/70',
    bg: 'bg-stone-900/90',
    activeBg: 'bg-orange-950/95',
    text: 'text-stone-100',
    sub: 'text-stone-300',
    badge: 'bg-orange-500 text-stone-950 font-bold',
    colorHex: '#f97316',
    mobileBtn: 'bg-stone-900/90 hover:bg-stone-850 border-orange-500/60 text-stone-100',
  },
  {
    name: 'Bia 4',
    border: 'border-sky-500/70',
    bg: 'bg-stone-900/90',
    activeBg: 'bg-sky-950/95',
    text: 'text-stone-100',
    sub: 'text-stone-300',
    badge: 'bg-sky-500 text-stone-950 font-bold',
    colorHex: '#0284c7',
    mobileBtn: 'bg-stone-900/90 hover:bg-stone-850 border-sky-500/60 text-stone-100',
  },
];

export const WildWestDuelGame: React.FC<WildWestDuelGameProps> = ({
  questions,
  onFinish,
  onExit,
}) => {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Dual Health System with Ghost Damage Trails (Cowboy vs Bandit Boss)
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerHealthGhost, setPlayerHealthGhost] = useState(100);
  const playerHealthRef = useRef(100);
  playerHealthRef.current = playerHealth;

  const [outlawHealth, setOutlawHealth] = useState(100);
  const [outlawHealthGhost, setOutlawHealthGhost] = useState(100);
  const outlawHealthRef = useRef(100);
  outlawHealthRef.current = outlawHealth;

  const [lives, setLives] = useState(3);
  const [timerProgress, setTimerProgress] = useState(100);
  const [isMuted, setIsMuted] = useState(isGameAudioMuted());
  const [isBgmMuted, setIsBgmMuted] = useState(isGameBGMMuted());
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [hasMuzzleFlash, setHasMuzzleFlash] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [floatingScore, setFloatingScore] = useState<{ text: string; id: number; isDamage?: boolean } | null>(null);

  // Light-Gun Saloon Mechanics: Revolver Ammo & Pop-up Targets
  const [cylinderBullets, setCylinderBullets] = useState(6);
  const [isReloading, setIsReloading] = useState(false);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [targets, setTargets] = useState<SaloonTarget[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [reviewedItems, setReviewedItems] = useState<
    Array<{ word: string; correct: boolean; explanation: string; pronounceText?: string; timeMs?: number }>
  >([]);

  const [isHardwareFullscreen, setIsHardwareFullscreen] = useState(false);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const crosshairPosRef = useRef<{ xPercent: number; yPercent: number }>({ xPercent: 50, yPercent: 50 });

  useEffect(() => {
    const handleFsChange = () => {
      setIsHardwareFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleHardwareFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onExit]);

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const crosshairRef = useRef<HTMLDivElement | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRoundResolvedRef = useRef(false);

  const currentQ = questions[round];

  const triggerScreenShake = () => {
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), 320);
  };

  const triggerMuzzleFlash = () => {
    setHasMuzzleFlash(true);
    setTimeout(() => setHasMuzzleFlash(false), 160);
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    setGameAudioMuted(next);
  };

  const toggleBGM = () => {
    const next = !isBgmMuted;
    setIsBgmMuted(next);
    setGameBGMMuted(next);
    if (!next && !isMuted) {
      startWesternBGM();
    } else {
      stopGameBGM();
    }
  };

  // Western BGM Lifecycle
  useEffect(() => {
    // Scroll window to top so the 3D duel view and HUD are immediately visible
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (!isMuted && !isBgmMuted && !isGameOver && !isVictory) {
      startWesternBGM();
    } else {
      stopGameBGM();
    }
    return () => {
      stopGameBGM();
    };
  }, [isGameOver, isVictory, isMuted, isBgmMuted]);

  // Sync ghost health trail
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlayerHealthGhost(playerHealth);
    }, 400);
    return () => clearTimeout(timer);
  }, [playerHealth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOutlawHealthGhost(outlawHealth);
    }, 400);
    return () => clearTimeout(timer);
  }, [outlawHealth]);

  // Damage Player function
  const applyPlayerDamage = useCallback((damageAmount: number, message: string) => {
    playDamageBuzz();
    triggerScreenShake();
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 300);
    setCombo(0);

    const prevHp = playerHealthRef.current;
    const nextHp = Math.max(0, prevHp - damageAmount);
    playerHealthRef.current = nextHp;
    setPlayerHealth(nextHp);
    setLives(Math.ceil(nextHp / 34));

    setFloatingScore({
      text: `-${damageAmount} HP XẠ THỦ TỔN THƯƠNG!`,
      id: Date.now(),
      isDamage: true,
    });

    setFeedbackMessage(message);

    if (nextHp <= 0) {
      setTimeout(() => {
        setIsGameOver(true);
      }, 500);
    }
  }, []);

  // Damage Outlaw function
  const applyOutlawDamage = useCallback((damageAmount: number) => {
    const prevOutlaw = outlawHealthRef.current;
    const nextOutlaw = Math.max(0, prevOutlaw - damageAmount);
    outlawHealthRef.current = nextOutlaw;
    setOutlawHealth(nextOutlaw);
  }, []);

  // Spawn Saloon Pop-up Targets for each round
  useEffect(() => {
    if (isGameOver || isVictory || !currentQ) return;

    isRoundResolvedRef.current = false;

    if (currentQ.pronounceText && currentQ.sourceType === 'vocab') {
      playAudioOrTTS(currentQ.audioUrl, currentQ.pronounceText);
    }

    setFeedbackMessage(null);
    playRevolverCock();

    const spots = [
      { name: 'Vị trí 1', x: 26, y: 34 },
      { name: 'Vị trí 2', x: 74, y: 34 },
      { name: 'Vị trí 3', x: 26, y: 66 },
      { name: 'Vị trí 4', x: 74, y: 66 },
    ];

    const initialTargets: SaloonTarget[] = currentQ.options.map((opt, idx) => ({
      id: opt.id,
      text: opt.text,
      subText: opt.subText,
      isCorrect: opt.isCorrect,
      spotName: spots[idx].name,
      xPercent: spots[idx].x,
      yPercent: spots[idx].y,
      isPoppedUp: true,
      isShattered: false,
    }));

    setTargets(initialTargets);
    const startMs = Date.now();
    setRoundStartTime(startMs);
    setTimerProgress(100);
    playDrawSignal();

    const timerInterval = setInterval(() => {
      if (isRoundResolvedRef.current) {
        clearInterval(timerInterval);
        return;
      }
      const elapsed = Date.now() - startMs;
      const pct = Math.max(0, 100 - (elapsed / 5500) * 100);
      setTimerProgress(pct);
      if (pct <= 0) {
        clearInterval(timerInterval);
      }
    }, 40);

    // 5.5 seconds time window to shoot before bandit fires first
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    roundTimerRef.current = setTimeout(() => {
      handleRoundTimeout();
    }, 5500);

    return () => {
      clearInterval(timerInterval);
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    };
  }, [round, isGameOver, isVictory, currentQ]);

  // Round Timeout (Bandit fires first!)
  const handleRoundTimeout = useCallback(() => {
    if (isGameOver || isVictory || isRoundResolvedRef.current) return;
    isRoundResolvedRef.current = true;

    playGunshot();
    triggerMuzzleFlash();

    applyPlayerDamage(34, `💥 QUÁ CHẬM! Tên cướp nổ súng trước! Đáp án đúng: "${currentQ.correctAnswerText}"`);

    setReviewedItems((prev) => [
      ...prev,
      {
        word: currentQ.prompt,
        correct: false,
        explanation: currentQ.explanation,
        pronounceText: currentQ.pronounceText,
      },
    ]);

    setTimeout(() => {
      if (playerHealthRef.current <= 0) {
        setIsGameOver(true);
        return;
      }
      if (round + 1 < questions.length) {
        setRound((r) => r + 1);
      } else {
        setIsVictory(true);
        playVictoryFanfare();
      }
    }, 1300);
  }, [applyPlayerDamage, currentQ, isGameOver, isVictory, questions.length, round]);

  // Reload 6 bullets
  const handleReload = () => {
    if (isReloading || cylinderBullets === 6) return;
    setIsReloading(true);
    playRevolverCock();
    setTimeout(() => {
      setCylinderBullets(6);
      setIsReloading(false);
      playTick();
    }, 400);
  };

  // Player Shoots at Target (Auto-resolves to aimed/closest target if triggered via Space or Action Button)
  const handleFireAtTarget = (target?: SaloonTarget) => {
    if (isGameOver || isVictory || isReloading || isRoundResolvedRef.current) return;

    if (cylinderBullets <= 0) {
      playTick();
      setFeedbackMessage('⚠️ HẾT ĐẠN! Bấm [R] hoặc nút Nạp Đạn để nạp lại ổ 6 viên!');
      return;
    }

    setCylinderBullets((b) => b - 1);
    playGunshot();
    triggerMuzzleFlash();
    triggerScreenShake();

    let targetToShoot = target;
    if (!targetToShoot) {
      if (hoveredTargetId) {
        targetToShoot = targets.find((t) => t.id === hoveredTargetId && !t.isShattered);
      }
      if (!targetToShoot) {
        const available = targets.filter((t) => !t.isShattered);
        if (available.length > 0) {
          const { xPercent, yPercent } = crosshairPosRef.current;
          targetToShoot = available.reduce((best, curr) => {
            const distCurr = Math.hypot(curr.xPercent - xPercent, curr.yPercent - yPercent);
            const distBest = Math.hypot(best.xPercent - xPercent, best.yPercent - yPercent);
            return distCurr < distBest ? curr : best;
          });
        }
      }
    }

    if (!targetToShoot) {
      playRicochet();
      return;
    }

    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    isRoundResolvedRef.current = true;

    const reactionMs = Date.now() - roundStartTime;
    setReactionTimes((prev) => [...prev, reactionMs]);

    if (targetToShoot.isCorrect) {
      // Bottle shattered!
      setTargets((prev) =>
        prev.map((t) => (t.id === targetToShoot!.id ? { ...t, isShattered: true } : t))
      );

      const newCombo = combo + 1;
      playComboStreak(newCombo);
      const speedBonus = Math.max(0, Math.round((5500 - reactionMs) / 20));
      const gained = 200 + speedBonus + Math.min(newCombo, 5) * 50;

      // Damage bandit boss visibly
      const damageAmount = Math.max(12, Math.ceil(100 / questions.length));
      applyOutlawDamage(damageAmount);

      setScore((s) => s + gained);
      setCombo(newCombo);
      setMaxCombo((m) => Math.max(m, newCombo));

      setFloatingScore({
        text: `🎯 BẮN TRÚNG! +${gained} PTS (${(reactionMs / 1000).toFixed(2)}s)`,
        id: Date.now(),
        isDamage: false,
      });

      setReviewedItems((prev) => [
        ...prev,
        {
          word: currentQ.prompt,
          correct: true,
          explanation: currentQ.explanation,
          pronounceText: currentQ.pronounceText,
          timeMs: reactionMs,
        },
      ]);

      setFeedbackMessage(`🎯 BẮN TRÚNG MỤC TIÊU! "${targetToShoot.text}" (${(reactionMs / 1000).toFixed(2)}s)`);

      setTimeout(() => {
        if (round + 1 < questions.length) {
          setRound((r) => r + 1);
        } else {
          setOutlawHealth(0);
          outlawHealthRef.current = 0;
          setIsVictory(true);
          playVictoryFanfare();
        }
      }, 1200);
    } else {
      // Hit wrong target: Bandit shoots back!
      playRicochet();
      applyPlayerDamage(34, `💥 BẮN NHẦM BIA! Tên cướp nổ súng phản công! Đáp án đúng: "${currentQ.correctAnswerText}"`);

      setReviewedItems((prev) => [
        ...prev,
        {
          word: currentQ.prompt,
          correct: false,
          explanation: currentQ.explanation,
          pronounceText: currentQ.pronounceText,
          timeMs: reactionMs,
        },
      ]);

      setTimeout(() => {
        if (playerHealthRef.current <= 0) {
          setIsGameOver(true);
          return;
        }
        if (round + 1 < questions.length) {
          setRound((r) => r + 1);
        } else {
          setIsVictory(true);
          playVictoryFanfare();
        }
      }, 1300);
    }
  };

  // Direct DOM cursor positioning for zero-lag silky smooth 60 FPS aiming
  const handleArenaMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (crosshairRef.current) {
      crosshairRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    crosshairPosRef.current = {
      xPercent: Math.max(0, Math.min(100, (x / rect.width) * 100)),
      yPercent: Math.max(0, Math.min(100, (y / rect.height) * 100)),
    };
  };

  const handleArenaTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!arenaRef.current || !e.touches[0]) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    if (crosshairRef.current) {
      crosshairRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    crosshairPosRef.current = {
      xPercent: Math.max(0, Math.min(100, (x / rect.width) * 100)),
      yPercent: Math.max(0, Math.min(100, (y / rect.height) * 100)),
    };
  };

  // Keyboard shortcut: [R] to reload, [1, 2, 3, 4] to quick snap shot, [Space] to fire
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver || isVictory) return;
      if (e.key === 'r' || e.key === 'R') {
        handleReload();
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (targets[idx] && targets[idx].isPoppedUp && !targets[idx].isShattered) {
          handleFireAtTarget(targets[idx]);
        }
      } else if (e.code === 'Space') {
        handleFireAtTarget();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReload, isGameOver, isVictory, targets]);

  const correctCount = reviewedItems.filter((i) => i.correct).length;
  const fastestReflex = reactionTimes.length > 0 ? Math.min(...reactionTimes) : 0;

  if (isGameOver || isVictory) {
    return (
      <div className="relative w-full h-full min-h-screen flex items-center justify-center p-4 bg-stone-950/95 overflow-y-auto z-50">
        <WildWestDuel3DView
          phase="RESOLVED"
          hasMuzzleFlash={false}
          roundResult={isVictory ? 'hit' : 'miss'}
          round={round}
          playerHealth={playerHealth}
          outlawHealth={outlawHealth}
        />

        <div className="bg-stone-900/90 border border-amber-900/80 rounded-3xl p-6 sm:p-8 text-amber-50 max-w-2xl w-full shadow-2xl relative overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 z-10 my-auto">
          <div className="relative text-center space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400">
              {isVictory ? <Trophy size={48} className="animate-bounce" /> : <Skull size={48} />}
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-amber-200 tracking-tight">
              {isVictory ? '🎉 VÔ ĐỊCH BẮN SÚNG VIỄN TÂY!' : '💥 TÊN CƯỚP ĐÃ HẠ GỤC BẠN!'}
            </h3>

            <p className="text-stone-400 text-xs sm:text-sm max-w-md mx-auto">
              {isVictory
                ? 'Xạ thủ cự phách! Bạn đã bắn hạ trùm cướp và giải mã chính xác từng mục tiêu trong chớp mắt!'
                : 'Hãy rèn luyện thêm phản xạ ngắm bắn và từ vựng để quay lại trả đũa nhé!'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
              <div className="bg-stone-900/80 p-3 rounded-2xl border border-stone-800 text-center">
                <span className="text-xs text-stone-400 block font-medium">Điểm Arcade</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400">{score.toLocaleString()}</span>
              </div>
              <div className="bg-stone-900/80 p-3 rounded-2xl border border-stone-800 text-center">
                <span className="text-xs text-stone-400 block font-medium">Độ chính xác</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {reviewedItems.length > 0 ? Math.round((correctCount / reviewedItems.length) * 100) : 0}%
                </span>
              </div>
              <div className="bg-stone-900/80 p-3 rounded-2xl border border-stone-800 text-center">
                <span className="text-xs text-stone-400 block font-medium">Phản xạ nhanh nhất</span>
                <span className="text-xl sm:text-2xl font-black text-cyan-400">
                  {fastestReflex > 0 ? `${(fastestReflex / 1000).toFixed(2)}s` : '--'}
                </span>
              </div>
              <div className="bg-stone-900/80 p-3 rounded-2xl border border-stone-800 text-center">
                <span className="text-xs text-stone-400 block font-medium">Máu Xạ Thủ</span>
                <span className="text-xl sm:text-2xl font-black text-rose-400">{playerHealth}/100 HP</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  onFinish({
                    score,
                    combo: maxCombo,
                    correctCount,
                    totalCount: reviewedItems.length,
                    livesRemaining: lives,
                    fastestReflexMs: fastestReflex,
                  })
                }
                className="flex-1 py-3 px-5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-stone-950 font-black rounded-xl shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Trophy size={18} />
                <span>Kiểm Tra Huy Hiệu & Hoàn Tất</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="py-3 px-5 bg-stone-900 hover:bg-stone-800 text-stone-300 font-semibold rounded-xl border border-stone-800 cursor-pointer"
              >
                Chọn Game Khác
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-stone-950 text-amber-100 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Target size={28} />
        </div>
        <h3 className="text-xl font-bold text-amber-200">Không có dữ liệu kiến thức để chơi</h3>
        <p className="text-stone-400 text-sm max-w-md">
          Chưa có thẻ từ vựng hoặc ngữ pháp nào phù hợp. Vui lòng thêm dữ liệu vào kho thẻ trước khi tham gia đấu súng.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-200 font-semibold rounded-xl border border-stone-800 cursor-pointer"
        >
          Quay Lại
        </button>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-amber-300 bg-stone-950">
        Đang khởi tạo đấu trường Saloon...
      </div>
    );
  }

  return (
    <div
      ref={arenaRef}
      onMouseMove={handleArenaMouseMove}
      onTouchMove={handleArenaTouchMove}
      onClick={() => handleFireAtTarget()}
      className={`relative w-full h-full flex flex-col text-amber-50 select-none touch-none cursor-default md:cursor-none overflow-hidden transition-transform bg-stone-950 ${
        isScreenShaking ? 'game-screen-shake' : ''
      }`}
    >
      {/* 3D WebGL Three.js Western Duel Canyon & Revolver View */}
      <WildWestDuel3DView
        phase="DRAW"
        hasMuzzleFlash={hasMuzzleFlash}
        roundResult={null}
        round={round}
        playerHealth={playerHealth}
        outlawHealth={outlawHealth}
      />

      {/* Muzzle Flash & Damage Overlay */}
      {hasMuzzleFlash && (
        <div className="absolute inset-0 bg-amber-300/30 pointer-events-none z-40 muzzle-flash-effect" />
      )}
      {damageFlash && (
        <div className="absolute inset-0 bg-rose-600/35 pointer-events-none z-40 animate-in fade-in duration-75" />
      )}

      {/* Floating score / reaction time */}
      {floatingScore && (
        <div
          key={floatingScore.id}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none float-score-anim text-lg sm:text-2xl font-black ${
            floatingScore.isDamage
              ? 'text-rose-300 drop-shadow-[0_2px_16px_rgba(244,63,94,0.9)] bg-rose-950/90 px-4 py-2 rounded-2xl border-2 border-rose-500'
              : 'text-amber-300 drop-shadow-[0_2px_12px_rgba(245,158,11,0.9)]'
          }`}
        >
          {floatingScore.text}
        </div>
      )}

      {/* Zero-Lag DOM Revolver Crosshair with Smooth Transform */}
      <div
        ref={crosshairRef}
        className="absolute top-0 left-0 pointer-events-none z-50 -ml-5 -mt-5 will-change-transform hidden md:block"
        style={{ transform: 'translate3d(50%, 50%, 0)' }}
      >
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/50">
          <div className="w-2 h-2 rounded-full bg-amber-300" />
          <div className="w-full h-0.5 bg-amber-400/80 absolute" />
          <div className="h-full w-0.5 bg-amber-400/80 absolute" />
        </div>
      </div>

      {/* STREAMLINED TOP HUD */}
      <div className="px-3 sm:px-5 py-2 bg-stone-950/95 border-b border-amber-900/60 backdrop-blur-md z-20 shrink-0 safe-area-pt">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Round & Player / Outlaw HP */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="px-2 py-0.5 rounded-md bg-amber-600/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs">
              {round + 1}/{questions.length}
            </span>

            {/* Cowboy Health */}
            <div className="flex items-center gap-1.5 bg-stone-900 px-2 py-1 rounded-lg border border-amber-900/80 text-xs">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3].map((h) => (
                  <Heart
                    key={h}
                    size={12}
                    className={h <= lives ? 'text-rose-500 fill-rose-500' : 'text-stone-700'}
                  />
                ))}
              </div>
              <span className="font-mono font-bold text-[11px] tabular-nums text-amber-200">
                {playerHealth} HP
              </span>
            </div>

            {/* Outlaw Health */}
            <div className="hidden xs:flex items-center gap-1.5 bg-stone-900 px-2 py-1 rounded-lg border border-amber-900/80 text-xs">
              <Skull size={12} className="text-red-400" />
              <span className="font-mono text-[11px] text-red-300 tabular-nums">
                {outlawHealth}%
              </span>
            </div>
          </div>

          {/* Center Target Word (High Legibility, prominent - NO truncation) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[11px] uppercase tracking-wider text-amber-500 font-mono hidden md:inline shrink-0">Bắn hạ:</span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-100 tracking-wide break-words whitespace-normal">
              {currentQ.prompt}
            </span>
            {currentQ.promptVi && (
              <span className="text-xs text-amber-300/90 break-words whitespace-normal hidden lg:inline">
                ({currentQ.promptVi})
              </span>
            )}
          </div>

          {/* Right: Score, Sound & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {combo > 1 && (
              <span className="text-xs font-bold text-orange-400 hidden sm:inline">
                x{combo}
              </span>
            )}

            <div className="text-right">
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-400 tabular-nums">
                {score.toLocaleString()} đ
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleBGM}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  !isBgmMuted && !isMuted
                    ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
                title={isBgmMuted || isMuted ? 'Bật nhạc nền Viễn Tây' : 'Tắt nhạc nền'}
              >
                <Music size={14} />
              </button>
              <button
                type="button"
                onClick={toggleSound}
                className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer border border-stone-800"
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button
                type="button"
                onClick={toggleHardwareFullscreen}
                className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 transition-colors cursor-pointer border border-stone-800 hidden sm:block"
                title={isHardwareFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
              >
                {isHardwareFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold cursor-pointer border border-rose-500/20 transition-colors"
                title="Thoát trò chơi (Esc)"
              >
                <X size={14} />
                <span className="hidden sm:inline">Thoát</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Duel Countdown Gauge */}
      <div className="w-full h-1 bg-stone-900 overflow-hidden relative z-20">
        <div
          className={`h-full transition-all duration-75 ${
            timerProgress > 40 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'
          }`}
          style={{ width: `${timerProgress}%` }}
        />
      </div>

      {/* FEEDBACK BANNER (Non-intrusive) */}
      {feedbackMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-lg bg-stone-950/95 border border-amber-500/70 text-amber-200 text-xs sm:text-sm font-semibold shadow-lg animate-in zoom-in-95 max-w-[90%] text-center">
          {feedbackMessage}
        </div>
      )}

      {/* SALOON COMBAT ARENA WITH POP-UP TARGET CARDS */}
      <div className="flex-1 relative overflow-hidden z-10">
        {/* Soft background scrim for clear text contrast over 3D saloon */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/40 to-stone-950/80 pointer-events-none" />

        {/* PROMINENT DUEL TARGET BANNER - ALWAYS 100% VISIBLE WITHOUT ANY TRUNCATION */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-25 w-[94%] max-w-xl pointer-events-none">
          <div className="px-4 py-2 sm:py-2.5 rounded-2xl bg-stone-950/95 border border-amber-500/70 shadow-xl backdrop-blur-md text-center">
            <div className="text-[10px] sm:text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-0.5">
              <Target size={13} className="text-amber-400" />
              <span>Mục tiêu xạ thủ cần bắn hạ</span>
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black text-amber-100 whitespace-normal break-words leading-snug">
              {currentQ.prompt}
            </div>
            {currentQ.promptVi && (
              <div className="text-xs sm:text-sm text-amber-300/90 whitespace-normal break-words mt-0.5 font-medium">
                ({currentQ.promptVi})
              </div>
            )}
          </div>
        </div>

        {targets.map((target, idx) => {
          const theme = SALOON_BOTTLE_THEMES[idx % 4];
          const keyLabel = ['1', '2', '3', '4'][idx];

          if (target.isShattered) {
            return (
              <div
                key={target.id}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center"
                style={{ left: `${target.xPercent}%`, top: `${target.yPercent}%` }}
              >
                <div
                  className="w-12 h-12 rounded-full animate-ping mx-auto"
                  style={{ backgroundColor: `${theme.colorHex}40` }}
                />
                <span
                  className="text-xs font-bold font-mono block mt-1 drop-shadow"
                  style={{ color: theme.colorHex }}
                >
                  ✓ BẮN TRÚNG!
                </span>
              </div>
            );
          }

          const isLockedOn = hoveredTargetId === target.id;

          return (
            <div
              key={target.id}
              onClick={(e) => {
                e.stopPropagation();
                handleFireAtTarget(target);
              }}
              onMouseEnter={() => setHoveredTargetId(target.id)}
              onMouseLeave={() => setHoveredTargetId((cur) => (cur === target.id ? null : cur))}
              className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-150 ${
                isLockedOn ? 'scale-[1.04] z-30' : 'hover:scale-[1.02]'
              }`}
              style={{
                left: `${target.xPercent}%`,
                top: `${target.yPercent}%`,
              }}
            >
              <div
                className={`p-2.5 sm:p-3 rounded-xl border backdrop-blur-md shadow-md flex items-center gap-2 min-w-[140px] max-w-[280px] sm:max-w-[360px] text-left transition-all ${
                  isLockedOn
                    ? `${theme.activeBg} border-amber-400 ring-2 ring-amber-400/50`
                    : `${theme.bg} ${theme.border}`
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md ${theme.badge} flex items-center justify-center font-mono font-bold text-xs shrink-0`}
                >
                  {keyLabel}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`font-bold text-xs sm:text-sm block leading-snug break-words whitespace-normal ${theme.text}`}>
                    {target.text}
                  </span>
                  {target.subText && (
                    <span className={`text-[10px] block break-words whitespace-normal mt-0.5 ${theme.sub}`}>{target.subText}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE THUMB-FRIENDLY QUICK-SHOOT 2x2 GRID (Touch screens) */}
      <div className="p-2 bg-stone-950/95 border-t border-amber-900/60 grid grid-cols-2 gap-1.5 sm:hidden z-20">
        {targets.map((target, idx) => {
          const theme = SALOON_BOTTLE_THEMES[idx % 4];
          const num = idx + 1;
          const isHit = target.isShattered;
          return (
            <button
              key={target.id}
              type="button"
              disabled={isHit}
              onClick={(e) => {
                e.stopPropagation();
                handleFireAtTarget(target);
              }}
              className={`min-h-[46px] px-2 py-1.5 rounded-lg border text-left flex items-center gap-2 transition-all active:scale-[0.98] ${
                isHit
                  ? 'bg-stone-900/40 border-stone-800 text-stone-600 line-through opacity-40'
                  : `${theme.mobileBtn} shadow-xs`
              }`}
            >
              <span className={`w-5 h-5 rounded font-mono font-bold text-xs flex items-center justify-center shrink-0 ${theme.badge}`}>
                {num}
              </span>
              <span className="font-bold text-xs break-words whitespace-normal leading-snug flex-1">{target.text}</span>
            </button>
          );
        })}
      </div>

      {/* BOTTOM ACTION BAR (6-SHOT CYLINDER & RELOAD) */}
      <div className="p-2 sm:p-2.5 bg-stone-950/95 border-t border-amber-900/60 flex items-center justify-between gap-2 z-20 shrink-0 safe-area-pb">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cylinder Ammo Visualizer */}
          <div className="flex items-center gap-1 bg-stone-900 px-2 py-1 rounded-lg border border-amber-900/70">
            <span className="text-[10px] sm:text-xs font-mono font-bold text-amber-400 mr-1">ĐẠN:</span>
            {[1, 2, 3, 4, 5, 6].map((b) => (
              <div
                key={b}
                className={`w-2.5 h-2.5 rounded-full border transition-all ${
                  b <= cylinderBullets
                    ? 'bg-amber-400 border-amber-200 shadow-xs shadow-amber-400/60'
                    : 'bg-stone-800 border-stone-700 opacity-20'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            disabled={isReloading || cylinderBullets === 6}
            onClick={handleReload}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-semibold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              cylinderBullets === 0
                ? 'bg-amber-500 text-stone-950 border-amber-300 animate-bounce'
                : 'bg-stone-900 text-amber-300 border-amber-800/80 hover:bg-stone-800'
            }`}
          >
            <RotateCcw size={13} className={isReloading ? 'animate-spin' : ''} />
            <span>Nạp [R]</span>
          </button>

          <span className="text-xs text-stone-400 font-mono hidden sm:inline ml-1">
            Phím 1-4 hoặc Click để bắn bia
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleFireAtTarget()}
          className="min-h-[36px] py-1.5 px-4 sm:px-6 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] shrink-0"
        >
          <Target size={15} />
          <span>Bóp Cò</span>
        </button>
      </div>
    </div>
  );
};
