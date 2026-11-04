export interface IValorAtributo {
  id: string;
  atributoId: string;
  valor: string;
  codigoHex?: string;
  orden: number;
}

export interface IAtributo {
  id: string;
  categoriaId?: string;
  nombre: string;
  tipoDato: string;
  esObligatorio: boolean;
  esFiltrable: boolean;
  esVariante: boolean;
  valores?: IValorAtributo[];
}
