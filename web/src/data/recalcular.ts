// Tras cualquier cambio en un festival: recalcula la puntuación de la edición objetivo
// (la del año más reciente) y la lista de campos pendientes.
import { calcularPuntuacion } from '../../../src/scoring/score.ts';
import { calcularPendientes } from '../../../src/shared/pendientes.ts';
import type { Api } from './api.ts';

export async function recalcularFestival(api: Api, festivalId: string): Promise<void> {
  const [festivales, ediciones, contactos, cfg] = await Promise.all([
    api.festivales(), api.ediciones(festivalId), api.contactos(festivalId), api.config(),
  ]);
  const f = festivales.find((x) => x.id === festivalId);
  if (!f || ediciones.length === 0) return;
  const ordenadas = [...ediciones].sort((a, b) => a.anio - b.anio);
  const objetivo = ordenadas[ordenadas.length - 1]!;
  const experiencia = [...ordenadas].reverse().find((e) => e.experiencia)?.experiencia ?? null;

  const r = calcularPuntuacion({
    experiencia, generos: f.generos, perfil_publico: f.perfil_publico, acampada: f.acampada,
    duracion_dias: objetivo.duracion_dias, tipo: f.tipo, aforo_min: objetivo.aforo_min, aforo_max: objetivo.aforo_max,
  }, cfg);
  await api.actualizarEdicion(objetivo.id, {
    puntuacion: r.puntuacion, puntuacion_detalle: r.detalle, puntuacion_incompleta: r.incompleta,
    puntuacion_cobertura: r.cobertura, puntuacion_calculada_en: new Date().toISOString(),
  });

  const pendientes = calcularPendientes({
    pais: f.pais, ciudad: f.ciudad, generos: f.generos, perfil_publico: f.perfil_publico, acampada: f.acampada,
    web_url: f.web_url, formulario_contacto_url: f.formulario_contacto_url,
    tieneEmail: contactos.some((c) => c.email && !c.baja_en),
    aforo_min: objetivo.aforo_min, aforo_max: objetivo.aforo_max, fecha_inicio: objetivo.fecha_inicio,
  });
  if (pendientes.join() !== f.campos_pendientes.join()) await api.actualizarFestival(f.id, { campos_pendientes: pendientes });
}
