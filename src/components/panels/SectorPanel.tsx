import { useState, useMemo, useRef, useEffect } from 'react';
import { usePlanStore, useGameDataStore } from '@/store';
import type { PlanSector } from '@/types';

interface SectorPanelProps {
  sector: PlanSector;
}

export function SectorPanel({ sector }: SectorPanelProps) {
  const updateSector = usePlanStore((state) => state.updateSector);
  const removeSector = usePlanStore((state) => state.removeSector);
  const plan = usePlanStore((state) => state.plan);
  const gameData = useGameDataStore((state) => state.gameData);

  const [inputValue, setInputValue] = useState(sector.name);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync inputValue when the sector prop changes (e.g. selected a different sector)
  useEffect(() => {
    setInputValue(sector.name);
  }, [sector.id, sector.name]);

  const allSectors = useMemo(() => {
    if (!gameData?.sectors) return [];
    return Object.values(gameData.sectors).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [gameData]);

  const filteredSectors = useMemo(() => {
    if (!inputValue.trim()) return allSectors.slice(0, 15);
    const query = inputValue.toLowerCase();
    return allSectors
      .filter((s) => s.name.toLowerCase().includes(query))
      .slice(0, 15);
  }, [allSectors, inputValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find stations in this sector
  const stationsInSector = plan.stations.filter(
    (s) => s.sectorId === sector.id
  );

  const handleSelectSector = (name: string, sunlight?: number) => {
    setInputValue(name);
    setIsDropdownOpen(false);
    setHighlightIndex(-1);
    const updates: Partial<PlanSector> = { name };
    if (sunlight !== undefined) {
      updates.sunlight = sunlight;
    }
    updateSector(sector.id, updates);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsDropdownOpen(true);
    setHighlightIndex(-1);
    updateSector(sector.id, { name: value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setHighlightIndex((prev) =>
        prev < filteredSectors.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filteredSectors.length) {
        const selected = filteredSectors[highlightIndex];
        handleSelectSector(selected.name, selected.sunlight);
      } else {
        // Check if current input matches a game sector exactly
        const match = allSectors.find(
          (s) => s.name.toLowerCase() === inputValue.toLowerCase()
        );
        if (match) {
          handleSelectSector(match.name, match.sunlight);
        } else {
          setIsDropdownOpen(false);
        }
      }
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.blur();
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('[data-sector-item]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

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
      <div className="space-y-1.5 relative">
        <label className="text-sm font-medium text-foreground">
          Sector Name
        </label>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          autoComplete="off"
        />
        {isDropdownOpen && filteredSectors.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-background shadow-md"
          >
            {filteredSectors.map((gameSector, index) => (
              <button
                key={gameSector.id}
                data-sector-item
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSector(gameSector.name, gameSector.sunlight);
                }}
                onMouseEnter={() => setHighlightIndex(index)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
                  index === highlightIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
              >
                <span className="truncate text-foreground">
                  {gameSector.name}
                </span>
                <span className="flex items-center gap-2 ml-2 shrink-0 text-xs text-muted-foreground">
                  {gameSector.owner && (
                    <span className="truncate max-w-[80px]">
                      {gameSector.owner}
                    </span>
                  )}
                  <span>{gameSector.sunlight}%</span>
                </span>
              </button>
            ))}
          </div>
        )}
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
