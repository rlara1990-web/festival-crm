import { useEffect, useMemo, useState } from 'react';
import type { Api } from '../data/api.ts';
import type { Contacto, Edicion, Festival } from '../types.ts';
import {
  ESTADOS, EXPERIENCIAS, GENEROS, PAISES, PENDIENTES, PUBLICOS, TIPOS, aforoTexto, fechaTexto, label, siNo,
} from '../labels.ts';

interface Fila {
  f: Festival;
  e: Edicion | undefined; // edición objetivo (año más reciente)
  experiencia: string | null; // la más reciente
  email: string | null; // contacto principal
}

type Columna = 'nombre' | 'pais' | 'estado' | 'puntuacion' | 'generos' | 'acampada' | 'duracion' | 'aforo' | 'proxima' | 'experiencia' | 'pendientes';

const COLUMNAS: { k: Columna; t: string }[] = [
  { k: 'nombre', t: 'Festival' }, { k: 'pais', t: 'Country' }, { k: 'estado', t: 'Status' },
  { k: 'puntuacion', t: 'Fit score' }, { k: 'generos', t: 'Genres' }, { k: 'acampada', t: 'Camping' },
  { k: 'duracion', t: 'Days' }, { k: 'aforo', t: 'Capacity' }, { k: 'proxima', t: 'Next action' },
  { k: 'experiencia', t: 'Our experience' }, { k: 'pendientes', t: 'Missing' },
];

interface Filtros {
  texto: string; pais: string; estado: string; genero: string; publico: string; tipo: string;
  acampada: string; experiencia: string; minimo: string; sinNoFoodTrucks: boolean; fuera: boolean;
}

const FILTROS_INICIALES: Filtros = {
  texto: '', pais: '', estado: '', genero: '', publico: '', tipo: '', acampada: '', experiencia: '', minimo: '',
  sinNoFoodTrucks: false, fuera: false,
};

const CLAVE_LOCAL = 'crm.lista.v1';
function leerLocal(): { filtros: Filtros; orden: Columna; asc: boolean } | null {
  try { const s = localStorage.getItem(CLAVE_LOCAL); return s ? JSON.parse(s) : null; } catch { return null; }
}
function guardarLocal(v: unknown) {
  try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
}

function valorOrden(r: Fila, c: Columna): string | number {
  switch (c) {
    case 'nombre': return r.f.nombre.toLowerCase();
    case 'pais': return label(PAISES, r.f.pais);
    case 'estado': return r.e ? Object.keys(ESTADOS).indexOf(r.e.estado) : 99;
    case 'puntuacion': return r.e?.puntuacion ?? -1;
    case 'generos': return r.f.generos.map((g) => label(GENEROS, g)).join(', ');
    case 'acampada': return r.f.acampada == null ? 1 : r.f.acampada ? 0 : 2;
    case 'duracion': return r.e?.duracion_dias ?? -1;
    case 'aforo': return r.e?.aforo_max ?? r.e?.aforo_min ?? -1;
    case 'proxima': return r.e?.proxima_accion_fecha ?? (r.e?.proxima_accion ? '9998' : '9999');
    case 'experiencia': return r.experiencia ? Object.keys(EXPERIENCIAS).indexOf(r.experiencia) : 99;
    case 'pendientes': return r.f.campos_pendientes.length;
  }
}

