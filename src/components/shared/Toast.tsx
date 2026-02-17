import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/uiStore';

export function Toast() {
  const toast = useUIStore((state) => state.toast);
  const dismissToast = useUIStore((state) => state.dismissToast);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      // Trigger fade-in animation
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [toast]);

  if (!toast) {
    return null;
  }

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        flex items-center gap-3
        px-4 py-3 rounded-lg shadow-lg
        min-w-[300px] max-w-[500px]
        transition-all duration-300 ease-in-out
        ${typeStyles[toast.type]}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={dismissToast}
        className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Dismiss notification"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
