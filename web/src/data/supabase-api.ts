import { createClient } from '@supabase/supabase-js';
import type { PuntuacionConfig } from '../../../src/scoring/score.ts';
import type { Api, Filtro } from './api.ts';
import type { Comentario, Contacto, Documento, Edicion, EntradaBanco, Festival, Interaccion, Organizacion, Postulacion, Propuesta, RespuestaPost, Solicitud, Vinculo } from '../types.ts';
import { rutaDocumento } from './documentos.ts';

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
    async contactos(filtro?: Filtro) {
      let q = db.from('contactos').select('*').order('creado_en');
      if (filtro?.festival_id) q = q.eq('festival_id', filtro.festival_id);
      if (filtro?.organizacion_id) q = q.eq('organizacion_id', filtro.organizacion_id);
      return comprobar(await q) as Contacto[];
    },
    async interacciones(filtro: Filtro) {
      let q = db.from('interacciones').select('*');
      if (filtro.festival_id) q = q.eq('festival_id', filtro.festival_id);
      if (filtro.organizacion_id) q = q.eq('organizacion_id', filtro.organizacion_id);
      return comprobar(await q.order('fecha', { ascending: false, nullsFirst: false }).order('creado_en', { ascending: false })) as Interaccion[];
    },
    async organizaciones() {
      return comprobar(await db.from('organizaciones').select('*').order('nombre')) as Organizacion[];
    },
    async vinculos(filtro?: Filtro) {
      let q = db.from('festival_organizacion').select('*');
      if (filtro?.festival_id) q = q.eq('festival_id', filtro.festival_id);
      if (filtro?.organizacion_id) q = q.eq('organizacion_id', filtro.organizacion_id);
      return comprobar(await q) as Vinculo[];
    },
    async propuestas(estado) {
      let q = db.from('propuestas').select('*').order('obtenido_en');
      if (estado) q = q.eq('estado', estado);
      return comprobar(await q) as Propuesta[];
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
    async crearFestival(fila) {
      return (comprobar(await db.from('festivales').insert(fila).select('id').single()) as { id: string }).id;
    },
    async crearEdicion(fila) {
      return (comprobar(await db.from('ediciones').insert(fila).select('id').single()) as { id: string }).id;
    },
    async actualizarContacto(id, cambios) {
      comprobar(await db.from('contactos').update(cambios).eq('id', id));
    },
    async crearOrganizacion(fila) {
      const r = comprobar(await db.from('organizaciones').insert(fila).select('id').single()) as { id: string };
      return r.id;
    },
    async actualizarOrganizacion(id, cambios) {
      comprobar(await db.from('organizaciones').update(cambios).eq('id', id));
    },
    async crearVinculo(fila) {
      comprobar(await db.from('festival_organizacion').insert(fila));
    },
    async resolverPropuesta(id, estado) {
      comprobar(await db.from('propuestas').update({ estado, resuelto_en: new Date().toISOString() }).eq('id', id));
    },
    async crearFuente(fila) {
      comprobar(await db.from('fuentes_dato').insert(fila));
    },
    async solicitudes(festivalId) {
      return comprobar(await db.from('solicitudes').select('*').eq('festival_id', festivalId).order('creado_en', { ascending: false })) as Solicitud[];
    },
    async crearSolicitud(fila) {
      comprobar(await db.from('solicitudes').insert(fila));
    },
    async descartarSolicitud(id) {
      comprobar(await db.from('solicitudes').update({ estado: 'descartada' }).eq('id', id).eq('estado', 'pendiente'));
    },
    async crearComentario(fila) {
      comprobar(await db.from('comentarios').insert({ ...fila, autor: 'equipo' }));
    },
    async resolverComentario(id) {
      comprobar(await db.from('comentarios').update({ resuelto: true }).eq('id', id));
    },
    async documentos(festivalId) {
      let q = db.from('documentos').select('*').order('creado_en', { ascending: false });
      if (festivalId === null) q = q.is('festival_id', null);
      else if (festivalId) q = q.eq('festival_id', festivalId);
      return comprobar(await q) as Documento[];
    },
    async enlaceDocumento(d) {
      const { data, error } = await db.storage.from('documentos').createSignedUrl(d.ruta_storage, 3600);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
    async subirDocumento(archivo, datos) {
      const ruta = rutaDocumento(archivo.name, datos.festival_id);
      const { error } = await db.storage.from('documentos').upload(ruta, archivo, { contentType: archivo.type || undefined });
      if (error) throw new Error(error.message);
      const r = await db.from('documentos').insert({
        nombre: archivo.name, descripcion: datos.descripcion, ruta_storage: ruta, tipo_mime: archivo.type || null,
        tamano_bytes: archivo.size, festival_id: datos.festival_id,
      });
      if (r.error) { await db.storage.from('documentos').remove([ruta]); throw new Error(r.error.message); }
    },
    async borrarDocumento(d) {
      const { error } = await db.storage.from('documentos').remove([d.ruta_storage]);
      if (error) throw new Error(error.message);
      comprobar(await db.from('documentos').delete().eq('id', d.id));
    },
    async existeFuente(f) {
      let q = db.from('fuentes_dato').select('id', { count: 'exact', head: true })
        .eq('tabla', f.tabla).eq('registro_id', f.registro_id).eq('valor', f.valor);
      q = f.campo == null ? q.is('campo', null) : q.eq('campo', f.campo);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return (count ?? 0) > 0;
    },
    async postulacion(edicionId) {
      return comprobar(await db.from('postulaciones').select('*').eq('edicion_id', edicionId).maybeSingle()) as Postulacion | null;
    },
    async respuestas(postulacionId) {
      return comprobar(await db.from('postulacion_respuestas').select('*').eq('postulacion_id', postulacionId).order('orden')) as RespuestaPost[];
    },
    async banco() {
      return comprobar(await db.from('banco_respuestas').select('*').order('tema')) as EntradaBanco[];
    },
    async crearPostulacion(fila) {
      return (comprobar(await db.from('postulaciones').insert(fila).select('id').single()) as { id: string }).id;
    },
    async actualizarPostulacion(id, cambios) {
      comprobar(await db.from('postulaciones').update(cambios).eq('id', id));
    },
    async crearRespuesta(fila) {
      comprobar(await db.from('postulacion_respuestas').insert(fila));
    },
    async actualizarRespuesta(id, cambios) {
      comprobar(await db.from('postulacion_respuestas').update(cambios).eq('id', id));
    },
    async borrarRespuesta(id) {
      comprobar(await db.from('postulacion_respuestas').delete().eq('id', id));
    },
    async crearEntradaBanco(fila) {
      return (comprobar(await db.from('banco_respuestas').insert(fila).select('id').single()) as { id: string }).id;
    },
    async actualizarEntradaBanco(id, cambios) {
      comprobar(await db.from('banco_respuestas').update(cambios).eq('id', id));
    },
    async borrarEntradaBanco(id) {
      comprobar(await db.from('banco_respuestas').delete().eq('id', id));
    },
    async borrarVinculo(f) {
      comprobar(await db.from('festival_organizacion').delete()
        .eq('festival_id', f.festival_id).eq('organizacion_id', f.organizacion_id).eq('rol', f.rol));
    },
  };
}
