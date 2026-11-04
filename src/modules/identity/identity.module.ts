import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './application/services/auth.service';
import { UsersService } from './application/services/users.service';
import { AddressesService } from './application/services/addresses.service';
import { RbacService } from './application/services/rbac.service';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';
import { AddressesController } from './presentation/addresses.controller';
import { RbacController } from './presentation/rbac.controller';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    UsersController,
    AddressesController,
    RbacController,
  ],
  providers: [
    AuthService,
    UsersService,
    AddressesService,
    RbacService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    UsersService,
    AddressesService,
    RbacService,
  ],
})
export class IdentityModule {}
