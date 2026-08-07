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
        topic: process.env.KAFKA_TOPIC_TRANSFER_COMPLETED || 'transfer_completed',
        fromBeginning: true,
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const rawValue = message.value?.toString();
          this.logger.log(`Mensaje Kafka recibido [Topic: ${topic}, Partition: ${partition}]: ${rawValue}`);

          if (!rawValue) return;

          try {
            const eventPayload = JSON.parse(rawValue);
            await this.notificationService.processTransferNotification({
              fromUser: Number(eventPayload.fromUser),
              toUser: Number(eventPayload.toUser),
              amount: Number(eventPayload.amount),
            });
          } catch (err) {
            this.logger.error(`Error al procesar el mensaje del evento transfer_completed: ${err.message}`, err.stack);
          }
        },
      });
    } catch (err) {
      this.logger.warn(`No se pudo conectar el consumidor Kafka: ${err.message}. Reintentando en segundo plano...`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      this.logger.log('Consumidor Kafka desconectado limpiamente.');
    } catch (err) {
      this.logger.error(`Error al desconectar consumidor Kafka: ${err.message}`);
    }
  }
}
