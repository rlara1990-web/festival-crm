// Correcciones manuales por festival, con su motivo. La clave es el nombre tal
// como aparece en el CSV, en minúsculas y sin espacios sobrantes.
// Los textos que se ven en la interfaz van en inglés (para Zac).
import type { Estado } from './normalize.ts';

export type Experiencia = 'muy_positiva' | 'positiva' | 'neutra' | 'negativa' | 'muy_negativa';

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
  /** Solo la ponen Rodrigo o Zac; aquí se cargan las que dio Rodrigo el 24/11/2026. */
  experiencia?: Experiencia;
  comentario_experiencia?: string;
}

export interface Override {
  nombre?: string;
  generos?: string[];
  perfil_publico?: string[];
  tipo?: 'musica' | 'comida_vegana' | 'gastronomia' | 'otro';
  notas_publico?: string;
  /** Nombres (ya corregidos) de festivales parecidos */
  parecido_a?: string[];
  e2026?: DatosEdicion;
  e2027?: DatosEdicion;
  /** Estado al que lleva la respuesta recibida (por defecto "en_conversacion") */
  estadoRespuesta?: Estado;
  /** Comentarios (autor equipo) sobre un campo: [tabla, campo, texto] */
  comentarios?: { tabla: 'festivales' | 'ediciones_2026' | 'ediciones_2027'; campo: string | null; texto: string }[];
}

const PARTICIPAMOS = { estado: 'aceptado' as Estado };

export const OVERRIDES: Record<string, Override> = {
  'nos alive': {
    nombre: 'NOS Alive',
    e2026: { prioridad_antiguos: true, conv_notas: 'They give priority to returning vendors and open spots to new ones if there is space.' },
    e2027: {
      prioridad_antiguos: true,
      conv_notas: 'From 2026: priority to returning vendors; new vendors only if there is space. To verify.',
      conv_metodo: 'email',
    },
  },
  'nos primavera sound': {
    nombre: 'NOS Primavera Sound',
    e2026: { ...PARTICIPAMOS, experiencia: 'positiva' },
  },
  'waking life': {
    e2026: { ...PARTICIPAMOS, experiencia: 'muy_positiva', comentario_experiencia: 'Best festival of the 2026 season.' },
  },
  'paredes de coura': {
    e2026: { ...PARTICIPAMOS, experiencia: 'muy_positiva', comentario_experiencia: 'One of the best festivals of the 2026 season.' },
  },
  'rfm somnii': {
    nombre: 'RFM Somnii',
    e2026: {
      ...PARTICIPAMOS, experiencia: 'muy_negativa',
      comentario_experiencia: 'Poor sales. On the beach, operations were a hassle.',
    },
  },
  'vila de mouros': {
    nombre: 'Vilar de Mouros',
    generos: ['rock', 'punk', 'pop'],
    notas_publico: 'Audience (rock, pop punk) was not a good fit for Moche Verde.',
    e2026: {
      ...PARTICIPAMOS, experiencia: 'muy_negativa',
      comentario_experiencia: 'Audience was not a good fit (rock, pop punk).',
    },
  },
  basilar: {
    generos: ['electronica'],
    perfil_publico: ['turista_internacional'],
    parecido_a: ['Waking Life'],
    notas_publico: 'Small but very international; well-curated line-up, similar to Waking Life.',
    estadoRespuesta: 'rechazado',
    e2026: { estado: 'rechazado' },
    comentarios: [{
      tabla: 'ediciones_2026', campo: 'estado',
      texto: 'They decided not to go with us: they had few food vendors and found our menu too limited.',
    }],
  },
  'him dub festival': {
    estadoRespuesta: 'rechazado',
    e2026: { acepta_food_trucks: false, conv_notas: 'They replied that they do not have food truck vendors.' },
    e2027: { acepta_food_trucks: false, conv_notas: 'From 2026: no food trucks. Verify before contacting.' },
  },
  'aquasella festival': {
    e2026: { conv_notas: 'They replied: food vendor applications open in April.' },
    e2027: {
      conv_notas: 'Based on their 2026 reply, food vendor applications open in April (exact date not confirmed).',
      proxima_accion: 'Check whether food vendor applications are open',
      proxima_accion_fecha: '2027-04-01',
    },
  },
  'festival vapor': {
    tipo: 'otro',
    e2027: {
      conv_metodo: 'formulario',
      conv_url: 'https://festivalvapor.entroncamento.pt/',
      conv_notas: 'According to the 2026 list: food vendor form on the website, apply in July.',
      proxima_accion: 'Apply through the food vendor form',
      proxima_accion_fecha: '2027-07-01',
    },
  },
  'zna gathering': {
    e2027: { conv_metodo: 'formulario', proxima_accion: 'Check whether the restaurant application is open' },
  },
  'fmm sines': {
    nombre: 'FMM Sines',
    e2027: { conv_metodo: 'formulario', proxima_accion: 'Check whether the food vendor form is open' },
  },
  'insmonia festival': { nombre: 'Insomnia Festival' },
  'les arddentes': { nombre: 'Les Ardentes' },
  leseurockeennes: { nombre: 'Les Eurockéennes' },
  'mil festival': { nombre: 'MIL Festival' },
  'goat festival': { nombre: 'GOAT Festival' },
  'dhb portugal': { nombre: 'DHB Portugal' },
  operafest: { nombre: 'OperaFest' },
  'rock in rio': { nombre: 'Rock in Rio' },
};

/** Festivales que no están en el CSV y se añaden a mano. */
export const FESTIVALES_EXTRA = [
  {
    nombre: 'Boom Festival',
    pais: 'PT',
    notas: 'Added manually (not in the 2026 list).',
    e2027: {
      estado: 'convocatoria_enviada' as Estado,
      conv_metodo: 'formulario' as const,
      conv_url: 'https://www.boomfestival.org/participate/food-vendors-chaishops',
      conv_fuente_url: 'https://www.boomfestival.org/participate/food-vendors-chaishops',
      conv_revisado_en: '2026-11-05',
      conv_notas: 'The organisers announce their decision in February.',
      proxima_accion: 'Wait for the organisers\' decision (February)',
      proxima_accion_fecha: '2027-02-01',
    },
    interaccion: {
      tipo: 'formulario_web' as const,
      fecha: '2026-11-05',
      asunto: 'Food vendor application (food vendors / chaishops)',
      estado: 'convocatoria_enviada' as Estado,
    },
  },
];
