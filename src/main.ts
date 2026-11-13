import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';

  // Prefijo global de API
  app.setGlobalPrefix(apiPrefix);

  // Validación y transformación estricta de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Habilitar CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Configuración de Documentación Swagger / OpenAPI 3.0
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Marketplace Multi-Vendedor - Backend API')
    .setDescription(
      'Plataforma integral de comercio electrónico multi-tienda estructurada en 14 dominios de negocio. ' +
        'Incluye autenticación JWT, RBAC granular N:M, Split Orders, Escrow/Payouts, reservas con TTL y trazabilidad contable inmutable.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Ingrese su Access Token JWT con prefijo Bearer',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Autenticación', 'Endpoints de registro, login y rotación de tokens')
    .addTag('Usuarios', 'Gestión de perfiles de usuario y listados')
    .addTag('Direcciones', 'Direcciones de envío y facturación del comprador')
    .addTag('Control de Acceso (RBAC)', 'Administración de roles, permisos atómicos y asignaciones')
    .addTag('Vendedores y KYC', 'Onboarding de vendedores, subida y validación de documentos legales')
    .addTag('Tiendas Públicas', 'Perfiles de tienda, catálogos por comercio y políticas')
    .addTag('Catálogo y Categorías', 'Árbol jerárquico N-niveles de categorías y marcas')
    .addTag('Atributos y Variantes', 'Definición de atributos dinámicos y valores para variantes')
    .addTag('Productos y Catálogo', 'Gestión de productos simples y variables con variantes dinámicas')
    .addTag('Inventario y Kardex', 'Control de stock físico, reservado, disponible y auditoría inmutable Kardex')
    .addTag('Carrito de Compras', 'Gestión de carritos para usuarios autenticados e invitados anónimos')
    .addTag('Gestión de Pedidos y Split Orders', 'Checkout, división automática de órdenes madre en subpedidos y snapshots contables')
    .addTag('Pagos y Pasarelas', 'Intenciones de pago, pasarelas externas y webhooks idempotentes')
    .addTag('Finanzas, Balances y Liquidaciones a Vendedores', 'Cuentas bancarias de tiendas, balances contables y dispersión de payouts')
    .addTag('Logística, Envíos y Guías de Rastreo', 'Despacho de pedidos, guías logísticas y trazabilidad de eventos de entrega')
    .addTag('Devoluciones, Garantías y Reembolsos (RMA)', 'Solicitudes de devolución, inspección de calidad física y reversión a inventario')
    .addTag('Promociones, Cupones y Descuentos', 'Creación y validación de cupones con límites de uso y trazabilidad CuponUso')
    .addTag('Reseñas Verificadas y Calificaciones', 'Reseñas respaldadas por compras reales y calificación promedio de tiendas')
    .addTag('Comunicación, Mensajería y Preguntas', 'Preguntas públicas en productos y mensajería directa comprador-tienda')
    .addTag('Auditoría y Configuración Global del Sistema', 'Parámetros del marketplace y registros inmutables de auditoría')
    .addTag('Contacto y Soporte', 'Formulario público de contacto y revisión de mensajes por administradores')
    .addTag('Salud y Disponibilidad', 'Health checks de base de datos y memoria')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  logger.log(`====================================================`);
  logger.log(`🚀 Servidor Marketplace corriendo en: http://localhost:${port}/${apiPrefix}`);
  logger.log(`📚 Documentación Swagger activa en: http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`====================================================`);
}

bootstrap();
