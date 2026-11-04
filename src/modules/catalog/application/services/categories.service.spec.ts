import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '@core/database/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      categoria: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getTree', () => {
    it('debe construir la estructura jerárquica de árbol anidado correctamente', async () => {
      const mockFlatCategories = [
        { id: 'cat-root', nombre: 'Tecnología', slug: 'tecnologia', categoriaPadreId: null, nivel: 1, orden: 0, estado: true },
        { id: 'cat-sub1', nombre: 'Laptops', slug: 'laptops', categoriaPadreId: 'cat-root', nivel: 2, orden: 0, estado: true },
        { id: 'cat-sub2', nombre: 'Gamer', slug: 'laptops-gamer', categoriaPadreId: 'cat-sub1', nivel: 3, orden: 0, estado: true },
      ];

      prisma.categoria.findMany.mockResolvedValue(mockFlatCategories);

      const tree = await service.getTree();

      expect(tree).toHaveLength(1);
      expect(tree[0].nombre).toBe('Tecnología');
      expect(tree[0].subcategorias).toHaveLength(1);
      expect(tree[0].subcategorias[0].nombre).toBe('Laptops');
      expect(tree[0].subcategorias[0].subcategorias).toHaveLength(1);
      expect(tree[0].subcategorias[0].subcategorias[0].nombre).toBe('Gamer');
    });
  });

  describe('create', () => {
    it('debe crear una categoría raíz con nivel 1 si no tiene padre', async () => {
      prisma.categoria.findUnique.mockResolvedValue(null);
      prisma.categoria.create.mockImplementation(({ data }) => Promise.resolve({ id: 'cat-1', ...data }));

      const result = await service.create({
        nombre: 'Moda y Calzado',
      });

      expect(result.nivel).toBe(1);
      expect(result.slug).toBe('moda-y-calzado');
    });

    it('debe calcular el nivel (padre.nivel + 1) al crear una subcategoría', async () => {
      prisma.categoria.findUnique
        .mockResolvedValueOnce(null) // Para validar slug
        .mockResolvedValueOnce({ id: 'cat-parent', nivel: 1 }); // Para buscar categoría padre

      prisma.categoria.create.mockImplementation(({ data }) => Promise.resolve({ id: 'cat-sub', ...data }));

      const result = await service.create({
        nombre: 'Zapatillas',
        categoriaPadreId: 'cat-parent',
      });

      expect(result.nivel).toBe(2);
    });

    it('debe lanzar ConflictException si el slug ya existe', async () => {
      prisma.categoria.findUnique.mockResolvedValue({ id: 'cat-existente', slug: 'tecnologia' });

      await expect(
        service.create({
          nombre: 'Tecnología',
          slug: 'tecnologia',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
