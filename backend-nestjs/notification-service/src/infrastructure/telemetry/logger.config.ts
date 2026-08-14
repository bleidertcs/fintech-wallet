import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { trace, context } from '@opentelemetry/api';

const podName = process.env.POD_NAME || process.env.HOSTNAME || 'unknown-pod';
const podNamespace = process.env.POD_NAMESPACE || 'fintech';
const nodeName = process.env.NODE_NAME || 'k8s-node';
const clusterName = process.env.CLUSTER_NAME || 'fintech-k8s-cluster';
const serviceName = process.env.OTEL_SERVICE_NAME || 'notification-service';
const environment = process.env.NODE_ENV || 'production';
const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

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
  info.k8s_pod_name = podName;
  info.k8s_namespace_name = podNamespace;
  info.k8s_node_name = nodeName;
  info.k8s_deployment_name = serviceName;
  info.k8s_container_name = serviceName;
  info.k8s_cluster_name = clusterName;
  info.host_name = podName;
  info.deployment_environment = environment;

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

export function createWinstonLogger() {
  return WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          otelLogFormat(),
          nestWinstonModuleUtilities.format.nestLike('NotificationService', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    ],
  });
}
