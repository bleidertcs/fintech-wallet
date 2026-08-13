import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly outboxService: OutboxService) {}

  onModuleInit() {
    this.timer = setInterval(async () => {
      try {
        const count = await this.outboxService.processPendingEvents();
        if (count > 0) {
          this.logger.log(`Publicados ${count} eventos pendientes del Outbox a Kafka.`);
        }
      } catch (error: any) {
        this.logger.error(`Error en poller de Outbox: ${error.message}`);
      }
    }, 3000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
