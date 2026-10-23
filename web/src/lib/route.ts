import { useCallback, useSyncExternalStore } from 'react';
import type { Section } from '@/lib/data';

export interface Route {
  section: Section;
  /** prompts 段落里的分类 */
  cat: string;
  q: string;
  /** 详情：条目 id */
  item: string | null;
  /** 编辑：用户条目 id */
  editId: string | null;
}

const EMPTY: Route = { section: 'prompts', cat: 'all', q: '', item: null, editId: null };

/** #/ 、#/c/ai 、#/modules 、#/combos 、#/mine 、#/new 、#/edit/<id> ，均可带 ?q= &item= */
function parse(hash: string): Route {
  const raw = (hash || '').replace(/^#/, '');
  if (!raw) return EMPTY;
  const [path, search = ''] = raw.split('?');
  const sp = new URLSearchParams(search);
  const q = sp.get('q') ?? '';
  const item = sp.get('item') ?? null;

  const cat = /^\/c\/([\w-]+)/.exec(path)?.[1];
  if (cat) return { section: 'prompts', cat, q, item, editId: null };

  const edit = /^\/edit\/(.+)$/.exec(path)?.[1];
  if (edit) return { section: 'edit', cat: 'all', q: '', item: null, editId: decodeURIComponent(edit) };

  if (path.startsWith('/modules')) return { section: 'modules', cat: 'modules', q, item, editId: null };
  if (path.startsWith('/combos')) return { section: 'combos', cat: 'combos', q, item, editId: null };
  if (path.startsWith('/mine')) return { section: 'mine', cat: 'all', q, item, editId: null };
  if (path.startsWith('/new')) return { section: 'new', cat: 'all', q: '', item: null, editId: null };

  return { section: 'prompts', cat: 'all', q, item, editId: null };
}

function basePath(r: Route): string {
  switch (r.section) {
    case 'modules':
      return '/modules';
    case 'combos':
      return '/combos';
    case 'mine':
      return '/mine';
    case 'new':
      return '/new';
    case 'edit':
      return `/edit/${encodeURIComponent(r.editId ?? '')}`;
    default:
      return r.cat === 'all' ? '/' : `/c/${r.cat}`;
  }
}

function build(r: Route): string {
  const sp = new URLSearchParams();
  if (r.q) sp.set('q', r.q);
  if (r.item) sp.set('item', r.item);
  const s = sp.toString();
  return `${basePath(r)}${s ? `?${s}` : ''}`;
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  window.addEventListener('popstate', cb);
  return () => {
    window.removeEventListener('hashchange', cb);
    window.removeEventListener('popstate', cb);
  };
};

/** 极简 hash 路由：URL 是唯一权威来源，零依赖 */
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  const route = parse(hash);

  const navigate = useCallback((patch: Partial<Route>, replace = false) => {
    const cur = parse(window.location.hash);
    const next = { ...cur, ...patch };
    // 切换段落时清掉选中项，避免跨段落残留
    if (patch.section && patch.section !== cur.section) next.item = null;
    const target = build(next);
    if (target === build(cur)) return;
    if (replace) {
      history.replaceState(null, '', `#${target}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = target;
    }
  }, []);

  return { route, navigate };
}

export function href(patch: Partial<Route>): string {
  return `#${build({ ...EMPTY, ...patch })}`;
}
