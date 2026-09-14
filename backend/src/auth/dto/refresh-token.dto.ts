import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token obtenido en login/register/refresh' })
  @IsString()
  refreshToken: string;
}
