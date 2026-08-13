import { UserProfileEntity } from '../../entities/user-profile.entity';

export interface IUserRepositoryPort {
  findById(id: number): Promise<UserProfileEntity | null>;
  findByEmail(email: string): Promise<UserProfileEntity | null>;
  findAll(): Promise<UserProfileEntity[]>;
  save(profile: Partial<UserProfileEntity>): Promise<UserProfileEntity>;
  updateBalance(id: number, amount: number): Promise<boolean>;
  updateSettings(id: number, dailyLimit?: number, currency?: string): Promise<UserProfileEntity | null>;
}

export const USER_REPOSITORY_PORT = Symbol('IUserRepositoryPort');
