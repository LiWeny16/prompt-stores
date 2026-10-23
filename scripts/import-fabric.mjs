#!/usr/bin/env node
/**
 * 导入 fabric patterns（MIT）到 vendor/fabric/<category>/<name>.md
 * 原文不改，仅加 frontmatter 与署名；许可证见 vendor/fabric/NOTICE.md
 *
 * 用法：node scripts/import-fabric.mjs            # 导入全部选定条目
 *       node scripts/import-fabric.mjs --dry       # 只看清单
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'vendor', 'fabric');
const DRY = process.argv.includes('--dry');
const REPO = 'danielmiessler/fabric';
const BASE = `https://github.com/${REPO}/tree/main/data/patterns`;

/** [pattern, category, 中文名, 中文描述] */
const SELECTION = [
  // ---------- quality ----------
  ['review_code', 'quality', '代码评审（fabric）', '资深工程师视角的代码评审：问题定位、具体改法与原理说明'],
  ['analyze_incident', 'quality', '事故分析（fabric）', '把事故材料整理成时间线、影响范围、根因与改进项'],
  ['analyze_logs', 'quality', '日志分析（fabric）', '从日志中提取异常模式、时间关联与可能根因'],
  ['analyze_terraform_plan', 'quality', 'Terraform 计划审查（fabric）', '审查 terraform plan 的破坏性变更、安全与成本风险'],
  ['create_stride_threat_model', 'quality', 'STRIDE 威胁建模（fabric）', '按 STRIDE 分类产出威胁清单与缓解措施'],
  ['analyze_threat_report', 'quality', '威胁报告分析（fabric）', '从威胁报告中提炼攻击面、趋势与可执行建议'],
  ['write_semgrep_rule', 'quality', 'Semgrep 规则编写（fabric）', '根据漏洞样本编写可用的 Semgrep 检测规则'],
  ['chinese_code_review', 'quality', '中文代码评审（fabric）', '中文输出的代码评审，含问题分级与修改建议'],
  ['judge_output', 'quality', '输出质量评判（fabric）', '按明确维度给 AI 输出打分并指出短板'],
  ['generate_code_rules', 'quality', '代码规范生成（fabric）', '从现有代码库提炼可执行的编码规则'],
  ['analyze_mistakes', 'quality', '错误复盘（fabric）', '拆解失误的成因链，给出下次可用的检查点'],

  // ---------- fullstack ----------
  ['explain_code', 'fullstack', '代码解释（fabric）', '逐层讲清一段代码的意图、结构与关键实现'],
  ['create_coding_feature', 'fullstack', '功能实现（fabric）', '从需求到可运行代码的功能开发流程'],
  ['create_coding_project', 'fullstack', '从零搭项目（fabric）', '按需求产出项目骨架、文件结构与实现步骤'],
  ['create_design_document', 'fullstack', '设计文档（fabric）', '产出技术设计文档：目标、方案、边界与取舍'],
  ['refine_design_document', 'fullstack', '设计文档打磨（fabric）', '对已有设计文档查漏补缺、强化可执行性'],
  ['review_design', 'fullstack', '设计审查（fabric）', '审查架构设计的完整性、风险与替代方案'],
  ['create_prd', 'fullstack', 'PRD 撰写（fabric）', '把想法整理成可评审的产品需求文档'],
  ['create_user_story', 'fullstack', '用户故事（fabric）', '拆解为带验收标准的用户故事'],
  ['explain_project', 'fullstack', '项目讲解（fabric）', '梳理项目结构、模块职责与主链路'],
  ['write_pull-request', 'fullstack', 'PR 描述（fabric）', '生成含背景、改动、验证与风险的 PR 说明'],
  ['summarize_git_changes', 'fullstack', '变更总结（fabric）', '把一批提交总结成结构化的变更说明'],
  ['create_git_diff_commit', 'fullstack', '提交信息生成（fabric）', '依据 diff 产出规范提交信息'],

  // ---------- ai ----------
  ['extract_wisdom_agents', 'ai', '多智能体洞见提取（fabric）', '以多角色协作方式从材料中抽取洞见与可行动项'],
  ['analyze_paper', 'ai', '论文分析（fabric）', '拆解论文的问题、方法、证据与局限'],
  ['improve_prompt', 'ai', 'Prompt 改进（fabric）', '诊断 prompt 弱点并给出改写版本'],
  ['summarize_prompt', 'ai', 'Prompt 摘要（fabric）', '把长 prompt 压缩成核心意图与约束'],
  ['explain_terms', 'ai', '术语解释（fabric）', '把专业术语讲成可理解的定义、例子与边界'],
  ['create_ai_jobs_analysis', 'ai', 'AI 影响分析（fabric）', '分析某岗位/流程受 AI 影响的部分与应对'],

  // ---------- writing ----------
  ['humanize', 'writing', '去AI味·人性化重写（fabric）', '把机器味文本改成自然口语表达，保留原意'],
  ['improve_writing', 'writing', '写作提升（fabric）', '在不改变事实的前提下改善清晰度与节奏'],
  ['write_essay', 'writing', '长文写作（fabric）', '按主题与立场产出结构完整的长文'],
  ['create_summary', 'writing', '摘要生成（fabric）', '把长内容压成保留关键信息的摘要'],
  ['extract_wisdom', 'writing', '洞见提取（fabric）', '从文本中抽取观点、事实、引用与可行动项'],
  ['create_mermaid_visualization', 'writing', 'Mermaid 图（fabric）', '把概念或数据转成 Mermaid 图，含语法校验要求'],
  ['create_mermaid_visualization_for_github', 'writing', 'Mermaid 图·GitHub 版（fabric）', '针对 GitHub 渲染限制优化的 Mermaid 图生成'],
  ['create_excalidraw_visualization', 'writing', 'Excalidraw 图（fabric）', '生成可直接导入 Excalidraw 的元素描述'],
  ['convert_to_markdown', 'writing', '转 Markdown（fabric）', '把任意格式内容整理成规范 Markdown'],
  ['clean_text', 'writing', '文本清理（fabric）', '修复排版、断行、标点与格式噪声'],
  ['create_5_sentence_summary', 'writing', '五句摘要（fabric）', '用五句话讲清核心内容，层次由浅入深'],
  ['create_aphorisms', 'writing', '格言创作（fabric）', '围绕主题写出简洁有力的短句'],
  ['translate', 'writing', '翻译（fabric）', '在保留语气与专业性的前提下翻译'],
  ['fix_typos', 'writing', '错字修正（fabric）', '只修拼写与明显笔误，不改写风格'],
  ['chinese_article_summary', 'writing', '中文文章总结（fabric）', '中文输出的文章总结，保留论据与结论'],
  ['chinese_news_translate', 'writing', '中文新闻翻译（fabric）', '新闻类文本的翻译与本地化改写'],
  ['chinese_poetry_analysis', 'writing', '中文诗词分析（fabric）', '解析意象、格律与情感层次'],

  // ---------- data ----------
  ['export_data_as_csv', 'data', '导出 CSV（fabric）', '把结构化内容整理成可直接使用的 CSV'],
  ['create_graph_from_input', 'data', '关系图生成（fabric）', '从文本中提取实体与关系并输出图结构'],
  ['create_conceptmap', 'data', '概念图（fabric）', '梳理概念之间的层级与依赖'],
  ['summarize_git_diff', 'data', 'Diff 总结（fabric）', '把代码 diff 归纳成可读的变更要点'],

  // ---------- general ----------
  ['create_quiz', 'general', '测验生成（fabric）', '根据材料出题并附答案与解析'],
  ['extract_ideas', 'general', '观点提取（fabric）', '从材料中抽取独立可用的想法清单'],
  ['find_logical_fallacies', 'general', '逻辑谬误识别（fabric）', '指出论证中的谬误类型与位置'],
  ['create_reading_plan', 'general', '阅读计划（fabric）', '按目标与时间排出可执行的阅读路径'],
  ['create_tags', 'general', '标签生成（fabric）', '为内容产出稳定的分类标签'],
  ['eisenhower_matrix', 'general', '四象限排序（fabric）', '把任务按重要/紧急分到四象限并排序'],
];

