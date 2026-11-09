-- CreateEnum
CREATE TYPE "EstadoUsuario" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "AccionPermiso" AS ENUM ('CREAR', 'LEER', 'ACTUALIZAR', 'ELIMINAR', 'APROBAR');

-- CreateEnum
CREATE TYPE "TipoDireccion" AS ENUM ('ENVIO', 'FACTURACION');

-- CreateEnum
CREATE TYPE "EstadoVendedor" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('NATURAL', 'JURIDICA');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "TipoProducto" AS ENUM ('SIMPLE', 'VARIABLE');

-- CreateEnum
CREATE TYPE "EstadoProducto" AS ENUM ('BORRADOR', 'ACTIVO', 'INACTIVO', 'ARCHIVADO');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA_COMPRA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'RESERVA_CHECKOUT', 'LIBERACION_RESERVA', 'DEVOLUCION_RMA');

-- CreateEnum
CREATE TYPE "EstadoCarrito" AS ENUM ('ACTIVO', 'ABANDONADO', 'CONVERTIDO');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE_PAGO', 'PAGADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "EstadoSubPedido" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'CANCELADO', 'EN_DISPUTA');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO', 'EXPIRADO');

-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('PENDIENTE', 'PROCESANDO', 'PAGADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('PENDIENTE', 'GUIA_GENERADA', 'EN_TRANSITO', 'EN_REPARTO', 'ENTREGADO', 'FALLIDO', 'DEVUELTO');

-- CreateEnum
CREATE TYPE "EstadoDevolucion" AS ENUM ('SOLICITADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "InspeccionEstado" AS ENUM ('PENDIENTE', 'CONFORME', 'DEFECTUOSO_CLIENTE', 'DEFECTUOSO_FABRICA');

-- CreateEnum
CREATE TYPE "TipoDescuento" AS ENUM ('PORCENTAJE', 'MONTO_FIJO');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('EMAIL', 'PUSH', 'SMS', 'IN_APP');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "passwordHash" TEXT NOT NULL,
    "emailVerificado" BOOLEAN NOT NULL DEFAULT false,
    "telefonoVerificado" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO',
    "ultimoAcceso" TIMESTAMP(3),
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permisos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" "AccionPermiso" NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios_roles" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles_permisos" (
    "id" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direcciones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoDireccion" NOT NULL,
    "alias" TEXT,
    "receptor" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "pais" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "colonia" TEXT,
    "calle" TEXT NOT NULL,
    "referencia" TEXT,
    "codigoPostal" TEXT NOT NULL,
    "latitud" DECIMAL(10,8),
    "longitud" DECIMAL(11,8),
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendedores" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "identificacionFiscal" TEXT NOT NULL,
    "tipoPersona" "TipoPersona" NOT NULL DEFAULT 'NATURAL',
    "telefonoComercial" TEXT NOT NULL,
    "emailComercial" TEXT NOT NULL,
    "estado" "EstadoVendedor" NOT NULL DEFAULT 'PENDIENTE',
    "porcentajeComisionBase" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    "calificacionPromedio" DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaAprobacion" TIMESTAMP(3),

    CONSTRAINT "vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiendas" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "lema" TEXT,
    "descripcion" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccionFisica" TEXT,
    "horarioAtencion" TEXT,
    "politicasDevolucion" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tiendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_vendedores" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "estado" "EstadoDocumento" NOT NULL DEFAULT 'PENDIENTE',
    "observacionesRevision" TEXT,
    "revisadoPorUsuarioId" TEXT,
    "fechaSubida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRevision" TIMESTAMP(3),

    CONSTRAINT "documentos_vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "categoriaPadreId" TEXT,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagenUrl" TEXT,
    "icono" TEXT,
    "nivel" INTEGER NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "logoUrl" TEXT,
    "sitioWeb" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "marcaId" TEXT,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcionCorta" TEXT,
    "descripcionLarga" TEXT,
    "skuBase" TEXT NOT NULL,
    "tipoProducto" "TipoProducto" NOT NULL DEFAULT 'SIMPLE',
    "peso" DECIMAL(8,3) NOT NULL DEFAULT 0.000,
    "ancho" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "alto" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "largo" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "requiereEnvio" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoProducto" NOT NULL DEFAULT 'BORRADOR',
    "esDestacado" BOOLEAN NOT NULL DEFAULT false,
    "fechaPublicacion" TIMESTAMP(3),
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_imagenes" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "productos_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atributos" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT,
    "nombre" TEXT NOT NULL,
    "tipoDato" TEXT NOT NULL DEFAULT 'TEXTO',
    "esObligatorio" BOOLEAN NOT NULL DEFAULT false,
    "esFiltrable" BOOLEAN NOT NULL DEFAULT true,
    "esVariante" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "atributos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valores_atributos" (
    "id" TEXT NOT NULL,
    "atributoId" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "codigoHex" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "valores_atributos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_variantes" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "nombreVariante" TEXT NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "precioComparacion" DECIMAL(12,2),
    "costo" DECIMAL(12,2),
    "peso" DECIMAL(8,3),
    "codigoBarras" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "productos_variantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantes_atributos" (
    "id" TEXT NOT NULL,
    "varianteId" TEXT NOT NULL,
    "atributoId" TEXT NOT NULL,
    "valorAtributoId" TEXT NOT NULL,

    CONSTRAINT "variantes_atributos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos_atributos" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "atributoId" TEXT NOT NULL,
    "valorAtributoId" TEXT,
    "valorTextoPersonalizado" TEXT,

    CONSTRAINT "productos_atributos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventarios" (
    "id" TEXT NOT NULL,
    "productoId" TEXT,
    "varianteId" TEXT,
    "stockFisico" INTEGER NOT NULL DEFAULT 0,
    "stockReservado" INTEGER NOT NULL DEFAULT 0,
    "stockDisponible" INTEGER NOT NULL DEFAULT 0,
    "stockMinimoAlerta" INTEGER NOT NULL DEFAULT 5,
    "permitirSobreventa" BOOLEAN NOT NULL DEFAULT false,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" TEXT NOT NULL,
    "inventarioId" TEXT NOT NULL,
    "tipo" "TipoMovimientoInventario" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "stockAnterior" INTEGER NOT NULL,
    "stockNuevo" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "referenciaTipo" TEXT,
    "referenciaId" TEXT,
    "usuarioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carritos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tokenSesion" TEXT,
    "estado" "EstadoCarrito" NOT NULL DEFAULT 'ACTIVO',
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carritos_items" (
    "id" TEXT NOT NULL,
    "carritoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "tiendaId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "subtotalCalculado" DECIMAL(12,2) NOT NULL,
    "fechaAgregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carritos_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "numeroPedido" TEXT NOT NULL,
    "direccionEnvioId" TEXT NOT NULL,
    "direccionFacturacionId" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuentoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "impuestoTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "costoEnvioTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "cuponId" TEXT,
    "ipCliente" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subpedidos" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "numeroSubPedido" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "impuesto" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "costoEnvio" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL,
    "porcentajeComision" DECIMAL(5,2) NOT NULL,
    "montoComisionPlataforma" DECIMAL(12,2) NOT NULL,
    "montoNetoTienda" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoSubPedido" NOT NULL DEFAULT 'PENDIENTE',
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subpedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_items" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "subPedidoId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "nombreProductoSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "precioUnitario" DECIMAL(12,2) NOT NULL,
    "costoUnitario" DECIMAL(12,2),
    "cantidad" INTEGER NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "impuesto" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "pedidos_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estados_pedidos" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "subPedidoId" TEXT,
    "estadoAnterior" TEXT NOT NULL,
    "estadoNuevo" TEXT NOT NULL,
    "comentario" TEXT,
    "cambiadoPorUsuarioId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estados_pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodos_pago" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "esPasarelaOnline" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "metodos_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "metodoPagoId" TEXT NOT NULL,
    "transaccionExternaId" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "codigoAutorizacion" TEXT,
    "datosRespuestaPasarela" JSONB,
    "fechaPago" TIMESTAMP(3),
    "fechaExpiracion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuentas_bancarias_vendedores" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "banco" TEXT NOT NULL,
    "tipoCuenta" TEXT NOT NULL,
    "numeroCuenta" TEXT NOT NULL,
    "titularCuenta" TEXT NOT NULL,
    "identificacionTitular" TEXT NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuentas_bancarias_vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balances_vendedores" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "saldoPendiente" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "saldoDisponible" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "saldoRetirado" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balances_vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liquidaciones_vendedores" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "cuentaBancariaId" TEXT NOT NULL,
    "numeroLiquidacion" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "totalVentasBrutas" DECIMAL(12,2) NOT NULL,
    "totalComisionesDescontadas" DECIMAL(12,2) NOT NULL,
    "totalEnviosReembolsados" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalRetencionesFiscales" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "montoNetoPagar" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'PENDIENTE',
    "referenciaBancaria" TEXT,
    "comprobanteUrl" TEXT,
    "fechaPago" TIMESTAMP(3),
    "procesadoPorUsuarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidaciones_vendedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detalles_liquidaciones_subpedidos" (
    "id" TEXT NOT NULL,
    "liquidacionId" TEXT NOT NULL,
    "subPedidoId" TEXT NOT NULL,
    "montoLiberado" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "detalles_liquidaciones_subpedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "envios" (
    "id" TEXT NOT NULL,
    "subPedidoId" TEXT NOT NULL,
    "direccionEnvioId" TEXT NOT NULL,
    "proveedorLogistico" TEXT NOT NULL,
    "numeroGuia" TEXT,
    "urlTracking" TEXT,
    "costoRealEnvio" DECIMAL(12,2) NOT NULL,
    "pesoTotal" DECIMAL(8,3) NOT NULL,
    "fechaDespacho" TIMESTAMP(3),
    "fechaEstimadaEntrega" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "envios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_tracking" (
    "id" TEXT NOT NULL,
    "envioId" TEXT NOT NULL,
    "estadoHito" TEXT NOT NULL,
    "ubicacion" TEXT,
    "descripcion" TEXT NOT NULL,
    "fechaEvento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devoluciones" (
    "id" TEXT NOT NULL,
    "subPedidoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoDevolucion" NOT NULL DEFAULT 'SOLICITADA',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaResolucion" TIMESTAMP(3),

    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devoluciones_items" (
    "id" TEXT NOT NULL,
    "devolucionId" TEXT NOT NULL,
    "pedidoItemId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "inspeccionEstado" "InspeccionEstado" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "devoluciones_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reembolsos" (
    "id" TEXT NOT NULL,
    "pagoId" TEXT NOT NULL,
    "devolucionId" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "transaccionReembolsoExternaId" TEXT,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADO',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reembolsos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupones" (
    "id" TEXT NOT NULL,
    "tiendaId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoDescuento" "TipoDescuento" NOT NULL DEFAULT 'PORCENTAJE',
    "valorDescuento" DECIMAL(10,2) NOT NULL,
    "montoMinimoCompra" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "descuentoMaximoPermitido" DECIMAL(12,2),
    "limiteUsosTotal" INTEGER,
    "limiteUsosPorUsuario" INTEGER NOT NULL DEFAULT 1,
    "usosActuales" INTEGER NOT NULL DEFAULT 0,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cupones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cupones_usos" (
    "id" TEXT NOT NULL,
    "cuponId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "descuentoAplicado" DECIMAL(12,2) NOT NULL,
    "fechaUso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cupones_usos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoDescuento" NOT NULL DEFAULT 'PORCENTAJE',
    "valor" DECIMAL(10,2) NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "promociones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promociones_productos" (
    "id" TEXT NOT NULL,
    "promocionId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,

    CONSTRAINT "promociones_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resenas_productos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "pedidoItemId" TEXT NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "titulo" TEXT,
    "comentario" TEXT,
    "esCompraVerificada" BOOLEAN NOT NULL DEFAULT true,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenas_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resenas_tiendas" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "subPedidoId" TEXT NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenas_tiendas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listas_deseos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT 'Favoritos',
    "esPublica" BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listas_deseos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listas_deseos_items" (
    "id" TEXT NOT NULL,
    "listaDeseosId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "varianteId" TEXT,
    "fechaAgregado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listas_deseos_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preguntas_productos" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preguntas_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_preguntas" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_preguntas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" TEXT NOT NULL,
    "compradorId" TEXT NOT NULL,
    "tiendaId" TEXT NOT NULL,
    "subPedidoId" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "conversacionId" TEXT NOT NULL,
    "remitenteUsuarioId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "tipoContenido" TEXT NOT NULL DEFAULT 'TEXTO',
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fechaEnvio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "canal" "CanalNotificacion" NOT NULL DEFAULT 'IN_APP',
    "tipoEvento" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "enlaceDestino" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "tipoDato" TEXT NOT NULL DEFAULT 'STRING',
    "grupo" TEXT NOT NULL DEFAULT 'GENERAL',
    "descripcion" TEXT,
    "esEditable" BOOLEAN NOT NULL DEFAULT true,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditorias" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "datosPrevios" JSONB,
    "datosNuevos" JSONB,
    "direccionIp" TEXT,
    "agenteUsuario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditorias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_estado_idx" ON "usuarios"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "roles_slug_idx" ON "roles"("slug");

-- CreateIndex
CREATE INDEX "permisos_modulo_idx" ON "permisos"("modulo");

-- CreateIndex
CREATE UNIQUE INDEX "permisos_modulo_accion_key" ON "permisos"("modulo", "accion");

-- CreateIndex
CREATE INDEX "usuarios_roles_usuarioId_idx" ON "usuarios_roles"("usuarioId");

-- CreateIndex
CREATE INDEX "usuarios_roles_rolId_idx" ON "usuarios_roles"("rolId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_roles_usuarioId_rolId_key" ON "usuarios_roles"("usuarioId", "rolId");

-- CreateIndex
CREATE INDEX "roles_permisos_rolId_idx" ON "roles_permisos"("rolId");

-- CreateIndex
CREATE INDEX "roles_permisos_permisoId_idx" ON "roles_permisos"("permisoId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_permisos_rolId_permisoId_key" ON "roles_permisos"("rolId", "permisoId");

-- CreateIndex
CREATE INDEX "direcciones_usuarioId_idx" ON "direcciones"("usuarioId");

-- CreateIndex
CREATE INDEX "direcciones_tipo_esPrincipal_idx" ON "direcciones"("tipo", "esPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_usuarioId_key" ON "vendedores"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "vendedores_identificacionFiscal_key" ON "vendedores"("identificacionFiscal");

-- CreateIndex
CREATE INDEX "vendedores_estado_idx" ON "vendedores"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "tiendas_vendedorId_key" ON "tiendas"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "tiendas_slug_key" ON "tiendas"("slug");

-- CreateIndex
CREATE INDEX "tiendas_slug_idx" ON "tiendas"("slug");

-- CreateIndex
CREATE INDEX "documentos_vendedores_vendedorId_idx" ON "documentos_vendedores"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE INDEX "categorias_categoriaPadreId_idx" ON "categorias"("categoriaPadreId");

-- CreateIndex
CREATE INDEX "categorias_slug_idx" ON "categorias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_slug_key" ON "marcas"("slug");

-- CreateIndex
CREATE INDEX "marcas_slug_idx" ON "marcas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "productos_slug_key" ON "productos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "productos_skuBase_key" ON "productos"("skuBase");

-- CreateIndex
CREATE INDEX "productos_tiendaId_idx" ON "productos"("tiendaId");

-- CreateIndex
CREATE INDEX "productos_categoriaId_idx" ON "productos"("categoriaId");

-- CreateIndex
CREATE INDEX "productos_estado_idx" ON "productos"("estado");

-- CreateIndex
CREATE INDEX "productos_imagenes_productoId_idx" ON "productos_imagenes"("productoId");

-- CreateIndex
CREATE INDEX "productos_imagenes_varianteId_idx" ON "productos_imagenes"("varianteId");

-- CreateIndex
CREATE INDEX "atributos_categoriaId_idx" ON "atributos"("categoriaId");

-- CreateIndex
CREATE INDEX "valores_atributos_atributoId_idx" ON "valores_atributos"("atributoId");

-- CreateIndex
CREATE UNIQUE INDEX "productos_variantes_sku_key" ON "productos_variantes"("sku");

-- CreateIndex
CREATE INDEX "productos_variantes_productoId_idx" ON "productos_variantes"("productoId");

-- CreateIndex
CREATE INDEX "productos_variantes_sku_idx" ON "productos_variantes"("sku");

-- CreateIndex
CREATE INDEX "variantes_atributos_varianteId_idx" ON "variantes_atributos"("varianteId");

-- CreateIndex
CREATE UNIQUE INDEX "variantes_atributos_varianteId_atributoId_key" ON "variantes_atributos"("varianteId", "atributoId");

-- CreateIndex
CREATE INDEX "productos_atributos_productoId_idx" ON "productos_atributos"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "inventarios_productoId_key" ON "inventarios"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "inventarios_varianteId_key" ON "inventarios"("varianteId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_inventarioId_idx" ON "movimientos_inventario"("inventarioId");

-- CreateIndex
CREATE INDEX "movimientos_inventario_referenciaTipo_referenciaId_idx" ON "movimientos_inventario"("referenciaTipo", "referenciaId");

-- CreateIndex
CREATE UNIQUE INDEX "carritos_tokenSesion_key" ON "carritos"("tokenSesion");

-- CreateIndex
CREATE INDEX "carritos_usuarioId_idx" ON "carritos"("usuarioId");

-- CreateIndex
CREATE INDEX "carritos_tokenSesion_idx" ON "carritos"("tokenSesion");

-- CreateIndex
CREATE INDEX "carritos_items_carritoId_idx" ON "carritos_items"("carritoId");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numeroPedido_key" ON "pedidos"("numeroPedido");

-- CreateIndex
CREATE INDEX "pedidos_numeroPedido_idx" ON "pedidos"("numeroPedido");

-- CreateIndex
CREATE INDEX "pedidos_usuarioId_idx" ON "pedidos"("usuarioId");

-- CreateIndex
CREATE INDEX "pedidos_estado_idx" ON "pedidos"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "subpedidos_numeroSubPedido_key" ON "subpedidos"("numeroSubPedido");

-- CreateIndex
CREATE INDEX "subpedidos_pedidoId_idx" ON "subpedidos"("pedidoId");

-- CreateIndex
CREATE INDEX "subpedidos_tiendaId_idx" ON "subpedidos"("tiendaId");

-- CreateIndex
CREATE INDEX "subpedidos_estado_idx" ON "subpedidos"("estado");

-- CreateIndex
CREATE INDEX "pedidos_items_pedidoId_idx" ON "pedidos_items"("pedidoId");

-- CreateIndex
CREATE INDEX "pedidos_items_subPedidoId_idx" ON "pedidos_items"("subPedidoId");

-- CreateIndex
CREATE INDEX "historial_estados_pedidos_pedidoId_idx" ON "historial_estados_pedidos"("pedidoId");

-- CreateIndex
CREATE INDEX "historial_estados_pedidos_subPedidoId_idx" ON "historial_estados_pedidos"("subPedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "metodos_pago_codigo_key" ON "metodos_pago"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_transaccionExternaId_key" ON "pagos"("transaccionExternaId");

-- CreateIndex
CREATE INDEX "pagos_pedidoId_idx" ON "pagos"("pedidoId");

-- CreateIndex
CREATE INDEX "pagos_transaccionExternaId_idx" ON "pagos"("transaccionExternaId");

-- CreateIndex
CREATE INDEX "pagos_estado_idx" ON "pagos"("estado");

-- CreateIndex
CREATE INDEX "cuentas_bancarias_vendedores_vendedorId_idx" ON "cuentas_bancarias_vendedores"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "balances_vendedores_vendedorId_key" ON "balances_vendedores"("vendedorId");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_vendedores_numeroLiquidacion_key" ON "liquidaciones_vendedores"("numeroLiquidacion");

-- CreateIndex
CREATE INDEX "liquidaciones_vendedores_vendedorId_idx" ON "liquidaciones_vendedores"("vendedorId");

-- CreateIndex
CREATE INDEX "liquidaciones_vendedores_numeroLiquidacion_idx" ON "liquidaciones_vendedores"("numeroLiquidacion");

-- CreateIndex
CREATE UNIQUE INDEX "detalles_liquidaciones_subpedidos_liquidacionId_subPedidoId_key" ON "detalles_liquidaciones_subpedidos"("liquidacionId", "subPedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "envios_subPedidoId_key" ON "envios"("subPedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "envios_numeroGuia_key" ON "envios"("numeroGuia");

-- CreateIndex
CREATE INDEX "envios_numeroGuia_idx" ON "envios"("numeroGuia");

-- CreateIndex
CREATE INDEX "envios_estado_idx" ON "envios"("estado");

-- CreateIndex
CREATE INDEX "eventos_tracking_envioId_idx" ON "eventos_tracking"("envioId");

-- CreateIndex
CREATE INDEX "devoluciones_subPedidoId_idx" ON "devoluciones"("subPedidoId");

-- CreateIndex
CREATE INDEX "devoluciones_usuarioId_idx" ON "devoluciones"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "reembolsos_transaccionReembolsoExternaId_key" ON "reembolsos"("transaccionReembolsoExternaId");

-- CreateIndex
CREATE UNIQUE INDEX "cupones_codigo_key" ON "cupones"("codigo");

-- CreateIndex
CREATE INDEX "cupones_codigo_idx" ON "cupones"("codigo");

-- CreateIndex
CREATE INDEX "cupones_usos_cuponId_idx" ON "cupones_usos"("cuponId");

-- CreateIndex
CREATE INDEX "cupones_usos_usuarioId_idx" ON "cupones_usos"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "cupones_usos_cuponId_usuarioId_pedidoId_key" ON "cupones_usos"("cuponId", "usuarioId", "pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "resenas_productos_pedidoItemId_key" ON "resenas_productos"("pedidoItemId");

-- CreateIndex
CREATE INDEX "resenas_productos_productoId_idx" ON "resenas_productos"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "resenas_tiendas_subPedidoId_key" ON "resenas_tiendas"("subPedidoId");

-- CreateIndex
CREATE INDEX "resenas_tiendas_tiendaId_idx" ON "resenas_tiendas"("tiendaId");

-- CreateIndex
CREATE INDEX "listas_deseos_usuarioId_idx" ON "listas_deseos"("usuarioId");

-- CreateIndex
CREATE INDEX "listas_deseos_items_listaDeseosId_idx" ON "listas_deseos_items"("listaDeseosId");

-- CreateIndex
CREATE INDEX "preguntas_productos_productoId_idx" ON "preguntas_productos"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_preguntas_preguntaId_key" ON "respuestas_preguntas"("preguntaId");

-- CreateIndex
CREATE INDEX "conversaciones_compradorId_idx" ON "conversaciones"("compradorId");

-- CreateIndex
CREATE INDEX "conversaciones_tiendaId_idx" ON "conversaciones"("tiendaId");

-- CreateIndex
CREATE INDEX "mensajes_conversacionId_idx" ON "mensajes"("conversacionId");

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_idx" ON "notificaciones"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_clave_key" ON "configuraciones"("clave");

-- CreateIndex
CREATE INDEX "configuraciones_clave_idx" ON "configuraciones"("clave");

-- CreateIndex
CREATE INDEX "auditorias_usuarioId_idx" ON "auditorias"("usuarioId");

-- CreateIndex
CREATE INDEX "auditorias_modulo_idx" ON "auditorias"("modulo");

-- CreateIndex
CREATE INDEX "auditorias_entidad_entidadId_idx" ON "auditorias"("entidad", "entidadId");

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "permisos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direcciones" ADD CONSTRAINT "direcciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendedores" ADD CONSTRAINT "vendedores_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiendas" ADD CONSTRAINT "tiendas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_vendedores" ADD CONSTRAINT "documentos_vendedores_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_categoriaPadreId_fkey" FOREIGN KEY ("categoriaPadreId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tiendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_imagenes" ADD CONSTRAINT "productos_imagenes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_imagenes" ADD CONSTRAINT "productos_imagenes_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "productos_variantes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atributos" ADD CONSTRAINT "atributos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valores_atributos" ADD CONSTRAINT "valores_atributos_atributoId_fkey" FOREIGN KEY ("atributoId") REFERENCES "atributos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_variantes" ADD CONSTRAINT "productos_variantes_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_atributos" ADD CONSTRAINT "variantes_atributos_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "productos_variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_atributos" ADD CONSTRAINT "variantes_atributos_atributoId_fkey" FOREIGN KEY ("atributoId") REFERENCES "atributos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantes_atributos" ADD CONSTRAINT "variantes_atributos_valorAtributoId_fkey" FOREIGN KEY ("valorAtributoId") REFERENCES "valores_atributos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_atributos" ADD CONSTRAINT "productos_atributos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_atributos" ADD CONSTRAINT "productos_atributos_atributoId_fkey" FOREIGN KEY ("atributoId") REFERENCES "atributos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos_atributos" ADD CONSTRAINT "productos_atributos_valorAtributoId_fkey" FOREIGN KEY ("valorAtributoId") REFERENCES "valores_atributos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios" ADD CONSTRAINT "inventarios_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventarios" ADD CONSTRAINT "inventarios_varianteId_fkey" FOREIGN KEY ("varianteId") REFERENCES "productos_variantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "inventarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carritos" ADD CONSTRAINT "carritos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carritos_items" ADD CONSTRAINT "carritos_items_carritoId_fkey" FOREIGN KEY ("carritoId") REFERENCES "carritos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_direccionEnvioId_fkey" FOREIGN KEY ("direccionEnvioId") REFERENCES "direcciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_direccionFacturacionId_fkey" FOREIGN KEY ("direccionFacturacionId") REFERENCES "direcciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subpedidos" ADD CONSTRAINT "subpedidos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subpedidos" ADD CONSTRAINT "subpedidos_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tiendas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_items" ADD CONSTRAINT "pedidos_items_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_items" ADD CONSTRAINT "pedidos_items_subPedidoId_fkey" FOREIGN KEY ("subPedidoId") REFERENCES "subpedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_pedidos" ADD CONSTRAINT "historial_estados_pedidos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_pedidos" ADD CONSTRAINT "historial_estados_pedidos_subPedidoId_fkey" FOREIGN KEY ("subPedidoId") REFERENCES "subpedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estados_pedidos" ADD CONSTRAINT "historial_estados_pedidos_cambiadoPorUsuarioId_fkey" FOREIGN KEY ("cambiadoPorUsuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_metodoPagoId_fkey" FOREIGN KEY ("metodoPagoId") REFERENCES "metodos_pago"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuentas_bancarias_vendedores" ADD CONSTRAINT "cuentas_bancarias_vendedores_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balances_vendedores" ADD CONSTRAINT "balances_vendedores_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_vendedores" ADD CONSTRAINT "liquidaciones_vendedores_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones_vendedores" ADD CONSTRAINT "liquidaciones_vendedores_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuentas_bancarias_vendedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_liquidaciones_subpedidos" ADD CONSTRAINT "detalles_liquidaciones_subpedidos_liquidacionId_fkey" FOREIGN KEY ("liquidacionId") REFERENCES "liquidaciones_vendedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detalles_liquidaciones_subpedidos" ADD CONSTRAINT "detalles_liquidaciones_subpedidos_subPedidoId_fkey" FOREIGN KEY ("subPedidoId") REFERENCES "subpedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_subPedidoId_fkey" FOREIGN KEY ("subPedidoId") REFERENCES "subpedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "envios" ADD CONSTRAINT "envios_direccionEnvioId_fkey" FOREIGN KEY ("direccionEnvioId") REFERENCES "direcciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_tracking" ADD CONSTRAINT "eventos_tracking_envioId_fkey" FOREIGN KEY ("envioId") REFERENCES "envios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_subPedidoId_fkey" FOREIGN KEY ("subPedidoId") REFERENCES "subpedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones_items" ADD CONSTRAINT "devoluciones_items_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devoluciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones_items" ADD CONSTRAINT "devoluciones_items_pedidoItemId_fkey" FOREIGN KEY ("pedidoItemId") REFERENCES "pedidos_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "pagos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reembolsos" ADD CONSTRAINT "reembolsos_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "devoluciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tiendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupones_usos" ADD CONSTRAINT "cupones_usos_cuponId_fkey" FOREIGN KEY ("cuponId") REFERENCES "cupones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cupones_usos" ADD CONSTRAINT "cupones_usos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promociones_productos" ADD CONSTRAINT "promociones_productos_promocionId_fkey" FOREIGN KEY ("promocionId") REFERENCES "promociones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas_productos" ADD CONSTRAINT "resenas_productos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas_productos" ADD CONSTRAINT "resenas_productos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas_productos" ADD CONSTRAINT "resenas_productos_pedidoItemId_fkey" FOREIGN KEY ("pedidoItemId") REFERENCES "pedidos_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas_tiendas" ADD CONSTRAINT "resenas_tiendas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resenas_tiendas" ADD CONSTRAINT "resenas_tiendas_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tiendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_deseos" ADD CONSTRAINT "listas_deseos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listas_deseos_items" ADD CONSTRAINT "listas_deseos_items_listaDeseosId_fkey" FOREIGN KEY ("listaDeseosId") REFERENCES "listas_deseos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas_productos" ADD CONSTRAINT "preguntas_productos_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preguntas_productos" ADD CONSTRAINT "preguntas_productos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_preguntas" ADD CONSTRAINT "respuestas_preguntas_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas_productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_preguntas" ADD CONSTRAINT "respuestas_preguntas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_tiendaId_fkey" FOREIGN KEY ("tiendaId") REFERENCES "tiendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_remitenteUsuarioId_fkey" FOREIGN KEY ("remitenteUsuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditorias" ADD CONSTRAINT "auditorias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
