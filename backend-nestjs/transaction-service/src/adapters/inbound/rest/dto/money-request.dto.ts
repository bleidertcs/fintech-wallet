import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class MoneyRequestDto {
  @ApiProperty({ description: 'ID de la solicitud (autogenerado)', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  id?: number;

  @ApiProperty({ description: 'ID del usuario que solicita el dinero', example: 1 })
  @IsNumber()
  requesterId: number;

  @ApiProperty({ description: 'ID del usuario objetivo a quien se pide el dinero', example: 2 })
  @IsNumber()
  targetId: number;

  @ApiProperty({ description: 'Monto solicitado', example: 500.00 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Mensaje opcional', example: 'Pago del almuerzo', required: false })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ description: 'Estado de la solicitud', example: 'PENDING', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: 'Fecha de creación', example: '2026-08-06T14:00:00.000Z', required: false })
  @IsOptional()
  createdAt?: Date;
}
