import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGameDataStore, usePlanStore, useUIStore } from '@/store';
import { useLocale } from '@/hooks/useLocale';

type ModuleCategory = 'production' | 'habitat' | 'storage';

const CATEGORY_INFO: Record<ModuleCategory, { label: string; icon: string }> = {
  production: { label: 'Production', icon: '🏭' },
  habitat: { label: 'Habitats', icon: '🏠' },
  storage: { label: 'Storage', icon: '📦' },
};

export function StationPaneMenu() {
  const { screenToFlowPosition } = useReactFlow();
  const searchRef = useRef<HTMLInputElement>(null);

  const gameData = useGameDataStore((state) => state.gameData);
  const addModule = usePlanStore((state) => state.addModule);
  const activeStationId = useUIStore((state) => state.activeStationId);
  const contextMenu = useUIStore((state) => state.contextMenu);
  const closeContextMenu = useUIStore((state) => state.closeContextMenu);
  const { t } = useLocale();

  const [expandedCategory, setExpandedCategory] = useState<ModuleCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter modules by search query
  const searchResults = useMemo(() => {
    if (!gameData || !searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    const results: Array<{ id: string; name: string; category: ModuleCategory }> = [];

    (Object.keys(CATEGORY_INFO) as ModuleCategory[]).forEach((category) => {
      Object.values(gameData.modules[category]).forEach((module) => {
        if (t(module.name).toLowerCase().includes(query)) {
          results.push({ id: module.id, name: t(module.name), category });
        }
      });
    });

    return results.slice(0, 15);
  }, [gameData, searchQuery, t]);

  // Auto-focus search input on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleAddModule = useCallback(
    (e: React.MouseEvent, blueprintId: string) => {
      e.stopPropagation();
      if (!activeStationId || !contextMenu) return;
      const position = screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y });
      addModule(activeStationId, blueprintId, position);
      closeContextMenu();
    },
    [screenToFlowPosition, contextMenu, activeStationId, addModule, closeContextMenu]
  );

  if (!gameData) return null;

  return (
    <>
      {/* Search input */}
      <div className="p-2 pb-0">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="p-1 pt-1">
        {/* Search results */}
        {searchResults ? (
          <div className="max-h-64 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">No modules found</p>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={(e) => handleAddModule(e, result.id)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors text-left"
                >
                  <span>{CATEGORY_INFO[result.category].icon}</span>
                  <span className="truncate">{result.name}</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Category browser */}
            {(Object.keys(CATEGORY_INFO) as ModuleCategory[]).map((category) => {
              const { label, icon } = CATEGORY_INFO[category];
              const modules = Object.values(gameData.modules[category]);
              const isExpanded = expandedCategory === category;

              return (
                <div key={category}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCategory(isExpanded ? null : category);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground rounded hover:bg-accent transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span>{icon}</span>
                      {label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="ml-4 max-h-48 overflow-y-auto border-l border-border">
                      {modules.slice(0, 20).map((module) => (
                        <button
                          key={module.id}
                          onClick={(e) => handleAddModule(e, module.id)}
                          className="w-full px-3 py-1.5 text-sm text-foreground/80 hover:bg-accent hover:text-foreground transition-colors text-left truncate"
                        >
                          {t(module.name)}
                        </button>
                      ))}
                      {modules.length > 20 && (
                        <p className="px-3 py-1.5 text-xs text-muted-foreground">
                          +{modules.length - 20} more (use search)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
