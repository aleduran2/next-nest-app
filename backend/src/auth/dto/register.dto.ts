import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ale@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'contraseñaSegura123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
