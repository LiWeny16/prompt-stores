# Prompt Stores

个人提示词库：**角色（role）+ 可复用模块（module）+ 组合（combo）**，浏览器里可搜索、一键复制，也能被 agent 直接读取。

- 站点：<https://bigonion.cn/prompt-stores/>
- Agent 索引：<https://bigonion.cn/prompt-stores/api/index.json>
- 给 LLM 的入口说明：<https://bigonion.cn/prompt-stores/llms.txt>

## 三类内容

| 类型 | 说明 | 能否单独用 |
|---|---|---|
| **role** | 完整角色 prompt，直接贴进项目 | ✅ |
| **module** | 能力片段，必须追加在角色后面 | ❌ |
| **combo** | role + N 个 module 的成品，自带架构图 | ✅ |

组合由 frontmatter 的 `compose` 字段驱动，构建期自动生成：正文拼接 + Mermaid 架构图。

## 结构

```
prompts/<分类>/        自己写的角色 prompt
vendor/fabric/         第三方导入（MIT，保留原文 + 署名见 NOTICE.md）
modules/               跨领域能力模块
combos/                自动生成的组合（含 mermaid 图）
web/                   React SPA（Vite + TS + Tailwind + Preact）
web/public/api/        构建期生成的静态 Agent API
tools/mcp-server.mjs   MCP 服务（stdio，零依赖）
scripts/               build-combos.mjs / import-fabric.mjs
```

## 站点功能

- **Prompts / Modules / Combos / 我的** 四个分区，各用各的展示逻辑
- 组合详情：架构图（自绘 SVG）+ Mermaid 源码（可复制）+ 成分清单 + 一次复制完整组合
- **用户自建提示词**：新建 / 编辑 / 删除，存在浏览器 IndexedDB，仅本机可见
- **导出**：JSON（可再导入）、ZIP（每条一个可直接提交进仓库的 `.md`）；支持导入还原
- 明暗主题、`/` 或 `⌘K` 聚焦搜索、URL 可分享（`?q=` / `?item=`）

## Agent 接入（无后端）

三种方式，任选：

**1. 静态 API**

| 端点 | 用途 |
|---|---|
| `/api/index.json` | 全部元数据（不含正文） |
| `/api/prompts/<id>.json` | 单条全文，`id` 中 `/` 换成 `__` |
| `/api/recipes.json` | 组合清单与模块依赖 |

拼接规则：`角色正文 + 空行 + 各模块正文`。

**2. MCP 服务**（本地 stdio，读仓库文件）

```json
{
  "mcpServers": {
    "prompt-stores": {
      "command": "node",
      "args": ["<仓库绝对路径>/tools/mcp-server.mjs"]
    }
  }
}
```

工具：`search_prompts` / `get_prompt` / `compose_prompt` / `list_categories`

**3. 直接读仓库**：`prompts/` `modules/` `combos/` 都是纯 Markdown，代码块可直接复制。

## 本地开发

```bash
cd web && npm install && npm run dev     # 开发
node scripts/build-combos.mjs            # 重新生成组合 + API + 数据
cd web && npm run build                  # 生产构建
```

## 加内容

```bash
# 自己写：放 prompts/<分类>/xxx.md，格式见下
# 从 fabric 导入更多：
node scripts/import-fabric.mjs --dry     # 看清单
# 改 scripts/import-fabric.mjs 的 SELECTION 后：
node scripts/import-fabric.mjs

node scripts/build-combos.mjs && git add -A && git commit -m "add: xxx" && git push
```

文件格式：

```markdown
---
name: 名称
category: fullstack
tags: [标签1, 标签2]
description: 一句话说明
compose: [agentic-ui]        # 可选：声明模块即自动生成组合
---

```text
（prompt 本体，包在 text 围栏里；正文含 ``` 时用更长的围栏）
```
```

## 写作规范（小而美）

1. 正文 ≤ 50 行；角色一句话说清，规则全部条目化
2. 技能/规范只列名，不展开（展开内容放 skill 或官方文档，agent 自己去查）
3. 占位符统一用【】
4. 跨领域能力写成 `modules/`，不塞进角色 prompt
5. 正文包在 ```` ```text ```` 围栏里 —— GitHub 和站点都能一键复制

## 第三方内容

`vendor/fabric/` 来自 [fabric](https://github.com/danielmiessler/fabric)（**MIT**），原文未改动，署名见 [`vendor/fabric/NOTICE.md`](vendor/fabric/NOTICE.md)。

收录原则：**只导入 MIT / Apache / CC0 等许可明确的内容**；GPL 传染性许可与泄露的专有 prompt 一律不收。

## 性能记录

见 [`docs/perf-notes.md`](docs/perf-notes.md)：首屏 JS 37KB gzip，正文按需拉取，详见文中数据。
