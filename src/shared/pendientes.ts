// Campos "pendientes de revisar" de un festival, calculados a partir de sus datos actuales.
// La interfaz los recalcula al guardar, así desaparecen a medida que se completan.

export interface DatosPendientes {
  pais: string | null;
  ciudad: string | null;
  generos: string[];
  perfil_publico: string[];
  acampada: boolean | null;
  web_url: string | null;
  formulario_contacto_url: string | null;
  tieneEmail: boolean;
  /** Edición objetivo (la del año en curso de trabajo) */
  aforo_min: number | null;
  aforo_max: number | null;
  fecha_inicio: string | null;
}

export function calcularPendientes(d: DatosPendientes): string[] {
  const p: string[] = [];
  if (!d.ciudad) p.push('ciudad');
  if (d.acampada == null) p.push('acampada');
  if (d.perfil_publico.length === 0) p.push('perfil_publico');
  if (!d.pais) p.push('pais');
  if (d.generos.length === 0) p.push('generos');
  if (d.aforo_min == null && d.aforo_max == null) p.push('aforo');
  if (!d.fecha_inicio) p.push('fechas');
  if (!d.web_url) p.push('web');
  if (!d.tieneEmail && !d.formulario_contacto_url) p.push('contacto');
  return p;
}
