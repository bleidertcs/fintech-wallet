import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IUserServicePort, USER_SERVICE_PORT } from '../../../domain/ports/inbound/user.service.port';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    @Inject(USER_SERVICE_PORT)
    private readonly userService: IUserServicePort,
  ) {}

  @Post()
  @Post('profile')
  @ApiOperation({ summary: 'Crear o registrar perfil de usuario' })
  @ApiResponse({ status: 201, description: 'Perfil creado o existente devuelto' })
  async createProfile(@Body() dto: CreateUserProfileDto) {
    const balance = dto.initialBalance ?? dto.balance ?? 0;
    const profile = await this.userService.createProfile(dto.name, dto.email, balance);
    return profile.toJSON();
  }

  @Get('profile/:id')
  @ApiOperation({ summary: 'Obtener perfil de usuario por ID' })
  async getProfileById(@Param('id', ParseIntPipe) id: number) {
    const profile = await this.userService.getProfileById(id);
    return profile.toJSON();
  }

  @Get('profile/by-email/:email')
  @ApiOperation({ summary: 'Obtener perfil por Email' })
  async getProfileByEmail(@Param('email') email: string) {
    const profile = await this.userService.getProfileByEmail(email);
    return profile.toJSON();
  }

  @Put('profile/:id/balance')
  @ApiOperation({ summary: 'Actualizar saldo del perfil de usuario' })
  async updateBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBalanceDto,
  ) {
    return this.userService.updateBalance(id, dto.amount);
  }
}
