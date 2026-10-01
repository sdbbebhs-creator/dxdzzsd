import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Music,
  Shield,
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  Crosshair,
  Sparkles,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight,
  Skull,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';
import { GameQuestion } from '../../utils/gameQuestions';
import {
  playLaserShot,
  playExplosion,
  playDamageBuzz,
  playVictoryFanfare,
  playComboStreak,
  isGameAudioMuted,
  setGameAudioMuted,
  startSpaceBGM,
  stopGameBGM,
  isGameBGMMuted,
  setGameBGMMuted,
} from '../../utils/gameAudio';
import { playAudioOrTTS } from '../../utils/audio';
import { SpaceShooter3DView } from './SpaceShooter3DView';

interface SpaceShooterGameProps {
  questions: GameQuestion[];
  onFinish: (result: {
    score: number;
    combo: number;
    correctCount: number;
    totalCount: number;
    livesRemaining: number;
  }) => void;
  onExit: () => void;
}

interface FallingAsteroid {
  id: string;
  text: string;
  subText?: string;
  isCorrect: boolean;
  x: number; // percentage 10% to 85%
  y: number; // percentage 10% to 85%
  speed: number;
  isHit: boolean;
  isWrongHit: boolean;
}

const ARCADE_SLOT_THEMES = [
  {
    name: 'Lane 1',
    border: 'border-cyan-500/70',
    ring: 'ring-cyan-400/40',
    bg: 'bg-slate-900/90',
    activeBg: 'bg-cyan-950/95',
    text: 'text-white',
    sub: 'text-slate-300',
    badge: 'bg-cyan-500 text-slate-950 font-bold',
    colorHex: '#06b6d4',
    mobileBtn: 'bg-slate-900/90 hover:bg-slate-800 border-cyan-500/50 text-white',
  },
  {
    name: 'Lane 2',
    border: 'border-emerald-500/70',
    ring: 'ring-emerald-400/40',
    bg: 'bg-slate-900/90',
    activeBg: 'bg-emerald-950/95',
    text: 'text-white',
    sub: 'text-slate-300',
    badge: 'bg-emerald-500 text-slate-950 font-bold',
    colorHex: '#10b981',
    mobileBtn: 'bg-slate-900/90 hover:bg-slate-800 border-emerald-500/50 text-white',
  },
  {
    name: 'Lane 3',
    border: 'border-amber-500/70',
    ring: 'ring-amber-400/40',
    bg: 'bg-slate-900/90',
    activeBg: 'bg-amber-950/95',
    text: 'text-white',
    sub: 'text-slate-300',
    badge: 'bg-amber-500 text-slate-950 font-bold',
    colorHex: '#f59e0b',
    mobileBtn: 'bg-slate-900/90 hover:bg-slate-800 border-amber-500/50 text-white',
  },
  {
    name: 'Lane 4',
    border: 'border-purple-500/70',
    ring: 'ring-purple-400/40',
    bg: 'bg-slate-900/90',
    activeBg: 'bg-purple-950/95',
    text: 'text-white',
    sub: 'text-slate-300',
    badge: 'bg-purple-500 text-white font-bold',
    colorHex: '#a855f7',
    mobileBtn: 'bg-slate-900/90 hover:bg-slate-800 border-purple-500/50 text-white',
  },
];

interface ActiveLaserBolt {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  colorHex: string;
}

