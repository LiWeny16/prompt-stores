#!/usr/bin/env node
/**
 * 组合 prompt 生成器 + UI 数据注入
 *
 * 1. 读取 prompts/** 下声明了 compose 字段的角色，按声明顺序合并 modules/ 下对应模块，
 *    输出到 combos/<category>-<name>.md，正文包在 ```text 代码块中（GitHub 一键复制）。
 * 2. 汇总全部角色/模块/组合，注入 ui/index.html 的 __DATA__ 块（单文件 UI 双击即用）。
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
const UI_FILE = join(ROOT, 'ui', 'index.html');
const CAT_ORDER = ['fullstack', 'embedded', 'ai', 'writing', 'devops', 'data', 'quality', 'general'];
const TODAY = new Date().toISOString().slice(0, 10);

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
    modules.set(id, { id, file: `modules/${f}`, fm, name: fm.name || id, body: extractPromptBody(text) });
  }
}

// 2. 收集角色（按分类排序），生成组合 + UI 条目
mkdirSync(COMBOS_DIR, { recursive: true });
const roles = [];
for (const p of walkMd(PROMPTS_DIR)) {
  const text = readFileSync(p.abs, 'utf8');
  roles.push({ rel: p.rel.replace(/\\/g, '/'), text, fm: parseFrontmatter(text) });
}
roles.sort((a, b) => {
  const ia = CAT_ORDER.indexOf(a.fm.category);
  const ib = CAT_ORDER.indexOf(b.fm.category);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.rel.localeCompare(b.rel);
});

const uiItems = [];
let count = 0;
for (const { rel, text, fm } of roles) {
  uiItems.push({
    kind: 'role',
    category: fm.category || 'general',
    name: fm.name || rel,
    description: fm.description || '',
    tags: fm.tags || [],
    compose: fm.compose || [],
    file: rel,
    body: extractPromptBody(text),
  });

  const declared = fm.compose || [];
  if (!declared.length) continue;
  const valid = declared.filter((id) => modules.has(id));
  const missing = declared.filter((id) => !modules.has(id));
  if (missing.length) console.warn(`⚠ ${rel}: 缺失模块 ${missing.join(', ')}（已跳过）`);
  if (!valid.length) continue;

  const merged = [extractPromptBody(text), ...valid.map((id) => modules.get(id).body)].join('\n\n');
  const title = fm.name || basename(rel);
  const comboName = `${fm.category ? `${fm.category}-` : ''}${basename(rel, '.md')}`;
  const out = `# 组合：${title}

> 角色：\`${rel}\` ｜ 模块：${valid.map((id) => `\`${modules.get(id).file}\``).join('、')}
> 由 \`node scripts/build-combos.mjs\` 生成于 ${TODAY}；点下方代码块右上角按钮一键复制。

\`\`\`text
${merged}
\`\`\`
`;
  writeFileSync(join(COMBOS_DIR, `${comboName}.md`), out);
  console.log(`✓ combos/${comboName}.md（${valid.length} 个模块）`);
  count++;
  uiItems.push({
    kind: 'combo',
    category: 'combos',
    name: `${title}（组合）`,
    description: `角色 × ${valid.length} 个模块：${valid.join(' + ')}`,
    tags: ['组合'],
    compose: valid,
    file: `combos/${comboName}.md`,
    body: merged,
  });
}

for (const [, m] of modules) {
  uiItems.push({
    kind: 'module',
    category: 'modules',
    name: m.name,
    description: m.fm.description || '',
    tags: m.fm.tags || [],
    compose: [],
    file: m.file,
    body: m.body,
  });
}

// 3. 注入 ui/index.html
if (existsSync(UI_FILE)) {
  const html = readFileSync(UI_FILE, 'utf8');
  const payload = JSON.stringify({ generated: TODAY, items: uiItems }).replace(/<\//g, '<\\/');
  const marker = /(\/\*__DATA_START__\*\/[\s\S]*?\/\*__DATA_END__\*\/)/;
  if (!marker.test(html)) throw new Error('ui/index.html 缺少 /*__DATA_START__*/ 标记');
  writeFileSync(UI_FILE, html.replace(marker, `/*__DATA_START__*/\nwindow.PS_DATA = ${payload};\n/*__DATA_END__*/`));
  console.log(`✓ ui/index.html 数据已刷新（${uiItems.length} 个条目）`);
} else {
  console.warn('⚠ 未找到 ui/index.html，跳过 UI 数据注入');
}

console.log(`\n完成：${count} 个组合 ｜ 模块 ${modules.size} 个 ｜ UI 条目 ${uiItems.length} 个`);
