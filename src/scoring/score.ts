// Puntuación de ajuste (0–100) de una edición de festival.
// Los pesos y afinidades vienen de puntuacion_config (tabla en Supabase);
// default-config.ts solo contiene los valores iniciales que se cargan allí.

export type Factor = 'genero' | 'publico' | 'aforo' | 'tipo';

export interface TramoAforo {
  hasta: number | null; // límite superior inclusive; null = sin límite
  valor: number;
}

export interface PuntuacionConfig {
  pesos: Record<Factor, number>;
  afinidad_genero: Record<string, number>;
  afinidad_publico: Record<string, number>;
  afinidad_tipo: Record<string, number>;
  tramos_aforo: TramoAforo[];
}

export interface EntradaPuntuacion {
  generos: string[];
  perfil_publico: string[];
  tipo: string | null;
  aforo_min: number | null;
  aforo_max: number | null;
}

export interface DetalleFactor {
  valor: number | null; // afinidad 0–100, null si falta el dato
  peso: number; // peso efectivo tras redistribuir (0 si falta)
  desconocidos?: string[]; // claves sin afinidad configurada
}

export interface ResultadoPuntuacion {
  puntuacion: number | null; // null si no hay ningún factor con datos
  incompleta: boolean;
  detalle: Record<Factor, DetalleFactor>;
}

const FACTORES: Factor[] = ['genero', 'publico', 'aforo', 'tipo'];

function mediaAfinidad(claves: string[], tabla: Record<string, number>) {
  const conocidas = claves.filter((c) => c in tabla);
  const desconocidos = claves.filter((c) => !(c in tabla));
  if (conocidas.length === 0) return { valor: null, desconocidos };
  const suma = conocidas.reduce((s, c) => s + tabla[c]!, 0);
  return { valor: suma / conocidas.length, desconocidos };
}

/** Aforo representativo: punto medio si hay rango; si no, el extremo conocido. */
export function aforoRepresentativo(min: number | null, max: number | null): number | null {
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max ?? null;
}

export function valorTramoAforo(aforo: number, tramos: TramoAforo[]): number {
  for (const t of tramos) {
    if (t.hasta == null || aforo <= t.hasta) return t.valor;
  }
  throw new Error('tramos_aforo debe terminar con un tramo sin límite (hasta: null)');
}

export function calcularPuntuacion(e: EntradaPuntuacion, cfg: PuntuacionConfig): ResultadoPuntuacion {
  const crudo: Record<Factor, { valor: number | null; desconocidos?: string[] }> = {
    genero: mediaAfinidad(e.generos, cfg.afinidad_genero),
    publico: mediaAfinidad(e.perfil_publico, cfg.afinidad_publico),
    tipo: e.tipo != null && e.tipo in cfg.afinidad_tipo
      ? { valor: cfg.afinidad_tipo[e.tipo]! }
      : { valor: null, ...(e.tipo != null ? { desconocidos: [e.tipo] } : {}) },
    aforo: (() => {
      const a = aforoRepresentativo(e.aforo_min, e.aforo_max);
      return { valor: a == null ? null : valorTramoAforo(a, cfg.tramos_aforo) };
    })(),
  };

  const pesoDisponible = FACTORES.reduce((s, f) => s + (crudo[f].valor != null ? cfg.pesos[f] : 0), 0);
  const detalle = {} as Record<Factor, DetalleFactor>;
  let total = 0;
  for (const f of FACTORES) {
    const { valor, desconocidos } = crudo[f];
    const peso = valor != null && pesoDisponible > 0 ? cfg.pesos[f] / pesoDisponible : 0;
    detalle[f] = { valor, peso: Math.round(peso * 1000) / 1000 };
    if (desconocidos && desconocidos.length) detalle[f].desconocidos = desconocidos;
    if (valor != null) total += valor * peso;
  }

  // El tipo solo no dice nada del público: sin género, público ni aforo no hay puntuación.
  const hayDatosDePublico = crudo.genero.valor != null || crudo.publico.valor != null || crudo.aforo.valor != null;
  return {
    puntuacion: hayDatosDePublico ? Math.round(total) : null,
    incompleta: FACTORES.some((f) => crudo[f].valor == null),
    detalle,
  };
}

export function validarConfig(cfg: PuntuacionConfig): string[] {
  const errores: string[] = [];
  const sumaPesos = FACTORES.reduce((s, f) => s + (cfg.pesos[f] ?? 0), 0);
  if (sumaPesos <= 0) errores.push('La suma de pesos debe ser mayor que 0');
  for (const f of FACTORES) if ((cfg.pesos[f] ?? 0) < 0) errores.push(`Peso negativo: ${f}`);
  const tablas = { afinidad_genero: cfg.afinidad_genero, afinidad_publico: cfg.afinidad_publico, afinidad_tipo: cfg.afinidad_tipo };
  for (const [nombre, tabla] of Object.entries(tablas)) {
    for (const [k, v] of Object.entries(tabla)) {
      if (v < 0 || v > 100) errores.push(`${nombre}.${k} fuera de 0–100: ${v}`);
    }
  }
  const t = cfg.tramos_aforo;
  if (t.length === 0 || t[t.length - 1]!.hasta !== null) errores.push('El último tramo de aforo debe tener hasta: null');
  for (let i = 1; i < t.length; i++) {
    const a = t[i - 1]!.hasta, b = t[i]!.hasta;
    if (a == null || (b != null && b <= a)) errores.push('Los tramos de aforo deben ser crecientes');
  }
  return errores;
}
