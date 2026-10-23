import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { CATS, catHref, ITEMS } from '@/lib/data';

function counts() {
  const map = new Map<string, number>([['all', ITEMS.length]]);
  for (const it of ITEMS) map.set(it.category, (map.get(it.category) ?? 0) + 1);
  return map;
}

const COUNTS = counts();

function itemClassName({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
    isActive
      ? 'bg-secondary font-medium text-secondary-foreground'
      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
  );
}

/** 桌面侧栏分类导航（移动端由 ChipRow 替代） */
export function Sidebar() {
  return (
    <nav aria-label="分类" className="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] w-44 shrink-0 flex-col gap-0.5 overflow-y-auto py-6 lg:flex">
      {CATS.map((c) => (
        <NavLink key={c.id} to={catHref(c.id)} end className={itemClassName}>
          <span className="truncate">{c.label}</span>
          <span className="text-[11px] tabular-nums opacity-60">{COUNTS.get(c.id) ?? 0}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** 移动端顶部分类横滑条 */
export function ChipRow({ current }: { current: string }) {
  return (
    <nav
      aria-label="分类"
      className="-mx-4 -mt-1 flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
    >
      {CATS.map((c) => (
        <NavLink
          key={c.id}
          to={catHref(c.id)}
          end
          className={({ isActive }) =>
            cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors',
              isActive || (c.id === 'all' && current === 'all')
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-accent',
            )
          }
        >
          {c.label}
          <span className="ml-1 opacity-60">{COUNTS.get(c.id) ?? 0}</span>
        </NavLink>
      ))}
    </nav>
  );
}
