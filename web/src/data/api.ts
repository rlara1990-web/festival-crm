// Capa de datos. Hay dos implementaciones: Supabase (real) y demo (solo en desarrollo).
import type { PuntuacionConfig } from '../../../src/scoring/score.ts';
import type { Comentario, Contacto, Edicion, Festival, Interaccion, Organizacion, Vinculo } from '../types.ts';

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

  /** Escrituras */
  actualizarFestival(id: string, cambios: Partial<Festival>): Promise<void>;
  actualizarEdicion(id: string, cambios: Partial<Edicion>): Promise<void>;
  /** Si trae estado_resultante y edicion_id, la base actualiza el estado de la edición (trigger). */
  crearInteraccion(fila: Omit<Interaccion, 'id' | 'creado_en'>): Promise<void>;
  crearContacto(fila: Omit<Contacto, 'id'>): Promise<void>;
  actualizarContacto(id: string, cambios: Partial<Contacto>): Promise<void>;
  crearOrganizacion(fila: Omit<Organizacion, 'id'>): Promise<string>;
  actualizarOrganizacion(id: string, cambios: Partial<Organizacion>): Promise<void>;
  crearVinculo(fila: Vinculo): Promise<void>;
  borrarVinculo(fila: Pick<Vinculo, 'festival_id' | 'organizacion_id' | 'rol'>): Promise<void>;
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
