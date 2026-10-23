import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CopyButton } from '@/components/CopyButton';
import { KIND_LABEL, type PromptItem } from '@/lib/data';

interface PromptCardProps {
  item: PromptItem;
  onOpen: (item: PromptItem) => void;
}

/** 卡片：整卡可点开预览；右下角复制按钮独立可点（覆盖层模式避免嵌套交互元素） */
export const PromptCard = memo(function PromptCard({ item, onOpen }: PromptCardProps) {
  return (
    <article className="group relative flex min-h-36 flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40 focus-within:ring-[3px] focus-within:ring-ring/30">
      <button
        type="button"
        className="absolute inset-0 z-0 rounded-xl cursor-pointer outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        aria-label={`打开 ${item.name}`}
        onClick={() => onOpen(item)}
      />
      <div className="pointer-events-none relative z-10 flex items-start gap-2">
        <h3 className="min-w-0 flex-1 text-sm leading-snug font-medium">{item.name}</h3>
        <Badge variant="outline" className="mt-0.5 shrink-0">
          {KIND_LABEL[item.kind]}
        </Badge>
      </div>
      {item.description ? (
        <p className="pointer-events-none relative z-10 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      ) : null}
      <div className="relative z-10 mt-auto flex items-end gap-1.5">
        <div className="pointer-events-none flex min-w-0 flex-wrap gap-1">
          {item.tags.slice(0, 3).map((t) => (
            <Badge key={t} variant="default" className="font-normal">
              {t}
            </Badge>
          ))}
          <span className="ml-auto inline-flex items-center self-center text-[11px] tabular-nums text-muted-foreground/80">
            {item.body.split('\n').length} 行
          </span>
        </div>
        <CopyButton text={item.body} className="ml-auto shrink-0 opacity-70 group-hover:opacity-100" />
      </div>
    </article>
  );
});
