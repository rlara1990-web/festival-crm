// Postulación al festival (formulario de food vendors): preguntas y respuestas que Rodrigo y Zac
// van completando en varios días. Claude las pre-rellena desde el banco de respuestas (Ask Claude).
import { useCallback, useEffect, useState } from 'react';
import type { Api } from '../data/api.ts';
import type { Comentario, Edicion, EntradaBanco, Festival, Postulacion, RespuestaPost } from '../types.ts';
import { estadoTrasEditar, progreso, sugerencias } from '../../../src/shared/postulaciones.ts';
import { fechaTexto } from '../labels.ts';
import { ComentariosCtx, Nota, type CtxComentarios } from './Notas.tsx';
import { Enlace, Seccion, hoy, vacio } from './ui.tsx';

const ESTADOS_POST = { preparando: 'In preparation', enviada: 'Submitted', descartada: 'Not applying' } as const;
const hora = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function SeccionPostulacion({ api, f, e, alCambiarEdicion }: {
  api: Api; f: Festival; e: Edicion; alCambiarEdicion: () => Promise<void>;
}) {
  const [post, setPost] = useState<Postulacion | null | undefined>(undefined);
  const [rs, setRs] = useState<RespuestaPost[]>([]);
  const [banco, setBanco] = useState<EntradaBanco[]>([]);
  const [coms, setComs] = useState<Comentario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const p = await api.postulacion(e.id);
    const [r, b] = await Promise.all([p ? api.respuestas(p.id) : Promise.resolve([]), api.banco()]);
    // Los comentarios de las respuestas se cargan aquí (la ficha solo carga los del festival y la temporada)
    const c = r.length ? await api.comentarios(r.map((x) => x.id)) : [];
    setPost(p); setRs(r); setBanco(b); setComs(c);
  }, [api, e.id]);
  useEffect(() => { cargar().catch((x: Error) => setError(x.message)); }, [cargar]);

  async function hacer(accion: () => Promise<void>, mensaje?: string) {
    setOcupado(true); setError(null);
    try {
      await accion(); await cargar();
      if (mensaje) { setAviso(mensaje); setTimeout(() => setAviso(null), 3000); }
    } catch (x) { setError((x as Error).message); } finally { setOcupado(false); }
  }

  if (post === undefined) return null;
  const titulo = `Application ${e.anio}`;

  if (post === null) return <Seccion titulo={titulo}><Empezar api={api} f={f} e={e} hacer={hacer} ocupado={ocupado} />{error && <p className="error">{error}</p>}</Seccion>;

  const prog = progreso(rs);
  const pedirAClaude = () => hacer(() => api.crearSolicitud({
    tipo: 'preparar_postulacion', festival_id: f.id, edicion_id: e.id,
    detalle: `Read the application form${post.formulario_url ? ` (${post.formulario_url})` : ''}, add its questions and pre-fill the answers from the answer bank.`,
  }), 'Sent. Claude will pre-fill it at the next check.');

  async function copiarTodo() {
    const texto = rs.map((r, i) => `${i + 1}. ${r.pregunta}\n${r.respuesta ?? ''}`).join('\n\n');
    try { await navigator.clipboard.writeText(texto); setAviso('All answers copied'); setTimeout(() => setAviso(null), 2500); }
    catch { setError('Could not copy to the clipboard'); }
  }

  const ctxComentarios: CtxComentarios = {
    lista: coms.filter((c) => !c.resuelto),
    crear: async (tabla, registro, campo, texto) => { await api.crearComentario({ tabla, registro_id: registro, campo, texto }); await cargar(); },
    resolver: async (cid) => { await api.resolverComentario(cid); await cargar(); },
  };

  return (
    <ComentariosCtx.Provider value={ctxComentarios}>
    <Seccion titulo={titulo} extra={<span className={`etiqueta post-${post.estado}`}>{ESTADOS_POST[post.estado]}</span>}>
      <Cabecera api={api} post={post} e={e} hacer={hacer} ocupado={ocupado} alCambiarEdicion={alCambiarEdicion} />
      <div className="post-barra">
        <span className="tenue">{prog.total === 0 ? 'No questions yet.' : `${prog.revisadas} of ${prog.total} reviewed · ${prog.borrador} draft · ${prog.vacias} empty`}</span>
        <div className="acciones">
          {prog.total > 0 && <button className="btn-sec chico" onClick={copiarTodo}>Copy all answers</button>}
          {post.estado === 'preparando' && <button className="btn-sec chico" disabled={ocupado} onClick={pedirAClaude}>Ask Claude to pre-fill</button>}
          <button className="btn-sec chico" disabled={ocupado} onClick={() => hacer(async () => {})}>Refresh</button>
        </div>
      </div>
      {prog.total > 0 && <div className="post-progreso"><div style={{ width: `${(100 * prog.revisadas) / prog.total}%` }} /></div>}
      {aviso && <p className="ok">{aviso}</p>}
      {error && <p className="error">{error}</p>}
      <ol className="preguntas">
        {rs.map((r) => <Pregunta key={r.id} api={api} r={r} banco={banco} hacer={hacer} ocupado={ocupado} />)}
      </ol>
      {post.estado === 'preparando' && <NuevaPregunta api={api} post={post} orden={(rs.at(-1)?.orden ?? 0) + 1} hacer={hacer} ocupado={ocupado} />}
    </Seccion>
    </ComentariosCtx.Provider>
  );
}

