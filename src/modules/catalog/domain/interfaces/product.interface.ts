import { TipoProducto, EstadoProducto } from '@prisma/client';

export interface IVarianteAtributo {
  id: string;
  varianteId: string;
  atributoId: string;
  valorAtributoId: string;
}

export interface IProductoVariante {
  id: string;
  productoId: string;
  sku: string;
  nombreVariante: string;
  precio: number;
  precioComparacion?: number;
  costo?: number;
  peso?: number;
  codigoBarras?: string;
  estado: boolean;
  atributos?: IVarianteAtributo[];
}

export interface IProducto {
  id: string;
  tiendaId: string;
  categoriaId: string;
  marcaId?: string;
  nombre: string;
  slug: string;
  descripcionCorta?: string;
  descripcionLarga?: string;
  skuBase: string;
  tipoProducto: TipoProducto;
  peso: number;
  ancho: number;
  alto: number;
  largo: number;
  requiereEnvio: boolean;
  estado: EstadoProducto;
  esDestacado: boolean;
  fechaPublicacion?: Date;
  fechaActualizacion: Date;
  variantes?: IProductoVariante[];
}
