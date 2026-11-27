import { describe, expect, it } from 'vitest';
import { alEnviar, alVencer, sumarDiasHabiles } from '../src/shared/seguimiento.ts';

describe('sumarDiasHabiles', () => {
  it('salta fines de semana', () => {
    expect(sumarDiasHabiles('2026-11-26', 2)).toBe('2026-11-30'); // jueves + 2 → lunes
    expect(sumarDiasHabiles('2026-11-27', 2)).toBe('2026-12-01'); // viernes + 2 → martes
    expect(sumarDiasHabiles('2026-11-28', 2)).toBe('2026-12-01'); // sábado + 2 → martes
    expect(sumarDiasHabiles('2026-11-24', 2)).toBe('2026-11-26'); // martes + 2 → jueves
  });
});

describe('alEnviar', () => {
  it('primer correo: pasa a esperando respuesta con plazo de 2 días hábiles', () => {
    expect(alEnviar({ estado: 'por_contactar', recontactos: 0, proximo_recontacto: null }, '2026-11-26'))
      .toMatchObject({ estado: 'esperando_respuesta', recontactos: 0, proximo_recontacto: '2026-11-30' });
  });
  it('recontacto enviado: cuenta y renueva el plazo', () => {
    expect(alEnviar({ estado: 'recontacto_1', recontactos: 0, proximo_recontacto: null }, '2026-11-30'))
      .toMatchObject({ estado: 'recontacto_1', recontactos: 1, proximo_recontacto: '2026-12-02' });
    expect(alEnviar({ estado: 'recontacto_2', recontactos: 1, proximo_recontacto: null }, '2026-12-03'))
      .toMatchObject({ estado: 'recontacto_2', recontactos: 2 });
  });
  it('no toca conversaciones avanzadas', () => {
    for (const estado of ['en_conversacion', 'aceptado', 'rechazado', 'descartado', 'convocatoria_enviada']) {
      expect(alEnviar({ estado, recontactos: 0, proximo_recontacto: null }, '2026-11-26')).toBeNull();
    }
  });
  it('nueva temporada tras sin respuesta: vuelve a empezar', () => {
    expect(alEnviar({ estado: 'sin_respuesta', recontactos: 2, proximo_recontacto: null }, '2026-11-26'))
      .toMatchObject({ estado: 'esperando_respuesta', recontactos: 0 });
  });
});

describe('alVencer', () => {
  it('sin plazo o plazo futuro: nada', () => {
    expect(alVencer({ estado: 'esperando_respuesta', recontactos: 0, proximo_recontacto: null }, '2026-11-30')).toBeNull();
    expect(alVencer({ estado: 'esperando_respuesta', recontactos: 0, proximo_recontacto: '2026-12-01' }, '2026-11-30')).toBeNull();
  });
  it('recorre la secuencia completa hasta sin respuesta', () => {
    let e = { estado: 'por_contactar', recontactos: 0, proximo_recontacto: null as string | null };
    const enviar = (f: string) => { const c = alEnviar(e, f)!; e = { estado: c.estado, recontactos: c.recontactos, proximo_recontacto: c.proximo_recontacto }; };
    const vencer = (h: string) => { const c = alVencer(e, h); if (c) e = { estado: c.estado, recontactos: c.recontactos, proximo_recontacto: c.proximo_recontacto }; return c; };
    enviar('2026-11-26');                                  // jueves
    expect(vencer('2026-11-27')).toBeNull();               // viernes: aún no
    expect(vencer('2026-11-30')!.estado).toBe('recontacto_1');
    expect(vencer('2026-12-07')).toBeNull();               // nadie envió el recontacto: no avanza solo
    enviar('2026-12-01');
    expect(vencer('2026-12-03')!.estado).toBe('recontacto_2');
    enviar('2026-12-03');
    expect(vencer('2026-12-07')!.estado).toBe('sin_respuesta');
    expect(vencer('2026-12-20')).toBeNull();
  });
});
