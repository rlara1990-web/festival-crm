// Funciones puras de limpieza para la lista original de 2026.

export type Estado =
  | 'por_contactar' | 'contactado' | 'respondio' | 'interesado' | 'convocatoria_enviada'
  | 'aceptado' | 'rechazado' | 'sin_respuesta' | 'descartado';

export type TipoInteraccion =
  | 'correo_enviado' | 'correo_recibido' | 'mensaje_redes' | 'formulario_web' | 'llamada' | 'nota_interna';

const PAISES: Record<string, string> = {
  portugal: 'PT', spain: 'ES', 'españa': 'ES', 'u.k.': 'GB', uk: 'GB', austria: 'AT', denmark: 'DK',
  france: 'FR', croatia: 'HR', poland: 'PL', belgium: 'BE', netherlands: 'NL', romania: 'RO', germany: 'DE',
};

export const PAISES_EN_ALCANCE = ['PT', 'ES'];

export function normalizarPais(raw: string | undefined): string | null {
  const k = (raw ?? '').trim().toLowerCase();
  if (!k) return null;
  const p = PAISES[k];
  if (!p) throw new Error(`País no reconocido: "${raw}"`);
  return p;
}

export function idiomaPorPais(pais: string | null): 'es' | 'pt' | 'en' | null {
  if (pais === 'PT') return 'pt';
  if (pais === 'ES') return 'es';
  return pais ? 'en' : null;
}

/** "10k", "11-25k", "26k-50K", "50k+", "<5k", "20K", "300k", "?" -> {min, max} */
export function parseAforo(raw: string | undefined): { min: number | null; max: number | null } {
  const s = (raw ?? '').trim().toLowerCase().replace(/\s/g, '');
  const nulo = { min: null, max: null };
  if (!s || s === '?') return nulo;
  const n = (x: string) => Math.round(parseFloat(x) * 1000);
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^<(\d+(?:\.\d+)?)k$/))) return { min: null, max: n(m[1]!) };
  if ((m = s.match(/^(\d+(?:\.\d+)?)k\+$/))) return { min: n(m[1]!), max: null };
  if ((m = s.match(/^(\d+(?:\.\d+)?)k?-(\d+(?:\.\d+)?)k$/))) return { min: n(m[1]!), max: n(m[2]!) };
  if ((m = s.match(/^(\d+(?:\.\d+)?)k$/))) return { min: n(m[1]!), max: n(m[1]!) };
  throw new Error(`Aforo no reconocido: "${raw}"`);
}

function parseFechaDMY(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  let anio = m[3]!;
  if (anio.length === 3 && anio.startsWith('20')) anio = '2026'; // errata "206" en Rock in Rio
  if (anio.length !== 4) return null;
  return `${anio}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const MESES: Record<string, string> = {
  january: 'enero', february: 'febrero', march: 'marzo', april: 'abril', may: 'mayo', june: 'junio',
  july: 'julio', august: 'agosto', september: 'septiembre', october: 'octubre', november: 'noviembre', december: 'diciembre',
};

/** Fechas + duración -> inicio, fin, duración y texto libre cuando no hay fecha exacta. */
export function parseFechas(rawFechas: string | undefined, rawDuracion: string | undefined) {
  const dur = /^\d+$/.test((rawDuracion ?? '').trim()) ? parseInt(rawDuracion!.trim(), 10) : null;
  const s = (rawFechas ?? '').trim();
  const out = { inicio: null as string | null, fin: null as string | null, duracion: dur, texto: null as string | null };
  if (!s) return out;
  const partes = s.split(/\s*-\s*/);
  const inicio = parseFechaDMY(partes[0]!);
  if (inicio) {
    out.inicio = inicio;
    const finExplicito = partes[1] ? parseFechaDMY(partes[1]) : null;
    out.fin = finExplicito ?? (dur ? sumarDias(inicio, dur - 1) : null);
    return out;
  }
  out.texto = s.toLowerCase().replace(/[a-z]+/g, (w) => MESES[w] ?? (w === 'to' ? 'a' : w));
  return out;
}

const RE_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const RE_URL = /https?:\/\/[^\s,]+/gi;

export function extraerEmails(raw: string | undefined): string[] {
  return [...new Set(((raw ?? '').match(RE_EMAIL) ?? []).map((e) => e.toLowerCase()))];
}

export function extraerUrls(raw: string | undefined): string[] {
  return (raw ?? '').match(RE_URL) ?? [];
}

/** Texto que queda tras quitar emails, URLs y separadores. */
export function textoRestante(raw: string | undefined): string {
  return (raw ?? '').replace(RE_URL, ' ').replace(RE_EMAIL, ' ').replace(/[\/\s]+/g, ' ').trim();
}

/** Acepta "nosalive.com" o "https://x.pt/..." y devuelve URL con esquema, o null si no parece web. */
export function normalizarWeb(raw: string | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s || /\s/.test(s) || s.includes('@')) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(s)) return `https://${s}`;
  return null;
}

