import { useCallback, useEffect, useState } from 'react';
import type { Api } from '../data/api.ts';
import { aceptarPropuesta, festivalDePropuesta } from '../data/propuestas.ts';
import { CAMPOS_PROPONIBLES, type ContactoPropuesto } from '../../../src/shared/propuestas.ts';
import type { Edicion, Festival, Propuesta } from '../types.ts';
import { ESTADOS, GENEROS, METODOS_CONV, PUBLICOS, TIPOS, fechaTexto, label, siNo } from '../labels.ts';
import { Enlace } from '../components/ui.tsx';

export function formatearValor(campo: string, v: unknown): string {
  if (v == null || v === '') return '—';
  const tipo = CAMPOS_PROPONIBLES[campo]?.tipo;
  if (campo === 'contactos.nuevo') {
    const c = v as ContactoPropuesto;
    return [c.nombre, c.rol, c.email, c.telefono].filter(Boolean).join(' · ');
  }
  if (tipo === 'booleano') return siNo(v as boolean);
  if (tipo === 'fecha') return fechaTexto(v as string);
  if (tipo === 'generos') return (v as string[]).map((g) => label(GENEROS, g)).join(', ');
  if (tipo === 'publico') return (v as string[]).map((g) => label(PUBLICOS, g)).join(', ');
  if (tipo === 'tipo') return label(TIPOS, v as string);
  if (tipo === 'metodo') return label(METODOS_CONV, v as string);
  if (typeof v === 'number') return v.toLocaleString('en-GB');
  return String(v);
}

export function Propuestas({ api, alCambiar }: { api: Api; alCambiar?: () => void }) {
  const [datos, setDatos] = useState<{ props: Propuesta[]; festivales: Festival[]; ediciones: Edicion[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [props, festivales, ediciones] = await Promise.all([api.propuestas('pendiente'), api.festivales(), api.ediciones()]);
    setDatos({ props: props.filter((p) => p.tipo !== 'festival_nuevo'), festivales, ediciones });
  }, [api]);
  useEffect(() => { cargar().catch((e: Error) => setError(e.message)); }, [cargar]);

  async function resolver(ps: Propuesta[], aceptar: boolean) {
    if (!datos) return;
    setError(null);
    setOcupado(ps.map((p) => p.id).join());
    try {
      for (const p of ps) {
        if (aceptar) await aceptarPropuesta(api, p, datos.ediciones);
        else await api.resolverPropuesta(p.id, 'rechazada');
      }
      await cargar();
      alCambiar?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  if (error && !datos) return <p className="error">{error}</p>;
  if (!datos) return <p className="tenue">Loading proposals…</p>;

  // Agrupar por festival
  const grupos = new Map<string, Propuesta[]>();
  for (const p of datos.props) {
    const f = festivalDePropuesta(p, datos.ediciones) ?? 'otros';
    grupos.set(f, [...(grupos.get(f) ?? []), p]);
  }
  const nombre = (id: string) => datos.festivales.find((f) => f.id === id)?.nombre ?? 'Other';

  return (
    <section>
      <div className="titulo-fila">
        <h1>Review</h1>
        <span className="tenue">{datos.props.length} pending</span>
      </div>
      <p className="tenue">Data Claude found online, with its source. Accept to copy it into the festival; reject to discard it. Nothing changes until you accept.</p>
      {error && <p className="error">{error}</p>}
      {datos.props.length === 0 && <p className="tarjeta tenue">Nothing to review.</p>}
      {[...grupos.entries()].sort((a, b) => nombre(a[0]).localeCompare(nombre(b[0]))).map(([fid, ps]) => (
        <section key={fid} className="tarjeta seccion grupo-prop">
          <div className="seccion-cab">
            <h2><a href={`#/festival/${fid}`}>{nombre(fid)}</a> <span className="tenue">· {ps.length}</span></h2>
            <div className="acciones">
              <button className="btn-sec" disabled={!!ocupado} onClick={() => resolver(ps, false)}>Reject all</button>
              <button disabled={!!ocupado} onClick={() => resolver(ps, true)}>Accept all</button>
            </div>
          </div>
          <div className="tabla-scroll sin-marco"><table className="tabla compacta">
            <thead><tr><th>Field</th><th>Current</th><th>Proposed</th><th>Source</th><th></th></tr></thead>
            <tbody>
              {ps.map((p) => {
                const clave = `${p.tabla}.${p.campo}`;
                const campo = p.tipo === 'cambio_estado' ? 'Status' : CAMPOS_PROPONIBLES[clave]?.etiqueta ?? clave;
                const propuesto = p.tipo === 'cambio_estado'
                  ? label(ESTADOS, (p.valor_propuesto as { estado: string }).estado)
                  : formatearValor(clave, p.valor_propuesto);
                return (
                  <tr key={p.id}>
                    <td><b>{campo}</b>{p.motivo && <div className="tenue motivo">{p.motivo}</div>}</td>
                    <td className="tenue">{formatearValor(clave, p.valor_actual)}</td>
                    <td>{propuesto}</td>
                    <td className="fuente"><Enlace url={p.fuente_url} /><div className="tenue">{fechaTexto(p.obtenido_en)}</div></td>
                    <td className="acciones-fila">
                      <button className="btn-sec chico" disabled={!!ocupado} onClick={() => resolver([p], false)}>Reject</button>
                      <button className="chico" disabled={!!ocupado} onClick={() => resolver([p], true)}>Accept</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </section>
      ))}
    </section>
  );
}