type Hacer = (accion: () => Promise<void>, mensaje?: string) => Promise<void>;

function Empezar({ api, f, e, hacer, ocupado }: { api: Api; f: Festival; e: Edicion; hacer: Hacer; ocupado: boolean }) {
  const [url, setUrl] = useState(e.conv_url ?? '');
  const [limite, setLimite] = useState(e.conv_cierre ?? '');
  const [conClaude, setConClaude] = useState(true);
  return (
    <div className="form">
      <p className="tenue ancho">When the festival opens its food vendor form, start the application here. Questions and answers are saved as you go, so you can work on it over several days.</p>
      <label>Application form link<input value={url} onChange={(x) => setUrl(x.target.value)} placeholder="https://…" /></label>
      <label>Deadline<input type="date" value={limite} onChange={(x) => setLimite(x.target.value)} /></label>
      <label className="check ancho"><input type="checkbox" checked={conClaude} onChange={(x) => setConClaude(x.target.checked)} />Ask Claude to read the form and pre-fill the answers</label>
      <div className="ancho acciones">
        <button disabled={ocupado} onClick={() => hacer(async () => {
          await api.crearPostulacion({ edicion_id: e.id, festival_id: f.id, formulario_url: vacio(url), fecha_limite: vacio(limite) });
          if (conClaude) await api.crearSolicitud({ tipo: 'preparar_postulacion', festival_id: f.id, edicion_id: e.id,
            detalle: `Read the application form${vacio(url) ? ` (${url.trim()})` : ''}, add its questions and pre-fill the answers from the answer bank.` });
        }, conClaude ? 'Application started. Claude will pre-fill it at the next check.' : 'Application started')}>Start application</button>
      </div>
    </div>
  );
}

