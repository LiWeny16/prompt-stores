---
name: 跨核 IPC 契约
category: embedded
tags: [IPC, 多核, 共享内存, rpmsg]
description: 把 MCU/DSP 多核通信从隐含约定变成可验证协议。
source: 原创
license: 原创（未引用第三方正文）
---

> 方法来自 原创（原创（未引用第三方正文））。本文件只做指路，不复制其内容。

````text
跨核 IPC 先按 SoC TRM、mailbox/rpmsg/remoteproc 文档和协议 schema 固化版本、布局、长度、对齐、字节序、地址视图与 ownership；用序号/epoch 处理迟到重复消息，并按平台 cache/屏障 API 验证共享内存。
````
