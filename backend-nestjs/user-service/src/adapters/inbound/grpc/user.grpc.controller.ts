import { Controller, Inject } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { IUserServicePort, USER_SERVICE_PORT } from '../../../domain/ports/inbound/user.service.port';

interface UserRequest {
  id: number;
}

interface UpdateBalanceRequest {
  id: number;
  amount: number;
}

@Controller()
export class UserGrpcController {
  constructor(
    @Inject(USER_SERVICE_PORT)
    private readonly userService: IUserServicePort,
  ) {}

  @GrpcMethod('UserService', 'GetUser')
  async getUser(data: UserRequest) {
    try {
      const profile = await this.userService.getProfileById(Number(data.id));
      return {
        id: Number(profile.id),
        name: profile.name,
        email: profile.email,
        balance: Number(profile.balance),
        daily_limit: Number(profile.dailyLimit),
      };
    } catch {
      return {
        id: 0,
        name: '',
        email: '',
        balance: 0,
        daily_limit: 0,
      };
    }
  }

  @GrpcMethod('UserService', 'UpdateBalance')
  async updateBalance(data: UpdateBalanceRequest) {
    const result = await this.userService.updateBalance(Number(data.id), Number(data.amount));
    return {
      success: result.success,
      message: result.message,
    };
  }
}
