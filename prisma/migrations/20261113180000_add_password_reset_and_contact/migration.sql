-- Recuperación de contraseña: token con hash y expiración en usuarios
ALTER TABLE "usuarios" ADD COLUMN "tokenRestablecimientoHash" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "tokenRestablecimientoExpira" TIMESTAMP(3);

-- Contacto y soporte público
CREATE TYPE "EstadoMensajeContacto" AS ENUM ('NUEVO', 'LEIDO', 'RESPONDIDO');

CREATE TABLE "mensajes_contacto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "asunto" TEXT,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoMensajeContacto" NOT NULL DEFAULT 'NUEVO',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mensajes_contacto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mensajes_contacto_estado_idx" ON "mensajes_contacto"("estado");
CREATE INDEX "mensajes_contacto_fechaCreacion_idx" ON "mensajes_contacto"("fechaCreacion");
