import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Code2, Pencil, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { Diagram } from '@/components/Diagram';
import { KIND_LABEL, lineCount, type PromptItem } from '@/lib/data';
import { loadBody } from '@/lib/bodies';

interface DetailProps {
  item: PromptItem;
  /** 解析模块 id → 名称与条目（用于组合的成分清单） */
  resolve: (id: string) => PromptItem | undefined;
  onClose: () => void;
  onEdit?: (item: PromptItem) => void;
  onDelete?: (item: PromptItem) => void;
}

/** 详情抽屉：角色/模块看正文；组合看架构图 + 成分 + 成品正文 */
export function Detail({ item, resolve, onClose, onEdit, onDelete }: DetailProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [showMermaid, setShowMermaid] = useState(false);
  // 正文按需拉取（builtin/vendor）；用户自建条目直接带 body
  const [body, setBody] = useState<string | null>(item.body ?? null);
  const [bodyError, setBodyError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setBody(item.body ?? null);
    setBodyError(null);
    loadBody(item).then(
      (text) => alive && setBody(text),
      (e) => alive && setBodyError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      alive = false;
    };
  }, [item]);

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

  const parts = useMemo(
    () => (item.kind === 'combo' ? item.compose.map((id) => ({ id, node: resolve(id) })) : []),
    [item, resolve],
  );

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`预览 ${item.name}`}>
      <div className="ps-overlay absolute inset-0 bg-black/45 dark:bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="ps-drawer absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col gap-3 border-l bg-background p-5 outline-none sm:p-6"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base leading-snug font-semibold">{item.name}</h2>
              <Badge variant="solid">{KIND_LABEL[item.kind]}</Badge>
              {item.origin === 'user' ? <Badge variant="outline">我的</Badge> : null}
              {item.origin === 'vendor' ? <Badge variant="outline">导入</Badge> : null}
            </div>
            {item.description ? (
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{item.description}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {item.tags.map((t) => (
                <Badge key={t} variant="default" className="font-normal">
                  {t}
                </Badge>
              ))}
              <span className="text-[11px] tabular-nums text-muted-foreground/80">{lineCount(item)} 行</span>
              {item.file ? <span className="text-[11px] text-muted-foreground/70">{item.file}</span> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onEdit ? (
              <Button variant="ghost" size="icon" aria-label="编辑" onClick={() => onEdit(item)}>
                <Pencil />
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="ghost" size="icon" aria-label="删除" onClick={() => onDelete(item)}>
                <Trash2 />
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" aria-label="关闭预览" onClick={onClose} className="-mr-2">
              <X />
            </Button>
          </div>
        </div>

        {item.kind === 'combo' && item.graph ? (
          <section className="rounded-lg border bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">架构</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowMermaid((v) => !v)}>
                <Code2 />
                {showMermaid ? '看图形' : 'Mermaid 源码'}
              </Button>
            </div>
            {showMermaid ? (
              <pre className="overflow-auto rounded border bg-background p-2.5 font-mono text-[11px] leading-relaxed">{item.mermaid}</pre>
            ) : (
              <Diagram graph={item.graph} />
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parts.map(({ id, node }) => (
                <span key={id} className="rounded border bg-background px-1.5 py-0.5 text-[10.5px]">
                  <span className="text-muted-foreground">{KIND_LABEL[node?.kind ?? 'module']}</span>{' '}
                  {node?.name ?? id.replace(/^modules\//, '')}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="flex items-center gap-2">
          <CopyButton getText={() => loadBody(item)} label={item.kind === 'combo' ? '复制完整组合' : '复制'} />
          {item.mermaid ? <CopyButton text={item.mermaid} label="复制 Mermaid" variant="ghost" /> : null}
          {item.source ? (
            <a
              href={item.source}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            >
              来源{item.license ? ` · ${item.license}` : ''}
            </a>
          ) : null}
        </div>

        <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
          {bodyError ? `加载失败：${bodyError}` : body ?? '加载中…'}
        </pre>
      </div>
    </div>,
    document.body,
  );
}
