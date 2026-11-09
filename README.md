# 🛒 DoomerPlace — Backend de Marketplace Multi-Vendedor

[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?style=flat&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.x-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-103%20Passing-success?style=flat)](#-pruebas-unitarias-y-e2e)

Sistema backend robusto, modular y de nivel empresarial para un **Marketplace Multi-Tienda (Multi-Vendor)** diseñado bajo los principios de **Clean Architecture**, **Domain-Driven Design (DDD)** y separación estricta de responsabilidades.

---

## 📐 Principios Arquitectónicos y de Negocio

1. **Snapshots Contables Inmutables**:
   Los ítems de los pedidos (`PedidoItem`) persisten copias exactas e inmutables del nombre del producto, SKU, precio unitario, costo e impuestos vigentes al momento de la compra. Cambios posteriores en el catálogo nunca alteran las transacciones históricas.
2. **Garantía Transaccional y Concurrencia**:
   Control de stock reservado mediante bloqueos distribuidos (patrón Redlock) y bloqueos transaccionales pesimistas en base de datos con un **TTL estricto de 15 minutos** para evitar sobreventas concurrentes en checkout.
3. **Idempotencia Estricta**:
   Endpoints críticos de creación de órdenes y procesamiento de webhooks de pasarelas de pago validan `Idempotency-Key` o `transaccionExternaId` único para garantizar que ninguna operación se cobre o abone por duplicado.
4. **Split Orders (Pedidos Divididos por Tienda)**:
   Al ejecutar el checkout, la orden de compra madre (`Pedido`) se divide automáticamente en subpedidos (`SubPedido`) por cada tienda participante, deduciendo comisiones de plataforma en tiempo real y gestionando despachos independientes.
5. **Finanzas y Custodia de Fondos (Escrow)**:
   Los ingresos de cada tienda se acreditan inicialmente en `saldoPendiente` dentro del `BalanceVendedor`. Tras la confirmación de entrega por el operador logístico, los fondos se transfieren automáticamente a `saldoDisponible` para solicitar desembolsos bancarios (Payouts).

---

## 🏛️ Cobertura de los 14 Dominios de Negocio

```mermaid
flowchart TD
    subgraph Core ["Infraestructura & Seguridad"]
        D1["D1: Identidad & RBAC (N:M)"]
        D14["D14: Auditoría & Config Global"]
        Health["Salud & Observabilidad (/health)"]
    end

    subgraph Sellers ["Vendedores & Tiendas"]
        D2["D2: Vendedores, Tiendas & KYC"]
        D8["D8: Finanzas, Balances & Payouts"]
    end

    subgraph Catalog ["Catálogo & Stock"]
        D3["D3: Catálogo, Categorías & Variantes"]
        D4["D4: Inventario, Kardex & Lock TTL 15m"]
    end

    subgraph Checkout ["Flujo de Compra & Pagos"]
        D5["D5: Carrito (Anónimo & Usuario)"]
        D6["D6: Pedidos Madre & Split Orders"]
        D7["D7: Pagos & Webhooks Idempotentes"]
        D11["D11: Cupones & Trazabilidad (CuponUso)"]
    end

    subgraph PostSale ["Logística & Post-Venta"]
        D9["D9: Logística & Tracking de Envíos"]
        D10["D10: Devoluciones & RMA (Reingreso Kardex)"]
        D12["D12: Reseñas Verificadas (PedidoItem)"]
        D13["D13: Mensajería & Preguntas"]
    end

    D1 --> D2
    D2 --> D3
    D3 --> D4
    D4 --> D5
    D5 --> D6
    D11 -.-> D6
    D6 --> D7
    D7 --> D8
    D7 --> D9
    D9 --> D10
    D9 --> D12
```

| Dominio | Módulo | Responsabilidad |
| :--- | :--- | :--- |
| **1. Identidad y RBAC** | `IdentityModule` | JWT Access/Refresh (15m/7d), 28 permisos atómicos, roles N:M y filtro RFC 7807. |
| **2. Vendedores y KYC** | `VendorsModule` | Onboarding de comerciantes, verificación de documentos legales y activación de tiendas. |
| **3. Catálogo y Variantes** | `CatalogModule` | Árbol jerárquico N-niveles de categorías, marcas, atributos dinámicos N:M y variantes. |
| **4. Inventario y Kardex** | `InventoryModule` | Stock físico, reservado y disponible; movimientos inmutables de Kardex y alertas. |
| **5. Carrito de Compras** | `CartModule` | Carritos anónimos con token de sesión en cabecera/cookies y merge automático al autenticarse. |
| **6. Split Orders** | `OrdersModule` | División atómica por tienda (`SubPedido`), snapshots contables inmutables y comisiones. |
| **7. Pagos y Pasarelas** | `PaymentsModule` | PaymentIntents, pasarelas externas y procesamiento de webhooks con idempotencia estricta. |
| **8. Finanzas y Payouts** | `FinanceModule` | Balances contables de vendedores, cuentas bancarias y dispersión de liquidaciones. |
| **9. Logística y Envíos** | `LogisticsModule` | Guías de despacho, rastreo de hitos en tiempo real y liberación de saldos por entrega. |
| **10. Devoluciones (RMA)** | `ReturnsModule` | Gestión de disputas, inspección física de calidad, reingreso a Kardex y reembolsos. |
| **11. Promociones y Cupones** | `PromotionsModule` | Cupones con límites globales y trazabilidad de uso único por usuario (`CuponUso`). |
| **12. Reseñas Verificadas** | `ReviewsModule` | Reseñas exclusivas respaldadas por compras reales (`PedidoItem`) y reputación de tiendas. |
| **13. Mensajería** | `MessagingModule` | Preguntas públicas en productos y canales directos de mensajería comprador-tienda. |
| **14. Auditoría y Parámetros** | `AuditModule` | Trazabilidad inmutable de eventos críticos del sistema y configuración global. |

---

## 🛠️ Stack Tecnológico

- **Runtime:** Node.js v20+ / v24+
- **Framework:** NestJS 10 con TypeScript estricto
- **ORM:** Prisma ORM 5.x
- **Base de Datos:** PostgreSQL 16
- **Caché y Locks:** Redis 7 / CacheService en memoria con interfaz Redlock distribuida
- **Motor de Búsqueda:** Meilisearch v1.9 / Typesense
- **Contenedores:** Docker & Docker Compose multi-etapa
- **Documentación API:** Swagger / OpenAPI 3.0 en `/api/v1/docs`

### Integración de catálogo Amazon

El backend usa Amazon Creators API (sucesora de PA-API 5.0). Completa en `.env` las credenciales `AMAZON_CREATORS_CLIENT_ID`, `AMAZON_CREATORS_CLIENT_SECRET`, `AMAZON_PARTNER_TAG`, además de `AMAZON_INTEGRATION_STORE_ID` y `AMAZON_DEFAULT_CATEGORY_ID` con IDs existentes. Para otra región, configura el marketplace y endpoint OAuth2 que correspondan. Ejecuta `npm run prisma:migrate` y `npm run prisma:generate` después de actualizar el código.

Rutas protegidas para administradores:

- `POST /api/v1/integrations/amazon/import-asin` con `{ "asin": "B09B2SBHQK" }` o `{ "asins": ["B09B2SBHQK"] }` (hasta 10).
- `POST /api/v1/integrations/amazon/search` con `{ "keywords": "auriculares" }`.
- `POST /api/v1/integrations/amazon/sync-price-stock` sincroniza manualmente. `AMAZON_SYNC_INTERVAL_HOURS=6` habilita la misma tarea programada.

La disponibilidad y el precio se guardan como datos externos; el inventario propio inicia en cero para evitar ofrecer como stock local una unidad que despacha Amazon. La compra externa requiere que la interfaz abra el enlace afiliado en vez de añadir el producto al checkout local.

### Adapters de catálogo externo (Amazon y Mercari)

El API unificado está en `/api/v1/integrations` y requiere JWT con rol `ADMIN` o `SUPER_ADMIN`:

- `POST /import`: `{ "provider": "AMAZON" | "MERCARI", "externalId": "ASIN/ID/URL", "tiendaDestinoId": "opcional" }`.
- `POST /batch-import`: `{ "provider": "AMAZON" | "MERCARI", "items": ["ID o URL", "..."], "tiendaDestinoId": "opcional" }` (máximo 50; reporta errores por elemento).
- `POST /sync`: `{ "provider": "AMAZON", "externalIds": ["..."] }`; ambos campos opcionales para sincronizar todos los productos importados.
- `GET /providers/status`: devuelve configuración, estado de conexión sin hacer llamadas de prueba y límite aplicado localmente.

Amazon usa Creators API mediante el `AmazonCreatorsClient` ya configurado. Mercari usa un proxy autorizado cuya interfaz debe exponer `GET /items/{id}` y `POST /items/sync` (JSON `{ "externalIds": [...] }` con respuesta `{ "items": [...] }`). Configura `MERCARI_CATALOG_PROXY_URL`, y opcionalmente su token y rutas. Cada producto externo conserva URL original, precio/disponibilidad externa, condición y vendedor, además de mapear atributos. El inventario local queda en cero porque estas plataformas externas despachan sus propias ventas.

Tras actualizar el proyecto, ejecuta `npm run prisma:migrate` y `npm run prisma:generate`. Para sincronización automática en un único proceso, establece `EXTERNAL_CATALOG_SYNC_INTERVAL_HOURS` a un valor mayor que cero.
- **Testing:** Jest con mocks modulares (103 pruebas pasando)

---

## 🚀 Puesta en Marcha Rápida

### Opción A: Despliegue Completo con Docker Compose

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd DoomerPlace

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Levantar PostgreSQL, Redis, Meilisearch y la API
docker compose up -d --build

# 4. Ejecutar migraciones y sembrado de datos en el contenedor
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

---

### Opción B: Ejecución Local en Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar el archivo .env con la URL de PostgreSQL
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/marketplace_db?schema=public"

# 3. Generar el cliente de Prisma y ejecutar migraciones
npm run prisma:generate
npm run prisma:migrate

# 4. Sembrar datos maestros y de prueba
npm run prisma:seed

# 5. Iniciar en modo desarrollo
npm run start:dev
```

El servidor estará escuchando en:
- **API Base:** `http://localhost:3000/api/v1`
- **Swagger UI:** `http://localhost:3000/api/v1/docs`
- **Health Check:** `http://localhost:3000/api/v1/health`

---

## 🧪 Pruebas Unitarias y E2E

El proyecto cuenta con **103 pruebas automatizadas** que cubren el 100% de los servicios, controladores, guards e integraciones de flujo completo:

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Ejecutar las pruebas unitarias con reporte de cobertura
npm run test:cov

# Ejecutar el flujo de integración de punta a punta (E2E)
npm run test:e2e
```

### Flujo validado en la prueba E2E (`test/marketplace-workflow.e2e-spec.ts`):
1. Validación y aplicación de cupón de bienvenida (`BIENVENIDO10`).
2. Creación de Pedido Madre y división en Split Orders por tienda con reserva de stock (TTL 15m) y snapshots inmutables.
3. Generación de PaymentIntent y recepción de webhook de pago aprobado con idempotencia.
4. Despacho logístico con generación de guía y evento de entrega que libera los fondos al balance disponible del vendedor.
5. Emisión de reseña verificada por el comprador ligada a su `PedidoItem`.
6. Solicitud de liquidación (Payout) por la tienda y aprobación/dispersión por el Administrador.

---

## 🔑 Credenciales Iniciales del Sembrado (Seed)

| Rol | Correo Electrónico | Contraseña |
| :--- | :--- | :--- |
| **Super Administrador** | `admin@marketplace.com` | `Admin@2026!` |

---

## 📄 Licencia

Este proyecto está licenciado bajo la licencia MIT.
