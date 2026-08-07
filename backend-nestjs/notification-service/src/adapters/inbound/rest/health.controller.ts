import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness & Readiness Healthcheck' })
  @ApiResponse({ status: 200, description: 'Estado de salud OK' })
  checkHealth() {
    return {
      status: 'OK',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
    };
  }
}
