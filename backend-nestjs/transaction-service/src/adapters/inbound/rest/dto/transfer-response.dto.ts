import { ApiProperty } from '@nestjs/swagger';

export class TransferResponseDto {
  @ApiProperty({ description: 'ID de la transacción', example: 101 })
  id: number;

  @ApiProperty({ description: 'ID del usuario emisor', example: 1 })
  fromUserId: number;

  @ApiProperty({ description: 'ID del usuario receptor', example: 2 })
  toUserId: number;

  @ApiProperty({ description: 'Monto transferido', example: 1500.50 })
  amount: number;

  @ApiProperty({ description: 'Estado de la transacción', example: 'SUCCESS' })
  status: string;

  @ApiProperty({ description: 'Fecha y hora de la transacción', example: '2026-08-06T14:00:00.000Z' })
  createdAt: Date;
}
