import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { trace, context } from '@opentelemetry/api';

const podName = process.env.POD_NAME || process.env.HOSTNAME || 'unknown-pod';
const podNamespace = process.env.POD_NAMESPACE || 'fintech';
const nodeName = process.env.NODE_NAME || 'k8s-node';
const clusterName = process.env.CLUSTER_NAME || 'fintech-k8s-cluster';
const serviceName = process.env.OTEL_SERVICE_NAME || 'user-service';
const environment = process.env.NODE_ENV || 'production';
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.fintech.svc.cluster.local:4318';

export const otelLogFormat = winston.format((info) => {
  const currentSpan = trace.getSpan(context.active());
  const traceId = currentSpan?.spanContext().traceId || info.trace_id || '';
  const spanId = currentSpan?.spanContext().spanId || info.span_id || '';

  if (currentSpan) {
    const spanContext = currentSpan.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
    info.trace_flags = `0${spanContext.traceFlags.toString(16)}`;
  }

  // Exportar OTLP Log directamente a SigNoz
  try {
    const levelStr = String(info.level || 'info').toLowerCase();
    let severityNumber = 9;
    if (levelStr.includes('error')) severityNumber = 17;
    else if (levelStr.includes('warn')) severityNumber = 13;
    else if (levelStr.includes('debug')) severityNumber = 5;

    const logBody = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);

    const payload = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: serviceName } },
              { key: 'k8s.pod.name', value: { stringValue: podName } },
              { key: 'k8s.namespace.name', value: { stringValue: podNamespace } },
              { key: 'k8s.node.name', value: { stringValue: nodeName } },
              { key: 'k8s.deployment.name', value: { stringValue: serviceName } },
              { key: 'k8s.container.name', value: { stringValue: serviceName } },
              { key: 'k8s.cluster.name', value: { stringValue: clusterName } },
              { key: 'host.name', value: { stringValue: podName } },
              { key: 'deployment.environment', value: { stringValue: environment } },
            ],
          },
          scopeLogs: [
            {
              scope: { name: serviceName },
              logRecords: [
                {
                  timeUnixNano: String(BigInt(Date.now()) * 1000000n),
                  severityNumber: severityNumber,
                  severityText: levelStr.toUpperCase(),
                  body: { stringValue: logBody },
                  traceId: traceId,
                  spanId: spanId,
                  attributes: [
                    { key: 'context', value: { stringValue: String(info.context || serviceName) } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    fetch(`${otelEndpoint.replace(/\/$/, '')}/v1/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {
    // Ignorar errores en exportador OTLP
  }

  return info;
});

export class WinstonLogger implements LoggerService {
  private logger: winston.Logger;

  constructor(private contextName: string = 'UserService') {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        otelLogFormat(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const currentSpan = trace.getSpan(context.active());
              const traceId = currentSpan?.spanContext().traceId || 'N/A';
              const spanId = currentSpan?.spanContext().spanId || 'N/A';
              return `[${this.contextName}] ${timestamp} ${level}: ${message} [pod: ${podName}, deployment: ${serviceName}, container: ${serviceName}, namespace: ${podNamespace}, node: ${nodeName}, cluster: ${clusterName}, host: ${podName}, env: ${environment}, trace_id: ${traceId}, span_id: ${spanId}]`;
            }),
          ),
        }),
      ],
    });
  }

  log(message: string) {
    this.logger.info(message, { context: this.contextName });
  }

  error(message: string, traceStr?: string) {
    this.logger.error(message, { trace: traceStr, context: this.contextName });
  }

  warn(message: string) {
    this.logger.warn(message, { context: this.contextName });
  }

  debug(message: string) {
    this.logger.debug(message, { context: this.contextName });
  }
}
