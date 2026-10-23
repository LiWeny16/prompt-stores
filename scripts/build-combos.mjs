#!/usr/bin/env node
/**
 * 数据管线：prompts/ + vendor/ + modules/  →  combos/ + web bundle + 静态 Agent API
 *
 * 产物：
 *   combos/<cat>-<name>.md          组合成品（含 mermaid 架构图，GitHub 原生渲染）
 *   web/src/data/bundle.json        UI 数据
 *   web/public/api/index.json       Agent 用：全部条目元数据（无正文）
 *   web/public/api/prompts/<id>.json Agent 用：单条全文
 *   web/public/api/recipes.json     Agent 用：组合清单 + 模块依赖
 *   web/public/llms.txt             Agent 入口说明
 *   web/public/api/README.md        接口契约
 *
 * 用法：node scripts/build-combos.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, basename, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const P = {
  prompts: join(ROOT, 'prompts'),
  vendor: join(ROOT, 'vendor'),
  modules: join(ROOT, 'modules'),
  combos: join(ROOT, 'combos'),
  bundle: join(ROOT, 'web', 'src', 'data', 'bundle.json'),
  api: join(ROOT, 'web', 'public', 'api'),
  llms: join(ROOT, 'web', 'public', 'llms.txt'),
};
const CAT_ORDER = ['fullstack', 'embedded', 'ai', 'writing', 'devops', 'data', 'quality', 'general'];
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------------- frontmatter / 正文 ---------------- */

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const val = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      fm[kv[1]] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else {
      fm[kv[1]] = val.replace(/^['"]|['"]$/g, '');
    }
  }
  return fm;
}

/** 取第一个 ```text 代码块作为 prompt 本体 */
function extractBody(text, file) {
  // 支持变长围栏（正文自身含 ``` 时用更长的围栏包裹）
  const m = text.match(/(`{3,})text\r?\n([\s\S]*?)\r?\n\1/);
  if (!m) throw new Error(`未找到 \`\`\`text 代码块：${file}`);
  return m[2].replace(/\r\n/g, '\n').trimEnd();
}

function* walkMd(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) yield* walkMd(abs);
    else if (e.name.endsWith('.md')) yield abs;
  }
}

/* ---------------- 架构图 ---------------- */

