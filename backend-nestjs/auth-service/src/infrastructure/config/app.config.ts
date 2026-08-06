import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL,
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dGhpc2lzYXNlY3JldGtleWZvcmp3dHRva2VudmFsaWRhdGlvbmZpbnRlY2h3YWxsZXQ=',
    expiration: process.env.JWT_EXPIRATION || '24h',
  },
  mail: {
    host: process.env.MAIL_HOST || 'localhost',
    port: parseInt(process.env.MAIL_PORT || '1025', 10),
  },
  services: {
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:8082',
  },
}));
