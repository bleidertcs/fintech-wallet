import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../outbound/persistence/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  getLiveness() {
    return { status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', service: 'auth-service' };
    } catch (err: any) {
      return { status: 'error', database: err.message, service: 'auth-service' };
    }
  }

  @Get('startup')
  @ApiOperation({ summary: 'Startup probe' })
  getStartup() {
    return { status: 'ok', startupComplete: true, service: 'auth-service' };
  }
}
