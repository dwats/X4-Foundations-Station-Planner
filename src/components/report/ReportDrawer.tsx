import { useState } from 'react';
import { useUIStore } from '@/store';
import { NetworkSummary } from './NetworkSummary';
import { StationSummary } from './StationSummary';

type Tab = 'network' | 'stations';

export function ReportDrawer() {
  const reportOpen = useUIStore((state) => state.reportOpen);
  const setReportOpen = useUIStore((state) => state.setReportOpen);
  const [activeTab, setActiveTab] = useState<Tab>('network');

  if (!reportOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={() => setReportOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-96 bg-card border-l border-border shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Report</h2>
          <button
            onClick={() => setReportOpen(false)}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Close report"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('network')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'network'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Network Summary
          </button>
          <button
            onClick={() => setActiveTab('stations')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'stations'
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Per Station
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'network' ? <NetworkSummary /> : <StationSummary />}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          All values are per hour (3600 game seconds)
        </div>
      </div>
    </>
  );
}
