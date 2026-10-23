import { useRef, useState } from 'react';
import { Download, FileArchive, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KIND_LABEL, type PromptItem } from '@/lib/data';
import type { UserPrompt } from '@/lib/db';
import { exportJson, exportZip, parseImport } from '@/lib/exporter';

interface MineProps {
  items: UserPrompt[];
  loading: boolean;
  error: string | null;
  onCreate: () => void;
  onEdit: (id: string) => void;
  onOpen: (item: PromptItem) => void;
  onDelete: (id: string) => Promise<void>;
  onImport: (items: UserPrompt[]) => Promise<void>;
  /** 把 UserPrompt 转成展示类型（由 App 传入，避免重复实现） */
  toItem: (p: UserPrompt) => PromptItem;
}

export function Mine({ items, loading, error, onCreate, onEdit, onOpen, onDelete, onImport, toItem }: MineProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const guard = async (label: string, fn: () => Promise<void> | void) => {
    setBusy(label);
    setNote(null);
    try {
      await fn();
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void guard('import', async () => {
      const { items: parsed, skipped } = await parseImport(file);
      if (!parsed.length) throw new Error('文件里没有可导入的条目');
      await onImport(parsed);
      setNote(`已导入 ${parsed.length} 条${skipped ? `，跳过 ${skipped} 条无效数据` : ''}`);
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold">我的提示词</h1>
        <span className="text-xs text-muted-foreground">
          {items.length} 条 · 存在浏览器 IndexedDB，仅本机可见
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button size="sm" onClick={onCreate}>
            <Plus />
            新建
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!items.length || busy !== null}
            onClick={() => void guard('json', () => exportJson(items))}
          >
            <Download />
            JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!items.length || busy !== null}
            onClick={() => void guard('zip', () => exportZip(items))}
          >
            <FileArchive />
            ZIP
          </Button>
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
            <Upload />
            导入
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>
      </div>

      {note ? <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{note}</p> : null}
      {error ? <p className="rounded-md border border-destructive/40 px-3 py-2 text-xs text-destructive">存储不可用：{error}</p> : null}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">读取中…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm font-medium">还没有自己的提示词</p>
          <p className="text-xs text-muted-foreground">新建，或导入之前导出的 JSON</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={onCreate}>
            <Plus />
            新建
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {items.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpen(toItem(p))}
                aria-label={`打开 ${p.name}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <Badge variant="outline">{KIND_LABEL[p.kind]}</Badge>
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  <span>{p.body.split('\n').length} 行</span>
                  {p.compose.length ? <span>× {p.compose.length + 1}</span> : null}
                  <span>{new Date(p.updatedAt).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </span>
              </button>
              <Button variant="ghost" size="icon" aria-label={`编辑 ${p.name}`} onClick={() => onEdit(p.id)}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`删除 ${p.name}`}
                disabled={busy !== null}
                onClick={() => {
                  if (window.confirm(`删除「${p.name}」？此操作不可撤销。`)) {
                    void guard('del', () => onDelete(p.id));
                  }
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
