CREATE TABLE "amazon_product_imports" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "affiliateUrl" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "externalPrice" DECIMAL(12,2),
    "currency" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "amazon_product_imports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "amazon_product_imports_asin_key" ON "amazon_product_imports"("asin");
CREATE UNIQUE INDEX "amazon_product_imports_productoId_key" ON "amazon_product_imports"("productoId");
CREATE INDEX "amazon_product_imports_lastSyncedAt_idx" ON "amazon_product_imports"("lastSyncedAt");
ALTER TABLE "amazon_product_imports" ADD CONSTRAINT "amazon_product_imports_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
