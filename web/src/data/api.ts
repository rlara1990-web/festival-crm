// Capa de datos. Hay dos implementaciones: Supabase (real) y demo (solo en desarrollo).
import type { PuntuacionConfig } from '../../../src/scoring/score.ts';
import type { Comentario, Contacto, Documento, Edicion, EntradaBanco, Festival, Interaccion, Organizacion, Postulacion, Propuesta, RespuestaPost, Solicitud, Vinculo } from '../types.ts';

export interface Filtro { festival_id?: string; organizacion_id?: string }

export interface Api {
  /** Sesión */
  sesion(): Promise<string | null>; // email del usuario o null
  entrar(email: string, password: string): Promise<void>;
  salir(): Promise<void>;

  /** Lecturas */
  festivales(): Promise<Festival[]>;
  ediciones(festivalId?: string): Promise<Edicion[]>;
  contactos(filtro?: Filtro): Promise<Contacto[]>;
  interacciones(filtro: Filtro): Promise<Interaccion[]>;
  organizaciones(): Promise<Organizacion[]>;
  vinculos(filtro?: Filtro): Promise<Vinculo[]>;
  comentarios(registroIds: string[]): Promise<Comentario[]>;
  config(): Promise<PuntuacionConfig>;
  propuestas(estado?: Propuesta['estado']): Promise<Propuesta[]>;
  solicitudes(festivalId: string): Promise<Solicitud[]>;
  /** festivalId: un festival; null: solo generales; undefined: todos */
  documentos(festivalId?: string | null): Promise<Documento[]>;
  /** Enlace temporal para abrir o descargar un documento */
  enlaceDocumento(d: Documento): Promise<string>;
  postulacion(edicionId: string): Promise<Postulacion | null>;
  respuestas(postulacionId: string): Promise<RespuestaPost[]>;
  banco(): Promise<EntradaBanco[]>;
  /** ¿Ya existe esta fuente? (para no duplicar al reintentar) */
  existeFuente(fila: { tabla: string; registro_id: string; campo: string | null; valor: string }): Promise<boolean>;

  /** Escrituras */
  actualizarFestival(id: string, cambios: Partial<Festival>): Promise<void>;
  actualizarEdicion(id: string, cambios: Partial<Edicion>): Promise<void>;
  /** Si trae estado_resultante y edicion_id, la base actualiza el estado de la edición (trigger). */
  crearInteraccion(fila: Omit<Interaccion, 'id' | 'creado_en'>): Promise<void>;
  crearContacto(fila: Omit<Contacto, 'id'>): Promise<void>;
  /** Festival nuevo (desde una propuesta aceptada); devuelve el id */
  crearFestival(fila: Partial<Festival> & Pick<Festival, 'nombre' | 'tipo'>): Promise<string>;
  crearEdicion(fila: Partial<Edicion> & Pick<Edicion, 'festival_id' | 'anio'>): Promise<string>;
  actualizarContacto(id: string, cambios: Partial<Contacto>): Promise<void>;
  crearOrganizacion(fila: Omit<Organizacion, 'id'>): Promise<string>;
  actualizarOrganizacion(id: string, cambios: Partial<Organizacion>): Promise<void>;
  crearVinculo(fila: Vinculo): Promise<void>;
  borrarVinculo(fila: Pick<Vinculo, 'festival_id' | 'organizacion_id' | 'rol'>): Promise<void>;
  crearComentario(fila: Pick<Comentario, 'tabla' | 'registro_id' | 'campo' | 'texto'>): Promise<void>;
  resolverComentario(id: string): Promise<void>;
  crearSolicitud(fila: Pick<Solicitud, 'tipo' | 'festival_id' | 'edicion_id' | 'detalle'>): Promise<void>;
  descartarSolicitud(id: string): Promise<void>;
  subirDocumento(archivo: File, datos: { festival_id: string | null; descripcion: string | null }): Promise<void>;
  borrarDocumento(d: Documento): Promise<void>;
  crearPostulacion(fila: Pick<Postulacion, 'edicion_id' | 'festival_id' | 'formulario_url' | 'fecha_limite'>): Promise<string>;
  actualizarPostulacion(id: string, cambios: Partial<Postulacion>): Promise<void>;
  crearRespuesta(fila: Pick<RespuestaPost, 'postulacion_id' | 'orden' | 'pregunta' | 'ayuda' | 'respuesta' | 'estado' | 'banco_id'>): Promise<void>;
  actualizarRespuesta(id: string, cambios: Partial<RespuestaPost>): Promise<void>;
  borrarRespuesta(id: string): Promise<void>;
  crearEntradaBanco(fila: Pick<EntradaBanco, 'tema' | 'pregunta' | 'respuesta' | 'idioma' | 'notas'>): Promise<string>;
  actualizarEntradaBanco(id: string, cambios: Partial<EntradaBanco>): Promise<void>;
  borrarEntradaBanco(id: string): Promise<void>;
  resolverPropuesta(id: string, estado: 'aceptada' | 'rechazada'): Promise<void>;
  /** Registra de dónde viene un dato aceptado */
  crearFuente(fila: { tabla: string; registro_id: string; campo: string | null; valor: string; url: string | null; metodo: 'manual' | 'scraping' }): Promise<void>;
}

let actual: Api | null = null;

export async function obtenerApi(): Promise<Api> {
  if (actual) return actual;
  const demo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');
  if (demo) {
    const { crearApiDemo } = await import('./demo-api.ts');
    actual = await crearApiDemo();
  } else {
    const { crearApiSupabase } = await import('./supabase-api.ts');
    actual = crearApiSupabase();
  }
  return actual;
}
