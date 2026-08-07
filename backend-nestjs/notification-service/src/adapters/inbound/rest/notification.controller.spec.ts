import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NOTIFICATION_SERVICE_PORT, NotificationServicePort } from '../../../domain/ports/inbound/notification-service.port';
import { NotificationEntity } from '../../../domain/entities/notification.entity';

describe('NotificationController', () => {
  let controller: NotificationController;
  let mockNotificationService: jest.Mocked<NotificationServicePort>;

  beforeEach(async () => {
    mockNotificationService = {
      processTransferNotification: jest.fn(),
      getUserNotifications: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NOTIFICATION_SERVICE_PORT,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserNotifications', () => {
    it('debe llamar al servicio y retornar notificaciones', async () => {
      const mockResult = [new NotificationEntity({ id: 1, userId: 2, type: 'TRANSFER_SENT', message: 'Test', amount: 10, read: false, createdAt: new Date() })];
      mockNotificationService.getUserNotifications.mockResolvedValue(mockResult);

      const res = await controller.getUserNotifications(2);
      expect(res).toEqual(mockResult);
      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith(2);
    });
  });

  describe('markAsRead', () => {
    it('debe llamar al servicio y retornar la notificación actualizada', async () => {
      const mockResult = new NotificationEntity({ id: 5, userId: 2, type: 'TRANSFER_SENT', message: 'Test', amount: 10, read: true, createdAt: new Date() });
      mockNotificationService.markAsRead.mockResolvedValue(mockResult);

      const res = await controller.markAsRead(5);
      expect(res).toEqual(mockResult);
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(5);
    });
  });

  describe('getUnreadCount', () => {
    it('debe retornar { unreadCount }', async () => {
      mockNotificationService.getUnreadCount.mockResolvedValue({ unreadCount: 3 });

      const res = await controller.getUnreadCount(2);
      expect(res).toEqual({ unreadCount: 3 });
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith(2);
    });
  });
});
