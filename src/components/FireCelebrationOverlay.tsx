import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Flame } from 'lucide-react';

export interface FireCelebrationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
  mode?: 'rank-defense' | 'streak' | 'rank-up';
  rankData?: any;
  targetCards?: number;
  reviewedCards?: number;
  startPercent?: number;
  newTier?: any;
  onOpenRankModal?: () => void;
}

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  life: number;
  maxLife: number;
  colorType: number; // 0: core (white-yellow), 1: body (orange), 2: flame edge (red), 3: spark ember
  swaySpeed: number;
  swayOffset: number;
}

export const FireCelebrationOverlay: React.FC<FireCelebrationOverlayProps> = ({
  isOpen,
  onClose,
  streakCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<FireParticle[]>([]);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Synthesize realistic fire whoosh & crackle with Web Audio API
  const playFireSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // 1. Fire ignite whoosh
      const bufferSize = Math.floor(ctx.sampleRate * 1.5);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.35);
      filter.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 1.5);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 1.6);
    } catch {
      // Audio might be blocked if user hasn't interacted
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsFadingOut(false);
      return;
    }

    setIsFadingOut(false);
    playFireSound();
  }, [isOpen, playFireSound]);

  // High-performance 60FPS particle flame physics loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const resize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    particlesRef.current = [];
    let time = 0;

    const render = () => {
      time += 1;
      ctx.clearRect(0, 0, width, height);

      const currentList = particlesRef.current;

      // Spawn new particles from bottom flame bed
      if (currentList.length < 180) {
        for (let i = 0; i < 5; i++) {
          const spawnX = width * 0.5 + (Math.random() - 0.5) * (width * 0.7);
          const spawnY = height + 15;
          const isSpark = Math.random() < 0.28;

          currentList.push({
            x: spawnX,
            y: spawnY,
            vx: (Math.random() - 0.5) * 3.2,
            vy: isSpark ? -(Math.random() * 9 + 4) : -(Math.random() * 10 + 5),
            size: isSpark ? Math.random() * 4.5 + 2 : Math.random() * 28 + 14,
            baseSize: isSpark ? Math.random() * 4.5 + 2 : Math.random() * 28 + 14,
            life: 0,
            maxLife: Math.random() * 50 + 35,
            colorType: isSpark ? 3 : Math.floor(Math.random() * 3),
            swaySpeed: Math.random() * 0.05 + 0.02,
            swayOffset: Math.random() * Math.PI * 2,
          });
        }
      }

      // Update and draw each fire particle
      for (let i = currentList.length - 1; i >= 0; i--) {
        const p = currentList[i];
        p.life += 1;
        p.y += p.vy;
        p.x += p.vx + Math.sin(time * p.swaySpeed + p.swayOffset) * 2.2;

        const progress = p.life / p.maxLife;

        if (p.colorType === 3) {
          p.size = p.baseSize * (1 - progress * 0.5);
          p.vy -= 0.035;
        } else {
          p.size = p.baseSize * (1 - progress * 0.85);
        }

        if (p.life >= p.maxLife || p.size <= 0.5 || p.y < -50) {
          currentList.splice(i, 1);
          continue;
        }

        const alpha = Math.max(0, 1 - progress);

        let gradColor1 = 'rgba(255, 255, 255, ';
        let gradColor2 = 'rgba(255, 200, 0, ';
        let gradColor3 = 'rgba(230, 40, 0, ';

        if (p.colorType === 0) {
          gradColor1 = 'rgba(255, 255, 255, ';
          gradColor2 = 'rgba(255, 230, 80, ';
          gradColor3 = 'rgba(255, 120, 0, ';
        } else if (p.colorType === 1) {
          gradColor1 = 'rgba(255, 230, 50, ';
          gradColor2 = 'rgba(255, 110, 0, ';
          gradColor3 = 'rgba(200, 20, 0, ';
        } else if (p.colorType === 2) {
          gradColor1 = 'rgba(255, 100, 0, ';
          gradColor2 = 'rgba(220, 30, 0, ';
          gradColor3 = 'rgba(80, 5, 0, ';
        } else {
          gradColor1 = 'rgba(255, 240, 180, ';
          gradColor2 = 'rgba(255, 140, 20, ';
          gradColor3 = 'rgba(255, 60, 0, ';
        }

        const gradient = ctx.createRadialGradient(
          p.x,
          p.y,
          0,
          p.x,
          p.y,
          Math.max(1, p.size)
        );
        gradient.addColorStop(0, `${gradColor1}${alpha})`);
        gradient.addColorStop(0.4, `${gradColor2}${alpha * 0.8})`);
        gradient.addColorStop(1, `${gradColor3}0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen]);

  // Lock body scroll while celebration is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      id="fire-celebration-container"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Dynamic Screen Fiery Vignette & Heat Glow */}
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_120px_40px_rgba(239,68,68,0.65),inset_0_-80px_160px_60px_rgba(245,158,11,0.8)] z-10" />

      {/* Fiery backdrop overlay */}
      <div
        className="fixed inset-0 bg-gradient-to-t from-orange-950/95 via-slate-950/85 to-black/85 backdrop-blur-xs z-10 cursor-pointer"
        onClick={onClose}
        title="Bấm để đóng"
      />

      {/* HTML5 Roaring Fire Canvas Particle System */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-20"
      />

      {/* Center Celebration Content: ONLY Glorious Flame & Simple, Clean Congrats */}
      <div className="relative z-30 flex flex-col items-center justify-center text-center max-w-sm w-full px-4 animate-fade-in space-y-4">
        {/* Glowing Flame Emblem */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 blur-2xl opacity-90 animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-rose-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-[0_0_55px_rgba(245,158,11,0.95)] border-2 border-amber-300">
            <Flame size={56} className="text-white fill-amber-100 drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)]" />
          </div>
        </div>

        {/* Clean, Non-cluttered Text */}
        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200 tracking-tight drop-shadow">
            Hoàn Thành Ôn Tập! 🔥
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed">
            Đã hoàn thành toàn bộ thẻ ôn hôm nay. Trí nhớ dài hạn đang được củng cố xuất sắc!
          </p>
          {streakCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold mt-1">
              <Flame size={14} className="fill-amber-400 text-amber-400" />
              <span>Chuỗi {streakCount} ngày liên tiếp</span>
            </div>
          )}
        </div>

        {/* Single Clean Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          Tuyệt Vời 🔥
        </button>
      </div>
    </div>,
    document.body
  );
};
