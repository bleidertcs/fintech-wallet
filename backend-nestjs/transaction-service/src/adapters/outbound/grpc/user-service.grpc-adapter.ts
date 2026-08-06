import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  UserServiceClientPort,
  UserResponseDto,
  UpdateBalanceResponseDto,
} from '../../../domain/ports/outbound/user-service-client.port';

interface UserGrpcService {
  getUser(data: { id: number }): any;
  updateBalance(data: { id: number; amount: number }): any;
}

@Injectable()
export class UserServiceGrpcAdapter implements UserServiceClientPort, OnModuleInit {
  private readonly logger = new Logger(UserServiceGrpcAdapter.name);
  private userGrpcService: UserGrpcService;

  constructor(@Inject('USER_PACKAGE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.userGrpcService = this.client.getService<UserGrpcService>('UserService');
  }

  async getUser(userId: number): Promise<UserResponseDto> {
    try {
      const response: any = await firstValueFrom(this.userGrpcService.getUser({ id: userId }));
      return {
        id: Number(response.id),
        name: response.name,
        email: response.email,
        balance: Number(response.balance),
        dailyLimit: Number(response.daily_limit || response.dailyLimit || 10000),
      };
    } catch (error) {
      this.logger.error(`Error al consultar perfil por gRPC para userId=${userId}: ${error.message}`);
      throw error;
    }
  }

  async updateBalance(userId: number, amount: number): Promise<UpdateBalanceResponseDto> {
    try {
      const response: any = await firstValueFrom(this.userGrpcService.updateBalance({ id: userId, amount }));
      return {
        success: Boolean(response.success),
        message: response.message || 'Saldo actualizado exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error al actualizar saldo por gRPC para userId=${userId}: ${error.message}`);
      throw error;
    }
  }
}
