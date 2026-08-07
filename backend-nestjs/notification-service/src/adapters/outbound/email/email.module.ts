import { Module } from '@nestjs/common';
import { EMAIL_ADAPTER_PORT } from '../../../domain/ports/outbound/email-adapter.port';
import { NodemailerAdapter } from './nodemailer.adapter';

@Module({
  providers: [
    {
      provide: EMAIL_ADAPTER_PORT,
      useClass: NodemailerAdapter,
    },
  ],
  exports: [EMAIL_ADAPTER_PORT],
})
export class EmailModule {}
