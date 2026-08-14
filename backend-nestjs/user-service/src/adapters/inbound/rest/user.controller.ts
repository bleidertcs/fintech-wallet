import { Controller, Get, Post, Put, Body, Param, ParseIntPipe, Inject, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IUserServicePort, USER_SERVICE_PORT } from '../../../domain/ports/inbound/user.service.port';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    @Inject(USER_SERVICE_PORT)
    private readonly userService: IUserServicePort,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Healthcheck para Ingress' })
  getHealth() {
    return { status: 'OK', service: 'user-service', timestamp: new Date().toISOString() };
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los perfiles de usuario' })
  @ApiResponse({ status: 200, description: 'Lista de perfiles devuelta' })
  async getAllProfiles() {
    const profiles = await this.userService.getAllProfiles();
    return profiles.map(p => p.toJSON());
  }

  @Post()
  @Post('profile')
  @ApiOperation({ summary: 'Crear o registrar perfil de usuario' })
  @ApiResponse({ status: 201, description: 'Perfil creado o existente devuelto' })
  async createProfile(@Body() dto: CreateUserProfileDto) {
    const balance = dto.initialBalance ?? dto.balance ?? 0;
    const profile = await this.userService.createProfile(dto.name, dto.email, balance);
    return profile.toJSON();
  }

  @Get(':id')
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

  @Put(':id/balance')
  @Put('profile/:id/balance')
  @ApiOperation({ summary: 'Actualizar saldo del perfil de usuario' })
  async updateBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBalanceDto,
    @Query('amount') queryAmount?: string,
  ) {
    const rawAmount = dto?.amount ?? (queryAmount !== undefined ? parseFloat(queryAmount) : undefined);
    if (rawAmount === undefined || isNaN(Number(rawAmount))) {
      throw new BadRequestException('El monto (amount) es requerido en el body o query param');
    }
    return this.userService.updateBalance(id, Number(rawAmount));
  }

  @Put(':id/settings')
  @Put('profile/:id/settings')
  @ApiOperation({ summary: 'Actualizar limite diario y moneda del perfil' })
  async updateSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSettingsDto,
    @Query('dailyLimit') queryDailyLimit?: string,
    @Query('currency') queryCurrency?: string,
  ) {
    const dailyLimit = dto?.dailyLimit ?? (queryDailyLimit !== undefined ? parseFloat(queryDailyLimit) : undefined);
    const currency = dto?.currency ?? queryCurrency;
    const profile = await this.userService.updateSettings(id, dailyLimit, currency);
    return profile.toJSON();
  }
}

