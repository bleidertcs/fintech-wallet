import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import {
  UserServiceClientPort,
  UserResponseDto,
  UpdateBalanceResponseDto,
} from '../../../domain/ports/outbound/user-service-client.port';

@Injectable()
export class UserServiceTrpcAdapter implements UserServiceClientPort {
  private readonly logger = new Logger(UserServiceTrpcAdapter.name);
  private client: any;

  constructor(private readonly configService: ConfigService) {
    const userServiceUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://user-service:3002',
    );
    const baseUrl = userServiceUrl.replace(/\/$/, '');
    this.client = createTRPCProxyClient<any>({
      links: [
        httpBatchLink({
          url: `${baseUrl}/trpc`,
        }),
      ],
    });
  }

  async getUser(userId: number): Promise<UserResponseDto> {
    try {
      const response = await this.client.getUserById.query({ id: Number(userId) });
      return {
        id: Number(response.id),
        name: response.name,
        email: response.email,
        balance: Number(response.balance),
        dailyLimit: Number(response.dailyLimit || 10000),
      };
    } catch (error: any) {
      this.logger.error(`Error al consultar perfil por tRPC para userId=${userId}: ${error.message}`);
      throw error;
    }
  }

  async updateBalance(userId: number, amount: number): Promise<UpdateBalanceResponseDto> {
    try {
      const success = await this.client.updateBalance.mutate({ id: Number(userId), amount });
      return {
        success: Boolean(success),
        message: success ? 'Saldo actualizado exitosamente' : 'Error actualizando saldo',
      };
    } catch (error: any) {
      this.logger.error(`Error al actualizar saldo por tRPC para userId=${userId}: ${error.message}`);
      throw error;
    }
  }
}
