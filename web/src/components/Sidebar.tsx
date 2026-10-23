import { cn } from '@/lib/utils';
import { BUILTIN, CATS } from '@/lib/data';

/** 角色分类计数（构建期数据，直接算一次） */
const COUNTS: Record<string, number> = (() => {
  const m: Record<string, number> = { all: BUILTIN.filter((i) => i.kind === 'role').length };
  for (const it of BUILTIN) {
    if (it.kind !== 'role') continue;
    m[it.category] = (m[it.category] ?? 0) + 1;
  }
  return m;
})();

/** 桌面侧栏：仅 Prompts 段落显示的分类导航 */
export function Sidebar({ current }: { current: string }) {
  return (
    <nav
      aria-label="分类"
      className="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] w-40 shrink-0 flex-col gap-0.5 overflow-y-auto py-6 lg:flex"
    >
      {CATS.map((c) => (
        <a
          key={c.id}
          href={c.id === 'all' ? '#/' : `#/c/${c.id}`}
          aria-current={c.id === current ? 'page' : undefined}
          className={cn(
            'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
            c.id === current
              ? 'bg-secondary font-medium text-secondary-foreground'
              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
          )}
        >
          <span className="truncate">{c.label}</span>
          <span className="text-[11px] tabular-nums opacity-60">{COUNTS[c.id] ?? 0}</span>
        </a>
      ))}
    </nav>
  );
}

/** 移动端分类横滑条 */
export function ChipRow({ current }: { current: string }) {
  return (
    <nav
      aria-label="分类"
      className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
    >
      {CATS.map((c) => (
        <a
          key={c.id}
          href={c.id === 'all' ? '#/' : `#/c/${c.id}`}
          aria-current={c.id === current ? 'page' : undefined}
          className={cn(
            'shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors',
            c.id === current
              ? 'border-transparent bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-accent',
          )}
        >
          {c.label}
        </a>
      ))}
    </nav>
  );
}
