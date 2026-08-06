export interface UserResponseDto {
  id: number;
  name: string;
  email: string;
  balance: number;
  dailyLimit: number;
}

export interface UpdateBalanceResponseDto {
  success: boolean;
  message: string;
}

export interface UserServiceClientPort {
  getUser(userId: number): Promise<UserResponseDto>;
  updateBalance(userId: number, amount: number): Promise<UpdateBalanceResponseDto>;
}

export const USER_SERVICE_CLIENT_PORT = Symbol('UserServiceClientPort');
