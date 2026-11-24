import { useCallback, useEffect, useState } from 'react';
import type { Api } from '../data/api.ts';
import { recalcularFestival } from '../data/recalcular.ts';
import type { Comentario, Contacto, Edicion, Estado, Experiencia, Festival, Interaccion, Organizacion, Vinculo } from '../types.ts';
import {
  COSTES, ESTADOS, ESTADO_AYUDA, EXPERIENCIAS, FACTORES, GENEROS, IDIOMAS, METODOS_CONV, PAISES,
  PENDIENTES, PUBLICOS, ROLES_ORG, TIPOS, TIPOS_ORG, aforoTexto, fechaTexto, label, siNo,
} from '../labels.ts';
import { Puntuacion } from './Lista.tsx';
import {
  Comentarios, Dato, Enlace, Multiples, Opciones, Seccion, TRI, deTri, num, triEstado, vacio, type Coms, type Guardar,
} from '../components/ui.tsx';
import { SeccionContactos } from '../components/Contactos.tsx';
import { SeccionHistorial } from '../components/Historial.tsx';

interface Datos {
  f: Festival;
  todos: Festival[];
  ediciones: Edicion[];
  contactos: Contacto[];
  interacciones: Interaccion[];
  comentarios: Comentario[];
  organizaciones: Organizacion[];
  vinculos: Vinculo[];
  /** Contactos de las organizaciones vinculadas */
  contactosOrg: Contacto[];
}

