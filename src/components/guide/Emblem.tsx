import { useId } from 'react';
import type { Emblem as EmblemName } from '../../types';

// Frond angles in degrees (0 = right, negative = up); left-side fronds are mirrored so they droop
const FRONDS = [-170, -140, -110, -80, -50, -15, 20, 160];

function Palmetto() {
  return (
    <>
      <path d="M11.2 22.5C11.4 17 11.6 13 11.7 10.2h.6c.1 2.8.3 6.8.5 12.3z" />
      <g transform="translate(12 10)">
        {FRONDS.map((a) => (
          <path
            key={a}
            d="M0 0C3-1.6 6.5-1.2 9 1.2 6.2.3 3 .4 0 0z"
            transform={Math.abs(a) > 90 ? `rotate(${a}) scale(1 -1)` : `rotate(${a})`}
          />
        ))}
      </g>
    </>
  );
}

function Crescent() {
  const maskId = useId();
  return (
    <>
      <mask id={maskId}>
        <rect width="24" height="24" fill="white" />
        <circle cx="16" cy="8" r="8" fill="black" />
      </mask>
      <circle cx="11" cy="13" r="9" mask={`url(#${maskId})`} />
    </>
  );
}

export default function Emblem({ name, className }: { name: EmblemName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      {name === 'palmetto' ? <Palmetto /> : <Crescent />}
    </svg>
  );
}
