// Convierte la lista original de 2026 en registros listos para la base de datos.
// Los textos visibles en la interfaz se generan en inglés.
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import {
  PAISES_EN_ALCANCE, clasificarUrl, detectarInteracciones, extraerEmails, extraerTelefono, extraerUrls,
  idiomaPorPais, limpiarNombre, normalizarGeneros, normalizarPais, normalizarWeb, origen, parseAforo,
  parseFechas, textoRestante, type Estado, type TipoInteraccion,
} from './normalize.ts';
import { FESTIVALES_EXTRA, OVERRIDES, type DatosEdicion } from './overrides.ts';
import { calcularPuntuacion, type PuntuacionConfig, type ResultadoPuntuacion } from '../scoring/score.ts';

export const ARCHIVO_CSV = 'data/festivals_2026_original.csv';

export interface Festival {
  id: string; nombre: string; pais: string | null; tipo: string; generos: string[]; perfil_publico: string[];
  notas_publico: string | null; web_url: string | null; formulario_contacto_url: string | null;
  idioma_correo: string | null; fuera_de_alcance: boolean; campos_pendientes: string[]; notas: string | null;
  acampada: boolean | null; parecido_a: string[];
}

export interface Edicion extends DatosEdicion {
  id: string; festival_id: string; anio: number; estado: Estado;
  fecha_inicio: string | null; fecha_fin: string | null; fechas_texto: string | null; duracion_dias: number | null;
  aforo_min: number | null; aforo_max: number | null;
  puntuacion: number | null; puntuacion_detalle: ResultadoPuntuacion['detalle'] | null; puntuacion_incompleta: boolean;
  puntuacion_cobertura: number | null;
}

export interface Contacto {
  id: string; festival_id: string; email: string | null; telefono: string | null;
  canal_preferido: 'email' | 'formulario' | 'instagram' | 'telefono' | null; principal: boolean;
  verificar: boolean; motivo_verificar: string | null; notas: string | null;
}

export interface Interaccion {
  id: string; festival_id: string; edicion_id: string; contacto_id: string | null; tipo: TipoInteraccion;
  fecha: string | null; asunto: string | null; cuerpo: string | null; estado_resultante: Estado | null;
  origen: 'manual' | 'claude' | 'import_csv';
}

export interface Comentario {
  id: string; tabla: string; registro_id: string; campo: string | null; texto: string; autor: 'equipo' | 'claude';
}

export interface Fuente { id: string; tabla: string; registro_id: string; campo: string | null; valor: string; url: string }

export interface ResultadoImportacion {
  festivales: Festival[]; ediciones: Edicion[]; contactos: Contacto[]; interacciones: Interaccion[];
  comentarios: Comentario[]; fuentes: Fuente[]; avisos: { festival: string; aviso: string }[];
}

/** UUID determinista: la misma fila genera siempre el mismo id. */
export function uuidDe(...partes: string[]): string {
  const h = createHash('sha1').update(partes.join('|')).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 3) | 8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const COLUMNAS = ['nombre', 'pais', 'aforo', 'fechas', 'duracion', 'genero', 'web', 'email', 'contactado', 'anotacion'] as const;
type Fila = Record<(typeof COLUMNAS)[number], string> & { linea: number };

export function leerCsv(texto: string): Fila[] {
  // relax_column_count: hay filas con menos columnas; los saltos de línea entre comillas los resuelve el parser
  const conInfo: { record: string[]; info: { lines: number } }[] = parse(texto, {
    relax_column_count: true, skip_empty_lines: true, from_line: 2, info: true,
  });
  return conInfo
    .filter(({ record }) => record.some((c) => c.trim() !== ''))
    .map(({ record, info }) => {
      const f = Object.fromEntries(COLUMNAS.map((c, i) => [c, (record[i] ?? '').trim()])) as unknown as Fila;
      f.linea = info.lines;
      return f;
    });
}

/** Puntúa la edición objetivo usando la experiencia más reciente del festival. */
function puntuar(ed: Edicion, f: Festival, experienciaReciente: string | null, cfg: PuntuacionConfig) {
  const r = calcularPuntuacion({
    experiencia: experienciaReciente, generos: f.generos, perfil_publico: f.perfil_publico, acampada: f.acampada,
    duracion_dias: ed.duracion_dias, tipo: f.tipo, aforo_min: ed.aforo_min, aforo_max: ed.aforo_max,
  }, cfg);
  ed.puntuacion = r.puntuacion;
  ed.puntuacion_detalle = r.detalle;
  ed.puntuacion_incompleta = r.incompleta;
  ed.puntuacion_cobertura = r.cobertura;
}

