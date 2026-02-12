import { useState, useRef, useEffect, useMemo } from 'react';
import { useGameDataStore } from '@/store';

interface SectorNamePickerProps {
  value: string;
  onSelect: (name: string, sunlight?: number) => void;
}

export function SectorNamePicker({ value, onSelect }: SectorNamePickerProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const gameData = useGameDataStore((state) => state.gameData);

  const allSectors = useMemo(() => {
    if (!gameData?.sectors) return [];
    return Object.values(gameData.sectors).sort((a, b) => a.name.localeCompare(b.name));
  }, [gameData]);

  const filteredSectors = useMemo(() => {
    if (!inputValue.trim()) return allSectors.slice(0, 10);
    const query = inputValue.toLowerCase();
    return allSectors.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 10);
  }, [allSectors, inputValue]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setInputValue(value);
          setEditing(true);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground rounded hover:bg-accent transition-colors text-left"
      >
        <span>Change Name</span>
        <span className="text-muted-foreground text-xs truncate max-w-[100px]">{value}</span>
      </button>
    );
  }

  return (
    <div className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
      <label className="text-xs text-muted-foreground">Sector Name</label>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            // Check if matches a game sector
            const match = allSectors.find(
              (s) => s.name.toLowerCase() === inputValue.toLowerCase()
            );
            onSelect(match?.name ?? inputValue, match?.sunlight);
            setEditing(false);
          }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full mt-1 px-2 py-1 text-sm rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {filteredSectors.length > 0 && (
        <div className="mt-1 max-h-32 overflow-y-auto rounded border border-border bg-background">
          {filteredSectors.map((sector) => (
            <button
              key={sector.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(sector.name, sector.sunlight);
                setEditing(false);
              }}
              className="w-full flex items-center justify-between px-2 py-1 text-xs hover:bg-accent transition-colors text-left"
            >
              <span className="truncate text-foreground">{sector.name}</span>
              <span className="text-muted-foreground ml-1 shrink-0">{sector.sunlight}%</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