function fetchPattern(name) {
  const b64 = execFileSync('gh', ['api', `repos/${REPO}/contents/data/patterns/${name}/system.md`, '-q', '.content'], {
    encoding: 'utf8',
  });
  return Buffer.from(b64.replace(/\s/g, ''), 'base64').toString('utf8').replace(/\r\n/g, '\n').trimEnd();
}

/** 正文里若有 ``` 围栏，包裹时用更长的围栏 */
function fenceFor(text) {
  const runs = text.match(/`{3,}/g) || [];
  const max = runs.reduce((a, r) => Math.max(a, r.length), 3);
  return '`'.repeat(Math.max(3, max + 1));
}

if (DRY) {
  for (const [name, cat, cn, desc] of SELECTION) console.log(`${cat.padEnd(10)} ${name.padEnd(42)} ${cn}`);
  console.log(`\n共 ${SELECTION.length} 条`);
  process.exit(0);
}

let ok = 0;
const failed = [];
for (const [name, category, cn, desc] of SELECTION) {
  try {
    const body = fetchPattern(name);
    const fence = fenceFor(body);
    const dir = join(OUT, category);
    mkdirSync(dir, { recursive: true });
    const md = `---
name: ${cn}
category: ${category}
tags: [fabric, ${category}]
description: ${desc}
source: ${BASE}/${name}
license: MIT
origin: vendor
---

> 来自 [fabric](${BASE}/${name})，MIT License，(c) Daniel Miessler 及贡献者。原文未改动，仅添加元数据。
> 使用时把待处理内容附在 prompt 之后；变量形式见正文。

${fence}text
${body}
${fence}
`;
    writeFileSync(join(dir, `${name}.md`), md);
    ok++;
    process.stdout.write(`✓ ${category}/${name}\n`);
  } catch (e) {
    failed.push(`${name}: ${e instanceof Error ? e.message.slice(0, 60) : e}`);
  }
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  join(OUT, 'NOTICE.md'),
  `# 第三方内容声明

本目录内容来自 [danielmiessler/fabric](https://github.com/danielmiessler/fabric)，
**MIT License**，版权归 Daniel Miessler 及 fabric 贡献者所有。

- 原文地址：\`https://github.com/danielmiessler/fabric/tree/main/data/patterns/<pattern>/system.md\`
- 本地改动：仅在文件头部添加 YAML frontmatter 与本说明，正文未做修改
- 许可证全文：https://github.com/danielmiessler/fabric/blob/main/LICENSE

## 已导入条目

${SELECTION.map(([n, c, cn]) => `- \`${c}/${n}.md\` — ${cn}`).join('\n')}
`,
);

console.log(`\n完成：导入 ${ok} 条${failed.length ? `，失败 ${failed.length} 条：\n${failed.join('\n')}` : ''}`);
console.log(`✓ vendor/fabric/NOTICE.md`);
