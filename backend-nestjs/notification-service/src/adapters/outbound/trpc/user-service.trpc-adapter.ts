import { Injectable, Logger } from '@nestjs/common';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import {
  UserServiceClientPort,
  UserProfileResponse,
} from '../../../domain/ports/outbound/user-service-client.port';

@Injectable()
export class UserServiceTrpcAdapter implements UserServiceClientPort {
  private readonly logger = new Logger(UserServiceTrpcAdapter.name);
  private client: any;

  constructor() {
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
    const baseUrl = userServiceUrl.replace(/\/$/, '');
    this.client = createTRPCProxyClient<any>({
      links: [
        httpBatchLink({
          url: `${baseUrl}/trpc`,
        }),
      ],
    });
  }

  async getUserProfile(userId: number): Promise<UserProfileResponse | null> {
    try {
      const response = await this.client.getUserById.query({ id: Number(userId) });
      return {
        id: Number(response.id),
        name: response.name,
        email: response.email,
      };
    } catch (error: any) {
      this.logger.warn(`Error al consultar perfil del usuario ${userId} vía tRPC: ${error.message}`);
      return null;
    }
  }
}
