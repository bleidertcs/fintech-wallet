import { Test, TestingModule } from '@nestjs/testing';
import { UserUseCases } from '../../src/application/use-cases/user.use-cases';
import { USER_REPOSITORY_PORT } from '../../src/domain/ports/outbound/user.repository.port';
import { UserProfileEntity } from '../../src/domain/entities/user-profile.entity';
import { NotFoundException } from '@nestjs/common';

describe('UserUseCases', () => {
  let useCases: UserUseCases;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      updateBalance: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserUseCases,
        {
          provide: USER_REPOSITORY_PORT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCases = module.get<UserUseCases>(UserUseCases);
  });

  it('debe obtener un perfil por ID exitosamente', async () => {
    const profile = new UserProfileEntity(1, 'Test User', 'test@example.com', 1000);
    mockRepository.findById.mockResolvedValue(profile);

    const result = await useCases.getProfileById(1);
    expect(result.id).toBe(1);
    expect(result.email).toBe('test@example.com');
  });

  it('debe lanzar NotFoundException si el perfil no existe por ID', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCases.getProfileById(99)).rejects.toThrow(NotFoundException);
  });

  it('debe crear un nuevo perfil de usuario correctamente', async () => {
    mockRepository.findByEmail.mockResolvedValue(null);
    const newProfile = new UserProfileEntity(1, 'Nuevo User', 'nuevo@example.com', 500);
    mockRepository.save.mockResolvedValue(newProfile);

    const result = await useCases.createProfile('Nuevo User', 'nuevo@example.com', 500);
    expect(result.email).toBe('nuevo@example.com');
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('debe actualizar el saldo de forma incremental', async () => {
    const profile = new UserProfileEntity(1, 'User', 'user@example.com', 1000);
    mockRepository.findById.mockResolvedValue(profile);
    mockRepository.updateBalance.mockResolvedValue(true);

    const result = await useCases.updateBalance(1, 500);
    expect(result.success).toBe(true);
    expect(mockRepository.updateBalance).toHaveBeenCalledWith(1, 500);
  });

  it('debe rechazar la actualización de saldo si no hay saldo suficiente', async () => {
    const profile = new UserProfileEntity(1, 'User', 'user@example.com', 100);
    mockRepository.findById.mockResolvedValue(profile);

    const result = await useCases.updateBalance(1, -500);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Saldo insuficiente');
  });
});
