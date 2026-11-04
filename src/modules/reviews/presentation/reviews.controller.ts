import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from '../application/services/reviews.service';
import { CreateProductReviewDto, CreateStoreReviewDto } from '../application/dtos/create-review.dto';
import { CurrentUser } from '@core/decorators/current-user.decorator';
import { Public } from '@core/decorators/public.decorator';
import { JwtAuthGuard } from '@core/guards/jwt-auth.guard';
import { RbacGuard } from '@core/guards/rbac.guard';

@ApiTags('Reseñas Verificadas y Calificaciones')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiOperation({ summary: 'Crear reseña verificada para un producto comprado' })
  @ApiResponse({ status: 201, description: 'Reseña verificada creada correctamente.' })
  @ApiResponse({ status: 400, description: 'El producto ya fue calificado para este ítem.' })
  async createProductReview(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.reviewsService.createProductReview(usuarioId, dto);
  }

  @Post('stores')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @ApiOperation({ summary: 'Crear reseña y calificación para una tienda' })
  @ApiResponse({ status: 201, description: 'Reseña de tienda registrada.' })
  async createStoreReview(
    @CurrentUser('userId') usuarioId: string,
    @Body() dto: CreateStoreReviewDto,
  ) {
    return this.reviewsService.createStoreReview(usuarioId, dto);
  }

  @Get('products/:productoId')
  @Public()
  @ApiOperation({ summary: 'Listar reseñas públicas y calificación promedio de un producto' })
  async getProductReviews(@Param('productoId') productoId: string) {
    return this.reviewsService.getProductReviews(productoId);
  }
}
