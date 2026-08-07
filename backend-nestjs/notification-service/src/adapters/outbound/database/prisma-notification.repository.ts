import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { NotificationRepositoryPort } from '../../../domain/ports/outbound/notification-repository.port';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationModel } from '@prisma/client';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(notification: Partial<NotificationEntity>): Promise<NotificationEntity> {
    const created = await this.prisma.notificationModel.create({
      data: {
        userId: BigInt(notification.userId!),
        type: notification.type!,
        message: notification.message!,
        amount: notification.amount!,
        fromUserId: notification.fromUserId ? BigInt(notification.fromUserId) : null,
        read: notification.read ?? false,
        createdAt: notification.createdAt ?? new Date(),
      },
    });
    return this.mapToEntity(created);
  }

  async findByUserId(userId: number): Promise<NotificationEntity[]> {
    const records = await this.prisma.notificationModel.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.mapToEntity(r));
  }

  async findById(id: number): Promise<NotificationEntity | null> {
    const record = await this.prisma.notificationModel.findUnique({
      where: { id: BigInt(id) },
    });
    return record ? this.mapToEntity(record) : null;
  }

  async markAsRead(id: number): Promise<NotificationEntity> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }

    const updated = await this.prisma.notificationModel.update({
      where: { id: BigInt(id) },
      data: { read: true },
    });
    return this.mapToEntity(updated);
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notificationModel.count({
      where: {
        userId: BigInt(userId),
        read: false,
      },
    });
  }

  private mapToEntity(model: NotificationModel): NotificationEntity {
    return new NotificationEntity({
      id: Number(model.id),
      userId: Number(model.userId),
      type: model.type,
      message: model.message,
      amount: Number(model.amount),
      fromUserId: model.fromUserId ? Number(model.fromUserId) : null,
      read: model.read,
      createdAt: model.createdAt,
    });
  }
}
