interface CountAdjusterProps {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}

export function CountAdjuster({ label, value, min = 1, onChange }: CountAdjusterProps) {
  return (
    <div className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (value > min) onChange(value - 1);
          }}
          disabled={value <= min}
          className="w-7 h-7 rounded border border-input bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          value={value}
          onChange={(e) => {
            e.stopPropagation();
            const v = parseInt(e.target.value, 10);
            if (!isNaN(v) && v >= min) onChange(v);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          className="w-14 px-2 py-1 text-sm text-center rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange(value + 1);
          }}
          className="w-7 h-7 rounded border border-input bg-background text-foreground hover:bg-accent transition-colors text-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}
