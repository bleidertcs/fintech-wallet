import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom } from 'rxjs';
import {
  UserServiceClientPort,
  UserProfileResponse,
} from '../../../domain/ports/outbound/user-service-client.port';

interface UserServiceGrpcClient {
  getUser(data: { id: number }): Observable<UserProfileResponse>;
}

@Injectable()
export class UserServiceGrpcAdapter implements UserServiceClientPort, OnModuleInit {
  private readonly logger = new Logger(UserServiceGrpcAdapter.name);

  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, 'proto/user.proto'),
      url: process.env.USER_SERVICE_GRPC_URL || 'user-service:50051',
    },
  })
  private client: ClientGrpc;

  private userService: UserServiceGrpcClient;

  onModuleInit() {
    this.userService = this.client.getService<UserServiceGrpcClient>('UserService');
  }

  async getUserProfile(userId: number): Promise<UserProfileResponse | null> {
    try {
      const response = await firstValueFrom(this.userService.getUser({ id: userId }));
      return {
        id: Number(response.id),
        name: response.name,
        email: response.email,
      };
    } catch (error) {
      this.logger.warn(`Error al consultar perfil del usuario ${userId} vía gRPC: ${error.message}`);
      return null;
    }
  }
}
