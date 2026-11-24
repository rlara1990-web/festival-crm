import { useCallback, useEffect, useState } from 'react';
import type { Api } from '../data/api.ts';
import { recalcularFestival } from '../data/recalcular.ts';
import type { Comentario, Contacto, Edicion, Festival, Interaccion, Organizacion as Org, Vinculo } from '../types.ts';
import { ESTADOS, ROLES_ORG, TIPOS_ORG, label } from '../labels.ts';
import { Dato, Enlace, Opciones, Seccion, vacio, type Guardar } from '../components/ui.tsx';
import { SeccionContactos } from '../components/Contactos.tsx';
import { SeccionHistorial } from '../components/Historial.tsx';
import { Puntuacion } from './Lista.tsx';

interface Datos {
  o: Org;
  organizaciones: Org[];
  festivales: Festival[];
  vinculos: Vinculo[];
  ediciones: Edicion[];
  contactos: Contacto[];
  interacciones: Interaccion[];
  comentarios: Comentario[];
}

export function Organizacion({ api, id }: { api: Api; id: string }) {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [organizaciones, festivales, vinculos, ediciones, contactos, interacciones] = await Promise.all([
      api.organizaciones(), api.festivales(), api.vinculos({ organizacion_id: id }), api.ediciones(),
      api.contactos({ organizacion_id: id }), api.interacciones({ organizacion_id: id }),
    ]);
    const o = organizaciones.find((x) => x.id === id);
    if (!o) throw new Error('Organisation not found');
    const comentarios = await api.comentarios([id, ...contactos.map((c) => c.id)]);
    setD({ o, organizaciones, festivales, vinculos, ediciones, contactos, interacciones, comentarios });
  }, [api, id]);

  useEffect(() => { cargar().catch((e: Error) => setError(e.message)); }, [cargar]);

  const guardar: Guardar = useCallback(async (accion, mensaje = 'Saved') => {
    setError(null);
    try {
      await accion();
      // Los festivales que gestiona pueden cambiar su lista de pendientes (contacto)
      const vs = await api.vinculos({ organizacion_id: id });
      for (const fid of new Set(vs.map((v) => v.festival_id))) await recalcularFestival(api, fid);
      await cargar();
      setAviso(mensaje);
      setTimeout(() => setAviso(null), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, id, cargar]);

  if (error && !d) return <p className="error">{error}</p>;
  if (!d) return <p className="tenue">Loading…</p>;

  const objetivos: Record<string, Edicion> = {};
  for (const e of d.ediciones) if (!objetivos[e.festival_id] || objetivos[e.festival_id]!.anio < e.anio) objetivos[e.festival_id] = e;
  const susFestivales = d.festivales.filter((f) => d.vinculos.some((v) => v.festival_id === f.id));
  const coms = (registro: string, campo: string | null) =>
    d.comentarios.filter((c) => c.registro_id === registro && c.campo === campo && !c.resuelto);

  return (
    <article className="ficha">
      <a href="#/organizaciones" className="volver">← All organisations</a>
      <div className="titulo-fila">
        <h1>{d.o.nombre}</h1>
        <span className="etiqueta">{label(TIPOS_ORG, d.o.tipo)}</span>
      </div>
      {aviso && <p className="ok">{aviso}</p>}
      {error && <p className="error">{error}</p>}
      <div className="columnas">
        <div>
          <SeccionFestivalesOrg o={d.o} festivales={d.festivales} vinculos={d.vinculos} objetivos={objetivos} guardar={guardar} api={api} />
          <SeccionContactos dueno={{ festival_id: null, organizacion_id: d.o.id }} contactos={d.contactos} guardar={guardar} api={api} coms={coms} />
          <SeccionHistorial organizacion={d.o} objetivos={objetivos} ediciones={d.ediciones} contactos={d.contactos}
            interacciones={d.interacciones} festivales={susFestivales} organizaciones={d.organizaciones} guardar={guardar} api={api} />
        </div>
        <aside>
          <SeccionDatosOrg o={d.o} guardar={guardar} api={api} />
        </aside>
      </div>
    </article>
  );
}

function SeccionDatosOrg({ o, guardar, api }: { o: Org; guardar: Guardar; api: Api }) {
  const [editando, setEditando] = useState(false);
  const [b, setB] = useState(o);
  useEffect(() => setB(o), [o]);
  return (
    <Seccion titulo="Details" editando={editando} setEditando={setEditando} guardar={async () => {
      await guardar(() => api.actualizarOrganizacion(o.id, {
        nombre: b.nombre.trim() || o.nombre, tipo: b.tipo, web_url: vacio(b.web_url ?? ''), notas: vacio(b.notas ?? ''),
      }));
      setEditando(false);
    }}>
      {!editando ? (
        <dl className="datos">
          <Dato t="Type">{label(TIPOS_ORG, o.tipo)}</Dato>
          <Dato t="Website"><Enlace url={o.web_url} /></Dato>
          <Dato t="Notes"><span className="multilinea">{o.notas ?? '—'}</span></Dato>
        </dl>
      ) : (
        <div className="form">
          <label className="ancho">Name<input value={b.nombre} onChange={(x) => setB({ ...b, nombre: x.target.value })} /></label>
          <label className="ancho">Type<Opciones valor={b.tipo} cambiar={(v) => setB({ ...b, tipo: v || 'otro' })} opciones={TIPOS_ORG} /></label>
          <label className="ancho">Website<input value={b.web_url ?? ''} onChange={(x) => setB({ ...b, web_url: x.target.value })} /></label>
          <label className="ancho">Notes<textarea value={b.notas ?? ''} onChange={(x) => setB({ ...b, notas: x.target.value })} /></label>
        </div>
      )}
    </Seccion>
  );
}

function SeccionFestivalesOrg({ o, festivales, vinculos, objetivos, guardar, api }: {
  o: Org; festivales: Festival[]; vinculos: Vinculo[]; objetivos: Record<string, Edicion>; guardar: Guardar; api: Api;
}) {
  const [nuevo, setNuevo] = useState<null | { festival: string; rol: string }>(null);
  return (
    <Seccion titulo="Festivals" extra={!nuevo && <button className="btn-sec" onClick={() => setNuevo({ festival: '', rol: 'gestion_comida' })}>Link festival</button>}>
      {vinculos.length === 0 && !nuevo && <p className="tenue">No festivals linked yet.</p>}
      {vinculos.length > 0 && (
        <div className="tabla-scroll sin-marco"><table className="tabla compacta">
          <thead><tr><th>Festival</th><th>Role</th><th>Status</th><th>Fit score</th><th></th></tr></thead>
          <tbody>
            {vinculos.map((v) => {
              const f = festivales.find((x) => x.id === v.festival_id);
              const e = objetivos[v.festival_id];
              if (!f) return null;
              return (
                <tr key={`${v.festival_id}-${v.rol}`}>
                  <td><a href={`#/festival/${f.id}`}>{f.nombre}</a></td>
                  <td>{label(ROLES_ORG, v.rol)}</td>
                  <td>{e ? <span className={`estado estado-${e.estado}`}>{label(ESTADOS, e.estado)}</span> : '—'}</td>
                  <td><Puntuacion e={e} /></td>
                  <td><button className="btn-sec chico" onClick={() => {
                    if (confirm(`Unlink ${f.nombre} from ${o.nombre}?`)) void guardar(() => api.borrarVinculo(v), 'Festival unlinked');
                  }}>Unlink</button></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
      {nuevo && (
        <div className="form">
          <label>Festival<select value={nuevo.festival} onChange={(x) => setNuevo({ ...nuevo, festival: x.target.value })}>
            <option value="">Choose…</option>
            {festivales.filter((f) => !vinculos.some((v) => v.festival_id === f.id && v.rol === nuevo.rol))
              .map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
          </select></label>
          <label>Role<Opciones valor={nuevo.rol} cambiar={(v) => setNuevo({ ...nuevo, rol: v || 'otro' })} opciones={ROLES_ORG} /></label>
          <div className="ancho acciones">
            <button className="btn-sec" onClick={() => setNuevo(null)}>Cancel</button>
            <button disabled={!nuevo.festival} onClick={async () => {
              await guardar(() => api.crearVinculo({ festival_id: nuevo.festival, organizacion_id: o.id, rol: nuevo.rol, notas: null }), 'Festival linked');
              setNuevo(null);
            }}>Link</button>
          </div>
        </div>
      )}
    </Seccion>
  );
}
