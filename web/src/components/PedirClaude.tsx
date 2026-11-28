// "Ask Claude": pedidos que Claude procesa en la siguiente revisión programada (9:39, 14:39, 17:39 Lisboa).
import { useCallback, useEffect, useState } from 'react';
import type { Api } from '../data/api.ts';
import type { Solicitud } from '../types.ts';
import { Seccion } from './ui.tsx';

export const TIPOS_SOLICITUD: Record<Solicitud['tipo'], string> = {
  completar_datos: 'Find missing data',
  preparar_correo: 'Prepare first email (Outlook draft)',
  preparar_recontacto: 'Prepare follow-up (Outlook draft)',
  preparar_postulacion: 'Pre-fill the application form',
  otro: 'Other',
};

const ESTADOS_SOLICITUD: Record<Solicitud['estado'], string> = {
  pendiente: 'Waiting', en_proceso: 'In progress', hecha: 'Done', descartada: 'Cancelled',
};

const cuando = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function SeccionPedirClaude({ api, festivalId, edicionId }: { api: Api; festivalId: string; edicionId: string | null }) {
  const [lista, setLista] = useState<Solicitud[] | null>(null);
  const [tipo, setTipo] = useState<Solicitud['tipo'] | ''>('');
  const [detalle, setDetalle] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => setLista(await api.solicitudes(festivalId)), [api, festivalId]);
  useEffect(() => { cargar().catch((e: Error) => setError(e.message)); }, [cargar]);

  async function hacer(accion: () => Promise<void>, mensaje: string) {
    setOcupado(true); setError(null);
    try {
      await accion(); await cargar();
      setAviso(mensaje); setTimeout(() => setAviso(null), 3000);
    } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  }

  const pedir = () => hacer(async () => {
    if (!tipo) return;
    await api.crearSolicitud({ tipo, festival_id: festivalId, edicion_id: edicionId, detalle: detalle.trim() || null });
    setTipo(''); setDetalle('');
  }, 'Sent. Claude will handle it at the next check.');

  const recientes = (lista ?? []).slice(0, 5);
  return (
    <Seccion titulo="Ask Claude">
      <div className="pedir">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as Solicitud['tipo'] | '')}>
          <option value="">What do you need?</option>
          {Object.entries(TIPOS_SOLICITUD).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
        </select>
        {tipo && <>
          <textarea placeholder={tipo === 'otro' ? 'Describe what you need' : 'Notes for Claude (optional), e.g. "mention we were there in 2026"'}
            value={detalle} onChange={(e) => setDetalle(e.target.value)} />
          <button disabled={ocupado || (tipo === 'otro' && !detalle.trim())} onClick={pedir}>Send to Claude</button>
        </>}
        <small className="tenue">Claude checks requests at 9:39, 14:39 and 17:39 (Lisbon). Drafts appear in Outlook; nothing is sent automatically.</small>
      </div>
      {aviso && <p className="ok">{aviso}</p>}
      {error && <p className="error">{error}</p>}
      {recientes.length > 0 && (
        <ul className="solicitudes">
          {recientes.map((s) => (
            <li key={s.id}>
              <div>
                <b>{TIPOS_SOLICITUD[s.tipo]}</b> <span className={`etiqueta sol-${s.estado}`}>{ESTADOS_SOLICITUD[s.estado]}</span>
                <span className="tenue"> · {cuando(s.creado_en)}</span>
                {s.estado === 'pendiente' && <button className="btn-sec chico" disabled={ocupado}
                  onClick={() => hacer(() => api.descartarSolicitud(s.id), 'Request cancelled')}>Cancel</button>}
              </div>
              {s.detalle && <div className="tenue multilinea">{s.detalle}</div>}
              {s.resultado && <div className="multilinea">{s.resultado}</div>}
            </li>
          ))}
        </ul>
      )}
    </Seccion>
  );
}
