// Puntuación de ajuste (0–100) de una edición de festival.
// Los pesos y afinidades vienen de puntuacion_config (tabla en Supabase);
// default-config.ts solo contiene los valores iniciales que se cargan allí.

export const FACTORES = ['experiencia', 'genero', 'publico', 'acampada', 'duracion', 'tipo', 'aforo'] as const;
export type Factor = (typeof FACTORES)[number];

export interface Tramo {
  hasta: number | null; // límite superior inclusive; null = sin límite
  valor: number;
}

export interface PuntuacionConfig {
  pesos: Record<Factor, number>;
  afinidad_experiencia: Record<string, number>;
  afinidad_genero: Record<string, number>;
  afinidad_publico: Record<string, number>;
  afinidad_tipo: Record<string, number>;
  valores_acampada: { si: number; no: number };
  tramos_duracion: Tramo[];
  tramos_aforo: Tramo[];
}

export interface EntradaPuntuacion {
  experiencia: string | null; // la más reciente del festival
  generos: string[];
  perfil_publico: string[];
  acampada: boolean | null;
  duracion_dias: number | null;
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
  puntuacion: number | null;
  incompleta: boolean;
  detalle: Record<Factor, DetalleFactor>;
}

/** Factores que dicen algo del público; sin ninguno de ellos no se puntúa. */
const FACTORES_SUFICIENTES: Factor[] = ['experiencia', 'genero', 'publico', 'aforo'];

type Crudo = { valor: number | null; desconocidos?: string[] };

function mediaAfinidad(claves: string[], tabla: Record<string, number>): Crudo {
  const conocidas = claves.filter((c) => c in tabla);
  const desconocidos = claves.filter((c) => !(c in tabla));
  const valor = conocidas.length ? conocidas.reduce((s, c) => s + tabla[c]!, 0) / conocidas.length : null;
  return desconocidos.length ? { valor, desconocidos } : { valor };
}

function afinidadUnica(clave: string | null, tabla: Record<string, number>): Crudo {
  if (clave == null) return { valor: null };
  return clave in tabla ? { valor: tabla[clave]! } : { valor: null, desconocidos: [clave] };
}

/** Aforo representativo: punto medio si hay rango; si no, el extremo conocido. */
export function aforoRepresentativo(min: number | null, max: number | null): number | null {
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max ?? null;
}

export function valorTramo(x: number, tramos: Tramo[]): number {
  for (const t of tramos) if (t.hasta == null || x <= t.hasta) return t.valor;
  throw new Error('Los tramos deben terminar con uno sin límite (hasta: null)');
}

export function calcularPuntuacion(e: EntradaPuntuacion, cfg: PuntuacionConfig): ResultadoPuntuacion {
  const aforo = aforoRepresentativo(e.aforo_min, e.aforo_max);
  const crudo: Record<Factor, Crudo> = {
    experiencia: afinidadUnica(e.experiencia, cfg.afinidad_experiencia),
    genero: mediaAfinidad(e.generos, cfg.afinidad_genero),
    publico: mediaAfinidad(e.perfil_publico, cfg.afinidad_publico),
    acampada: { valor: e.acampada == null ? null : e.acampada ? cfg.valores_acampada.si : cfg.valores_acampada.no },
    duracion: { valor: e.duracion_dias == null ? null : valorTramo(e.duracion_dias, cfg.tramos_duracion) },
    tipo: afinidadUnica(e.tipo, cfg.afinidad_tipo),
    aforo: { valor: aforo == null ? null : valorTramo(aforo, cfg.tramos_aforo) },
  };

  const pesoDisponible = FACTORES.reduce((s, f) => s + (crudo[f].valor != null ? cfg.pesos[f] : 0), 0);
  const detalle = {} as Record<Factor, DetalleFactor>;
  let total = 0;
  for (const f of FACTORES) {
    const { valor, desconocidos } = crudo[f];
    const peso = valor != null && pesoDisponible > 0 ? cfg.pesos[f] / pesoDisponible : 0;
    detalle[f] = { valor, peso: Math.round(peso * 1000) / 1000, ...(desconocidos ? { desconocidos } : {}) };
    if (valor != null) total += valor * peso;
  }

  const suficiente = FACTORES_SUFICIENTES.some((f) => crudo[f].valor != null);
  return {
    puntuacion: suficiente ? Math.round(total) : null,
    incompleta: FACTORES.some((f) => crudo[f].valor == null),
    detalle,
  };
}

function validarTramos(nombre: string, t: Tramo[], errores: string[]) {
  if (t.length === 0 || t[t.length - 1]!.hasta !== null) errores.push(`${nombre}: el último tramo debe tener hasta: null`);
  for (let i = 1; i < t.length; i++) {
    const a = t[i - 1]!.hasta, b = t[i]!.hasta;
    if (a == null || (b != null && b <= a)) errores.push(`${nombre}: los tramos deben ser crecientes`);
  }
  for (const x of t) if (x.valor < 0 || x.valor > 100) errores.push(`${nombre}: valor fuera de 0–100`);
}

export function validarConfig(cfg: PuntuacionConfig): string[] {
  const errores: string[] = [];
  const suma = FACTORES.reduce((s, f) => s + (cfg.pesos[f] ?? 0), 0);
  if (suma <= 0) errores.push('La suma de pesos debe ser mayor que 0');
  for (const f of FACTORES) if ((cfg.pesos[f] ?? 0) < 0) errores.push(`Peso negativo: ${f}`);
  const tablas = {
    afinidad_experiencia: cfg.afinidad_experiencia, afinidad_genero: cfg.afinidad_genero,
    afinidad_publico: cfg.afinidad_publico, afinidad_tipo: cfg.afinidad_tipo, valores_acampada: cfg.valores_acampada,
  };
  for (const [nombre, tabla] of Object.entries(tablas)) {
    for (const [k, v] of Object.entries(tabla)) if (v < 0 || v > 100) errores.push(`${nombre}.${k} fuera de 0–100: ${v}`);
  }
  validarTramos('tramos_aforo', cfg.tramos_aforo, errores);
  validarTramos('tramos_duracion', cfg.tramos_duracion, errores);
  return errores;
}
