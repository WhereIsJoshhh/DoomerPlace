import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../application/services/auth.service';
import { RegisterDto } from '../application/dtos/register.dto';
import { LoginDto } from '../application/dtos/login.dto';
import { RefreshTokenDto } from '../application/dtos/refresh-token.dto';
import { Public } from '@core/decorators/public.decorator';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de nuevo usuario comprador' })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente con tokens de sesión.' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya existe.' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicio de sesión de usuarios' })
  @ApiResponse({ status: 200, description: 'Autenticación exitosa, entrega Access Token y Refresh Token.' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas o cuenta no activa.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovación de token de acceso JWT' })
  @ApiResponse({ status: 200, description: 'Nuevo par de tokens entregados.' })
  @ApiResponse({ status: 401, description: 'Refresh token expirado o inválido.' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