/** Mermaid 源（写进 combos/*.md，GitHub 原生渲染） */
function toMermaid(role, mods) {
  const q = (s) => s.replace(/"/g, "'");
  const lines = ['flowchart TD'];
  lines.push(`  R["角色 · ${q(role.name)}"]`);
  mods.forEach((m, i) => lines.push(`  M${i + 1}["模块 · ${q(m.name)}"]`));
  lines.push(`  C(["组合 Prompt<br/>${role.name.length > 0 ? role.body.split('\n').length + mods.reduce((a, m) => a + m.body.split('\n').length, 0) : 0} 行"])`);
  lines.push('  R --> C');
  mods.forEach((_, i) => lines.push(`  M${i + 1} --> C`));
  lines.push('  classDef role fill:#18181b,stroke:#18181b,color:#fafafa');
  lines.push('  classDef mod fill:#f4f4f5,stroke:#a1a1aa,color:#18181b');
  lines.push('  classDef combo fill:#e4e4e7,stroke:#52525b,color:#18181b');
  lines.push('  class R role');
  mods.forEach((_, i) => lines.push(`  class M${i + 1} mod`));
  lines.push('  class C combo');
  return lines.join('\n');
}

/** 结构化图数据（UI 用 SVG 自绘，避免引入 150KB 的 mermaid 运行时） */
function toGraph(role, mods) {
  return {
    role: { id: role.id, name: role.name },
    modules: mods.map((m) => ({ id: m.id, name: m.name })),
    combo: { lines: role.body.split('\n').length + mods.reduce((a, m) => a + m.body.split('\n').length, 0) },
  };
}

/* ---------------- 收集 ---------------- */

const modules = new Map();
for (const f of existsSync(P.modules) ? readdirSync(P.modules) : []) {
  if (!f.endsWith('.md')) continue;
  const text = readFileSync(join(P.modules, f), 'utf8');
  const fm = parseFrontmatter(text);
  const id = `modules/${f.replace(/\.md$/, '')}`;
  modules.set(id, {
    id,
    kind: 'module',
    category: 'modules',
    name: fm.name || id,
    description: fm.description || '',
    tags: fm.tags || [],
    compose: [],
    file: `modules/${f}`,
    body: extractBody(text, f),
    origin: 'builtin',
  });
}

/** 扫描角色目录（prompts = 自建，vendor = 第三方导入） */
function scanRoles(dir, origin) {
  const out = [];
  for (const abs of walkMd(dir)) {
    const base = basename(abs);
    // 跳过说明类文件（NOTICE / README），它们不是 prompt
    if (/^(NOTICE|README|LICENSE)\b/i.test(base)) continue;
    const rel = relative(ROOT, abs).replace(/\\/g, '/');
    const text = readFileSync(abs, 'utf8');
    const fm = parseFrontmatter(text);
    if (!fm.name) continue; // 无 frontmatter 的文档不入库
    const parts = rel.split('/');
    // prompts/<category>/<file>.md  |  vendor/<source>/<category>/<file>.md
    const category = origin === 'vendor' ? parts[parts.length - 2] : parts[1];
    out.push({
      id: rel.replace(/\.md$/, ''),
      kind: 'role',
      category,
      name: fm.name || basename(rel, '.md'),
      description: fm.description || '',
      tags: fm.tags || [],
      compose: fm.compose || [],
      file: rel,
      body: extractBody(text, rel),
      origin,
      license: fm.license || '',
      source: fm.source || '',
    });
  }
  return out;
}

const roles = [...scanRoles(P.prompts, 'builtin'), ...scanRoles(P.vendor, 'vendor')].sort((a, b) => {
  const ia = CAT_ORDER.indexOf(a.category);
  const ib = CAT_ORDER.indexOf(b.category);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.name.localeCompare(b.name);
});

/* ---------------- 生成组合 ---------------- */

mkdirSync(P.combos, { recursive: true });
const combos = [];
for (const role of roles) {
  const declared = role.compose || [];
  if (!declared.length) continue;
  const missing = declared.filter((id) => !modules.has(id) && !modules.has(`modules/${id}`));
  if (missing.length) console.warn(`⚠ ${role.file}: 缺失模块 ${missing.join(', ')}`);
  const mods = declared.map((id) => modules.get(id) ?? modules.get(`modules/${id}`)).filter(Boolean);
  if (!mods.length) continue;

  const merged = [role.body, ...mods.map((m) => m.body)].join('\n\n');
  const comboId = `${role.category}-${basename(role.file, '.md')}`;
  const mermaid = toMermaid(role, mods);

  const md = `# 组合：${role.name}

> 角色：\`${role.file}\` ｜ 模块：${mods.map((m) => `\`${m.file}\``).join('、')}
> 由 \`node scripts/build-combos.mjs\` 生成于 ${TODAY}；点下方代码块右上角按钮一键复制。

## 架构

\`\`\`mermaid
${mermaid}
\`\`\`

## 组合 prompt

\`\`\`text
${merged}
\`\`\`
`;
  writeFileSync(join(P.combos, `${comboId}.md`), md);

  combos.push({
    id: `combos/${comboId}`,
    kind: 'combo',
    category: 'combos',
    name: role.name,
    description: `角色 × ${mods.length} 个模块：${mods.map((m) => m.name).join(' + ')}`,
    tags: [...new Set([...(role.tags || []), '组合'])],
    compose: mods.map((m) => m.id),
    file: `combos/${comboId}.md`,
    body: merged,
    origin: role.origin,
    roleId: role.id,
    graph: toGraph(role, mods),
    mermaid,
  });
  console.log(`✓ combos/${comboId}.md  ← ${role.name} (${mods.length} 模块)`);
}

/* ---------------- UI 数据 ---------------- */

const items = [...roles, ...combos, ...modules.values()];

// UI 只打包元数据；正文按需从 /api/prompts/<id>.json 拉取（避免首屏背上全部正文）
const metaOf = (it) => ({
  id: it.id,
  kind: it.kind,
  category: it.category,
  name: it.name,
  description: it.description,
  tags: it.tags,
  compose: it.compose,
  origin: it.origin,
  lines: it.body.split('\n').length,
  ...(it.file ? { file: it.file } : {}),
  ...(it.roleId ? { roleId: it.roleId } : {}),
  ...(it.graph ? { graph: it.graph } : {}),
  ...(it.mermaid ? { mermaid: it.mermaid } : {}),
  ...(it.license ? { license: it.license } : {}),
  ...(it.source ? { source: it.source } : {}),
});
mkdirSync(dirname(P.bundle), { recursive: true });
writeFileSync(P.bundle, JSON.stringify({ generated: TODAY, items: items.map(metaOf) }, null, 2) + '\n');
console.log(`✓ web/src/data/bundle.json  (${items.length} 条元数据；正文走 API)`);

