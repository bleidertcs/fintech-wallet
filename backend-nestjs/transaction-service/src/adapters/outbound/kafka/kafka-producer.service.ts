import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { randomUUID } from 'crypto';

export interface EventEnvelope<T = any> {
  eventId: string;
  eventType: string;
  version: number;
  occurredAt: string;
  producer: string;
  correlationId?: string;
  data: T;
}

export interface TransferCompletedEventPayload {
  transactionId?: string;
  fromUser: number;
  toUser: number;
  amount: number;
  currency?: string;
}

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const brokers = this.configService.get<string>('KAFKA_BROKERS', 'kafka:29092').split(',');
    const clientId = this.configService.get<string>('KAFKA_CLIENT_ID', 'transaction-service');

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        initialRetryTime: 500,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
    });

    await this.connectWithRetry(brokers);
  }

  private async connectWithRetry(brokers: string[]) {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log(`Conectado exitosamente a Kafka Broker (${brokers.join(',')})`);
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(`No se pudo conectar a Kafka en el arranque: ${error.message}. Se reconectará bajo demanda.`);
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        this.logger.log('Reconexión exitosa a Kafka Producer.');
      } catch (error: any) {
        this.isConnected = false;
        this.logger.error(`Error al reconectar con Kafka: ${error.message}`);
        throw error;
      }
    }
  }

  async onModuleDestroy() {
    try {
      if (this.isConnected) {
        await this.producer?.disconnect();
        this.isConnected = false;
      }
    } catch (err: any) {
      this.logger.error(`Error al desconectar productor Kafka: ${err.message}`);
    }
  }

  async sendTransferCompleted(payload: TransferCompletedEventPayload, correlationId?: string): Promise<void> {
    await this.ensureConnected();

    const topic = process.env.KAFKA_TOPIC_TRANSFER_COMPLETED || 'transfer_completed';

    const envelope: EventEnvelope<TransferCompletedEventPayload> = {
      eventId: randomUUID(),
      eventType: 'TransferCompletedV1',
      version: 1,
      occurredAt: new Date().toISOString(),
      producer: 'transaction-service',
      correlationId: correlationId || randomUUID(),
      data: {
        ...payload,
        currency: payload.currency || 'VES',
      },
    };

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: String(payload.fromUser),
            value: JSON.stringify(envelope),
          },
        ],
      });

      this.logger.log(`Evento ${envelope.eventType} (${envelope.eventId}) publicado en Kafka [${topic}]`);
    } catch (error: any) {
      this.isConnected = false;
      this.logger.error(`Error al publicar evento ${envelope.eventType} en Kafka: ${error.message}`);
      throw error;
    }
  }

  async sendToDLQ(failedTopic: string, payload: any, errorReason: string): Promise<void> {
    try {
      await this.ensureConnected();
      const topic = 'fintech.dlq';
      const envelope: EventEnvelope = {
        eventId: randomUUID(),
        eventType: 'PoisonMessageV1',
        version: 1,
        occurredAt: new Date().toISOString(),
        producer: 'transaction-service',
        data: {
          failedTopic,
          errorReason,
          originalPayload: payload,
        },
      };

      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(envelope) }],
      });
      this.logger.warn(`Mensaje envenenado enviado a DLQ: ${failedTopic}`);
    } catch (err: any) {
      this.logger.error(`Error al enviar a DLQ: ${err.message}`);
    }
  }
}
