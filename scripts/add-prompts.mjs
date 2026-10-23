#!/usr/bin/env node
/**
 * 批量落库：把调研产出的 prompt 规格 JSON 写成 prompts/<category>/<id>.md
 *
 * 用法：
 *   node scripts/add-prompts.mjs <spec.json> [--dry]
 *
 * 输入格式：
 * {
 *   "prompts": [
 *     { "id": "karpathy-agent-loop", "name": "...", "category": "ai",
 *       "tags": ["...", "..."], "description": "...",
 *       "body": "≤6 行指针式正文", "source": "https://...", "license": "MIT" }
 *   ]
 * }
 *
 * 校验（任一不过就跳过该条并报告）：
 *   - category 必须在白名单内
 *   - name / body 必填
 *   - body 行数 ≤ MAX_LINES（默认 8，超过 6 行会给出警告，提示压缩）
 *   - 同名条目已存在则不覆盖（--force 可覆盖）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROMPTS = join(ROOT, 'prompts');
const CATEGORIES = ['fullstack', 'embedded', 'ai', 'writing', 'devops', 'data', 'quality', 'general'];
const MAX_LINES = 8;
const SOFT_LINES = 6;

const args = process.argv.slice(2);
const specPath = args.find((a) => !a.startsWith('--'));
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');

if (!specPath) {
  console.error('用法：node scripts/add-prompts.mjs <spec.json> [--dry] [--force]');
  process.exit(1);
}

const spec = JSON.parse(readFileSync(resolve(specPath), 'utf8'));
const list = Array.isArray(spec) ? spec : spec.prompts;
if (!Array.isArray(list)) {
  console.error('输入里没有 prompts 数组');
  process.exit(1);
}

/** 已有条目的 name → 文件路径，用于查重 */
function existingNames() {
  const map = new Map();
  for (const cat of CATEGORIES) {
    const dir = join(PROMPTS, cat);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const text = readFileSync(join(dir, f), 'utf8');
      const m = text.match(/^name:\s*(.+)$/m);
      if (m) map.set(m[1].trim(), `prompts/${cat}/${f}`);
    }
  }
  return map;
}

const existing = existingNames();

function slugify(s, fallback) {
  const cleaned = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (cleaned.length >= 3) return cleaned.slice(0, 48);
  // 中文名等无法直译时，用稳定短哈希
  let h = 0;
  for (const ch of String(s || fallback || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return `p-${h.toString(36).slice(0, 6)}`;
}

/** 正文含 ``` 时用更长的围栏 */
function fenceFor(text) {
  const runs = text.match(/`{3,}/g) || [];
  const max = runs.reduce((a, r) => Math.max(a, r.length), 3);
  return '`'.repeat(Math.max(3, max + 1));
}

const report = { written: [], skipped: [], warned: [] };

for (const p of list) {
  const name = (p.name || '').trim();
  const body = (p.body || '').trim();
  const category = (p.category || '').trim();

  if (!name || !body) {
    report.skipped.push({ name: name || '(无名)', reason: '缺 name 或 body' });
    continue;
  }
  if (!CATEGORIES.includes(category)) {
    report.skipped.push({ name, reason: `分类非法：${category || '(空)'}` });
    continue;
  }

  const lines = body.split('\n');
  if (lines.length > MAX_LINES) {
    report.skipped.push({ name, reason: `正文 ${lines.length} 行，超过 ${MAX_LINES} 行上限（本库要求指针式浓缩）` });
    continue;
  }
  if (lines.length > SOFT_LINES) report.warned.push({ name, lines: lines.length });

  if (existing.has(name) && !FORCE) {
    report.skipped.push({ name, reason: `同名已存在：${existing.get(name)}` });
    continue;
  }

  const id = slugify(p.id || p.name, name);
  const dir = join(PROMPTS, category);
  const file = join(dir, `${id}.md`);

  const tags = (Array.isArray(p.tags) ? p.tags : []).filter(Boolean);
  const fm = [
    '---',
    `name: ${name}`,
    `category: ${category}`,
    `tags: [${tags.join(', ')}]`,
    `description: ${(p.description || '').trim()}`,
    ...(p.source ? [`source: ${p.source}`] : []),
    ...(p.license ? [`license: ${p.license}`] : []),
    '---',
    '',
    ...(p.source
      ? [`> 方法来自 ${p.source}${p.license ? `（${p.license}）` : ''}。本文件只做指路，不复制其内容。`, '']
      : []),
  ].join('\n');

  const fence = fenceFor(body);
  const md = `${fm}\n${fence}text\n${body}\n${fence}\n`;

  if (!DRY) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, md);
    existing.set(name, `prompts/${category}/${id}.md`);
  }
  report.written.push({ name, file: `prompts/${category}/${id}.md`, lines: lines.length });
}

console.log(
  JSON.stringify(
    {
      dry: DRY,
      written: report.written.length,
      skipped: report.skipped.length,
      warned: report.warned.length,
      detail: report,
    },
    null,
    2,
  ),
);
