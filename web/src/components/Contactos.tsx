// Contactos de un festival o de una organización.
import { useState } from 'react';
import type { Api } from '../data/api.ts';
import type { Contacto } from '../types.ts';
import { CANALES, fechaTexto, label } from '../labels.ts';
import { Comentarios, Opciones, Seccion, hoy, vacio, type Coms, type Guardar } from './ui.tsx';

export interface Dueno { festival_id: string | null; organizacion_id: string | null }

export function SeccionContactos({ dueno, contactos, guardar, api, coms, titulo = 'Contacts' }: {
  dueno: Dueno; contactos: Contacto[]; guardar: Guardar; api: Api; coms: Coms; titulo?: string;
}) {
  const [nuevo, setNuevo] = useState<null | { nombre: string; rol: string; email: string; telefono: string; canal: string }>(null);
  const registro = dueno.festival_id ?? dueno.organizacion_id!;

  async function hacerPrincipal(c: Contacto) {
    await guardar(async () => {
      for (const otro of contactos.filter((x) => x.principal && x.id !== c.id)) await api.actualizarContacto(otro.id, { principal: false });
      await api.actualizarContacto(c.id, { principal: true });
    }, 'Main contact updated');
  }

  return (
    <Seccion titulo={titulo} extra={<Comentarios lista={coms(registro, 'contactos')} />}>
      {contactos.length === 0 && <p className="tenue">No contacts yet.</p>}
      {contactos.length > 0 && (
        <div className="tabla-scroll sin-marco"><table className="tabla compacta">
          <thead><tr><th>Main</th><th>Name / role</th><th>Email</th><th>Phone</th><th>Channel</th><th></th></tr></thead>
          <tbody>
            {contactos.map((c) => (
              <tr key={c.id} className={c.baja_en ? 'baja' : ''}>
                <td><input type="radio" name={`principal-${registro}`} checked={c.principal} disabled={!!c.baja_en} onChange={() => hacerPrincipal(c)} /></td>
                <td>{c.nombre ?? <span className="tenue">Generic inbox</span>}{c.rol && <small className="tenue"> · {c.rol}</small>}</td>
                <td>{c.email ?? '—'}{c.verificar && <span className="etiqueta aviso" title={c.motivo_verificar ?? ''}>Verify</span>}<Comentarios lista={coms(c.id, 'email')} /></td>
                <td>{c.telefono ?? '—'}</td>
                <td>{label(CANALES, c.canal_preferido)}</td>
                <td>{c.baja_en
                  ? <span className="tenue">Unsubscribed {fechaTexto(c.baja_en)}</span>
                  : <button className="btn-sec chico" onClick={() => {
                      if (confirm(`Mark ${c.email ?? c.telefono} as unsubscribed? We will not contact them again.`)) {
                        void guardar(() => api.actualizarContacto(c.id, { baja_en: hoy(), principal: false }), 'Contact unsubscribed');
                      }
                    }}>Unsubscribe</button>}
                  {c.verificar && <button className="btn-sec chico" onClick={() => guardar(() => api.actualizarContacto(c.id, { verificar: false }), 'Marked as verified')}>Verified</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {!nuevo && <button className="btn-sec" onClick={() => setNuevo({ nombre: '', rol: '', email: '', telefono: '', canal: 'email' })}>Add contact</button>}
      {nuevo && (
        <div className="form">
          <label>Name<input value={nuevo.nombre} onChange={(x) => setNuevo({ ...nuevo, nombre: x.target.value })} /></label>
          <label>Role<input value={nuevo.rol} onChange={(x) => setNuevo({ ...nuevo, rol: x.target.value })} /></label>
          <label>Email<input type="email" value={nuevo.email} onChange={(x) => setNuevo({ ...nuevo, email: x.target.value })} /></label>
          <label>Phone<input value={nuevo.telefono} onChange={(x) => setNuevo({ ...nuevo, telefono: x.target.value })} /></label>
          <label>Preferred channel<Opciones valor={nuevo.canal} cambiar={(v) => setNuevo({ ...nuevo, canal: v })} opciones={CANALES} /></label>
          <div className="ancho acciones">
            <button className="btn-sec" onClick={() => setNuevo(null)}>Cancel</button>
            <button disabled={!nuevo.email && !nuevo.telefono} onClick={async () => {
              await guardar(() => api.crearContacto({
                ...dueno, nombre: vacio(nuevo.nombre), rol: vacio(nuevo.rol), email: vacio(nuevo.email)?.toLowerCase() ?? null,
                telefono: vacio(nuevo.telefono), canal_preferido: nuevo.canal || null, primer_contacto_en: null, baja_en: null,
                verificar: false, motivo_verificar: null, notas: null, principal: !contactos.some((c) => c.principal && !c.baja_en),
              }), 'Contact added');
              setNuevo(null);
            }}>Save contact</button>
          </div>
        </div>
      )}
    </Seccion>
  );
}
