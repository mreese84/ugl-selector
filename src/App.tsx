import { useState, useRef } from 'react';
import { useAppState } from './store';
import Layout from './components/Layout';
import MembersTab from './components/MembersTab';
import TripsTab from './components/TripsTab';
import SelectionTab from './components/SelectionTab';

type Tab = 'members' | 'trips' | 'selection';

function AppContent() {
  const { exportData, importData } = useAppState();
  const [activeTab, setActiveTab] = useState<Tab>('trips');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ugl-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importData(ev.target?.result as string);
      } catch {
        alert('Invalid data file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'members' && <MembersTab />}
      {activeTab === 'trips' && <TripsTab />}
      {activeTab === 'selection' && <SelectionTab />}

      {/* Footer with data management */}
      <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
        <button onClick={handleExport} className="hover:text-green-600 transition-colors cursor-pointer">
          Export Data
        </button>
        <span>·</span>
        <button onClick={() => fileInputRef.current?.click()} className="hover:text-green-600 transition-colors cursor-pointer">
          Import Data
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
    </Layout>
  );
}

export default function App() {
  return <AppContent />;
}
