import { useUIStore } from '@/store';
import type { LocalizedName } from '@/types';

export function useLocale() {
  const language = useUIStore((s) => s.language);

  const t = (name: LocalizedName | string | undefined, fallback?: string): string => {
    if (!name) return fallback ?? '';
    if (typeof name === 'string') return name;
    return name[language] ?? name['en'] ?? Object.values(name)[0] ?? fallback ?? '';
  };

  return { language, t };
}
