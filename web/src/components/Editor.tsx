import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CATS, KIND_LABEL, type ItemKind, type PromptItem } from '@/lib/data';
import { loadBody } from '@/lib/bodies';
import { newUserPromptId, type UserPrompt } from '@/lib/db';
import { cn } from '@/lib/utils';

interface EditorProps {
  /** 已有条目 = 编辑，否则新建 */
  existing?: UserPrompt | null;
  /** 全部可引用条目（选组合时用） */
  allItems: PromptItem[];
  onSave: (p: UserPrompt) => Promise<void>;
  onCancel: () => void;
}

const KINDS: ItemKind[] = ['role', 'module', 'combo'];

export function Editor({ existing, allItems, onSave, onCancel }: EditorProps) {
  const [kind, setKind] = useState<ItemKind>(existing?.kind ?? 'role');
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'general');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [tags, setTags] = useState(existing?.tags.join(', ') ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [roleId, setRoleId] = useState(existing?.compose[0] ?? '');
  const [moduleIds, setModuleIds] = useState<string[]>(existing?.compose.slice(1) ?? []);
  const [manual, setManual] = useState(Boolean(existing && existing.kind === 'combo' && !existing.compose.length));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = useMemo(() => allItems.filter((i) => i.kind === 'role'), [allItems]);
  const modules = useMemo(() => allItems.filter((i) => i.kind === 'module'), [allItems]);

  // 组合模式下正文由角色 + 模块自动拼接（正文按需拉取，故为异步）
  const [autoBody, setAutoBody] = useState('');
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    if (kind !== 'combo' || manual) return;
    let alive = true;
    setComposing(true);
    (async () => {
      const role = roles.find((r) => r.id === roleId);
      const mods = moduleIds.map((id) => modules.find((m) => m.id === id)).filter(Boolean) as PromptItem[];
      const parts = await Promise.all([role ? loadBody(role) : '', ...mods.map((m) => loadBody(m))]);
      if (!alive) return;
      setAutoBody(parts.filter(Boolean).join(String.fromCharCode(10,10)));
      setComposing(false);
    })().catch(() => {
      if (alive) setComposing(false);
    });
    return () => {
      alive = false;
    };
  }, [kind, manual, roleId, moduleIds, roles, modules]);

  const effectiveBody = kind === 'combo' && !manual ? autoBody : body;
  const compose = kind === 'combo' ? [roleId, ...moduleIds].filter((x): x is string => Boolean(x)) : [];

  useEffect(() => {
    if (kind !== 'combo') setManual(false);
  }, [kind]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('请填写名称');
    if (kind !== 'combo' && !body.trim()) return setError('请填写正文');
    if (kind === 'combo' && !effectiveBody.trim()) return setError('请选择角色/模块，或改为手动编写');

    setSaving(true);
    setError(null);
    const now = Date.now();
    try {
      await onSave({
        id: existing?.id ?? newUserPromptId(),
        kind,
        name: name.trim(),
        category: kind === 'module' ? 'modules' : kind === 'combo' ? 'combos' : category,
        description: description.trim(),
        tags: tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
        compose,
        body: effectiveBody,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const field = 'flex flex-col gap-1.5';
  const label = 'text-xs font-medium text-muted-foreground';

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-5 pb-10">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" aria-label="返回" onClick={onCancel}>
          <ArrowLeft />
        </Button>
        <h1 className="text-base font-semibold">{existing ? '编辑提示词' : '新建提示词'}</h1>
        <Button type="submit" size="sm" className="ml-auto" disabled={saving}>
          <Save />
          {saving ? '保存中…' : '保存'}
        </Button>
      </div>

      <div className={field}>
        <span className={label}>类型</span>
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs transition-colors',
                kind === k ? 'border-transparent bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {kind === 'role'
            ? '可独立使用的完整角色 prompt'
            : kind === 'module'
              ? '不能单独用，追加在角色后面的能力约束片段'
              : '角色 + 模块的成品，正文自动拼接'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          <span className={label}>名称 *</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：代码评审助手" />
        </label>

        {kind === 'role' ? (
          <label className={field}>
            <span className={label}>分类</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-input h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              {CATS.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className={field}>
            <span className={label}>分类</span>
            <div className="flex h-9 items-center">
              <Badge variant="outline">{kind === 'module' ? '模块区' : '组合区'}</Badge>
            </div>
          </div>
        )}
      </div>

      <label className={field}>
        <span className={label}>描述</span>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="一句话说明用途，会显示在卡片上" />
      </label>

      <label className={field}>
        <span className={label}>标签</span>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="逗号分隔，例如：评审, 前端" />
      </label>

      {kind === 'combo' ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
          <div className={field}>
            <span className={label}>角色</span>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="border-input h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">（不选）</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className={field}>
            <span className={label}>模块（按需勾选）</span>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded border bg-background p-2">
              {modules.length === 0 ? (
                <span className="text-[11px] text-muted-foreground">还没有模块</span>
              ) : (
                modules.map((m) => (
                  <label key={m.id} className="flex items-start gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={moduleIds.includes(m.id)}
                      onChange={(e) =>
                        setModuleIds((prev) => (e.target.checked ? [...prev, m.id] : prev.filter((x) => x !== m.id)))
                      }
                    />
                    <span>
                      {m.name}
                      {m.description ? <span className="ml-1 text-muted-foreground">— {m.description}</span> : null}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
            手动编写正文（不使用自动拼接）
          </label>
        </div>
      ) : null}

      {kind === 'combo' && !manual ? (
        <div className={field}>
          <span className={label}>正文预览（自动生成，{effectiveBody.split(String.fromCharCode(10)).length} 行）</span>
          <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">
            {composing ? '加载中…' : effectiveBody || '（选择角色/模块后自动生成）'}
          </pre>
        </div>
      ) : (
        <label className={field}>
          <span className={label}>正文 *（代码块内容，{body.split(String.fromCharCode(10)).length} 行）</span>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="直接写 prompt 本体，不需要包 ```text 围栏"
            className="min-h-64 font-mono text-[12.5px] leading-relaxed"
          />
        </label>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          <Save />
          {saving ? '保存中…' : '保存'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  );
}
