import type { PromptItem } from '@/lib/data';

/** 正文缓存：同一会话内只拉一次 */
const cache = new Map<string, string>();
/** 进行中的请求，避免重复并发 */
const inflight = new Map<string, Promise<string>>();

const base = () => (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

function urlFor(item: PromptItem): string {
  return `${base()}/api/prompts/${item.id.replace(/\//g, '__')}.json`;
}

/**
 * 取得条目正文。
 * - 用户自建条目：body 已在内存
 * - builtin / vendor：按需从静态 API 拉取并缓存
 */
export async function loadBody(item: PromptItem): Promise<string> {
  if (item.body) return item.body;
  const hit = cache.get(item.id);
  if (hit) return hit;
  const running = inflight.get(item.id);
  if (running) return running;

  const req = (async () => {
    const res = await fetch(urlFor(item));
    if (!res.ok) throw new Error(`正文加载失败（${res.status}）：${item.name}`);
    const json = (await res.json()) as { body?: string };
    if (typeof json.body !== 'string') throw new Error('正文格式异常');
    cache.set(item.id, json.body);
    return json.body;
  })().finally(() => inflight.delete(item.id));

  inflight.set(item.id, req);
  return req;
}

/** 供复制按钮使用的同步兜底：已缓存则立即返回 */
export function cachedBody(id: string): string | undefined {
  return cache.get(id);
}
