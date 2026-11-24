import { useEffect, useState } from 'react';
import type { Api } from '../data/api.ts';
import type { Contacto, Organizacion, Vinculo } from '../types.ts';
import { TIPOS_ORG, label } from '../labels.ts';
import { Opciones } from '../components/ui.tsx';

export function Organizaciones({ api }: { api: Api }) {
  const [datos, setDatos] = useState<{ orgs: Organizacion[]; vinculos: Vinculo[]; contactos: Contacto[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState<null | { nombre: string; tipo: string }>(null);

  const cargar = () => Promise.all([api.organizaciones(), api.vinculos(), api.contactos()])
    .then(([orgs, vinculos, contactos]) => setDatos({ orgs, vinculos, contactos: contactos.filter((c) => c.organizacion_id) }))
    .catch((e: Error) => setError(e.message));
  useEffect(() => { void cargar(); }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  async function crear() {
    if (!nueva?.nombre.trim()) return;
    try {
      const id = await api.crearOrganizacion({ nombre: nueva.nombre.trim(), tipo: nueva.tipo, web_url: null, notas: null });
      location.hash = `#/organizacion/${id}`;
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!datos) return <p className="tenue">Loading organisations…</p>;

  return (
    <section>
      <div className="titulo-fila">
        <h1>Organisations</h1>
        {!nueva && <button onClick={() => setNueva({ nombre: '', tipo: 'gestora_comida' })}>New organisation</button>}
      </div>
      <p className="tenue">Companies that manage food vendors, produce festivals or act as agencies for several events.</p>
      {nueva && (
        <div className="tarjeta form">
          <label>Name<input autoFocus value={nueva.nombre} onChange={(x) => setNueva({ ...nueva, nombre: x.target.value })} /></label>
          <label>Type<Opciones valor={nueva.tipo} cambiar={(v) => setNueva({ ...nueva, tipo: v || 'otro' })} opciones={TIPOS_ORG} /></label>
          <div className="ancho acciones">
            <button className="btn-sec" onClick={() => setNueva(null)}>Cancel</button>
            <button disabled={!nueva.nombre.trim()} onClick={crear}>Create</button>
          </div>
        </div>
      )}
      {datos.orgs.length === 0 && !nueva && <p className="tarjeta tenue">No organisations yet. Create one, or link one from a festival page.</p>}
      {datos.orgs.length > 0 && (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead><tr><th>Name</th><th>Type</th><th>Festivals</th><th>Main contact</th></tr></thead>
            <tbody>
              {datos.orgs.map((o) => {
                const n = new Set(datos.vinculos.filter((v) => v.organizacion_id === o.id).map((v) => v.festival_id)).size;
                const c = datos.contactos.find((x) => x.organizacion_id === o.id && x.principal && !x.baja_en);
                return (
                  <tr key={o.id} onClick={() => { location.hash = `#/organizacion/${o.id}`; }}>
                    <td><a href={`#/organizacion/${o.id}`}>{o.nombre}</a></td>
                    <td>{label(TIPOS_ORG, o.tipo)}</td>
                    <td>{n}</td>
                    <td>{c ? `${c.nombre ? `${c.nombre} · ` : ''}${c.email ?? c.telefono}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
