import { useEffect, useState } from 'react';
import type { Api } from '../data/api.ts';
import type { Festival } from '../types.ts';
import { SeccionDocumentos } from '../components/Documentos.tsx';

export function Documentos({ api }: { api: Api }) {
  const [festivales, setFestivales] = useState<Festival[] | null>(null);
  useEffect(() => { api.festivales().then(setFestivales).catch(() => setFestivales([])); }, [api]);
  return (
    <section>
      <div className="titulo-fila"><h1>Documents</h1></div>
      <p className="tenue">Dossier, menus, photos and other files. Only Moche Verde can see them.</p>
      {festivales && <SeccionDocumentos api={api} festivales={festivales} />}
    </section>
  );
}
