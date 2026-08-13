import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../adapters/outbound/persistence/prisma.service';
import { KafkaProducerService } from '../../adapters/outbound/kafka/kafka-producer.service';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: KafkaProducerService,
  ) {}

  async createOutboxEvent(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: any,
  ): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        aggregateType,
        aggregateId,
        eventType,
        payload,
        status: 'PENDING',
      },
    });
  }

  async processPendingEvents(): Promise<number> {
    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
      },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    let processedCount = 0;

    for (const event of pendingEvents) {
      try {
        if (event.eventType === 'TRANSFER_COMPLETED') {
          const payload = event.payload as any;
          await this.kafkaProducer.sendTransferCompleted({
            fromUser: Number(payload.fromUser),
            toUser: Number(payload.toUser),
            amount: Number(payload.amount),
          });
        }

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'PUBLISHED',
            processedAt: new Date(),
          },
        });
        processedCount++;
      } catch (err: any) {
        this.logger.warn(`Error temporal procesando outbox event ${event.id}: ${err.message}. Se reintentará en el próximo ciclo.`);
      }
    }

    return processedCount;
  }
}
