// Aplicar una propuesta aceptada: escribe el dato, registra la fuente y recalcula.
import { validarFestivalNuevo, validarPropuesta, type ContactoPropuesto, type FestivalNuevo } from '../../../src/shared/propuestas.ts';
import type { Api } from './api.ts';
import { recalcularFestival } from './recalcular.ts';
import type { Edicion, Estado, Propuesta } from '../types.ts';

/** Festival al que pertenece una propuesta (para agrupar y recalcular). */
export function festivalDePropuesta(p: Propuesta, ediciones: Edicion[]): string | null {
  if (!p.registro_id) return null;
  if (p.tabla === 'ediciones') return ediciones.find((e) => e.id === p.registro_id)?.festival_id ?? null;
  return p.registro_id; // festivales y contactos (registro = festival)
}

/**
 * Acepta una propuesta. Es seguro reintentarla si se corta la conexión a mitad:
 * cada paso comprueba si ya se hizo (contacto con el mismo email, fuente ya registrada,
 * nota de cambio de estado ya creada) y la propuesta se marca aceptada al final.
 */
export async function aceptarPropuesta(api: Api, p: Propuesta, ediciones: Edicion[]): Promise<void> {
  const festivalId = festivalDePropuesta(p, ediciones);
  if (!festivalId || !p.tabla || !p.registro_id) throw new Error('Proposal is not linked to a festival');

  if (p.tipo === 'cambio_estado') {
    const v = p.valor_propuesto as { estado: Estado; asunto?: string };
    const asunto = `${v.asunto ?? 'Status change proposed by Claude'} [proposal ${p.id.slice(0, 8)}]`;
    const hechas = await api.interacciones({ festival_id: festivalId });
    if (!hechas.some((i) => i.edicion_id === p.registro_id && i.asunto === asunto)) {
      await api.crearInteraccion({
        festival_id: festivalId, organizacion_id: null, edicion_id: p.registro_id, contacto_id: null, tipo: 'nota_interna',
        fecha: new Date().toISOString().slice(0, 10), asunto, cuerpo: p.motivo, estado_resultante: v.estado, origen: 'claude',
      });
    }
  } else {
    const error = validarPropuesta(p.tabla, p.campo ?? '', p.valor_propuesto);
    if (error) throw new Error(error);
    if (p.tabla === 'festivales') {
      await api.actualizarFestival(p.registro_id, { [p.campo!]: p.valor_propuesto });
    } else if (p.tabla === 'ediciones') {
      await api.actualizarEdicion(p.registro_id, { [p.campo!]: p.valor_propuesto });
    } else if (p.tabla === 'contactos') {
      const c = p.valor_propuesto as ContactoPropuesto;
      const existentes = await api.contactos({ festival_id: festivalId });
      const email = c.email?.toLowerCase() ?? null;
      const yaEsta = existentes.some((x) => (email && x.email?.toLowerCase() === email) || (!email && c.telefono && x.telefono === c.telefono));
      if (!yaEsta) await api.crearContacto({
        festival_id: festivalId, organizacion_id: null, nombre: c.nombre ?? null, rol: c.rol ?? null,
        email, telefono: c.telefono ?? null, canal_preferido: c.email ? 'email' : 'telefono',
        primer_contacto_en: null, baja_en: null, verificar: false, motivo_verificar: null, notas: p.motivo,
        principal: !existentes.some((x) => x.principal && !x.baja_en),
      });
    }
    const fuente = { tabla: p.tabla, registro_id: p.registro_id, campo: p.campo, valor: JSON.stringify(p.valor_propuesto) };
    if (!(await api.existeFuente(fuente))) await api.crearFuente({ ...fuente, url: p.fuente_url, metodo: 'scraping' });
  }
  await api.resolverPropuesta(p.id, 'aceptada');
  await recalcularFestival(api, festivalId);
}

/** Temporada objetivo de los festivales nuevos */
export const ANIO_OBJETIVO = 2027;

/**
 * Acepta un festival o evento nuevo: crea el festival, su temporada 2027 (Por contactar), el contacto
 * y la fuente, y recalcula. Se puede reintentar: si ya existe un festival con el mismo nombre, lo reutiliza.
 * Devuelve el id del festival.
 */
export async function aceptarFestivalNuevo(api: Api, p: Propuesta): Promise<string> {
  const v = p.valor_propuesto as FestivalNuevo;
  const error = validarFestivalNuevo(v);
  if (error) throw new Error(error);
  const nombre = v.nombre.trim();
  const existente = (await api.festivales()).find((f) => f.nombre.trim().toLowerCase() === nombre.toLowerCase());
  const festivalId = existente?.id ?? await api.crearFestival({
    nombre, pais: v.pais, ciudad: v.ciudad ?? null, tipo: v.tipo, generos: v.generos ?? [], perfil_publico: v.perfil_publico ?? [],
    acampada: v.acampada ?? null, web_url: v.web_url ?? null, instagram_url: v.instagram_url ?? null,
    idioma_correo: v.idioma_correo ?? (v.pais === 'PT' ? 'pt' : 'es'), notas: `Proposed by Claude: ${v.por_que}`,
  });
  const ediciones = await api.ediciones(festivalId);
  if (!ediciones.some((e) => e.anio === ANIO_OBJETIVO)) {
    await api.crearEdicion({
      festival_id: festivalId, anio: ANIO_OBJETIVO, estado: 'por_contactar', fecha_inicio: v.fecha_inicio ?? null, fecha_fin: v.fecha_fin ?? null,
      fechas_texto: v.fechas_texto ?? null, duracion_dias: v.duracion_dias ?? null, aforo_min: v.aforo_min ?? null, aforo_max: v.aforo_max ?? null,
      conv_url: v.conv_url ?? null,
    });
  }
  if (v.contacto && (v.contacto.email || v.contacto.telefono)) {
    const email = v.contacto.email?.toLowerCase() ?? null;
    const contactos = await api.contactos({ festival_id: festivalId });
    if (!contactos.some((c) => (email && c.email?.toLowerCase() === email) || (!email && c.telefono === v.contacto!.telefono))) {
      await api.crearContacto({
        festival_id: festivalId, organizacion_id: null, nombre: v.contacto.nombre ?? null, rol: v.contacto.rol ?? null, email,
        telefono: v.contacto.telefono ?? null, canal_preferido: email ? 'email' : 'telefono', primer_contacto_en: null, baja_en: null,
        verificar: false, motivo_verificar: null, notas: null, principal: !contactos.some((c) => c.principal && !c.baja_en),
      });
    }
  }
  const fuente = { tabla: 'festivales', registro_id: festivalId, campo: null, valor: JSON.stringify(v) };
  if (!(await api.existeFuente(fuente))) await api.crearFuente({ ...fuente, url: p.fuente_url, metodo: 'scraping' });
  await api.resolverPropuesta(p.id, 'aceptada');
  await recalcularFestival(api, festivalId);
  return festivalId;
}