export function Ficha({ api, id }: { api: Api; id: string }) {
  const [d, setD] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [todos, ediciones, contactos, interacciones, organizaciones, vinculos] = await Promise.all([
      api.festivales(), api.ediciones(id), api.contactos({ festival_id: id }), api.interacciones({ festival_id: id }),
      api.organizaciones(), api.vinculos({ festival_id: id }),
    ]);
    const f = todos.find((x) => x.id === id);
    if (!f) throw new Error('Festival not found');
    const orgIds = [...new Set(vinculos.map((v) => v.organizacion_id))];
    const contactosOrg = (await Promise.all(orgIds.map((o) => api.contactos({ organizacion_id: o })))).flat();
    const comentarios = await api.comentarios([id, ...ediciones.map((e) => e.id), ...contactos.map((c) => c.id)]);
    setD({ f, todos, ediciones, contactos, interacciones, comentarios, organizaciones, vinculos, contactosOrg });
  }, [api, id]);

  useEffect(() => { cargar().catch((e: Error) => setError(e.message)); }, [cargar]);

  /** Guarda, recalcula puntuación y pendientes, y recarga. */
  const guardar = useCallback(async (accion: () => Promise<void>, mensaje = 'Saved') => {
    setError(null);
    try {
      await accion();
      await recalcularFestival(api, id);
      await cargar();
      setAviso(mensaje);
      setTimeout(() => setAviso(null), 2500);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [api, id, cargar]);

  if (error && !d) return <p className="error">{error}</p>;
  if (!d) return <p className="tenue">Loading…</p>;

  const ordenadas = [...d.ediciones].sort((a, b) => a.anio - b.anio);
  const objetivo = ordenadas[ordenadas.length - 1];
  const pasadas = ordenadas.slice(0, -1).reverse();
  // Organización que gestiona la comida (si hay) y su contacto principal
  const vGestora = d.vinculos.find((v) => v.rol === 'gestion_comida');
  const orgGestora = vGestora ? d.organizaciones.find((o) => o.id === vGestora.organizacion_id) : undefined;
  const gestora = orgGestora ? { org: orgGestora, contacto: d.contactosOrg.find((c) => c.organizacion_id === orgGestora.id && c.principal && !c.baja_en) } : undefined;
  const coms = (registro: string, campo: string | null) =>
    d.comentarios.filter((c) => c.registro_id === registro && c.campo === campo && !c.resuelto);

  return (
    <article className="ficha">
      <a href="#/" className="volver">← All festivals</a>
      <div className="titulo-fila">
        <h1>{d.f.nombre}</h1>
        <div className="titulo-chips">
          {objetivo && <span className={`estado estado-${objetivo.estado}`}>{label(ESTADOS, objetivo.estado)}</span>}
          {d.f.fuera_de_alcance && <span className="etiqueta gris">Out of scope</span>}
          <Comentarios lista={coms(d.f.id, null)} />
        </div>
      </div>
      {d.f.campos_pendientes.length > 0 && (
        <p className="pendientes">Missing: {d.f.campos_pendientes.map((p) => label(PENDIENTES, p)).join(' · ')}</p>
      )}
      {aviso && <p className="ok">{aviso}</p>}
      {error && <p className="error">{error}</p>}

      <div className="columnas">
        <div>
          {objetivo && <SeccionTemporada e={objetivo} f={d.f} contactos={d.contactos} gestora={gestora} guardar={guardar} api={api} coms={coms} />}
          <SeccionOrganizaciones f={d.f} organizaciones={d.organizaciones} vinculos={d.vinculos} contactosOrg={d.contactosOrg} guardar={guardar} api={api} />
          <SeccionFestival f={d.f} todos={d.todos} guardar={guardar} api={api} coms={coms} />
          <SeccionContactos dueno={{ festival_id: d.f.id, organizacion_id: null }} contactos={d.contactos} guardar={guardar} api={api} coms={coms} />
          <SeccionHistorial festival={d.f} objetivos={objetivo ? { [d.f.id]: objetivo } : {}} ediciones={ordenadas}
            contactos={[...d.contactos, ...d.contactosOrg]} interacciones={d.interacciones} festivales={d.todos}
            organizaciones={d.organizaciones} guardar={guardar} api={api} />
        </div>
        <aside>
          {objetivo && <SeccionPuntuacion e={objetivo} />}
          <SeccionPasadas pasadas={pasadas} guardar={guardar} api={api} coms={coms} />
        </aside>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Temporada objetivo
// ---------------------------------------------------------------------------

function SeccionTemporada({ e, f, contactos, gestora, guardar, api, coms }: {
  e: Edicion; f: Festival; contactos: Contacto[]; gestora: { org: Organizacion; contacto: Contacto | undefined } | undefined;
  guardar: Guardar; api: Api; coms: Coms;
}) {
  const [editando, setEditando] = useState(false);
  const [b, setB] = useState(() => borradorEdicion(e));
  useEffect(() => setB(borradorEdicion(e)), [e]);
  const set = (k: keyof ReturnType<typeof borradorEdicion>, v: string) => setB((p) => ({ ...p, [k]: v }));
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [motivo, setMotivo] = useState('');
  const principal = contactos.find((c) => c.principal && !c.baja_en);

  async function cambiarEstado() {
    if (!nuevoEstado) return;
    await guardar(() => api.crearInteraccion({
      festival_id: f.id, organizacion_id: null, edicion_id: e.id, contacto_id: null, tipo: 'nota_interna', fecha: new Date().toISOString().slice(0, 10),
      asunto: `Status: ${label(ESTADOS, e.estado)} → ${label(ESTADOS, nuevoEstado)}`, cuerpo: vacio(motivo),
      estado_resultante: nuevoEstado as Estado, origen: 'manual',
    }), 'Status updated');
    setNuevoEstado(''); setMotivo('');
  }

  async function enviar() {
    await guardar(() => api.actualizarEdicion(e.id, {
      fecha_inicio: vacio(b.fecha_inicio), fecha_fin: vacio(b.fecha_fin), fechas_texto: vacio(b.fechas_texto),
      duracion_dias: num(b.duracion_dias), aforo_min: num(b.aforo_min), aforo_max: num(b.aforo_max),
      proxima_accion: vacio(b.proxima_accion), proxima_accion_fecha: vacio(b.proxima_accion_fecha),
      conv_apertura: vacio(b.conv_apertura), conv_cierre: vacio(b.conv_cierre), conv_metodo: vacio(b.conv_metodo),
      conv_url: vacio(b.conv_url), conv_notas: vacio(b.conv_notas), conv_fuente_url: vacio(b.conv_fuente_url),
      conv_revisado_en: vacio(b.conv_revisado_en), coste_tipo: vacio(b.coste_tipo), coste_notas: vacio(b.coste_notas),
      exclusividad: triEstado(b.exclusividad), prioridad_antiguos: triEstado(b.prioridad_antiguos),
      acepta_food_trucks: triEstado(b.acepta_food_trucks),
    }));
    setEditando(false);
  }

  return (
    <Seccion titulo={`Season ${e.anio}`} editando={editando} setEditando={setEditando} guardar={enviar}>
      <div className="estado-cambio">
        <span>Status: <b className={`estado estado-${e.estado}`}>{label(ESTADOS, e.estado)}</b><Comentarios lista={coms(e.id, 'estado')} /></span>
        <select value={nuevoEstado} onChange={(x) => setNuevoEstado(x.target.value)}>
          <option value="">Change status…</option>
          {Object.entries(ESTADOS).filter(([k]) => k !== e.estado).map(([k, t]) => (
            <option key={k} value={k}>{t}{ESTADO_AYUDA[k] ? ` (${ESTADO_AYUDA[k]})` : ''}</option>
          ))}
        </select>
        {nuevoEstado && <>
          <input placeholder="Reason / note (optional)" value={motivo} onChange={(x) => setMotivo(x.target.value)} />
          <button onClick={cambiarEstado}>Update</button>
        </>}
      </div>

      {!editando ? (
        <dl className="datos">
          <Dato t="Next action">{e.proxima_accion ? <>{e.proxima_accion_fecha && <b>{fechaTexto(e.proxima_accion_fecha)} · </b>}{e.proxima_accion}</> : '—'}</Dato>
          <Dato t="Who to contact">{gestora
            ? <>Via <a href={`#/organizacion/${gestora.org.id}`}>{gestora.org.nombre}</a>{gestora.contacto && <>: {gestora.contacto.nombre ? `${gestora.contacto.nombre} · ` : ''}{gestora.contacto.email ?? gestora.contacto.telefono}</>}</>
            : principal ? principal.email ?? principal.telefono : <span className="tenue">Not chosen</span>}</Dato>
          <Dato t="Dates">{e.fecha_inicio ? `${fechaTexto(e.fecha_inicio)} – ${fechaTexto(e.fecha_fin)}` : e.fechas_texto ?? '—'}</Dato>
          <Dato t="Days">{e.duracion_dias ?? '—'}</Dato>
          <Dato t="Capacity">{aforoTexto(e.aforo_min, e.aforo_max)}</Dato>
          {e.recontactos > 0 && <Dato t="Follow-ups sent">{e.recontactos}{e.proximo_recontacto && ` · next ${fechaTexto(e.proximo_recontacto)}`}</Dato>}
          <Dato t="Applications open">{fechaTexto(e.conv_apertura)}</Dato>
          <Dato t="Applications close">{fechaTexto(e.conv_cierre)}</Dato>
          <Dato t="How to apply">{label(METODOS_CONV, e.conv_metodo)}</Dato>
          <Dato t="Application link"><Enlace url={e.conv_url} /></Dato>
          <Dato t="Food trucks accepted" comentarios={coms(e.id, 'acepta_food_trucks')}>{siNo(e.acepta_food_trucks)}</Dato>
          <Dato t="Returning vendors first">{siNo(e.prioridad_antiguos)}</Dato>
          <Dato t="Exclusivity">{siNo(e.exclusividad)}</Dato>
          <Dato t="Fee">{label(COSTES, e.coste_tipo)}{e.coste_notas && ` · ${e.coste_notas}`}</Dato>
          <Dato t="Application notes">{e.conv_notas ?? '—'}</Dato>
          <Dato t="Checked on">{fechaTexto(e.conv_revisado_en)}{e.conv_fuente_url && <> · <Enlace url={e.conv_fuente_url} /></>}</Dato>
        </dl>
      ) : (
        <div className="form">
          <label>Next action<input value={b.proxima_accion} onChange={(x) => set('proxima_accion', x.target.value)} /></label>
          <label>Next action date<input type="date" value={b.proxima_accion_fecha} onChange={(x) => set('proxima_accion_fecha', x.target.value)} /></label>
          <label>Start date<input type="date" value={b.fecha_inicio} onChange={(x) => set('fecha_inicio', x.target.value)} /></label>
          <label>End date<input type="date" value={b.fecha_fin} onChange={(x) => set('fecha_fin', x.target.value)} /></label>
          <label>Dates (free text)<input value={b.fechas_texto} onChange={(x) => set('fechas_texto', x.target.value)} placeholder="e.g. mid July" /></label>
          <label>Days<input type="number" min={1} value={b.duracion_dias} onChange={(x) => set('duracion_dias', x.target.value)} /></label>
          <label>Capacity min<input type="number" min={0} value={b.aforo_min} onChange={(x) => set('aforo_min', x.target.value)} /></label>
          <label>Capacity max<input type="number" min={0} value={b.aforo_max} onChange={(x) => set('aforo_max', x.target.value)} /></label>
          <label>Applications open<input type="date" value={b.conv_apertura} onChange={(x) => set('conv_apertura', x.target.value)} /></label>
          <label>Applications close<input type="date" value={b.conv_cierre} onChange={(x) => set('conv_cierre', x.target.value)} /></label>
          <label>How to apply<Opciones valor={b.conv_metodo} cambiar={(v) => set('conv_metodo', v)} opciones={METODOS_CONV} /></label>
          <label>Application link<input value={b.conv_url} onChange={(x) => set('conv_url', x.target.value)} /></label>
          <label>Food trucks accepted<Opciones valor={b.acepta_food_trucks} cambiar={(v) => set('acepta_food_trucks', v)} opciones={TRI} vacioTexto="Unknown" /></label>
          <label>Returning vendors first<Opciones valor={b.prioridad_antiguos} cambiar={(v) => set('prioridad_antiguos', v)} opciones={TRI} vacioTexto="Unknown" /></label>
          <label>Exclusivity<Opciones valor={b.exclusividad} cambiar={(v) => set('exclusividad', v)} opciones={TRI} vacioTexto="Unknown" /></label>
          <label>Fee type<Opciones valor={b.coste_tipo} cambiar={(v) => set('coste_tipo', v)} opciones={COSTES} /></label>
          <label>Fee notes<input value={b.coste_notas} onChange={(x) => set('coste_notas', x.target.value)} /></label>
          <label>Source link<input value={b.conv_fuente_url} onChange={(x) => set('conv_fuente_url', x.target.value)} /></label>
          <label>Checked on<input type="date" value={b.conv_revisado_en} onChange={(x) => set('conv_revisado_en', x.target.value)} /></label>
          <label className="ancho">Application notes<textarea value={b.conv_notas} onChange={(x) => set('conv_notas', x.target.value)} /></label>
        </div>
      )}
    </Seccion>
  );
}

function borradorEdicion(e: Edicion) {
  const s = (v: string | number | null) => (v == null ? '' : String(v));
  return {
    fecha_inicio: s(e.fecha_inicio), fecha_fin: s(e.fecha_fin), fechas_texto: s(e.fechas_texto),
    duracion_dias: s(e.duracion_dias), aforo_min: s(e.aforo_min), aforo_max: s(e.aforo_max),
    proxima_accion: s(e.proxima_accion), proxima_accion_fecha: s(e.proxima_accion_fecha),
    conv_apertura: s(e.conv_apertura), conv_cierre: s(e.conv_cierre), conv_metodo: s(e.conv_metodo),
    conv_url: s(e.conv_url), conv_notas: s(e.conv_notas), conv_fuente_url: s(e.conv_fuente_url),
    conv_revisado_en: s(e.conv_revisado_en), coste_tipo: s(e.coste_tipo), coste_notas: s(e.coste_notas),
    exclusividad: deTri(e.exclusividad), prioridad_antiguos: deTri(e.prioridad_antiguos), acepta_food_trucks: deTri(e.acepta_food_trucks),
  };
}

// ---------------------------------------------------------------------------
// Datos del festival
// ---------------------------------------------------------------------------

function SeccionFestival({ f, todos, guardar, api, coms }: { f: Festival; todos: Festival[]; guardar: Guardar; api: Api; coms: Coms }) {
  const [editando, setEditando] = useState(false);
  const [b, setB] = useState(f);
  useEffect(() => setB(f), [f]);
  const set = <K extends keyof Festival>(k: K, v: Festival[K]) => setB((p) => ({ ...p, [k]: v }));
  const parecidos = todos.filter((x) => f.parecido_a.includes(x.id));

  async function enviar() {
    await guardar(() => api.actualizarFestival(f.id, {
      nombre: b.nombre.trim() || f.nombre, pais: b.pais || null, ciudad: vacio(b.ciudad ?? ''), tipo: b.tipo,
      generos: b.generos, perfil_publico: b.perfil_publico, notas_publico: vacio(b.notas_publico ?? ''),
      web_url: vacio(b.web_url ?? ''), formulario_contacto_url: vacio(b.formulario_contacto_url ?? ''),
      instagram_url: vacio(b.instagram_url ?? ''), idioma_correo: b.idioma_correo || null,
      fuera_de_alcance: b.fuera_de_alcance, notas: vacio(b.notas ?? ''), acampada: b.acampada, parecido_a: b.parecido_a,
    }));
    setEditando(false);
  }

  return (
    <Seccion titulo="Festival" editando={editando} setEditando={setEditando} guardar={enviar}>
      {!editando ? (
        <dl className="datos">
          <Dato t="Country">{label(PAISES, f.pais)}</Dato>
          <Dato t="City">{f.ciudad ?? '—'}</Dato>
          <Dato t="Event type">{label(TIPOS, f.tipo)}</Dato>
          <Dato t="Camping">{siNo(f.acampada)}</Dato>
          <Dato t="Genres">{f.generos.map((g) => label(GENEROS, g)).join(', ') || '—'}</Dato>
          <Dato t="Audience">{f.perfil_publico.map((p) => label(PUBLICOS, p)).join(', ') || '—'}</Dato>
          <Dato t="Audience notes">{f.notas_publico ?? '—'}</Dato>
          <Dato t="Similar to">{parecidos.length ? parecidos.map((p, i) => <span key={p.id}>{i > 0 && ', '}<a href={`#/festival/${p.id}`}>{p.nombre}</a></span>) : '—'}</Dato>
          <Dato t="Website"><Enlace url={f.web_url} /></Dato>
          <Dato t="Contact form"><Enlace url={f.formulario_contacto_url} /></Dato>
          <Dato t="Instagram"><Enlace url={f.instagram_url} /></Dato>
          <Dato t="Email language">{label(IDIOMAS, f.idioma_correo)}</Dato>
          <Dato t="In scope">{f.fuera_de_alcance ? 'No (outside Portugal/Spain)' : 'Yes'}</Dato>
          <Dato t="Notes" comentarios={coms(f.id, 'notas')}><span className="multilinea">{f.notas ?? '—'}</span></Dato>
        </dl>
      ) : (
        <div className="form">
          <label>Name<input value={b.nombre} onChange={(x) => set('nombre', x.target.value)} /></label>
          <label>Country<Opciones valor={b.pais ?? ''} cambiar={(v) => set('pais', v || null)} opciones={PAISES} /></label>
          <label>City<input value={b.ciudad ?? ''} onChange={(x) => set('ciudad', x.target.value)} /></label>
          <label>Event type<Opciones valor={b.tipo} cambiar={(v) => set('tipo', v || 'musica')} opciones={TIPOS} /></label>
          <label>Camping<Opciones valor={deTri(b.acampada)} cambiar={(v) => set('acampada', triEstado(v))} opciones={TRI} vacioTexto="Unknown" /></label>
          <label>Email language<Opciones valor={b.idioma_correo ?? ''} cambiar={(v) => set('idioma_correo', v || null)} opciones={IDIOMAS} /></label>
          <label>Website<input value={b.web_url ?? ''} onChange={(x) => set('web_url', x.target.value)} /></label>
          <label>Contact form<input value={b.formulario_contacto_url ?? ''} onChange={(x) => set('formulario_contacto_url', x.target.value)} /></label>
          <label>Instagram<input value={b.instagram_url ?? ''} onChange={(x) => set('instagram_url', x.target.value)} /></label>
          <label className="check ancho"><input type="checkbox" checked={b.fuera_de_alcance} onChange={(x) => set('fuera_de_alcance', x.target.checked)} />Out of scope (outside Portugal/Spain)</label>
          <fieldset className="ancho"><legend>Genres</legend><Multiples valores={b.generos} cambiar={(v) => set('generos', v)} opciones={GENEROS} /></fieldset>
          <fieldset className="ancho"><legend>Audience</legend><Multiples valores={b.perfil_publico} cambiar={(v) => set('perfil_publico', v)} opciones={PUBLICOS} /></fieldset>
          <label className="ancho">Audience notes<textarea value={b.notas_publico ?? ''} onChange={(x) => set('notas_publico', x.target.value)} /></label>
          <label className="ancho">Similar to
            <select multiple value={b.parecido_a} onChange={(x) => set('parecido_a', [...x.target.selectedOptions].map((o) => o.value))}>
              {todos.filter((x) => x.id !== f.id && !x.fuera_de_alcance).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
            <small className="tenue">Ctrl/Cmd + click to select several. Reference only; does not change the score.</small>
          </label>
          <label className="ancho">Notes<textarea value={b.notas ?? ''} onChange={(x) => set('notas', x.target.value)} /></label>
        </div>
      )}
    </Seccion>
  );
}

// ---------------------------------------------------------------------------
// Puntuación
// ---------------------------------------------------------------------------

function SeccionPuntuacion({ e }: { e: Edicion }) {
  const detalle = e.puntuacion_detalle ?? {};
  return (
    <Seccion titulo="Fit score">
      <div className="punt-grande"><Puntuacion e={e} /></div>
      <p className="tenue">{e.puntuacion == null
        ? 'Not enough data: add experience, genres, audience or capacity.'
        : `${e.puntuacion_cobertura ?? 0}% of the weight is based on real data. Missing factors count as neutral (50).`}</p>
      <table className="desglose">
        <thead><tr><th>Factor</th><th>Value</th><th>Weight</th></tr></thead>
        <tbody>
          {Object.entries(FACTORES).map(([k, t]) => {
            const x = detalle[k];
            return (
              <tr key={k} className={x?.valor == null ? 'falta' : ''}>
                <td>{t}</td>
                <td>{x?.valor == null ? 'missing (50)' : Math.round(x.valor)}</td>
                <td>{x ? `${Math.round(x.peso * 100)}%` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Seccion>
  );
}

// ---------------------------------------------------------------------------
// Temporadas pasadas (experiencia)
// ---------------------------------------------------------------------------

function SeccionPasadas({ pasadas, guardar, api, coms }: { pasadas: Edicion[]; guardar: Guardar; api: Api; coms: Coms }) {
  if (pasadas.length === 0) return null;
  return (
    <Seccion titulo="Past seasons">
      {pasadas.map((e) => <Pasada key={e.id} e={e} guardar={guardar} api={api} coms={coms} />)}
    </Seccion>
  );
}

function Pasada({ e, guardar, api, coms }: { e: Edicion; guardar: Guardar; api: Api; coms: Coms }) {
  const [editando, setEditando] = useState(false);
  const [exp, setExp] = useState(e.experiencia ?? '');
  const [com, setCom] = useState(e.comentario_experiencia ?? '');
  useEffect(() => { setExp(e.experiencia ?? ''); setCom(e.comentario_experiencia ?? ''); }, [e]);

  return (
    <div className="pasada">
      <div className="pasada-cab">
        <b>{e.anio}</b>
        <span className={`estado estado-${e.estado}`}>{label(ESTADOS, e.estado)}</span>
        <Comentarios lista={coms(e.id, 'estado')} />
        {!editando && <button className="btn-sec chico" onClick={() => setEditando(true)}>Edit</button>}
      </div>
      <p className="tenue">{e.fecha_inicio ? `${fechaTexto(e.fecha_inicio)} – ${fechaTexto(e.fecha_fin)}` : e.fechas_texto ?? 'Dates unknown'} · {aforoTexto(e.aforo_min, e.aforo_max)}</p>
      {!editando ? (
        e.experiencia
          ? <p><span className={`exp exp-${e.experiencia}`}>{label(EXPERIENCIAS, e.experiencia)}</span>{e.comentario_experiencia && <> {e.comentario_experiencia}</>}</p>
          : <p className="tenue">No experience recorded.</p>
      ) : (
        <div className="form">
          <label className="ancho">Our experience<Opciones valor={exp} cambiar={setExp} opciones={EXPERIENCIAS} vacioTexto="Did not take part / not rated" /></label>
          <label className="ancho">Comment<textarea value={com} onChange={(x) => setCom(x.target.value)} /></label>
          <div className="ancho acciones">
            <button className="btn-sec" onClick={() => setEditando(false)}>Cancel</button>
            <button onClick={async () => {
              await guardar(() => api.actualizarEdicion(e.id, { experiencia: (exp || null) as Experiencia | null, comentario_experiencia: vacio(com) }));
              setEditando(false);
            }}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Organizaciones vinculadas (gestora de comida, productora…)
// ---------------------------------------------------------------------------

function SeccionOrganizaciones({ f, organizaciones, vinculos, contactosOrg, guardar, api }: {
  f: Festival; organizaciones: Organizacion[]; vinculos: Vinculo[]; contactosOrg: Contacto[]; guardar: Guardar; api: Api;
}) {
  const [nuevo, setNuevo] = useState<null | { org: string; nombreNueva: string; tipoNueva: string; rol: string }>(null);

  async function vincular(n: NonNullable<typeof nuevo>) {
    await guardar(async () => {
      let orgId = n.org;
      if (orgId === '__nueva') orgId = await api.crearOrganizacion({ nombre: n.nombreNueva.trim(), tipo: n.tipoNueva, web_url: null, notas: null });
      await api.crearVinculo({ festival_id: f.id, organizacion_id: orgId, rol: n.rol, notas: null });
    }, 'Organisation linked');
    setNuevo(null);
  }

  return (
    <Seccion titulo="Organisations" extra={!nuevo && <button className="btn-sec" onClick={() => setNuevo({ org: '', nombreNueva: '', tipoNueva: 'gestora_comida', rol: 'gestion_comida' })}>Link organisation</button>}>
      {vinculos.length === 0 && !nuevo && <p className="tenue">No organisation linked. Link one if a company manages food vendors or produces this festival.</p>}
      {vinculos.length > 0 && (
        <ul className="lista-simple">
          {vinculos.map((v) => {
            const o = organizaciones.find((x) => x.id === v.organizacion_id);
            const c = contactosOrg.find((x) => x.organizacion_id === v.organizacion_id && x.principal && !x.baja_en);
            if (!o) return null;
            return (
              <li key={`${v.organizacion_id}-${v.rol}`}>
                <a href={`#/organizacion/${o.id}`}><b>{o.nombre}</b></a> <span className="etiqueta">{label(ROLES_ORG, v.rol)}</span>
                {c && <span className="tenue"> · {c.nombre ? `${c.nombre} · ` : ''}{c.email ?? c.telefono}</span>}
                <button className="btn-sec chico" onClick={() => {
                  if (confirm(`Unlink ${o.nombre} from ${f.nombre}?`)) void guardar(() => api.borrarVinculo(v), 'Organisation unlinked');
                }}>Unlink</button>
              </li>
            );
          })}
        </ul>
      )}
      {nuevo && (
        <div className="form">
          <label>Organisation<select value={nuevo.org} onChange={(x) => setNuevo({ ...nuevo, org: x.target.value })}>
            <option value="">Choose…</option>
            {organizaciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            <option value="__nueva">+ New organisation</option>
          </select></label>
          {nuevo.org === '__nueva' && <>
            <label>Name<input value={nuevo.nombreNueva} onChange={(x) => setNuevo({ ...nuevo, nombreNueva: x.target.value })} /></label>
            <label>Type<Opciones valor={nuevo.tipoNueva} cambiar={(v) => setNuevo({ ...nuevo, tipoNueva: v || 'otro' })} opciones={TIPOS_ORG} /></label>
          </>}
          <label>Role in this festival<Opciones valor={nuevo.rol} cambiar={(v) => setNuevo({ ...nuevo, rol: v || 'otro' })} opciones={ROLES_ORG} /></label>
          <div className="ancho acciones">
            <button className="btn-sec" onClick={() => setNuevo(null)}>Cancel</button>
            <button disabled={!nuevo.org || (nuevo.org === '__nueva' && !nuevo.nombreNueva.trim())} onClick={() => vincular(nuevo)}>Link</button>
          </div>
        </div>
      )}
    </Seccion>
  );
}
