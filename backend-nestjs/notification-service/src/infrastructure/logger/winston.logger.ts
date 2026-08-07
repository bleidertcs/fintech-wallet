import { createLogger, format, transports } from 'winston';
import { trace, context } from '@opentelemetry/api';

export function createWinstonLogger() {
  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.fintech.svc.cluster.local:4318';
  const serviceName = process.env.OTEL_SERVICE_NAME || 'notification-service';
  const podName = process.env.POD_NAME || process.env.HOSTNAME || 'unknown-pod';

  const traceFormat = format((info) => {
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      info.trace_id = spanContext.traceId;
      info.span_id = spanContext.spanId;
      info.trace_flags = `0${spanContext.traceFlags.toString(16)}`;
    }
    info['service.name'] = serviceName;
    info['k8s.pod.name'] = podName;
    info['k8s.namespace.name'] = process.env.POD_NAMESPACE || 'fintech';
    return info;
  });

  return createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
      traceFormat(),
      format.timestamp(),
      format.json(),
    ),
    transports: [
      new transports.Console(),
    ],
  });
}
