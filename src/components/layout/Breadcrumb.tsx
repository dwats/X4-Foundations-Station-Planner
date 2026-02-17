import { useUIStore, usePlanStore } from '@/store';

export function Breadcrumb() {
  const viewMode = useUIStore((state) => state.viewMode);
  const activeStationId = useUIStore((state) => state.activeStationId);
  const exitStationView = useUIStore((state) => state.exitStationView);
  const plan = usePlanStore((state) => state.plan);

  const activeStation = plan.stations.find((s) => s.id === activeStationId);
  const sector = activeStation?.sectorId
    ? plan.sectors.find((s) => s.id === activeStation.sectorId)
    : null;

  if (viewMode === 'network') {
    return null;
  }

  return (
    <nav className="h-10 border-b border-border bg-muted/50 flex items-center px-4 text-sm">
      <button
        onClick={exitStationView}
        className="mr-2 p-1 rounded hover:bg-muted-foreground/10 transition-colors"
        aria-label="Back to sector view"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground hover:text-foreground"
        >
          <polyline points="10 12 6 8 10 4" />
        </svg>
      </button>
      <button
        onClick={exitStationView}
        className="text-primary hover:underline"
      >
        {plan.name}
      </button>
      {sector && (
        <>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-muted-foreground">{sector.name}</span>
        </>
      )}
      {activeStation && (
        <>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-foreground font-medium">{activeStation.name}</span>
        </>
      )}
    </nav>
  );
}
