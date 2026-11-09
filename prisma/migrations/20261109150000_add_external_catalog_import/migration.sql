CREATE TABLE "external_product_imports" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "sellerName" TEXT,
    "condition" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "externalPrice" DECIMAL(12,2),
    "currency" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_product_imports_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "external_product_imports_provider_externalId_key" ON "external_product_imports"("provider", "externalId");
CREATE INDEX "external_product_imports_productoId_idx" ON "external_product_imports"("productoId");
CREATE INDEX "external_product_imports_lastSyncedAt_idx" ON "external_product_imports"("lastSyncedAt");
ALTER TABLE "external_product_imports" ADD CONSTRAINT "external_product_imports_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve Amazon products imported by the previous provider-specific module.
INSERT INTO "external_product_imports" ("id", "provider", "externalId", "productoId", "originalUrl", "available", "externalPrice", "currency", "lastSyncedAt", "createdAt", "updatedAt")
SELECT 'legacy-amazon-' || "asin", 'AMAZON', "asin", "productoId", "affiliateUrl", "available", "externalPrice", "currency", "lastSyncedAt", "createdAt", "updatedAt"
FROM "amazon_product_imports"
ON CONFLICT ("provider", "externalId") DO NOTHING;
