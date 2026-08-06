import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateBalanceDto {
  @ApiProperty({ example: 500.0 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