function Cabecera({ api, post, e, hacer, ocupado, alCambiarEdicion }: {
  api: Api; post: Postulacion; e: Edicion; hacer: Hacer; ocupado: boolean; alCambiarEdicion: () => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);
  const [decision, setDecision] = useState(post.decision_esperada ?? '');
  const [editando, setEditando] = useState(false);
  const [url, setUrl] = useState(post.formulario_url ?? '');
  const [limite, setLimite] = useState(post.fecha_limite ?? '');

  const marcarEnviada = () => hacer(async () => {
    const d = vacio(decision);
    await api.actualizarPostulacion(post.id, { estado: 'enviada', enviada_en: hoy(), decision_esperada: d });
    await api.crearInteraccion({
      festival_id: post.festival_id, organizacion_id: null, edicion_id: e.id, contacto_id: null, tipo: 'nota_interna', fecha: hoy(),
      asunto: 'Application form submitted', cuerpo: post.formulario_url, estado_resultante: 'convocatoria_enviada', origen: 'manual',
    });
    await api.actualizarEdicion(e.id, {
      conv_metodo: 'formulario', conv_url: post.formulario_url ?? e.conv_url,
      proxima_accion: 'Wait for the decision on our application', proxima_accion_fecha: d,
    });
    await alCambiarEdicion();
    setEnviando(false);
  }, 'Marked as submitted');

  if (editando) return (
    <div className="form">
      <label>Application form link<input value={url} onChange={(x) => setUrl(x.target.value)} /></label>
      <label>Deadline<input type="date" value={limite} onChange={(x) => setLimite(x.target.value)} /></label>
      <div className="ancho acciones">
        <button className="btn-sec" onClick={() => setEditando(false)}>Cancel</button>
        <button disabled={ocupado} onClick={() => hacer(async () => {
          await api.actualizarPostulacion(post.id, { formulario_url: vacio(url), fecha_limite: vacio(limite) }); setEditando(false);
        })}>Save</button>
      </div>
    </div>
  );

  return (
    <>
      <dl className="datos">
        <div className="dato"><dt>Form</dt><dd><Enlace url={post.formulario_url} /></dd></div>
        <div className="dato"><dt>Deadline</dt><dd>{fechaTexto(post.fecha_limite)}</dd></div>
        {post.estado === 'enviada' && <div className="dato"><dt>Submitted</dt><dd>{fechaTexto(post.enviada_en)}{post.decision_esperada && ` · decision expected ${fechaTexto(post.decision_esperada)}`}</dd></div>}
      </dl>
      <div className="acciones post-acciones">
        <button className="btn-sec chico" onClick={() => setEditando(true)}>Edit link / deadline</button>
        {post.estado === 'preparando' && !enviando && <button className="chico" onClick={() => setEnviando(true)}>Mark as submitted</button>}
        {post.estado === 'preparando' && <button className="btn-sec chico" disabled={ocupado}
          onClick={() => { if (confirm('Mark this application as "not applying"?')) void hacer(() => api.actualizarPostulacion(post.id, { estado: 'descartada' })); }}>Not applying</button>}
        {post.estado !== 'preparando' && <button className="btn-sec chico" disabled={ocupado}
          onClick={() => hacer(() => api.actualizarPostulacion(post.id, { estado: 'preparando' }))}>Reopen</button>}
      </div>
      {enviando && (
        <div className="form envio">
          <p className="tenue ancho">Only mark it once you have sent the form on the festival's website. The season will move to "Application sent".</p>
          <label>Decision expected by (optional)<input type="date" value={decision} onChange={(x) => setDecision(x.target.value)} /></label>
          <div className="ancho acciones">
            <button className="btn-sec" onClick={() => setEnviando(false)}>Cancel</button>
            <button disabled={ocupado} onClick={marcarEnviada}>Confirm: submitted</button>
          </div>
        </div>
      )}
    </>
  );
}

