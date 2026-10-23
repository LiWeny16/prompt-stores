import { useCallback, useSyncExternalStore } from 'react';

export interface Route {
  /** 分类 id，'all' 表示全部 */
  cat: string;
  /** 搜索关键词 */
  q: string;
  /** 打开抽屉的条目文件路径 */
  item: string | null;
}

const EMPTY: Route = { cat: 'all', q: '', item: null };

/** 解析 #/ 、#/c/writing 、#/?q=x&item=y */
function parse(hash: string): Route {
  const raw = (hash || '').replace(/^#/, '');
  if (!raw) return EMPTY;
  const [path, search = ''] = raw.split('?');
  const m = /^\/c\/([\w-]+)/.exec(path);
  const sp = new URLSearchParams(search);
  return { cat: m ? m[1] : 'all', q: sp.get('q') ?? '', item: sp.get('item') ?? null };
}

function build(r: Route): string {
  const base = r.cat === 'all' ? '/' : `/c/${r.cat}`;
  const sp = new URLSearchParams();
  if (r.q) sp.set('q', r.q);
  if (r.item) sp.set('item', r.item);
  const s = sp.toString();
  return `${base}${s ? `?${s}` : ''}`;
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  window.addEventListener('popstate', cb);
  return () => {
    window.removeEventListener('hashchange', cb);
    window.removeEventListener('popstate', cb);
  };
};

const getSnapshot = () => window.location.hash;
const getServerSnapshot = () => '';

/** 极简 hash 路由：URL 是唯一权威来源，无第三方依赖 */
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const route = parse(hash);

  const navigate = useCallback((patch: Partial<Route>, replace = false) => {
    const cur = parse(window.location.hash);
    const next = { ...cur, ...patch };
    const target = build(next);
    if (target === build(cur)) return;
    if (replace) {
      history.replaceState(null, '', `#${target}`);
      // replaceState 不触发 hashchange，手动通知订阅者
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = target;
    }
  }, []);

  return { route, navigate };
}

export function catHref(cat: string): string {
  return `#${build({ cat, q: '', item: null })}`;
}
