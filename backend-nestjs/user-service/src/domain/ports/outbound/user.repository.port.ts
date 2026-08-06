import { UserProfileEntity } from '../../entities/user-profile.entity';

export interface IUserRepositoryPort {
  findById(id: number): Promise<UserProfileEntity | null>;
  findByEmail(email: string): Promise<UserProfileEntity | null>;
  save(profile: Partial<UserProfileEntity>): Promise<UserProfileEntity>;
  updateBalance(id: number, amount: number): Promise<boolean>;
}

export const USER_REPOSITORY_PORT = Symbol('IUserRepositoryPort');
