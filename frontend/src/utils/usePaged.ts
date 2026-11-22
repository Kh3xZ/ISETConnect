import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, PageResponse } from '../services/api';

export type PagedStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Paginated + searchable list. Only fetches while `active` is true, so a tab
 * that was never opened never hits the backend. Stale responses are ignored.
 */
export function usePaged<T extends { id: number }>(
  fetcher: (q: string, page: number) => Promise<PageResponse<T>>,
  active: boolean,
  q: string,
  onSoftError?: (message: string) => void,
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<PagedStatus>('idle');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const reqRef = useRef(0);
  const loadedFor = useRef<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const softErrorRef = useRef(onSoftError);
  softErrorRef.current = onSoftError;

  const messageOf = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

  const load = useCallback(async (mode: 'initial' | 'refresh', query: string) => {
    const id = ++reqRef.current;
    if (mode === 'initial') setStatus('loading');
    try {
      const res = await fetcherRef.current(query, 0);
      if (id !== reqRef.current) return;
      setItems(res.content);
      setPage(res.page);
      setLast(res.last);
      setTotal(res.totalElements);
      setStatus('ready');
      loadedFor.current = query;
    } catch (e) {
      if (id !== reqRef.current) return;
      if (mode === 'refresh') {
        softErrorRef.current?.(messageOf(e));
      } else {
        setError(messageOf(e));
        setStatus('error');
        loadedFor.current = null;
      }
    } finally {
      if (id === reqRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (active && loadedFor.current !== q) void load('initial', q);
  }, [active, q, load]);

  const reload = useCallback(() => {
    loadedFor.current = null;
    void load('initial', q);
  }, [load, q]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void load('refresh', q);
  }, [load, q]);

  const loadMore = useCallback(async () => {
    if (loadingMore || last || status !== 'ready') return;
    const id = reqRef.current;
    setLoadingMore(true);
    try {
      const res = await fetcherRef.current(q, page + 1);
      if (id !== reqRef.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...res.content.filter((x) => !seen.has(x.id))];
      });
      setPage(res.page);
      setLast(res.last);
      setTotal(res.totalElements);
    } catch (e) {
      softErrorRef.current?.(messageOf(e));
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, last, status, q, page]);

  return { items, setItems, total, setTotal, last, status, error, refreshing, loadingMore, reload, refresh, loadMore };
}
