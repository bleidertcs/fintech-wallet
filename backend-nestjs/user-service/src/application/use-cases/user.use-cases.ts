import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { IUserServicePort } from '../../domain/ports/inbound/user.service.port';
import { IUserRepositoryPort, USER_REPOSITORY_PORT } from '../../domain/ports/outbound/user.repository.port';
import { UserProfileEntity } from '../../domain/entities/user-profile.entity';

@Injectable()
export class UserUseCases implements IUserServicePort {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: IUserRepositoryPort,
  ) {}

  async getProfileById(id: number): Promise<UserProfileEntity> {
    const profile = await this.userRepository.findById(id);
    if (!profile) {
      throw new NotFoundException(`Perfil con ID ${id} no encontrado`);
    }
    return profile;
  }

  async getProfileByEmail(email: string): Promise<UserProfileEntity> {
    const profile = await this.userRepository.findByEmail(email);
    if (!profile) {
      throw new NotFoundException(`Perfil con email ${email} no encontrado`);
    }
    return profile;
  }

  async createProfile(name: string, email: string, initialBalance: number = 0): Promise<UserProfileEntity> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      return existing; // idempotente para registro
    }
    return this.userRepository.save({
      name,
      email,
      balance: initialBalance,
      dailyLimit: 50000,
      currency: 'ARS',
    });
  }

  async updateBalance(id: number, amount: number): Promise<{ success: boolean; message: string }> {
    const profile = await this.userRepository.findById(id);
    if (!profile) {
      return { success: false, message: `Perfil ${id} no encontrado` };
    }

    if (amount < 0 && !profile.hasSufficientBalance(Math.abs(amount))) {
      return { success: false, message: 'Saldo insuficiente' };
    }

    const updated = await this.userRepository.updateBalance(id, amount);
    if (updated) {
      return { success: true, message: 'Saldo actualizado exitosamente' };
    }
    return { success: false, message: 'Error al actualizar saldo en la base de datos' };
  }
}
