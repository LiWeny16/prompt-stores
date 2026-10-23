import { useCallback, useEffect, useState } from 'react';
import type { ItemKind, PromptItem } from '@/lib/data';

const DB_NAME = 'prompt-stores';
const DB_VERSION = 1;
const STORE = 'user-prompts';

export interface UserPrompt {
  id: string;
  kind: ItemKind;
  name: string;
  category: string;
  description: string;
  tags: string[];
  compose: string[];
  body: string;
  createdAt: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前环境不支持 IndexedDB'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB 打开失败'));
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB 操作失败'));
      }),
  );
}

export async function listUserPrompts(): Promise<UserPrompt[]> {
  const all = await tx<UserPrompt[]>('readonly', (s) => s.getAll() as IDBRequest<UserPrompt[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function saveUserPrompt(p: UserPrompt): Promise<IDBValidKey> {
  return tx('readwrite', (s) => s.put(p));
}

export function deleteUserPrompt(id: string): Promise<undefined> {
  return tx('readwrite', (s) => s.delete(id) as unknown as IDBRequest<undefined>);
}

export function newUserPromptId(): string {
  const rand = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `user/${rand}`;
}

/** 用户自建条目 → 统一展示类型 */
export function toItem(p: UserPrompt): PromptItem {
  return {
    id: p.id,
    kind: p.kind,
    category: p.kind === 'module' ? 'modules' : p.kind === 'combo' ? 'combos' : p.category,
    name: p.name,
    description: p.description,
    tags: p.tags,
    compose: p.compose,
    body: p.body,
    origin: 'user',
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/** 读取用户自建条目；error 用于界面提示（如隐私模式禁用 IndexedDB） */
export function useUserPrompts() {
  const [items, setItems] = useState<UserPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setItems(await listUserPrompts());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (p: UserPrompt) => {
      await saveUserPrompt(p);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteUserPrompt(id);
      await reload();
    },
    [reload],
  );

  return { items, loading, error, reload, save, remove };
}
