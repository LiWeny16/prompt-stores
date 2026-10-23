import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, SearchX } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sidebar, ChipRow } from '@/components/Sidebar';
import { PromptCard } from '@/components/PromptCard';
import { Drawer } from '@/components/Drawer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRoute } from '@/lib/route';
import { DATA, ITEMS, KIND_LABEL, catLabel, isCatId, type PromptItem } from '@/lib/data';

/** 预建索引：搜索只在构建期数据上做一次字符串拼接，避免逐键重复 join */
const SEARCH_INDEX: { item: PromptItem; hay: string }[] = ITEMS.map((it) => ({
  item: it,
  hay: `${it.name} ${it.tags.join(' ')} ${it.description} ${KIND_LABEL[it.kind]}`.toLowerCase(),
}));

export default function App() {
  const { route, navigate } = useRoute();
  const cat = isCatId(route.cat) ? route.cat : 'all';

  const [input, setInput] = useState(route.q);
  const searchRef = useRef<HTMLInputElement>(null);
  const syncTimer = useRef<number>(0);

  // 外部（前进/后退、分类切换）改变 q 时同步输入框
  useEffect(() => setInput(route.q), [route.q]);
  useEffect(() => () => window.clearTimeout(syncTimer.current), []);

  // 输入即时过滤；URL 同步去抖，避免每次按键都写 history
  const onSearch = useCallback(
    (value: string) => {
      setInput(value);
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => navigate({ q: value }, true), 220);
    },
    [navigate],
  );

  const q = input.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return cat === 'all' ? ITEMS : ITEMS.filter((it) => it.category === cat);
    return SEARCH_INDEX.filter(
      (e) => (cat === 'all' || e.item.category === cat) && e.hay.includes(q),
    ).map((e) => e.item);
  }, [cat, q]);

  const selected = useMemo(
    () => (route.item ? ITEMS.find((it) => it.file === route.item) : undefined),
    [route.item],
  );

  // 失效的 item 参数（文件改名/删除）自动清掉
  useEffect(() => {
    if (route.item && !selected) navigate({ item: null }, true);
  }, [route.item, selected, navigate]);

  const openItem = useCallback((item: PromptItem) => navigate({ item: item.file }), [navigate]);
  const closeItem = useCallback(() => navigate({ item: null }, true), [navigate]);

  // 「/」或 Ctrl/⌘+K 聚焦搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
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
          <a
            href="#/"
            className="flex shrink-0 items-center gap-2 rounded-md py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="size-5 rounded-[6px] bg-primary" aria-hidden="true" />
            <span className="hidden text-sm font-semibold tracking-tight whitespace-nowrap sm:inline">Prompt Stores</span>
          </a>
          <div className="relative mx-auto flex w-full max-w-md justify-center">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchRef}
              value={input}
              onChange={(e) => onSearch(e.target.value)}
              type="search"
              placeholder="搜索提示词…"
              aria-label="搜索提示词"
              className="w-full border-transparent bg-muted/60 pr-9 pl-8 focus-visible:border-ring focus-visible:bg-background"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded border bg-background px-1 font-sans text-[10px] font-semibold text-muted-foreground sm:flex">
              /
            </kbd>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 px-4">
        <Sidebar current={cat} />
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
                <span className="truncate">关键词「{input.trim()}」</span>
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
                {q ? `「${input.trim()}」在此分类下无结果` : '该分类还没有内容'}
              </p>
              {(q || cat !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    onSearch('');
                    navigate({ q: '', cat: 'all' }, true);
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
            修改后运行{' '}
            <code className="rounded border bg-muted/50 px-1 py-px font-mono text-[10px]">node scripts/build-combos.mjs</code>
          </span>
          <span aria-hidden="true">·</span>
          <span>GitHub 上每个文件自带一键复制</span>
        </div>
      </footer>

      {selected ? <Drawer item={selected} onClose={closeItem} /> : null}
    </div>
  );
}
