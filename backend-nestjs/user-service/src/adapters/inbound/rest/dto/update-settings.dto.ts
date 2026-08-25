import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 50000 })
  @IsNumber()
  @IsOptional()
  dailyLimit?: number;

  @ApiPropertyOptional({ example: 'VES' })
  @IsString()
  @IsOptional()
  currency?: string;
}
