import { createClient } from '@supabase/supabase-js';
import type { PuntuacionConfig } from '../../../src/scoring/score.ts';
import type { Api } from './api.ts';
import type { Comentario, Contacto, Edicion, Festival, Interaccion } from '../types.ts';

// Clave publicable: pensada para el navegador. La seguridad la dan las políticas RLS
// (solo usuarios autenticados pueden leer o escribir).
const URL_SUPABASE = 'https://mabgenlzxpefappjlmgd.supabase.co';
const CLAVE_PUBLICABLE = 'sb_publishable_SLEJ6VAeNQVd9b76Lx58Ag_uOUzFtI_';

function comprobar<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export function crearApiSupabase(): Api {
  const db = createClient(URL_SUPABASE, CLAVE_PUBLICABLE);
  return {
    async sesion() {
      const { data } = await db.auth.getSession();
      return data.session?.user.email ?? null;
    },
    async entrar(email, password) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async salir() {
      await db.auth.signOut();
    },
    async festivales() {
      return comprobar(await db.from('festivales').select('*').order('nombre')) as Festival[];
    },
    async ediciones(festivalId) {
      let q = db.from('ediciones').select('*').order('anio');
      if (festivalId) q = q.eq('festival_id', festivalId);
      return comprobar(await q) as Edicion[];
    },
    async contactos(festivalId) {
      let q = db.from('contactos').select('*').order('creado_en');
      if (festivalId) q = q.eq('festival_id', festivalId);
      return comprobar(await q) as Contacto[];
    },
    async interacciones(festivalId) {
      return comprobar(await db.from('interacciones').select('*').eq('festival_id', festivalId)
        .order('fecha', { ascending: false, nullsFirst: false }).order('creado_en', { ascending: false })) as Interaccion[];
    },
    async comentarios(registroIds) {
      if (registroIds.length === 0) return [];
      return comprobar(await db.from('comentarios').select('*').in('registro_id', registroIds).order('creado_en')) as Comentario[];
    },
    async config() {
      const fila = comprobar(await db.from('puntuacion_config').select('*').eq('activa', true).single()) as PuntuacionConfig;
      return fila;
    },
    async actualizarFestival(id, cambios) {
      comprobar(await db.from('festivales').update(cambios).eq('id', id));
    },
    async actualizarEdicion(id, cambios) {
      comprobar(await db.from('ediciones').update(cambios).eq('id', id));
    },
    async crearInteraccion(fila) {
      comprobar(await db.from('interacciones').insert(fila));
    },
    async crearContacto(fila) {
      comprobar(await db.from('contactos').insert(fila));
    },
    async actualizarContacto(id, cambios) {
      comprobar(await db.from('contactos').update(cambios).eq('id', id));
    },
  };
}
