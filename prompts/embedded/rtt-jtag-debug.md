---
name: RTT/JTAG 低扰动调试
category: embedded
tags: [RTT, JTAG, fault, trace]
description: 保留实时行为，用低侵入证据锁定首个异常。
source: 原创
license: 原创（未引用第三方正文）
---

> 方法来自 原创（原创（未引用第三方正文））。本文件只做指路，不复制其内容。

````text
RTT/JTAG 调试按芯片 fault handler、JTAG/RTT、ETM/trace 文档保留可复现镜像与触发条件；用时间戳、硬件 watchpoint、故障寄存器和最小侵入 trace 锁定首个异常，不以单步通过替代实时复现。
````
