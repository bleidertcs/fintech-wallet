import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import { trace, context } from '@opentelemetry/api';

export const createOtelWinstonLogger = () => {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'worker-service';

  const otelFormat = winston.format((info) => {
    const currentSpan = trace.getSpan(context.active());
    if (currentSpan) {
      const spanContext = currentSpan.spanContext();
      info.trace_id = spanContext.traceId;
      info.span_id = spanContext.spanId;
      info.trace_flags = `0${spanContext.traceFlags.toString(16)}`;
    }
    info['k8s.pod.name'] = process.env.POD_NAME || process.env.HOSTNAME || 'worker-service-pod';
    info['k8s.namespace.name'] = process.env.POD_NAMESPACE || 'fintech';
    info['k8s.deployment.name'] = serviceName;
    info['k8s.container.name'] = serviceName;
    info['service.name'] = serviceName;
    return info;
  });

  return WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          otelFormat(),
          winston.format.json(),
        ),
      }),
    ],
  });
};
