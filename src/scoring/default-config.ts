// Valores acordados con Rodrigo el 24/11/2026. Una vez cargados, la fuente de
// verdad es la tabla puntuacion_config; este archivo solo sirve para la carga inicial.
import type { PuntuacionConfig } from './score.ts';

export const CONFIG_INICIAL: PuntuacionConfig = {
  pesos: { experiencia: 30, genero: 20, publico: 15, acampada: 10, duracion: 10, tipo: 10, aforo: 5 },
  afinidad_experiencia: { muy_positiva: 100, positiva: 80, neutra: 50, negativa: 25, muy_negativa: 0 },
  afinidad_genero: {
    world: 90, indie: 85, electronica: 80, hippie: 75, cultural: 75, latino: 75, alternativo: 75,
    reggae_dub: 70, pop: 65, hip_hop: 60, afrobeat: 60, psicodelia: 60, jazz: 60,
    opera: 40, blues: 40, industrial: 35, rock: 35, steampunk: 30, punk: 20, metal: 10,
  },
  afinidad_publico: { turista_internacional: 90, mixto: 75, familias: 60, joven_local: 50, nicho_subcultura: 15 },
  afinidad_tipo: { musica: 90, otro: 40, gastronomia: 30, comida_vegana: 30 },
  valores_acampada: { si: 100, no: 40 },
  tramos_duracion: [
    { hasta: 1, valor: 30 },
    { hasta: 2, valor: 50 },
    { hasta: 3, valor: 70 },
    { hasta: 5, valor: 85 },
    { hasta: null, valor: 100 },
  ],
  tramos_aforo: [
    { hasta: 4999, valor: 40 },
    { hasta: 9999, valor: 60 },
    { hasta: 30000, valor: 90 },
    { hasta: 60000, valor: 80 },
    { hasta: null, valor: 65 },
  ],
  valor_faltante: 50,
};
