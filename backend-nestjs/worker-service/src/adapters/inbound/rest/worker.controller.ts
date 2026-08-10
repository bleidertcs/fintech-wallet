import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Inject,
  ParseIntPipe,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { WORKER_SERVICE_PORT, WorkerServicePort } from '../../../domain/ports/worker-service.port';

@ApiTags('Worker')
@Controller('worker')
export class WorkerController {
  constructor(
    @Inject(WORKER_SERVICE_PORT)
    private readonly workerService: WorkerServicePort,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Healthcheck para Ingress' })
  getHealth() {
    return { status: 'OK', service: 'worker-service', timestamp: new Date().toISOString() };
  }

  @Post('statements/request')
  @ApiOperation({ summary: 'Solicitar generación de extracto bancario en PDF' })
  @ApiResponse({ status: 201, description: 'Trabajo de extracto registrado' })
  async requestStatement(@Query('userId', ParseIntPipe) userId: number) {
    return this.workerService.requestStatement(userId);
  }

  @Get('statements/:jobId')
  @ApiOperation({ summary: 'Obtener estado de un trabajo de extracto' })
  @ApiResponse({ status: 200, description: 'Estado del trabajo de extracto' })
  async getStatementStatus(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.workerService.getJob(jobId);
  }

  @Get('statements/user/:userId')
  @ApiOperation({ summary: 'Obtener lista de trabajos de extractos de un usuario' })
  @ApiResponse({ status: 200, description: 'Lista de trabajos del usuario' })
  async getStatementsByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.workerService.getJobsByUser(userId);
  }

  @Get('statements/:jobId/download')
  @ApiOperation({ summary: 'Descargar archivo PDF del extracto bancario' })
  @ApiResponse({ status: 200, description: 'Archivo PDF del extracto' })
  async downloadStatement(@Param('jobId', ParseIntPipe) jobId: number, @Res() res: Response) {
    const job = await this.workerService.getJob(jobId);

    if (job.status !== 'COMPLETED' || !job.pdfPath) {
      throw new BadRequestException('El extracto aún no está listo o falló su generación');
    }

    const file = path.resolve(job.pdfPath);
    if (!fs.existsSync(file)) {
      throw new NotFoundException('El archivo PDF no fue encontrado en el servidor');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="statement_job_${jobId}.pdf"`);

    const filestream = fs.createReadStream(file);
    filestream.pipe(res);
  }

  @Get('audit/user/:userId')
  @ApiOperation({ summary: 'Obtener registros de auditoría de un usuario' })
  @ApiResponse({ status: 200, description: 'Lista de registros de auditoría' })
  async getAuditLogsByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.workerService.getAuditLogsForUser(userId);
  }
}
