import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh Token JWT para renovar el token de acceso' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
