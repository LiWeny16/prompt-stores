import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { KIND_LABEL, type PromptItem } from '@/lib/data';

interface DrawerProps {
  item: PromptItem;
  onClose: () => void;
}

/** 预览抽屉：Esc / 点遮罩 / 点关闭按钮退出；锁定背景滚动；焦点归还触发元素 */
export function Drawer({ item, onClose }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`预览 ${item.name}`}>
      <div className="ps-overlay absolute inset-0 bg-black/45 dark:bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="ps-drawer absolute inset-y-0 right-0 flex w-full max-w-xl flex-col gap-4 border-l bg-background p-5 shadow-2xl outline-none sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base leading-snug font-semibold">{item.name}</h2>
              <Badge variant="solid">{KIND_LABEL[item.kind]}</Badge>
            </div>
            {item.description ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t} variant="default" className="font-normal">
                  {t}
                </Badge>
              ))}
              {item.compose.length > 0 ? (
                <span className="text-[11px] text-muted-foreground">× {item.compose.join(' + ')}</span>
              ) : null}
              <span className="ml-auto text-[11px] tabular-nums text-muted-foreground/70">{item.file}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="关闭预览" onClick={onClose} className="-mr-2 -mt-1 shrink-0">
            <X />
          </Button>
        </div>

        <CopyButton text={item.body} label="复制" className="self-start" />

        <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
          {item.body}
        </pre>
      </div>
    </div>,
    document.body,
  );
}
