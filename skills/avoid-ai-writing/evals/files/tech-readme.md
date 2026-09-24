# trace-kit

## 链路追踪

本模块旨在为微服务架构提供全链路的可观测性能力。通过接入 OpenTelemetry，我们可以对调用链路进行追踪，并对异常请求进行分析，从而形成问题定位的闭环。

```bash
npm install @otel/sdk
```

启动时设置 `OTEL_EXPORTER_OTLP_ENDPOINT`，再运行：

```bash
npm start
```

## 告警

告警模块采用闭环控制：连续三次采样超过阈值才触发，恢复后自动关闭，避免抖动。