export function origen(url: string): string {
  return new URL(url).origin + '/';
}

/** Clasifica una URL de página interna: convocatoria de vendedores, contacto u otra. */
export function clasificarUrl(url: string): 'convocatoria' | 'contacto' | 'otra' {
  const u = url.toLowerCase();
  if (/(docs\.google\.com\/forms|chaishop|vendor|participation|restaurant|work-with-us|propuesta-comercial)/.test(u)) return 'convocatoria';
  if (/(contact|contacta)/.test(u)) return 'contacto';
  return 'otra';
}

const GENEROS: Record<string, string[]> = {
  electronic: ['electronica'], electronica: ['electronica'], techno: ['electronica'],
  indie: ['indie'], rock: ['rock'], 'alternative rock': ['alternativo', 'rock'], alternative: ['alternativo'],
  metal: ['metal'], 'punk rock': ['punk', 'rock'], 'pop punk': ['punk', 'pop'], punk: ['punk'],
  'world music': ['world'], jazz: ['jazz'], psychedelic: ['psicodelia'], 'hip hop': ['hip_hop'],
  hiphop: ['hip_hop'], 'hip hop afrobeat': ['hip_hop', 'afrobeat'], afrobeat: ['afrobeat'], latin: ['latino'],
  pop: ['pop'], 'portuguese pop': ['pop'], cultural: ['cultural'], reggae: ['reggae_dub'], dub: ['reggae_dub'],
  blues: ['blues'], industrial: ['industrial'], hippie: ['hippie'], opera: ['opera'], steampunk: ['steampunk'],
  'indie rock': ['indie', 'rock'], speakers: [],
};

/** "Metal/Rock", "Electronic/latin/Rock" -> claves canónicas sin repetir. */
export function normalizarGeneros(raw: string | undefined): string[] {
  const out: string[] = [];
  for (const parte of (raw ?? '').split('/')) {
    const k = parte.trim().toLowerCase();
    if (!k) continue;
    const g = GENEROS[k];
    if (!g) throw new Error(`Género no reconocido: "${parte}"`);
    for (const x of g) if (!out.includes(x)) out.push(x);
  }
  return out;
}

const PALABRAS_MENORES = new Set(['de', 'do', 'da', 'dos', 'das', 'of', 'the', 'y', 'e']);

/** Quita espacios y año final; capitaliza palabras en minúscula. */
export function limpiarNombre(raw: string): string {
  const s = raw.trim().replace(/\s+/g, ' ').replace(/\s+20\d\d$/, '');
  return s
    .split(' ')
    .map((w, i) => (i > 0 && PALABRAS_MENORES.has(w.toLowerCase()) ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ');
}

export function extraerTelefono(raw: string | undefined): string | null {
  const m = (raw ?? '').match(/\+?\d[\d\s]{7,}\d/);
  return m ? m[0].replace(/\s+/g, ' ').trim() : null;
}

export interface InteraccionDetectada {
  tipo: TipoInteraccion;
  estado: Estado;
  resumen: string;
}

/** Convierte las columnas "Contacted" y "anotations" (texto libre) en interacciones. */
export function detectarInteracciones(contactado: string, anotacion: string): InteraccionDetectada[] {
  const texto = `${contactado} | ${anotacion}`.toLowerCase();
  const res: InteraccionDetectada[] = [];
  const add = (tipo: TipoInteraccion, estado: Estado, resumen: string) => {
    if (!res.some((r) => r.tipo === tipo)) res.push({ tipo, estado, resumen });
  };
  if (/(application|applied).*(filled|submitted)|(filled|submitted).*application/.test(texto)) {
    add('formulario_web', 'convocatoria_enviada', 'Solicitud de vendedor enviada por formulario web');
  } else if (/form/.test(texto) && /(filled|sent|contacted|contact)/.test(texto)) {
    add('formulario_web', 'contactado', 'Formulario de contacto enviado en la web');
  }
  if (/(email|e-mail)\s*(sent)|emailed/.test(texto)) add('correo_enviado', 'contactado', 'Correo enviado');
  if (/(instagram|\bdm\b)/.test(texto) && /(sent|contacted|message|dm)/.test(texto) && !/form in instagram/.test(texto)) {
    add('mensaje_redes', 'contactado', 'Mensaje por Instagram');
  }
  if (res.length === 0 && /^(contacted|yes)$/.test(contactado.trim().toLowerCase())) {
    add('nota_interna', 'contactado', 'Contactado (canal no registrado en la lista original)');
  }
  if (/replied/.test(texto)) add('correo_recibido', 'respondio', anotacion.replace(/^replied\s*-\s*/i, '').trim());
  return res;
}
