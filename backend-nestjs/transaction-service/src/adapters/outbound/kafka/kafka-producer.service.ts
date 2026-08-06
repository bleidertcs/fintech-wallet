import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

export interface TransferCompletedEventPayload {
  fromUser: number;
  toUser: number;
  amount: number;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const brokers = this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092').split(',');
    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'transaction-service');

    this.kafka = new Kafka({
      clientId,
      brokers,
    });

    this.producer = this.kafka.producer();
    try {
      await this.producer.connect();
      this.logger.log(`Conectado exitosamente a Kafka Broker (${brokers.join(',')})`);
    } catch (error) {
      this.logger.error(`Error al conectar con Kafka: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }

  async sendTransferCompleted(payload: TransferCompletedEventPayload): Promise<void> {
    const topic = 'transfer_completed';
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: String(payload.fromUser),
            value: JSON.stringify(payload),
          },
        ],
      });
      this.logger.log(`Evento transfer_completed publicado en Kafka: ${JSON.stringify(payload)}`);
    } catch (error) {
      this.logger.error(`Error al publicar evento transfer_completed en Kafka: ${error.message}`);
    }
  }
}
