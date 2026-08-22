import { useSyncExternalStore, useEffect, useState } from 'react';
import * as db from './db';

export function useDb() {
  useSyncExternalStore(db.subscribe, db.getVersion, db.getVersion);
  return db;
}

export function useTable<T extends db.Row = db.Row>(table: db.TableName): T[] {
  useSyncExternalStore(db.subscribe, db.getVersion, db.getVersion);
  return db.all<T>(table);
}

export function useHashRoute(): [string, (to: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash.replace(/^#\/?/, ''));
  useEffect(() => {
    const on = () => setHash(window.location.hash.replace(/^#\/?/, ''));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const nav = (to: string) => {
    window.location.hash = '/' + to.replace(/^\//, '');
  };
  return [hash, nav];
}

export function useLocalState<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(v));
  }, [key, v]);
  return [v, setV] as const;
}
