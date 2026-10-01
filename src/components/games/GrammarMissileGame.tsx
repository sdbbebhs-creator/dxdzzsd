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
  Zap,
  Target,
  Rocket,
  RotateCcw,
  Sparkles,
  Award,
  AlertTriangle,
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
  playSuccessPing,
  playComboStreak,
  isGameAudioMuted,
  setGameAudioMuted,
  startMissileBGM,
  stopGameBGM,
  isGameBGMMuted,
  setGameBGMMuted,
} from '../../utils/gameAudio';
import { playAudioOrTTS } from '../../utils/audio';
import { MissileDefense3DView } from './MissileDefense3DView';

interface GrammarMissileGameProps {
  questions: GameQuestion[];
  onFinish: (result: {
    score: number;
    combo: number;
    correctCount: number;
    totalCount: number;
    cityHealthRemaining: number;
  }) => void;
  onExit: () => void;
}

const TACTICAL_SLOT_THEMES = [
  {
    name: 'Slot 1',
    colorHex: '#06b6d4',
    border: 'border-cyan-500/70',
    ring: 'ring-cyan-400/40',
    bg: 'bg-slate-900/90',
    activeBg: 'bg-cyan-950/95',
    badge: 'bg-cyan-500 text-slate-950 font-bold',
    text: 'text-white',
  },
  {
    name: 'Slot 2',
    colorHex: '#8b5cf6',
    border: 'border-violet-500/70',
    ring: 'ring-violet-400/40',
    bg: 'bg-slate-900/90',
    activeBg: 'bg-violet-950/95',
    badge: 'bg-violet-500 text-white font-bold',
    text: 'text-white',
  },
  {
    name: 'Slot 3',
    colorHex: '#10b981',
    border: 'border-emerald-500/70',
    ring: 'ring-emerald-400/40',
    bg: 'bg-slate-900/90',
    activeBg: 'bg-emerald-950/95',
    badge: 'bg-emerald-500 text-slate-950 font-bold',
    text: 'text-white',
  },
  {
    name: 'Slot 4',
    colorHex: '#f59e0b',
    border: 'border-amber-500/70',
    ring: 'ring-amber-400/40',
    bg: 'bg-slate-900/90',
    activeBg: 'bg-amber-950/95',
    badge: 'bg-amber-500 text-slate-950 font-bold',
    text: 'text-white',
  },
];

