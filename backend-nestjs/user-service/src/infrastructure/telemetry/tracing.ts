import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.fintech.svc.cluster.local:4318';
const serviceName = process.env.OTEL_SERVICE_NAME || 'user-service';
const podName = process.env.POD_NAME || process.env.HOSTNAME || 'unknown-pod';
const podNamespace = process.env.POD_NAMESPACE || 'fintech';
const nodeName = process.env.NODE_NAME || 'k8s-node';
const clusterName = process.env.CLUSTER_NAME || 'fintech-k8s-cluster';
const environment = process.env.NODE_ENV || 'production';

const traceExporter = new OTLPTraceExporter({
  url: `${otelEndpoint.replace(/\/$/, '')}/v1/traces`,
});

const metricExporter = new OTLPMetricExporter({
  url: `${otelEndpoint.replace(/\/$/, '')}/v1/metrics`,
});

export const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    'service.version': '1.0.0',
    'deployment.environment': environment,
    'k8s.pod.name': podName,
    'k8s.namespace.name': podNamespace,
    'k8s.node.name': nodeName,
    'k8s.deployment.name': serviceName,
    'k8s.container.name': serviceName,
    'k8s.cluster.name': clusterName,
    'host.name': podName,
  }),
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000,
  }),
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-dns': { enabled: false },
  })],
});

export function initTracing() {
  sdk.start();
  console.log(`[OpenTelemetry] OpenTelemetry e Exportador de Métricas OTLP inicializado para ${serviceName} (${podName})`);
}
