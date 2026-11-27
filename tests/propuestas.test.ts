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

import { validarFestivalNuevo } from '../src/shared/propuestas.ts';

describe('validarFestivalNuevo', () => {
  const base = { nombre: 'Web Summit', pais: 'PT' as const, tipo: 'otro', por_que: 'Large international audience.' };
  it('acepta lo mínimo y datos completos', () => {
    expect(validarFestivalNuevo(base)).toBeNull();
    expect(validarFestivalNuevo({ ...base, ciudad: 'Lisboa', perfil_publico: ['turista_internacional'], fecha_inicio: '2027-11-08', fecha_fin: '2027-11-11',
      aforo_max: 70000, web_url: 'https://websummit.com/', contacto: { email: 'info@x.com' }, idioma_correo: 'en' })).toBeNull();
  });
  it('rechaza país fuera de alcance, sin motivo o datos mal formados', () => {
    expect(validarFestivalNuevo({ ...base, pais: 'FR' as 'PT' })).toMatch(/Country/);
    expect(validarFestivalNuevo({ ...base, por_que: '' })).toMatch(/reason/);
    expect(validarFestivalNuevo({ ...base, generos: ['kpop'] })).toMatch(/generos/);
    expect(validarFestivalNuevo({ ...base, fecha_inicio: '2027-07-10', fecha_fin: '2027-07-01' })).toMatch(/End date/);
  });
});
