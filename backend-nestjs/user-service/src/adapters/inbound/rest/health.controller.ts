import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../outbound/persistence/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (Verifica que el proceso esté activo sin depender de DB)' })
  getLiveness() {
    return { status: 'ok', service: 'user-service', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (Verifica conectividad con MySQL Prisma)' })
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', service: 'user-service' };
    } catch (err: any) {
      return { status: 'error', database: err.message, service: 'user-service' };
    }
  }

  @Get('startup')
  @ApiOperation({ summary: 'Startup probe (Verifica inicialización completa)' })
  getStartup() {
    return { status: 'ok', startupComplete: true, service: 'user-service' };
  }
}
