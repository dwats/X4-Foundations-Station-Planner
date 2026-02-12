import { useState, useRef, useEffect } from 'react';

interface InlineInputProps {
  label: string;
  value: string | number;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number;
  onSubmit: (value: string) => void;
}

export function InlineInput({ label, value, type = 'text', min, max, step, onSubmit }: InlineInputProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSubmit = () => {
    onSubmit(inputValue);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setInputValue(String(value));
          setEditing(true);
        }}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground rounded hover:bg-accent transition-colors text-left"
      >
        <span>{label}</span>
        <span className="text-muted-foreground font-mono text-xs truncate max-w-[100px]">
          {value}
        </span>
      </button>
    );
  }

  return (
    <div className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        ref={inputRef}
        type={type}
        min={min}
        max={max}
        step={step}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') setEditing(false);
        }}
        onBlur={handleSubmit}
        className="w-full mt-1 px-2 py-1 text-sm rounded border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
