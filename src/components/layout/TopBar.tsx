import { usePlanStore, useUIStore, Theme } from '@/store';

export function TopBar() {
  const plan = usePlanStore((state) => state.plan);
  const renamePlan = usePlanStore((state) => state.renamePlan);
  const toggleReport = useUIStore((state) => state.toggleReport);
  const reportOpen = useUIStore((state) => state.reportOpen);
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);

  const cycleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">X4 SWI Station Planner</h1>
        <span className="text-muted-foreground">|</span>
        <input
          type="text"
          value={plan.name}
          onChange={(e) => renamePlan(e.target.value)}
          className="bg-transparent border-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring rounded px-2 py-1"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
          title={`Theme: ${theme}`}
        >
          {theme === 'light' && '☀️'}
          {theme === 'dark' && '🌙'}
          {theme === 'system' && '💻'}
          <span className="text-xs">{theme.charAt(0).toUpperCase() + theme.slice(1)}</span>
        </button>
        <button
          onClick={toggleReport}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            reportOpen
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Report
        </button>
        <button className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          Export
        </button>
        <button className="px-3 py-1.5 text-sm rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          Import
        </button>
      </div>
    </header>
  );
}
