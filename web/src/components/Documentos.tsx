// Repositorio de documentos (dossier, menús, fotos). En la ficha: los del festival;
// en la página Documents: todos, con el festival al que pertenecen.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Api } from '../data/api.ts';
import { MAX_BYTES, tamanoTexto } from '../data/documentos.ts';
import type { Documento, Festival } from '../types.ts';
import { Seccion } from './ui.tsx';

const fecha = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function SeccionDocumentos({ api, festivalId, festivales }: {
  api: Api;
  /** Festival de la ficha; sin él se muestran todos los documentos */
  festivalId?: string;
  festivales?: Festival[];
}) {
  const [docs, setDocs] = useState<Documento[] | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [destino, setDestino] = useState(festivalId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => setDocs(await api.documentos(festivalId)), [api, festivalId]);
  useEffect(() => { cargar().catch((e: Error) => setError(e.message)); }, [cargar]);

  async function hacer(accion: () => Promise<void>) {
    setOcupado(true); setError(null);
    try { await accion(); await cargar(); } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  }

  const subir = () => hacer(async () => {
    if (!archivo) return;
    if (archivo.size > MAX_BYTES) throw new Error('File too large (max 50 MB).');
    await api.subirDocumento(archivo, { festival_id: destino || null, descripcion: descripcion.trim() || null });
    setArchivo(null); setDescripcion(''); setSubiendo(false);
    if (input.current) input.current.value = '';
  });

  async function abrir(d: Documento) {
    const ventana = window.open('', '_blank'); // se abre ya para que el navegador no la bloquee
    try {
      const url = await api.enlaceDocumento(d);
      if (ventana) ventana.location.href = url; else location.href = url;
    } catch (e) { ventana?.close(); setError((e as Error).message); }
  }

  const nombreFestival = (id: string | null) => (id ? festivales?.find((f) => f.id === id)?.nombre ?? '—' : 'General');

  return (
    <Seccion titulo="Documents" extra={!subiendo && <button className="btn-sec" onClick={() => setSubiendo(true)}>Upload</button>}>
      {subiendo && (
        <div className="form">
          <label className="ancho">File<input ref={input} type="file" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} /></label>
          {!festivalId && festivales && (
            <label>Festival<select value={destino} onChange={(e) => setDestino(e.target.value)}>
              <option value="">General (all festivals)</option>
              {festivales.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select></label>
          )}
          <label className={festivalId ? 'ancho' : ''}>Description<input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="e.g. 2027 menu" /></label>
          <div className="ancho acciones">
            <button className="btn-sec" onClick={() => { setSubiendo(false); setArchivo(null); }}>Cancel</button>
            <button disabled={!archivo || ocupado} onClick={subir}>{ocupado ? 'Uploading…' : 'Upload'}</button>
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      {docs === null ? <p className="tenue">Loading…</p> : docs.length === 0 ? (
        <p className="tenue">{festivalId ? 'No documents for this festival. General documents are in the Documents tab.' : 'No documents yet. Upload your dossier, menus or photos.'}</p>
      ) : (
        <div className="tabla-scroll">
          <table className="docs">
            <thead><tr><th>Name</th>{!festivalId && <th>Festival</th>}<th>Size</th><th>Added</th><th /></tr></thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td><button className="enlace" onClick={() => abrir(d)}>{d.nombre}</button>{d.descripcion && <div className="tenue">{d.descripcion}</div>}</td>
                  {!festivalId && <td>{d.festival_id ? <a href={`#/festival/${d.festival_id}`}>{nombreFestival(d.festival_id)}</a> : 'General'}</td>}
                  <td>{tamanoTexto(d.tamano_bytes)}</td>
                  <td>{fecha(d.creado_en)}</td>
                  <td><button className="btn-sec chico" disabled={ocupado}
                    onClick={() => { if (confirm(`Delete ${d.nombre}?`)) void hacer(() => api.borrarDocumento(d)); }}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Seccion>
  );
}
