import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBalanceDto {
  @ApiPropertyOptional({ example: 500.0, description: 'Monto a actualizar/recargar' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;
}
