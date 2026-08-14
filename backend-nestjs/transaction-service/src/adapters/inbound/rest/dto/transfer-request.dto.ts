import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class TransferRequestDto {
  @ApiProperty({ description: 'ID del usuario emisor', example: 1 })
  @IsNumber()
  fromUserId: number;

  @ApiProperty({ description: 'ID del usuario receptor', example: 2 })
  @IsNumber()
  toUserId: number;

  @ApiProperty({ description: 'Monto a transferir', example: 1500.50 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Clave única para garantizar la idempotencia de la transferencia' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
