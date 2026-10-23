#!/usr/bin/env node
/**
 * Prompt Stores MCP Server（stdio，零依赖）
 *
 * 让 agent 直接检索/读取/组合本仓库的提示词，不依赖任何后端。
 * 数据源：web/src/data/bundle.json（元数据）+ web/public/api/prompts/*.json（正文）
 *
 * 接入方式（Claude Desktop / Claude Code / Cursor 等）：
 *   {
 *     "mcpServers": {
 *       "prompt-stores": {
 *         "command": "node",
 *         "args": ["<仓库绝对路径>/tools/mcp-server.mjs"]
 *       }
 *     }
 *   }
 *
 * 工具：search_prompts / get_prompt / compose_prompt / list_categories
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const META = join(ROOT, 'web', 'src', 'data', 'bundle.json');
const API = join(ROOT, 'web', 'public', 'api', 'prompts');

/* ---------------- 数据 ---------------- */

function loadMeta() {
  if (!existsSync(META)) throw new Error(`找不到 ${META}，请先运行 node scripts/build-combos.mjs`);
  return JSON.parse(readFileSync(META, 'utf8')).items;
}

const bodyCache = new Map();
function loadBody(item) {
  if (bodyCache.has(item.id)) return bodyCache.get(item.id);
  const file = join(API, `${item.id.replace(/\//g, '__')}.json`);
  if (!existsSync(file)) return '';
  const body = JSON.parse(readFileSync(file, 'utf8')).body ?? '';
  bodyCache.set(item.id, body);
  return body;
}

const ITEMS = loadMeta();
const byId = new Map(ITEMS.map((i) => [i.id, i]));
const resolveModule = (id) => byId.get(id) ?? byId.get(`modules/${id}`);

/* ---------------- 工具实现 ---------------- */

const TOOLS = [
  {
    name: 'search_prompts',
    description:
      '在提示词库中按关键词搜索（名称/描述/标签）。可限定类型 role|module|combo 与分类（fullstack/embedded/ai/writing/devops/data/quality/general）。返回元数据，不含正文。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '关键词，留空则返回全部' },
        kind: { type: 'string', enum: ['role', 'module', 'combo'], description: '按类型过滤' },
        category: { type: 'string', description: '按分类过滤' },
        limit: { type: 'number', description: '最多返回条数，默认 20' },
      },
    },
  },
  {
    name: 'get_prompt',
    description: '按 id 取得单条提示词的完整正文（也可传名称的一部分做模糊匹配）。',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: '条目 id 或名称关键词' } },
      required: ['id'],
    },
  },
  {
    name: 'compose_prompt',
    description:
      '把角色 prompt 与若干模块拼成一个可直接使用的完整 prompt。拼接规则：角色正文 + 空行 + 各模块正文。',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', description: '角色 id 或名称关键词' },
        modules: { type: 'array', items: { type: 'string' }, description: '模块 id 或名称关键词列表，按给定顺序拼接' },
      },
      required: ['role'],
    },
  },
  {
    name: 'list_categories',
    description: '列出所有分类与各类型的条目数量，用于决定搜索范围。',
    inputSchema: { type: 'object', properties: {} },
  },
];

const meta = (i) => ({
  id: i.id,
  kind: i.kind,
  category: i.category,
  name: i.name,
  description: i.description,
  tags: i.tags,
  compose: i.compose,
  lines: i.lines,
  ...(i.origin && i.origin !== 'builtin' ? { origin: i.origin } : {}),
  ...(i.source ? { source: i.source } : {}),
});

function pick(ref) {
  if (!ref) return undefined;
  const direct = byId.get(ref);
  if (direct) return direct;
  const q = String(ref).toLowerCase();
  return (
    ITEMS.find((i) => i.name.toLowerCase() === q) ??
    ITEMS.find((i) => i.name.toLowerCase().includes(q)) ??
    ITEMS.find((i) => i.id.toLowerCase().includes(q))
  );
}

function search({ query = '', kind, category, limit = 20 }) {
  const q = String(query).toLowerCase().trim();
  return ITEMS.filter((i) => {
    if (kind && i.kind !== kind) return false;
    if (category && i.category !== category) return false;
    if (!q) return true;
    return `${i.name} ${i.description} ${i.tags.join(' ')} ${i.id}`.toLowerCase().includes(q);
  })
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 20)))
    .map(meta);
}

function get(ref) {
  const item = pick(ref);
  if (!item) return { error: `未找到：${ref}` };
  return { ...meta(item), body: loadBody(item), ...(item.mermaid ? { mermaid: item.mermaid } : {}) };
}

function compose({ role, modules = [] }) {
  const r = pick(role);
  if (!r) return { error: `未找到角色：${role}` };
  const mods = [];
  const missing = [];
  for (const ref of modules) {
    const m = pick(ref);
    if (m) mods.push(m);
    else missing.push(ref);
  }
  const parts = [loadBody(r), ...mods.map(loadBody)].filter(Boolean);
  return {
    role: meta(r),
    modules: mods.map(meta),
    ...(missing.length ? { missing } : {}),
    lines: parts.join('\n\n').split('\n').length,
    prompt: parts.join('\n\n'),
  };
}

function categories() {
  const counts = {};
  for (const i of ITEMS) {
    const key = `${i.kind}/${i.category}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return { total: ITEMS.length, counts };
}

/* ---------------- JSON-RPC over stdio ---------------- */

const text = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }] });

function handle(msg) {
  const { id, method, params } = msg;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    case 'initialize':
      return ok({
        protocolVersion: params?.protocolVersion ?? '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'prompt-stores', version: '1.0.0' },
      });
    case 'notifications/initialized':
      return null;
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS });
    case 'tools/call': {
      const name = params?.name;
      const args = params?.arguments ?? {};
      try {
        if (name === 'search_prompts') return ok(text(search(args)));
        if (name === 'get_prompt') return ok(text(get(args.id)));
        if (name === 'compose_prompt') return ok(text(compose(args)));
        if (name === 'list_categories') return ok(text(categories()));
        return fail(-32601, `未知工具：${name}`);
      } catch (e) {
        return ok({ content: [{ type: 'text', text: `执行失败：${e instanceof Error ? e.message : String(e)}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `未实现的方法：${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON 解析失败' } }) + '\n');
    return;
  }
  const res = handle(msg);
  if (res) process.stdout.write(JSON.stringify(res) + '\n');
});
