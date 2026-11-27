// Qué datos puede proponer Claude y cómo se aplican al aceptarlos.
// La experiencia nunca se propone (solo la ponen Rodrigo o Zac).

export type TipoValor = 'texto' | 'url' | 'fecha' | 'entero' | 'booleano' | 'generos' | 'publico' | 'tipo' | 'metodo';

export const CAMPOS_PROPONIBLES: Record<string, { tipo: TipoValor; etiqueta: string }> = {
  'festivales.ciudad': { tipo: 'texto', etiqueta: 'City' },
  'festivales.acampada': { tipo: 'booleano', etiqueta: 'Camping' },
  'festivales.generos': { tipo: 'generos', etiqueta: 'Genres' },
  'festivales.perfil_publico': { tipo: 'publico', etiqueta: 'Audience' },
  'festivales.notas_publico': { tipo: 'texto', etiqueta: 'Audience notes' },
  'festivales.tipo': { tipo: 'tipo', etiqueta: 'Event type' },
  'festivales.web_url': { tipo: 'url', etiqueta: 'Website' },
  'festivales.instagram_url': { tipo: 'url', etiqueta: 'Instagram' },
  'festivales.formulario_contacto_url': { tipo: 'url', etiqueta: 'Contact form' },
  'ediciones.fecha_inicio': { tipo: 'fecha', etiqueta: 'Start date' },
  'ediciones.fecha_fin': { tipo: 'fecha', etiqueta: 'End date' },
  'ediciones.fechas_texto': { tipo: 'texto', etiqueta: 'Dates (text)' },
  'ediciones.duracion_dias': { tipo: 'entero', etiqueta: 'Days' },
  'ediciones.aforo_min': { tipo: 'entero', etiqueta: 'Capacity min' },
  'ediciones.aforo_max': { tipo: 'entero', etiqueta: 'Capacity max' },
  'ediciones.conv_apertura': { tipo: 'fecha', etiqueta: 'Applications open' },
  'ediciones.conv_cierre': { tipo: 'fecha', etiqueta: 'Applications close' },
  'ediciones.conv_metodo': { tipo: 'metodo', etiqueta: 'How to apply' },
  'ediciones.conv_url': { tipo: 'url', etiqueta: 'Application link' },
  'ediciones.conv_notas': { tipo: 'texto', etiqueta: 'Application notes' },
  'ediciones.acepta_food_trucks': { tipo: 'booleano', etiqueta: 'Food trucks accepted' },
  'contactos.nuevo': { tipo: 'texto', etiqueta: 'New contact' },
};

const GENEROS = ['world', 'indie', 'electronica', 'hippie', 'cultural', 'latino', 'alternativo', 'reggae_dub', 'pop',
  'hip_hop', 'afrobeat', 'psicodelia', 'jazz', 'opera', 'blues', 'industrial', 'rock', 'steampunk', 'punk', 'metal'];
const PUBLICOS = ['turista_internacional', 'mixto', 'familias', 'joven_local', 'nicho_subcultura'];
const TIPOS = ['musica', 'comida_vegana', 'gastronomia', 'otro'];
const METODOS = ['email', 'formulario', 'web', 'redes'];

export interface ContactoPropuesto { email?: string | null; nombre?: string | null; rol?: string | null; telefono?: string | null }

/** Devuelve un error legible si el valor no es válido para el campo, o null si está bien. */
export function validarPropuesta(tabla: string, campo: string, valor: unknown): string | null {
  const spec = CAMPOS_PROPONIBLES[`${tabla}.${campo}`];
  if (!spec) return `Field not allowed: ${tabla}.${campo}`;
  if (tabla === 'contactos') {
    const c = valor as ContactoPropuesto;
    if (!c || typeof c !== 'object') return 'Contact must be an object';
    if (!c.email && !c.telefono) return 'Contact needs an email or phone';
    if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return `Invalid email: ${c.email}`;
    return null;
  }
  switch (spec.tipo) {
    case 'texto': return typeof valor === 'string' && valor.trim() ? null : 'Expected text';
    case 'url': return typeof valor === 'string' && /^https?:\/\/\S+$/.test(valor) ? null : 'Expected a URL starting with http(s)://';
    case 'fecha': return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? null : 'Expected a date YYYY-MM-DD';
    case 'entero': return Number.isInteger(valor) && (valor as number) > 0 ? null : 'Expected a positive whole number';
    case 'booleano': return typeof valor === 'boolean' ? null : 'Expected true or false';
    case 'generos': return Array.isArray(valor) && valor.length > 0 && valor.every((g) => GENEROS.includes(g)) ? null : 'Unknown genre';
    case 'publico': return Array.isArray(valor) && valor.length > 0 && valor.every((g) => PUBLICOS.includes(g)) ? null : 'Unknown audience';
    case 'tipo': return typeof valor === 'string' && TIPOS.includes(valor) ? null : 'Unknown event type';
    case 'metodo': return typeof valor === 'string' && METODOS.includes(valor) ? null : 'Unknown application method';
  }
}

/** Festival o evento nuevo propuesto por Claude (propuestas.tipo = 'festival_nuevo'). */
export interface FestivalNuevo {
  nombre: string;
  pais: 'PT' | 'ES';
  ciudad?: string | null;
  tipo: string;
  generos?: string[];
  perfil_publico?: string[];
  acampada?: boolean | null;
  web_url?: string | null;
  instagram_url?: string | null;
  idioma_correo?: string | null;
  fecha_inicio?: string | null; // edición 2027
  fecha_fin?: string | null;
  fechas_texto?: string | null;
  duracion_dias?: number | null;
  aforo_min?: number | null;
  aforo_max?: number | null;
  conv_url?: string | null;
  contacto?: ContactoPropuesto | null;
  por_que: string; // por qué encaja, en inglés
}

/** Valida un festival nuevo con las mismas reglas que los datos sueltos. */
export function validarFestivalNuevo(v: FestivalNuevo): string | null {
  if (!v || typeof v !== 'object') return 'Expected an object';
  if (!v.nombre?.trim()) return 'Missing name';
  if (v.pais !== 'PT' && v.pais !== 'ES') return 'Country must be PT or ES';
  if (!v.por_que?.trim()) return 'Missing reason (por_que)';
  const comprobar: [string, string, unknown][] = [
    ['festivales', 'tipo', v.tipo], ['festivales', 'ciudad', v.ciudad], ['festivales', 'generos', v.generos],
    ['festivales', 'perfil_publico', v.perfil_publico], ['festivales', 'acampada', v.acampada], ['festivales', 'web_url', v.web_url],
    ['festivales', 'instagram_url', v.instagram_url], ['ediciones', 'fecha_inicio', v.fecha_inicio], ['ediciones', 'fecha_fin', v.fecha_fin],
    ['ediciones', 'fechas_texto', v.fechas_texto], ['ediciones', 'duracion_dias', v.duracion_dias], ['ediciones', 'aforo_min', v.aforo_min],
    ['ediciones', 'aforo_max', v.aforo_max], ['ediciones', 'conv_url', v.conv_url], ['contactos', 'nuevo', v.contacto],
  ];
  for (const [tabla, campo, valor] of comprobar) {
    if (valor == null || (Array.isArray(valor) && valor.length === 0)) continue;
    const e = validarPropuesta(tabla, campo, valor);
    if (e) return `${campo}: ${e}`;
  }
  if (v.idioma_correo && !['es', 'pt', 'en'].includes(v.idioma_correo)) return 'Email language must be es, pt or en';
  if (v.fecha_inicio && v.fecha_fin && v.fecha_fin < v.fecha_inicio) return 'End date before start date';
  return null;
}
