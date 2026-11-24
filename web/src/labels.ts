// English labels for database values (the database keeps Spanish keys).

export const ESTADOS: Record<string, string> = {
  por_contactar: 'To contact',
  esperando_respuesta: 'Awaiting reply',
  recontacto_1: 'Follow-up 1',
  recontacto_2: 'Follow-up 2',
  sin_respuesta: 'No reply',
  en_conversacion: 'In conversation',
  reunion_agendada: 'Meeting scheduled',
  convocatoria_enviada: 'Application sent',
  aceptado: 'Accepted',
  rechazado: 'Rejected',
  descartado: 'Discarded',
};

export const ESTADO_AYUDA: Record<string, string> = {
  rechazado: 'They said no',
  descartado: 'We decided not to go',
  sin_respuesta: 'They never replied',
};

export const EXPERIENCIAS: Record<string, string> = {
  muy_positiva: 'Very positive',
  positiva: 'Positive',
  neutra: 'Neutral (around break-even)',
  negativa: 'Negative (below break-even)',
  muy_negativa: 'Very negative (well below break-even)',
};

export const TIPOS: Record<string, string> = {
  musica: 'Music festival',
  comida_vegana: 'Vegan food event',
  gastronomia: 'Food / gastronomy event',
  otro: 'Other event',
};

export const GENEROS: Record<string, string> = {
  world: 'World music', indie: 'Indie', electronica: 'Electronic', hippie: 'Hippie / psytrance',
  cultural: 'Cultural', latino: 'Latin', alternativo: 'Alternative', reggae_dub: 'Reggae / dub', pop: 'Pop',
  hip_hop: 'Hip hop', afrobeat: 'Afrobeat', psicodelia: 'Psychedelic', jazz: 'Jazz', opera: 'Opera',
  blues: 'Blues', industrial: 'Industrial', rock: 'Rock', steampunk: 'Steampunk', punk: 'Punk', metal: 'Metal',
};

export const PUBLICOS: Record<string, string> = {
  turista_internacional: 'International tourists',
  mixto: 'Mixed local & tourist',
  familias: 'Families',
  joven_local: 'Young locals',
  nicho_subcultura: 'Subculture niche (metal, punk…)',
};

export const PAISES: Record<string, string> = {
  PT: 'Portugal', ES: 'Spain', GB: 'United Kingdom', FR: 'France', DE: 'Germany', AT: 'Austria',
  BE: 'Belgium', NL: 'Netherlands', DK: 'Denmark', PL: 'Poland', HR: 'Croatia', RO: 'Romania',
};

export const IDIOMAS: Record<string, string> = { pt: 'Portuguese', es: 'Spanish', en: 'English' };

export const TIPOS_INTERACCION: Record<string, string> = {
  correo_enviado: 'Email sent',
  correo_recibido: 'Email received',
  mensaje_redes: 'Social media message',
  formulario_web: 'Web form',
  llamada: 'Call',
  reunion: 'Meeting',
  nota_interna: 'Internal note',
};

export const ORIGENES: Record<string, string> = { manual: 'Team', claude: 'Claude', import_csv: '2026 list' };

export const METODOS_CONV: Record<string, string> = { email: 'Email', formulario: 'Web form', web: 'Website', redes: 'Social media' };

export const COSTES: Record<string, string> = {
  comision: 'Commission', stand: 'Stand fee', ambos: 'Commission + stand fee', desconocido: 'Unknown',
};

export const CANALES: Record<string, string> = { email: 'Email', instagram: 'Instagram', formulario: 'Web form', telefono: 'Phone' };

export const FACTORES: Record<string, string> = {
  experiencia: 'Our experience', genero: 'Genre', publico: 'Audience', acampada: 'Camping',
  duracion: 'Duration', tipo: 'Event type', aforo: 'Capacity',
};

export const PENDIENTES: Record<string, string> = {
  ciudad: 'City', acampada: 'Camping', perfil_publico: 'Audience', pais: 'Country', generos: 'Genres',
  aforo: 'Capacity', fechas: 'Dates', web: 'Website', contacto: 'Contact',
};

export const label = (tabla: Record<string, string>, k: string | null | undefined) =>
  k == null ? '—' : tabla[k] ?? k;

export const siNo = (v: boolean | null | undefined) => (v == null ? 'Unknown' : v ? 'Yes' : 'No');

export function aforoTexto(min: number | null, max: number | null): string {
  const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));
  if (min != null && max != null) return min === max ? k(min) : `${k(min)}–${k(max)}`;
  if (min != null) return `${k(min)}+`;
  if (max != null) return `<${k(max)}`;
  return '—';
}

export function fechaTexto(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
