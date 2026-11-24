// Valores iniciales de la puntuación. Son hipótesis para afinar con Rodrigo:
// una vez cargados, la fuente de verdad es la tabla puntuacion_config.
// Ancla conocida: Vilar de Mouros 2026 (rock / pop punk) dio pérdidas.
import type { PuntuacionConfig } from './score.ts';

export const CONFIG_INICIAL: PuntuacionConfig = {
  pesos: { genero: 35, publico: 30, aforo: 20, tipo: 15 },
  afinidad_genero: {
    world: 90,
    reggae_dub: 85,
    electronica: 80,
    hippie: 75,
    cultural: 75,
    hip_hop: 75,
    afrobeat: 75,
    latino: 75,
    indie: 70,
    pop: 65,
    psicodelia: 60,
    jazz: 60,
    alternativo: 60,
    opera: 40,
    blues: 40,
    industrial: 35,
    rock: 35,
    steampunk: 30,
    punk: 20,
    metal: 10,
  },
  afinidad_publico: {
    turista_internacional: 90,
    mixto: 75,
    familias: 60,
    joven_local: 50,
    nicho_subcultura: 15,
  },
  afinidad_tipo: {
    comida_vegana: 90,
    gastronomia: 85,
    musica: 70,
    otro: 50,
  },
  tramos_aforo: [
    { hasta: 4999, valor: 40 },
    { hasta: 9999, valor: 60 },
    { hasta: 30000, valor: 90 },
    { hasta: 60000, valor: 80 },
    { hasta: null, valor: 65 },
  ],
};
