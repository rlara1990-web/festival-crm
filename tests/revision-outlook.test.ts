import { describe, expect, it } from 'vitest';
import { revisar, type Mensaje } from '../scripts/revision-outlook.ts';

const estado = {
  hoy: '2026-11-30',
  ahora: '2026-11-30T10:00:00Z',
  contactos: [
    { id: 'c1', email: 'info@lisb-on.pt', festival_id: 'f1', organizacion_id: null, primer_contacto_en: null, baja_en: null },
    { id: 'c2', email: 'ana@spot.pt', festival_id: null, organizacion_id: 'o1', primer_contacto_en: null, baja_en: null },
    { id: 'c3', email: 'old@x.pt', festival_id: 'f3', organizacion_id: null, primer_contacto_en: null, baja_en: '2026-01-01' },
  ],
  festivales: [
    { id: 'f1', nombre: 'Lisb-On', web_url: 'https://www.lisb-on.pt/' },
    { id: 'f2', nombre: 'Paredes de Coura', web_url: null },
    { id: 'f3', nombre: 'Otro', web_url: null },
    { id: 'f4', nombre: 'Waking Life', web_url: null },
  ],
  organizaciones: [{ id: 'o1', nombre: 'S.P.O.T' }],
  vinculos: [{ festival_id: 'f2', organizacion_id: 'o1', rol: 'gestion_comida' }],
  ediciones: [
    { id: 'e1', festival_id: 'f1', estado: 'por_contactar', recontactos: 0, proximo_recontacto: null },
    { id: 'e2', festival_id: 'f2', estado: 'por_contactar', recontactos: 0, proximo_recontacto: null },
    { id: 'e4', festival_id: 'f4', estado: 'esperando_respuesta', recontactos: 0, proximo_recontacto: '2026-11-27' },
  ],
  ids_registrados: ['ya'],
};
const m = (x: Partial<Mensaje>): Mensaje => ({ id: 'm', conversation_id: 'conv', direccion: 'enviado', fecha: '2026-11-26T09:00:00Z', de: 'info@mocheverde.com', para: [], asunto: 'Hello', ...x });

describe('revisar', () => {
  it('correo enviado a un contacto: registra, pasa a esperando respuesta y fija el primer contacto', () => {
    const r = revisar(estado, [m({ id: 'a', para: ['INFO@lisb-on.pt'] })]);
    expect(r.sql.join('\n')).toMatch(/correo_enviado/);
    expect(r.sql.some((s) => s.includes(`estado = 'esperando_respuesta'`) && s.includes(`proximo_recontacto = '2026-11-30'`))).toBe(true);
    expect(r.sql.some((s) => s.includes('primer_contacto_en'))).toBe(true);
  });

  it('reconoce por dominio de la web cuando no hay contacto exacto', () => {
    const r = revisar(estado, [m({ id: 'b', para: ['booking@lisb-on.pt'] })]);
    expect(r.informe[0]).toMatch(/dominio lisb-on.pt/);
  });

  it('correo a la gestora asigna el festival si gestiona uno solo', () => {
    const r = revisar(estado, [m({ id: 'c', para: ['ana@spot.pt'] })]);
    expect(r.sql.some((s) => s.includes(`where id = 'e2'`))).toBe(true);
  });

  it('respuesta: detiene el reloj y deja una propuesta de cambio de estado', () => {
    const r = revisar(estado, [m({ id: 'd', direccion: 'recibido', de: 'info@lisb-on.pt', para: ['info@mocheverde.com'], resumen: 'They will open applications in March.', estado_sugerido: 'en_conversacion' })]);
    const sql = r.sql.join('\n');
    expect(sql).toMatch(/correo_recibido/);
    expect(sql).toMatch(/proximo_recontacto = null where id = 'e1'/);
    expect(sql).toMatch(/'cambio_estado'/);
    expect(sql).not.toMatch(/update ediciones set estado = 'en_conversacion'/); // no cambia el estado solo
  });

  it('aviso automático (noreply): se registra sin propuesta ni parar el reloj', () => {
    const r = revisar(estado, [m({ id: 'auto', direccion: 'recibido', de: 'noreply@lisb-on.pt', para: ['info@mocheverde.com'], asunto: 'We have received your application' })]);
    const sql = r.sql.join('\n');
    expect(sql).toMatch(/correo_recibido/);
    expect(sql).not.toMatch(/cambio_estado/);
    expect(sql).not.toMatch(/proximo_recontacto = null where id = 'e1'/);
    expect(r.informe[0]).toMatch(/Aviso automático/);
  });

  it('ignora correos sin relación, contactos dados de baja, gratuitos y ya registrados', () => {
    const r = revisar(estado, [
      m({ id: 'e', para: ['amigo@gmail.com'] }), m({ id: 'f', para: ['old@x.pt'] }), m({ id: 'ya', para: ['info@lisb-on.pt'] }),
    ]);
    expect(r.ignorados).toBe(2);
    expect(r.sql.filter((s) => s.includes('correo_enviado'))).toHaveLength(0);
  });

  it('aplica los plazos vencidos aunque no haya correos', () => {
    const r = revisar(estado, []);
    expect(r.informe.join()).toMatch(/Waking Life → recontacto_1/);
    expect(r.sql.at(-1)).toMatch(/ultima_revision_outlook/);
  });
});
