import { ApiProperty } from '@nestjs/swagger';

export class TotpSetupResponseDto {
  @ApiProperty()
  secret: string;

  @ApiProperty()
  otpAuthUri: string;

  @ApiProperty({ required: false })
  qrCodeUrl?: string;
}
