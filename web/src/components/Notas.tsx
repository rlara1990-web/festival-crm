// Comentarios sobre cualquier dato, estilo Google Docs: marca con el número de comentarios
// (o un "+" tenue al pasar el cursor) que abre un globo para leer, añadir y resolver.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Comentario } from '../types.ts';

export interface CtxComentarios {
  lista: Comentario[]; // solo los no resueltos
  crear(tabla: string, registro: string, campo: string | null, texto: string): Promise<void>;
  resolver(id: string): Promise<void>;
}

export const ComentariosCtx = createContext<CtxComentarios | null>(null);

const fecha = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

export function Nota({ tabla, registro, campo }: { tabla: string; registro: string; campo: string | null }) {
  const ctx = useContext(ComentariosCtx);
  const [abierta, setAbierta] = useState(false);
  const [texto, setTexto] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const caja = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!abierta) return;
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !caja.current?.contains(e.target as Node)) setAbierta(false);
    };
    addEventListener('mousedown', cerrar);
    addEventListener('keydown', cerrar);
    return () => { removeEventListener('mousedown', cerrar); removeEventListener('keydown', cerrar); };
  }, [abierta]);

  if (!ctx) return null;
  const lista = ctx.lista.filter((c) => c.registro_id === registro && c.campo === campo);
  const resumen = lista.map((c) => `${c.autor === 'claude' ? 'Claude' : 'Team'}: ${c.texto}`).join('\n\n');

  async function hacer(accion: () => Promise<void>) {
    setOcupado(true); setError(null);
    try { await accion(); } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  }

  return (
    <span className="nota" ref={caja}>
      <button type="button" className={lista.length ? 'comentario' : 'nota-nueva'} title={resumen || 'Add a comment'}
        aria-label={lista.length ? `${lista.length} comment(s): ${resumen}` : 'Add a comment'} onClick={() => setAbierta(!abierta)}>
        {lista.length || '+'}
      </button>
      {abierta && (
        <span className="nota-globo" role="dialog">
          {lista.map((c) => (
            <span key={c.id} className="nota-item">
              <span className="nota-autor">{c.autor === 'claude' ? 'Claude' : 'Team'} · {fecha(c.creado_en)}</span>
              <span className="multilinea">{c.texto}</span>
              <button type="button" className="btn-sec chico" disabled={ocupado} onClick={() => hacer(() => ctx.resolver(c.id))}>Resolve</button>
            </span>
          ))}
          <textarea placeholder="Write a comment…" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus />
          {error && <span className="error">{error}</span>}
          <span className="acciones">
            <button type="button" className="btn-sec chico" onClick={() => setAbierta(false)}>Close</button>
            <button type="button" className="chico" disabled={ocupado || !texto.trim()}
              onClick={() => hacer(async () => { await ctx.crear(tabla, registro, campo, texto.trim()); setTexto(''); })}>Comment</button>
          </span>
        </span>
      )}
    </span>
  );
}