/* ---------------- 静态 Agent API ---------------- */

if (existsSync(P.api)) rmSync(P.api, { recursive: true, force: true });
mkdirSync(join(P.api, 'prompts'), { recursive: true });

const slug = (id) => id.replace(/\//g, '__');
const meta = (it) => ({
  id: it.id,
  kind: it.kind,
  category: it.category,
  name: it.name,
  description: it.description,
  tags: it.tags,
  compose: it.compose,
  lines: it.body.split('\n').length,
  url: `prompts/${slug(it.id)}.json`,
  ...(it.origin === 'vendor' ? { origin: 'vendor', source: it.source, license: it.license } : {}),
});

writeFileSync(
  join(P.api, 'index.json'),
  JSON.stringify(
    { version: 1, generated: TODAY, counts: { role: roles.length, module: modules.size, combo: combos.length }, items: items.map(meta) },
    null,
    2,
  ) + '\n',
);

for (const it of items) {
  writeFileSync(
    join(P.api, 'prompts', `${slug(it.id)}.json`),
    JSON.stringify({ ...meta(it), body: it.body, ...(it.mermaid ? { mermaid: it.mermaid } : {}) }, null, 2) + '\n',
  );
}

writeFileSync(
  join(P.api, 'recipes.json'),
  JSON.stringify(
    {
      version: 1,
      generated: TODAY,
      composeRule: '按顺序拼接：角色正文 → 各模块正文，用空行分隔',
      recipes: combos.map((c) => ({ id: c.id, name: c.name, role: c.roleId, modules: c.compose, url: `prompts/${slug(c.id)}.json` })),
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(P.api, 'README.md'),
  `# Agent API

静态 JSON，无需鉴权。基址：\`https://bigonion.cn/prompt-stores/api/\`

| 端点 | 用途 |
|---|---|
| \`index.json\` | 全部条目元数据（id / kind / category / tags / compose / lines），不含正文 |
| \`prompts/<id>.json\` | 单条完整正文（\`id\` 中的 \`/\` 替换为 \`__\`） |
| \`recipes.json\` | 预设组合清单与模块依赖 |

## 组合规则

\`\`\`
最终 prompt = 角色正文 + "\\n\\n" + 各模块正文（按 recipes.modules 顺序）
\`\`\`

## 典型流程

1. 拉 \`index.json\`，按 \`kind\` / \`category\` / \`tags\` 过滤
2. 对需要的条目拉 \`prompts/<id>.json\` 取 \`body\`
3. 需要成品组合时直接取 \`recipes.json\` 里的 \`url\`，或用上面的拼接规则自行组合
`,
);

writeFileSync(
  P.llms,
  `# Prompt Stores

个人提示词库：角色 prompt、可复用能力模块、以及两者的组合。全部内容为纯文本，可直接取用。

## 给 agent 的入口

- 索引（推荐先取）：https://bigonion.cn/prompt-stores/api/index.json
- 单条全文：https://bigonion.cn/prompt-stores/api/prompts/<id>.json （id 中 "/" 换成 "__"）
- 组合配方：https://bigonion.cn/prompt-stores/api/recipes.json
- 接口契约：https://bigonion.cn/prompt-stores/api/README.md

## 三类内容

- **role**：可独立使用的完整角色 prompt
- **module**：不能单独使用，是要追加到角色后面的能力约束片段
- **combo**：role + 若干 module 的成品，已按顺序拼接好

## 组合规则

最终 prompt = 角色正文 + 空行 + 各模块正文（顺序见 recipes.json）。

## 站点

https://bigonion.cn/prompt-stores/
`,
);

console.log(`✓ web/public/api  (${items.length} 个 json + index + recipes)`);
// 指针式检查：自建 prompt 应当"只指路不展开"；vendor 导入内容豁免
const POINTER_MAX = 12;
const verbose = roles.filter((r) => r.origin !== 'vendor' && r.body.split(String.fromCharCode(10)).length > POINTER_MAX);
if (verbose.length) {
  console.warn(`
⚠ 以下自建 prompt 超过 ${POINTER_MAX} 行，可能不是指针式写法（本库要求只列 skill/方法名，不展开内容）：`);
  for (const r of verbose) console.warn(`   ${r.file}  ${r.body.split(String.fromCharCode(10)).length} 行`);
}

console.log(`✓ web/public/llms.txt`);
console.log(
  `\n完成：角色 ${roles.length}（其中 vendor ${roles.filter((r) => r.origin === 'vendor').length}）｜模块 ${modules.size}｜组合 ${combos.length}`,
);