function nuevaEdicion(festival_id: string, anio: number, base: Partial<Edicion> = {}): Edicion {
  return {
    id: uuidDe('edicion', festival_id, String(anio)), festival_id, anio, estado: 'por_contactar',
    fecha_inicio: null, fecha_fin: null, fechas_texto: null, duracion_dias: null, aforo_min: null, aforo_max: null,
    puntuacion: null, puntuacion_detalle: null, puntuacion_incompleta: true, puntuacion_cobertura: null, ...base,
  };
}

const fmtDM = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function importar(texto: string, cfg: PuntuacionConfig): ResultadoImportacion {
  const out: ResultadoImportacion = {
    festivales: [], ediciones: [], contactos: [], interacciones: [], comentarios: [], fuentes: [], avisos: [],
  };
  const aviso = (festival: string, a: string) => out.avisos.push({ festival, aviso: a });
  const comentar = (tabla: string, registro_id: string, campo: string | null, texto: string, autor: 'equipo' | 'claude') =>
    out.comentarios.push({ id: uuidDe('comentario', tabla, registro_id, campo ?? '', texto), tabla, registro_id, campo, texto, autor });
  const parecidosPendientes: { festival: Festival; nombres: string[] }[] = [];

  for (const fila of leerCsv(texto)) {
    const clave = fila.nombre.trim().replace(/\s+/g, ' ').toLowerCase();
    const ov = OVERRIDES[clave] ?? {};
    const nombre = ov.nombre ?? limpiarNombre(fila.nombre);
    const pais = normalizarPais(fila.pais);
    const fid = uuidDe('festival', clave);
    const notas: string[] = [];
    let conv_url_csv: string | null = null;

    // Web: puede traer una página de contacto o de convocatoria en vez de la portada
    let web_url: string | null = null;
    let formulario_contacto_url: string | null = null;
    const webNorm = normalizarWeb(fila.web);
    if (webNorm) {
      const tipoUrl = new URL(webNorm).pathname.length > 1 ? clasificarUrl(webNorm) : 'otra';
      web_url = origen(webNorm);
      if (tipoUrl === 'contacto') formulario_contacto_url = webNorm;
      if (tipoUrl === 'convocatoria') conv_url_csv = webNorm;
    } else if (fila.web) {
      notas.push(`Website in original list: "${fila.web}"`);
    }

    // Columna de email: correos, URLs de formularios o texto libre
    const emails = extraerEmails(fila.email);
    for (const u of extraerUrls(fila.email)) {
      if (clasificarUrl(u) === 'convocatoria') conv_url_csv = u;
      else formulario_contacto_url = u;
    }
    const resto = textoRestante(fila.email);
    if (resto) notas.push(`Contact in original list: "${resto}"`);

    const generos = ov.generos ?? normalizarGeneros(fila.genero);
    const perfil_publico = ov.perfil_publico ?? [];
    const aforo = parseAforo(fila.aforo);
    const fechas = parseFechas(fila.fechas, fila.duracion);

    const anotacion = fila.anotacion;
    if (anotacion && !/replied/i.test(anotacion) && !/^phone/i.test(anotacion)) notas.push(`Original note: "${anotacion}"`);

    const campos_pendientes: string[] = ['ciudad', 'acampada'];
    if (perfil_publico.length === 0) campos_pendientes.push('perfil_publico');
    if (!pais) campos_pendientes.push('pais');
    if (generos.length === 0) campos_pendientes.push('generos');
    if (aforo.min == null && aforo.max == null) campos_pendientes.push('aforo');
    if (!fechas.inicio) campos_pendientes.push('fechas');
    if (!web_url) campos_pendientes.push('web');
    if (emails.length === 0 && !formulario_contacto_url) campos_pendientes.push('contacto');

    const festival: Festival = {
      id: fid, nombre, pais, tipo: ov.tipo ?? 'musica', generos, perfil_publico,
      notas_publico: ov.notas_publico ?? null, web_url, formulario_contacto_url,
      idioma_correo: idiomaPorPais(pais),
      fuera_de_alcance: pais != null && !PAISES_EN_ALCANCE.includes(pais),
      campos_pendientes, notas: notas.length ? notas.join('\n') : null, acampada: null, parecido_a: [],
    };
    out.festivales.push(festival);
    if (ov.parecido_a) parecidosPendientes.push({ festival, nombres: ov.parecido_a });
    out.fuentes.push({
      id: uuidDe('fuente', fid), tabla: 'festivales', registro_id: fid, campo: null,
      valor: JSON.stringify(Object.fromEntries(COLUMNAS.map((c) => [c, fila[c]]))),
      url: `${ARCHIVO_CSV}#linea=${fila.linea}`,
    });

    // Contactos (principal solo si hay un único correo)
    const telefono = extraerTelefono(anotacion);
    emails.forEach((email, i) => {
      out.contactos.push({
        id: uuidDe('contacto', fid, email), festival_id: fid, email, telefono: i === 0 ? telefono : null,
        canal_preferido: 'email', principal: emails.length === 1, verificar: false, motivo_verificar: null, notas: null,
      });
    });
    if (telefono && emails.length === 0) {
      out.contactos.push({ id: uuidDe('contacto', fid, telefono), festival_id: fid, email: null, telefono,
        canal_preferido: 'telefono', principal: true, verificar: false, motivo_verificar: null, notas: null });
    }
    if (emails.length > 1) {
      comentar('festivales', fid, 'contactos',
        `${emails.length} email addresses in the original list. Choose the main contact before writing.`, 'claude');
    }

    // Edición 2026 (historial)
    const e26 = nuevaEdicion(fid, 2026, {
      fecha_inicio: fechas.inicio, fecha_fin: fechas.fin, fechas_texto: fechas.texto, duracion_dias: fechas.duracion,
      aforo_min: aforo.min, aforo_max: aforo.max,
      ...(conv_url_csv ? { conv_url: conv_url_csv, conv_metodo: 'formulario' as const } : {}),
      ...ov.e2026,
    });
    if (e26.fechas_texto == null && e26.fecha_inicio == null && /november/i.test(anotacion)) e26.fechas_texto = 'November';

    const detectadas = detectarInteracciones(fila.contactado, anotacion);
    let estado26 = 'por_contactar' as Estado;
    const contactoPrincipal = out.contactos.find((c) => c.festival_id === fid && c.email) ?? null;
    detectadas.forEach((d, i) => {
      const estado = d.tipo === 'correo_recibido' ? (ov.estadoRespuesta ?? d.estado) : d.estado;
      estado26 = estado;
      out.interacciones.push({
        id: uuidDe('interaccion', fid, '2026', String(i)), festival_id: fid, edicion_id: e26.id,
        contacto_id: d.tipo.startsWith('correo') ? contactoPrincipal?.id ?? null : null,
        tipo: d.tipo, fecha: null, asunto: null,
        cuerpo: `${d.resumen.replace(/\.$/, '')}. Imported from the 2026 list; actual date unknown.`,
        estado_resultante: estado, origen: 'import_csv',
      });
    });
    // La temporada 2026 ya terminó: lo que quedó esperando respuesta pasa a "sin respuesta"
    if (estado26 === 'esperando_respuesta' || estado26 === 'convocatoria_enviada') estado26 = 'sin_respuesta';
    e26.estado = ov.e2026?.estado ?? estado26;

    // Edición 2027 (objetivo): hereda aforo y duración; fechas por confirmar
    const ref26 = e26.fecha_inicio
      ? `${fmtDM(e26.fecha_inicio)}${e26.fecha_fin && e26.fecha_fin !== e26.fecha_inicio ? `–${fmtDM(e26.fecha_fin)}` : ''}`
      : e26.fechas_texto;
    const e27 = nuevaEdicion(fid, 2027, {
      duracion_dias: fechas.duracion, aforo_min: aforo.min, aforo_max: aforo.max,
      fechas_texto: ref26 ? `TBC (2026: ${ref26})` : null,
      ...(conv_url_csv ? { conv_url: conv_url_csv, conv_metodo: 'formulario' as const } : {}),
      ...ov.e2027,
    });
    out.ediciones.push(e26, e27);

    for (const c of ov.comentarios ?? []) {
      const reg = c.tabla === 'festivales' ? fid : c.tabla === 'ediciones_2026' ? e26.id : e27.id;
      comentar(c.tabla.startsWith('ediciones') ? 'ediciones' : 'festivales', reg, c.campo, c.texto, 'equipo');
    }

    if (fila.fechas.includes('/206')) aviso(nombre, 'Fecha de fin con errata ("27/06/206"); interpretada como 27/06/2026.');
    if (aforo.min == null && aforo.max == null) aviso(nombre, 'Sin aforo: pendiente de revisar.');
    if (generos.length === 0) aviso(nombre, 'Sin género: pendiente de revisar.');
    if (!pais) aviso(nombre, 'Sin país: pendiente de revisar.');
  }

  // Festivales añadidos a mano
  for (const x of FESTIVALES_EXTRA) {
    const fid = uuidDe('festival', x.nombre.toLowerCase());
    const festival: Festival = {
      id: fid, nombre: x.nombre, pais: x.pais, tipo: 'musica', generos: [], perfil_publico: [], notas_publico: null,
      web_url: origen(x.e2027.conv_url), formulario_contacto_url: null, idioma_correo: idiomaPorPais(x.pais),
      fuera_de_alcance: false,
      campos_pendientes: ['ciudad', 'acampada', 'generos', 'perfil_publico', 'aforo', 'fechas', 'contacto'],
      notas: x.notas, acampada: null, parecido_a: [],
    };
    const e27 = nuevaEdicion(fid, 2027, { ...x.e2027 });
    out.festivales.push(festival);
    out.ediciones.push(e27);
    out.interacciones.push({
      id: uuidDe('interaccion', fid, '2027', '0'), festival_id: fid, edicion_id: e27.id, contacto_id: null,
      tipo: x.interaccion.tipo, fecha: x.interaccion.fecha, asunto: x.interaccion.asunto,
      cuerpo: `Application form submitted at ${x.e2027.conv_url}`, estado_resultante: x.interaccion.estado, origen: 'manual',
    });
    out.fuentes.push({ id: uuidDe('fuente', fid), tabla: 'festivales', registro_id: fid, campo: null,
      valor: 'Added manually by Rodrigo (24/11/2026)', url: x.e2027.conv_url });
    aviso(x.nombre, 'Añadido a mano: faltan género, aforo, fechas y ciudad.');
  }

  // Festivales parecidos (por nombre ya corregido)
  for (const { festival, nombres } of parecidosPendientes) {
    festival.parecido_a = nombres.map((n) => {
      const otro = out.festivales.find((f) => f.nombre === n);
      if (!otro) throw new Error(`parecido_a: festival no encontrado "${n}"`);
      return otro.id;
    });
  }

  // Puntuación de la edición objetivo (2027) con la experiencia más reciente
  for (const f of out.festivales) {
    const eds = out.ediciones.filter((e) => e.festival_id === f.id).sort((a, b) => a.anio - b.anio);
    const objetivo = eds.find((e) => e.anio === 2027);
    if (!objetivo) continue;
    const reciente = [...eds].reverse().find((e) => e.experiencia)?.experiencia ?? null;
    puntuar(objetivo, f, reciente, cfg);
  }

  // Correos repetidos en festivales distintos
  const porEmail = new Map<string, Contacto[]>();
  for (const c of out.contactos) if (c.email) porEmail.set(c.email, [...(porEmail.get(c.email) ?? []), c]);
  for (const [email, cs] of porEmail) {
    if (new Set(cs.map((c) => c.festival_id)).size < 2) continue;
    const nombres = cs.map((c) => out.festivales.find((f) => f.id === c.festival_id)!.nombre);
    for (const c of cs) {
      c.verificar = true;
      c.motivo_verificar = `${email} also appears for: ${nombres.join(', ')}. Verify before using it.`;
    }
    aviso(nombres.join(' / '), `Correo repetido (${email}): marcado para verificar.`);
  }

  // Nombres repetidos
  const vistos = new Set<string>();
  for (const f of out.festivales) {
    const k = `${f.nombre.toLowerCase()}|${f.pais ?? ''}`;
    if (vistos.has(k)) throw new Error(`Festival repetido: ${f.nombre}`);
    vistos.add(k);
  }
  return out;
}