export const SpaceShooterGame: React.FC<SpaceShooterGameProps> = ({
  questions,
  onFinish,
  onExit,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Responsive Health System with Ghost Damage Trail
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerHealthGhost, setPlayerHealthGhost] = useState(100);
  const playerHealthRef = useRef(100);
  playerHealthRef.current = playerHealth;

  const [bossHealth, setBossHealth] = useState(100);
  const [bossHealthGhost, setBossHealthGhost] = useState(100);
  const bossHealthRef = useRef(100);
  bossHealthRef.current = bossHealth;

  const [shields, setShields] = useState(3);
  const [isMuted, setIsMuted] = useState(isGameAudioMuted());
  const [isBgmMuted, setIsBgmMuted] = useState(isGameBGMMuted());
  const [isShooting, setIsShooting] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [floatingScore, setFloatingScore] = useState<{ text: string; id: number; isDamage?: boolean } | null>(null);

  // Ship and Asteroid Arcade States
  const [shipX, setShipX] = useState<number>(50);
  const shipXRef = useRef(50);
  shipXRef.current = shipX;

  const [asteroids, setAsteroids] = useState<FallingAsteroid[]>([]);
  const asteroidsRef = useRef<FallingAsteroid[]>([]);
  asteroidsRef.current = asteroids;

  const [laserBolts, setLaserBolts] = useState<ActiveLaserBolt[]>([]);
  const [targetedAsteroidId, setTargetedAsteroidId] = useState<string | null>(null);

  const [reviewedItems, setReviewedItems] = useState<
    Array<{ word: string; correct: boolean; explanation: string; pronounceText?: string }>
  >([]);

  const [isHardwareFullscreen, setIsHardwareFullscreen] = useState(false);

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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const isQuestionResolvedRef = useRef(false);

  const currentQ = questions[currentIndex];

  const triggerScreenShake = () => {
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), 320);
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
      startSpaceBGM();
    } else {
      stopGameBGM();
    }
  };

  // Background Music Lifecycle
  useEffect(() => {
    // Scroll window to top so the 3D canvas and HUD are immediately in full view
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (!isMuted && !isBgmMuted && !isGameOver && !isVictory) {
      startSpaceBGM();
    } else {
      stopGameBGM();
    }
    return () => {
      stopGameBGM();
    };
  }, [isGameOver, isVictory, isMuted, isBgmMuted]);

  // Sync ghost health trail for visual impact
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlayerHealthGhost(playerHealth);
    }, 400);
    return () => clearTimeout(timer);
  }, [playerHealth]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBossHealthGhost(bossHealth);
    }, 400);
    return () => clearTimeout(timer);
  }, [bossHealth]);

  // Spawn Asteroids when new question arrives
  useEffect(() => {
    if (isGameOver || isVictory || !currentQ) return;

    isQuestionResolvedRef.current = false;

    if (currentQ.pronounceText && currentQ.sourceType === 'vocab') {
      playAudioOrTTS(currentQ.audioUrl, currentQ.pronounceText);
    }

    setFeedbackMessage(null);
    setIsShooting(false);
    setLaserBolts([]);

    const lanePositions = [15, 38, 62, 85];
    const initialAsteroids: FallingAsteroid[] = currentQ.options.map((opt, idx) => ({
      id: opt.id,
      text: opt.text,
      subText: opt.subText,
      isCorrect: opt.isCorrect,
      x: lanePositions[idx % 4],
      y: 12 + (idx % 2 === 0 ? 0 : 7),
      speed: 0.10 + (idx % 2) * 0.02,
      isHit: false,
      isWrongHit: false,
    }));

    setAsteroids(initialAsteroids);
    asteroidsRef.current = initialAsteroids;
    setTargetedAsteroidId(null);
  }, [currentIndex, isGameOver, isVictory, currentQ]);

  // Damage Player function (pure, direct, with audio & screen effects)
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
    setShields(Math.ceil(nextHp / 34));

    setFloatingScore({
      text: `-${damageAmount} HP KHIÊN TỔN HẠI!`,
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

  // Damage Boss / Invader Fleet function
  const applyBossDamage = useCallback((damageAmount: number) => {
    const prevBoss = bossHealthRef.current;
    const nextBoss = Math.max(0, prevBoss - damageAmount);
    bossHealthRef.current = nextBoss;
    setBossHealth(nextBoss);
  }, []);

  // Handle Target Shot by player
  const handleShootAsteroid = useCallback(
    (targetAsteroid: FallingAsteroid) => {
      if (isShooting || isGameOver || isVictory || targetAsteroid.isHit || isQuestionResolvedRef.current) return;

      setIsShooting(true);
      playLaserShot();

      const targetIdx = Math.max(0, asteroidsRef.current.findIndex((a) => a.id === targetAsteroid.id));
      const theme = ARCADE_SLOT_THEMES[targetIdx % 4];

      const boltId = Date.now();
      setLaserBolts((prev) => [
        ...prev,
        {
          id: boltId,
          startX: shipXRef.current,
          startY: 86,
          targetX: targetAsteroid.x,
          targetY: targetAsteroid.y,
          colorHex: theme.colorHex,
        },
      ]);

      setTimeout(() => {
        setLaserBolts((prev) => prev.filter((b) => b.id !== boltId));

        if (targetAsteroid.isCorrect) {
          isQuestionResolvedRef.current = true;
          playExplosion();
          const newCombo = combo + 1;
          playComboStreak(newCombo);
          const comboBonus = Math.min(newCombo, 5) * 50;
          const gained = 200 + comboBonus;

          // Damage boss / invader fleet visibly
          const damageAmount = Math.max(12, Math.ceil(100 / questions.length));
          applyBossDamage(damageAmount);

          setScore((s) => s + gained);
          setCombo(newCombo);
          setMaxCombo((m) => Math.max(m, newCombo));

          setFloatingScore({
            text: `🎯 BẮN TRÚNG! +${gained} PTS · COMBO x${newCombo}!`,
            id: Date.now(),
            isDamage: false,
          });

          setAsteroids((prev) =>
            prev.map((a) => (a.id === targetAsteroid.id ? { ...a, isHit: true } : a))
          );

          setReviewedItems((prev) => [
            ...prev,
            {
              word: currentQ.prompt,
              correct: true,
              explanation: currentQ.explanation,
              pronounceText: currentQ.pronounceText,
            },
          ]);

          setFeedbackMessage(`🎯 BẮN TRÚNG! "${targetAsteroid.text}" chính xác!`);

          setTimeout(() => {
            if (currentIndex + 1 < questions.length) {
              setCurrentIndex((i) => i + 1);
            } else {
              setBossHealth(0);
              bossHealthRef.current = 0;
              setIsVictory(true);
              playVictoryFanfare();
            }
          }, 1100);
        } else {
          // Wrong target shot: Ship takes damage, health bar visibly decreases!
          setAsteroids((prev) =>
            prev.map((a) => (a.id === targetAsteroid.id ? { ...a, isWrongHit: true } : a))
          );

          applyPlayerDamage(34, `💥 BẮN NHẦM THIÊN THẠCH! Khiên chắn bị tổn hại -34 HP!`);
          setIsShooting(false);
        }
      }, 200);
    },
    [applyBossDamage, applyPlayerDamage, combo, currentIndex, currentQ, isGameOver, isShooting, isVictory, questions.length]
  );

  // Real-time Asteroid Falling Game Loop (Decoupled from heavy state updates for silky 60 FPS)
  useEffect(() => {
    if (isGameOver || isVictory) return;

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      let triggeredImpact = false;
      let impactedAsteroidPrompt = '';

      const updated = asteroidsRef.current.map((ast) => {
        if (ast.isHit) return ast;
        const nextY = ast.y + ast.speed * dt * 26;

        // Check if correct asteroid breached defense perimeter
        if (nextY >= 82 && ast.isCorrect && !ast.isHit && !isQuestionResolvedRef.current) {
          triggeredImpact = true;
          impactedAsteroidPrompt = currentQ?.correctAnswerText || '';
          return {
            ...ast,
            y: nextY,
            isHit: true,
          };
        }

        return {
          ...ast,
          y: nextY,
        };
      });

      asteroidsRef.current = updated;
      setAsteroids(updated);

      if (triggeredImpact && !isQuestionResolvedRef.current) {
        isQuestionResolvedRef.current = true;
        applyPlayerDamage(34, `⚠️ THIÊN THẠCH VA CHẠM KHIÊN! Đáp án đúng: "${impactedAsteroidPrompt}"`);

        setReviewedItems((rev) => [
          ...rev,
          {
            word: currentQ.prompt,
            correct: false,
            explanation: currentQ.explanation,
            pronounceText: currentQ.pronounceText,
          },
        ]);

        setTimeout(() => {
          if (currentIndex + 1 < questions.length) {
            setCurrentIndex((i) => i + 1);
          } else {
            setIsVictory(true);
            playVictoryFanfare();
          }
        }, 1300);
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [applyPlayerDamage, currentIndex, currentQ, isGameOver, isVictory, questions.length]);

  // Keyboard Steer & Fire
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver || isVictory) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setShipX((x) => Math.max(12, x - 8));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setShipX((x) => Math.min(88, x + 8));
      } else if (e.code === 'Space') {
        e.preventDefault();
        const available = asteroidsRef.current.filter((a) => !a.isHit);
        if (available.length > 0) {
          const closest = available.reduce((prev, curr) =>
            Math.abs(curr.x - shipXRef.current) < Math.abs(prev.x - shipXRef.current) ? curr : prev
          );
          handleShootAsteroid(closest);
        }
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const target = asteroidsRef.current[idx];
        if (target && !target.isHit) {
          handleShootAsteroid(target);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleShootAsteroid, isGameOver, isVictory]);

  // Mouse drag across arena
  const handleArenaMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * 100;
    setShipX(Math.max(10, Math.min(90, relativeX)));
  };

  // Touch drag for mobile phones & tablets
  const handleArenaTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
    setShipX(Math.max(10, Math.min(90, relativeX)));
  };

  const correctCount = reviewedItems.filter((i) => i.correct).length;

  if (isGameOver || isVictory) {
    return (
      <div className="relative w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950/95 overflow-y-auto z-50">
        <SpaceShooter3DView
          combo={combo}
          isShooting={false}
          shields={shields}
          playerHealth={playerHealth}
          bossHealth={bossHealth}
          isGameOver={isGameOver}
          isVictory={isVictory}
        />

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white max-w-2xl w-full shadow-2xl relative overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 z-10 my-auto">
          <div className="absolute inset-0 bg-radial from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative text-center space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-400">
              {isVictory ? <Trophy size={48} className="animate-bounce" /> : <Zap size={48} />}
            </div>

            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isVictory ? '🎉 CHIẾN HẠM TIÊU DIỆT HOÀN TOÀN HẠM ĐỘI ĐỊCH!' : '⚡ KHIÊN NĂNG LƯỢNG ĐÃ CẠN KIỆT!'}
            </h3>

            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
              {isVictory
                ? 'Xuất sắc! Bạn đã bắn hạ hạm đội thiên thạch và bảo vệ phi thuyền trọn vẹn!'
                : 'Chiến hạm bị trúng đạn thiên thạch! Hãy ngắm bắn chuẩn xác hơn trong lần xuất kích tới nhé.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block font-medium">Tổng điểm Arcade</span>
                <span className="text-xl sm:text-2xl font-black text-amber-400">{score.toLocaleString()}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block font-medium">Độ chính xác</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {reviewedItems.length > 0 ? Math.round((correctCount / reviewedItems.length) * 100) : 0}%
                </span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block font-medium">Combo cao nhất</span>
                <span className="text-xl sm:text-2xl font-black text-orange-400">x{maxCombo}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block font-medium">Khiên còn lại</span>
                <span className="text-xl sm:text-2xl font-black text-cyan-400">{shields}/3 ({playerHealth} HP)</span>
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
                    livesRemaining: shields,
                  })
                }
                className="flex-1 py-3 px-5 bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Trophy size={18} />
                <span>Kiểm Tra Huy Hiệu & Hoàn Tất</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl border border-slate-700 cursor-pointer"
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
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950 text-white space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Zap size={28} />
        </div>
        <h3 className="text-xl font-bold text-white">Không có dữ liệu kiến thức để chơi</h3>
        <p className="text-slate-400 text-sm max-w-md">
          Chưa có thẻ từ vựng hoặc ngữ pháp nào phù hợp. Vui lòng thêm dữ liệu vào kho thẻ trước khi tham chiến.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 cursor-pointer"
        >
          Quay Lại
        </button>
      </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8 text-slate-400 bg-slate-950">
        Đang chuẩn bị câu hỏi...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleArenaMouseMove}
      onTouchMove={handleArenaTouchMove}
      className={`relative w-full h-full flex flex-col select-none text-white overflow-hidden touch-none transition-transform bg-slate-950 ${
        isScreenShaking ? 'game-screen-shake' : ''
      }`}
    >
      {/* 3D WebGL Three.js Interactive Space Background View */}
      <SpaceShooter3DView
        combo={combo}
        isShooting={isShooting}
        shields={shields}
        playerHealth={playerHealth}
        bossHealth={bossHealth}
        isGameOver={isGameOver}
        isVictory={isVictory}
      />

      {/* Red Damage Flash Screen Effect */}
      {damageFlash && (
        <div className="absolute inset-0 bg-rose-600/25 pointer-events-none z-35 animate-in fade-in duration-75" />
      )}

      {/* Floating score animation & damage numbers */}
      {floatingScore && (
        <div
          key={floatingScore.id}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none float-score-anim text-lg sm:text-2xl font-black ${
            floatingScore.isDamage
              ? 'text-rose-300 drop-shadow-[0_2px_16px_rgba(244,63,94,0.9)] bg-rose-950/90 px-4 py-2 rounded-2xl border-2 border-rose-500'
              : 'text-amber-300 drop-shadow-[0_2px_12px_rgba(245,158,11,0.8)]'
          }`}
        >
          {floatingScore.text}
        </div>
      )}

      {/* Dynamic Laser Bolts fired from Ship with multi-color plasma glow */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
        <defs>
          <filter id="laser-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {laserBolts.map((bolt) => (
          <g key={bolt.id} filter="url(#laser-glow)">
            <line
              x1={`${bolt.startX}%`}
              y1={`${bolt.startY}%`}
              x2={`${bolt.targetX}%`}
              y2={`${bolt.targetY}%`}
              stroke={bolt.colorHex || '#38bdf8'}
              strokeWidth="7"
              strokeLinecap="round"
              opacity="0.9"
            />
            <line
              x1={`${bolt.startX}%`}
              y1={`${bolt.startY}%`}
              x2={`${bolt.targetX}%`}
              y2={`${bolt.targetY}%`}
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        ))}
      </svg>

      {/* COMPACT & STREAMLINED TOP HUD */}
      <div className="px-3 sm:px-5 py-2 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md z-20 shrink-0 safe-area-pt">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Index & Player / Boss HP */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs">
              {currentIndex + 1}/{questions.length}
            </span>

            {/* Compact Player HP */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-xs">
              <Shield size={13} className={playerHealth > 35 ? 'text-cyan-400' : 'text-rose-400 animate-pulse'} />
              <span className="font-mono font-bold text-[11px] tabular-nums text-slate-200">
                {playerHealth} HP
              </span>
              <div className="w-12 sm:w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    playerHealth > 50 ? 'bg-cyan-400' : playerHealth > 25 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${playerHealth}%` }}
                />
              </div>
            </div>

            {/* Boss HP */}
            <div className="hidden xs:flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-xs">
              <Crosshair size={13} className="text-purple-400" />
              <span className="font-mono text-[11px] text-purple-300 tabular-nums">
                {bossHealth}%
              </span>
              <div className="w-10 sm:w-14 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-200"
                  style={{ width: `${bossHealth}%` }}
                />
              </div>
            </div>
          </div>

          {/* Center Target Word (High Legibility, prominent - NO truncation) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-mono hidden md:inline shrink-0">Bắn hạ:</span>
            <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide break-words whitespace-normal">
              {currentQ.prompt}
            </span>
            {currentQ.promptVi && (
              <span className="text-xs text-slate-300 break-words whitespace-normal hidden lg:inline">
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
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title={isBgmMuted || isMuted ? 'Bật nhạc nền' : 'Tắt nhạc nền'}
              >
                <Music size={14} />
              </button>
              <button
                type="button"
                onClick={toggleSound}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700"
                title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button
                type="button"
                onClick={toggleHardwareFullscreen}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer border border-slate-700 hidden sm:block"
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

      {/* FEEDBACK BANNER (Non-intrusive) */}
      {feedbackMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-lg bg-slate-900/95 border border-cyan-500/60 text-cyan-200 text-xs sm:text-sm font-semibold shadow-lg animate-in zoom-in-95 max-w-[90%] text-center">
          {feedbackMessage}
        </div>
      )}

      {/* REAL-TIME 3D ARCADE COMBAT FIELD */}
      <div className="flex-1 relative overflow-hidden z-10">
        {/* Soft background scrim for clear text contrast over 3D stars */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/80 pointer-events-none" />

        {/* PROMINENT TARGET MISSION OBJECTIVE - ALWAYS 100% VISIBLE WITHOUT ANY TRUNCATION */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-25 w-[94%] max-w-xl pointer-events-none">
          <div className="px-4 py-2 sm:py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/60 shadow-xl backdrop-blur-md text-center">
            <div className="text-[10px] sm:text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-0.5">
              <Crosshair size={13} className="text-cyan-400" />
              <span>Mục tiêu cần tiêu diệt</span>
            </div>
            <div className="text-sm sm:text-base md:text-lg font-black text-white whitespace-normal break-words leading-snug">
              {currentQ.prompt}
            </div>
            {currentQ.promptVi && (
              <div className="text-xs sm:text-sm text-cyan-200/90 whitespace-normal break-words mt-0.5 font-medium">
                ({currentQ.promptVi})
              </div>
            )}
          </div>
        </div>

        {/* 4 Real-time Falling Asteroids with clean, high-contrast cards */}
        {asteroids.map((ast, idx) => {
          const theme = ARCADE_SLOT_THEMES[idx % 4];
          const keyLabel = ['1', '2', '3', '4'][idx];
          if (ast.isHit) {
            return (
              <div
                key={ast.id}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center"
                style={{ left: `${ast.x}%`, top: `${ast.y}%` }}
              >
                <div
                  className="w-12 h-12 rounded-full animate-ping mx-auto"
                  style={{ backgroundColor: `${theme.colorHex}40` }}
                />
                <span
                  className="text-xs font-bold font-mono block mt-1 drop-shadow"
                  style={{ color: theme.colorHex }}
                >
                  ✓ TRÚNG ĐÍCH
                </span>
              </div>
            );
          }

          const isTargeted = targetedAsteroidId === ast.id;

          return (
            <div
              key={ast.id}
              onClick={() => handleShootAsteroid(ast)}
              onMouseEnter={() => setTargetedAsteroidId(ast.id)}
              onMouseLeave={() => setTargetedAsteroidId((cur) => (cur === ast.id ? null : cur))}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-75 select-none ${
                ast.isWrongHit ? 'scale-95 opacity-40 ring-1 ring-rose-500' : 'hover:scale-[1.03]'
              }`}
              style={{
                left: `${ast.x}%`,
                top: `${ast.y}%`,
              }}
            >
              {/* Asteroid rock capsule */}
              <div
                className={`p-2.5 sm:p-3 rounded-xl border backdrop-blur-md shadow-md flex items-center gap-2 min-w-[140px] max-w-[280px] sm:max-w-[360px] transition-all ${
                  isTargeted
                    ? `${theme.activeBg} ${theme.border} ring-2 ${theme.ring} text-white`
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
                    {ast.text}
                  </span>
                  {ast.subText && (
                    <span className={`text-[10px] block break-words whitespace-normal mt-0.5 ${theme.sub}`}>{ast.subText}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Player Starfighter Ship at bottom of arena */}
        <div
          className="absolute bottom-3 sm:bottom-4 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none transition-all duration-75"
          style={{ left: `${shipX}%` }}
        >
          {/* Aim beam guideline */}
          <div className="w-0.5 h-10 sm:h-14 bg-gradient-to-t from-cyan-400/50 to-transparent" />

          {/* Starfighter visual */}
          <div className="relative">
            <div
              className={`w-10 h-8 sm:w-12 sm:h-10 rounded-xl bg-slate-900 border-2 shadow-lg flex items-center justify-center transition-colors ${
                playerHealth <= 35
                  ? 'border-rose-500 text-rose-400'
                  : 'border-cyan-400 text-cyan-300'
              }`}
            >
              <Zap size={18} className={playerHealth <= 35 ? 'animate-pulse' : ''} />
            </div>

            {/* Thruster exhaust */}
            <div className="w-2.5 sm:w-3 h-3 sm:h-4 bg-gradient-to-b from-cyan-400 to-transparent rounded-full mx-auto mt-0.5" />
          </div>
        </div>
      </div>

      {/* MOBILE THUMB-FRIENDLY QUICK-FIRE GRID (Clear 2x2 grid on mobile screens) */}
      <div className="p-2 bg-slate-900/95 border-t border-slate-800 grid grid-cols-2 gap-1.5 sm:hidden z-20">
        {asteroids.map((ast, idx) => {
          const theme = ARCADE_SLOT_THEMES[idx % 4];
          const num = idx + 1;
          const isHit = ast.isHit;
          return (
            <button
              key={ast.id}
              type="button"
              disabled={isHit || isShooting}
              onClick={() => handleShootAsteroid(ast)}
              className={`min-h-[46px] px-2 py-1.5 rounded-lg border text-left flex items-center gap-2 transition-all active:scale-[0.98] ${
                isHit
                  ? 'bg-slate-900/40 border-slate-800 text-slate-600 line-through opacity-40'
                  : `${theme.mobileBtn} shadow-xs`
              }`}
            >
              <span className={`w-5 h-5 rounded font-mono font-bold text-xs flex items-center justify-center shrink-0 ${theme.badge}`}>
                {num}
              </span>
              <span className="font-bold text-xs break-words whitespace-normal leading-snug flex-1">{ast.text}</span>
            </button>
          );
        })}
      </div>

      {/* BOTTOM CONTROLS & MANUAL FIRE TRIGGER BAR */}
      <div className="p-2 sm:p-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-2 z-20 shrink-0 safe-area-pb">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShipX((x) => Math.max(14, x - 10))}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer border border-slate-700 min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Lái sang trái (Phím A / Mũi tên trái)"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShipX((x) => Math.min(86, x + 10))}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer border border-slate-700 min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Lái sang phải (Phím D / Mũi tên phải)"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline ml-1">
            Phím 1-4 hoặc Space để bắn
          </span>
        </div>

        {/* Primary Fire Button */}
        <button
          type="button"
          disabled={isShooting}
          onClick={() => {
            const available = asteroidsRef.current.filter((a) => !a.isHit);
            if (available.length > 0) {
              const closest = available.reduce((prev, curr) =>
                Math.abs(curr.x - shipXRef.current) < Math.abs(prev.x - shipXRef.current) ? curr : prev
              );
              handleShootAsteroid(closest);
            }
          }}
          className="min-h-[38px] py-2 px-4 sm:px-6 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] shrink-0"
        >
          <Zap size={15} fill="currentColor" />
          <span>Bắn Laser</span>
        </button>
      </div>
    </div>
  );
};
