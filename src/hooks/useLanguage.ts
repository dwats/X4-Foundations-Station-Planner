import { useEffect } from 'react';
import { useUIStore } from '@/store';

export function useLanguage() {
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('x4-planner-language');
    if (saved) {
      setLanguage(saved);
    }
  }, [setLanguage]);

  // Persist on change
  useEffect(() => {
    localStorage.setItem('x4-planner-language', language);
  }, [language]);
}
