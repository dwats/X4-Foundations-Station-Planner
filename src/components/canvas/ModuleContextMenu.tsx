import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useGameDataStore, usePlanStore, useUIStore } from '@/store';

type ModuleCategory = 'production' | 'habitat' | 'storage';

const CATEGORY_INFO: Record<ModuleCategory, { label: string; icon: string }> = {
  production: { label: 'Production', icon: '🏭' },
  habitat: { label: 'Habitats', icon: '🏠' },
  storage: { label: 'Storage', icon: '📦' },
};

interface ModuleContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
}

export function ModuleContextMenu({ x, y, onClose }: ModuleContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const gameData = useGameDataStore((state) => state.gameData);
  const addModule = usePlanStore((state) => state.addModule);
  const removeModule = usePlanStore((state) => state.removeModule);
  const activeStationId = useUIStore((state) => state.activeStationId);
  const selectedNodeId = useUIStore((state) => state.selectedNodeId);
  const clearSelection = useUIStore((state) => state.clearSelection);
  const stations = usePlanStore((state) => state.plan.stations);

  const [expandedCategory, setExpandedCategory] = useState<ModuleCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Find selected module
  const activeStation = stations.find((s) => s.id === activeStationId);
  const selectedModule = activeStation?.modules.find((m) => m.id === selectedNodeId);

  // Filter modules by search query
  const searchResults = useMemo(() => {
    if (!gameData || !searchQuery.trim()) return null;

    const query = searchQuery.toLowerCase();
    const results: Array<{ id: string; name: string; category: ModuleCategory }> = [];

    (Object.keys(CATEGORY_INFO) as ModuleCategory[]).forEach((category) => {
      Object.values(gameData.modules[category]).forEach((module) => {
        if (module.name.toLowerCase().includes(query)) {
          results.push({ id: module.id, name: module.name, category });
        }
      });
    });

    return results.slice(0, 15); // Limit results
  }, [gameData, searchQuery]);

  // Auto-focus search input on mount
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddModule = useCallback(
    (e: React.MouseEvent, blueprintId: string) => {
      e.stopPropagation();
      if (!activeStationId) return;

      const position = screenToFlowPosition({ x, y });
      addModule(activeStationId, blueprintId, position);
      onClose();
    },
    [screenToFlowPosition, x, y, activeStationId, addModule, onClose]
  );

  const handleDeleteModule = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedModule && activeStationId) {
        removeModule(activeStationId, selectedModule.id);
        clearSelection();
      }
      onClose();
    },
    [selectedModule, activeStationId, removeModule, clearSelection, onClose]
  );

  if (!gameData) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[240px] max-w-[280px] rounded-md border border-border bg-popover shadow-lg"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="p-2">
        {/* Search input */}
        <input
          ref={searchRef}
          type="text"
          placeholder="Search modules..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="p-1 pt-0">
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
                          {module.name}
                        </button>
                      ))}
                      {modules.length > 20 && (
                        <p className="px-3 py-1.5 text-xs text-muted-foreground">
                          +{modules.length - 20} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Delete selected module */}
        {selectedModule && (
          <>
            <div className="my-1 h-px bg-border" />
            <button
              onClick={handleDeleteModule}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded hover:bg-destructive/10 transition-colors text-left"
            >
              <span className="text-lg leading-none">×</span>
              Delete Module
            </button>
          </>
        )}
      </div>
    </div>
  );
}
