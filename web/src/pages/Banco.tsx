// Banco de respuestas: textos reutilizables para los formularios de los festivales.
import { useCallback, useEffect, useState } from 'react';
import type { Api } from '../data/api.ts';
import type { EntradaBanco } from '../types.ts';
import { IDIOMAS } from '../labels.ts';
import { Opciones, vacio } from '../components/ui.tsx';

export function Banco({ api }: { api: Api }) {
  const [lista, setLista] = useState<EntradaBanco[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [nueva, setNueva] = useState(false);

  const cargar = useCallback(async () => setLista(await api.banco()), [api]);
  useEffect(() => { cargar().catch((e: Error) => setError(e.message)); }, [cargar]);

  async function hacer(accion: () => Promise<void>) {
    setError(null);
    try { await accion(); await cargar(); } catch (e) { setError((e as Error).message); }
  }

  if (!lista) return <p className="tenue">{error ?? 'Loading…'}</p>;
  const f = filtro.toLowerCase();
  const visibles = lista.filter((b) => !f || `${b.tema} ${b.pregunta} ${b.respuesta}`.toLowerCase().includes(f));

  return (
    <section>
      <div className="titulo-fila">
        <h1>Answer bank</h1>
        <span className="tenue">{lista.length} answers</span>
      </div>
      <p className="tenue">Reusable answers for festival application forms (concept, menu, stall size, power, team, sustainability…). Claude uses them to pre-fill new applications; improve them here or with "Save to bank" from an application.</p>
      {error && <p className="error">{error}</p>}
      <div className="filtros">
        <input placeholder="Search answers…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
        {!nueva && <button onClick={() => setNueva(true)}>New answer</button>}
      </div>
      {nueva && <Editor inicial={{ tema: '', pregunta: '', respuesta: '', idioma: 'en', notas: null }} cancelar={() => setNueva(false)}
        guardar={(v) => hacer(async () => { await api.crearEntradaBanco(v); setNueva(false); })} />}
      <div className="banco">
        {visibles.map((b) => <Entrada key={b.id} b={b} api={api} hacer={hacer} />)}
        {visibles.length === 0 && <p className="tarjeta tenue">No answers{filtro ? ' match the search' : ' yet'}.</p>}
      </div>
    </section>
  );
}

type Valores = Pick<EntradaBanco, 'tema' | 'pregunta' | 'respuesta' | 'idioma' | 'notas'>;

function Entrada({ b, api, hacer }: { b: EntradaBanco; api: Api; hacer: (a: () => Promise<void>) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  if (editando) return <Editor inicial={b} cancelar={() => setEditando(false)}
    guardar={(v) => hacer(async () => { await api.actualizarEntradaBanco(b.id, v); setEditando(false); })} />;
  return (
    <article className="tarjeta entrada-banco">
      <div className="seccion-cab">
        <h2>{b.tema} <span className="etiqueta gris">{IDIOMAS[b.idioma] ?? b.idioma}</span></h2>
        <div className="acciones">
          <button className="btn-sec chico" onClick={() => setEditando(true)}>Edit</button>
          <button className="btn-sec chico" onClick={() => { if (confirm(`Delete "${b.tema}"?`)) void hacer(() => api.borrarEntradaBanco(b.id)); }}>Delete</button>
        </div>
      </div>
      <p className="tenue">{b.pregunta}</p>
      <p className="multilinea">{b.respuesta}</p>
      {b.notas && <p className="tenue multilinea">Note: {b.notas}</p>}
    </article>
  );
}

function Editor({ inicial, guardar, cancelar }: { inicial: Valores; guardar: (v: Valores) => void; cancelar: () => void }) {
  const [v, setV] = useState(inicial);
  const set = <K extends keyof Valores>(k: K, x: Valores[K]) => setV((p) => ({ ...p, [k]: x }));
  const valido = v.tema.trim() && v.pregunta.trim() && v.respuesta.trim();
  return (
    <div className="tarjeta form">
      <label>Topic<input value={v.tema} onChange={(e) => set('tema', e.target.value)} placeholder="e.g. Menu & prices" /></label>
      <label>Language<Opciones valor={v.idioma} cambiar={(x) => set('idioma', (x || 'en') as Valores['idioma'])} opciones={IDIOMAS} vacioTexto="—" /></label>
      <label className="ancho">Typical question<input value={v.pregunta} onChange={(e) => set('pregunta', e.target.value)} /></label>
      <label className="ancho">Answer<textarea rows={6} value={v.respuesta} onChange={(e) => set('respuesta', e.target.value)} /></label>
      <label className="ancho">Notes (optional)<input value={v.notas ?? ''} onChange={(e) => set('notas', vacio(e.target.value))} /></label>
      <div className="ancho acciones">
        <button className="btn-sec" onClick={cancelar}>Cancel</button>
        <button disabled={!valido} onClick={() => guardar({ ...v, tema: v.tema.trim(), pregunta: v.pregunta.trim(), respuesta: v.respuesta.trim() })}>Save</button>
      </div>
    </div>
  );
}
