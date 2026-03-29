import { useEffect, useRef } from 'react';

interface Props {
  score: number;
}

const CIRCUMFERENCE = 2 * Math.PI * 45; // ≈ 282.7

export default function ScoreCard({ score }: Props) {
  const displayRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);

  // Animate score counting up from 0
  useEffect(() => {
    const el = displayRef.current;
    const arc = arcRef.current;
    if (!el) return;
    const duration = 800;
    const start = performance.now();

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = eased * score;
      el!.textContent = String(Math.round(current));
      if (arc) {
        arc.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - current / 100));
      }
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }, [score]);

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
      {/* SVG Circular Gauge */}
      <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background track */}
        <circle
          className="text-surface-container-high"
          cx="50"
          cy="50"
          fill="none"
          r="45"
          stroke="currentColor"
          strokeWidth="8"
        />
        {/* Score arc */}
        <circle
          ref={arcRef}
          cx="50"
          cy="50"
          fill="none"
          r="45"
          stroke="url(#scoreGradient)"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
          strokeLinecap="round"
          strokeWidth="8"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#81ecff" />
            <stop offset="100%" stopColor="#a68cff" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center content */}
      <div className="text-center">
        <span
          ref={displayRef}
          className="font-headline text-7xl md:text-8xl font-black block leading-none"
        >
          0
        </span>
        <span className="font-label text-on-surface-variant tracking-[0.2em] text-sm uppercase">
          Neural Affinity
        </span>
      </div>
    </div>
  );
}
