import { useEffect, useState } from 'react';
import { obtenerApi, type Api } from './data/api.ts';
import { Login } from './pages/Login.tsx';
import { Lista } from './pages/Lista.tsx';
import { Ficha } from './pages/Ficha.tsx';

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
  const ruta = useRuta();

  useEffect(() => {
    obtenerApi()
      .then(async (a) => { setApi(a); setUsuario(await a.sesion()); })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="centro"><p className="error">{error}</p></div>;
  if (!api || usuario === undefined) return <div className="centro"><p className="tenue">Loading…</p></div>;
  if (!usuario) return <Login api={api} alEntrar={setUsuario} />;

  const ficha = ruta.match(/^\/festival\/([0-9a-f-]+)$/);
  return (
    <div className="app">
      <header className="barra">
        <a href="#/" className="marca">Moche Verde <span>Festival CRM</span></a>
        <div className="barra-der">
          <span className="tenue">{usuario}</span>
          <button className="btn-sec" onClick={async () => { await api.salir(); setUsuario(null); }}>Sign out</button>
        </div>
      </header>
      <main>{ficha ? <Ficha api={api} id={ficha[1]!} /> : <Lista api={api} />}</main>
    </div>
  );
}
