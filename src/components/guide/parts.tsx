import type { ReactNode } from 'react';

export function Tbd({ children = 'TBD' }: { children?: ReactNode }) {
  return <span className="text-gray-400 italic">{children}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 ${className}`}>{children}</div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{children}</p>
    </div>
  );
}

export const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all';
