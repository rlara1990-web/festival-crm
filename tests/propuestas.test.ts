import { describe, expect, it } from 'vitest';
import { CAMPOS_PROPONIBLES, validarPropuesta } from '../src/shared/propuestas.ts';

describe('validarPropuesta', () => {
  it('acepta valores válidos', () => {
    expect(validarPropuesta('festivales', 'ciudad', 'Lisbon')).toBeNull();
    expect(validarPropuesta('festivales', 'acampada', true)).toBeNull();
    expect(validarPropuesta('festivales', 'generos', ['electronica', 'world'])).toBeNull();
    expect(validarPropuesta('ediciones', 'fecha_inicio', '2027-07-08')).toBeNull();
    expect(validarPropuesta('ediciones', 'aforo_max', 25000)).toBeNull();
    expect(validarPropuesta('ediciones', 'conv_url', 'https://x.pt/vendors')).toBeNull();
    expect(validarPropuesta('contactos', 'nuevo', { email: 'food@x.pt', rol: 'Food vendors' })).toBeNull();
  });

  it('rechaza valores mal formados', () => {
    expect(validarPropuesta('festivales', 'acampada', 'yes')).not.toBeNull();
    expect(validarPropuesta('festivales', 'generos', ['kpop'])).not.toBeNull();
    expect(validarPropuesta('ediciones', 'fecha_inicio', '08/07/2027')).not.toBeNull();
    expect(validarPropuesta('ediciones', 'aforo_max', 2.5)).not.toBeNull();
    expect(validarPropuesta('festivales', 'web_url', 'x.pt')).not.toBeNull();
    expect(validarPropuesta('contactos', 'nuevo', { nombre: 'Ana' })).not.toBeNull();
  });

  it('la experiencia y los campos no previstos no se pueden proponer', () => {
    expect(validarPropuesta('ediciones', 'experiencia', 'muy_positiva')).toMatch(/not allowed/);
    expect(validarPropuesta('festivales', 'fuera_de_alcance', true)).toMatch(/not allowed/);
    expect(Object.keys(CAMPOS_PROPONIBLES).some((k) => k.includes('experiencia'))).toBe(false);
  });
});
