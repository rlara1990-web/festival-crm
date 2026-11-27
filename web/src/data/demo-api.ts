// API en memoria con los datos de la importación. Solo para desarrollo (?demo en la URL);
// no se incluye en la web publicada. Imita el trigger de estado de las interacciones.
import type { PuntuacionConfig } from '../../../src/scoring/score.ts';
import type { Api } from './api.ts';
import type { Comentario, Contacto, Documento, Edicion, Festival, Interaccion, Organizacion, Propuesta, Solicitud, Vinculo } from '../types.ts';
import { rutaDocumento } from './documentos.ts';

interface DatosDemo {
  festivales: Festival[]; ediciones: Edicion[]; contactos: Contacto[]; interacciones: Interaccion[];
  comentarios: Comentario[]; config: PuntuacionConfig; organizaciones: Organizacion[]; vinculos: Vinculo[]; propuestas: Propuesta[];
}

export async function crearApiDemo(): Promise<Api> {
  const modulos = import.meta.glob('./demo-data.ts');
  const cargar = modulos['./demo-data.ts'];
  if (!cargar) throw new Error('Demo data missing: run `npm run demo-data` first.');
  const d = structuredClone(((await cargar()) as { DATOS: DatosDemo }).DATOS);
  const solicitudes: Solicitud[] = [];
  const documentos: Documento[] = [];
  const archivos = new Map<string, string>(); // ruta → object URL
  const fuentes: string[] = [];
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
    async propuestas(estado) { return d.propuestas.filter((p) => !estado || p.estado === estado); },
    async resolverPropuesta(i, estado) { parchear(d.propuestas, i, { estado, resuelto_en: ahora() }); },
    async crearFuente(f) { fuentes.push(JSON.stringify([f.tabla, f.registro_id, f.campo, f.valor])); },
    async existeFuente(f) { return fuentes.includes(JSON.stringify([f.tabla, f.registro_id, f.campo, f.valor])); },
    async solicitudes(f) { return solicitudes.filter((x) => x.festival_id === f).sort((a, b) => b.creado_en.localeCompare(a.creado_en)); },
    async crearSolicitud(fila) { solicitudes.push({ ...fila, id: id(), estado: 'pendiente', resultado: null, creado_en: ahora(), procesado_en: null }); },
    async descartarSolicitud(i) { const x = solicitudes.find((y) => y.id === i); if (x?.estado === 'pendiente') x.estado = 'descartada'; },
    async crearComentario(fila) { d.comentarios.push({ ...fila, id: id(), autor: 'equipo', resuelto: false, creado_en: ahora() }); },
    async resolverComentario(i) { parchear(d.comentarios, i, { resuelto: true }); },
    async documentos(f) {
      return documentos.filter((x) => f === undefined || x.festival_id === f).sort((a, b) => b.creado_en.localeCompare(a.creado_en));
    },
    async enlaceDocumento(x) { return archivos.get(x.ruta_storage) ?? '#'; },
    async subirDocumento(archivo, datos) {
      const ruta = rutaDocumento(archivo.name, datos.festival_id);
      archivos.set(ruta, URL.createObjectURL(archivo));
      documentos.push({ id: id(), nombre: archivo.name, descripcion: datos.descripcion, ruta_storage: ruta, tipo_mime: archivo.type || null,
        tamano_bytes: archivo.size, festival_id: datos.festival_id, creado_en: ahora() });
    },
    async borrarDocumento(x) { const i = documentos.findIndex((y) => y.id === x.id); if (i >= 0) documentos.splice(i, 1); },
    async actualizarFestival(i, c) { parchear(d.festivales, i, c); },
    async actualizarEdicion(i, c) { parchear(d.ediciones, i, c); },
    async crearInteraccion(fila) {
      d.interacciones.push({ ...fila, id: id(), creado_en: ahora() });
      if (fila.estado_resultante && fila.edicion_id) parchear(d.ediciones, fila.edicion_id, { estado: fila.estado_resultante });
    },
    async crearContacto(fila) { d.contactos.push({ ...fila, id: id() }); },
    async actualizarContacto(i, c) { parchear(d.contactos, i, c); },
    async crearFestival(fila) {
      const nuevo: Festival = { pais: null, ciudad: null, generos: [], perfil_publico: [], notas_publico: null, web_url: null, formulario_contacto_url: null,
        instagram_url: null, idioma_correo: null, fuera_de_alcance: false, campos_pendientes: [], notas: null, acampada: null, parecido_a: [], ...fila, id: id() };
      d.festivales.push(nuevo); return nuevo.id;
    },
    async crearEdicion(fila) {
      const nueva = { fecha_inicio: null, fecha_fin: null, fechas_texto: null, duracion_dias: null, aforo_min: null, aforo_max: null, estado: 'por_contactar',
        proxima_accion: null, proxima_accion_fecha: null, conv_apertura: null, conv_cierre: null, conv_metodo: null, conv_url: null, exclusividad: null,
        coste_tipo: null, coste_notas: null, prioridad_antiguos: null, acepta_food_trucks: null, conv_notas: null, conv_fuente_url: null, conv_revisado_en: null,
        puntuacion: null, puntuacion_detalle: null, puntuacion_incompleta: true, puntuacion_cobertura: null, experiencia: null, comentario_experiencia: null,
        recontactos: 0, proximo_recontacto: null, ...fila, id: id() } as Edicion;
      d.ediciones.push(nueva); return nueva.id;
    },
    async crearOrganizacion(fila) { const nuevo = { ...fila, id: id() }; d.organizaciones.push(nuevo); return nuevo.id; },
    async actualizarOrganizacion(i, c) { parchear(d.organizaciones, i, c); },
    async crearVinculo(fila) { d.vinculos.push(fila); },
    async borrarVinculo(f) {
      d.vinculos = d.vinculos.filter((v) => !(v.festival_id === f.festival_id && v.organizacion_id === f.organizacion_id && v.rol === f.rol));
    },
  };
}
