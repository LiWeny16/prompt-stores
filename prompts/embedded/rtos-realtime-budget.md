---
name: RTOS 实时性与资源预算
category: embedded
tags: [RT-Thread, RTOS, WCET, trace]
description: 用运行证据审查调度、抖动、栈和 CPU 预算。
source: 原创
license: 原创（未引用第三方正文）
---

> 方法来自 原创（原创（未引用第三方正文））。本文件只做指路，不复制其内容。

````text
实时性问题先查 RT-Thread/RTOS 调度与中断上下文文档，再用 trace、WCET/响应时间分析、栈/队列水位和 CPU 统计核对 deadline、抖动与优先级反转；禁止用加延时、加栈掩盖超预算。
````
