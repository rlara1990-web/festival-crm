import { describe, expect, it } from 'vitest';
import { aforoRepresentativo, calcularPuntuacion, validarConfig, valorTramoAforo, type EntradaPuntuacion } from '../src/scoring/score.ts';
import { CONFIG_INICIAL as cfg } from '../src/scoring/default-config.ts';

const base: EntradaPuntuacion = { generos: [], perfil_publico: [], tipo: null, aforo_min: null, aforo_max: null };

describe('configuración inicial', () => {
  it('es válida', () => expect(validarConfig(cfg)).toEqual([]));
  it('los pesos suman 100', () => {
    expect(Object.values(cfg.pesos).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it('detecta errores', () => {
    const mala = { ...cfg, afinidad_genero: { rock: 120 }, tramos_aforo: [{ hasta: 10, valor: 5 }] };
    expect(validarConfig(mala).length).toBe(2);
  });
});

describe('aforo', () => {
  it('usa el punto medio del rango o el extremo conocido', () => {
    expect(aforoRepresentativo(11000, 25000)).toBe(18000);
    expect(aforoRepresentativo(50000, null)).toBe(50000);
    expect(aforoRepresentativo(null, 5000)).toBe(5000);
    expect(aforoRepresentativo(null, null)).toBeNull();
  });
  it('asigna el tramo correcto en los límites', () => {
    expect(valorTramoAforo(4999, cfg.tramos_aforo)).toBe(40);
    expect(valorTramoAforo(5000, cfg.tramos_aforo)).toBe(60);
    expect(valorTramoAforo(30000, cfg.tramos_aforo)).toBe(90);
    expect(valorTramoAforo(300000, cfg.tramos_aforo)).toBe(65);
  });
});

describe('calcularPuntuacion', () => {
  it('con todos los factores es la media ponderada', () => {
    const r = calcularPuntuacion(
      { generos: ['electronica'], perfil_publico: ['turista_internacional'], tipo: 'musica', aforo_min: 10000, aforo_max: 10000 },
      cfg,
    );
    // 80*0.35 + 90*0.30 + 90*0.20 + 70*0.15 = 28 + 27 + 18 + 10.5 = 83.5 -> 84
    expect(r.puntuacion).toBe(84);
    expect(r.incompleta).toBe(false);
  });

  it('promedia varios géneros', () => {
    const r = calcularPuntuacion({ ...base, generos: ['electronica', 'metal'] }, cfg);
    expect(r.detalle.genero.valor).toBe(45);
  });

  it('redistribuye los pesos cuando falta un factor y marca incompleta', () => {
    const r = calcularPuntuacion({ ...base, generos: ['world'], tipo: 'musica' }, cfg);
    // pesos disponibles 35 + 15 = 50 -> 90*0.7 + 70*0.3 = 63 + 21 = 84
    expect(r.puntuacion).toBe(84);
    expect(r.incompleta).toBe(true);
    expect(r.detalle.publico.peso).toBe(0);
    expect(r.detalle.genero.peso).toBe(0.7);
  });

  it('sin ningún dato devuelve null', () => {
    const r = calcularPuntuacion(base, cfg);
    expect(r.puntuacion).toBeNull();
    expect(r.incompleta).toBe(true);
  });

  it('informa géneros sin afinidad configurada y los ignora', () => {
    const r = calcularPuntuacion({ ...base, generos: ['electronica', 'kpop'] }, cfg);
    expect(r.detalle.genero.valor).toBe(80);
    expect(r.detalle.genero.desconocidos).toEqual(['kpop']);
  });

  it('un festival de rock/punk (Vilar de Mouros) puntúa bajo frente a uno de world music', () => {
    const vilar = calcularPuntuacion({ ...base, generos: ['rock', 'punk'], tipo: 'musica' }, cfg);
    const sines = calcularPuntuacion({ ...base, generos: ['world'], tipo: 'musica', aforo_min: 20000, aforo_max: 20000 }, cfg);
    expect(vilar.puntuacion!).toBeLessThan(50);
    expect(sines.puntuacion!).toBeGreaterThan(vilar.puntuacion! + 30);
  });

  it('siempre está entre 0 y 100', () => {
    const extremos = [
      { ...base, generos: ['metal'], perfil_publico: ['nicho_subcultura'], tipo: 'otro', aforo_min: 1000, aforo_max: 1000 },
      { ...base, generos: ['world'], perfil_publico: ['turista_internacional'], tipo: 'comida_vegana', aforo_min: 20000, aforo_max: 20000 },
    ];
    for (const e of extremos) {
      const p = calcularPuntuacion(e, cfg).puntuacion!;
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});
