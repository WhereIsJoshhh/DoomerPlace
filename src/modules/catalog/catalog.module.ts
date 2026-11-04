import { Module } from '@nestjs/common';
import { CategoriesService } from './application/services/categories.service';
import { BrandsService } from './application/services/brands.service';
import { AttributesService } from './application/services/attributes.service';
import { ProductsService } from './application/services/products.service';
import { CategoriesController } from './presentation/categories.controller';
import { BrandsController } from './presentation/brands.controller';
import { AttributesController } from './presentation/attributes.controller';
import { ProductsController } from './presentation/products.controller';

@Module({
  controllers: [
    CategoriesController,
    BrandsController,
    AttributesController,
    ProductsController,
  ],
  providers: [
    CategoriesService,
    BrandsService,
    AttributesService,
    ProductsService,
  ],
  exports: [
    CategoriesService,
    BrandsService,
    AttributesService,
    ProductsService,
  ],
})
export class CatalogModule {}
