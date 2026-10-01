interface LogoGlyphProps {
  size?: number;
  className?: string;
}

/** VocabBank mark: a stack of flashcards with a "V" on the front card. Renders in `currentColor`. */
export function LogoGlyph({ size = 20, className = '' }: LogoGlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="5" y="3" width="14" height="16" rx="3" fill="currentColor" opacity="0.35" transform="rotate(-12 12 11)" />
      <rect x="5" y="5" width="14" height="16" rx="3" fill="currentColor" />
      <path
        d="M8.75 9.75 12 16.25l3.25-6.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-600"
      />
    </svg>
  );
}
