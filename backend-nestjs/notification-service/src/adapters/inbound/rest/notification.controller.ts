import { Controller, Get, Patch, Param, ParseIntPipe, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  NOTIFICATION_SERVICE_PORT,
  NotificationServicePort,
} from '../../../domain/ports/inbound/notification-service.port';
import { NotificationEntity } from '../../../domain/entities/notification.entity';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationController {
  constructor(
    @Inject(NOTIFICATION_SERVICE_PORT)
    private readonly notificationService: NotificationServicePort,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Healthcheck para Ingress' })
  getHealth() {
    return { status: 'OK', service: 'notification-service', timestamp: new Date().toISOString() };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener notificaciones de un usuario por su ID' })
  @ApiParam({ name: 'userId', type: Number, description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones ordenadas descendente por fecha' })
  async getUserNotifications(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<NotificationEntity[]> {
    return this.notificationService.getUserNotifications(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  @ApiParam({ name: 'id', type: Number, description: 'ID de la notificación' })
  @ApiResponse({ status: 200, description: 'Notificación marcada como leída exitosamente' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NotificationEntity> {
    return this.notificationService.markAsRead(id);
  }

  @Get('unread-count/:userId')
  @ApiOperation({ summary: 'Obtener conteo de notificaciones no leídas de un usuario' })
  @ApiParam({ name: 'userId', type: Number, description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Objeto con el conteo unreadCount' })
  async getUnreadCount(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ unreadCount: number }> {
    return this.notificationService.getUnreadCount(userId);
  }
}
