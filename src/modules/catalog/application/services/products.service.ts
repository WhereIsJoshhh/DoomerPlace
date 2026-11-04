import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@core/database/prisma.service';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import { CatalogFilterDto } from '../dtos/catalog-filter.dto';
import { TipoProducto, EstadoProducto, EstadoVendedor } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creación integral de productos simples y variables con variantes dinámicas (VarianteAtributo)
   */
  async createProduct(vendedorUsuarioId: string, dto: CreateProductDto) {
    // 1. Validar que el usuario sea un vendedor aprobado con tienda activa
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { usuarioId: vendedorUsuarioId },
      include: { tienda: true },
    });

    if (!vendedor || vendedor.estado !== EstadoVendedor.APROBADO) {
      throw new ForbiddenException('Únicamente los vendedores aprobados pueden publicar productos.');
    }

    if (!vendedor.tienda || !vendedor.tienda.estado) {
      throw new ForbiddenException('No posee una tienda activa habilitada para publicar productos.');
    }

    const tiendaId = vendedor.tienda.id;

    // 2. Validar unicidad de SKU base
    const existingSku = await this.prisma.producto.findUnique({
      where: { skuBase: dto.skuBase.trim() },
    });

    if (existingSku) {
      throw new ConflictException(`El SKU Base '${dto.skuBase}' ya se encuentra en uso.`);
    }

    // 3. Generar slug único
    let baseSlug = (dto.slug || dto.nombre)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existingSlug = await this.prisma.producto.findUnique({
      where: { slug: baseSlug },
    });

    if (existingSlug) {
      baseSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 4. Validaciones de tipo de producto
    if (dto.tipoProducto === TipoProducto.SIMPLE) {
      if (dto.precioSimple === undefined || dto.precioSimple === null) {
        throw new BadRequestException('Para productos de tipo SIMPLE, el campo precioSimple es obligatorio.');
      }
    } else if (dto.tipoProducto === TipoProducto.VARIABLE) {
      if (!dto.variantes || dto.variantes.length === 0) {
        throw new BadRequestException('Para productos de tipo VARIABLE, debe especificar al menos una variante.');
      }
    }

    // 5. Transacción atómica de creación completa
    return this.prisma.$transaction(async (tx) => {
      // A. Crear registro de Producto
      const producto = await tx.producto.create({
        data: {
          tiendaId,
          categoriaId: dto.categoriaId,
          marcaId: dto.marcaId,
          nombre: dto.nombre.trim(),
          slug: baseSlug,
          descripcionCorta: dto.descripcionCorta?.trim(),
          descripcionLarga: dto.descripcionLarga?.trim(),
          skuBase: dto.skuBase.trim(),
          tipoProducto: dto.tipoProducto,
          peso: dto.peso ?? 0.0,
          ancho: dto.ancho ?? 0.0,
          alto: dto.alto ?? 0.0,
          largo: dto.largo ?? 0.0,
          requiereEnvio: dto.requiereEnvio ?? true,
          estado: EstadoProducto.ACTIVO,
          esDestacado: dto.esDestacado ?? false,
          fechaPublicacion: new Date(),
        },
      });

      // B. Procesamiento de Producto SIMPLE
      if (dto.tipoProducto === TipoProducto.SIMPLE) {
        const varianteSimple = await tx.productoVariante.create({
          data: {
            productoId: producto.id,
            sku: dto.skuBase.trim(),
            nombreVariante: 'Estándar',
            precio: dto.precioSimple,
            precioComparacion: dto.precioComparacionSimple,
            peso: dto.peso ?? 0.0,
            estado: true,
          },
        });

        // Inicializar inventario
        const stockInicial = dto.stockInicialSimple ?? 0;
        await tx.inventario.create({
          data: {
            productoId: producto.id,
            varianteId: varianteSimple.id,
            stockFisico: stockInicial,
            stockDisponible: stockInicial,
            stockReservado: 0,
            stockMinimoAlerta: 5,
          },
        });
      }

      // C. Procesamiento de Producto VARIABLE con variantes dinámicas
      if (dto.tipoProducto === TipoProducto.VARIABLE && dto.variantes) {
        for (const v of dto.variantes) {
          const variante = await tx.productoVariante.create({
            data: {
              productoId: producto.id,
              sku: v.sku.trim(),
              nombreVariante: v.nombreVariante.trim(),
              precio: v.precio,
              precioComparacion: v.precioComparacion,
              costo: v.costo,
              peso: v.peso ?? dto.peso ?? 0.0,
              codigoBarras: v.codigoBarras?.trim(),
              estado: true,
            },
          });

          // Mapeo N:M en VarianteAtributo para cada valor de combinación
          if (v.atributos && v.atributos.length > 0) {
            await tx.varianteAtributo.createMany({
              data: v.atributos.map((attr) => ({
                varianteId: variante.id,
                atributoId: attr.atributoId,
                valorAtributoId: attr.valorAtributoId,
              })),
            });
          }

          // Inicializar inventario por cada variante
          const stockInicial = v.stockInicial ?? 0;
          await tx.inventario.create({
            data: {
              varianteId: variante.id,
              stockFisico: stockInicial,
              stockDisponible: stockInicial,
              stockReservado: 0,
              stockMinimoAlerta: 5,
            },
          });
        }
      }

      // D. Crear Galería Multimedia (ProductoImagen)
      if (dto.imagenes && dto.imagenes.length > 0) {
        await tx.productoImagen.createMany({
          data: dto.imagenes.map((img, idx) => ({
            productoId: producto.id,
            url: img.url.trim(),
            altText: img.altText?.trim(),
            orden: img.orden ?? idx,
            esPrincipal: img.esPrincipal ?? (idx === 0),
          })),
        });
      }

      // E. Crear Atributos Descriptivos de Ficha Técnica (ProductoAtributo)
      if (dto.atributosDescriptivos && dto.atributosDescriptivos.length > 0) {
        await tx.productoAtributo.createMany({
          data: dto.atributosDescriptivos.map((attr) => ({
            productoId: producto.id,
            atributoId: attr.atributoId,
            valorAtributoId: attr.valorAtributoId,
            valorTextoPersonalizado: attr.valorTextoPersonalizado?.trim(),
          })),
        });
      }

      return this.findBySlug(producto.slug);
    });
  }

  /**
   * Buscar producto por su slug con todo el detalle de variantes, atributos e inventario
   */
  async findBySlug(slug: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { slug },
      include: {
        categoria: {
          select: { id: true, nombre: true, slug: true },
        },
        marca: {
          select: { id: true, nombre: true, slug: true, logoUrl: true },
        },
        tienda: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            logoUrl: true,
            vendedor: {
              select: { calificacionPromedio: true },
            },
          },
        },
        imagenes: {
          orderBy: { orden: 'asc' },
        },
        variantes: {
          where: { estado: true },
          include: {
            inventario: {
              select: {
                stockFisico: true,
                stockDisponible: true,
                stockReservado: true,
              },
            },
            atributos: {
              include: {
                atributo: { select: { id: true, nombre: true, tipoDato: true } },
                valorAtributo: { select: { id: true, valor: true, codigoHex: true } },
              },
            },
          },
        },
        atributos: {
          include: {
            atributo: { select: { id: true, nombre: true } },
            valorAtributo: { select: { id: true, valor: true } },
          },
        },
      },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return producto;
  }

  /**
   * Listado de catálogo con filtros facetados (Búsqueda, Categoría, Marca, Tienda, Rango de Precios)
   */
  async findAll(query: CatalogFilterDto) {
    const {
      search,
      categoriaId,
      marcaId,
      tiendaId,
      precioMin,
      precioMax,
      estado = EstadoProducto.ACTIVO,
      page = 1,
      limit = 20,
      orden = 'reciente',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { estado };

    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    if (marcaId) {
      where.marcaId = marcaId;
    }

    if (tiendaId) {
      where.tiendaId = tiendaId;
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcionCorta: { contains: search, mode: 'insensitive' } },
        { skuBase: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (precioMin !== undefined || precioMax !== undefined) {
      where.variantes = {
        some: {
          precio: {
            gte: precioMin !== undefined ? precioMin : undefined,
            lte: precioMax !== undefined ? precioMax : undefined,
          },
        },
      };
    }

    // Ordenamiento
    let orderBy: any = { fechaPublicacion: 'desc' };
    if (orden === 'reciente') {
      orderBy = { fechaPublicacion: 'desc' };
    }

    const [total, items] = await Promise.all([
      this.prisma.producto.count({ where }),
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          categoria: { select: { id: true, nombre: true, slug: true } },
          marca: { select: { id: true, nombre: true, logoUrl: true } },
          tienda: { select: { id: true, nombre: true, slug: true } },
          imagenes: {
            where: { esPrincipal: true },
            take: 1,
          },
          variantes: {
            where: { estado: true },
            select: {
              id: true,
              sku: true,
              precio: true,
              precioComparacion: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Actualizar datos del producto (verificando que pertenezca a la tienda del vendedor)
   */
  async updateProduct(id: string, vendedorUsuarioId: string, dto: UpdateProductDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { tienda: { include: { vendedor: true } } },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado.');
    }

    if (producto.tienda.vendedor.usuarioId !== vendedorUsuarioId) {
      throw new ForbiddenException('No posee permisos para modificar este producto.');
    }

    return this.prisma.producto.update({
      where: { id },
      data: {
        nombre: dto.nombre?.trim(),
        descripcionCorta: dto.descripcionCorta?.trim(),
        descripcionLarga: dto.descripcionLarga?.trim(),
        peso: dto.peso,
        ancho: dto.ancho,
        alto: dto.alto,
        largo: dto.largo,
        requiereEnvio: dto.requiereEnvio,
        esDestacado: dto.esDestacado,
        estado: dto.estado,
      },
    });
  }
}
