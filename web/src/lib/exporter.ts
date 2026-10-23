import type { UserPrompt } from '@/lib/db';
import { KIND_LABEL } from '@/lib/data';

const FORMAT = 'prompt-stores/export';
const VERSION = 1;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

function toMarkdown(p: UserPrompt): string {
  const fm = [
    '---',
    `name: ${p.name}`,
    `kind: ${p.kind}`,
    `category: ${p.category}`,
    `tags: [${p.tags.join(', ')}]`,
    `description: ${p.description}`,
    ...(p.compose.length ? [`compose: [${p.compose.join(', ')}]`] : []),
    `updated: ${new Date(p.updatedAt).toISOString().slice(0, 10)}`,
    '---',
    '',
  ].join('\n');
  return `${fm}\n\`\`\`text\n${p.body}\n\`\`\`\n`;
}

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'prompt'
  );
}

/** 导出 JSON：可再导入，也可直接喂给 agent */
export function exportJson(items: UserPrompt[]) {
  const payload = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  download(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `prompt-stores-${stamp()}.json`);
}

/** 导出 ZIP：每条一个可直接提交进仓库的 .md + index.json + README */
export async function exportZip(items: UserPrompt[]) {
  // 按需加载，不占首屏体积
  const { zipSync, strToU8 } = await import('fflate');

  const files: Record<string, Uint8Array> = {};
  for (const p of items) {
    const dir = p.kind === 'module' ? 'modules' : p.kind === 'combo' ? 'combos' : `prompts/${p.category}`;
    let name = slugify(p.name);
    let path = `${dir}/${name}.md`;
    let i = 2;
    while (files[path]) path = `${dir}/${name}-${i++}.md`;
    files[path] = strToU8(toMarkdown(p));
  }

  files['index.json'] = strToU8(
    JSON.stringify(
      {
        format: FORMAT,
        version: VERSION,
        exportedAt: new Date().toISOString(),
        count: items.length,
        items: items.map((p) => ({
          id: p.id,
          kind: p.kind,
          name: p.name,
          category: p.category,
          tags: p.tags,
          compose: p.compose,
          lines: p.body.split('\n').length,
        })),
      },
      null,
      2,
    ),
  );

  files['README.md'] = strToU8(
    `# 导出的提示词（${items.length} 条）

目录结构与本仓库一致，可直接复制进 prompt-stores 仓库：

- \`prompts/<分类>/*.md\` 角色 prompt
- \`modules/*.md\` 能力模块
- \`combos/*.md\` 组合

每个文件是 frontmatter + \`\`\`text 代码块，与仓库格式相同。

生成时间：${new Date().toISOString()}
`,
  );

  const zipped = zipSync(files, { level: 6 });
  download(new Blob([zipped as BlobPart], { type: 'application/zip' }), `prompt-stores-${stamp()}.zip`);
}

export interface ImportResult {
  items: UserPrompt[];
  skipped: number;
}

/** 读取导出的 JSON 文件；容错：也接受裸数组或单条对象 */
export async function parseImport(file: File): Promise<ImportResult> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('不是合法的 JSON 文件');
  }

  let raw: unknown[];
  if (Array.isArray(data)) raw = data;
  else if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) raw = (data as { items: unknown[] }).items;
  else if (data && typeof data === 'object' && 'body' in (data as object)) raw = [data];
  else throw new Error('找不到 items 数组');

  const now = Date.now();
  const items: UserPrompt[] = [];
  let skipped = 0;

  for (const r of raw) {
    const o = r as Record<string, unknown>;
    if (!o || typeof o !== 'object' || typeof o.body !== 'string' || typeof o.name !== 'string') {
      skipped++;
      continue;
    }
    const kind = o.kind === 'module' || o.kind === 'combo' ? o.kind : 'role';
    const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [];
    const compose = Array.isArray(o.compose) ? o.compose.filter((t): t is string => typeof t === 'string') : [];
    items.push({
      id: typeof o.id === 'string' && o.id.startsWith('user/') ? o.id : `user/${crypto.randomUUID().slice(0, 8)}`,
      kind,
      name: o.name,
      category: typeof o.category === 'string' ? o.category : 'general',
      description: typeof o.description === 'string' ? o.description : '',
      tags,
      compose,
      body: o.body,
      createdAt: typeof o.createdAt === 'number' ? o.createdAt : now,
      updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : now,
    });
  }

  return { items, skipped };
}

/** 组合正文拼接规则（与构建脚本一致） */
export function composeBody(roleBody: string, moduleBodies: string[]): string {
  return [roleBody, ...moduleBodies].filter(Boolean).join('\n\n');
}

export const KIND_HINT: Record<string, string> = {
  role: '可独立使用的完整角色 prompt',
  module: '不能单独用，追加在角色后面的能力约束片段',
  combo: '角色 + 模块的成品，正文由所选内容自动拼接',
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind as keyof typeof KIND_LABEL] ?? kind;
}
