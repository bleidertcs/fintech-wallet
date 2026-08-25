import { NotificationUseCases } from './notification.use-cases';
import { NotificationRepositoryPort } from '../../domain/ports/outbound/notification-repository.port';
import { EmailAdapterPort } from '../../domain/ports/outbound/email-adapter.port';
import { UserServiceClientPort } from '../../domain/ports/outbound/user-service-client.port';
import { NotificationEntity } from '../../domain/entities/notification.entity';

describe('NotificationUseCases', () => {
  let useCases: NotificationUseCases;
  let mockRepository: jest.Mocked<NotificationRepositoryPort>;
  let mockEmailAdapter: jest.Mocked<EmailAdapterPort>;
  let mockUserServiceClient: jest.Mocked<UserServiceClientPort>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      markAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    mockEmailAdapter = {
      sendEmail: jest.fn(),
    };

    mockUserServiceClient = {
      getUserProfile: jest.fn(),
    };

    useCases = new NotificationUseCases(
      mockRepository,
      mockEmailAdapter,
      mockUserServiceClient,
    );
  });

  describe('processTransferNotification', () => {
    it('debe procesar la transferencia, guardar 2 notificaciones y enviar email a remitente y destinatario', async () => {
      const event = { fromUser: 1, toUser: 2, amount: 150.0 };

      mockUserServiceClient.getUserProfile
        .mockResolvedValueOnce({ id: 1, name: 'Alice', email: 'alice@example.com' })
        .mockResolvedValueOnce({ id: 2, name: 'Bob', email: 'bob@example.com' });

      mockRepository.save.mockImplementation(async (data) => {
        return new NotificationEntity({ id: 100, ...data } as any);
      });

      mockEmailAdapter.sendEmail.mockResolvedValue(true);

      await useCases.processTransferNotification(event);

      expect(mockUserServiceClient.getUserProfile).toHaveBeenCalledWith(1);
      expect(mockUserServiceClient.getUserProfile).toHaveBeenCalledWith(2);
      expect(mockRepository.save).toHaveBeenCalledTimes(2);
      expect(mockEmailAdapter.sendEmail).toHaveBeenCalledTimes(2);
      expect(mockEmailAdapter.sendEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'Enviaste una transferencia',
        expect.stringContaining('150.00'),
      );
      expect(mockEmailAdapter.sendEmail).toHaveBeenCalledWith(
        'bob@example.com',
        'Recibiste una transferencia',
        expect.stringContaining('150.00'),
      );
    });

    it('debe manejar errores al consultar perfiles gRPC sin fallar la ejecución', async () => {
      const event = { fromUser: 5, toUser: 6, amount: 50.0 };

      mockUserServiceClient.getUserProfile.mockRejectedValue(new Error('gRPC timeout'));
      mockRepository.save.mockImplementation(async (data) => new NotificationEntity({ id: 101, ...data } as any));

      await useCases.processTransferNotification(event);

      expect(mockRepository.save).toHaveBeenCalledTimes(2);
      expect(mockEmailAdapter.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('debe retornar la lista de notificaciones del usuario', async () => {
      const mockList = [
        new NotificationEntity({ id: 1, userId: 1, type: 'TRANSFER_SENT', message: 'Enviaste $50', amount: 50, read: false, createdAt: new Date() }),
      ];
      mockRepository.findByUserId.mockResolvedValue(mockList);

      const result = await useCases.getUserNotifications(1);
      expect(result).toEqual(mockList);
      expect(mockRepository.findByUserId).toHaveBeenCalledWith(1);
    });
  });

  describe('markAsRead', () => {
    it('debe marcar como leída una notificación existente', async () => {
      const mockNotification = new NotificationEntity({ id: 10, userId: 1, type: 'TRANSFER_SENT', message: 'Msg', amount: 10, read: true, createdAt: new Date() });
      mockRepository.markAsRead.mockResolvedValue(mockNotification);

      const result = await useCases.markAsRead(10);
      expect(result.read).toBe(true);
      expect(mockRepository.markAsRead).toHaveBeenCalledWith(10);
    });
  });

  describe('getUnreadCount', () => {
    it('debe retornar el objeto con el conteo unreadCount', async () => {
      mockRepository.getUnreadCount.mockResolvedValue(5);

      const result = await useCases.getUnreadCount(1);
      expect(result).toEqual({ unreadCount: 5 });
      expect(mockRepository.getUnreadCount).toHaveBeenCalledWith(1);
    });
  });
});
