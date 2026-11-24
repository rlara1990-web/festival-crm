import { useEffect, useState } from 'react';
import { obtenerApi, type Api } from './data/api.ts';
import { Login } from './pages/Login.tsx';
import { Lista } from './pages/Lista.tsx';
import { Ficha } from './pages/Ficha.tsx';
import { Organizaciones } from './pages/Organizaciones.tsx';
import { Organizacion } from './pages/Organizacion.tsx';
import { Propuestas } from './pages/Propuestas.tsx';

/** Rutas con hash (#/ y #/festival/<id>): funcionan en hosting estático sin configuración. */
function useRuta(): string {
  const [ruta, setRuta] = useState(location.hash.slice(1) || '/');
  useEffect(() => {
    const f = () => setRuta(location.hash.slice(1) || '/');
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return ruta;
}

export function App() {
  const [api, setApi] = useState<Api | null>(null);
  const [usuario, setUsuario] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const ruta = useRuta();
  const contarPendientes = () => { if (api) api.propuestas('pendiente').then((p) => setPendientes(p.filter((x) => x.tipo !== 'festival_nuevo').length)).catch(() => {}); };
  useEffect(contarPendientes, [api, usuario, ruta]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    obtenerApi()
      .then(async (a) => { setApi(a); setUsuario(await a.sesion()); })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="centro"><p className="error">{error}</p></div>;
  if (!api || usuario === undefined) return <div className="centro"><p className="tenue">Loading…</p></div>;
  if (!usuario) return <Login api={api} alEntrar={setUsuario} />;

  const ficha = ruta.match(/^\/festival\/([0-9a-f-]+)$/);
  const org = ruta.match(/^\/organizacion\/([0-9a-f-]+)$/);
  const enOrgs = ruta.startsWith('/organizacion');
  const enRevision = ruta === '/propuestas';
  return (
    <div className="app">
      <header className="barra">
        <div className="barra-izq">
          <a href="#/" className="marca">Moche Verde <span>Festival CRM</span></a>
          <nav>
            <a href="#/" className={!enOrgs && !enRevision ? 'activo' : ''}>Festivals</a>
            <a href="#/organizaciones" className={enOrgs ? 'activo' : ''}>Organisations</a>
            <a href="#/propuestas" className={enRevision ? 'activo' : ''}>Review{pendientes > 0 && <span className="contador">{pendientes}</span>}</a>
          </nav>
        </div>
        <div className="barra-der">
          <span className="tenue">{usuario}</span>
          <button className="btn-sec" onClick={async () => { await api.salir(); setUsuario(null); }}>Sign out</button>
        </div>
      </header>
      <main>{ficha ? <Ficha key={ficha[1]} api={api} id={ficha[1]!} />
        : org ? <Organizacion key={org[1]} api={api} id={org[1]!} />
        : ruta === '/organizaciones' ? <Organizaciones api={api} />
        : enRevision ? <Propuestas api={api} alCambiar={contarPendientes} />
        : <Lista api={api} />}</main>
    </div>
  );
}
