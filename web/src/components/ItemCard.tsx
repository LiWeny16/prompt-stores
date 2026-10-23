import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/CopyButton';
import { KIND_LABEL, lineCount, type PromptItem } from '@/lib/data';
import { loadBody } from '@/lib/bodies';

interface ItemCardProps {
  item: PromptItem;
  onOpen: (item: PromptItem) => void;
}

const ORIGIN_LABEL: Record<string, string> = { user: '我的', vendor: '导入' };

export const ItemCard = memo(function ItemCard({ item, onOpen }: ItemCardProps) {
  return (
    <article className="group relative flex min-h-36 flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40 focus-within:ring-[3px] focus-within:ring-ring/30">
      <button
        type="button"
        className="absolute inset-0 z-0 cursor-pointer rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={`打开 ${item.name}`}
        onClick={() => onOpen(item)}
      />
      <div className="pointer-events-none relative z-10 flex items-start gap-1.5">
        <h3 className="min-w-0 flex-1 text-sm leading-snug font-medium">{item.name}</h3>
        {ORIGIN_LABEL[item.origin] ? (
          <Badge variant="solid" className="mt-0.5 shrink-0">
            {ORIGIN_LABEL[item.origin]}
          </Badge>
        ) : null}
        <Badge variant="outline" className="mt-0.5 shrink-0">
          {KIND_LABEL[item.kind]}
        </Badge>
      </div>

      {item.description ? (
        <p className="pointer-events-none relative z-10 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      ) : null}

      {item.kind === 'combo' && item.compose.length > 0 ? (
        <div className="pointer-events-none relative z-10 flex flex-wrap gap-1">
          {item.compose.slice(0, item.compose.length).map((m) => (
            <span key={m} className="rounded border border-dashed px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
              {m.replace(/^modules\//, '')}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mt-auto flex items-end gap-1.5">
        <div className="pointer-events-none flex min-w-0 flex-wrap gap-1">
          {item.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="default" className="font-normal">
              {t}
            </Badge>
          ))}
          <span className="ml-1 self-center text-[11px] tabular-nums text-muted-foreground/80">{lineCount(item)} 行</span>
        </div>
        <CopyButton getText={() => loadBody(item)} className="ml-auto shrink-0 opacity-70 group-hover:opacity-100" />
      </div>
    </article>
  );
});
