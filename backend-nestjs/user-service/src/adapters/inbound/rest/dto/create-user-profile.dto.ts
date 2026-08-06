import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUserProfileDto {
  @ApiProperty({ example: 'Juan Perez' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'juan.perez@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 1000, required: false })
  @IsNumber()
  @IsOptional()
  initialBalance?: number;

  @ApiProperty({ example: 10000, required: false })
  @IsNumber()
  @IsOptional()
  balance?: number;
}
