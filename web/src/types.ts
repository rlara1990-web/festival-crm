// Filas de la base de datos (nombres de columnas en español, como en Supabase).

export type Estado =
  | 'por_contactar' | 'esperando_respuesta' | 'recontacto_1' | 'recontacto_2' | 'sin_respuesta'
  | 'en_conversacion' | 'reunion_agendada' | 'convocatoria_enviada' | 'aceptado' | 'rechazado' | 'descartado';

export type Experiencia = 'muy_positiva' | 'positiva' | 'neutra' | 'negativa' | 'muy_negativa';

export interface Festival {
  id: string;
  nombre: string;
  pais: string | null;
  ciudad: string | null;
  tipo: string;
  generos: string[];
  perfil_publico: string[];
  notas_publico: string | null;
  web_url: string | null;
  formulario_contacto_url: string | null;
  instagram_url: string | null;
  idioma_correo: string | null;
  fuera_de_alcance: boolean;
  campos_pendientes: string[];
  notas: string | null;
  acampada: boolean | null;
  parecido_a: string[];
}

export interface Edicion {
  id: string;
  festival_id: string;
  anio: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fechas_texto: string | null;
  duracion_dias: number | null;
  aforo_min: number | null;
  aforo_max: number | null;
  estado: Estado;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  conv_apertura: string | null;
  conv_cierre: string | null;
  conv_metodo: string | null;
  conv_url: string | null;
  exclusividad: boolean | null;
  coste_tipo: string | null;
  coste_notas: string | null;
  prioridad_antiguos: boolean | null;
  acepta_food_trucks: boolean | null;
  conv_notas: string | null;
  conv_fuente_url: string | null;
  conv_revisado_en: string | null;
  puntuacion: number | null;
  puntuacion_detalle: Record<string, { valor: number | null; peso: number; desconocidos?: string[] }> | null;
  puntuacion_incompleta: boolean;
  puntuacion_cobertura: number | null;
  puntuacion_calculada_en?: string | null;
  experiencia: Experiencia | null;
  comentario_experiencia: string | null;
  recontactos: number;
  proximo_recontacto: string | null;
}

export interface Contacto {
  id: string;
  festival_id: string;
  nombre: string | null;
  rol: string | null;
  email: string | null;
  telefono: string | null;
  canal_preferido: string | null;
  primer_contacto_en: string | null;
  baja_en: string | null;
  verificar: boolean;
  motivo_verificar: string | null;
  notas: string | null;
  principal: boolean;
}

export interface Interaccion {
  id: string;
  festival_id: string;
  edicion_id: string | null;
  contacto_id: string | null;
  tipo: string;
  fecha: string | null;
  asunto: string | null;
  cuerpo: string | null;
  estado_resultante: Estado | null;
  origen: string;
  creado_en: string;
}

export interface Comentario {
  id: string;
  tabla: string;
  registro_id: string;
  campo: string | null;
  texto: string;
  autor: 'equipo' | 'claude';
  resuelto: boolean;
  creado_en: string;
}
