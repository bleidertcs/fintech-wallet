import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import axios from 'axios';
import { appConfig } from '../../../infrastructure/config/app.config';
import { UserProfileClientPort } from '../../../domain/ports/outbound/user-profile.client.port';

@Injectable()
export class UserProfileHttpClient implements UserProfileClientPort {
  private readonly logger = new Logger(UserProfileHttpClient.name);

  constructor(
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async createUserProfile(userId: bigint, name: string, email: string): Promise<void> {
    try {
      const baseUrl = this.config.services.userServiceUrl.replace(/\/$/, '');
      const url = `${baseUrl}/users`;
      const profileName = name && name.trim().length > 0 ? name : email.split('@')[0];

      await axios.post(
        url,
        {
          name: profileName,
          email: email,
          balance: 10000.0,
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Perfil de usuario creado exitosamente en user-service para el email ${email}`);
    } catch (error: any) {
      this.logger.warn(`No se pudo crear el perfil en user-service durante el registro: ${error.message}`);
    }
  }
}
