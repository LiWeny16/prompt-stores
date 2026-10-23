# Agent API

静态 JSON，无需鉴权。基址：`https://bigonion.cn/prompt-stores/api/`

| 端点 | 用途 |
|---|---|
| `index.json` | 全部条目元数据（id / kind / category / tags / compose / lines），不含正文 |
| `prompts/<id>.json` | 单条完整正文（`id` 中的 `/` 替换为 `__`） |
| `recipes.json` | 预设组合清单与模块依赖 |

## 组合规则

```
最终 prompt = 角色正文 + "\n\n" + 各模块正文（按 recipes.modules 顺序）
```

## 典型流程

1. 拉 `index.json`，按 `kind` / `category` / `tags` 过滤
2. 对需要的条目拉 `prompts/<id>.json` 取 `body`
3. 需要成品组合时直接取 `recipes.json` 里的 `url`，或用上面的拼接规则自行组合
