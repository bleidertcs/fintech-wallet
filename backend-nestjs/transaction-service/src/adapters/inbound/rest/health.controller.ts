import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verificar salud del microservicio Transaction Service' })
  @ApiResponse({ status: 200, description: 'Microservicio funcionando correctamente' })
  checkHealth() {
    return {
      status: 'UP',
      service: 'transaction-service',
      timestamp: new Date().toISOString(),
    };
  }
}
