// API en memoria con los datos de la importación. Solo para desarrollo (?demo en la URL);
// no se incluye en la web publicada. Imita el trigger de estado de las interacciones.
import type { PuntuacionConfig } from '../../../src/scoring/score.ts';
import type { Api } from './api.ts';
import type { Comentario, Contacto, Edicion, Festival, Interaccion, Organizacion, Vinculo } from '../types.ts';

interface DatosDemo {
  festivales: Festival[]; ediciones: Edicion[]; contactos: Contacto[]; interacciones: Interaccion[];
  comentarios: Comentario[]; config: PuntuacionConfig; organizaciones: Organizacion[]; vinculos: Vinculo[];
}

export async function crearApiDemo(): Promise<Api> {
  const modulos = import.meta.glob('./demo-data.ts');
  const cargar = modulos['./demo-data.ts'];
  if (!cargar) throw new Error('Demo data missing: run `npm run demo-data` first.');
  const d = structuredClone(((await cargar()) as { DATOS: DatosDemo }).DATOS);
  let usuario: string | null = 'demo@mocheverde.com';
  const id = () => crypto.randomUUID();
  const ahora = () => new Date().toISOString();
  const parchear = <T extends { id: string }>(lista: T[], i: string, c: Partial<T>) => {
    const x = lista.find((y) => y.id === i);
    if (!x) throw new Error('Not found');
    Object.assign(x, c);
  };

  return {
    async sesion() { return usuario; },
    async entrar(email) { usuario = email; },
    async salir() { usuario = null; },
    async festivales() { return [...d.festivales].sort((a, b) => a.nombre.localeCompare(b.nombre)); },
    async ediciones(f) { return d.ediciones.filter((e) => !f || e.festival_id === f).sort((a, b) => a.anio - b.anio); },
    async contactos(f) {
      return d.contactos.filter((c) => (!f?.festival_id || c.festival_id === f.festival_id) && (!f?.organizacion_id || c.organizacion_id === f.organizacion_id));
    },
    async organizaciones() { return [...d.organizaciones].sort((a, b) => a.nombre.localeCompare(b.nombre)); },
    async vinculos(f) {
      return d.vinculos.filter((v) => (!f?.festival_id || v.festival_id === f.festival_id) && (!f?.organizacion_id || v.organizacion_id === f.organizacion_id));
    },
    async interacciones(f) {
      return d.interacciones.filter((i) => (!f.festival_id || i.festival_id === f.festival_id) && (!f.organizacion_id || i.organizacion_id === f.organizacion_id))
        .sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '') || b.creado_en.localeCompare(a.creado_en));
    },
    async comentarios(ids) { return d.comentarios.filter((c) => ids.includes(c.registro_id)); },
    async config() { return d.config; },
    async actualizarFestival(i, c) { parchear(d.festivales, i, c); },
    async actualizarEdicion(i, c) { parchear(d.ediciones, i, c); },
    async crearInteraccion(fila) {
      d.interacciones.push({ ...fila, id: id(), creado_en: ahora() });
      if (fila.estado_resultante && fila.edicion_id) parchear(d.ediciones, fila.edicion_id, { estado: fila.estado_resultante });
    },
    async crearContacto(fila) { d.contactos.push({ ...fila, id: id() }); },
    async actualizarContacto(i, c) { parchear(d.contactos, i, c); },
    async crearOrganizacion(fila) { const nuevo = { ...fila, id: id() }; d.organizaciones.push(nuevo); return nuevo.id; },
    async actualizarOrganizacion(i, c) { parchear(d.organizaciones, i, c); },
    async crearVinculo(fila) { d.vinculos.push(fila); },
    async borrarVinculo(f) {
      d.vinculos = d.vinculos.filter((v) => !(v.festival_id === f.festival_id && v.organizacion_id === f.organizacion_id && v.rol === f.rol));
    },
  };
}
