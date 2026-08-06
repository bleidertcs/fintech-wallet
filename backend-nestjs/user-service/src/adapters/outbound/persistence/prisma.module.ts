import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaUserRepository } from './prisma-user.repository';
import { USER_REPOSITORY_PORT } from '../../../domain/ports/outbound/user.repository.port';

@Module({
  providers: [
    PrismaService,
    {
      provide: USER_REPOSITORY_PORT,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [PrismaService, USER_REPOSITORY_PORT],
})
export class PrismaModule {}
