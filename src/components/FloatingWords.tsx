import React from 'react';

const WORDS = [
  // Common vocabulary
  'make', 'take', 'get', 'because', 'important', 'however', 'decide', 'improve',
  'experience', 'opportunity', 'although', 'suggest', 'remember', 'already', 'enough', 'career',
  // Common grammar
  'present perfect', 'used to', 'if clause', 'passive voice', 'would rather', 'be going to',
  'too … to', 'not only … but also', 'so that', 'relative clause', 'had better', 'reported speech',
];

interface FloatingWordsProps {
  className?: string;
}

/** Decorative vocabulary words drifting upward behind content. Layout is deterministic so it doesn't jump between renders. */
export const FloatingWords: React.FC<FloatingWordsProps> = ({ className = '' }) => {
  const toneCls = 'text-emerald-800/[0.10] dark:text-emerald-200/[0.14]';

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}>
      {WORDS.map((word, i) => {
        const duration = 22 + ((i * 7) % 16); // 22–37s
        const style = {
          left: `${(i * 37 + 5) % 92}%`,
          fontSize: `${0.8 + ((i * 5) % 7) * 0.18}rem`,
          animationDuration: `${duration}s`,
          animationDelay: `-${((i * 13) % 100) / 100 * duration}s`,
          '--float-rest': `${(i * 29 + 8) % 90}%`,
          '--float-sway': `${i % 2 === 0 ? 1 : -1}.${(i * 3) % 9}rem`,
        } as React.CSSProperties;
        return (
          <span
            key={word}
            className={`floating-word absolute font-semibold tracking-tight whitespace-nowrap ${toneCls} ${i % 3 === 0 ? 'italic' : ''}`}
            style={style}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
