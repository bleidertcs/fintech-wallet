import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return { status: 'OK', service: 'notification-service', timestamp: new Date().toISOString() };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  getLiveness() {
    return { status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  getReadiness() {
    return { status: 'ok', database: 'connected', service: 'notification-service' };
  }

  @Get('startup')
  @ApiOperation({ summary: 'Startup probe' })
  getStartup() {
    return { status: 'ok', startupComplete: true, service: 'notification-service' };
  }
}
