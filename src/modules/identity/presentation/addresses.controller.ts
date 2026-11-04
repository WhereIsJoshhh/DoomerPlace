import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AddressesService } from '../application/services/addresses.service';
import { CreateAddressDto } from '../application/dtos/create-address.dto';
import { UpdateAddressDto } from '../application/dtos/update-address.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Direcciones')
@ApiBearerAuth()
@UseGuards(RbacGuard)
@Controller('users/me/addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las direcciones del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Listado de direcciones ordenadas con principal primero.' })
  async getMyAddresses(@CurrentUser('userId') userId: string) {
    return this.addressesService.findByUser(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nueva dirección (Envío o Facturación)' })
  @ApiResponse({ status: 201, description: 'Dirección creada satisfactoriamente.' })
  async create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una dirección existente' })
  @ApiResponse({ status: 200, description: 'Dirección modificada correctamente.' })
  async update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una dirección del usuario' })
  @ApiResponse({ status: 200, description: 'Dirección eliminada con reasignación de principal si aplicaba.' })
  async remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.addressesService.remove(id, userId);
  }
}
