import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from 'react-router';
import { Search, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sidebar, ChipRow } from '@/components/Sidebar';
import { PromptCard } from '@/components/PromptCard';
import { Drawer } from '@/components/Drawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DATA, ITEMS, KIND_LABEL, catLabel, isCatId, type PromptItem } from '@/lib/data';

function Browse({ cat }: { cat: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const itemFile = searchParams.get('item');
  const searchRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(q);

  // URL 是唯一权威来源：输入框回写 URL（避免逐键导航前先本地显示）
  useEffect(() => setInput(q), [q]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ITEMS.filter((it) => {
      if (cat !== 'all' && it.category !== cat) return false;
      if (!needle) return true;
      const hay = `${it.name} ${it.tags.join(' ')} ${it.description} ${KIND_LABEL[it.kind]}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [cat, q]);

  const selected = useMemo(
    () => (itemFile ? ITEMS.find((it) => it.file === itemFile) : undefined),
    [itemFile],
  );

  // 失效的 item 参数（文件已改名/删除）自动清掉，不留死状态
  useEffect(() => {
    if (itemFile && !selected) setParam('item', null);
  }, [itemFile, selected, setParam]);

  const openItem = useCallback(
    (item: PromptItem) => setParam('item', item.file),
    [setParam],
  );
  const closeItem = useCallback(() => setParam('item', null), [setParam]);

  // 「/」与 Ctrl/⌘+K 聚焦搜索；Esc 关抽屉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.key === '/' && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-md py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="size-5 rounded-[6px] bg-primary" aria-hidden="true" />
            <span className="hidden text-sm font-semibold tracking-tight whitespace-nowrap sm:inline">Prompt Stores</span>
          </Link>
          <div className="relative mx-auto flex w-full max-w-md justify-center">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={searchRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setParam('q', e.target.value);
              }}
              type="search"
              placeholder="搜索提示词…"
              aria-label="搜索提示词"
              className="w-full border-transparent bg-muted/60 pl-8 pr-9 focus-visible:border-ring focus-visible:bg-background"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded border bg-background px-1 font-sans text-[10px] font-semibold text-muted-foreground sm:flex">
              /
            </kbd>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 px-4">
        <Sidebar />
        <main className="min-w-0 flex-1 py-4 lg:py-6">
          <ChipRow current={cat} />
          <p className="mb-3 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{filtered.length}</span>
            <span>个提示词</span>
            <span aria-hidden="true">·</span>
            <span>{catLabel(cat)}</span>
            {q ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">关键词「{q}」</span>
              </>
            ) : null}
          </p>

          {filtered.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((it) => (
                <PromptCard key={it.file} item={it} onOpen={openItem} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <SearchX className="size-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm font-medium">没有匹配的提示词</p>
              <p className="text-xs text-muted-foreground">
                {q ? `「${q}」在此分类下无结果` : '该分类还没有内容'}
              </p>
              {(q || cat !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setParam('q', null);
                    if (cat !== 'all') window.location.hash = '#/';
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 px-4 py-3 text-[11px] text-muted-foreground">
          <span>数据生成于 {DATA.generated}</span>
          <span aria-hidden="true">·</span>
          <span>
            修改后运行 <code className="rounded border bg-muted/50 px-1 py-px font-mono text-[10px]">node scripts/build-combos.mjs</code>
          </span>
          <span aria-hidden="true">·</span>
          <span>GitHub 上每个文件自带一键复制</span>
        </div>
      </footer>

      {selected ? <Drawer item={selected} onClose={closeItem} /> : null}
    </div>
  );
}

function CategoryRoute() {
  const { cat } = useParams();
  if (!isCatId(cat)) return <Navigate to="/" replace />;
  return <Browse cat={cat} />;
}

function Home() {
  return <Browse cat="all" />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/c/:cat" element={<CategoryRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
