import type { Emblem as EmblemName } from '../../types';
import { EMBLEM_PATHS } from './emblemPaths';

// The emblem shapes are defined once per page (<EmblemDefs />) and referenced with <use>,
// since a guide can show the detailed palmetto dozens of times.
const symbolId = (name: EmblemName) => `ugl-emblem-${name}`;

export function EmblemDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        {(Object.keys(EMBLEM_PATHS) as EmblemName[]).map((name) => (
          <symbol key={name} id={symbolId(name)} viewBox={EMBLEM_PATHS[name].viewBox}>
            <path d={EMBLEM_PATHS[name].d} fillRule="evenodd" />
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

export default function Emblem({ name, className }: { name: EmblemName; className?: string }) {
  return (
    <svg fill="currentColor" aria-hidden="true" className={className}>
      <use href={`#${symbolId(name)}`} />
    </svg>
  );
}
