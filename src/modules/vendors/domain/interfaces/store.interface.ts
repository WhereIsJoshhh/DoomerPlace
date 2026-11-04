export interface ITienda {
  id: string;
  vendedorId: string;
  nombre: string;
  slug: string;
  lema?: string;
  descripcion?: string;
  logoUrl?: string;
  bannerUrl?: string;
  telefono?: string;
  email?: string;
  direccionFisica?: string;
  horarioAtencion?: string;
  politicasDevolucion?: string;
  estado: boolean;
  fechaCreacion: Date;
}
