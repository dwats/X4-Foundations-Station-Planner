import { usePlanStore } from '@/store';
import type { PlanSector } from '@/types';

interface SectorPanelProps {
  sector: PlanSector;
}

export function SectorPanel({ sector }: SectorPanelProps) {
  const updateSector = usePlanStore((state) => state.updateSector);
  const removeSector = usePlanStore((state) => state.removeSector);
  const plan = usePlanStore((state) => state.plan);

  // Find stations in this sector
  const stationsInSector = plan.stations.filter(
    (s) => s.sectorId === sector.id
  );

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSector(sector.id, { name: e.target.value });
  };

  const handleSunlightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0 && value <= 500) {
      updateSector(sector.id, { sunlight: value });
    }
  };

  const handleDelete = () => {
    const stationCount = stationsInSector.length;
    const message =
      stationCount > 0
        ? `Delete sector "${sector.name}"? ${stationCount} station(s) will be unassigned.`
        : `Delete sector "${sector.name}"?`;

    if (confirm(message)) {
      removeSector(sector.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sector Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Sector Name
        </label>
        <input
          type="text"
          value={sector.name}
          onChange={handleNameChange}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Sunlight */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Sunlight
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={200}
            value={sector.sunlight}
            onChange={handleSunlightChange}
            className="flex-1"
          />
          <input
            type="number"
            min={0}
            max={500}
            value={sector.sunlight}
            onChange={handleSunlightChange}
            className="w-16 px-2 py-1 text-sm text-center rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Affects energy cell production for stations without sunlight override.
        </p>
      </div>

      {/* Stations in Sector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Stations ({stationsInSector.length})
        </label>
        {stationsInSector.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No stations in this sector. Drag stations into the sector to assign them.
          </p>
        ) : (
          <ul className="text-sm space-y-1">
            {stationsInSector.map((station) => (
              <li
                key={station.id}
                className="flex items-center justify-between px-2 py-1 rounded bg-muted/50"
              >
                <span className="text-foreground">{station.name}</span>
                <span className="text-xs text-muted-foreground">
                  {station.modules.length} modules
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Size info */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Size</label>
        <div className="text-xs text-muted-foreground font-mono">
          {Math.round(sector.size.width)} × {Math.round(sector.size.height)}
        </div>
        <p className="text-xs text-muted-foreground">
          Drag the corner handles to resize when selected.
        </p>
      </div>

      {/* Lock Position */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={sector.locked ?? false}
          onChange={(e) => updateSector(sector.id, { locked: e.target.checked })}
          className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
        />
        <span className="text-sm">Lock position</span>
      </label>

      {/* Position info */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Position</label>
        <div className="text-xs text-muted-foreground font-mono">
          x: {Math.round(sector.position.x)}, y: {Math.round(sector.position.y)}
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={handleDelete}
          className="w-full px-3 py-2 text-sm rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
        >
          Delete Sector
        </button>
      </div>
    </div>
  );
}
