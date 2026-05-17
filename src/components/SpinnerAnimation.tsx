import { useState, useEffect, useRef } from 'react';

interface SpinnerAnimationProps {
  names: string[];
  winnerId: string;
  winnerName: string;
  onComplete: () => void;
}

export default function SpinnerAnimation({
  names,
  winnerName,
  onComplete,
}: SpinnerAnimationProps) {
  const [displayName, setDisplayName] = useState(names[0] || '');
  const [phase, setPhase] = useState<'spinning' | 'slowing' | 'done'>('spinning');
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    const startTime = Date.now();
    const totalDuration = 4000;
    const slowStart = 2000;
    let idx = 0;

    const step = () => {
      if (cancelled.current) return;

      const elapsed = Date.now() - startTime;

      if (elapsed >= totalDuration) {
        setDisplayName(winnerName);
        setPhase('done');
        return;
      }

      idx = (idx + 1) % names.length;
      setDisplayName(names[idx]);

      let delay = 50;
      if (elapsed > slowStart) {
        setPhase('slowing');
        const progress = (elapsed - slowStart) / (totalDuration - slowStart);
        delay = 50 + progress * progress * 500;
      }

      setTimeout(step, delay);
    };

    setTimeout(step, 50);
    return () => { cancelled.current = true; };
  }, [names, winnerName]);

  useEffect(() => {
    if (phase === 'done') {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div
        className={`text-4xl md:text-5xl font-bold px-8 py-6 rounded-2xl transition-all duration-200 min-w-[280px] text-center
          ${phase === 'done'
            ? 'bg-green-100 text-green-700 scale-110 shadow-lg shadow-green-200/50'
            : phase === 'slowing'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-gray-100 text-gray-700'
          }`}
      >
        {displayName}
      </div>

      {phase !== 'done' && (
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {phase === 'done' && (
        <div className="text-center space-y-2">
          <p className="text-2xl">🎉</p>
          <p className="text-lg font-semibold text-green-700">
            {winnerName} picks the next trip!
          </p>
        </div>
      )}
    </div>
  );
}
