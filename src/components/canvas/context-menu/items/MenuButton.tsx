interface MenuButtonProps {
  label: string;
  icon?: string;
  variant?: 'default' | 'destructive';
  onClick: (e: React.MouseEvent) => void;
}

export function MenuButton({ label, icon, variant = 'default', onClick }: MenuButtonProps) {
  const baseClasses = 'w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left';
  const variantClasses =
    variant === 'destructive'
      ? 'text-destructive hover:bg-destructive/10'
      : 'text-foreground hover:bg-accent';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`${baseClasses} ${variantClasses}`}
    >
      {icon && <span className="text-lg leading-none">{icon}</span>}
      {label}
    </button>
  );
}
