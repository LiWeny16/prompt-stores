#!/usr/bin/env node
/**
 * 给缺"输出验收"的自建指针式 prompt 补一行验收要求。
 *
 * 依据 PM 评审：指针式 prompt 得分低的主因是"没有产物判定标准"，
 * 补一条统一的证据要求即可显著提升可执行性，且只增加 1 行。
 *
 * 用法：node scripts/add-acceptance.mjs [--dry]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATS = ['fullstack', 'embedded', 'ai', 'writing', 'devops', 'data', 'quality', 'general'];
const DRY = process.argv.includes('--dry');

/** 出现任一关键词即视为已有验收要求 */
const ACCEPT_KEYS = ['报告', '验收', '证据', '自查', '不许', '禁止', '未验证', '才算', '输出格式', '复跑', '回归', '实测', '给出'];

/** 按分类给不同的验收句，避免全是同一句话 */
const CLAUSE = {
  quality: '完成后给出实际证据（命令、测试输出或日志），未验证的问题不许当作已修复。',
  fullstack: '完成后报告改了什么、怎么验证的（命令与结果），未跑通不算完成。',
  embedded: '完成后附实测证据（日志、计数器、波形或读数），只有文档推导不算通过。',
  ai: '完成后说明依据来源与不确定处，不许把推测当结论。',
  writing: '完成后给出改动清单与原意不变的自检结论。',
  data: '完成后附校验结果（行数、字段、抽样比对），对不上不算完成。',
  devops: '完成后附命令输出与回滚方式，未验证的步骤要标注。',
  general: '完成后给出实际证据与仍未解决的部分。',
};

let changed = 0;
const report = [];

for (const cat of CATS) {
  const dir = join(ROOT, 'prompts', cat);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.md')) continue;
    const abs = join(dir, f);
    const text = readFileSync(abs, 'utf8');
    const m = text.match(/(`{3,})text\r?\n([\s\S]*?)\r?\n\1/);
    if (!m) continue;
    const body = m[2];
    const lines = body.split('\n');
    // 只处理指针式（≤6 行）
    if (lines.length > 6) continue;
    if (ACCEPT_KEYS.some((k) => body.includes(k))) continue;

    const clause = CLAUSE[cat] ?? CLAUSE.general;
    const newBody = `${body}\n${clause}`;
    const fence = m[1];
    const next = text.replace(m[0], `${fence}text\n${newBody}\n${fence}`);

    if (!DRY) writeFileSync(abs, next);
    changed++;
    report.push({ file: `prompts/${cat}/${f}`, added: clause });
  }
}

console.log(JSON.stringify({ dry: DRY, changed, report }, null, 2));