export const GrammarMissileGame: React.FC<GrammarMissileGameProps> = ({
  questions,
  onFinish,
  onExit,
}) => {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  // Responsive City Shield Health with Ghost Damage Trail
  const [cityHealth, setCityHealth] = useState(100);
  const [cityHealthGhost, setCityHealthGhost] = useState(100);
  const cityHealthRef = useRef(100);
  cityHealthRef.current = cityHealth;

  const [missileIntegrity, setMissileIntegrity] = useState(100);
  const [altitude, setAltitude] = useState(100);
  const altitudeRef = useRef(100);
  altitudeRef.current = altitude;

  const [isMuted, setIsMuted] = useState(isGameAudioMuted());
  const [isBgmMuted, setIsBgmMuted] = useState(isGameBGMMuted());
  const [isGameOver, setIsGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [floatingScore, setFloatingScore] = useState<{ text: string; id: number; isDamage?: boolean } | null>(null);

  // Tactical Syntax Assembly Mechanics: Slotted Module & Launch State
  const [slottedModuleId, setSlottedModuleId] = useState<string | null>(null);
  const [status, setStatus] = useState<'aiming' | 'intercepted' | 'detonated'>('aiming');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

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

  const descentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isQuestionResolvedRef = useRef(false);
  const currentQ = questions[index];

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
      startMissileBGM();
    } else {
      stopGameBGM();
    }
  };

  // Sync ghost health trail
  useEffect(() => {
    const timer = setTimeout(() => {
      setCityHealthGhost(cityHealth);
    }, 400);
    return () => clearTimeout(timer);
  }, [cityHealth]);

  // Missile Defense BGM Lifecycle
  useEffect(() => {
    // Scroll window to top so the 3D defense view and HUD are immediately visible
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (!isMuted && !isBgmMuted && !isGameOver && !isVictory) {
      startMissileBGM();
    } else {
      stopGameBGM();
    }
    return () => {
      stopGameBGM();
    };
  }, [isGameOver, isVictory, isMuted, isBgmMuted]);

  // Direct Damage City Shield function
  const applyCityDamage = useCallback((damageAmount: number, message: string) => {
    playDamageBuzz();
    triggerScreenShake();
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 300);
    setCombo(0);

    const prevHp = cityHealthRef.current;
    const nextHp = Math.max(0, prevHp - damageAmount);
    cityHealthRef.current = nextHp;
    setCityHealth(nextHp);

    setFloatingScore({
      text: `-${damageAmount} HP MÀN CHẮN CỨ ĐIỂM!`,
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

  // Missile Impacts City Shield
  const handleImpact = useCallback(() => {
    if (isQuestionResolvedRef.current || isGameOver || isVictory) return;
    isQuestionResolvedRef.current = true;

    playExplosion();
    setStatus('detonated');

    applyCityDamage(34, `💥 TÊN LỬA TẬP KÍCH CỨ ĐIỂM! Đáp án đúng: "${currentQ?.correctAnswerText}"`);

    if (currentQ) {
      setReviewedItems((prev) => [
        ...prev,
        {
          word: currentQ.prompt,
          correct: false,
          explanation: currentQ.explanation,
          pronounceText: currentQ.pronounceText,
        },
      ]);
    }

    setTimeout(() => {
      if (cityHealthRef.current <= 0) {
        setIsGameOver(true);
        return;
      }
      if (index + 1 < questions.length) {
        setIndex((i) => i + 1);
      } else {
        setIsVictory(true);
        playVictoryFanfare();
      }
    }, 1300);
  }, [applyCityDamage, currentQ, index, isGameOver, isVictory, questions.length]);

  // Missile descent loop (Clean timer without nested setState side effects)
  useEffect(() => {
    if (isGameOver || isVictory || !currentQ) return;

    isQuestionResolvedRef.current = false;
    setAltitude(100);
    altitudeRef.current = 100;
    setMissileIntegrity(100);
    setSlottedModuleId(null);
    setStatus('aiming');
    setFeedbackMessage(null);

    if (currentQ.pronounceText) {
      playAudioOrTTS(currentQ.audioUrl, currentQ.pronounceText);
    }

    if (descentTimerRef.current) clearInterval(descentTimerRef.current);
    const stepTime = 120; // ms

    descentTimerRef.current = setInterval(() => {
      const cur = altitudeRef.current;
      const next = cur - 1;
      altitudeRef.current = next;

      if (next <= 0) {
        if (descentTimerRef.current) clearInterval(descentTimerRef.current);
        setAltitude(0);
        handleImpact();
      } else {
        setAltitude(next);
      }
    }, stepTime);

    return () => {
      if (descentTimerRef.current) clearInterval(descentTimerRef.current);
    };
  }, [currentQ, handleImpact, index, isGameOver, isVictory]);

  // Launch SAM Interceptor with slotted module
  const handleLaunchSAM = useCallback((overrideModuleId?: string) => {
    if (status !== 'aiming' || isGameOver || isVictory || !currentQ || isQuestionResolvedRef.current) return;

    const activeModuleId = overrideModuleId || slottedModuleId;

    if (!activeModuleId) {
      setFeedbackMessage('⚠️ CHƯA NẠP MÃ! Hãy bấm chọn một khối cú pháp bên dưới để nạp vào ống phóng!');
      return;
    }

    const chosenOption = currentQ.options.find((o) => o.id === activeModuleId);
    const isCorrect = Boolean(chosenOption?.isCorrect);

    if (isCorrect) {
      isQuestionResolvedRef.current = true;
      if (descentTimerRef.current) clearInterval(descentTimerRef.current);

      playLaserShot();
      setStatus('intercepted');
      setMissileIntegrity(0);

      setTimeout(() => {
        playExplosion();
        playSuccessPing();
        triggerScreenShake();

        const newCombo = combo + 1;
        playComboStreak(newCombo);
        const altitudeBonus = Math.round(altitudeRef.current * 2.5);
        const gained = 200 + altitudeBonus + Math.min(newCombo, 5) * 50;

        setScore((s) => s + gained);
        setCombo(newCombo);
        setMaxCombo((m) => Math.max(m, newCombo));

        setFloatingScore({
          text: `🎯 ĐÁNH CHẶN THÀNH CÔNG! +${gained} PTS`,
          id: Date.now(),
          isDamage: false,
        });

        setFeedbackMessage(`🚀 PHÓNG TÊN LỬA SAM ĐÁNH CHẶN THÀNH CÔNG! "${chosenOption?.text}"`);

        setReviewedItems((prev) => [
          ...prev,
          {
            word: currentQ.prompt,
            correct: true,
            explanation: currentQ.explanation,
            pronounceText: currentQ.pronounceText,
          },
        ]);

        setTimeout(() => {
          if (index + 1 < questions.length) {
            setIndex((i) => i + 1);
          } else {
            setIsVictory(true);
            playVictoryFanfare();
          }
        }, 1200);
      }, 300);
    } else {
      // Wrong syntax code: Base takes collateral EMP damage and health bar depletes!
      applyCityDamage(25, `❌ SAI CÚ PHÁP! Màn chắn quá tải chịu -25 HP! Tên lửa đang lao xuống!`);

      // Penalty: Drops altitude by 20%
      const newAlt = Math.max(10, altitudeRef.current - 20);
      altitudeRef.current = newAlt;
      setAltitude(newAlt);
    }
  }, [applyCityDamage, combo, currentQ, index, isGameOver, isVictory, questions.length, slottedModuleId, status]);

  // Keyboard shortcut: 1, 2, 3, 4 to slot; Space/Enter to launch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGameOver || isVictory || !currentQ) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (currentQ.options[idx]) {
          setSlottedModuleId(currentQ.options[idx].id);
        }
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleLaunchSAM();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, handleLaunchSAM, isGameOver, isVictory]);

  const correctCount = reviewedItems.filter((i) => i.correct).length;
  const slottedOption = currentQ?.options.find((o) => o.id === slottedModuleId);

  if (isGameOver || isVictory) {
    return (
      <div className="relative w-full h-full min-h-screen flex items-center justify-center p-4 bg-slate-950/95 overflow-y-auto z-50">
        <MissileDefense3DView
          altitude={0}
          cityHealth={cityHealth}
          status={isVictory ? 'intercepted' : 'detonated'}
          combo={maxCombo}
        />

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white max-w-2xl w-full shadow-2xl relative overflow-hidden backdrop-blur-md animate-in fade-in zoom-in-95 duration-300 z-10 my-auto">
          <div className="absolute inset-0 bg-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative text-center space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 text-indigo-400">
              {isVictory ? <Trophy size={48} className="animate-bounce" /> : <Shield size={48} />}
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isVictory ? '🎉 CỨ ĐIỂM HOÀN TOÀN BẢO TOÀN!' : '⚡ MÀN CHẮN CỨ ĐIỂM ĐÃ SỤP ĐỔ!'}
            </h3>

            <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
              {isVictory
                ? 'Tất cả các tên lửa đạn đạo ICBM đã bị hệ thống phòng thủ đánh chặn từ xa!'
                : 'Màn chắn cứ điểm đã bị quá tải do tên lửa đánh trúng. Hãy nâng cấp phản xạ cú pháp nhé!'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block font-medium">Điểm Arcade</span>
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
                <span className="text-xl sm:text-2xl font-black text-indigo-400">x{maxCombo}</span>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 text-center">
                <span className="text-xs text-slate-400 block font-medium">Máu Cứ Điểm</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">{cityHealth}/100 HP</span>
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
                    cityHealthRemaining: cityHealth,
                  })
                }
                className="flex-1 py-3 px-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-500 hover:to-pink-400 text-white font-black rounded-xl shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
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
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Rocket size={28} />
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
        Đang chuẩn bị trận địa tên lửa...
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full flex flex-col text-white select-none touch-none overflow-hidden transition-transform bg-slate-950 ${
        isScreenShaking ? 'game-screen-shake' : ''
      }`}
    >
      {/* 3D WebGL Three.js Cyber Defense View */}
      <MissileDefense3DView
        altitude={altitude}
        cityHealth={cityHealth}
        status={status}
        combo={combo}
      />

      {/* Red Damage Flash Screen Effect */}
      {damageFlash && (
        <div className="absolute inset-0 bg-rose-600/30 pointer-events-none z-35 animate-in fade-in duration-75" />
      )}

      {/* Floating score / damage animation */}
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

      {/* STREAMLINED TOP HUD */}
      <div className="px-3 sm:px-5 py-2 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md z-20 shrink-0 safe-area-pt">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Round & Base Shield HP */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-mono font-bold text-xs">
              {index + 1}/{questions.length}
            </span>

            {/* Base Shield HP */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-xs">
              <Shield
                size={13}
                className={cityHealth > 35 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}
              />
              <span className="font-mono font-bold text-[11px] tabular-nums text-slate-200">
                {cityHealth} HP
              </span>
              <div className="w-12 sm:w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    cityHealth > 50 ? 'bg-emerald-400' : cityHealth > 25 ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${cityHealth}%` }}
                />
              </div>
            </div>

            {/* ICBM Altitude */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800 text-xs">
              <Rocket size={13} className="text-amber-400" />
              <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                {altitude * 100}m
              </span>
              <div className="w-10 sm:w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    altitude < 30 ? 'bg-rose-500 animate-pulse' : altitude < 60 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${altitude}%` }}
                />
              </div>
            </div>
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
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
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
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-lg bg-slate-900/95 border border-indigo-500/70 text-indigo-200 text-xs sm:text-sm font-semibold shadow-lg animate-in zoom-in-95 max-w-[90%] text-center">
          {feedbackMessage}
        </div>
      )}

      {/* CENTRAL BATTLEFIELD & QUESTION ARENA */}
      <div className="flex-1 flex flex-col justify-between p-3 sm:p-5 z-10 safe-area-pb overflow-y-auto">
        {/* Soft background scrim for clear text contrast over 3D defense */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/80 pointer-events-none" />

        {/* Central Grammar Prompt Card */}
        <div className="text-center space-y-2 max-w-2xl mx-auto w-full pt-1 relative z-10">
          <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-xl backdrop-blur-md">
            <span className="text-[11px] font-mono text-indigo-400 block mb-1">
              CÂU HỎI NGỮ PHÁP #{index + 1}
            </span>
            <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight leading-snug break-words whitespace-normal">
              {currentQ.prompt}
            </h2>
            {currentQ.promptVi && (
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 break-words whitespace-normal leading-relaxed">{currentQ.promptVi}</p>
            )}
          </div>
        </div>

        {/* 4 SYNTAX MODULE OPTIONS & SAM LAUNCH POD */}
        <div className="max-w-2xl mx-auto w-full bg-slate-900/95 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md space-y-2.5 relative z-10">
          {/* Options Grid (2x2 on all screens) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const theme = TACTICAL_SLOT_THEMES[idx % 4];
              const isSelected = slottedModuleId === opt.id;
              const keyLabel = ['1', '2', '3', '4'][idx];

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      handleLaunchSAM(opt.id);
                    } else {
                      setSlottedModuleId(opt.id);
                    }
                  }}
                  className={`min-h-[48px] h-auto p-2.5 sm:p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer active:scale-[0.98] ${
                    isSelected
                      ? `${theme.activeBg} ${theme.border} ring-2 ${theme.ring} text-white`
                      : `${theme.bg} border-slate-700/80 hover:border-slate-600 ${theme.text}`
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`w-6 h-6 rounded-md ${theme.badge} text-xs font-mono font-bold flex items-center justify-center shrink-0`}
                    >
                      {keyLabel}
                    </span>
                    <span className="font-bold text-xs sm:text-sm break-words whitespace-normal leading-snug flex-1">{opt.text}</span>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isSelected ? 'PHÓNG' : 'CHỌN'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Primary SAM Interceptor Launch Trigger */}
          <button
            type="button"
            disabled={status !== 'aiming'}
            onClick={() => handleLaunchSAM()}
            className={`w-full min-h-[42px] sm:min-h-[46px] py-2 px-4 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.98] ${
              slottedModuleId
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Rocket size={16} />
            <span>
              {slottedModuleId
                ? 'Phóng Tên Lửa SAM Đánh Chặn (Space)'
                : 'Chọn 1 mã cú pháp trên để phóng SAM'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
