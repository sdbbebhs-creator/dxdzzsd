import React, { useId } from 'react';
import { RankTierKey } from '../types';
import { getRankTierByKey } from '../utils/rankSystem';

/** Metal/gem palette per tier: [highlight, base, shadow]. */
const MATERIALS: Record<RankTierKey, [string, string, string]> = {
  wood: ['#d6d3d1', '#78716c', '#292524'],
  bronze: ['#fbd5ae', '#c2733b', '#5a2a0c'],
  silver: ['#ffffff', '#a3b1c6', '#334155'],
  gold: ['#fff7c2', '#eab308', '#854d0e'],
  platinum: ['#d5fbf1', '#2dd4bf', '#0b4f4a'],
  diamond: ['#e0edff', '#5b9cf8', '#172f73'],
  master: ['#ffd4dc', '#e11d48', '#4c0519'],
  challenger: ['#fff1b8', '#f59e0b', '#4c1d95'],
};

/** Notched, pointed battle shield. */
const SHIELD = 'M32 5 50.5 10.5 53 18 49.5 21.5V31c0 11.5-7.3 20.5-17.5 27C21.8 51.5 14.5 42.5 14.5 31v-9.5L11 18l2.5-7.5Z';
const SHIELD_INNER = 'M32 9.8 46.8 14.2 48.3 18.6 45.6 21.4V31c0 9.3-5.6 16.7-13.6 22.3C24 47.7 18.4 40.3 18.4 31v-9.6l-2.7-2.8 1.5-4.4Z';

interface RankEmblemProps {
  tierKey: RankTierKey;
  size?: number;
  className?: string;
  /** Dim the emblem for locked tiers in the roadmap. */
  muted?: boolean;
  /** Flames, aura and glow animations for the high tiers. */
  animated?: boolean;
}

/**
 * Rank crest drawn in SVG. It gets meaner with every tier:
 * spikes → blade wings → crossed swords → horns → dragon wings → flames + spiked crown → rotating aura.
 */
