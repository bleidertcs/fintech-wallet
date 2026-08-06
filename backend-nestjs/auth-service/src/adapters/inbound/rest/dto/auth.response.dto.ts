import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ nullable: true })
  token?: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  verified: boolean;

  @ApiProperty()
  totpEnabled: boolean;

  @ApiProperty()
  totpRequired: boolean;
}