export function Lista({ api }: { api: Api }) {
  const guardado = leerLocal();
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ ...FILTROS_INICIALES, ...guardado?.filtros });
  const [orden, setOrden] = useState<Columna>(guardado?.orden ?? 'puntuacion');
  const [asc, setAsc] = useState<boolean>(guardado?.asc ?? false);

  useEffect(() => {
    Promise.all([api.festivales(), api.ediciones(), api.contactos()])
      .then(([fs, eds, cs]) => setFilas(fs.map((f) => armarFila(f, eds, cs))))
      .catch((e: Error) => setError(e.message));
  }, [api]);

  useEffect(() => guardarLocal({ filtros, orden, asc }), [filtros, orden, asc]);

  const visibles = useMemo(() => {
    if (!filas) return [];
    const t = filtros.texto.trim().toLowerCase();
    const min = filtros.minimo === '' ? null : Number(filtros.minimo);
    const r = filas.filter(({ f, e, experiencia, email }) =>
      (filtros.fuera || !f.fuera_de_alcance) &&
      (!t || f.nombre.toLowerCase().includes(t) || (f.ciudad ?? '').toLowerCase().includes(t) || (email ?? '').includes(t)) &&
      (!filtros.pais || f.pais === filtros.pais) &&
      (!filtros.estado || e?.estado === filtros.estado) &&
      (!filtros.genero || f.generos.includes(filtros.genero)) &&
      (!filtros.publico || f.perfil_publico.includes(filtros.publico)) &&
      (!filtros.tipo || f.tipo === filtros.tipo) &&
      (!filtros.acampada || siNo(f.acampada) === filtros.acampada) &&
      (!filtros.experiencia || experiencia === filtros.experiencia) &&
      (min == null || (e?.puntuacion ?? -1) >= min) &&
      (!filtros.sinNoFoodTrucks || e?.acepta_food_trucks !== false));
    return r.sort((a, b) => {
      const x = valorOrden(a, orden), y = valorOrden(b, orden);
      const c = x < y ? -1 : x > y ? 1 : a.f.nombre.localeCompare(b.f.nombre);
      return asc ? c : -c;
    });
  }, [filas, filtros, orden, asc]);

  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => setFiltros((p) => ({ ...p, [k]: v }));
  const clicOrden = (c: Columna) => { if (c === orden) setAsc(!asc); else { setOrden(c); setAsc(c === 'nombre' || c === 'pais' || c === 'proxima'); } };
  const anio = filas?.[0]?.e?.anio;

  if (error) return <p className="error">{error}</p>;
  if (!filas) return <p className="tenue">Loading festivals…</p>;

  return (
    <section>
      <div className="titulo-fila">
        <h1>Festivals {anio ? <span className="tenue">· season {Math.max(...filas.map((r) => r.e?.anio ?? 0))}</span> : null}</h1>
        <span className="tenue">{visibles.length} of {filas.length}</span>
      </div>

      <div className="filtros">
        <input placeholder="Search name, city or email…" value={filtros.texto} onChange={(e) => set('texto', e.target.value)} />
        <Selector valor={filtros.pais} cambiar={(v) => set('pais', v)} vacio="All countries" opciones={PAISES} />
        <Selector valor={filtros.estado} cambiar={(v) => set('estado', v)} vacio="All statuses" opciones={ESTADOS} />
        <Selector valor={filtros.genero} cambiar={(v) => set('genero', v)} vacio="All genres" opciones={GENEROS} />
        <Selector valor={filtros.publico} cambiar={(v) => set('publico', v)} vacio="All audiences" opciones={PUBLICOS} />
        <Selector valor={filtros.tipo} cambiar={(v) => set('tipo', v)} vacio="All event types" opciones={TIPOS} />
        <Selector valor={filtros.acampada} cambiar={(v) => set('acampada', v)} vacio="Camping: any" opciones={{ Yes: 'Camping: yes', No: 'Camping: no', Unknown: 'Camping: unknown' }} />
        <Selector valor={filtros.experiencia} cambiar={(v) => set('experiencia', v)} vacio="Any experience" opciones={EXPERIENCIAS} />
        <input className="corto" type="number" min={0} max={100} placeholder="Min score" value={filtros.minimo} onChange={(e) => set('minimo', e.target.value)} />
        <label className="check"><input type="checkbox" checked={filtros.sinNoFoodTrucks} onChange={(e) => set('sinNoFoodTrucks', e.target.checked)} />Hide “no food trucks”</label>
        <label className="check"><input type="checkbox" checked={filtros.fuera} onChange={(e) => set('fuera', e.target.checked)} />Show out of scope</label>
        <button className="btn-sec" onClick={() => setFiltros(FILTROS_INICIALES)}>Clear</button>
      </div>

      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>{COLUMNAS.map(({ k, t }) => (
              <th key={k} onClick={() => clicOrden(k)} className={orden === k ? 'activa' : ''}>
                {t}{orden === k ? (asc ? ' ▲' : ' ▼') : ''}
              </th>
            ))}</tr>
          </thead>
          <tbody>
            {visibles.map(({ f, e, experiencia }) => (
              <tr key={f.id} onClick={() => { location.hash = `#/festival/${f.id}`; }}>
                <td><a href={`#/festival/${f.id}`}>{f.nombre}</a>{f.fuera_de_alcance && <span className="etiqueta gris">Out of scope</span>}</td>
                <td>{label(PAISES, f.pais)}</td>
                <td>{e ? <span className={`estado estado-${e.estado}`}>{label(ESTADOS, e.estado)}</span> : '—'}</td>
                <td><Puntuacion e={e} /></td>
                <td className="generos">{f.generos.map((g) => label(GENEROS, g)).join(', ') || '—'}</td>
                <td>{siNo(f.acampada)}</td>
                <td>{e?.duracion_dias ?? '—'}</td>
                <td>{e ? aforoTexto(e.aforo_min, e.aforo_max) : '—'}</td>
                <td className="proxima">{e?.proxima_accion ? <>{e.proxima_accion_fecha && <b>{fechaTexto(e.proxima_accion_fecha)} </b>}{e.proxima_accion}</> : '—'}</td>
                <td>{experiencia ? <span className={`exp exp-${experiencia}`}>{label(EXPERIENCIAS, experiencia).split(' (')[0]}</span> : '—'}</td>
                <td title={f.campos_pendientes.map((p) => label(PENDIENTES, p)).join(', ')}>{f.campos_pendientes.length || '✓'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibles.length === 0 && <p className="tenue vacio">No festivals match these filters.</p>}
      </div>
    </section>
  );
}

function armarFila(f: Festival, eds: Edicion[], cs: Contacto[]): Fila {
  const propias = eds.filter((e) => e.festival_id === f.id).sort((a, b) => a.anio - b.anio);
  const principal = cs.find((c) => c.festival_id === f.id && c.principal && !c.baja_en);
  return {
    f,
    e: propias[propias.length - 1],
    experiencia: [...propias].reverse().find((e) => e.experiencia)?.experiencia ?? null,
    email: principal?.email ?? null,
  };
}

export function Puntuacion({ e }: { e: Edicion | undefined }) {
  if (!e || e.puntuacion == null) return <span className="tenue" title="Not enough data to score">—</span>;
  const nivel = e.puntuacion >= 70 ? 'alta' : e.puntuacion >= 55 ? 'media' : 'baja';
  return (
    <span className={`punt punt-${nivel}`} title={`Based on ${e.puntuacion_cobertura ?? 0}% real data; missing factors count as neutral`}>
      {e.puntuacion}<small>{e.puntuacion_cobertura ?? 0}%</small>
    </span>
  );
}

function Selector({ valor, cambiar, vacio, opciones }: {
  valor: string; cambiar: (v: string) => void; vacio: string; opciones: Record<string, string>;
}) {
  return (
    <select value={valor} onChange={(e) => cambiar(e.target.value)}>
      <option value="">{vacio}</option>
      {Object.entries(opciones).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
    </select>
  );
}
