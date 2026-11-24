// Aplicar una propuesta aceptada: escribe el dato, registra la fuente y recalcula.
import { validarPropuesta, type ContactoPropuesto } from '../../../src/shared/propuestas.ts';
import type { Api } from './api.ts';
import { recalcularFestival } from './recalcular.ts';
import type { Edicion, Estado, Propuesta } from '../types.ts';

/** Festival al que pertenece una propuesta (para agrupar y recalcular). */
export function festivalDePropuesta(p: Propuesta, ediciones: Edicion[]): string | null {
  if (!p.registro_id) return null;
  if (p.tabla === 'ediciones') return ediciones.find((e) => e.id === p.registro_id)?.festival_id ?? null;
  return p.registro_id; // festivales y contactos (registro = festival)
}

export async function aceptarPropuesta(api: Api, p: Propuesta, ediciones: Edicion[]): Promise<void> {
  const festivalId = festivalDePropuesta(p, ediciones);
  if (!festivalId || !p.tabla || !p.registro_id) throw new Error('Proposal is not linked to a festival');

  if (p.tipo === 'cambio_estado') {
    const v = p.valor_propuesto as { estado: Estado; asunto?: string };
    await api.crearInteraccion({
      festival_id: festivalId, organizacion_id: null, edicion_id: p.registro_id, contacto_id: null, tipo: 'nota_interna',
      fecha: new Date().toISOString().slice(0, 10), asunto: v.asunto ?? 'Status change proposed by Claude',
      cuerpo: p.motivo, estado_resultante: v.estado, origen: 'claude',
    });
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
      await api.crearContacto({
        festival_id: festivalId, organizacion_id: null, nombre: c.nombre ?? null, rol: c.rol ?? null,
        email: c.email?.toLowerCase() ?? null, telefono: c.telefono ?? null, canal_preferido: c.email ? 'email' : 'telefono',
        primer_contacto_en: null, baja_en: null, verificar: false, motivo_verificar: null, notas: p.motivo,
        principal: !existentes.some((x) => x.principal && !x.baja_en),
      });
    }
    await api.crearFuente({
      tabla: p.tabla, registro_id: p.registro_id, campo: p.campo, valor: JSON.stringify(p.valor_propuesto),
      url: p.fuente_url, metodo: 'scraping',
    });
  }
  await api.resolverPropuesta(p.id, 'aceptada');
  await recalcularFestival(api, festivalId);
}
