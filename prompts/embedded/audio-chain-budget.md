---
name: 音频链路格式与抖动预算
category: embedded
tags: [音频, I2S, TDM, DSP, underrun]
description: 沿 RK 音频数据路径验证格式、缓冲、欠载溢出和时钟预算。
source: 原创
license: 原创（未引用第三方正文）
---

> 方法来自 原创（原创（未引用第三方正文））。本文件只做指路，不复制其内容。

````text
音频链路按 SoC I2S/TDM/PCM TRM、ALSA/ASoC、DSP pipeline 文档逐段核对采样率、有效/容器位宽、slot 映射、stride、交织与帧周期；用测试音、FIFO 水位、underrun/overrun、端到端延迟和最坏抖动预算验证 source→DSP→IPC→buffer→DMA→codec，不能以 RPC/DMA 成功代替出声。
完成后附实测证据（日志、计数器、波形或读数），只有文档推导不算通过。
````
