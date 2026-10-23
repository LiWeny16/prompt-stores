---
name: DMA 与 Cache 一致性定位
category: embedded
tags: [DMA, Cache, descriptor, ARM]
description: 用平台契约和固定模式区分缓存、越界、描述符与带宽问题。
source: 原创
license: 原创（未引用第三方正文）
---

> 方法来自 原创（原创（未引用第三方正文））。本文件只做指路，不复制其内容。

````text
DMA 异常按 ARM ARM、SoC TRM、BSP cache-maintenance API 与 descriptor 文档核对可达地址、cache-line 对齐、clean/invalidate 顺序、屏障和 buffer ownership；用固定模式、校验和与总线/带宽观测区分 cache、越界、descriptor 和饥饿。
````
