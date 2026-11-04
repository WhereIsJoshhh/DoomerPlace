import { PrismaClient, AccionPermiso, EstadoUsuario } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Sembrado de Datos (Seed) Marketplace ---');

  // 1. Roles del Sistema
  const rolesData = [
    {
      nombre: 'Super Administrador',
      slug: 'SUPER_ADMIN',
      descripcion: 'Acceso total y sin restricciones a todos los dominios de la plataforma.',
      esSistema: true,
    },
    {
      nombre: 'Administrador de Plataforma',
      slug: 'ADMIN',
      descripcion: 'Gestión operativa, aprobación de KYC de vendedores y resolución de disputas.',
      esSistema: true,
    },
    {
      nombre: 'Vendedor / Tienda',
      slug: 'VENDEDOR',
      descripcion: 'Gestión de catálogo propio, inventario, subpedidos y solicitudes de liquidación.',
      esSistema: true,
    },
    {
      nombre: 'Cliente Comprador',
      slug: 'CLIENTE',
      descripcion: 'Exploración de catálogo, carrito, órdenes de compra y reseñas.',
      esSistema: true,
    },
  ];

  const rolesMap = new Map<string, string>();

  for (const r of rolesData) {
    const rol = await prisma.rol.upsert({
      where: { slug: r.slug },
      update: {},
      create: r,
    });
    rolesMap.set(r.slug, rol.id);
  }
  console.log(`✓ Roles creados/verificados: ${rolesData.length}`);

  // 2. Permisos Atómicos por Dominio
  const permisosData: Array<{ modulo: string; accion: AccionPermiso; nombre: string; descripcion: string }> = [
    // Identidad y RBAC
    { modulo: 'USUARIOS', accion: AccionPermiso.LEER, nombre: 'Leer Usuarios', descripcion: 'Consultar listado y perfiles de usuarios' },
    { modulo: 'USUARIOS', accion: AccionPermiso.CREAR, nombre: 'Crear Usuario', descripcion: 'Crear nuevos usuarios administrativos' },
    { modulo: 'USUARIOS', accion: AccionPermiso.ACTUALIZAR, nombre: 'Actualizar Usuario', descripcion: 'Modificar estados y datos de usuarios' },
    { modulo: 'USUARIOS', accion: AccionPermiso.ELIMINAR, nombre: 'Eliminar Usuario', descripcion: 'Desactivar o suspender usuarios' },
    { modulo: 'ROLES', accion: AccionPermiso.LEER, nombre: 'Leer Roles', descripcion: 'Consultar roles y permisos' },
    { modulo: 'ROLES', accion: AccionPermiso.CREAR, nombre: 'Crear Roles', descripcion: 'Definir nuevos roles' },
    { modulo: 'ROLES', accion: AccionPermiso.ACTUALIZAR, nombre: 'Actualizar Roles', descripcion: 'Modificar asignación de permisos a roles' },

    // Vendedores y KYC
    { modulo: 'VENDEDORES', accion: AccionPermiso.LEER, nombre: 'Leer Vendedores', descripcion: 'Ver expedientes y estados de tiendas' },
    { modulo: 'VENDEDORES', accion: AccionPermiso.CREAR, nombre: 'Solicitar Onboarding', descripcion: 'Registro inicial como vendedor' },
    { modulo: 'VENDEDORES', accion: AccionPermiso.ACTUALIZAR, nombre: 'Actualizar Tienda', descripcion: 'Editar datos de tienda y documentos' },
    { modulo: 'VENDEDORES', accion: AccionPermiso.APROBAR, nombre: 'Aprobar KYC Vendedor', descripcion: 'Aprobar o rechazar solicitudes de vendedores' },

    // Catálogo y Variantes
    { modulo: 'CATALOGO', accion: AccionPermiso.LEER, nombre: 'Leer Catálogo', descripcion: 'Ver productos, variantes y categorías' },
    { modulo: 'CATALOGO', accion: AccionPermiso.CREAR, nombre: 'Crear Producto', descripcion: 'Crear nuevos productos o variantes' },
    { modulo: 'CATALOGO', accion: AccionPermiso.ACTUALIZAR, nombre: 'Actualizar Producto', descripcion: 'Editar fichas y precios' },
    { modulo: 'CATALOGO', accion: AccionPermiso.ELIMINAR, nombre: 'Eliminar Producto', descripcion: 'Despublicar o eliminar productos' },
    { modulo: 'CATALOGO', accion: AccionPermiso.APROBAR, nombre: 'Moderar Catálogo', descripcion: 'Aprobar publicación de productos' },

    // Inventario y Kardex
    { modulo: 'INVENTARIO', accion: AccionPermiso.LEER, nombre: 'Consultar Inventario', descripcion: 'Ver stock físico, reservado y disponible' },
    { modulo: 'INVENTARIO', accion: AccionPermiso.ACTUALIZAR, nombre: 'Ajustar Inventario', descripcion: 'Realizar movimientos manuales de Kardex' },

    // Pedidos y Split Orders
    { modulo: 'PEDIDOS', accion: AccionPermiso.LEER, nombre: 'Consultar Pedidos', descripcion: 'Ver pedidos y subpedidos' },
    { modulo: 'PEDIDOS', accion: AccionPermiso.CREAR, nombre: 'Crear Pedido', descripcion: 'Generar orden de compra (Checkout)' },
    { modulo: 'PEDIDOS', accion: AccionPermiso.ACTUALIZAR, nombre: 'Actualizar Pedido', descripcion: 'Cambiar estados y despachos' },
    { modulo: 'PEDIDOS', accion: AccionPermiso.APROBAR, nombre: 'Gestionar Disputas', descripcion: 'Resolución de pedidos en conflicto' },

    // Finanzas y Liquidaciones (Payouts)
    { modulo: 'LIQUIDACIONES', accion: AccionPermiso.LEER, nombre: 'Consultar Liquidaciones', descripcion: 'Ver balances y cortes contables' },
    { modulo: 'LIQUIDACIONES', accion: AccionPermiso.CREAR, nombre: 'Generar Liquidación', descripcion: 'Emitir corte de dispersión de fondos' },
    { modulo: 'LIQUIDACIONES', accion: AccionPermiso.APROBAR, nombre: 'Aprobar Payout', descripcion: 'Autorizar transferencia bancaria a vendedor' },

    // Auditoría y Configuración
    { modulo: 'AUDITORIA', accion: AccionPermiso.LEER, nombre: 'Consultar Logs', descripcion: 'Ver registros inmutables de auditoría' },
    { modulo: 'CONFIGURACION', accion: AccionPermiso.LEER, nombre: 'Ver Configuración', descripcion: 'Consultar parámetros globales' },
    { modulo: 'CONFIGURACION', accion: AccionPermiso.ACTUALIZAR, nombre: 'Editar Configuración', descripcion: 'Modificar tasas de comisión y parámetros' },
  ];

  const superAdminRolId = rolesMap.get('SUPER_ADMIN');
  const vendedorRolId = rolesMap.get('VENDEDOR');
  const clienteRolId = rolesMap.get('CLIENTE');

  for (const p of permisosData) {
    const permiso = await prisma.permiso.upsert({
      where: {
        modulo_accion: {
          modulo: p.modulo,
          accion: p.accion,
        },
      },
      update: {},
      create: p,
    });

    // Asignar todos a SUPER_ADMIN
    if (superAdminRolId) {
      await prisma.rolPermiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: superAdminRolId,
            permisoId: permiso.id,
          },
        },
        update: {},
        create: {
          rolId: superAdminRolId,
          permisoId: permiso.id,
        },
      });
    }

    // Asignar al VENDEDOR permisos pertinentes
    if (vendedorRolId && ['CATALOGO', 'INVENTARIO', 'VENDEDORES'].includes(p.modulo) && p.accion !== AccionPermiso.APROBAR) {
      await prisma.rolPermiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: vendedorRolId,
            permisoId: permiso.id,
          },
        },
        update: {},
        create: {
          rolId: vendedorRolId,
          permisoId: permiso.id,
        },
      });
    }

    // Asignar al CLIENTE permisos básicos
    if (clienteRolId && ((p.modulo === 'CATALOGO' && p.accion === AccionPermiso.LEER) || (p.modulo === 'PEDIDOS' && p.accion === AccionPermiso.CREAR))) {
      await prisma.rolPermiso.upsert({
        where: {
          rolId_permisoId: {
            rolId: clienteRolId,
            permisoId: permiso.id,
          },
        },
        update: {},
        create: {
          rolId: clienteRolId,
          permisoId: permiso.id,
        },
      });
    }
  }
  console.log(`✓ Permisos sembrados y asociados a roles: ${permisosData.length}`);

  // 3. Usuario Super Administrador Inicial
  const adminEmail = 'admin@marketplace.com';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@2026!', salt);

  const adminUser = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      nombre: 'Master',
      apellido: 'Admin',
      email: adminEmail,
      telefono: '+525500000000',
      passwordHash: passwordHash,
      emailVerificado: true,
      telefonoVerificado: true,
      estado: EstadoUsuario.ACTIVO,
    },
  });

  if (superAdminRolId) {
    await prisma.usuarioRol.upsert({
      where: {
        usuarioId_rolId: {
          usuarioId: adminUser.id,
          rolId: superAdminRolId,
        },
      },
      update: {},
      create: {
        usuarioId: adminUser.id,
        rolId: superAdminRolId,
      },
    });
  }

  console.log(`✓ Super Administrador listo: ${adminEmail} (Clave: Admin@2026!)`);

  // 4. Métodos de Pago
  const metodosPagoData = [
    { codigo: 'STRIPE', nombre: 'Tarjeta de Crédito / Débito (Stripe)', esPasarelaOnline: true, activo: true },
    { codigo: 'PAYPAL', nombre: 'PayPal Express Checkout', esPasarelaOnline: true, activo: true },
    { codigo: 'TRANSFERENCIA', nombre: 'Transferencia Bancaria / SPEI', esPasarelaOnline: false, activo: true },
  ];

  for (const mp of metodosPagoData) {
    await prisma.metodoPago.upsert({
      where: { codigo: mp.codigo },
      update: {},
      create: mp,
    });
  }
  console.log(`✓ Métodos de Pago sembrados: ${metodosPagoData.length}`);

  // 5. Parámetros de Configuración Global del Marketplace
  const configuracionesData = [
    { clave: 'PLATFORM_COMMISSION_DEFAULT', valor: '10.00', tipoDato: 'NUMBER', grupo: 'FINANZAS', descripcion: 'Porcentaje base de comisión cobrada a tiendas' },
    { clave: 'RESERVATION_TTL_MINUTES', valor: '15', tipoDato: 'NUMBER', grupo: 'INVENTARIO', descripcion: 'Tiempo límite de bloqueo de stock en checkout' },
    { clave: 'ESCROW_HOLD_DAYS', valor: '7', tipoDato: 'NUMBER', grupo: 'FINANZAS', descripcion: 'Días de retención de fondos antes de liberar a saldo disponible' },
    { clave: 'TAX_RATE_DEFAULT', valor: '16.00', tipoDato: 'NUMBER', grupo: 'IMPUESTOS', descripcion: 'Tasa impositiva por defecto (IVA)' },
  ];

  for (const cfg of configuracionesData) {
    await prisma.configuracion.upsert({
      where: { clave: cfg.clave },
      update: {},
      create: cfg,
    });
  }
  console.log(`✓ Configuraciones globales sembradas: ${configuracionesData.length}`);

  // 6. Cupones de Descuento Demo
  const cuponesData = [
    {
      codigo: 'BIENVENIDO10',
      descripcion: '10% de descuento en la primera compra',
      tipoDescuento: 'PORCENTAJE' as any,
      valorDescuento: 10.00,
      montoMinimoCompra: 20.00,
      limiteUsosTotal: 1000,
      limiteUsosPorUsuario: 1,
      fechaInicio: new Date('2026-01-01'),
      fechaFin: new Date('2028-12-31'),
    },
    {
      codigo: 'PROMO20',
      descripcion: '$20 USD de descuento directo en compras mayores a $100',
      tipoDescuento: 'MONTO_FIJO' as any,
      valorDescuento: 20.00,
      montoMinimoCompra: 100.00,
      limiteUsosTotal: 500,
      limiteUsosPorUsuario: 2,
      fechaInicio: new Date('2026-01-01'),
      fechaFin: new Date('2028-12-31'),
    },
  ];

  for (const cup of cuponesData) {
    await prisma.cupon.upsert({
      where: { codigo: cup.codigo },
      update: {},
      create: cup,
    });
  }
  console.log(`✓ Cupones demo sembrados: ${cuponesData.length}`);

  // 7. Categorías Jerárquicas Demo
  const catTecno = await prisma.categoria.upsert({
    where: { slug: 'tecnologia' },
    update: {},
    create: {
      nombre: 'Tecnología',
      slug: 'tecnologia',
      descripcion: 'Dispositivos, electrónica y gadgets',
      nivel: 1,
    },
  });

  await prisma.categoria.upsert({
    where: { slug: 'laptops-computadoras' },
    update: {},
    create: {
      categoriaPadreId: catTecno.id,
      nombre: 'Laptops y Computadoras',
      slug: 'laptops-computadoras',
      descripcion: 'Laptops gamer, ultrabooks y accesorios',
      nivel: 2,
    },
  });

  const catModa = await prisma.categoria.upsert({
    where: { slug: 'moda-calzado' },
    update: {},
    create: {
      nombre: 'Moda y Calzado',
      slug: 'moda-calzado',
      descripcion: 'Prendas de vestir, zapatos y accesorios',
      nivel: 1,
    },
  });

  console.log('✓ Categorías jerárquicas sembradas.');

  // 8. Marcas Demo
  const marcasData = [
    { nombre: 'TechBrand Corp', slug: 'techbrand', descripcion: 'Electrónica de alta gama' },
    { nombre: 'EcoWear Apparel', slug: 'ecowear', descripcion: 'Ropa sustentable' },
  ];

  for (const m of marcasData) {
    await prisma.marca.upsert({
      where: { slug: m.slug },
      update: {},
      create: m,
    });
  }
  console.log('✓ Marcas comerciales sembradas.');

  console.log('--- Sembrado de Datos Finalizado con Éxito ---');
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
