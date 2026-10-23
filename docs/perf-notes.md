# 性能决策记录

## 2026-10-23 首屏优化

### 问题
线上下载完成（DOMContentLoaded）4.77s。实测代理链路约 25KB/s，108KB JS 需要 4s+。

### 排查结论（实测数据，非推测）
- GPU 加速正常：`ANGLE (AMD, AMD Radeon Graphics, D3D11)`，空闲 rAF 109fps → 渲染不是瓶颈
- 空闲 3s 内 CPU 任务 3ms、零长任务、DOM 224 节点、堆 3.8MB → 运行时不卡
- 结论：**纯下载体积问题**，不是动画/GPU/布局问题

### 变更
| 项 | 前 | 后 | 说明 |
|---|---|---|---|
| JS gzip | 98.5 KB | **37.7 KB** | 移除 react-router；React 运行时换 Preact compat |
| 首屏骨架 | 无（白屏） | 内联 HTML 骨架 | JS 未到达时即可见布局 |
| 搜索 | 每键写 history | 本地即时 + 220ms 去抖 | 输入不再触发路由 |
| 路由 | react-router 8 | 40 行 hash 路由 | 依赖清零 |

### 替换默认技术项的记录（规范第 2 条）
- **阻碍**：React 19 运行时约 60KB gzip，占全包 61%；在 25KB/s 链路上是首屏 5.3s 的主因
- **替代收益**：`react → preact/compat`，业务代码零改动，包体降低 61%
- **验证结果**：限速 25KB/s 下卡片就绪 5335ms → 2793ms；功能回归 8 项全过、零 console 错误
- **保留 React 类型**：`@types/react` 不变，TS 类型检查照常

### 剩余可优化项（未做）
- 数据 12.4KB gzip 可拆分为按需加载的 JSON（但会多一次往返，慢链路上反而更糟）
- 若要继续压缩，需放弃框架做静态 HTML 预渲染，与「React SPA」约定冲突

## 2026-10-23 内容扩容后的二次优化

内容从 8 条涨到 64 条后，正文内联让 bundle 从 45KB → **130KB gzip**（回到 5 秒首屏）。

**改动**：UI 只打包元数据（`bundle.json` 5.3KB gzip），正文改为按需从 `/api/prompts/<id>.json` 拉取并缓存；组合正文在编辑器内异步拼接。

**结果**：首屏 JS 118KB raw / **37.3KB gzip**，条目数不再影响首屏体积。
