#!/usr/bin/env node
/**
 * 组合 prompt 生成器
 * 读取 prompts/** 下声明了 compose 字段的角色，按声明顺序合并 modules/ 下对应模块，
 * 输出到 combos/<category>-<name>.md，正文包在 ```text 代码块中（GitHub 一键复制）。
 *
 * 用法：node scripts/build-combos.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROMPTS_DIR = join(ROOT, 'prompts');
const MODULES_DIR = join(ROOT, 'modules');
const COMBOS_DIR = join(ROOT, 'combos');

/** 解析 frontmatter（仅支持标量与 [a, b] 行内数组，足够本仓库使用） */
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const val = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[kv[1]] = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    } else {
      fm[kv[1]] = val.replace(/^['"]|['"]$/g, '');
    }
  }
  return fm;
}

/** 取出正文中第一个 ```text 代码块内的 prompt 本体 */
function extractPromptBody(text) {
  const m = text.match(/```text\r?\n([\s\S]*?)\r?\n```/);
  if (!m) throw new Error('未找到 ```text 代码块（prompt 本体必须包在 ```text 围栏内）');
  return m[1].replace(/\r\n/g, '\n').trimEnd();
}

function* walkMd(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) yield* walkMd(join(dir, entry.name), `${prefix}${entry.name}/`);
    else if (entry.name.endsWith('.md')) yield { abs: join(dir, entry.name), rel: `${prefix}${entry.name}` };
  }
}

// 1. 收集模块
const modules = new Map();
if (existsSync(MODULES_DIR)) {
  for (const f of readdirSync(MODULES_DIR)) {
    if (!f.endsWith('.md')) continue;
    const text = readFileSync(join(MODULES_DIR, f), 'utf8');
    const fm = parseFrontmatter(text);
    const id = f.replace(/\.md$/, '');
    modules.set(id, { id, file: `modules/${f}`, name: fm.name || id, body: extractPromptBody(text) });
  }
}

// 2. 遍历角色，合并生成组合
mkdirSync(COMBOS_DIR, { recursive: true });
let count = 0;
for (const p of walkMd(PROMPTS_DIR)) {
  const text = readFileSync(p.abs, 'utf8');
  const fm = parseFrontmatter(text);
  const declared = fm.compose || [];
  if (!declared.length) continue;

  const valid = declared.filter((id) => modules.has(id));
  const missing = declared.filter((id) => !modules.has(id));
  if (missing.length) console.warn(`⚠ ${p.rel}: 缺失模块 ${missing.join(', ')}（已跳过）`);
  if (!valid.length) continue;

  const merged = [extractPromptBody(text), ...valid.map((id) => modules.get(id).body)].join('\n\n');
  const title = fm.name || basename(p.rel);
  const comboName = `${fm.category ? `${fm.category}-` : ''}${basename(p.rel, '.md')}`;
  const today = new Date().toISOString().slice(0, 10);

  const out = `# 组合：${title}

> 角色：\`${p.rel.replace(/\\/g, '/')}\` ｜ 模块：${valid.map((id) => `\`${modules.get(id).file}\``).join('、')}
> 由 \`node scripts/build-combos.mjs\` 生成于 ${today}；点下方代码块右上角按钮一键复制。

\`\`\`text
${merged}
\`\`\`
`;
  writeFileSync(join(COMBOS_DIR, `${comboName}.md`), out);
  console.log(`✓ combos/${comboName}.md（${valid.length} 个模块）`);
  count++;
}

console.log(`\n完成：生成 ${count} 个组合（模块库共 ${modules.size} 个）`);
