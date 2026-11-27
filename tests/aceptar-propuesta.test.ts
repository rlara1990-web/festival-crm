import { describe, expect, it } from 'vitest';
import { aceptarPropuesta } from '../web/src/data/propuestas.ts';
import type { Api } from '../web/src/data/api.ts';
import type { Contacto, Edicion, Interaccion, Propuesta } from '../web/src/types.ts';
import { CONFIG_INICIAL } from '../src/scoring/default-config.ts';

/** API falsa en memoria; `fallarEn` simula un corte de conexión en una llamada concreta. */
function apiFalsa(fallarEn?: string) {
  const contactos: Contacto[] = [];
  const interacciones: Interaccion[] = [];
  const fuentes: string[] = [];
  const resueltas: string[] = [];
  let fallo = fallarEn;
  const quizasFalla = (nombre: string) => { if (fallo === nombre) { fallo = undefined; throw new Error('Failed to fetch'); } };
  const festival = { id: 'f1', nombre: 'X', pais: 'PT', ciudad: null, tipo: 'musica', generos: [], perfil_publico: [], notas_publico: null, web_url: null,
    formulario_contacto_url: null, instagram_url: null, idioma_correo: 'pt', fuera_de_alcance: false, campos_pendientes: [], notas: null, acampada: null, parecido_a: [] };
  const edicion = { id: 'e1', festival_id: 'f1', anio: 2027 } as Edicion;
  const api = {
    festivales: async () => [festival], ediciones: async () => [edicion], vinculos: async () => [], config: async () => CONFIG_INICIAL,
    contactos: async () => contactos.map((c) => ({ ...c })),
    interacciones: async () => interacciones.map((i) => ({ ...i })),
    crearContacto: async (c: Contacto) => { contactos.push({ ...c, id: String(contactos.length) }); quizasFalla('crearContacto'); },
    crearInteraccion: async (i: Interaccion) => { interacciones.push({ ...i, id: 'i', creado_en: '' }); quizasFalla('crearInteraccion'); },
    existeFuente: async (f: { tabla: string; registro_id: string; campo: string | null; valor: string }) => fuentes.includes(JSON.stringify(f)),
    crearFuente: async (f: { tabla: string; registro_id: string; campo: string | null; valor: string }) => {
      fuentes.push(JSON.stringify({ tabla: f.tabla, registro_id: f.registro_id, campo: f.campo, valor: f.valor })); quizasFalla('crearFuente');
    },
    resolverPropuesta: async (id: string) => { resueltas.push(id); },
    actualizarFestival: async () => {}, actualizarEdicion: async () => {},
  } as unknown as Api;
  return { api, contactos, interacciones, fuentes, resueltas };
}

const base = { valor_actual: null, motivo: 'From website', fuente_url: 'https://x.pt', obtenido_en: '', estado: 'pendiente', resuelto_en: null } as const;
const pContacto: Propuesta = { ...base, id: 'p1', tipo: 'dato', tabla: 'contactos', registro_id: 'f1', campo: 'nuevo', valor_propuesto: { email: 'Food@X.pt' } };
const pEstado: Propuesta = { ...base, id: 'p2', tipo: 'cambio_estado', tabla: 'ediciones', registro_id: 'e1', campo: 'estado', valor_propuesto: { estado: 'en_conversacion', asunto: 'Reply: Hello' } };
const eds = [{ id: 'e1', festival_id: 'f1' } as Edicion];

describe('aceptarPropuesta se puede reintentar sin duplicar', () => {
  it('contacto: corte tras crear el contacto y reintento', async () => {
    const f = apiFalsa('crearFuente');
    await expect(aceptarPropuesta(f.api, pContacto, eds)).rejects.toThrow();
    await aceptarPropuesta(f.api, pContacto, eds);
    expect(f.contactos).toHaveLength(1);
    expect(f.contactos[0]!.email).toBe('food@x.pt');
    expect(f.fuentes).toHaveLength(1);
    expect(f.resueltas).toEqual(['p1']);
  });

  it('cambio de estado: corte tras crear la nota y reintento', async () => {
    const f = apiFalsa('crearInteraccion');
    await expect(aceptarPropuesta(f.api, pEstado, eds)).rejects.toThrow();
    await aceptarPropuesta(f.api, pEstado, eds);
    expect(f.interacciones).toHaveLength(1);
    expect(f.interacciones[0]!.estado_resultante).toBe('en_conversacion');
  });

  it('aceptar dos veces la misma propuesta no duplica', async () => {
    const f = apiFalsa();
    await aceptarPropuesta(f.api, pContacto, eds);
    await aceptarPropuesta(f.api, pContacto, eds);
    expect(f.contactos).toHaveLength(1);
    expect(f.fuentes).toHaveLength(1);
  });
});
