# Prompt Stores

个人提示词仓库：**角色 + 模块** 组合式结构，小而美，一键复制。

## 使用方式

- **本地浏览 UI**：双击 `ui/index.html`（数据已内嵌，无需服务器）——分类切换、搜索（`/` 或 Ctrl/⌘+K）、预览、一键复制
- **GitHub Pages**：仓库 Settings → Pages → 部署 main 分支 → `https://<user>.github.io/prompt-stores/ui/`
- **复制单个 prompt / 模块**：打开对应文件，点代码块右上角的复制按钮（GitHub 自带）
- **复制项目组合 prompt**（角色 + 模块已合并）：开 [`combos/`](combos/)，同样一键复制
- **给 agent 用**：直接让 agent 读本仓库；角色挂载了哪些模块在 frontmatter `compose` 字段里，agent 会按需加载

> UI 交互元素来自 [Lucian UX/UI Prompt](https://lucianlabs.dev/uxui-prompt)（#008 复制按钮 / #039 胶囊标签 / #046 命令面板 / #219 主题圆形揭示，MIT）

## 结构

```
prompts/            角色 prompt（按领域分类）
  fullstack/          前后端全栈（Web / 桌面 / 小程序）
  embedded/           嵌入式（MCU / RTOS / 硬件）
  ai/                 AI 应用（Agent / LLM / RAG）
  writing/            文档写作（去AI味 / 技术文档 / mermaid / docx）
  devops/             运维部署（Docker / CI/CD / 脚本）
  data/               数据处理（SQL / 爬虫 / 清洗）
  quality/            质量审查（Code Review / 调试 / 安全）
  general/            通用工作流（任务分解 / 头脑风暴 / 日常）
modules/            跨领域能力模块，可被任意角色挂载组合
combos/             组合 prompt（脚本生成，随仓库提交）
ui/index.html       单文件浏览 UI（双击即用，数据内嵌）
scripts/            build-combos.mjs 组合生成器 + UI 数据注入
docs/rawprompts/    原始 prompt 备份
```

## 索引

### 角色 prompts

| 分类 | 文件 | 说明 |
|---|---|---|
| fullstack | [product-delivery.md](prompts/fullstack/product-delivery.md) | 产品交付负责人：默认技术栈（Tauri/React）、闭环验收、兼容性验证 |
| embedded | [firmware-delivery.md](prompts/embedded/firmware-delivery.md) | 嵌入式交付负责人：资源预算、跨核协议、诊断闭环、上板验收 |
| ai | [builtin-assistant.md](prompts/ai/builtin-assistant.md) | AI 内置助手交付：复用成熟引擎、会话稳定、工具标准化 |
| writing | [de-ai-flavor.md](prompts/writing/de-ai-flavor.md) | 中文去AI味：改写成自然的人类表达 |

### 模块

| 模块 | 说明 |
|---|---|
| [agentic-ui](modules/agentic-ui.md) | 应用内嵌 AI 助手的接口与交互约束（Agentic 接口、权限、可观察操作） |
| [page-state-api](modules/page-state-api.md) | 把页面状态暴露给 Agent 的接口设计（getState / describeActions / 版本化 / 脱敏） |

### 组合（一键复制整块）

| 组合 | 内容 |
|---|---|
| [fullstack-product-delivery](combos/fullstack-product-delivery.md) | 前后端交付负责人 × agentic-ui + page-state-api（内嵌 AI 助手的全栈项目） |
| [ai-builtin-assistant](combos/ai-builtin-assistant.md) | AI 内置助手 × page-state-api |

## 写作规范（小而美）

1. **正文 ≤ 50 行**：角色 1 句话说清，规则全部条目化，每条一句话
2. **技能/规范只列名，不展开**：如"需要 mermaid → 加载 mermaid skill，按其规范输出"；展开内容放 skill 或官方文档，agent 自己查
3. **占位符统一用【】**：`【填写产品目标…】`
4. **跨领域能力写成模块**（`modules/`），不塞进角色 prompt；角色只声明何时挂载
5. **正文包在 \`\`\`text 围栏里**：GitHub 渲染后自带一键复制按钮
6. 每个 prompt 必须有 frontmatter：`name` / `category` / `tags` / `description` / `updated`，按需 `compose`

## 维护

```bash
# 新增/修改角色或模块后，重新生成组合、刷新 UI 数据并提交
node scripts/build-combos.mjs
git add . && git commit -m "update prompts"
```

新增角色：拷贝任一现有文件格式 → 填 frontmatter 与正文 → 需要组合时加 `compose: [模块id, ...]` → 跑脚本。
