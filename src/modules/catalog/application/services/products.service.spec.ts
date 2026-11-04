import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '@core/database/prisma.service';
import { TipoProducto, EstadoProducto, EstadoVendedor } from '@prisma/client';
import { ForbiddenException, ConflictException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  const mockApprovedVendor = {
    id: 'vendor-1',
    usuarioId: 'user-vendor-1',
    estado: EstadoVendedor.APROBADO,
    tienda: {
      id: 'store-1',
      nombre: 'Tech Store',
      estado: true,
    },
  };

  const mockProduct = {
    id: 'prod-1',
    nombre: 'Polo Deportivo DryFit',
    slug: 'polo-deportivo-dryfit',
    skuBase: 'POLO-DRYFIT',
    tipoProducto: TipoProducto.VARIABLE,
    estado: EstadoProducto.ACTIVO,
    tienda: { id: 'store-1', nombre: 'Tech Store', slug: 'tech-store', vendedor: { calificacionPromedio: 5.0 } },
    categoria: { id: 'cat-1', nombre: 'Ropa', slug: 'ropa' },
    marca: null,
    imagenes: [],
    variantes: [],
    atributos: [],
  };

  beforeEach(async () => {
    prisma = {
      vendedor: {
        findUnique: jest.fn(),
      },
      producto: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      productoVariante: {
        create: jest.fn(),
      },
      varianteAtributo: {
        createMany: jest.fn(),
      },
      inventario: {
        create: jest.fn(),
      },
      productoImagen: {
        createMany: jest.fn(),
      },
      productoAtributo: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    it('debe crear un producto variable con sus variantes, VarianteAtributo e inventario inicial', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(mockApprovedVendor);
      prisma.producto.findUnique
        .mockResolvedValueOnce(null) // Validar SKU base
        .mockResolvedValueOnce(null) // Validar slug
        .mockResolvedValueOnce(mockProduct); // En findBySlug post-creación

      prisma.producto.create.mockResolvedValue(mockProduct);
      prisma.productoVariante.create.mockResolvedValue({ id: 'var-1', sku: 'POLO-DRYFIT-ROJO-M' });
      prisma.varianteAtributo.createMany.mockResolvedValue({ count: 2 });
      prisma.inventario.create.mockResolvedValue({ id: 'inv-1', stockDisponible: 20 });
      prisma.productoImagen.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        nombre: 'Polo Deportivo DryFit',
        skuBase: 'POLO-DRYFIT',
        categoriaId: 'cat-1',
        tipoProducto: TipoProducto.VARIABLE,
        variantes: [
          {
            sku: 'POLO-DRYFIT-ROJO-M',
            nombreVariante: 'Rojo / M',
            precio: 35.0,
            stockInicial: 20,
            atributos: [
              { atributoId: 'attr-color', valorAtributoId: 'val-rojo' },
              { atributoId: 'attr-talla', valorAtributoId: 'val-m' },
            ],
          },
        ],
        imagenes: [
          { url: 'https://cdn.com/polo.jpg', esPrincipal: true },
        ],
      };

      const result = await service.createProduct('user-vendor-1', dto);

      expect(prisma.producto.create).toHaveBeenCalled();
      expect(prisma.productoVariante.create).toHaveBeenCalled();
      expect(prisma.varianteAtributo.createMany).toHaveBeenCalledWith({
        data: [
          { varianteId: 'var-1', atributoId: 'attr-color', valorAtributoId: 'val-rojo' },
          { varianteId: 'var-1', atributoId: 'attr-talla', valorAtributoId: 'val-m' },
        ],
      });
      expect(prisma.inventario.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          varianteId: 'var-1',
          stockFisico: 20,
          stockDisponible: 20,
        }),
      });
      expect(result).toBeDefined();
    });

    it('debe lanzar ForbiddenException si el usuario no es un vendedor aprobado', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...mockApprovedVendor,
        estado: EstadoVendedor.PENDIENTE,
      });

      const dto = {
        nombre: 'Producto Test',
        skuBase: 'TEST-SKU',
        categoriaId: 'cat-1',
        tipoProducto: TipoProducto.SIMPLE,
        precioSimple: 10.0,
      };

      await expect(service.createProduct('user-vendor-1', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar ConflictException si el SKU base ya existe', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(mockApprovedVendor);
      prisma.producto.findUnique.mockResolvedValue(mockProduct);

      const dto = {
        nombre: 'Producto Test',
        skuBase: 'POLO-DRYFIT',
        categoriaId: 'cat-1',
        tipoProducto: TipoProducto.SIMPLE,
        precioSimple: 10.0,
      };

      await expect(service.createProduct('user-vendor-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
