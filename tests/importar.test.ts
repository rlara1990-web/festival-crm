import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { importar, leerCsv } from '../src/import/importar.ts';
import {
  detectarInteracciones, extraerEmails, limpiarNombre, normalizarGeneros, normalizarWeb, parseAforo, parseFechas,
} from '../src/import/normalize.ts';
import { CONFIG_INICIAL } from '../src/scoring/default-config.ts';

const csv = readFileSync(new URL('../data/festivals_2026_original.csv', import.meta.url), 'utf8');
const r = importar(csv, CONFIG_INICIAL);
const fest = (nombre: string) => {
  const f = r.festivales.find((x) => x.nombre === nombre);
  if (!f) throw new Error(`No encontrado: ${nombre}`);
  return {
    f,
    e26: r.ediciones.find((e) => e.festival_id === f.id && e.anio === 2026),
    e27: r.ediciones.find((e) => e.festival_id === f.id && e.anio === 2027)!,
    contactos: r.contactos.filter((c) => c.festival_id === f.id),
    interacciones: r.interacciones.filter((i) => i.festival_id === f.id),
  };
};

describe('funciones de limpieza', () => {
  it('aforo', () => {
    expect(parseAforo('10k')).toEqual({ min: 10000, max: 10000 });
    expect(parseAforo('11-25K')).toEqual({ min: 11000, max: 25000 });
    expect(parseAforo('26k-50K')).toEqual({ min: 26000, max: 50000 });
    expect(parseAforo('50k+')).toEqual({ min: 50000, max: null });
    expect(parseAforo('<5k')).toEqual({ min: null, max: 5000 });
    expect(parseAforo('?')).toEqual({ min: null, max: null });
    expect(() => parseAforo('mucho')).toThrow();
  });

  it('fechas', () => {
    expect(parseFechas('09/07/2026', '3')).toMatchObject({ inicio: '2026-07-09', fin: '2026-07-11', duracion: 3 });
    expect(parseFechas('20/06/2026- 27/06/206', '4')).toMatchObject({ inicio: '2026-06-20', fin: '2026-06-27', duracion: 4 });
    expect(parseFechas('august to september', '?')).toMatchObject({ inicio: null, texto: 'August to September', duracion: null });
    expect(parseFechas('', '')).toMatchObject({ inicio: null, texto: null });
  });

  it('emails y webs', () => {
    expect(extraerEmails('geral@everythingisnew.pt/geral@nosalive.com/vendors@nosalive.com\n\n')).toHaveLength(3);
    expect(extraerEmails('ritmos.biz/info@paredesdecoura.com')).toEqual(['info@paredesdecoura.com']);
    expect(normalizarWeb('nosalive.com')).toBe('https://nosalive.com');
    expect(normalizarWeb('no website')).toBeNull();
  });

  it('géneros y nombres', () => {
    expect(normalizarGeneros('Electronic/latin/Rock')).toEqual(['electronica', 'latino', 'rock']);
    expect(normalizarGeneros('punk rock')).toEqual(['punk', 'rock']);
    expect(() => normalizarGeneros('kpop')).toThrow();
    expect(limpiarNombre('paredes de coura ')).toBe('Paredes de Coura');
    expect(limpiarNombre('Nova Rock 2026')).toBe('Nova Rock');
  });

  it('interacciones desde texto libre', () => {
    expect(detectarInteracciones('email sent', '')).toEqual([expect.objectContaining({ tipo: 'correo_enviado' })]);
    expect(detectarInteracciones('Application form filled out', '')[0]).toMatchObject({ estado: 'convocatoria_enviada' });
    expect(detectarInteracciones('email sent and contact on website', '').map((i) => i.tipo)).toContain('correo_enviado');
    expect(detectarInteracciones('', '').length).toBe(0);
  });
});

