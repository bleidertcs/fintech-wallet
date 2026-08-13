import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { appConfig } from '../../../infrastructure/config/app.config';
import { UserProfileClientPort } from '../../../domain/ports/outbound/user-profile.client.port';

@Injectable()
export class UserProfileTrpcClient implements UserProfileClientPort {
  private readonly logger = new Logger(UserProfileTrpcClient.name);
  private client: any;

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {
    const baseUrl = this.config.services.userServiceUrl.replace(/\/$/, '');
    this.client = createTRPCProxyClient<any>({
      links: [
        httpBatchLink({
          url: `${baseUrl}/trpc`,
        }),
      ],
    });
  }

  async createUserProfile(userId: bigint, name: string, email: string): Promise<void> {
    try {
      const profileName = name && name.trim().length > 0 ? name : email.split('@')[0];
      await this.client.updateBalance.mutate({
        id: Number(userId),
        amount: 10000.0,
      });
      this.logger.log(`Perfil inicializado vía tRPC para usuario ${userId} (${email})`);
    } catch (error: any) {
      this.logger.warn(`Fallback o notificación tRPC: ${error.message}`);
    }
  }
}
