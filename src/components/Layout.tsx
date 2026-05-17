import type { ReactNode } from 'react';

type Tab = 'members' | 'trips' | 'selection';

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: ReactNode;
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'trips', label: 'Trips' },
  { key: 'selection', label: 'Selection' },
  { key: 'members', label: 'Members' },
];

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-4">
          <img
            src="/ugl-logo-badge.png"
            alt="UGL Logo"
            className="w-14 h-14 object-contain shrink-0"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              University Golf League
            </h1>
            <p className="text-sm text-green-600 font-medium tracking-wide mt-0.5">
              College Football. Average Golf. Unlimited Fireball.
            </p>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`px-5 py-3 text-sm font-medium transition-colors relative cursor-pointer
                  ${activeTab === tab.key
                    ? 'text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-green-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
