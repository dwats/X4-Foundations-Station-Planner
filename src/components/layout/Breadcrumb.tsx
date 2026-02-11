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
