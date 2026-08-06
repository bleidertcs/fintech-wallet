export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3002', 10),
  grpcPort: parseInt(process.env.GRPC_PORT || '50051', 10),
  databaseUrl: process.env.DATABASE_URL || 'mysql://root:12345@mysql:3306/userdb',
  otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.fintech.svc.cluster.local:4318',
});