function Pregunta({ api, r, banco, hacer, ocupado }: { api: Api; r: RespuestaPost; banco: EntradaBanco[]; hacer: Hacer; ocupado: boolean }) {
  const [texto, setTexto] = useState(r.respuesta ?? '');
  const [guardado, setGuardado] = useState<'si' | 'guardando' | 'no'>('si');
  useEffect(() => { setTexto(r.respuesta ?? ''); setGuardado('si'); }, [r.respuesta, r.actualizado_en]);
  const cambiado = texto !== (r.respuesta ?? '');
  const sugeridas = !texto.trim() ? sugerencias(r.pregunta, banco) : [];

  async function guardar() {
    if (!cambiado) return;
    setGuardado('guardando');
    await hacer(() => api.actualizarRespuesta(r.id, { respuesta: vacio(texto), estado: estadoTrasEditar(texto, r.estado) }));
    setGuardado('si');
  }

  return (
    <li className={`pregunta est-${r.estado}`}>
      <div className="pregunta-cab">
        <b>{r.pregunta}</b>
        <Nota tabla="postulacion_respuestas" registro={r.id} campo="respuesta" />
      </div>
      {r.ayuda && <div className="tenue">{r.ayuda}</div>}
      <textarea value={texto} onChange={(x) => { setTexto(x.target.value); setGuardado('no'); }} onBlur={guardar} rows={Math.min(12, Math.max(3, texto.split('\n').length + 1))} />
      {sugeridas.length > 0 && (
        <div className="sugerencias">From the answer bank: {sugeridas.map((b) => (
          <button key={b.id} className="btn-sec chico" title={b.respuesta} disabled={ocupado}
            onClick={() => hacer(() => api.actualizarRespuesta(r.id, { respuesta: b.respuesta, estado: 'borrador', banco_id: b.id }))}>{b.tema}</button>
        ))}</div>
      )}
      <div className="pregunta-pie">
        <span className="tenue">
          {guardado === 'guardando' ? 'Saving…' : cambiado ? 'Not saved yet (click outside to save)' : `${r.estado === 'revisada' ? 'Reviewed' : r.estado === 'borrador' ? 'Draft' : 'Empty'} · edited ${hora(r.actualizado_en)}`}
        </span>
        <div className="acciones">
          {r.estado === 'borrador' && !cambiado && <button className="chico" disabled={ocupado} onClick={() => hacer(() => api.actualizarRespuesta(r.id, { estado: 'revisada' }))}>Mark reviewed</button>}
          {r.estado === 'revisada' && <button className="btn-sec chico" disabled={ocupado} onClick={() => hacer(() => api.actualizarRespuesta(r.id, { estado: 'borrador' }))}>Back to draft</button>}
          {texto.trim() && !cambiado && <button className="btn-sec chico" disabled={ocupado} onClick={() => {
            const tema = prompt('Topic for the answer bank (e.g. Concept, Menu & prices, Power)', banco.find((b) => b.id === r.banco_id)?.tema ?? '');
            if (tema?.trim()) void hacer(async () => {
              const existente = banco.find((b) => b.id === r.banco_id) ?? banco.find((b) => b.tema.trim().toLowerCase() === tema.trim().toLowerCase());
              if (existente && confirm(`Update the bank answer "${existente.tema}" with this text? (Cancel = save as a new entry)`)) {
                await api.actualizarEntradaBanco(existente.id, { respuesta: texto.trim(), tema: tema.trim() });
              } else {
                const nuevo = await api.crearEntradaBanco({ tema: tema.trim(), pregunta: r.pregunta, respuesta: texto.trim(), idioma: 'en', notas: null });
                await api.actualizarRespuesta(r.id, { banco_id: nuevo });
              }
            }, 'Saved to the answer bank');
          }}>Save to bank</button>}
          <button className="btn-sec chico" disabled={ocupado} onClick={() => { if (confirm('Delete this question?')) void hacer(() => api.borrarRespuesta(r.id)); }}>Delete</button>
        </div>
      </div>
    </li>
  );
}

function NuevaPregunta({ api, post, orden, hacer, ocupado }: { api: Api; post: Postulacion; orden: number; hacer: Hacer; ocupado: boolean }) {
  const [texto, setTexto] = useState('');
  return (
    <div className="nueva-pregunta">
      <input placeholder="Add a question from the form…" value={texto} onChange={(x) => setTexto(x.target.value)} />
      <button className="btn-sec" disabled={ocupado || !texto.trim()} onClick={() => hacer(async () => {
        await api.crearRespuesta({ postulacion_id: post.id, orden, pregunta: texto.trim(), ayuda: null, respuesta: null, estado: 'vacia', banco_id: null });
        setTexto('');
      })}>Add question</button>
    </div>
  );
}
