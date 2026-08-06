import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

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
}
