export interface ICategoria {
  id: string;
  categoriaPadreId?: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagenUrl?: string;
  icono?: string;
  nivel: number;
  orden: number;
  estado: boolean;
  subcategorias?: ICategoria[];
}
