interface InlineSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export function InlineSelect({ label, value, options, onChange }: InlineSelectProps) {
  return (
    <div className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.value);
        }}
        className="w-full mt-1 px-2 py-1 text-sm rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
