import { UserProfileEntity } from '../../entities/user-profile.entity';

export interface IUserServicePort {
  getProfileById(id: number): Promise<UserProfileEntity>;
  getProfileByEmail(email: string): Promise<UserProfileEntity>;
  getAllProfiles(): Promise<UserProfileEntity[]>;
  createProfile(name: string, email: string, initialBalance?: number): Promise<UserProfileEntity>;
  updateBalance(id: number, amount: number): Promise<{ success: boolean; message: string }>;
  updateSettings(id: number, dailyLimit?: number, currency?: string): Promise<UserProfileEntity>;
}

export const USER_SERVICE_PORT = Symbol('IUserServicePort');