describe('importación del CSV original', () => {
  it('lee todas las filas, incluidas las que tienen saltos de línea entre comillas', () => {
    const filas = leerCsv(csv);
    expect(filas).toHaveLength(71);
    expect(filas.find((f) => f.nombre === 'Nos Alive')!.contactado).toBe('email sent to geral@...');
    expect(filas.find((f) => f.nombre.startsWith('Paredes'))!.contactado).toBe('email sent');
  });

  it('crea 71 festivales del CSV más Boom, con ediciones 2026 y 2027', () => {
    expect(r.festivales).toHaveLength(72);
    expect(r.ediciones.filter((e) => e.anio === 2026)).toHaveLength(71);
    expect(r.ediciones.filter((e) => e.anio === 2027)).toHaveLength(72);
    expect(r.ediciones.filter((e) => e.anio === 2027 && e.estado !== 'por_contactar').map((e) => e.festival_id))
      .toEqual([fest('Boom Festival').f.id]);
  });

  it('marca fuera de alcance los festivales fuera de Portugal y España', () => {
    const fuera = r.festivales.filter((f) => f.fuera_de_alcance);
    expect(fuera.every((f) => !['PT', 'ES'].includes(f.pais!))).toBe(true);
    expect(fuera).toHaveLength(17); // GB 5, FR 3, BE 2, AT, DK, HR, PL, NL, RO, DE
    expect(fest('GOAT Festival').f.fuera_de_alcance).toBe(false); // sin país: pendiente, no fuera
    expect(fest('GOAT Festival').f.campos_pendientes).toContain('pais');
  });

  it('NOS Alive: tres contactos sin principal, en conversación y prioriza vendedores antiguos', () => {
    const n = fest('NOS Alive');
    expect(n.contactos.map((c) => c.email).sort()).toEqual(['geral@everythingisnew.pt', 'geral@nosalive.com', 'vendors@nosalive.com']);
    expect(n.contactos.some((c) => c.principal)).toBe(false);
    expect(r.comentarios.find((c) => c.registro_id === n.f.id && c.campo === 'contactos')!.autor).toBe('claude');
    expect(n.e26!.estado).toBe('en_conversacion');
    expect(n.e26!.prioridad_antiguos).toBe(true);
    expect(n.e27.prioridad_antiguos).toBe(true);
    expect(n.interacciones.map((i) => i.tipo)).toEqual(['correo_enviado', 'correo_recibido']);
  });

  it('Him Dub: no acepta food trucks y queda rechazado en 2026', () => {
    const h = fest('Him Dub Festival');
    expect(h.e26!.acepta_food_trucks).toBe(false);
    expect(h.e26!.estado).toBe('rechazado');
    expect(h.e27.estado).toBe('por_contactar');
  });

  it('Aquasella: próxima acción en abril de 2027', () => {
    const a = fest('Aquasella Festival');
    expect(a.e26!.estado).toBe('en_conversacion');
    expect(a.e27.proxima_accion_fecha).toBe('2027-04-01');
  });

  it('experiencias 2026 dadas por Rodrigo, con estado Aceptado', () => {
    const esperado: Record<string, string> = {
      'Waking Life': 'muy_positiva', 'Paredes de Coura': 'muy_positiva', 'NOS Primavera Sound': 'positiva',
      'RFM Somnii': 'muy_negativa', 'Vilar de Mouros': 'muy_negativa',
    };
    for (const [nombre, exp] of Object.entries(esperado)) {
      expect(fest(nombre).e26).toMatchObject({ estado: 'aceptado', experiencia: exp });
    }
    expect(r.ediciones.filter((e) => e.experiencia)).toHaveLength(5);
    expect(r.ediciones.filter((e) => e.estado === 'aceptado')).toHaveLength(5);
    expect(fest('RFM Somnii').e26!.comentario_experiencia).toMatch(/beach/);
  });

  it('la experiencia ordena la puntuación 2027 como espera Rodrigo', () => {
    const p = (n: string) => fest(n).e27.puntuacion!;
    expect(p('Waking Life')).toBeGreaterThan(p('NOS Primavera Sound'));
    expect(p('Paredes de Coura')).toBeGreaterThan(p('NOS Primavera Sound'));
    expect(p('NOS Primavera Sound')).toBeGreaterThan(p('RFM Somnii'));
    expect(p('Vilar de Mouros')).toBeLessThan(p('RFM Somnii') + 5);
    // Con faltantes neutros: Waking Life 82, Paredes 75, Primavera 72, Somnii 48, Vilar 41
    expect([p('Waking Life'), p('Paredes de Coura'), p('NOS Primavera Sound'), p('RFM Somnii'), p('Vilar de Mouros')])
      .toEqual([82, 75, 72, 48, 41]);
    expect(p('Him Dub Festival')).toBe(61);
  });

  it('Basilar: rechazado en 2026 con motivo como comentario, internacional y parecido a Waking Life', () => {
    const b = fest('Basilar');
    expect(b.e26!.estado).toBe('rechazado');
    expect(b.f).toMatchObject({ generos: ['electronica'], perfil_publico: ['turista_internacional'] });
    expect(b.f.parecido_a).toEqual([fest('Waking Life').f.id]);
    const c = r.comentarios.find((x) => x.registro_id === b.e26!.id && x.campo === 'estado')!;
    expect(c).toMatchObject({ tabla: 'ediciones', autor: 'equipo' });
    expect(c.texto).toMatch(/menu/);
  });

  it('Boom: solicitud enviada el 5/11/2026, decisión en febrero', () => {
    const b = fest('Boom Festival');
    expect(b.e26).toBeUndefined();
    expect(b.e27).toMatchObject({ estado: 'convocatoria_enviada', proxima_accion_fecha: '2027-02-01' });
    expect(b.interacciones).toEqual([expect.objectContaining({ tipo: 'formulario_web', fecha: '2026-11-05' })]);
  });

  it('marca para verificar el correo repetido de Holika y BBK Live', () => {
    for (const nombre of ['Holika Festival Calahorra', 'Bilbao BBK Live']) {
      const c = fest(nombre).contactos.find((x) => x.email === 'rrhh@holika.es')!;
      expect(c.verificar).toBe(true);
    }
    expect(r.contactos.filter((c) => c.verificar)).toHaveLength(2);
  });

  it('mueve correos y URLs desplazados a su campo', () => {
    expect(fest('Arenal Sound').e26!.conv_url).toMatch(/docs\.google\.com\/forms/);
    expect(fest('Azkena Rock').f.formulario_contacto_url).toBe('https://azkenarockfestival.com/en/contact/');
    expect(fest('Paredes de Coura').contactos.map((c) => c.email)).toEqual(['info@paredesdecoura.com']);
    expect(fest('North Music Festival').contactos[0]!.telefono).toBe('+351 253 034 541');
    expect(fest('Elétrico Festival').f.web_url).toBe('https://eletricofest.com/');
  });

  it('corrige la errata de fecha de Rock in Rio', () => {
    expect(fest('Rock in Rio').e26).toMatchObject({ fecha_inicio: '2026-06-20', fecha_fin: '2026-06-27', duracion_dias: 4 });
  });

  it('no inventa datos: los que faltan quedan pendientes y sin puntuación', () => {
    const avante = fest('Avante Festival');
    expect(avante.f.campos_pendientes).toEqual(expect.arrayContaining(['generos', 'aforo', 'fechas', 'contacto', 'acampada']));
    expect(avante.e27.puntuacion).toBeNull();
    expect(r.festivales.filter((f) => !f.campos_pendientes.includes('perfil_publico')).map((f) => f.nombre)).toEqual(['Basilar']);
    expect(r.festivales.every((f) => f.acampada === null)).toBe(true);
  });

  it('solo puntúa la edición 2027; 2026 es historial', () => {
    expect(r.ediciones.filter((e) => e.anio === 2026).every((e) => e.puntuacion === null)).toBe(true);
  });

  it('los textos visibles generados están en inglés', () => {
    const textos = [
      ...r.interacciones.map((i) => i.cuerpo ?? ''), ...r.festivales.map((f) => f.notas ?? ''),
      ...r.ediciones.map((e) => `${e.fechas_texto ?? ''} ${e.conv_notas ?? ''} ${e.proxima_accion ?? ''}`),
      ...r.comentarios.map((c) => c.texto), ...r.contactos.map((c) => c.motivo_verificar ?? ''),
    ].join(' ');
    expect(textos).not.toMatch(/Importado|Correo enviado|Anotación|Por confirmar|Contactado|aparece también/);
    expect(fest('Lisb-On').e27.fechas_texto).toBe('TBC (2026: 03/06–04/06)');
  });

  it('la temporada 2026 contactada sin respuesta queda como sin_respuesta', () => {
    expect(fest('Lisb-On').e26!.estado).toBe('sin_respuesta');
    expect(r.interacciones.find((i) => i.festival_id === fest('Lisb-On').f.id)!).toMatchObject({ estado_resultante: 'esperando_respuesta', origen: 'import_csv' });
    expect(fest('Copenhell').e26!.estado).toBe('por_contactar');
  });

  it('guarda la procedencia de cada festival y los ids son estables', () => {
    expect(r.fuentes).toHaveLength(72);
    expect(r.fuentes[0]!.url).toMatch(/^data\/festivals_2026_original\.csv#linea=\d+$/);
    expect(importar(csv, CONFIG_INICIAL).festivales.map((f) => f.id)).toEqual(r.festivales.map((f) => f.id));
  });
});
