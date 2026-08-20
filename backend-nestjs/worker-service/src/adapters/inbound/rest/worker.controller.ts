import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Inject,
  Res,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import {
  WORKER_SERVICE_PORT,
  WorkerServicePort,
} from '../../../domain/ports/worker-service.port';

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
  async requestStatement(
    @Body() body?: any,
    @Query('userId') queryUserId?: string,
  ) {
    const rawId = body?.userId ?? (queryUserId ? parseInt(queryUserId, 10) : undefined);
    if (!rawId || isNaN(Number(rawId))) {
      throw new BadRequestException('userId es requerido en el body o query param');
    }
    return this.workerService.requestStatement(Number(rawId));
  }

  @Get('statements/:jobId')
  @ApiOperation({ summary: 'Obtener estado de un trabajo de extracto' })
  @ApiResponse({ status: 200, description: 'Estado del trabajo de extracto' })
  async getStatementStatus(@Param('jobId') jobId: string) {
    const numJobId = Number(jobId);
    if (isNaN(numJobId)) {
      throw new BadRequestException('jobId debe ser un número');
    }
    return this.workerService.getJob(numJobId);
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
  async downloadStatement(@Param('jobId') jobId: string, @Res() res: Response) {
    const numJobId = Number(jobId);
    if (isNaN(numJobId)) {
      throw new BadRequestException('jobId debe ser un número');
    }
    const job = await this.workerService.getJob(numJobId);

    if (job.status !== 'COMPLETED' || !job.pdfPath) {
      throw new BadRequestException('El extracto aún no está listo o falló su generación');
    }

    const file = path.resolve(job.pdfPath);
    if (!fs.existsSync(file)) {
      throw new NotFoundException('El archivo PDF no fue encontrado en el servidor');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="statement_job_${numJobId}.pdf"`);

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
