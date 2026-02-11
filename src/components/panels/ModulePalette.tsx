import { useState, useMemo } from 'react';
import { useGameDataStore, usePlanStore, useUIStore } from '@/store';

type ModuleCategory = 'production' | 'habitat' | 'storage';

const CATEGORY_INFO: Record<ModuleCategory, { label: string; icon: string }> = {
  production: { label: 'Production', icon: '🏭' },
  habitat: { label: 'Habitats', icon: '🏠' },
  storage: { label: 'Storage', icon: '📦' },
};

export function ModulePalette() {
  const gameData = useGameDataStore((state) => state.gameData);
  const addModule = usePlanStore((state) => state.addModule);
  const activeStationId = useUIStore((state) => state.activeStationId);
  const stations = usePlanStore((state) => state.plan.stations);

  const [expandedCategory, setExpandedCategory] = useState<ModuleCategory | null>('production');
  const [searchQuery, setSearchQuery] = useState('');

  // Get the active station to calculate next module position
  const activeStation = useMemo(
    () => stations.find((s) => s.id === activeStationId),
    [stations, activeStationId]
  );

  // Filter modules by search query
  const filteredModules = useMemo(() => {
    if (!gameData) return { production: [], habitat: [], storage: [] };

    const query = searchQuery.toLowerCase();

    const filterByName = <T extends { name: string }>(modules: Record<string, T>) =>
      Object.values(modules).filter((m) =>
        m.name.toLowerCase().includes(query)
      );

    return {
      production: filterByName(gameData.modules.production),
      habitat: filterByName(gameData.modules.habitat),
      storage: filterByName(gameData.modules.storage),
    };
  }, [gameData, searchQuery]);

  const handleAddModule = (blueprintId: string) => {
    if (!activeStationId || !activeStation) return;

    // Calculate position for new module (grid layout)
    const existingCount = activeStation.modules.length;
    const col = existingCount % 3;
    const row = Math.floor(existingCount / 3);
    const position = {
      x: col * 220 + 50,
      y: row * 150 + 50,
    };

    addModule(activeStationId, blueprintId, position);
  };

  const toggleCategory = (category: ModuleCategory) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  if (!gameData) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading modules...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Categories */}
      {(Object.keys(CATEGORY_INFO) as ModuleCategory[]).map((category) => {
        const { label, icon } = CATEGORY_INFO[category];
        const modules = filteredModules[category];
        const isExpanded = expandedCategory === category;

        return (
          <div key={category} className="border border-border rounded-md overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span>{icon}</span>
                {label}
                <span className="text-xs text-muted-foreground">({modules.length})</span>
              </span>
              <span className="text-muted-foreground">{isExpanded ? '−' : '+'}</span>
            </button>

            {/* Module list */}
            {isExpanded && (
              <div className="max-h-48 overflow-y-auto">
                {modules.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    No modules found
                  </p>
                ) : (
                  modules.map((module) => (
                    <button
                      key={module.id}
                      onClick={() => handleAddModule(module.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors border-t border-border flex items-center justify-between group"
                    >
                      <span className="text-foreground truncate">{module.name}</span>
                      <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        + Add
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        Click a module to add it to the station.
      </p>
    </div>
  );
}
