import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import * as resources from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { Logger } from '@nestjs/common';

const logger = new Logger('OpenTelemetry');

const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const serviceName = process.env.OTEL_SERVICE_NAME || 'auth-service';
const podName = process.env.POD_NAME || process.env.HOSTNAME || 'unknown-pod';
const podNamespace = process.env.POD_NAMESPACE || 'fintech';
const nodeName = process.env.NODE_NAME || 'k8s-node';
const clusterName = process.env.CLUSTER_NAME || 'fintech-k8s-cluster';
const environment = process.env.NODE_ENV || 'production';

const createResource = (attrs: Record<string, any>) => {
  if (typeof (resources as any).resourceFromAttributes === 'function') {
    return (resources as any).resourceFromAttributes(attrs);
  }
  return new (resources as any).Resource(attrs);
};

const traceExporter = new OTLPTraceExporter({
  url: `${otelEndpoint.replace(/\/$/, '')}/v1/traces`,
});

const metricExporter = new OTLPMetricExporter({
  url: `${otelEndpoint.replace(/\/$/, '')}/v1/metrics`,
});

export const otelSDK = new NodeSDK({
  resource: createResource({
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
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) => {
          const url = req.url || '';
          return url.includes('/health') || url.includes('/metrics');
        },
      },
    }),
  ],
});

export function startTelemetry() {
  try {
    otelSDK.start();
    logger.log(`OpenTelemetry inicializado para ${serviceName} (${podName}) en cluster ${clusterName}`);
  } catch (error: any) {
    logger.warn(`No se pudo inicializar OpenTelemetry: ${error.message}`);
  }

  const shutdown = () => {
    otelSDK.shutdown()
      .then(() => logger.log('OpenTelemetry terminado limpiamente'))
      .catch((err) => logger.error('Error terminando OpenTelemetry', err));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
