import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { Resource } from '@opentelemetry/resources';

const provider = new WebTracerProvider({
  resource: new Resource({
    'service.name': 'frontend-wallet',
  }),
});

const exporter = new OTLPTraceExporter({
  url: '/otlp/v1/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));

provider.register({
  contextManager: new ZoneContextManager(),
});

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': {
        propagateTraceHeaderCorsUrls: [
          /.*/,
        ],
      },
      '@opentelemetry/instrumentation-xml-http-request': {
        propagateTraceHeaderCorsUrls: [
          /.*/,
        ],
      },
    }),
  ],
});

export const tracer = provider.getTracer('frontend-wallet');
