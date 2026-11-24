import { describe, expect, it } from 'vitest';
import {
  aforoRepresentativo, calcularPuntuacion, validarConfig, valorTramo, type EntradaPuntuacion,
} from '../src/scoring/score.ts';
import { CONFIG_INICIAL as cfg } from '../src/scoring/default-config.ts';

const base: EntradaPuntuacion = {
  experiencia: null, generos: [], perfil_publico: [], acampada: null, duracion_dias: null,
  tipo: null, aforo_min: null, aforo_max: null,
};

describe('configuración inicial', () => {
  it('es válida y los pesos suman 100', () => {
    expect(validarConfig(cfg)).toEqual([]);
    expect(Object.values(cfg.pesos).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it('detecta errores', () => {
    const mala = { ...cfg, afinidad_genero: { rock: 120 }, tramos_duracion: [{ hasta: 3, valor: 5 }] };
    expect(validarConfig(mala).length).toBe(2);
  });
});

describe('tramos', () => {
  it('aforo representativo', () => {
    expect(aforoRepresentativo(11000, 25000)).toBe(18000);
    expect(aforoRepresentativo(50000, null)).toBe(50000);
    expect(aforoRepresentativo(null, 5000)).toBe(5000);
    expect(aforoRepresentativo(null, null)).toBeNull();
  });
  it('límites de aforo y duración', () => {
    expect(valorTramo(4999, cfg.tramos_aforo)).toBe(40);
    expect(valorTramo(5000, cfg.tramos_aforo)).toBe(60);
    expect(valorTramo(30000, cfg.tramos_aforo)).toBe(90);
    expect(valorTramo(300000, cfg.tramos_aforo)).toBe(65);
    expect(valorTramo(1, cfg.tramos_duracion)).toBe(30);
    expect(valorTramo(3, cfg.tramos_duracion)).toBe(70);
    expect(valorTramo(5, cfg.tramos_duracion)).toBe(85);
    expect(valorTramo(8, cfg.tramos_duracion)).toBe(100);
  });
});

describe('calcularPuntuacion', () => {
  it('Waking Life con todos los factores: 93 (ejemplo acordado con Rodrigo)', () => {
    const r = calcularPuntuacion({
      experiencia: 'muy_positiva', generos: ['electronica'], perfil_publico: ['turista_internacional'],
      acampada: true, duracion_dias: 8, tipo: 'musica', aforo_min: 10000, aforo_max: 10000,
    }, cfg);
    // 30 + 16 + 13.5 + 10 + 10 + 9 + 4.5 = 93
    expect(r.puntuacion).toBe(93);
    expect(r.incompleta).toBe(false);
  });

  it('promedia varios géneros', () => {
    expect(calcularPuntuacion({ ...base, generos: ['electronica', 'metal'] }, cfg).detalle.genero.valor).toBe(45);
  });

  it('redistribuye los pesos cuando faltan factores', () => {
    const r = calcularPuntuacion({ ...base, generos: ['world'], tipo: 'musica' }, cfg);
    // pesos disponibles 20 + 10 = 30 -> 90*(20/30) + 90*(10/30) = 90
    expect(r.puntuacion).toBe(90);
    expect(r.incompleta).toBe(true);
    expect(r.detalle.publico.peso).toBe(0);
    expect(r.detalle.genero.peso).toBe(0.667);
  });

  it('sin experiencia, género, público ni aforo no puntúa', () => {
    expect(calcularPuntuacion(base, cfg).puntuacion).toBeNull();
    expect(calcularPuntuacion({ ...base, tipo: 'musica', acampada: true, duracion_dias: 3 }, cfg).puntuacion).toBeNull();
  });

  it('la experiencia sola basta para puntuar', () => {
    expect(calcularPuntuacion({ ...base, experiencia: 'muy_negativa' }, cfg).puntuacion).toBe(0);
  });

  it('informa claves sin afinidad configurada y las ignora', () => {
    const r = calcularPuntuacion({ ...base, generos: ['electronica', 'kpop'], tipo: 'circo' }, cfg);
    expect(r.detalle.genero).toMatchObject({ valor: 80, desconocidos: ['kpop'] });
    expect(r.detalle.tipo).toMatchObject({ valor: null, desconocidos: ['circo'] });
  });

  it('la acampada y la duración suben la puntuación', () => {
    const sin = calcularPuntuacion({ ...base, generos: ['indie'], acampada: false, duracion_dias: 1 }, cfg).puntuacion!;
    const con = calcularPuntuacion({ ...base, generos: ['indie'], acampada: true, duracion_dias: 4 }, cfg).puntuacion!;
    expect(con).toBeGreaterThan(sin);
  });

  it('un festival con experiencia muy negativa queda muy por debajo de uno muy positivo', () => {
    const vilar = calcularPuntuacion({ ...base, experiencia: 'muy_negativa', generos: ['rock', 'punk', 'pop'], tipo: 'musica', duracion_dias: 4 }, cfg);
    const coura = calcularPuntuacion({ ...base, experiencia: 'muy_positiva', generos: ['rock', 'indie'], tipo: 'musica', duracion_dias: 4, aforo_min: 100000, aforo_max: 100000 }, cfg);
    expect(coura.puntuacion! - vilar.puntuacion!).toBeGreaterThan(40);
  });

  it('siempre está entre 0 y 100', () => {
    const extremos: EntradaPuntuacion[] = [
      { experiencia: 'muy_negativa', generos: ['metal'], perfil_publico: ['nicho_subcultura'], acampada: false, duracion_dias: 1, tipo: 'comida_vegana', aforo_min: 1000, aforo_max: 1000 },
      { experiencia: 'muy_positiva', generos: ['world'], perfil_publico: ['turista_internacional'], acampada: true, duracion_dias: 10, tipo: 'musica', aforo_min: 20000, aforo_max: 20000 },
    ];
    for (const e of extremos) {
      const p = calcularPuntuacion(e, cfg).puntuacion!;
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});
