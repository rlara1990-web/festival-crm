// Correcciones manuales por festival, con su motivo. La clave es el nombre tal
// como aparece en el CSV, en minúsculas y sin espacios sobrantes.
import type { Estado } from './normalize.ts';

export interface DatosEdicion {
  estado?: Estado;
  proxima_accion?: string;
  proxima_accion_fecha?: string;
  conv_apertura?: string;
  conv_metodo?: 'email' | 'formulario' | 'web' | 'redes';
  conv_url?: string;
  conv_notas?: string;
  conv_fuente_url?: string;
  conv_revisado_en?: string;
  prioridad_antiguos?: boolean;
  acepta_food_trucks?: boolean;
  participamos?: boolean;
  ventas_eur?: number;
  resultado_eur?: number;
  notas_resultados?: string;
}

export interface Override {
  nombre?: string;
  generos?: string[];
  tipo?: 'musica' | 'comida_vegana' | 'gastronomia' | 'otro';
  notas_publico?: string;
  /** Datos de la edición 2026 (historial) */
  e2026?: DatosEdicion;
  /** Datos iniciales de la edición 2027 */
  e2027?: DatosEdicion;
  /** Estado al que lleva la respuesta recibida (por defecto "respondio") */
  estadoRespuesta?: Estado;
}

export const OVERRIDES: Record<string, Override> = {
  'nos alive': {
    nombre: 'NOS Alive',
    e2026: { prioridad_antiguos: true, conv_notas: 'Dan prioridad a vendedores antiguos; abren plazas a nuevos si hay espacio.' },
    e2027: {
      prioridad_antiguos: true,
      conv_notas: 'Heredado de 2026: prioridad a vendedores antiguos; abren a nuevos si hay espacio. Verificar.',
      conv_metodo: 'email',
    },
  },
  'nos primavera sound': { nombre: 'NOS Primavera Sound' },
  'him dub festival': {
    estadoRespuesta: 'rechazado',
    e2026: { acepta_food_trucks: false, conv_notas: 'Respondieron que no tienen vendedores con food truck.' },
    e2027: {
      acepta_food_trucks: false,
      conv_notas: 'Heredado de 2026: no tienen food trucks. Verificar antes de contactar.',
    },
  },
  'aquasella festival': {
    e2026: { conv_notas: 'Respondieron: la aplicación para vendedores de comida abre en abril.' },
    e2027: {
      conv_notas: 'Según respuesta de 2026, la aplicación para vendedores abre en abril (fecha exacta sin confirmar).',
      proxima_accion: 'Revisar apertura de la aplicación de vendedores',
      proxima_accion_fecha: '2027-04-01',
    },
  },
  'vila de mouros': {
    nombre: 'Vilar de Mouros',
    generos: ['rock', 'punk', 'pop'],
    notas_publico: 'Participamos en 2026: el público (rock, pop punk) no fue adecuado para Moche Verde.',
    e2026: {
      estado: 'aceptado',
      participamos: true,
      ventas_eur: 4900,
      resultado_eur: -3100,
      notas_resultados: 'Cifras aproximadas. Pérdida de unos 3.100 € sobre 4.900 € de ventas. Público no adecuado.',
    },
  },
  'festival vapor': {
    tipo: 'otro',
    e2027: {
      conv_metodo: 'formulario',
      conv_url: 'https://festivalvapor.entroncamento.pt/',
      conv_notas: 'Según la lista de 2026: formulario de vendedores en la web, se postula en julio.',
      proxima_accion: 'Postular por el formulario de vendedores',
      proxima_accion_fecha: '2027-07-01',
    },
  },
  'zna gathering': {
    e2027: { conv_metodo: 'formulario', proxima_accion: 'Revisar si abrió la aplicación de restaurantes' },
  },
  'fmm sines': {
    nombre: 'FMM Sines',
    e2027: { conv_metodo: 'formulario', proxima_accion: 'Revisar si abrió el formulario de vendedores' },
  },
  'insmonia festival': { nombre: 'Insomnia Festival' },
  'les arddentes': { nombre: 'Les Ardentes' },
  leseurockeennes: { nombre: 'Les Eurockéennes' },
  'mil festival': { nombre: 'MIL Festival' },
  'goat festival': { nombre: 'GOAT Festival' },
  'dhb portugal': { nombre: 'DHB Portugal' },
  'operafest': { nombre: 'OperaFest' },
  'rfm somnii': { nombre: 'RFM Somnii' },
  'rock in rio': { nombre: 'Rock in Rio' },
};

/** Festivales que no están en el CSV y se añaden a mano. */
export const FESTIVALES_EXTRA = [
  {
    nombre: 'Boom Festival',
    pais: 'PT',
    notas: 'Añadido a mano (no estaba en la lista de 2026).',
    e2027: {
      estado: 'convocatoria_enviada' as Estado,
      conv_metodo: 'formulario' as const,
      conv_url: 'https://www.boomfestival.org/participate/food-vendors-chaishops',
      conv_fuente_url: 'https://www.boomfestival.org/participate/food-vendors-chaishops',
      conv_revisado_en: '2026-11-05',
      conv_notas: 'La organización comunica la decisión en febrero.',
      proxima_accion: 'Esperar decisión de la organización (febrero)',
      proxima_accion_fecha: '2027-02-01',
    },
    interaccion: {
      tipo: 'formulario_web' as const,
      fecha: '2026-11-05',
      asunto: 'Solicitud de vendedor de comida (food vendors / chaishops)',
      estado: 'convocatoria_enviada' as Estado,
    },
  },
];
