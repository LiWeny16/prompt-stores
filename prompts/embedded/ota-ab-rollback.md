---
name: OTA A/B 回滚验收
category: embedded
tags: [OTA, A/B, bootloader, rollback]
description: 把升级成功定义为可恢复、可回滚和掉电可验证。
source: 原创
license: 原创（未引用第三方正文）
---

> 方法来自 原创（原创（未引用第三方正文））。本文件只做指路，不复制其内容。

````text
OTA 先查 bootloader A/B、签名、单调版本与看门狗文档，画出 boot 状态机、确认点、失败计数和不可启动恢复路径；用掉电注入、断网、校验失败、降级与连续重启测试回滚证据。
````
