// Historial de interacciones de un festival o de una organización.
import { useState } from 'react';
import type { Api } from '../data/api.ts';
import type { Contacto, Edicion, Estado, Festival, Interaccion, Organizacion } from '../types.ts';
import { ESTADOS, ORIGENES, TIPOS_INTERACCION, fechaTexto, label } from '../labels.ts';
import { Opciones, Seccion, hoy, vacio, type Guardar } from './ui.tsx';

interface Nuevo { tipo: string; fecha: string; asunto: string; cuerpo: string; contacto: string; estado: string; festival: string }

/**
 * - En un festival: las actividades se registran en la edición objetivo y pueden cambiar su estado.
 * - En una organización: se registran en la organización y, si se elige un festival, también en su edición objetivo.
 */
export function SeccionHistorial({ festival, organizacion, objetivos, ediciones, contactos, interacciones, festivales, organizaciones, guardar, api }: {
  festival?: Festival;
  organizacion?: Organizacion;
  /** Edición objetivo por festival_id (la del año más reciente) */
  objetivos: Record<string, Edicion>;
  ediciones: Edicion[];
  contactos: Contacto[];
  interacciones: Interaccion[];
  /** Festivales elegibles (en una organización: los que gestiona) */
  festivales: Festival[];
  organizaciones: Organizacion[];
  guardar: Guardar;
  api: Api;
}) {
  const [nuevo, setNuevo] = useState<Nuevo | null>(null);
  const anioDe = (id: string | null) => ediciones.find((e) => e.id === id)?.anio;
  const contactoDe = (id: string | null) => contactos.find((c) => c.id === id);
  const festivalId = festival?.id ?? nuevo?.festival ?? '';
  const objetivo = festivalId ? objetivos[festivalId] : undefined;

  async function enviar(n: Nuevo) {
    const fid = festival?.id ?? (n.festival || null);
    const ed = fid ? objetivos[fid] : undefined;
    await guardar(() => api.crearInteraccion({
      festival_id: fid, organizacion_id: organizacion?.id ?? null, edicion_id: ed?.id ?? null,
      contacto_id: n.contacto || null, tipo: n.tipo, fecha: vacio(n.fecha), asunto: vacio(n.asunto), cuerpo: vacio(n.cuerpo),
      estado_resultante: (ed && n.estado ? n.estado : null) as Estado | null, origen: 'manual',
    }), 'Activity logged');
    setNuevo(null);
  }

  return (
    <Seccion titulo="History" extra={!nuevo && <button className="btn-sec" onClick={() => setNuevo({
      tipo: 'nota_interna', fecha: hoy(), asunto: '', cuerpo: '', contacto: '', estado: '', festival: '',
    })}>Log activity</button>}>
      {nuevo && (
        <div className="form">
          <label>Type<Opciones valor={nuevo.tipo} cambiar={(v) => setNuevo({ ...nuevo, tipo: v || 'nota_interna' })} opciones={TIPOS_INTERACCION} /></label>
          <label>Date<input type="date" value={nuevo.fecha} onChange={(x) => setNuevo({ ...nuevo, fecha: x.target.value })} /></label>
          <label>Contact<select value={nuevo.contacto} onChange={(x) => setNuevo({ ...nuevo, contacto: x.target.value })}>
            <option value="">—</option>
            {contactos.filter((c) => !c.baja_en).map((c) => <option key={c.id} value={c.id}>{c.nombre ?? c.email ?? c.telefono}</option>)}
          </select></label>
          {organizacion && (
            <label>About festival (optional)<select value={nuevo.festival} onChange={(x) => setNuevo({ ...nuevo, festival: x.target.value, estado: '' })}>
              <option value="">— General —</option>
              {festivales.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select></label>
          )}
          {objetivo && (
            <label>New status for {objetivo.anio} (optional)<Opciones valor={nuevo.estado} cambiar={(v) => setNuevo({ ...nuevo, estado: v })} opciones={ESTADOS} vacioTexto="Keep current status" /></label>
          )}
          <label className="ancho">Subject<input value={nuevo.asunto} onChange={(x) => setNuevo({ ...nuevo, asunto: x.target.value })} /></label>
          <label className="ancho">Details<textarea value={nuevo.cuerpo} onChange={(x) => setNuevo({ ...nuevo, cuerpo: x.target.value })} /></label>
          <div className="ancho acciones">
            <button className="btn-sec" onClick={() => setNuevo(null)}>Cancel</button>
            <button disabled={!nuevo.asunto && !nuevo.cuerpo} onClick={() => enviar(nuevo)}>Save</button>
          </div>
        </div>
      )}
      {interacciones.length === 0 && <p className="tenue">No activity yet.</p>}
      <ol className="historial">
        {interacciones.map((i) => {
          const c = contactoDe(i.contacto_id);
          const org = !organizacion && i.organizacion_id ? organizaciones.find((o) => o.id === i.organizacion_id) : undefined;
          const fest = !festival && i.festival_id ? festivales.find((f) => f.id === i.festival_id) : undefined;
          return (
            <li key={i.id}>
              <div className="hist-cab">
                <b>{label(TIPOS_INTERACCION, i.tipo)}</b>
                <span className="tenue">{i.fecha ? fechaTexto(i.fecha) : 'Date unknown'}{anioDe(i.edicion_id) && ` · season ${anioDe(i.edicion_id)}`} · {label(ORIGENES, i.origen)}</span>
                {org && <span className="etiqueta">via <a href={`#/organizacion/${org.id}`}>{org.nombre}</a></span>}
                {fest && <span className="etiqueta"><a href={`#/festival/${fest.id}`}>{fest.nombre}</a></span>}
                {i.estado_resultante && <span className={`estado estado-${i.estado_resultante}`}>→ {label(ESTADOS, i.estado_resultante)}</span>}
              </div>
              {i.asunto && <p className="hist-asunto">{i.asunto}</p>}
              {i.cuerpo && <p className="multilinea">{i.cuerpo}</p>}
              {c && <p className="tenue">Contact: {c.nombre ? `${c.nombre} · ` : ''}{c.email ?? c.telefono}</p>}
            </li>
          );
        })}
      </ol>
    </Seccion>
  );
}
