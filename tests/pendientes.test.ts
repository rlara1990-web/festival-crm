import { describe, expect, it } from 'vitest';
import { calcularPendientes } from '../src/shared/pendientes.ts';

const vacio = {
  pais: null, ciudad: null, generos: [], perfil_publico: [], acampada: null, web_url: null,
  formulario_contacto_url: null, tieneEmail: false, aforo_min: null, aforo_max: null, fecha_inicio: null,
};

describe('calcularPendientes', () => {
  it('sin datos, todo pendiente', () => {
    expect(calcularPendientes(vacio)).toEqual(['ciudad', 'acampada', 'perfil_publico', 'pais', 'generos', 'aforo', 'fechas', 'web', 'contacto']);
  });
  it('los campos completados dejan de estar pendientes', () => {
    const r = calcularPendientes({
      ...vacio, pais: 'PT', ciudad: 'Lisbon', generos: ['electronica'], perfil_publico: ['mixto'], acampada: false,
      web_url: 'https://x.pt/', tieneEmail: true, aforo_max: 5000, fecha_inicio: '2027-07-01',
    });
    expect(r).toEqual([]);
  });
  it('acampada = no cuenta como dato (no pendiente)', () => {
    expect(calcularPendientes({ ...vacio, acampada: false })).not.toContain('acampada');
  });
  it('un formulario de contacto basta como contacto', () => {
    expect(calcularPendientes({ ...vacio, formulario_contacto_url: 'https://x.pt/contact' })).not.toContain('contacto');
  });
});
