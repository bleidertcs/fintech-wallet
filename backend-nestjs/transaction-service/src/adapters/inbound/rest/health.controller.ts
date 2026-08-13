import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../outbound/persistence/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  checkHealth() {
    return { status: 'UP', service: 'transaction-service', timestamp: new Date().toISOString() };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (Verifica proceso activo)' })
  getLiveness() {
    return { status: 'ok', service: 'transaction-service', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (Verifica conectividad DB)' })
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', service: 'transaction-service' };
    } catch (err: any) {
      return { status: 'error', database: err.message, service: 'transaction-service' };
    }
  }

  @Get('startup')
  @ApiOperation({ summary: 'Startup probe' })
  getStartup() {
    return { status: 'ok', startupComplete: true, service: 'transaction-service' };
  }
}
