import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { Kafka, Consumer, Producer } from 'kafkajs';
import { WORKER_SERVICE_PORT, WorkerServicePort } from '../../../domain/ports/worker-service.port';
import { TransferCompletedEventDto } from '../../../domain/entities/transfer-event.dto';

@Injectable()
export class KafkaWorkerConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaWorkerConsumer.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;

  constructor(
    @Inject(WORKER_SERVICE_PORT)
    private readonly workerService: WorkerServicePort,
  ) {
    const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
    this.kafka = new Kafka({
      clientId: 'worker-service',
      brokers,
    });
    this.consumer = this.kafka.consumer({ groupId: 'worker-group' });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      await this.producer.connect();
      
      const topic = process.env.KAFKA_TOPIC_TRANSFER_COMPLETED || 'transfer_completed';
      await this.consumer.subscribe({ topic, fromBeginning: false });

      this.logger.log(`Consumidor Kafka de Worker Service suscrito al tópico ${topic}`);

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const rawMessage = message.value?.toString() || '';
          this.logger.log(`[Worker Consumer] Mensaje recibido en tópico ${topic}: ${rawMessage}`);

          try {
            const eventData: TransferCompletedEventDto = JSON.parse(rawMessage);
            const fromUser = eventData.sourceUserId || eventData.fromUser || null;
            const toUser = eventData.targetUserId || eventData.toUser || null;
            const amount = eventData.amount || 0;

            await this.workerService.recordTransactionAudit(
              fromUser,
              toUser,
              amount,
              'TRANSFER_COMPLETED',
              `Procesado asíncronamente por Worker Service desde tópico ${topic}`,
            );
          } catch (error) {
            this.logger.error(`Error procesando mensaje Kafka en tópico ${topic}: ${error.message}`, error.stack);
            await this.sendToDeadLetterQueue(topic, rawMessage, error.message);
          }
        },
      });
    } catch (error) {
      this.logger.warn(`Consumidor Kafka Worker diferido: ${error.message}`);
    }
  }

  private async sendToDeadLetterQueue(originalTopic: string, rawMessage: string, errorMessage: string) {
    const dlqTopic = 'transfer-events-dlq';
    try {
      this.logger.warn(`Enviando mensaje fallido a Dead Letter Queue '${dlqTopic}': ${rawMessage}`);

      await this.producer.send({
        topic: dlqTopic,
        messages: [
          {
            key: 'error',
            value: JSON.stringify({
              originalTopic,
              rawMessage,
              error: errorMessage,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });

      await this.workerService.recordTransactionAudit(
        null,
        null,
        0,
        'DLQ_TRANSFER_FAILED',
        `Mensaje no procesable enviado a DLQ ${dlqTopic}: ${errorMessage}`,
      );
    } catch (dlqError) {
      this.logger.error(`Error crítico enviando mensaje a DLQ ${dlqTopic}: ${dlqError.message}`, dlqError.stack);
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer.disconnect();
      await this.producer.disconnect();
    } catch (err) {
      this.logger.error(`Error al desconectar consumidor Kafka: ${err.message}`);
    }
  }
}
