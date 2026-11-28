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
  festival_id: string | null;
  organizacion_id: string | null;
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
  festival_id: string | null;
  organizacion_id: string | null;
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

export interface Organizacion {
  id: string;
  nombre: string;
  tipo: string;
  web_url: string | null;
  notas: string | null;
}

/** Qué organización cumple qué rol en un festival */
export interface Vinculo {
  festival_id: string;
  organizacion_id: string;
  rol: string;
  notas: string | null;
}

export interface Propuesta {
  id: string;
  tipo: 'dato' | 'festival_nuevo' | 'cambio_estado';
  tabla: string | null; // festivales | ediciones | contactos
  registro_id: string | null; // id de festival o edición (para contactos: festival)
  campo: string | null; // para contactos: 'nuevo'
  valor_propuesto: unknown;
  valor_actual: unknown;
  motivo: string | null;
  fuente_url: string | null;
  obtenido_en: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  resuelto_en: string | null;
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

/** Pedido a Claude desde el CRM; se procesa en la siguiente revisión programada */
export interface Solicitud {
  id: string;
  tipo: 'completar_datos' | 'preparar_correo' | 'preparar_recontacto' | 'preparar_postulacion' | 'otro';
  festival_id: string | null;
  edicion_id: string | null;
  detalle: string | null;
  estado: 'pendiente' | 'en_proceso' | 'hecha' | 'descartada';
  resultado: string | null;
  creado_en: string;
  procesado_en: string | null;
}

/** Archivo en Supabase Storage (bucket "documentos"), general o de un festival */
export interface Documento {
  id: string;
  nombre: string;
  descripcion: string | null;
  ruta_storage: string;
  tipo_mime: string | null;
  tamano_bytes: number | null;
  festival_id: string | null;
  creado_en: string;
}

/** Postulación a un festival (formulario de food vendors), una por temporada */
export interface Postulacion {
  id: string;
  edicion_id: string;
  festival_id: string;
  formulario_url: string | null;
  fecha_limite: string | null;
  estado: 'preparando' | 'enviada' | 'descartada';
  enviada_en: string | null;
  decision_esperada: string | null;
  notas: string | null;
  actualizado_en: string;
}

export interface RespuestaPost {
  id: string;
  postulacion_id: string;
  orden: number;
  pregunta: string;
  ayuda: string | null;
  respuesta: string | null;
  estado: 'vacia' | 'borrador' | 'revisada';
  banco_id: string | null;
  actualizado_en: string;
}

/** Respuesta reutilizable entre formularios */
export interface EntradaBanco {
  id: string;
  tema: string;
  pregunta: string;
  respuesta: string;
  idioma: 'en' | 'pt' | 'es';
  notas: string | null;
  actualizado_en: string;
}
