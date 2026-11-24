// Piezas de interfaz compartidas por las fichas de festival y de organización.
import type { ReactNode } from 'react';
import type { Comentario } from '../types.ts';

export type Guardar = (accion: () => Promise<void>, mensaje?: string) => Promise<void>;
export type Coms = (registro: string, campo: string | null) => Comentario[];

export function Seccion({ titulo, editando, setEditando, guardar, children, extra }: {
  titulo: string; editando?: boolean; setEditando?: (v: boolean) => void; guardar?: () => void;
  children: ReactNode; extra?: ReactNode;
}) {
  return (
    <section className="tarjeta seccion">
      <div className="seccion-cab">
        <h2>{titulo}</h2>
        <div className="acciones">
          {extra}
          {setEditando && !editando && <button className="btn-sec" onClick={() => setEditando(true)}>Edit</button>}
          {setEditando && editando && <>
            <button className="btn-sec" onClick={() => setEditando(false)}>Cancel</button>
            <button onClick={guardar}>Save</button>
          </>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Marca de comentario estilo Google Docs: punto visible y texto al pasar el cursor. */
export function Comentarios({ lista }: { lista: Comentario[] }) {
  if (lista.length === 0) return null;
  const texto = lista.map((c) => `${c.autor === 'claude' ? 'Claude' : 'Team'}: ${c.texto}`).join('\n\n');
  return <span className="comentario" title={texto} aria-label={`Comment: ${texto}`}>{lista.length}</span>;
}

export function Dato({ t, children, comentarios }: { t: string; children: ReactNode; comentarios?: Comentario[] }) {
  return (
    <div className="dato">
      <dt>{t}{comentarios && <Comentarios lista={comentarios} />}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export const vacio = (v: string) => (v.trim() === '' ? null : v.trim());
export const num = (v: string) => (v.trim() === '' ? null : Number(v));
export const triEstado = (v: string) => (v === '' ? null : v === 'si');
export const deTri = (v: boolean | null) => (v == null ? '' : v ? 'si' : 'no');
export const TRI = { si: 'Yes', no: 'No' };
export const hoy = () => new Date().toISOString().slice(0, 10);

export function Enlace({ url }: { url: string | null }) {
  if (!url) return <>—</>;
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return <a href={href} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>;
}

export function Opciones({ valor, cambiar, opciones, vacioTexto = '—' }: {
  valor: string; cambiar: (v: string) => void; opciones: Record<string, string>; vacioTexto?: string;
}) {
  return (
    <select value={valor} onChange={(e) => cambiar(e.target.value)}>
      <option value="">{vacioTexto}</option>
      {Object.entries(opciones).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
    </select>
  );
}

export function Multiples({ valores, cambiar, opciones }: { valores: string[]; cambiar: (v: string[]) => void; opciones: Record<string, string> }) {
  return (
    <div className="multiples">
      {Object.entries(opciones).map(([k, t]) => (
        <label key={k} className="check">
          <input type="checkbox" checked={valores.includes(k)}
            onChange={(e) => cambiar(e.target.checked ? [...valores, k] : valores.filter((x) => x !== k))} />{t}
        </label>
      ))}
    </div>
  );
}
