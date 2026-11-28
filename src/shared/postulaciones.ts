// Postulaciones a festivales: progreso y sugerencias del banco de respuestas.

export interface RespuestaPostulacion { pregunta: string; respuesta: string | null; estado: 'vacia' | 'borrador' | 'revisada' }
export interface EntradaBanco { id: string; tema: string; pregunta: string; respuesta: string }

export function progreso(rs: RespuestaPostulacion[]) {
  const revisadas = rs.filter((r) => r.estado === 'revisada').length;
  const borrador = rs.filter((r) => r.estado === 'borrador').length;
  return { total: rs.length, revisadas, borrador, vacias: rs.length - revisadas - borrador, lista: rs.length > 0 && revisadas === rs.length };
}

/** Estado que corresponde al editar una respuesta: vacía si no hay texto; si había texto revisado y cambia, vuelve a borrador. */
export function estadoTrasEditar(texto: string, anterior: RespuestaPostulacion['estado']): RespuestaPostulacion['estado'] {
  if (!texto.trim()) return 'vacia';
  return anterior === 'revisada' ? 'borrador' : anterior === 'vacia' ? 'borrador' : anterior;
}

const VACIAS = new Set(('a an the and or of to in on for with your you our we is are be do does what which how please describe ' +
  'tell us about any have has will would can if this that it its as at by from per o a os as e de do da dos das em no na para com ' +
  'por que qual quais como seu sua vosso vossa el la los las y del en con su sus cual cuales').split(' '));

function palabras(t: string): Set<string> {
  return new Set(t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !VACIAS.has(w)).map((w) => w.replace(/(es|s)$/, '')));
}

/** Entradas del banco ordenadas por parecido con la pregunta (solapamiento de palabras); solo las que comparten algo. */
export function sugerencias(pregunta: string, banco: EntradaBanco[], max = 3): EntradaBanco[] {
  const p = palabras(pregunta);
  if (p.size === 0) return [];
  return banco
    .map((b) => {
      const q = palabras(`${b.tema} ${b.pregunta}`);
      const comunes = [...p].filter((w) => q.has(w)).length;
      return { b, nota: comunes / Math.sqrt(p.size * Math.max(q.size, 1)) };
    })
    .filter((x) => x.nota > 0)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, max)
    .map((x) => x.b);
}
