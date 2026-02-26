import { useState, useEffect, useRef } from 'react';

export interface SearchResult {
  type: 'participant' | 'competition' | 'squad' | 'discipline';
  id: string | number;
  title: string;
  subtitle: string;
  badge?: string;
  navigationPath: string;
  prefillSearch: string;
}

interface UseEventSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
}

export function useEventSearch(
  eventId: number | undefined,
  query: string,
): UseEventSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController ref to cancel in-flight requests when query changes
  const abortRef = useRef<AbortController | null>(null);
  // Debounce timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear pending debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Clear results immediately when query is too short
    if (!eventId || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      // Abort any previous in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const url = `/api/event-search/${eventId}?q=${encodeURIComponent(query.trim())}`;
        const response = await fetch(url, { signal: abortRef.current.signal });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        setResults(data.results ?? []);
        setError(null);
      } catch (err: any) {
        if (err.name === 'AbortError') return; // ignore cancelled requests
        setError('Suche fehlgeschlagen');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [eventId, query]);

  return { results, isLoading, error };
}
