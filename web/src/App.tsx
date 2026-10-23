import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sidebar } from '@/components/Sidebar';
import { ItemCard } from '@/components/ItemCard';
import { Detail } from '@/components/Detail';
import { Editor } from '@/components/Editor';
import { Mine } from '@/components/Mine';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRoute } from '@/lib/route';
import {
  BUILTIN,
  DATA,
  KIND_LABEL,
  SECTIONS,
  TASKS,
  catLabel,
  type PromptItem,
  type Section,
} from '@/lib/data';
import { toItem, useUserPrompts, type UserPrompt } from '@/lib/db';
import { cn } from '@/lib/utils';

export default function App() {
  const { route, navigate } = useRoute();
  const user = useUserPrompts();

  const userItems = useMemo<PromptItem[]>(() => user.items.map(toItem), [user.items]);
  const allItems = useMemo(() => [...BUILTIN, ...userItems], [userItems]);
  const byId = useMemo(() => new Map(allItems.map((i) => [i.id, i])), [allItems]);
  const resolve = useCallback((id: string) => byId.get(id) ?? byId.get(`modules/${id}`), [byId]);

  const [input, setInput] = useState(route.q);
  const searchRef = useRef<HTMLInputElement>(null);
  const syncTimer = useRef<number>(0);

  useEffect(() => setInput(route.q), [route.q]);
  useEffect(() => () => window.clearTimeout(syncTimer.current), []);

  const onSearch = useCallback(
    (value: string) => {
      setInput(value);
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(() => navigate({ q: value }, true), 220);
    },
    [navigate],
  );

  const section: Section = route.section;
  const q = input.trim().toLowerCase();

  const filtered = useMemo(() => {
    const inSection = (it: PromptItem) => {
      if (section === 'modules') return it.kind === 'module';
      if (section === 'combos') return it.kind === 'combo';
      if (section === 'prompts') return it.kind === 'role' && (route.cat === 'all' || it.category === route.cat);
      return false;
    };
    const base = allItems.filter(inSection);
    if (!q) return base;
    return base.filter((it) =>
      `${it.name} ${it.tags.join(' ')} ${it.description} ${KIND_LABEL[it.kind]}`.toLowerCase().includes(q),
    );
  }, [allItems, section, route.cat, q]);

  const selected = route.item ? byId.get(route.item) : undefined;
  useEffect(() => {
    if (route.item && !selected) navigate({ item: null }, true);
  }, [route.item, selected, navigate]);

  const openItem = useCallback((item: PromptItem) => navigate({ item: item.id }), [navigate]);
  const closeItem = useCallback(() => navigate({ item: null }, true), [navigate]);

  const editing = useMemo<UserPrompt | null | undefined>(() => {
    if (section !== 'edit' || !route.editId) return undefined;
    return user.items.find((p) => p.id === route.editId) ?? null;
  }, [section, route.editId, user.items]);

  // 编辑的条目不存在（已被删除/导入前）→ 回「我的」
  useEffect(() => {
    if (section === 'edit' && editing === null) navigate({ section: 'mine' }, true);
  }, [section, editing, navigate]);

  const onSave = useCallback(
    async (p: UserPrompt) => {
      await user.save(p);
      navigate({ section: 'mine' }, true);
    },
    [user, navigate],
  );

  const onDelete = useCallback(
    async (item: PromptItem) => {
      if (!window.confirm(`删除「${item.name}」？`)) return;
      await user.remove(item.id);
      navigate({ item: null }, true);
    },
    [user, navigate],
  );

  const onImport = useCallback(
    async (items: UserPrompt[]) => {
      for (const p of items) await user.save(p);
    },
    [user],
  );

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

  const showSidebar = section === 'prompts';
  const count = section === 'mine' ? user.items.length : filtered.length;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-3">
          <a href="#/" className="flex shrink-0 items-center gap-2 rounded-md py-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <span className="size-5 rounded-[6px] bg-primary" aria-hidden="true" />
            <span className="hidden text-sm font-semibold tracking-tight whitespace-nowrap sm:inline">Prompt Stores</span>
          </a>

          <nav aria-label="主导航" className="hidden items-center gap-0.5 md:flex">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                aria-current={section === s.id || (s.id === 'prompts' && section === 'prompts') ? 'page' : undefined}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                  section === s.id
                    ? 'bg-secondary font-medium text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                {s.label}
              </a>
            ))}
          </nav>

          <div className="relative ml-auto flex w-full max-w-xs flex-1 justify-center md:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              ref={searchRef}
              value={input}
              onChange={(e) => onSearch(e.target.value)}
              type="search"
              placeholder="搜索…"
              aria-label="搜索提示词"
              className="w-full border-transparent bg-muted/60 pr-9 pl-8 focus-visible:border-ring focus-visible:bg-background"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded border bg-background px-1 font-sans text-[10px] font-semibold text-muted-foreground sm:flex">
              /
            </kbd>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate({ section: 'new' })} className="shrink-0">
            <Plus />
            <span className="hidden sm:inline">新建</span>
          </Button>
          <ThemeToggle />
        </div>

        {/* 移动端主导航 */}
        <nav aria-label="主导航" className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={s.href}
              aria-current={section === s.id ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap',
                section === s.id ? 'border-transparent bg-primary text-primary-foreground' : 'border-border text-muted-foreground',
              )}
            >
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      {section === 'prompts' && route.cat === 'all' && !q ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] text-muted-foreground">我要做什么</span>
            {TASKS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => {
                  if (t.cat) navigate({ section: 'prompts', cat: t.cat, q: '' });
                  else navigate({ section: 'prompts', cat: 'all', q: t.q ?? '' });
                  onSearch(t.q ?? '');
                }}
                className="rounded-full border px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-ring hover:bg-accent hover:text-foreground"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-6xl flex-1 px-4">
        {showSidebar ? <Sidebar current={route.cat} /> : null}
        <main className="min-w-0 flex-1 py-4 lg:py-6">
          {section === 'mine' ? (
            <Mine
              items={user.items}
              loading={user.loading}
              error={user.error}
              onCreate={() => navigate({ section: 'new' })}
              onEdit={(id) => navigate({ section: 'edit', editId: id })}
              onOpen={openItem}
              onDelete={user.remove}
              onImport={onImport}
              toItem={toItem}
            />
          ) : section === 'new' ? (
            <Editor allItems={allItems} onSave={onSave} onCancel={() => navigate({ section: 'mine' })} />
          ) : section === 'edit' ? (
            editing ? (
              <Editor existing={editing} allItems={allItems} onSave={onSave} onCancel={() => navigate({ section: 'mine' })} />
            ) : null
          ) : (
            <>
              <p className="mb-3 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                <span className="tabular-nums">{count}</span>
                <span>{section === 'combos' ? '个组合' : section === 'modules' ? '个模块' : '个提示词'}</span>
                <span aria-hidden="true">·</span>
                <span>{section === 'prompts' ? catLabel(route.cat) : section === 'combos' ? '组合' : '模块'}</span>
                {q ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">关键词「{input.trim()}」</span>
                  </>
                ) : null}
              </p>

              {filtered.length > 0 ? (
                <div className={cn('grid gap-3', section === 'modules' ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3')}>
                  {filtered.map((it) => (
                    <ItemCard key={it.id} item={it} onOpen={openItem} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <SearchX className="size-8 text-muted-foreground/50" aria-hidden="true" />
                  <p className="text-sm font-medium">没有匹配的内容</p>
                  <p className="text-xs text-muted-foreground">
                    {q ? `「${input.trim()}」无结果` : section === 'combos' ? '还没有组合：给角色声明 compose 即可自动生成' : '该分类还没有内容'}
                  </p>
                  {q ? (
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => onSearch('')}>
                      清除搜索
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-[11px] text-muted-foreground">
          <span>数据 {DATA.generated}</span>
          <span aria-hidden="true">·</span>
          <a href="api/index.json" className="underline-offset-2 hover:underline">
            Agent API
          </a>
          <span aria-hidden="true">·</span>
          <a href="llms.txt" className="underline-offset-2 hover:underline">
            llms.txt
          </a>
          <span aria-hidden="true">·</span>
          <span>共 {allItems.length} 条（角色 {allItems.filter((i) => i.kind === 'role').length} · 模块 {allItems.filter((i) => i.kind === 'module').length} · 组合 {allItems.filter((i) => i.kind === 'combo').length}）</span>
        </div>
      </footer>

      {selected ? (
        <Detail
          item={selected}
          resolve={resolve}
          onClose={closeItem}
          onEdit={
            selected.origin === 'user'
              ? () => navigate({ section: 'edit', editId: selected.id })
              : undefined
          }
          onDelete={selected.origin === 'user' ? (it) => void onDelete(it) : undefined}
        />
      ) : null}
    </div>
  );
}
