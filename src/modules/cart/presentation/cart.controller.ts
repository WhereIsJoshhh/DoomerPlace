import {
  Controller, Get, Post, Put, Delete, Param, Body, Headers, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { CartService } from '../application/services/cart.service';
import { AddCartItemDto } from '../application/dtos/add-cart-item.dto';
import { UpdateCartItemDto } from '../application/dtos/update-cart-item.dto';
import { MergeCartDto } from '../application/dtos/merge-cart.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Public } from '@core/decorators/public.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

@ApiTags('Carrito de Compras')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ── OBTENER CARRITO ──────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Obtener carrito del usuario autenticado con precios actualizados, agrupado por tienda' })
  @ApiResponse({ status: 200, description: 'Carrito con ítems enriquecidos, subtotal y disponibilidad de stock.' })
  async getMyCart(@CurrentUser('userId') userId: string) {
    return this.cartService.getCart(userId, undefined);
  }

  @Public()
  @Get('guest')
  @ApiHeader({ name: 'X-Session-Token', description: 'Token UUID de sesión para carrito anónimo', required: true })
  @ApiOperation({ summary: 'Obtener carrito de invitado por token de sesión' })
  @ApiResponse({ status: 200, description: 'Carrito del invitado agrupado por tienda.' })
  async getGuestCart(@Headers('x-session-token') token: string) {
    return this.cartService.getCart(undefined, token);
  }

  @Public()
  @Get('session-token')
  @ApiOperation({ summary: 'Generar un nuevo token de sesión para carrito anónimo (invocado al primer acceso)' })
  @ApiResponse({ status: 200, description: 'Token UUID generado para persistir en localStorage.' })
  async generateToken() {
    return { tokenSesion: this.cartService.generateSessionToken() };
  }

  // ── AGREGAR ÍTEM ─────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar producto al carrito del usuario autenticado' })
  @ApiResponse({ status: 201, description: 'Ítem agregado o cantidad actualizada.' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente.' })
  async addItemAuthenticated(
    @CurrentUser('userId') userId: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(dto, userId, undefined);
  }

  @Public()
  @Post('guest/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({ name: 'X-Session-Token', description: 'Token de sesión del invitado', required: true })
  @ApiOperation({ summary: 'Agregar producto al carrito de invitado por token de sesión' })
  @ApiResponse({ status: 201, description: 'Ítem agregado al carrito de invitado.' })
  async addItemGuest(
    @Headers('x-session-token') token: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(dto, undefined, token);
  }

  // ── ACTUALIZAR CANTIDAD ──────────────────────────────────────────────────

  @ApiBearerAuth()
  @Put('items')
  @ApiOperation({ summary: 'Actualizar cantidad de un ítem (cantidad = 0 elimina el ítem)' })
  @ApiResponse({ status: 200, description: 'Ítem actualizado o eliminado si cantidad es 0.' })
  async updateItem(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(dto, userId, undefined);
  }

  // ── ELIMINAR ÍTEM ────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un ítem específico del carrito' })
  @ApiResponse({ status: 200, description: 'Ítem eliminado correctamente.' })
  async removeItem(
    @Param('itemId') itemId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.cartService.removeItem(itemId, userId, undefined);
  }

  // ── VACIAR CARRITO ───────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vaciar completamente el carrito del usuario' })
  @ApiResponse({ status: 200, description: 'Todos los ítems del carrito eliminados.' })
  async clearCart(@CurrentUser('userId') userId: string) {
    return this.cartService.clearCart(userId, undefined);
  }

  // ── FUSIÓN INVITADO → USUARIO ─────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fusionar carrito de invitado con el carrito del usuario al hacer login' })
  @ApiResponse({ status: 200, description: 'Ítems del carrito de invitado transferidos al usuario. Carrito anónimo marcado como CONVERTIDO.' })
  async mergeGuestCart(
    @CurrentUser('userId') userId: string,
    @Body() dto: MergeCartDto,
  ) {
    if (!dto.tokenSesion) {
      return { message: 'No se proporcionó token de sesión.', itemsFusionados: 0 };
    }
    return this.cartService.mergeGuestCart(userId, dto.tokenSesion);
  }
}
