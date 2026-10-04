import { useId, useState, type ReactNode } from 'react';

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

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`w-5 h-5 shrink-0 text-gray-400 transition-transform duration-300 motion-reduce:transition-none
        ${open ? 'rotate-180' : ''}`}
    >
      <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Expandable section that slides open (grid rows animate from 0fr to 1fr)
export function Disclosure({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center justify-between gap-3 py-1 text-left cursor-pointer group"
      >
        <span className="min-w-0">{summary}</span>
        <Chevron open={open} />
      </button>
      <div
        id={id}
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none
          ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className={`transition-opacity duration-300 motion-reduce:transition-none ${open ? 'opacity-100' : 'opacity-0'}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Round icon button that opens a link in a new tab (label shows as a hover hint and to screen readers)
export function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="w-9 h-9 shrink-0 rounded-full border border-gray-200 flex items-center justify-center text-(--guide)
                 hover:border-(--guide) hover:bg-(--guide)/5 transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="w-[18px] h-[18px]"
      >
        {children}
      </svg>
    </a>
  );
}

export const GlobeIcon = () => (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
  </>
);

export const MapPinIcon = () => (
  <>
    <circle cx="12" cy="11" r="3" />
    <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z" />
  </>
);

export const inputClass =
  'w-full px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all';
