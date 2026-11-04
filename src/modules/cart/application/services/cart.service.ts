import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CacheService } from '@core/cache/cache.service';
import { AddCartItemDto } from '../dtos/add-cart-item.dto';
import { UpdateCartItemDto } from '../dtos/update-cart-item.dto';
import { EstadoCarrito, TipoProducto } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// TTL del carrito: 7 días en segundos
const CART_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  // ────────────────────────────────────────────────────────────────────────────
  //  SECCIÓN PRIVADA: Resolución de Carrito (Anónimo o Autenticado)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene o crea el carrito activo del usuario autenticado.
   */
  private async getOrCreateUserCart(usuarioId: string) {
    let carrito = await this.prisma.carrito.findFirst({
      where: { usuarioId, estado: EstadoCarrito.ACTIVO },
      include: { items: true },
    });

    if (!carrito) {
      carrito = await this.prisma.carrito.create({
        data: {
          usuarioId,
          estado: EstadoCarrito.ACTIVO,
          expiraEn: new Date(Date.now() + CART_TTL_SECONDS * 1000),
        },
        include: { items: true },
      });
    }

    return carrito;
  }

  /**
   * Obtiene o crea el carrito anónimo por token de sesión.
   * El token es generado en el frontend y persistido en localStorage.
   */
  private async getOrCreateGuestCart(tokenSesion: string) {
    let carrito = await this.prisma.carrito.findUnique({
      where: { tokenSesion },
      include: { items: true },
    });

    if (!carrito) {
      carrito = await this.prisma.carrito.create({
        data: {
          tokenSesion,
          estado: EstadoCarrito.ACTIVO,
          expiraEn: new Date(Date.now() + CART_TTL_SECONDS * 1000),
        },
        include: { items: true },
      });
    }

    return carrito;
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  SECCIÓN PÚBLICA: Operaciones del Carrito
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Obtener carrito enriquecido con precio actualizado, nombre, tienda e inventario.
   */
  async getCart(usuarioId?: string, tokenSesion?: string) {
    const where: any = { estado: EstadoCarrito.ACTIVO };
    if (usuarioId) where.usuarioId = usuarioId;
    else if (tokenSesion) where.tokenSesion = tokenSesion;
    else throw new BadRequestException('Se requiere usuarioId o tokenSesion.');

    const carrito = await this.prisma.carrito.findFirst({
      where,
      include: {
        items: {
          include: {
            // Nota: Enriquecemos a través de consultas paralelas abajo
          },
        },
      },
    });

    if (!carrito) {
      return { items: [], subtotal: 0, totalItems: 0, tiendas: [] };
    }

    // Enriquecer items con datos actuales de producto y variante
    const enrichedItems = await Promise.all(
      carrito.items.map(async (item) => {
        const producto = await this.prisma.producto.findUnique({
          where: { id: item.productoId },
          select: { id: true, nombre: true, slug: true, tiendaId: true, tienda: { select: { id: true, nombre: true, slug: true } } },
        });

        let varianteInfo = null;
        let precioActual = item.precioUnitario;
        let inventario = null;

        if (item.varianteId) {
          const variante = await this.prisma.productoVariante.findUnique({
            where: { id: item.varianteId },
            include: {
              inventario: { select: { stockDisponible: true, stockFisico: true } },
              atributos: {
                include: {
                  atributo: { select: { nombre: true } },
                  valorAtributo: { select: { valor: true, codigoHex: true } },
                },
              },
            },
          });
          if (variante) {
            precioActual = variante.precio;
            inventario = variante.inventario;
            varianteInfo = {
              id: variante.id,
              sku: variante.sku,
              nombreVariante: variante.nombreVariante,
              precio: variante.precio,
              estado: variante.estado,
              atributos: variante.atributos,
              inventario: variante.inventario,
            };
          }
        } else {
          // Producto simple
          const inv = await this.prisma.inventario.findUnique({
            where: { productoId: item.productoId },
            select: { stockDisponible: true, stockFisico: true },
          });
          inventario = inv;
        }

        const subtotalItem = Number(precioActual) * item.cantidad;

        return {
          ...item,
          precioUnitarioActual: Number(precioActual),
          subtotal: subtotalItem,
          producto,
          variante: varianteInfo,
          stockDisponible: inventario?.stockDisponible ?? 0,
          disponible: (inventario?.stockDisponible ?? 0) >= item.cantidad,
        };
      }),
    );

    // Agrupar por tienda
    const tiendasMap = new Map<string, any>();
    for (const item of enrichedItems) {
      const tiendaId = item.producto?.tiendaId;
      if (!tiendaId) continue;
      if (!tiendasMap.has(tiendaId)) {
        tiendasMap.set(tiendaId, {
          tienda: item.producto?.tienda,
          items: [],
          subtotal: 0,
        });
      }
      const group = tiendasMap.get(tiendaId);
      group.items.push(item);
      group.subtotal += item.subtotal;
    }

    const subtotal = enrichedItems.reduce((acc, i) => acc + i.subtotal, 0);
    const totalItems = enrichedItems.reduce((acc, i) => acc + i.cantidad, 0);

    return {
      id: carrito.id,
      estado: carrito.estado,
      expiraEn: carrito.expiraEn,
      items: enrichedItems,
      tiendas: Array.from(tiendasMap.values()),
      subtotal: Number(subtotal.toFixed(2)),
      totalItems,
    };
  }

  /**
   * Agregar ítem al carrito (usuario autenticado o invitado por token).
   * Valida stock disponible en tiempo real antes de agregar.
   */
  async addItem(dto: AddCartItemDto, usuarioId?: string, tokenSesion?: string) {
    // 1. Validar que el producto existe y está activo
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.productoId },
    });

    if (!producto || producto.estado !== 'ACTIVO') {
      throw new NotFoundException('Producto no disponible en el catálogo.');
    }

    // 2. Determinar precio y validar stock según tipo de producto
    let precio: number;
    let inventarioId: string | undefined;

    if (dto.varianteId) {
      const variante = await this.prisma.productoVariante.findUnique({
        where: { id: dto.varianteId },
        include: { inventario: true },
      });

      if (!variante || !variante.estado) {
        throw new NotFoundException('Variante de producto no disponible.');
      }
      if (variante.productoId !== dto.productoId) {
        throw new BadRequestException('La variante no corresponde al producto especificado.');
      }

      const stockDisp = (variante.inventario?.stockDisponible ?? 0);
      if (stockDisp < dto.cantidad && !variante.inventario?.permitirSobreventa) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${stockDisp}, solicitado: ${dto.cantidad}`,
        );
      }

      precio = Number(variante.precio);
      inventarioId = variante.inventario?.id;
    } else {
      // Producto simple
      const inv = await this.prisma.inventario.findUnique({
        where: { productoId: dto.productoId },
        include: { variante: { select: { precio: true } } },
      });

      // Para producto simple obtenemos el precio de la variante "Estándar"
      const varianteSimple = await this.prisma.productoVariante.findFirst({
        where: { productoId: dto.productoId },
        orderBy: { precio: 'asc' },
      });

      if (!varianteSimple) throw new BadRequestException('No se encontró precio para el producto.');

      const stockDisp = inv?.stockDisponible ?? 0;
      if (stockDisp < dto.cantidad && !inv?.permitirSobreventa) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${stockDisp}, solicitado: ${dto.cantidad}`,
        );
      }

      precio = Number(varianteSimple.precio);
      inventarioId = inv?.id;
    }

    // 3. Obtener o crear carrito
    const carrito = usuarioId
      ? await this.getOrCreateUserCart(usuarioId)
      : await this.getOrCreateGuestCart(tokenSesion!);

    // 4. Si el ítem ya existe en el carrito, actualizar cantidad
    const existingItem = carrito.items.find(
      (i) =>
        i.productoId === dto.productoId &&
        (dto.varianteId ? i.varianteId === dto.varianteId : !i.varianteId),
    );

    if (existingItem) {
      const newQty = existingItem.cantidad + dto.cantidad;
      return this.prisma.carritoItem.update({
        where: { id: existingItem.id },
        data: {
          cantidad: newQty,
          precioUnitario: precio,
          subtotalCalculado: precio * newQty,
        },
      });
    }

    // 5. Crear nuevo ítem en el carrito
    return this.prisma.carritoItem.create({
      data: {
        carritoId: carrito.id,
        productoId: dto.productoId,
        varianteId: dto.varianteId,
        tiendaId: producto.tiendaId,
        cantidad: dto.cantidad,
        precioUnitario: precio,
        subtotalCalculado: precio * dto.cantidad,
      },
    });
  }

  /**
   * Actualizar cantidad de un ítem (0 = eliminar).
   */
  async updateItem(dto: UpdateCartItemDto, usuarioId?: string, tokenSesion?: string) {
    const item = await this.prisma.carritoItem.findUnique({
      where: { id: dto.itemId },
      include: { carrito: true },
    });

    if (!item) throw new NotFoundException('Ítem de carrito no encontrado.');

    // Validar propiedad del carrito
    if (usuarioId && item.carrito.usuarioId !== usuarioId) {
      throw new BadRequestException('El ítem no pertenece al carrito del usuario.');
    }
    if (tokenSesion && item.carrito.tokenSesion !== tokenSesion) {
      throw new BadRequestException('El ítem no pertenece a la sesión de invitado.');
    }

    if (dto.cantidad === 0) {
      await this.prisma.carritoItem.delete({ where: { id: dto.itemId } });
      return { message: 'Ítem eliminado del carrito.' };
    }

    return this.prisma.carritoItem.update({
      where: { id: dto.itemId },
      data: {
        cantidad: dto.cantidad,
        subtotalCalculado: Number(item.precioUnitario) * dto.cantidad,
      },
    });
  }

  /**
   * Eliminar ítem del carrito por ID.
   */
  async removeItem(itemId: string, usuarioId?: string, tokenSesion?: string) {
    const item = await this.prisma.carritoItem.findUnique({
      where: { id: itemId },
      include: { carrito: true },
    });

    if (!item) throw new NotFoundException('Ítem de carrito no encontrado.');

    if (usuarioId && item.carrito.usuarioId !== usuarioId) {
      throw new BadRequestException('El ítem no pertenece al carrito del usuario.');
    }

    await this.prisma.carritoItem.delete({ where: { id: itemId } });
    return { message: 'Ítem eliminado del carrito.' };
  }

  /**
   * Vaciar todo el carrito activo.
   */
  async clearCart(usuarioId?: string, tokenSesion?: string) {
    const where: any = { estado: EstadoCarrito.ACTIVO };
    if (usuarioId) where.usuarioId = usuarioId;
    else if (tokenSesion) where.tokenSesion = tokenSesion;

    const carrito = await this.prisma.carrito.findFirst({ where });
    if (!carrito) return { message: 'No hay carrito activo.' };

    await this.prisma.carritoItem.deleteMany({ where: { carritoId: carrito.id } });
    return { message: 'Carrito vaciado correctamente.' };
  }

  /**
   * Fusionar carrito anónimo (invitado) con el carrito del usuario autenticado.
   * Se ejecuta al momento del login para no perder los ítems del invitado.
   */
  async mergeGuestCart(usuarioId: string, tokenSesion: string) {
    const carritoInvitado = await this.prisma.carrito.findUnique({
      where: { tokenSesion },
      include: { items: true },
    });

    if (!carritoInvitado || carritoInvitado.items.length === 0) {
      return { message: 'No hay carrito de invitado para fusionar.', itemsFusionados: 0 };
    }

    const carritoUsuario = await this.getOrCreateUserCart(usuarioId);
    let itemsFusionados = 0;

    for (const guestItem of carritoInvitado.items) {
      const existing = carritoUsuario.items.find(
        (i) =>
          i.productoId === guestItem.productoId &&
          (guestItem.varianteId ? i.varianteId === guestItem.varianteId : !i.varianteId),
      );

      if (existing) {
        // Sumar cantidades
        const newQty = existing.cantidad + guestItem.cantidad;
        await this.prisma.carritoItem.update({
          where: { id: existing.id },
          data: {
            cantidad: newQty,
            subtotalCalculado: Number(guestItem.precioUnitario) * newQty,
          },
        });
      } else {
        // Mover ítem al carrito del usuario
        await this.prisma.carritoItem.create({
          data: {
            carritoId: carritoUsuario.id,
            productoId: guestItem.productoId,
            varianteId: guestItem.varianteId,
            tiendaId: guestItem.tiendaId,
            cantidad: guestItem.cantidad,
            precioUnitario: guestItem.precioUnitario,
            subtotalCalculado: guestItem.subtotalCalculado,
          },
        });
      }
      itemsFusionados++;
    }

    // Marcar carrito invitado como convertido
    await this.prisma.carrito.update({
      where: { id: carritoInvitado.id },
      data: { estado: EstadoCarrito.CONVERTIDO },
    });

    return {
      message: 'Carrito de invitado fusionado con la cuenta del usuario.',
      itemsFusionados,
    };
  }

  /**
   * Generar un nuevo token de sesión para carrito anónimo (llamado desde el frontend).
   */
  generateSessionToken(): string {
    return uuidv4();
  }
}
