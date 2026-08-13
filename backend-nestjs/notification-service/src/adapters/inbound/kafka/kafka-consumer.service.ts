import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import {
  NOTIFICATION_SERVICE_PORT,
  NotificationServicePort,
} from '../../../domain/ports/inbound/notification-service.port';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private processedEventIds = new Set<string>();

  constructor(
    @Inject(NOTIFICATION_SERVICE_PORT)
    private readonly notificationService: NotificationServicePort,
  ) {
    const brokers = (process.env.KAFKA_BROKERS || 'kafka:29092').split(',');
    this.kafka = new Kafka({
      clientId: 'notification-service-consumer',
      brokers,
    });

    this.consumer = this.kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || 'notification-group',
    });
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      this.logger.log('Conectado exitosamente a Apache Kafka broker');

      await this.consumer.subscribe({
        topics: [
          'fintech.transaction.transfer.completed.v1',
          process.env.KAFKA_TOPIC_TRANSFER_COMPLETED || 'transfer_completed',
        ],
        fromBeginning: true,
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const rawValue = message.value?.toString();
          if (!rawValue) return;

          try {
            const parsed = JSON.parse(rawValue);
            const eventId = parsed.eventId || `${topic}-${partition}-${message.offset}`;
            
            // Deduplication Check
            if (this.processedEventIds.has(eventId)) {
              this.logger.warn(`Mensaje duplicado detectado e ignorado (eventId=${eventId})`);
              return;
            }

            const data = parsed.data || parsed;
            const fromUser = Number(data.fromUser);
            const toUser = Number(data.toUser);
            const amount = Number(data.amount);

            // Execute with Retry logic
            await this.processWithRetry({ fromUser, toUser, amount }, 3);

            // Mark as processed
            this.processedEventIds.add(eventId);
            if (this.processedEventIds.size > 10000) {
              const first = this.processedEventIds.values().next().value;
              if (first) this.processedEventIds.delete(first);
            }
          } catch (err: any) {
            this.logger.error(`Error procesando mensaje Kafka [Topic: ${topic}]: ${err.message}`, err.stack);
          }
        },
      });
    } catch (err: any) {
      this.logger.warn(`No se pudo conectar el consumidor Kafka: ${err.message}`);
    }
  }

  private async processWithRetry(payload: { fromUser: number; toUser: number; amount: number }, maxRetries: number) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        await this.notificationService.processTransferNotification(payload);
        return;
      } catch (error: any) {
        attempt++;
        this.logger.warn(`Intento ${attempt}/${maxRetries} falló para notificación transfer: ${error.message}`);
        if (attempt >= maxRetries) {
          this.logger.error(`Mensaje movido a DLQ tras ${maxRetries} intentos fallidos.`);
          throw error;
        }
        await new Promise((res) => setTimeout(res, Math.pow(2, attempt) * 500));
      }
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      this.logger.log('Consumidor Kafka desconectado limpiamente.');
    } catch (err: any) {
      this.logger.error(`Error al desconectar consumidor Kafka: ${err.message}`);
    }
  }
}