export const RankEmblem: React.FC<RankEmblemProps> = ({ tierKey, size = 48, className = '', muted = false, animated = true }) => {
  const uid = useId().replace(/:/g, '');
  const level = getRankTierByKey(tierKey).level;
  const [hi, base, shadow] = MATERIALS[tierKey];
  const metal = `rank-metal-${uid}`;
  const face = `rank-face-${uid}`;
  const steel = `rank-steel-${uid}`;
  const gold = `rank-gold-${uid}`;
  const flame = `rank-flame-${uid}`;
  const halo = `rank-halo-${uid}`;
  const live = animated && !muted;

  const chevron = (y: number) => (
    <path
      key={y}
      d={`M23.5 ${y + 6} 32 ${y} 40.5 ${y + 6}`}
      fill="none"
      stroke="#fff"
      strokeWidth="3.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
  );
  const star = (r: number, points: number, inner: number) => {
    const pts: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const rad = (Math.PI / points) * i - Math.PI / 2;
      const len = i % 2 === 0 ? r : r * inner;
      pts.push(`${(32 + Math.cos(rad) * len).toFixed(2)},${(30 + Math.sin(rad) * len).toFixed(2)}`);
    }
    return <polygon points={pts.join(' ')} fill="#fff" stroke={shadow} strokeOpacity="0.35" strokeWidth="0.6" strokeLinejoin="miter" />;
  };
  const gem = (fill: string) => (
    <g>
      <path d="M32 18 42 28 32 43 22 28Z" fill={fill} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M22 28h20M32 18 27.5 28 32 43l4.5-15Z" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M32 18 27.5 28H22Z" fill="#fff" opacity="0.55" />
    </g>
  );

  let glyph: React.ReactNode;
  if (level <= 3) glyph = <g>{Array.from({ length: level }, (_, i) => chevron(27 - (level - 1) * 3.5 + i * 7))}</g>;
  else if (level === 4) glyph = star(11, 4, 0.3);
  else if (level === 5) glyph = <g>{star(11.5, 8, 0.42)}<circle cx="32" cy="30" r="14" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="3 2" /></g>;
  else if (level === 6) glyph = gem('#fff');
  else glyph = gem(`url(#${gold})`);

  // Skull-like fangs under the gem for the top two tiers
  const fangs = level >= 7 && (
    <path d="M26.5 44.5 28 49.5 29.5 45.3M34.5 45.3 36 49.5 37.5 44.5" fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="miter" />
  );

  const shoulderSpike = <path d="M13.5 11 5 4.5 15.5 9.5Z M11.5 19 3 20 12 22.5Z" fill={`url(#${steel})`} stroke={shadow} strokeWidth="0.8" strokeLinejoin="miter" />;
  const bladeWing = (
    <g fill={`url(#${metal})`} stroke={shadow} strokeWidth="0.9" strokeLinejoin="miter">
      <path d="M14.5 21 -1 12.5 14.5 27Z" />
      <path d="M14.5 27.5 -3 26 14.8 33Z" />
      <path d="M15.5 34 0 39.5 17 39Z" />
    </g>
  );
  const dragonWing = (
    <g>
      <path
        d="M15 17C9 9.5 2 6 -6 4.5c1.5 6 .8 11.5-2.5 17 4-.8 7.2 0 9.5 2.3-3.4 2.4-5 6-5.5 10.2 3.8-2 7.6-2.4 11-1-2 3.2-2.4 6.6-1.4 10.2 2.4-3.6 5.6-5.6 10.3-6.3Z"
        fill={`url(#${metal})`}
        stroke={shadow}
        strokeWidth="1"
        strokeLinejoin="miter"
      />
      <path d="M15 17-6 4.5M15 24 -8.5 21.5M15.5 31 -4.5 34M16 37 5.1 42.9" fill="none" stroke={shadow} strokeOpacity="0.6" strokeWidth="0.9" />
    </g>
  );
  const horn = (
    <path
      d="M17.5 11.5C11 9.5 6.5 4 6.5 -5c3.3 5 7.7 8 13.5 9.5Z"
      fill={`url(#${steel})`}
      stroke={shadow}
      strokeWidth="1"
      strokeLinejoin="round"
    />
  );
  const sword = (angle: number) => (
    <g transform={`rotate(${angle} 32 30)`}>
      <path d="M32 -4 34.4 1V46h-4.8V1Z" fill={`url(#${steel})`} stroke="#1f2937" strokeWidth="0.8" strokeLinejoin="miter" />
      <path d="M32 -2V45" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.6" />
      <path d="M23 46h18l-2 3H25Z" fill={`url(#${gold})`} stroke="#78350f" strokeWidth="0.7" />
      <rect x="30.4" y="49" width="3.2" height="7" fill="#3f1d0b" />
      <circle cx="32" cy="57.6" r="2.3" fill={`url(#${gold})`} stroke="#78350f" strokeWidth="0.7" />
    </g>
  );
  const flameTongue = (x: number, y: number, s: number, rot: number, i: number) => (
    <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path
        d="M0 0C-6-4-6-12-1-20c0 5 2 6 3.5 5C2 -9 7 -8 5 -2 4 0 2 1 0 0Z"
        fill={`url(#${flame})`}
        className={live ? 'rank-flame-flicker' : undefined}
        style={live ? { animationDelay: `${i * -0.23}s` } : undefined}
      />
    </g>
  );
  const flames = [
    [32, 10, 1.25, 0],
    [22, 12, 1, -22],
    [42, 12, 1, 22],
    [14, 20, 0.85, -48],
    [50, 20, 0.85, 48],
    [15, 42, 0.8, -110],
    [49, 42, 0.8, 110],
  ].map(([x, y, s, r], i) => flameTongue(x, y, s, r, i));

  const glowColor = level >= 8 ? '#fbbf24' : base;

  return (
    <svg
      width={size}
      height={size}
      viewBox="-10 -10 84 84"
      aria-hidden="true"
      className={`${muted ? 'grayscale opacity-45' : ''} ${live && level >= 7 ? 'rank-glow-pulse' : ''} ${className}`}
      style={
        {
          overflow: 'visible',
          '--rank-glow': glowColor,
          filter: !live && level >= 6 && !muted ? `drop-shadow(0 0 3px ${glowColor})` : undefined,
        } as React.CSSProperties
      }
    >
      <defs>
        <linearGradient id={metal} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={hi} />
          <stop offset="0.45" stopColor={base} />
          <stop offset="1" stopColor={shadow} />
        </linearGradient>
        <linearGradient id={face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={base} />
          <stop offset="1" stopColor={shadow} />
        </linearGradient>
        <linearGradient id={steel} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id={gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef3a3" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={flame} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={level >= 8 ? '#a855f7' : '#dc2626'} />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#fde047" />
        </linearGradient>
        <radialGradient id={halo}>
          <stop offset="0.3" stopColor={hi} stopOpacity="0.85" />
          <stop offset="1" stopColor={base} stopOpacity="0" />
        </radialGradient>
      </defs>

      {level >= 8 && (
        <g>
          <circle cx="32" cy="31" r="40" fill={`url(#${halo})`} />
          <g>
            {live && <animateTransform attributeName="transform" type="rotate" from="0 32 31" to="360 32 31" dur="16s" repeatCount="indefinite" />}
            {Array.from({ length: 16 }, (_, i) => (
              <path
                key={i}
                d={i % 2 === 0 ? 'M32 -9 34.2 5h-4.4Z' : 'M32 -3 33.3 6h-2.6Z'}
                fill={i % 2 === 0 ? hi : '#c4b5fd'}
                opacity="0.9"
                transform={`rotate(${i * 22.5} 32 31)`}
              />
            ))}
          </g>
        </g>
      )}

      {level >= 7 && <g>{flames}</g>}

      {level >= 4 && (
        <g>
          {sword(-40)}
          {sword(40)}
        </g>
      )}

      {level >= 6 ? (
        <g>
          {dragonWing}
          <g transform="translate(64 0) scale(-1 1)">{dragonWing}</g>
        </g>
      ) : (
        level >= 3 && (
          <g>
            {bladeWing}
            <g transform="translate(64 0) scale(-1 1)">{bladeWing}</g>
          </g>
        )
      )}

      {level >= 5 ? (
        <g>
          {horn}
          <g transform="translate(64 0) scale(-1 1)">{horn}</g>
        </g>
      ) : (
        level >= 2 && (
          <g>
            {shoulderSpike}
            <g transform="translate(64 0) scale(-1 1)">{shoulderSpike}</g>
          </g>
        )
      )}

      {/* Bottom spike */}
      {level >= 2 && <path d="M28.5 55 32 64.5 35.5 55Z" fill={`url(#${steel})`} stroke={shadow} strokeWidth="0.8" strokeLinejoin="miter" />}

      {/* Shield body */}
      <path d={SHIELD} fill={`url(#${metal})`} stroke={shadow} strokeWidth="1.6" strokeLinejoin="miter" />
      <path d={SHIELD_INNER} fill={`url(#${face})`} />
      <path d={SHIELD_INNER} fill="none" stroke={hi} strokeOpacity={level >= 2 ? 0.75 : 0.35} strokeWidth="1" />
      {/* Battle scratches on the starting tier */}
      {level === 1 && <path d="M21 17 26 24M40 38 44 43M42 17.5 39.5 21" stroke={shadow} strokeOpacity="0.7" strokeWidth="1" strokeLinecap="round" />}
      {/* Rivets */}
      {level >= 2 &&
        [
          [16, 14.5],
          [48, 14.5],
          [21, 44],
          [43, 44],
        ].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" fill={hi} stroke={shadow} strokeWidth="0.5" />)}
      {/* Sheen */}
      <path d="M32 9.8 46.8 14.2 48.3 18.6 45.6 21.4V24C39 21 25 21 18.4 25.5v-4.1l-2.7-2.8 1.5-4.4Z" fill="#fff" opacity="0.16" />

      {glyph}
      {fangs}

      {level >= 7 && (
        <g>
          <path
            d="M19.5 10 16.5 -3 23.5 3.5 26.5 -8 32 0.5 37.5 -8 40.5 3.5 47.5 -3 44.5 10Z"
            fill={`url(#${gold})`}
            stroke="#78350f"
            strokeWidth="0.9"
            strokeLinejoin="miter"
          />
          <circle cx="32" cy="6" r="2" fill={level >= 8 ? '#a855f7' : '#e11d48'} stroke="#fff" strokeWidth="0.6" />
          <circle cx="24.5" cy="7" r="1.2" fill="#fff" />
          <circle cx="39.5" cy="7" r="1.2" fill="#fff" />
        </g>
      )}
    </svg>
  );
};
