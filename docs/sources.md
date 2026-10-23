# 来源与许可证台账

本库只收**许可明确、可自由使用**的内容；且绝大多数条目是「指针式」——只写"用哪个 skill/方法"，不复制其正文。

## 已收录来源

| 来源 | 星数 | 许可 | 用法 |
|---|---|---|---|
| [danielmiessler/fabric](https://github.com/danielmiessler/fabric) | 16.7k | MIT | 56 条原文导入 `vendor/fabric/` |
| [mattpocock/skills](https://github.com/mattpocock/skills) | 301k | MIT | 仅指路（tdd / code-review / ask-matt / improve-codebase-architecture） |
| [obra/superpowers](https://github.com/obra/superpowers) | 304k | MIT | 仅指路（systematic-debugging / brainstorming / writing-plans） |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | 36k | MIT | 仅指路（find-skills / npx skills） |
| [anthropics/skills](https://github.com/anthropics/skills) | 183k | **无 LICENSE** | 仅指路，**未复制任何内容** |
| [dair-ai/Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) | 79k | MIT | 仅指路（chaining / consistency / reflexion） |
| [langgptai/LangGPT](https://github.com/langgptai/LangGPT) | 12.6k | Apache-2.0 | 仅指路（结构化提示范式） |
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | 26k | MIT | 仅指路（评测闭环） |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | 40k | MIT | 仅指路（prompt-file 规范） |
| [openai/openai-cookbook](https://github.com/openai/openai-cookbook) | 77k | MIT | 仅指路（prompt optimizer） |
| [princeton-nlp/tree-of-thought-llm](https://github.com/princeton-nlp/tree-of-thought-llm) | 6k | MIT | 仅指路 |
| [ysymyth/ReAct](https://github.com/ysymyth/ReAct) | 4.2k | MIT | 仅指路 |
| [promptslab/Promptify](https://github.com/promptslab/Promptify) | 4.6k | Apache-2.0 | 仅指路 |
| [github/spec-kit](https://github.com/github/spec-kit) | 142k | MIT | 仅指路（Specify→Converge） |
| [agentsmd/agents.md](https://github.com/agentsmd/agents.md) | 25k | MIT | 仅指路（AGENTS.md 约定） |
| [kirodotdev/Kiro](https://github.com/kirodotdev/Kiro) | 4.4k | **无 LICENSE** | 仅指路，未复制内容 |
| [tintinweb/pi-subagents](https://github.com/tintinweb/pi-subagents) | 1.4k | MIT | 仅指路（worktree 并行） |
| Karpathy / Simon Willison 公开文章 | — | n/a | 仅指路（不复制正文） |

## 明确排除

| 来源 | 原因 |
|---|---|
| binary-husky/gpt_academic（71k） | GPL-3.0，传染性许可 |
| elder-plinius/CL4R1T4S（51k） | AGPL-3.0 + 泄露专有 prompt |
| asgeirtj/system_prompts_leaks（70k） | 商业产品 system prompt 泄露，即使标 CC0 也不收 |
| linshenkx/prompt-optimizer（39k） | AGPL-3.0-only |
| Hunyuan-PromptEnhancer（3.8k） | 腾讯定制许可（含地域限制） |
| NirDiamant/Prompt_Engineering（7.9k） | 仅限非商业 |
| trigaten/Learn_Prompting | 无明确许可 |
| langgptai/awesome-claude-prompts | 无 LICENSE |
| f/prompts.chat（174k） | GitHub API 返回 NOASSERTION，未作为来源引用 |
| phodal/prompt-patterns（3.1k） | 未声明许可，仅参考思路 |

## 原则

1. 原文导入 → 必须 MIT / Apache / CC0 等明确许可，且保留署名（`vendor/*/NOTICE.md`）
2. 无许可 / GPL / AGPL / 仅非商业 / 泄露内容 → **一律不入库**
3. 只引用名字与链接（指针式）→ 不受版权限制，但元数据须如实标注"未复制内容"
4. 星数会变，以 `gh api repos/<owner>/<repo>` 的读数为准
