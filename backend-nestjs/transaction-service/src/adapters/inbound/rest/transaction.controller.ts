import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  Inject,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import {
  TRANSACTION_SERVICE_PORT,
  TransactionServicePort,
} from '../../../domain/ports/inbound/transaction-service.port';
import { TransferRequestDto } from './dto/transfer-request.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { MoneyRequestDto } from './dto/money-request.dto';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionController {
  constructor(
    @Inject(TRANSACTION_SERVICE_PORT)
    private readonly transactionService: TransactionServicePort,
  ) {}

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Realizar transferencia entre usuarios (Idempotente)' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
    description: 'Clave única para garantizar la idempotencia de la transferencia',
  })
  @ApiResponse({ status: 200, type: TransferResponseDto, description: 'Transferencia realizada con éxito' })
  @ApiResponse({ status: 400, description: 'Saldo insuficiente o datos inválidos' })
  async transfer(
    @Body() dto: TransferRequestDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<TransferResponseDto> {
    const result = await this.transactionService.transfer({
      fromUserId: dto.fromUserId,
      toUserId: dto.toUserId,
      amount: dto.amount,
      idempotencyKey,
    });

    return {
      id: result.id!,
      fromUserId: result.fromUserId,
      toUserId: result.toUserId,
      amount: result.amount,
      status: result.status,
      createdAt: result.createdAt!,
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener historial de transacciones por usuario' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, type: [TransferResponseDto] })
  async getByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<TransferResponseDto[]> {
    const list = await this.transactionService.getUserTransactions(userId);
    return list.map((t) => ({
      id: t.id!,
      fromUserId: t.fromUserId,
      toUserId: t.toUserId,
      amount: t.amount,
      status: t.status,
      createdAt: t.createdAt!,
    }));
  }

  @Get('all')
  @ApiOperation({ summary: 'Listar todas las transacciones (Administración)' })
  @ApiResponse({ status: 200, type: [TransferResponseDto] })
  async getAll(): Promise<TransferResponseDto[]> {
    const list = await this.transactionService.getAllTransactions();
    return list.map((t) => ({
      id: t.id!,
      fromUserId: t.fromUserId,
      toUserId: t.toUserId,
      amount: t.amount,
      status: t.status,
      createdAt: t.createdAt!,
    }));
  }

  @Post('request')
  @ApiOperation({ summary: 'Crear solicitud de dinero a otro usuario' })
  @ApiResponse({ status: 201, type: MoneyRequestDto })
  async createRequest(@Body() dto: MoneyRequestDto): Promise<MoneyRequestDto> {
    const result = await this.transactionService.createMoneyRequest({
      requesterId: dto.requesterId,
      targetId: dto.targetId,
      amount: dto.amount,
      message: dto.message,
    });

    return {
      id: result.id,
      requesterId: result.requesterId,
      targetId: result.targetId,
      amount: result.amount,
      message: result.message,
      status: result.status,
      createdAt: result.createdAt,
    };
  }

  @Get('requests/:userId')
  @ApiOperation({ summary: 'Obtener solicitudes de dinero vinculadas a un usuario' })
  @ApiParam({ name: 'userId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, type: [MoneyRequestDto] })
  async getRequests(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<MoneyRequestDto[]> {
    const list = await this.transactionService.getUserMoneyRequests(userId);
    return list.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      targetId: r.targetId,
      amount: r.amount,
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  @Put('requests/:id/accept')
  @ApiOperation({ summary: 'Aceptar solicitud de dinero (Ejecuta transferencia implícita)' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, type: TransferResponseDto })
  async acceptRequest(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TransferResponseDto> {
    const result = await this.transactionService.acceptMoneyRequest(id, 0);
    return {
      id: result.id!,
      fromUserId: result.fromUserId,
      toUserId: result.toUserId,
      amount: result.amount,
      status: result.status,
      createdAt: result.createdAt!,
    };
  }

  @Put('requests/:id/reject')
  @ApiOperation({ summary: 'Rechazar solicitud de dinero' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, type: MoneyRequestDto })
  async rejectRequest(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MoneyRequestDto> {
    const result = await this.transactionService.rejectMoneyRequest(id, 0);
    return {
      id: result.id,
      requesterId: result.requesterId,
      targetId: result.targetId,
      amount: result.amount,
      message: result.message,
      status: result.status,
      createdAt: result.createdAt,
    };
  }
}
