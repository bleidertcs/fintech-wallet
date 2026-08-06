import * as winston from 'winston';
import { trace, context } from '@opentelemetry/api';

export class OtlpLogTransport extends (winston.transports.Console as any) {
  private otelEndpoint: string;
  private serviceName: string;
  private podName: string;
  private podNamespace: string;
  private nodeName: string;
  private clusterName: string;

  constructor(opts?: { serviceName?: string }) {
    super();
    this.otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.fintech.svc.cluster.local:4318';
    this.serviceName = opts?.serviceName || process.env.OTEL_SERVICE_NAME || 'auth-service';
    this.podName = process.env.POD_NAME || process.env.HOSTNAME || 'unknown-pod';
    this.podNamespace = process.env.POD_NAMESPACE || 'fintech';
    this.nodeName = process.env.NODE_NAME || 'k8s-node';
    this.clusterName = process.env.CLUSTER_NAME || 'fintech-k8s-cluster';
  }

  log(info: any, callback: () => void) {
    try {
      const currentSpan = trace.getSpan(context.active());
      const traceId = currentSpan?.spanContext().traceId || info.trace_id || '';
      const spanId = currentSpan?.spanContext().spanId || info.span_id || '';

      const levelStr = String(info.level || 'info').toLowerCase();
      let severityNumber = 9; // INFO
      if (levelStr.includes('error')) severityNumber = 17;
      else if (levelStr.includes('warn')) severityNumber = 13;
      else if (levelStr.includes('debug')) severityNumber = 5;

      const logBody = typeof info.message === 'string' 
        ? info.message 
        : JSON.stringify(info.message);

      const payload = {
        resourceLogs: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: this.serviceName } },
                { key: 'k8s.pod.name', value: { stringValue: this.podName } },
                { key: 'k8s.namespace.name', value: { stringValue: this.podNamespace } },
                { key: 'k8s.node.name', value: { stringValue: this.nodeName } },
                { key: 'k8s.deployment.name', value: { stringValue: this.serviceName } },
                { key: 'k8s.container.name', value: { stringValue: this.serviceName } },
                { key: 'k8s.cluster.name', value: { stringValue: this.clusterName } },
                { key: 'host.name', value: { stringValue: this.podName } },
                { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'production' } },
              ],
            },
            scopeLogs: [
              {
                scope: { name: this.serviceName },
                logRecords: [
                  {
                    timeUnixNano: String(BigInt(Date.now()) * 1000000n),
                    severityNumber: severityNumber,
                    severityText: levelStr.toUpperCase(),
                    body: { stringValue: logBody },
                    traceId: traceId,
                    spanId: spanId,
                    attributes: [
                      { key: 'context', value: { stringValue: String(info.context || this.serviceName) } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      fetch(`${this.otelEndpoint.replace(/\/$/, '')}/v1/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (e) {
      // Ignorar errores
    }

    if (callback) callback();
  }
}
